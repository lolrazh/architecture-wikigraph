import json
import os
import time
from crawler import GraphManager, is_architecture_related
from collections import defaultdict

def main():
    print("\nStarting simplified graph export process...")
    start_time = time.time()
    
    # Initialize graph manager
    print("Loading data from files...")
    graph_manager = GraphManager()
    
    # Create simplified graph structure
    simplified_graph = {
        "nodes": [],
        "links": []
    }
    
    # Create adjacency list for faster edge lookup
    print("Building adjacency list...")
    adjacency_list = defaultdict(list)
    for edge in graph_manager.edges.values():
        source = edge["source"]
        target = edge["target"]
        if source in graph_manager.nodes and target in graph_manager.nodes:
            adjacency_list[source].append(target)
            adjacency_list[target].append(source)
    
    # Calculate depths using BFS
    depths = {"Architecture": 0}
    queue = [("Architecture", 0)]
    visited = {"Architecture"}
    
    # First pass: collect valid nodes and their depths
    print("Calculating node depths...")
    while queue:
        current, depth = queue.pop(0)
        
        # Skip if we're beyond depth 2
        if depth >= 2:
            continue
        
        # Process immediate neighbors
        for neighbor in adjacency_list[current]:
            if neighbor not in visited:
                depths[neighbor] = depth + 1
                visited.add(neighbor)
                queue.append((neighbor, depth + 1))
    
    # Add nodes within depth 2
    print("Adding nodes to simplified graph...")
    for node_id, depth in depths.items():
        if node_id not in graph_manager.nodes:
            print(f"Warning: Node {node_id} referenced but not found in graph")
            continue
            
        # Only add if it's within depth 2
        if depth > 2:
            continue
            
        # Determine if it's architecture-related
        node_data = graph_manager.nodes[node_id]
        is_arch = is_architecture_related(node_id) or any(
            is_architecture_related(cat) 
            for cat in node_data.get("categories", [])
        )
        
        # Only add if it's the root or architecture-related
        if node_id == "Architecture" or is_arch:
            node_data = {
                "id": node_id,
                "depth": depth,
                "category": "root" if node_id == "Architecture" else "architecture",
                "loaded": True  # All nodes are loaded by default
            }
            simplified_graph["nodes"].append(node_data)
    
    # Add links between nodes with depth information
    print("Adding links to simplified graph...")
    valid_nodes = {node["id"]: node["depth"] for node in simplified_graph["nodes"]}
    for edge in graph_manager.edges.values():
        source = edge["source"]
        target = edge["target"]
        # Only add links where both nodes are valid and within depth 2
        if (source in valid_nodes and target in valid_nodes and 
            valid_nodes[source] <= 2 and valid_nodes[target] <= 2):
            source_depth = valid_nodes[source]
            target_depth = valid_nodes[target]
            simplified_graph["links"].append({
                "source": source,
                "target": target,
                "depth": max(source_depth, target_depth),
                "loaded": True  # All links are loaded by default
            })
    
    # Save to file
    output_path = os.path.join('public', 'graph.json')
    os.makedirs('public', exist_ok=True)
    
    print("Saving simplified graph...")
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(simplified_graph, f, ensure_ascii=False, indent=2)
    
    end_time = time.time()
    duration = end_time - start_time
    
    # Print statistics
    print(f"\nExport completed in {duration:.1f} seconds!")
    print(f"Simplified graph has:")
    
    # Count nodes by depth
    depth_counts = defaultdict(int)
    for node in simplified_graph['nodes']:
        depth_counts[node['depth']] += 1
    
    for depth in sorted(depth_counts.keys()):
        print(f"- {depth_counts[depth]} nodes at depth {depth}")
    print(f"- {len(simplified_graph['links'])} total links")
    print(f"\nGraph has been exported to {output_path}")

if __name__ == "__main__":
    main() 