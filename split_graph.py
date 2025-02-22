import json
import os

def split_graph():
    """Split the graph data into two files based on depth."""
    print("Loading graph data...")
    with open('public/graph.json', 'r', encoding='utf-8') as f:
        data = json.load(f)

    # Split nodes by depth
    depth0_1_nodes = [node for node in data['nodes'] if node['depth'] <= 1]
    depth2_nodes = [node for node in data['nodes'] if node['depth'] == 2]

    # Create node ID sets for quick lookup
    depth0_1_node_ids = {node['id'] for node in depth0_1_nodes}
    depth2_node_ids = {node['id'] for node in depth2_nodes}

    # Split links
    depth0_1_links = []
    depth2_links = []

    for link in data['links']:
        source = link['source']
        target = link['target']
        
        # Links between depth 0-1 nodes
        if source in depth0_1_node_ids and target in depth0_1_node_ids:
            depth0_1_links.append(link)
        # Links involving depth 2 nodes
        elif source in depth2_node_ids or target in depth2_node_ids:
            depth2_links.append(link)

    # Create the graph data structures
    depth0_1_graph = {
        "nodes": depth0_1_nodes,
        "links": depth0_1_links
    }

    depth2_graph = {
        "nodes": depth2_nodes + depth0_1_nodes,  # Include depth 0-1 nodes for connections
        "links": depth2_links
    }

    # Save the files
    print(f"Depth 0-1 graph: {len(depth0_1_nodes)} nodes, {len(depth0_1_links)} links")
    print(f"Depth 2 graph: {len(depth2_nodes)} nodes, {len(depth2_links)} links")

    with open('public/graph_depth0_1.json', 'w', encoding='utf-8') as f:
        json.dump(depth0_1_graph, f, ensure_ascii=False, indent=2)

    with open('public/graph_depth2.json', 'w', encoding='utf-8') as f:
        json.dump(depth2_graph, f, ensure_ascii=False, indent=2)

    print("Graph data has been split successfully!")

if __name__ == "__main__":
    split_graph() 