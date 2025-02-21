import wikipediaapi
import json
import logging
import re
from bs4 import BeautifulSoup
import asyncio
import aiohttp
from urllib.parse import unquote, urlencode
from typing import Set, Dict, List, Tuple
import time
from functools import partial
import os

# Set logging to DEBUG level to see more details
logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s - %(levelname)s - %(message)s'
)

# Sections to exclude from processing
unwanted_sections = {
    'references', 'notes', 'citations', 'sources', 'footnotes',
    'works cited', 'external links', 'further reading',
    'bibliography', 'see also', 'notes and references',
    'additional resources', 'external resources'
}

# Data storage paths
DATA_DIR = 'data'
NODES_FILE = os.path.join(DATA_DIR, 'nodes.json')
EDGES_FILE = os.path.join(DATA_DIR, 'edges.json')
CACHE_FILE = os.path.join(DATA_DIR, 'cache.json')
PROGRESS_FILE = os.path.join(DATA_DIR, 'progress.json')
GRAPH_FILE = 'public/graph.json'

# Ensure data directory exists
os.makedirs(DATA_DIR, exist_ok=True)

def is_architecture_related(title: str) -> bool:
    """Check if a title is directly related to architecture."""
    architecture_keywords = {
        'architecture', 'building', 'construction', 'design', 'structure',
        'architectural', 'architect', 'built environment', 'edifice',
        'engineering', 'facade', 'interior', 'landscape', 'planning',
        'renovation', 'restoration', 'style', 'urban'
    }
    
    title_lower = title.lower()
    return any(keyword in title_lower for keyword in architecture_keywords)

def is_valid_link(title):
    """Check if a link should be included in the graph."""
    # Skip certain namespaces that aren't main articles
    if ':' in title and not title.startswith('Category:'):
        return False
        
    # Skip files and images
    if title.startswith(('File:', 'Image:', 'Media:')):
        return False
        
    # Skip references and citations
    if title.startswith(('Cite', 'Citation')):
        return False
        
    # Skip identifier and disambiguation links
    if any(x in title for x in ['(identifier)', '(disambiguation)', '(journal)', '(magazine)']):
        return False
        
    # Skip category and portal links
    if title.startswith(('Category:', 'Portal:')):
        return False
        
    # Skip index, list, and outline pages
    if title.startswith(('Index of', 'Outline of', 'List of', 'Timeline of', 'Comparison of')):
        return False
        
    # Skip meta pages
    if title.startswith(('Wikipedia:', 'Template:', 'Help:', 'Draft:')):
        return False
        
    # Skip very generic concepts that add noise
    generic_concepts = {
        'Art', 'Design', 'Engineering', 'Science', 'Technology', 'History',
        'Culture', 'Society', 'Philosophy', 'Theory', 'System', 'Structure',
        'Planning', 'Analysis', 'Research', 'Development', 'Management',
        'Book', 'Journal', 'Magazine', 'Publication', 'Award'
    }
    if title in generic_concepts:
        return False
        
    return True

class GraphManager:
    def __init__(self):
        self.nodes = {}  # title -> node data
        self.edges = {}  # (source, target) -> edge data
        self.cache = {}  # title -> {links, timestamp}
        self.progress = {
            'last_processed': None,
            'to_visit': [],
            'visited': set()
        }
        
        # Load existing data if available
        self.load_data()
    
    def load_data(self):
        """Load existing data from files."""
        if os.path.exists(NODES_FILE):
            with open(NODES_FILE, 'r', encoding='utf-8') as f:
                self.nodes = json.load(f)
        
        if os.path.exists(EDGES_FILE):
            with open(EDGES_FILE, 'r', encoding='utf-8') as f:
                # Convert string tuple keys back to actual tuples
                self.edges = {tuple(eval(k)): v for k, v in json.load(f).items()}
        
        if os.path.exists(CACHE_FILE):
            with open(CACHE_FILE, 'r', encoding='utf-8') as f:
                self.cache = json.load(f)
        
        if os.path.exists(PROGRESS_FILE):
            with open(PROGRESS_FILE, 'r', encoding='utf-8') as f:
                data = json.load(f)
                self.progress['last_processed'] = data['last_processed']
                self.progress['to_visit'] = data['to_visit']
                self.progress['visited'] = set(data['visited'])
    
    def save_data(self):
        """Save current data to files."""
        with open(NODES_FILE, 'w', encoding='utf-8') as f:
            json.dump(self.nodes, f, ensure_ascii=False, indent=2)
        
        with open(EDGES_FILE, 'w', encoding='utf-8') as f:
            # Convert tuple keys to strings for JSON serialization
            edges_dict = {str(list(k)): v for k, v in self.edges.items()}
            json.dump(edges_dict, f, ensure_ascii=False, indent=2)
        
        with open(CACHE_FILE, 'w', encoding='utf-8') as f:
            json.dump(self.cache, f, ensure_ascii=False, indent=2)
        
        with open(PROGRESS_FILE, 'w', encoding='utf-8') as f:
            progress_data = {
                'last_processed': self.progress['last_processed'],
                'to_visit': self.progress['to_visit'],
                'visited': list(self.progress['visited'])
            }
            json.dump(progress_data, f, ensure_ascii=False, indent=2)
    
    def add_node(self, title: str, first_paragraph: str = "", sections: List[str] = None, categories: List[str] = None, is_disambiguation: bool = False):
        """Add a node to the graph with complete metadata."""
        if title not in self.nodes:
            self.nodes[title] = {
                'title': title,
                'first_paragraph': first_paragraph,
                'sections': sections or [],
                'categories': categories or [],
                'is_disambiguation': is_disambiguation
            }
    
    def add_edge(self, source: str, target: str, section_context: str = "", sentence_context: str = "", section_link: Dict = None):
        """Add an edge to the graph with context information."""
        edge = tuple(sorted([source, target]))
        edge_data = {
            'source': source,
            'target': target,
            'section_context': section_context,
            'sentence_context': sentence_context
        }
        if section_link:
            edge_data['section_link'] = section_link
        self.edges[edge] = edge_data
    
    def export_graph(self, progress_callback=None):
        """Export the graph in the format needed for visualization."""
        if progress_callback:
            progress_callback("Starting export", 0)
        
        # Helper function to determine node category
        def get_node_category(title: str, depth: int) -> str:
            if title == "Architecture":
                return "root"
            # Check if the title or categories suggest it's architecture-related
            node_data = self.nodes[title]
            is_architecture = (
                is_architecture_related(title) or
                any(is_architecture_related(cat) for cat in node_data['categories'])
            )
            return "architecture" if is_architecture else "related"

        # Calculate depths using BFS
        if progress_callback:
            progress_callback("Calculating node depths", 0, len(self.nodes))
            
        depths = {"Architecture": 0}
        queue = [("Architecture", 0)]
        visited = {"Architecture"}
        nodes_processed = 1  # Start at 1 since we've processed Architecture
        total_nodes = len(self.nodes)
        edges_by_node = {}
        
        # Pre-process edges to make lookup faster
        for edge in self.edges.values():
            source = edge["source"]
            target = edge["target"]
            if source not in edges_by_node:
                edges_by_node[source] = set()
            if target not in edges_by_node:
                edges_by_node[target] = set()
            edges_by_node[source].add(target)
            edges_by_node[target].add(source)

        if progress_callback:
            progress_callback("Calculating node depths", nodes_processed, total_nodes)

        while queue and nodes_processed < total_nodes:
            current, depth = queue.pop(0)
            
            if current not in edges_by_node:
                continue
                
            for neighbor in edges_by_node[current]:
                if neighbor not in visited:
                    depths[neighbor] = depth + 1
                    queue.append((neighbor, depth + 1))
                    visited.add(neighbor)
                    nodes_processed += 1
                    
                    if progress_callback and nodes_processed % 100 == 0:
                        progress_callback("Calculating node depths", min(nodes_processed, total_nodes), total_nodes)

        if progress_callback:
            progress_callback("Preparing nodes for export", 0, total_nodes)
            
        # Transform nodes
        graph_data = {
            "nodes": [
                {
                    "id": title,
                    "depth": depths.get(title, float('inf')),
                    "category": get_node_category(title, depths.get(title, float('inf'))),
                    "group": 1,  # Default group, can be modified based on categories if needed
                    # Include original metadata for potential hover/click interactions
                    "title": data["title"],
                    "first_paragraph": data["first_paragraph"],
                    "sections": data["sections"],
                    "categories": data["categories"]
                } for title, data in self.nodes.items()
            ],
            "links": []
        }
        
        if progress_callback:
            progress_callback("Processing edges", 0, len(self.edges))
            
        # Transform edges
        total_edges = len(self.edges)
        graph_data["links"] = [
            {
                "source": data["source"],
                "target": data["target"],
                "value": 1,  # Default value, can be modified based on context
                "section_context": data.get("section_context", ""),
                "sentence_context": data.get("sentence_context", ""),
                **({k: v for k, v in data.items() if k not in ["source", "target", "section_context", "sentence_context"]})
            } for data in self.edges.values()
        ]
        
        if progress_callback:
            progress_callback("Saving to file", 0)
            
        # Save to file
        with open(GRAPH_FILE, 'w', encoding='utf-8') as f:
            json.dump(graph_data, f, ensure_ascii=False, indent=2)
            
        if progress_callback:
            progress_callback("Export completed", total_edges)

def get_canonical_title(wiki: wikipediaapi.Wikipedia, title: str) -> str:
    """Get the canonical title for a Wikipedia page to handle redirects."""
    page = wiki.page(title)
    if page.exists():
        # Return the canonical title (this handles redirects)
        return page.title
    return title

async def get_canonical_title_async(wiki: wikipediaapi.Wikipedia, title: str) -> str:
    """Async version of get_canonical_title."""
    # Run the blocking Wikipedia API call in a thread pool
    loop = asyncio.get_running_loop()
    canonical = await loop.run_in_executor(
        None, 
        partial(get_canonical_title, wiki, title)
    )
    return canonical

async def get_page_metadata(soup: BeautifulSoup) -> Dict:
    """Extract page metadata including first paragraph and sections."""
    metadata = {
        'first_paragraph': '',
        'sections': [],
        'categories': [],
        'is_disambiguation': False
    }
    
    # Check if it's a disambiguation page
    if soup.find('table', id='disambigbox') or soup.find('div', {'class': 'disambiguation'}):
        metadata['is_disambiguation'] = True
        return metadata
    
    # Get first paragraph (lead section)
    lead_section = soup.find('div', {'class': 'mw-parser-output'})
    if lead_section:
        paragraphs = lead_section.find_all('p', recursive=False)
        for p in paragraphs:
            if p.text.strip() and not p.find_parent(['table', 'div'], class_=['infobox', 'sidebar']):
                metadata['first_paragraph'] = p.text.strip()
                break
    
    # Get section hierarchy
    for heading in soup.find_all(['h1', 'h2', 'h3', 'h4']):
        if heading.get('id') != 'firstHeading':  # Skip page title
            section_text = heading.get_text().strip()
            if section_text.lower() not in unwanted_sections:
                metadata['sections'].append(section_text)
    
    # Get categories
    for cat in soup.find_all('div', {'class': 'mw-normal-catlinks'}):
        for link in cat.find_all('a'):
            category = link.text.strip()
            if category.startswith('Category:'):
                category = category[9:]  # Remove 'Category:' prefix
            metadata['categories'].append(category)
    
    return metadata

async def get_main_content_links_async(session: aiohttp.ClientSession, page_title: str) -> Tuple[List[Dict], Dict]:
    """Async version of get_main_content_links with enhanced metadata and link context."""
    logging.debug(f"Starting to fetch links for page: {page_title}")
    encoded_title = page_title.replace(' ', '_')
    url = f'https://en.wikipedia.org/wiki/{encoded_title}'
    
    try:
        async with session.get(url, headers={
            'User-Agent': 'ArchitectureWikigraph/1.0',
            'Accept': 'text/html'
        }) as response:
            if response.status != 200:
                return [], {}
            
            html = await response.text()
            if len(html) < 100:
                return [], {}
            
            soup = BeautifulSoup(html, 'html.parser')
            
            # Get page metadata
            metadata = await get_page_metadata(soup)
            if metadata['is_disambiguation']:
                return [], metadata
            
            content = soup.find(id='mw-content-text')
            if not content:
                return [], metadata
            
            # Clean up content
            for tag in content.find_all(['ref', 'style', 'script']):
                tag.decompose()
            
            # Process links with context
            links_with_context = []  # Changed from set to list
            current_section = "Introduction"
            
            for element in content.find_all(['h2', 'h3', 'a', 'p']):
                # Update current section
                if element.name in ['h2', 'h3']:
                    current_section = element.get_text().strip()
                    if current_section.lower() in unwanted_sections:
                        current_section = None
                    continue
                
                # Skip if we're in an unwanted section
                if not current_section:
                    continue
                
                # Process links
                if element.name == 'a':
                    href = element.get('href', '')
                    if not href.startswith('/wiki/'):
                        continue
                    
                    # Get link title and section
                    full_href = href[6:]  # Remove /wiki/
                    base_title = unquote(full_href.split('#')[0]).replace('_', ' ')
                    section_name = unquote(full_href.split('#')[1]) if '#' in full_href else None
                    
                    if not base_title or not is_valid_link(base_title):
                        continue
                    
                    # Get sentence context
                    parent_p = element.find_parent('p')
                    sentence_context = ''
                    if parent_p:
                        text = parent_p.get_text()
                        sentences = text.split('. ')
                        for sentence in sentences:
                            if element.get_text() in sentence:
                                sentence_context = sentence.strip()
                                break
                    
                    link_data = {
                        'title': base_title,
                        'section_context': current_section,
                        'sentence_context': sentence_context
                    }
                    
                    if section_name:
                        link_data['section_link'] = {
                            'parent_page': base_title,
                            'section_name': section_name,
                            'full_url': full_href
                        }
                    
                    links_with_context.append(link_data)  # Changed from add to append
            
            return links_with_context, metadata
            
    except Exception as e:
        logging.error(f"Error processing {url}: {str(e)}")
        return [], {}

async def process_page(
    session: aiohttp.ClientSession,
    wiki: wikipediaapi.Wikipedia,
    current_title: str,
    current_depth: int,
    graph_manager: GraphManager,
    canonical_mapping: Dict[str, str]
) -> List[Tuple[str, int]]:
    """Process a single page asynchronously."""
    try:
        logging.debug(f"Processing {current_title} at depth {current_depth}")
        
        # Get links and metadata from current page
        page_links, metadata = await get_main_content_links_async(session, current_title)
        
        # Initialize metadata if empty
        if not metadata:
            metadata = {
                'first_paragraph': '',
                'sections': [],
                'categories': [],
                'is_disambiguation': False
            }
        
        if metadata.get('is_disambiguation', False):
            logging.info(f"Skipping disambiguation page: {current_title}")
            return []
        
        # Add current page as node with metadata
        graph_manager.add_node(
            title=current_title,
            first_paragraph=metadata.get('first_paragraph', ''),
            sections=metadata.get('sections', []),
            categories=metadata.get('categories', []),
            is_disambiguation=metadata.get('is_disambiguation', False)
        )
        
        if not page_links:
            logging.warning(f"No links found on page {current_title}")
            return []
        
        # Process links in parallel batches
        canonical_tasks = []
        for link_data in page_links:
            if link_data['title'] not in canonical_mapping:
                task = get_canonical_title_async(wiki, link_data['title'])
                canonical_tasks.append((link_data, task))
        
        # Execute canonical title tasks in parallel
        if canonical_tasks:
            results = await asyncio.gather(*[task for _, task in canonical_tasks], return_exceptions=True)
            for (link_data, _), result in zip(canonical_tasks, results):
                if isinstance(result, Exception):
                    logging.error(f"Error getting canonical title for {link_data['title']}")
                    continue
                canonical_mapping[link_data['title']] = result
        
        # Process all links and create edges
        to_visit = []
        processed_links = set()
        
        for link_data in page_links:
            original_title = link_data['title']
            if original_title not in canonical_mapping:
                continue
            
            canonical = canonical_mapping[original_title]
            next_depth = current_depth + 1
            
            # Skip self-links and already processed links
            edge_key = tuple(sorted([current_title, canonical]))
            if canonical == current_title or edge_key in processed_links:
                continue
            
            # Add edge with context
            graph_manager.add_edge(
                source=current_title,
                target=canonical,
                section_context=link_data['section_context'],
                sentence_context=link_data['sentence_context'],
                section_link=link_data.get('section_link')
            )
            
            # Mark this link as processed
            processed_links.add(edge_key)
            
            # Add to visit queue if not visited and not a disambiguation page
            if canonical not in graph_manager.progress['visited']:
                to_visit.append((canonical, next_depth))
                logging.debug(f"Added {canonical} to visit at depth {next_depth}")
        
        # Mark current page as visited
        graph_manager.progress['visited'].add(current_title)
        
        # Save progress periodically
        graph_manager.save_data()
        
        return to_visit
    except Exception as e:
        logging.error(f"Error processing page {current_title}: {str(e)}")
        import traceback
        logging.error(f"Traceback: {traceback.format_exc()}")
        return []

async def main_async():
    start_time = time.time()
    logging.info("Starting crawler")
    
    # Initialize Wikipedia API
    wiki = wikipediaapi.Wikipedia(
        language='en',
        extract_format=wikipediaapi.ExtractFormat.WIKI,
        user_agent='ArchitectureWikigraph/1.0'
    )
    logging.debug("Initialized Wikipedia API")

    CONCURRENT_REQUESTS = 20
    RATE_LIMIT_DELAY = 0.1

    # Initialize graph manager
    graph_manager = GraphManager()
    
    # Add root node if not exists
    graph_manager.add_node("Architecture")

    # Initialize tracking structures
    canonical_mapping = {}
    to_visit = graph_manager.progress['to_visit'] or [("Architecture", 0)]
    
    logging.debug("Starting main processing loop")
    async with aiohttp.ClientSession() as session:
        while to_visit:
            current_batch = to_visit[:CONCURRENT_REQUESTS]
            to_visit = to_visit[CONCURRENT_REQUESTS:]
            
            logging.debug(f"Processing batch of {len(current_batch)} pages")
            
            # Create and execute tasks for current batch
            tasks = []
            for title, depth in current_batch:
                if title not in graph_manager.progress['visited']:
                    task = process_page(
                        session, wiki, title, depth,
                        graph_manager, canonical_mapping
                    )
                    tasks.append((title, depth, task))
                else:
                    logging.debug(f"Skipping {title} - already visited")
            
            # Execute all tasks in parallel
            if tasks:
                try:
                    results = await asyncio.gather(*[task for _, _, task in tasks], return_exceptions=True)
                    
                    # Process results
                    for ((title, depth, _), result) in zip(tasks, results):
                        if isinstance(result, Exception):
                            logging.error(f"Task for {title} failed")
                        else:
                            if result:
                                to_visit.extend(result)
                except Exception as e:
                    logging.error(f"Error processing batch: {str(e)}")
            
            # Update progress
            graph_manager.progress['to_visit'] = to_visit
            graph_manager.save_data()
            
            # Add a small delay between batches
            await asyncio.sleep(RATE_LIMIT_DELAY)

    # Export final graph
    graph_manager.export_graph()

    # Log statistics
    end_time = time.time()
    logging.info(f"\nCrawling completed in {end_time - start_time:.2f} seconds")
    logging.info(f"\nTotal nodes: {len(graph_manager.nodes)}")
    logging.info(f"Total edges: {len(graph_manager.edges)}")

if __name__ == "__main__":
    try:
        asyncio.run(main_async())
    except KeyboardInterrupt:
        logging.info("Crawler stopped by user")
    except Exception as e:
        logging.error(f"Crawler failed: {str(e)}")
        import traceback
        logging.error(traceback.format_exc())