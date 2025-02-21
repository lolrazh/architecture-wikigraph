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

# Set logging to DEBUG level to see more details
logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s - %(levelname)s - %(message)s'
)

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

async def get_main_content_links_async(session: aiohttp.ClientSession, page_title: str) -> Set[str]:
    """Async version of get_main_content_links."""
    logging.debug(f"Starting to fetch links for page: {page_title}")
    # Properly encode the URL for Wikipedia
    encoded_title = page_title.replace(' ', '_')
    url = f'https://en.wikipedia.org/wiki/{encoded_title}'
    try:
        logging.debug(f"Making HTTP request to: {url}")
        headers = {
            'User-Agent': 'ArchitectureWikigraph/1.0 (https://github.com/yourusername/architecture-wikigraph)',
            'Accept': 'text/html'
        }
        async with session.get(url, headers=headers) as response:
            logging.debug(f"Got response for {url} with status: {response.status}")
            if response.status != 200:
                logging.error(f"Error fetching {url}: HTTP {response.status}")
                logging.error(f"Response headers: {response.headers}")
                return set()
                
            html = await response.text()
            logging.debug(f"Successfully fetched HTML content for {page_title} (length: {len(html)})")
            
            if len(html) < 100:  # Suspiciously small response
                logging.warning(f"Received suspiciously small HTML response for {page_title} (length: {len(html)})")
                logging.debug(f"Response content: {html}")
                return set()
                
            soup = BeautifulSoup(html, 'html.parser')
            logging.debug(f"Created BeautifulSoup parser for {page_title}")
            
            # Find the main content div
            content = soup.find(id='mw-content-text')
            if not content:
                logging.warning(f"Could not find main content div for {page_title}")
                return set()

            logging.debug(f"Found main content div for {page_title}")
            # First, find and remove all reference tags
            ref_tags = content.find_all('ref')
            for ref in ref_tags:
                ref.decompose()
            
            # Find and remove reference sections and other non-main content
            reference_sections = content.find_all(['div', 'span', 'section'], 
                class_=['reflist', 'reference', 'references', 'mw-references-wrap', 'reference-text'])
            for section in reference_sections:
                section.decompose()

            # Remove sections with reference-related headings
            for heading in content.find_all(['h2', 'h3']):
                heading_text = heading.get_text().strip().lower()
                if heading_text in ['references', 'notes', 'citations', 'sources', 'footnotes', 'works cited']:
                    section = heading.find_next_sibling()
                    while section and section.name not in ['h2', 'h3']:
                        next_elem = section.find_next_sibling()
                        section.decompose()
                        section = next_elem
                    heading.decompose()

            # Get all links from the cleaned main content
            main_links = set()
            for link in content.find_all('a'):
                if link.find_parent(['table', 'div'], class_=['navbox', 'reflist', 'reference', 
                                                         'references', 'mw-references-wrap', 'reference-text']):
                    continue
                    
                href = link.get('href', '')
                if not href.startswith('/wiki/'):
                    continue
                    
                title = unquote(href[6:]).replace('_', ' ')
                
                if '#' in title:
                    title = title.split('#')[0]
                    
                if title and is_valid_link(title):
                    main_links.add(title)
                    
            return main_links
    except Exception as e:
        logging.error(f"Error fetching {url}: {str(e)}")
        import traceback
        logging.error(f"Traceback: {traceback.format_exc()}")
        return set()

async def process_page(
    session: aiohttp.ClientSession,
    wiki: wikipediaapi.Wikipedia,
    current_title: str,
    current_depth: int,
    canonical_mapping: Dict[str, str],
    visited: Dict[str, int],
    nodes_at_depth: Dict[int, List[str]],
    edges: Dict[Tuple[str, str], int],
    MAX_DEPTH: int
) -> List[Tuple[str, int]]:
    """Process a single page asynchronously."""
    try:
        logging.debug(f"Enter process_page for {current_title} at depth {current_depth}")
        
        if current_depth >= MAX_DEPTH:
            logging.debug(f"Skipping {current_title} - reached max depth {MAX_DEPTH}")
            return []

        logging.info(f"Processing {current_title} at depth {current_depth}")
        
        # Get links from current page
        logging.debug(f"Fetching links for {current_title}")
        page_links = await get_main_content_links_async(session, current_title)
        logging.info(f"Found {len(page_links)} links on page {current_title}")
        
        if not page_links:
            logging.warning(f"No links found on page {current_title}")
            return []
            
        # Process links in parallel batches
        connection_counts = {}
        canonical_tasks = []
        
        # Create tasks for getting canonical titles
        for title in page_links:
            if title not in canonical_mapping:
                task = get_canonical_title_async(wiki, title)
                canonical_tasks.append((title, task))
        
        # Execute canonical title tasks in parallel
        if canonical_tasks:
            results = await asyncio.gather(*[task for _, task in canonical_tasks], return_exceptions=True)
            for (title, _), result in zip(canonical_tasks, results):
                if isinstance(result, Exception):
                    logging.error(f"Error getting canonical title for {title}: {str(result)}")
                    continue
                canonical_mapping[title] = result
                if result not in connection_counts:
                    connection_counts[result] = 0
                connection_counts[result] += 1
        
        # Process remaining links that were already in canonical_mapping
        for title in page_links:
            if title in canonical_mapping and title not in connection_counts:
                canonical = canonical_mapping[title]
                if canonical not in connection_counts:
                    connection_counts[canonical] = 0
                connection_counts[canonical] += 1
        
        # Sort and filter links by connection count
        logging.debug("Sorting and filtering links")
        sorted_links = sorted(
            [(title, connection_counts.get(canonical_mapping[title], 0)) 
             for title in page_links 
             if title in canonical_mapping],
            key=lambda x: x[1],
            reverse=True
        )
        logging.debug(f"Sorted {len(sorted_links)} valid links")
        
        to_visit = []
        # Process all valid links
        for title, count in sorted_links:
            canonical = canonical_mapping[title]
            next_depth = current_depth + 1
                
            if canonical not in visited and next_depth < MAX_DEPTH:
                to_visit.append((canonical, next_depth))
                nodes_at_depth[next_depth].append(canonical)
                logging.debug(f"Added {canonical} to visit at depth {next_depth}")
            
            # Handle edge (create or increment weight)
            edge_pair = tuple(sorted([current_title, canonical]))
            if edge_pair in edges:
                edges[edge_pair] += 1
            else:
                edges[edge_pair] = 1
                
        logging.debug(f"Returning {len(to_visit)} new pages to visit")
        return to_visit
    except Exception as e:
        logging.error(f"Error processing page {current_title}: {str(e)}")
        import traceback
        logging.error(f"Traceback: {traceback.format_exc()}")
        return []

async def main_async():
    start_time = time.time()
    logging.info("Starting crawler")
    
    # Initialize Wikipedia API with proper user agent
    wiki = wikipediaapi.Wikipedia(
        language='en',
        extract_format=wikipediaapi.ExtractFormat.WIKI,
        user_agent='ArchitectureWikigraph/1.0'
    )
    logging.debug("Initialized Wikipedia API")

    MAX_DEPTH = 2
    CONCURRENT_REQUESTS = 20  # Increased from 5 to 20 concurrent requests
    RATE_LIMIT_DELAY = 0.1  # 100ms delay between requests instead of 1s

    # Initialize graph structure
    graph = {
        "nodes": set(),  # Use sets for efficient membership testing
        "links": set()   # Use sets to avoid duplicates
    }
    
    # Add root node
    graph["nodes"].add("Architecture")

    # Initialize tracking structures
    visited = {}  # Don't mark Architecture as visited yet
    to_visit = [("Architecture", 0)]
    canonical_mapping = {}
    edges = {}
    nodes_at_depth = {0: ["Architecture"], 1: [], 2: []}
    
    logging.debug("Initialized data structures")
    
    # Create client session with custom timeout and headers
    timeout = aiohttp.ClientTimeout(total=30)  # 30 seconds total timeout
    connector = aiohttp.TCPConnector(limit=CONCURRENT_REQUESTS, force_close=True)
    
    logging.debug("Starting main processing loop")
    async with aiohttp.ClientSession(timeout=timeout, connector=connector) as session:
        while to_visit:
            current_batch = to_visit[:CONCURRENT_REQUESTS]
            to_visit = to_visit[CONCURRENT_REQUESTS:]
            
            logging.debug(f"Processing batch of {len(current_batch)} pages: {current_batch}")
            
            # Create and execute tasks for current batch
            tasks = []
            for title, depth in current_batch:
                if title not in visited:
                    task = process_page(
                        session, wiki, title, depth, canonical_mapping,
                        visited, nodes_at_depth, edges,
                        MAX_DEPTH
                    )
                    tasks.append((title, depth, task))
                else:
                    logging.debug(f"Skipping {title} - already visited")
            
            # Execute all tasks in parallel and wait for completion
            if tasks:
                try:
                    logging.debug(f"Starting execution of {len(tasks)} tasks")
                    results = await asyncio.gather(*[task for _, _, task in tasks], return_exceptions=True)
                    logging.debug(f"Completed execution of {len(tasks)} tasks")
                    
                    # Process results and mark pages as visited only after successful processing
                    for i, ((title, depth, _), result) in enumerate(zip(tasks, results)):
                        if isinstance(result, Exception):
                            logging.error(f"Task {i} ({title}) failed: {str(result)}")
                            import traceback
                            logging.error(f"Traceback: {traceback.format_exc()}")
                        else:
                            # Mark as visited only after successful processing
                            visited[title] = depth
                            # Add the source node to the graph
                            graph["nodes"].add(title)
                            logging.debug(f"Marked {title} as visited at depth {depth}")
                            if result:  # Only extend if we got actual results
                                to_visit.extend(result)
                                logging.debug(f"Added {len(result)} new pages to visit queue from task {i} ({title})")
                except Exception as e:
                    logging.error(f"Error processing batch: {str(e)}")
                    import traceback
                    logging.error(f"Traceback: {traceback.format_exc()}")
            else:
                logging.debug("No tasks created for current batch")
            
            # Add a small delay between batches to respect rate limits
            await asyncio.sleep(RATE_LIMIT_DELAY)

    # Convert sets to lists and create final graph structure
    final_graph = {
        "nodes": [{"id": node, "group": visited.get(node, 0) + 1} for node in graph["nodes"]],
        "links": []
    }

    # Add edges only if both nodes exist
    for (source, target), weight in edges.items():
        if source in graph["nodes"] and target in graph["nodes"]:
            final_graph["links"].append({
                "source": source,
                "target": target,
                "value": weight
            })

    # Log statistics
    end_time = time.time()
    logging.info(f"\nCrawling completed in {end_time - start_time:.2f} seconds")
    logging.info("\nNodes per depth:")
    for depth, nodes in nodes_at_depth.items():
        logging.info(f"Depth {depth}: {len(nodes)} nodes")
        
    logging.info(f"\nTotal nodes: {len(final_graph['nodes'])}")
    logging.info(f"Total edges: {len(final_graph['links'])}")
    logging.info(f"Edge weight distribution:")
    weight_counts = {}
    for link in final_graph["links"]:
        weight = link["value"]
        weight_counts[weight] = weight_counts.get(weight, 0) + 1
    for weight, count in sorted(weight_counts.items()):
        logging.info(f"Weight {weight}: {count} edges")

    # Save to file
    with open('public/graph.json', 'w', encoding='utf-8') as f:
        json.dump(final_graph, f, ensure_ascii=False, indent=2)

if __name__ == "__main__":
    try:
        asyncio.run(main_async())
    except KeyboardInterrupt:
        logging.info("Crawler stopped by user")
    except Exception as e:
        logging.error(f"Crawler failed: {str(e)}")
        import traceback
        logging.error(traceback.format_exc())