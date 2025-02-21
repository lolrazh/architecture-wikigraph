import json
import os
from crawler import GraphManager, is_architecture_related

def main():
    # Initialize graph manager (this will load existing data)
    graph_manager = GraphManager()
    
    # Export the graph with the new format
    graph_manager.export_graph()
    
    print("Graph has been re-exported with the new format!")
    print(f"Total nodes: {len(graph_manager.nodes)}")
    print(f"Total edges: {len(graph_manager.edges)}")

if __name__ == "__main__":
    main() 