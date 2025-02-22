import asyncio
import logging
from typing import List, Set, Tuple
import os
from pathlib import Path
import signal
from datetime import datetime
import sys

from .graph import GraphManager
from .wikipedia import WikipediaAPI

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('crawl.log'),
        logging.StreamHandler(sys.stdout)
    ]
)

class Crawler:
    def __init__(self, max_depth: int = 2, batch_size: int = 50):
        self.max_depth = max_depth
        self.batch_size = batch_size
        self.graph_manager = GraphManager()
        self.running = True
        self.stats = {
            "pages_processed": 0,
            "links_found": 0,
            "start_time": datetime.now()
        }

    def setup_signal_handlers(self):
        """Set up graceful shutdown handlers."""
        def handle_shutdown(signum, frame):
            logging.info("Shutdown signal received. Cleaning up...")
            self.running = False
        
        signal.signal(signal.SIGINT, handle_shutdown)
        signal.signal(signal.SIGTERM, handle_shutdown)

    def log_progress(self):
        """Log crawler progress."""
        elapsed = datetime.now() - self.stats["start_time"]
        pages_per_second = self.stats["pages_processed"] / elapsed.total_seconds() if elapsed.total_seconds() > 0 else 0
        
        logging.info(
            f"Progress: {self.stats['pages_processed']} pages processed, "
            f"{self.stats['links_found']} links found, "
            f"{pages_per_second:.2f} pages/second"
        )

    async def process_batch(self, wiki_api: WikipediaAPI, batch: List[Tuple[str, int]]) -> List[Tuple[str, int]]:
        """Process a batch of pages concurrently."""
        new_pages: List[Tuple[str, int]] = []
        
        for title, depth in batch:
            if not self.running:
                break

            try:
                # Get page metadata first
                metadata = await wiki_api.get_page_metadata(title)
                if metadata["is_disambiguation"]:
                    continue

                # Get links from the page
                links = await wiki_api.get_page_links(title)
                self.stats["links_found"] += len(links)

                # Process each link
                for link in links:
                    link_title = wiki_api.normalize_title(link["title"])
                    
                    # Skip if we've seen this page or it's not valid
                    if (not wiki_api.is_valid_link(link_title) or
                        link_title in self.graph_manager.visited):
                        continue

                    # Add edge to graph
                    self.graph_manager.add_edge(title, link_title, depth)

                    # Add to queue if within depth limit and architecture-related
                    if (depth < self.max_depth and 
                        wiki_api.is_architecture_related(link_title)):
                        new_pages.append((link_title, depth + 1))

                self.stats["pages_processed"] += 1
                
                # Save progress periodically
                if self.stats["pages_processed"] % 10 == 0:
                    self.graph_manager.save_data()
                    self.log_progress()

            except Exception as e:
                logging.error(f"Error processing page {title}: {e}")
                continue

        return new_pages

    async def run(self):
        """Run the crawler."""
        self.setup_signal_handlers()
        logging.info("Starting crawler...")

        try:
            async with WikipediaAPI() as wiki_api:
                # Start with Architecture if we're starting fresh
                if not self.graph_manager.to_visit:
                    self.graph_manager.to_visit.append(("Architecture", 0))

                while self.graph_manager.to_visit and self.running:
                    # Process pages in batches
                    batch = self.graph_manager.to_visit[:self.batch_size]
                    self.graph_manager.to_visit = self.graph_manager.to_visit[self.batch_size:]

                    # Mark batch pages as visited
                    for title, _ in batch:
                        self.graph_manager.visited.add(title)

                    # Process the batch
                    new_pages = await self.process_batch(wiki_api, batch)
                    
                    # Add new pages to visit
                    self.graph_manager.to_visit.extend(new_pages)

        except Exception as e:
            logging.error(f"Crawler error: {e}")
        finally:
            # Save final state
            self.graph_manager.save_data()
            
            # Export the graph
            logging.info("Exporting final graph...")
            self.graph_manager.export_graph(self.max_depth)
            
            # Log final statistics
            self.log_progress()
            logging.info("Crawler finished.")

async def main():
    crawler = Crawler(max_depth=2, batch_size=50)
    await crawler.run()

if __name__ == "__main__":
    asyncio.run(main()) 