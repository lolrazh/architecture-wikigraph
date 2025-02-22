import aiohttp
import asyncio
import logging
from typing import Dict, List, Optional, Set, Tuple
import json
from urllib.parse import unquote
import re

class WikipediaAPI:
    def __init__(self, user_agent: str = "ArchitectureWikigraph/1.0"):
        self.user_agent = user_agent
        self.base_url = "https://en.wikipedia.org/w/api.php"
        self.session: Optional[aiohttp.ClientSession] = None
        self.rate_limit_delay = 0.1  # Delay between requests in seconds
        self.last_request_time = 0.0

    async def __aenter__(self):
        """Context manager entry."""
        self.session = aiohttp.ClientSession(headers={"User-Agent": self.user_agent})
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Context manager exit."""
        if self.session:
            await self.session.close()
            self.session = None

    async def _make_request(self, params: Dict) -> Dict:
        """Make an API request with rate limiting."""
        if not self.session:
            raise RuntimeError("Session not initialized. Use async with WikipediaAPI().")

        # Add common parameters
        params.update({
            "format": "json",
            "formatversion": "2",
            "action": "query",
        })

        # Rate limiting
        now = asyncio.get_event_loop().time()
        if now - self.last_request_time < self.rate_limit_delay:
            await asyncio.sleep(self.rate_limit_delay - (now - self.last_request_time))
        self.last_request_time = now

        try:
            async with self.session.get(self.base_url, params=params) as response:
                response.raise_for_status()
                return await response.json()
        except aiohttp.ClientError as e:
            logging.error(f"API request failed: {e}")
            raise

    async def get_page_links(self, title: str) -> List[Dict]:
        """Get links from a page using the API directly."""
        links = []
        plcontinue = None

        while True:
            params = {
                "titles": title,
                "prop": "links",
                "pllimit": "max",
                "plnamespace": "0",  # Main namespace only
            }

            if plcontinue:
                params["plcontinue"] = plcontinue

            try:
                data = await self._make_request(params)
                page = next(iter(data["query"]["pages"].values()))
                
                if "links" in page:
                    links.extend(page["links"])

                if "continue" in data:
                    plcontinue = data["continue"]["plcontinue"]
                else:
                    break
            except Exception as e:
                logging.error(f"Error fetching links for {title}: {e}")
                break

        return links

    async def get_page_metadata(self, title: str) -> Dict:
        """Get page metadata using the API."""
        params = {
            "titles": title,
            "prop": "info|pageprops",
            "inprop": "url",
        }

        try:
            data = await self._make_request(params)
            page = next(iter(data["query"]["pages"].values()))
            
            return {
                "title": page.get("title", ""),
                "pageid": page.get("pageid"),
                "is_disambiguation": "disambiguation" in page.get("pageprops", {}),
                "url": page.get("fullurl", ""),
            }
        except Exception as e:
            logging.error(f"Error fetching metadata for {title}: {e}")
            return {
                "title": title,
                "is_disambiguation": False,
                "url": "",
            }

    @staticmethod
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

    @staticmethod
    def is_valid_link(title: str) -> bool:
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

    @staticmethod
    def normalize_title(title: str) -> str:
        """Normalize a Wikipedia page title."""
        # Remove URL encoding
        title = unquote(title)
        # Replace underscores with spaces
        title = title.replace('_', ' ')
        # Remove any trailing parentheses (e.g., "(architecture)")
        title = re.sub(r'\s*\([^)]*\)\s*$', '', title)
        return title.strip() 