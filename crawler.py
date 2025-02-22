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

# Configuration constants
CONCURRENT_REQUESTS = 75
RATE_LIMIT_DELAY = 0.1
MAX_DEPTH = 2  # Maximum depth to crawl (0 = root, 1 = direct links, 2 = indirect links)

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
        self.edges = {}  # (source, target) -> edge data
        self.progress = {
            'to_visit': [],
            'visited': set()
        }
        
        # Load existing data if available
        self.load_data()
    
    def load_data(self):
        """Load existing data from files."""
        if os.path.exists(EDGES_FILE):
            with open(EDGES_FILE, 'r', encoding='utf-8') as f:
                # Convert string tuple keys back to actual tuples
                self.edges = {tuple(eval(k)): v for k, v in json.load(f).items()}
        
        if os.path.exists(PROGRESS_FILE):
            with open(PROGRESS_FILE, 'r', encoding='utf-8') as f:
                data = json.load(f)
                self.progress['to_visit'] = data['to_visit']
                self.progress['visited'] = set(data['visited'])
    
    def save_data(self):
        """Save current data to files using atomic writes."""
        # Ensure data directory exists
        os.makedirs(DATA_DIR, exist_ok=True)
        
        # Save edges
        edges_temp = EDGES_FILE + '.tmp'
        edges_dict = {str(list(k)): v for k, v in self.edges.items()}
        with open(edges_temp, 'w', encoding='utf-8') as f:
            json.dump(edges_dict, f, ensure_ascii=False, indent=2)
        os.replace(edges_temp, EDGES_FILE)
        
        # Save progress
        progress_temp = PROGRESS_FILE + '.tmp'
        progress_data = {
            'to_visit': self.progress['to_visit'],
            'visited': list(self.progress['visited'])
        }
        with open(progress_temp, 'w', encoding='utf-8') as f:
            json.dump(progress_data, f, ensure_ascii=False, indent=2)
        os.replace(progress_temp, PROGRESS_FILE)
    
    def add_edge(self, source: str, target: str):
        """Add an edge to the graph."""
        edge = tuple(sorted([source, target]))
        edge_data = {
            'source': source,
            'target': target
        }
        self.edges[edge] = edge_data
    
    def export_graph(self, progress_callback=None):
        """Export the graph in the format needed for visualization."""
        if progress_callback:
            progress_callback("Starting export", 0)
        
        # Calculate depths using BFS to get shortest path from root
        depths = {"Architecture": 0}
        queue = [("Architecture", 0)]
        visited = {"Architecture"}
        edges_by_node = {}
        nodes = {"Architecture"}  # Track all nodes from edges
        
        # Pre-process edges to make lookup faster and collect all nodes
        for edge in self.edges.values():
            source = edge["source"]
            target = edge["target"]
            nodes.add(source)
            nodes.add(target)
            if source not in edges_by_node:
                edges_by_node[source] = set()
            if target not in edges_by_node:
                edges_by_node[target] = set()
            edges_by_node[source].add(target)
            edges_by_node[target].add(source)

        # BFS to find shortest paths
        while queue:
            current, depth = queue.pop(0)
            
            if current not in edges_by_node:
                continue
                
            for neighbor in edges_by_node[current]:
                if neighbor not in visited:
                    depths[neighbor] = depth + 1
                    queue.append((neighbor, depth + 1))
                    visited.add(neighbor)
        
        # Transform nodes - only include nodes with depth <= 2
        graph_data = {
            "nodes": [
                {
                    "id": title,
                    "depth": depths.get(title, float('inf')),
                    "category": "root" if title == "Architecture" else "node"
                } 
                for title in nodes
                if depths.get(title, float('inf')) <= 2
            ],
            "links": []
        }
        
        # Transform edges - only include edges where both nodes have depth <= 2
        graph_data["links"] = [
            {
                "source": data["source"],
                "target": data["target"],
                "depth": max(depths.get(data["source"], float('inf')), depths.get(data["target"], float('inf')))
            } 
            for data in self.edges.values()
            if depths.get(data["source"], float('inf')) <= 2 and depths.get(data["target"], float('inf')) <= 2
        ]
        
        # Save to file
        with open(GRAPH_FILE, 'w', encoding='utf-8') as f:
            json.dump(graph_data, f, ensure_ascii=False, indent=2)
            
        if progress_callback:
            progress_callback("Export completed", len(self.edges))

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
    """Extract minimal page metadata."""
    metadata = {
        'is_disambiguation': bool(soup.find('table', id='disambigbox') or soup.find('div', {'class': 'disambiguation'}))
    }
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
        logging.debug(f"Processing {current_title} at depth {current_depth}/{MAX_DEPTH}")
        
        # Skip if we're already at max depth
        if current_depth >= MAX_DEPTH:
            logging.debug(f"Skipping {current_title} - max depth {MAX_DEPTH} reached")
            return []
        
        # Get links and metadata from current page
        page_links, metadata = await get_main_content_links_async(session, current_title)
        
        # Initialize metadata if empty
        if not metadata:
            metadata = {
                'is_disambiguation': False
            }
        
        if metadata.get('is_disambiguation', False):
            logging.info(f"Skipping disambiguation page: {current_title}")
            return []
        
        # Process all links and create edges
        to_visit = []
        processed_links = set()
        
        for link_data in page_links:
            original_title = link_data['title']
            
            # Get canonical title for the link
            if original_title not in canonical_mapping:
                canonical = await get_canonical_title_async(wiki, original_title)
                canonical_mapping[original_title] = canonical
            else:
                canonical = canonical_mapping[original_title]
            
            next_depth = current_depth + 1
            
            # Skip self-links and already processed links
            edge_key = tuple(sorted([current_title, canonical]))
            if canonical == current_title or edge_key in processed_links:
                continue
            
            # Add edge
            graph_manager.add_edge(
                source=current_title,
                target=canonical
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

    # Initialize graph manager
    graph_manager = GraphManager()
    
    # Initialize tracking structures
    canonical_mapping = {}
    to_visit = graph_manager.progress['to_visit'] or [("Architecture", 0)]
    
    # Clear visited set if starting fresh
    if not graph_manager.progress['to_visit']:
        graph_manager.progress['visited'] = set()
    
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
    logging.info(f"\nTotal edges: {len(graph_manager.edges)}")

if __name__ == "__main__":
    try:
        asyncio.run(main_async())
    except KeyboardInterrupt:
        logging.info("Crawler stopped by user")
    except Exception as e:
        logging.error(f"Crawler failed: {str(e)}")
        import traceback
        logging.error(traceback.format_exc())