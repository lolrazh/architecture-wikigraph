import json
import os
import time
from crawler import GraphManager, is_architecture_related

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
    
    # Calculate depths using BFS
    depths = {"Architecture": 0}
    queue = [("Architecture", 0)]
    visited = {"Architecture"}
    
    # First pass: collect valid nodes and their depths
    print("Calculating node depths...")
    while queue:
        current, depth = queue.pop(0)
        if depth >= 2:  # Changed to depth 2
            continue
            
        # Get immediate neighbors
        for edge in graph_manager.edges.values():
            source = edge["source"]
            target = edge["target"]
            
            # Skip edges with missing nodes
            if source not in graph_manager.nodes or target not in graph_manager.nodes:
                continue
            
            if source == current and target not in visited:
                depths[target] = depth + 1
                visited.add(target)
                queue.append((target, depth + 1))
            elif target == current and source not in visited:
                depths[source] = depth + 1
                visited.add(source)
                queue.append((source, depth + 1))
    
    # Add nodes within depth 2
    print("Adding nodes to simplified graph...")
    for node_id in visited:
        if node_id not in graph_manager.nodes:
            print(f"Warning: Node {node_id} referenced but not found in graph")
            continue
            
        # Determine if it's architecture-related
        node_data = graph_manager.nodes[node_id]
        is_arch = is_architecture_related(node_id) or any(
            is_architecture_related(cat) 
            for cat in node_data.get("categories", [])
        )
        
        # Only add if it's the root or architecture-related
        if node_id == "Architecture" or is_arch:
            depth = depths[node_id]
            node_data = {
                "id": node_id,
                "depth": depth,
                "category": "root" if node_id == "Architecture" else "architecture",
                "loaded": depth <= 1  # Only depth 0 and 1 nodes are initially loaded
            }
            simplified_graph["nodes"].append(node_data)
    
    # Add links between nodes with depth information
    print("Adding links to simplified graph...")
    valid_nodes = {node["id"]: node["depth"] for node in simplified_graph["nodes"]}
    for edge in graph_manager.edges.values():
        source = edge["source"]
        target = edge["target"]
        if source in valid_nodes and target in valid_nodes:
            source_depth = valid_nodes[source]
            target_depth = valid_nodes[target]
            simplified_graph["links"].append({
                "source": source,
                "target": target,
                "depth": max(source_depth, target_depth),  # Link depth is max of its nodes
                "loaded": max(source_depth, target_depth) <= 1  # Only depth 0-1 links initially loaded
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
    total_nodes = len(simplified_graph['nodes'])
    depth1_nodes = sum(1 for node in simplified_graph['nodes'] if node['depth'] <= 1)
    depth2_nodes = total_nodes - depth1_nodes
    total_links = len(simplified_graph['links'])
    loaded_links = sum(1 for link in simplified_graph['links'] if link['loaded'])
    
    print(f"- {depth1_nodes} nodes (depth 0-1, initially loaded)")
    print(f"- {depth2_nodes} nodes (depth 2, loaded on demand)")
    print(f"- {loaded_links} links (initially loaded)")
    print(f"- {total_links - loaded_links} links (loaded on demand)")
    print(f"\nGraph has been exported to {output_path}")

if __name__ == "__main__":
    main() 