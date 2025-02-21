import wikipediaapi
import json
import logging
import re
from bs4 import BeautifulSoup
import requests
from urllib.parse import unquote, urlencode

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

def get_main_content_links(page_title):
    """Get links that appear in the main article text by parsing the HTML."""
    url = f'https://en.wikipedia.org/wiki/{page_title}'
    response = requests.get(url)
    soup = BeautifulSoup(response.text, 'html.parser')
    
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
            # Remove the entire section that follows this heading
            section = heading.find_next_sibling()
            while section and section.name not in ['h2', 'h3']:
                next_elem = section.find_next_sibling()
                section.decompose()
                section = next_elem
            heading.decompose()  # Remove the heading itself

    # Get all links from the cleaned main content
    main_links = set()
    for link in content.find_all('a'):
        # Skip links in tables, navboxes, and any remaining reference-like elements
        if link.find_parent(['table', 'div'], class_=['navbox', 'reflist', 'reference', 
                                                     'references', 'mw-references-wrap', 'reference-text']):
            continue
            
        # Get the href attribute
        href = link.get('href', '')
        if not href.startswith('/wiki/'):
            continue
            
        # Convert URL to page title and decode URL-encoded characters
        title = unquote(href[6:]).replace('_', ' ')
        
        # Remove section anchors
        if '#' in title:
            title = title.split('#')[0]
            
        if title and is_valid_link(title):
            main_links.add(title)
            
    return main_links

def main():
    # Initialize Wikipedia API
    wiki = wikipediaapi.Wikipedia(
        language='en',
        extract_format=wikipediaapi.ExtractFormat.WIKI,
        user_agent='ArchitectureWikigraph (Wikipedia-API/0.8.1; https://github.com/martin-majlis/Wikipedia-API/)'
    )

    # Get the Architecture page
    page = wiki.page('Architecture')
    
    # Get links from main content
    main_links = get_main_content_links('Architecture')
    
    # Create a mapping of all titles to their canonical titles
    title_mapping = {}
    canonical_titles = set()
    
    logging.info("\nResolving canonical titles...")
    for title in main_links:
        canonical = get_canonical_title(wiki, title)
        title_mapping[title] = canonical
        canonical_titles.add(canonical)
        
    # Log the links found in main content
    logging.info("\nLinks found in main content (after deduplication):")
    for title in sorted(canonical_titles):
        logging.info(f"  - {title}")

    # Create graph structure with nodes and links
    graph = {
        "nodes": [
            {
                "id": "Architecture",
                "group": 1
            }
        ],
        "links": []
    }

    # Add nodes and edges for filtered links
    added_nodes = {"Architecture"}  # Keep track of nodes we've already added
    
    for title in main_links:
        canonical = title_mapping[title]
        if canonical not in added_nodes:
            # Add node
            graph["nodes"].append({
                "id": canonical,
                "group": 2
            })
            # Add edge from Architecture to this page
            graph["links"].append({
                "source": "Architecture",
                "target": canonical,
                "value": 1
            })
            added_nodes.add(canonical)

    # Save to file
    with open('public/graph.json', 'w', encoding='utf-8') as f:
        json.dump(graph, f, indent=2, ensure_ascii=False)
    
    logging.info(f"\nSaved {len(added_nodes) - 1} links to graph.json")

if __name__ == "__main__":
    main()