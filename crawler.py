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

logging.basicConfig(level=logging.INFO)

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

async def get_main_content_links_async(session: aiohttp.ClientSession, page_title: str) -> Set[str]:
    """Async version of get_main_content_links."""
    url = f'https://en.wikipedia.org/wiki/{page_title}'
    try:
        async with session.get(url) as response:
            html = await response.text()
            soup = BeautifulSoup(html, 'html.parser')
            
            # Find the main content div
            content = soup.find(id='mw-content-text')
            if not content:
                return set()

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
    MAX_NODES_PER_DEPTH: int,
    MAX_DEPTH: int
) -> List[Tuple[str, int]]:
    """Process a single page asynchronously."""
    if current_depth >= MAX_DEPTH:
        return []

    logging.info(f"Processing {current_title} at depth {current_depth}")
    
    # Get links from current page
    page_links = await get_main_content_links_async(session, current_title)
    
    # Track connection counts for ranking
    connection_counts = {}
    
    # First pass: count connections to current depth
    for title in page_links:
        if title not in canonical_mapping:
            canonical = get_canonical_title(wiki, title)
            canonical_mapping[title] = canonical
        else:
            canonical = canonical_mapping[title]
            
        if canonical not in connection_counts:
            connection_counts[canonical] = 0
        connection_counts[canonical] += 1
    
    # Sort and filter links by connection count
    sorted_links = sorted(
        [(title, connection_counts[canonical_mapping[title]]) for title in page_links],
        key=lambda x: x[1],
        reverse=True
    )
    
    to_visit = []
    # Second pass: process top links
    for title, count in sorted_links:
        canonical = canonical_mapping[title]
        next_depth = current_depth + 1
        
        if len(nodes_at_depth[next_depth]) >= MAX_NODES_PER_DEPTH:
            continue
            
        if canonical not in visited and next_depth < MAX_DEPTH:
            to_visit.append((canonical, next_depth))
            nodes_at_depth[next_depth].append(canonical)
        
        # Handle edge (create or increment weight)
        edge_pair = tuple(sorted([current_title, canonical]))
        if edge_pair in edges:
            edges[edge_pair] += 1
        else:
            edges[edge_pair] = 1

        if len(nodes_at_depth[next_depth]) >= MAX_NODES_PER_DEPTH:
            break
            
    return to_visit

async def main_async():
    start_time = time.time()
    
    # Initialize Wikipedia API
    wiki = wikipediaapi.Wikipedia(
        language='en',
        extract_format=wikipediaapi.ExtractFormat.WIKI,
        user_agent='ArchitectureWikigraph (Wikipedia-API/0.8.1)'
    )

    MAX_NODES_PER_DEPTH = 25
    MAX_DEPTH = 2
    CONCURRENT_REQUESTS = 5  # Number of concurrent requests

    # Initialize graph structure
    graph = {
        "nodes": [{"id": "Architecture", "group": 1}],
        "links": []
    }

    # Initialize tracking structures
    visited = {"Architecture": 0}
    to_visit = [("Architecture", 0)]
    canonical_mapping = {}
    edges = {}
    nodes_at_depth = {0: ["Architecture"], 1: [], 2: []}
    
    # Create client session
    async with aiohttp.ClientSession() as session:
        while to_visit:
            # Process pages in parallel batches
            current_batch = to_visit[:CONCURRENT_REQUESTS]
            to_visit = to_visit[CONCURRENT_REQUESTS:]
            
            # Create tasks for current batch
            tasks = []
            for title, depth in current_batch:
                if title not in visited:
                    visited[title] = depth
                    task = process_page(
                        session, wiki, title, depth, canonical_mapping,
                        visited, nodes_at_depth, edges,
                        MAX_NODES_PER_DEPTH, MAX_DEPTH
                    )
                    tasks.append(task)
            
            # Wait for all tasks in current batch to complete
            if tasks:
                results = await asyncio.gather(*tasks)
                # Add new pages to visit
                for result in results:
                    to_visit.extend(result)

    # Add nodes for all visited pages
    for title, depth in visited.items():
        if not any(node["id"] == title for node in graph["nodes"]):
            graph["nodes"].append({
                "id": title,
                "group": depth + 1
            })

    # Convert edges to links with weights
    for (source, target), weight in edges.items():
        graph["links"].append({
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
        
    logging.info(f"\nTotal unique edges: {len(edges)}")
    logging.info(f"Edge weight distribution:")
    weight_counts = {}
    for weight in edges.values():
        weight_counts[weight] = weight_counts.get(weight, 0) + 1
    for weight, count in sorted(weight_counts.items()):
        logging.info(f"Weight {weight}: {count} edges")

    # Save to file
    with open('public/graph.json', 'w', encoding='utf-8') as f:
        json.dump(graph, f, ensure_ascii=False, indent=2)

if __name__ == "__main__":
    asyncio.run(main_async())