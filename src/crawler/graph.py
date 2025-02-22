import json
import os
from typing import Dict, List, Set, Tuple, Optional
from dataclasses import dataclass, asdict
import logging
from pathlib import Path

@dataclass
class Node:
    id: str
    depth: int
    category: str = "architecture"

@dataclass
class Link:
    source: str
    target: str
    depth: Optional[int] = None

class GraphManager:
    def __init__(self, data_dir: str = "data", public_dir: str = "public"):
        self.data_dir = Path(data_dir)
        self.public_dir = Path(public_dir)
        self.nodes: Dict[str, Node] = {}
        self.links: Dict[Tuple[str, str], Link] = {}
        self.visited: Set[str] = set()
        self.to_visit: List[Tuple[str, int]] = []
        
        # Ensure directories exist
        self.data_dir.mkdir(exist_ok=True)
        self.public_dir.mkdir(exist_ok=True)
        
        # Load existing data if available
        self.load_data()

    def _safe_tuple_key(self, key_str: str) -> Tuple[str, str]:
        """Safely convert a string representation of a tuple into an actual tuple."""
        try:
            # Parse the string as JSON array and convert to tuple
            items = json.loads(key_str)
            if isinstance(items, list) and len(items) == 2:
                return tuple(str(x) for x in items)
            raise ValueError("Invalid tuple format")
        except json.JSONDecodeError:
            raise ValueError("Invalid JSON format")

    def load_data(self) -> None:
        """Load existing data from files with improved error handling."""
        try:
            # Load edges
            edges_file = self.data_dir / "edges.json"
            if edges_file.exists():
                with edges_file.open("r", encoding="utf-8") as f:
                    edges_data = json.load(f)
                    for key_str, value in edges_data.items():
                        try:
                            key = self._safe_tuple_key(key_str)
                            self.links[key] = Link(**value)
                        except (ValueError, TypeError) as e:
                            logging.warning(f"Skipping invalid edge data: {e}")
                            continue

            # Load progress
            progress_file = self.data_dir / "progress.json"
            if progress_file.exists():
                with progress_file.open("r", encoding="utf-8") as f:
                    progress_data = json.load(f)
                    self.to_visit = [(str(item[0]), int(item[1])) for item in progress_data.get("to_visit", [])]
                    self.visited = set(str(x) for x in progress_data.get("visited", []))

        except Exception as e:
            logging.error(f"Error loading data: {e}")
            # Initialize empty state if loading fails
            self.links = {}
            self.visited = set()
            self.to_visit = []

    def save_data(self) -> None:
        """Save current data to files using atomic writes."""
        try:
            # Save edges
            edges_temp = self.data_dir / "edges.json.tmp"
            edges_dict = {
                json.dumps(list(k)): asdict(v)
                for k, v in self.links.items()
            }
            with edges_temp.open("w", encoding="utf-8") as f:
                json.dump(edges_dict, f, ensure_ascii=False, indent=2)
            edges_temp.replace(self.data_dir / "edges.json")

            # Save progress
            progress_temp = self.data_dir / "progress.json.tmp"
            progress_data = {
                "to_visit": self.to_visit,
                "visited": list(self.visited)
            }
            with progress_temp.open("w", encoding="utf-8") as f:
                json.dump(progress_data, f, ensure_ascii=False, indent=2)
            progress_temp.replace(self.data_dir / "progress.json")

        except Exception as e:
            logging.error(f"Error saving data: {e}")
            raise

    def add_edge(self, source: str, target: str, depth: Optional[int] = None) -> None:
        """Add an edge to the graph with improved validation."""
        if not source or not target:
            logging.warning("Attempted to add edge with empty source or target")
            return

        # Normalize edge direction (always store in sorted order)
        edge = tuple(sorted([source, target]))
        self.links[edge] = Link(source=source, target=target, depth=depth)

    def export_graph(self, max_depth: int = 2) -> None:
        """Export the graph in the format needed for visualization."""
        try:
            # Calculate depths using BFS
            depths: Dict[str, int] = {"Architecture": 0}
            queue: List[Tuple[str, int]] = [("Architecture", 0)]
            visited: Set[str] = {"Architecture"}

            # Build adjacency list for faster lookups
            adj_list: Dict[str, Set[str]] = {}
            for (source, target), _ in self.links.items():
                if source not in adj_list:
                    adj_list[source] = set()
                if target not in adj_list:
                    adj_list[target] = set()
                adj_list[source].add(target)
                adj_list[target].add(source)

            # BFS to find shortest paths
            while queue:
                current, depth = queue.pop(0)
                if current not in adj_list:
                    continue

                for neighbor in adj_list[current]:
                    if neighbor not in visited:
                        depths[neighbor] = depth + 1
                        queue.append((neighbor, depth + 1))
                        visited.add(neighbor)

            # Build graph data
            nodes = [
                {
                    "id": title,
                    "depth": depths.get(title, float("inf")),
                    "category": "root" if title == "Architecture" else "architecture"
                }
                for title in visited
                if depths.get(title, float("inf")) <= max_depth
            ]

            links = [
                {
                    "source": link.source,
                    "target": link.target,
                    "depth": max(depths.get(link.source, float("inf")),
                               depths.get(link.target, float("inf")))
                }
                for link in self.links.values()
                if (depths.get(link.source, float("inf")) <= max_depth and
                    depths.get(link.target, float("inf")) <= max_depth)
            ]

            graph_data = {"nodes": nodes, "links": links}

            # Save to file atomically
            graph_temp = self.public_dir / "graph.json.tmp"
            with graph_temp.open("w", encoding="utf-8") as f:
                json.dump(graph_data, f, ensure_ascii=False, indent=2)
            graph_temp.replace(self.public_dir / "graph.json")

        except Exception as e:
            logging.error(f"Error exporting graph: {e}")
            raise 