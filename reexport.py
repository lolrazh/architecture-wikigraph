import json
import os
import time
from crawler import GraphManager, is_architecture_related
from collections import defaultdict

def analyze_graph(nodes, links):
    # Find orphaned nodes (nodes with no connections)
    node_connections = defaultdict(int)
    for link in links:
        node_connections[link['source']] += 1
        node_connections[link['target']] += 1
    
    orphaned = [node['id'] for node in nodes if node_connections[node['id']] == 0]
    
    # Analyze connection patterns
    depth_connections = defaultdict(lambda: defaultdict(int))
    for link in links:
        source_node = next(n for n in nodes if n['id'] == link['source'])
        target_node = next(n for n in nodes if n['id'] == link['target'])
        depth_connections[source_node['depth']][target_node['depth']] += 1
    
    print("\nGraph Analysis:")
    print(f"Found {len(orphaned)} orphaned nodes:")
    for node_id in orphaned:
        node = next(n for n in nodes if n['id'] == node_id)
        print(f"- {node_id} (depth {node['depth']})")
    
    print("\nConnections between depths:")
    for d1 in sorted(depth_connections.keys()):
        for d2 in sorted(depth_connections[d1].keys()):
            count = depth_connections[d1][d2]
            print(f"- Depth {d1} → Depth {d2}: {count} links")

def main():
    print("\nStarting simplified graph export process...")
    start_time = time.time()
    
    # Initialize graph manager
    print("Loading data from files...")
    graph_manager = GraphManager()
    
    # Print crawler data statistics
    print("\nCrawler Data Statistics:")
    print(f"Total nodes in crawler data: {len(graph_manager.nodes)}")
    print(f"Total edges in crawler data: {len(graph_manager.edges)}")
    
    # Create simplified graph structure
    simplified_graph = {
        "nodes": [],
        "links": []
    }
    
    # Create adjacency list for faster edge lookup
    print("\nBuilding adjacency list...")
    adjacency_list = defaultdict(list)
    for edge in graph_manager.edges.values():
        source = edge["source"]
        target = edge["target"]
        if source in graph_manager.nodes and target in graph_manager.nodes:
            adjacency_list[source].append(target)
            adjacency_list[target].append(source)
    
    # First pass: Calculate initial depths using BFS
    print("Initial depth calculation...")
    depths = {"Architecture": 0}
    queue = [("Architecture", 0)]
    visited = {"Architecture"}
    
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
                "loaded": True
            }
            simplified_graph["nodes"].append(node_data)
    
    # Add all possible links between valid nodes
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
                "loaded": True
            })
    
    # Second pass: Verify and fix node depths
    print("\nVerifying node connections...")
    changes_made = True
    iterations = 0
    max_iterations = 10  # Prevent infinite loops
    
    while changes_made and iterations < max_iterations:
        changes_made = False
        iterations += 1
        
        # Check each node's connections
        nodes_to_remove = []
        for node in simplified_graph["nodes"]:
            if node["id"] == "Architecture":
                continue
                
            # Find all connections for this node
            connections = []
            for link in simplified_graph["links"]:
                if link["source"] == node["id"]:
                    connections.append(link["target"])
                elif link["target"] == node["id"]:
                    connections.append(link["source"])
            
            # Get depths of connected nodes
            connected_depths = [
                valid_nodes[conn_id]
                for conn_id in connections
                if conn_id in valid_nodes
            ]
            
            # Node should be removed if:
            # 1. It has no connections to lower depth nodes
            # 2. For depth 2 nodes, it doesn't connect to any depth 1 node
            min_connected_depth = min(connected_depths) if connected_depths else float('inf')
            
            if min_connected_depth >= node["depth"]:
                print(f"Removing node {node['id']} at depth {node['depth']} - no valid connections to lower depth")
                nodes_to_remove.append(node["id"])
                changes_made = True
            elif node["depth"] == 2 and min_connected_depth > 1:
                print(f"Removing depth 2 node {node['id']} - no connections to depth 1")
                nodes_to_remove.append(node["id"])
                changes_made = True
        
        # Remove invalid nodes and their links
        if nodes_to_remove:
            simplified_graph["nodes"] = [
                node for node in simplified_graph["nodes"]
                if node["id"] not in nodes_to_remove
            ]
            simplified_graph["links"] = [
                link for link in simplified_graph["links"]
                if link["source"] not in nodes_to_remove and link["target"] not in nodes_to_remove
            ]
            # Update valid_nodes dict
            valid_nodes = {node["id"]: node["depth"] for node in simplified_graph["nodes"]}
    
    if iterations == max_iterations:
        print("Warning: Reached maximum iterations while verifying nodes")
    
    # Analyze the graph for issues
    analyze_graph(simplified_graph["nodes"], simplified_graph["links"])
    
    # Save to file
    output_path = os.path.join('public', 'graph.json')
    os.makedirs('public', exist_ok=True)
    
    print("\nSaving simplified graph...")
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(simplified_graph, f, ensure_ascii=False, indent=2)
    
    end_time = time.time()
    duration = end_time - start_time
    
    # Print statistics
    print(f"\nExport completed in {duration:.1f} seconds!")
    print(f"Simplified graph has:")
    
    # Count nodes by depth
    depth_counts = defaultdict(int)
    for node in simplified_graph["nodes"]:
        depth_counts[node["depth"]] += 1
    
    for depth in sorted(depth_counts.keys()):
        print(f"- {depth_counts[depth]} nodes at depth {depth}")
    print(f"- {len(simplified_graph['links'])} total links")
    print(f"\nGraph has been exported to {output_path}")

if __name__ == "__main__":
    main() 