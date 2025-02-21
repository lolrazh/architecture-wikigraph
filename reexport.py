import json
import os
import time
from crawler import GraphManager, is_architecture_related

def main():
    print("\nStarting graph re-export process...")
    start_time = time.time()
    
    # Initialize graph manager (this will load existing data)
    print("Loading data from files...")
    graph_manager = GraphManager()
    
    total_nodes = len(graph_manager.nodes)
    total_edges = len(graph_manager.edges)
    print(f"\nFound {total_nodes:,} nodes and {total_edges:,} edges")
    
    # Add progress tracking to export_graph
    def progress_callback(stage: str, current: int, total: int = None):
        if total:
            percentage = (current / total) * 100
            print(f"{stage}: {current:,}/{total:,} ({percentage:.1f}%)")
        else:
            print(f"{stage}: {current:,}")
    
    # Export the graph with the new format
    print("\nExporting graph with new format...")
    graph_manager.export_graph(progress_callback=progress_callback)
    
    end_time = time.time()
    duration = end_time - start_time
    print(f"\nExport completed in {duration:.1f} seconds!")
    print(f"Graph has been exported to public/graph.json")

if __name__ == "__main__":
    main() 