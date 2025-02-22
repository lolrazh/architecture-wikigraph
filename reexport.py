import json
import os
import time
from collections import defaultdict
from typing import Dict, Set, List

def load_edges() -> Dict:
    """Load edges from the data file."""
    edges_file = os.path.join('data', 'edges.json')
    if not os.path.exists(edges_file):
        return {}
    
    with open(edges_file, 'r', encoding='utf-8') as f:
        # Convert string tuple keys back to actual tuples
        return {tuple(eval(k)): v for k, v in json.load(f).items()}

def calculate_depths(edges: Dict) -> Dict[str, int]:
    """Calculate node depths using BFS from root."""
    depths = {"Architecture": 0}
    queue = [("Architecture", 0)]
    visited = {"Architecture"}
    
    # Build adjacency list for faster lookup
    adjacency = defaultdict(set)
    for edge in edges.values():
        source, target = edge["source"], edge["target"]
        adjacency[source].add(target)
        adjacency[target].add(source)
    
    # BFS to find shortest paths
    while queue:
        current, depth = queue.pop(0)
        for neighbor in adjacency[current]:
            if neighbor not in visited:
                depths[neighbor] = depth + 1
                visited.add(neighbor)
                queue.append((neighbor, depth + 1))
    
    return depths

def analyze_graph(edges: Dict):
    """Analyze the graph structure and print statistics."""
    # Calculate depths
    depths = calculate_depths(edges)
    
    # Collect all nodes
    nodes = set()
    for edge in edges.values():
        nodes.add(edge["source"])
        nodes.add(edge["target"])
    
    # Count nodes by depth
    depth_counts = defaultdict(int)
    for node in nodes:
        depth = depths.get(node, float('inf'))
        if depth <= 2:  # Only count nodes that will be in final export
            depth_counts[depth] += 1
    
    # Count connections between depths
    depth_connections = defaultdict(lambda: defaultdict(int))
    for edge in edges.values():
        source_depth = depths.get(edge["source"], float('inf'))
        target_depth = depths.get(edge["target"], float('inf'))
        if source_depth <= 2 and target_depth <= 2:  # Only count connections that will be in final export
            depth_connections[source_depth][target_depth] += 1
    
    # Print analysis
    print("\nGraph Analysis:")
    print(f"Total nodes found: {len(nodes)}")
    print(f"Total edges collected: {len(edges)}")
    
    print("\nNodes by depth (only counting nodes with depth ≤ 2):")
    for depth in sorted(depth_counts.keys()):
        print(f"Depth {depth}: {depth_counts[depth]} nodes")
    
    print("\nConnections between depths:")
    for d1 in sorted(depth_connections.keys()):
        for d2 in sorted(depth_connections[d1].keys()):
            count = depth_connections[d1][d2]
            print(f"Depth {d1} → Depth {d2}: {count} edges")
    
    # Find orphaned nodes (nodes with no connections at depth ≤ 2)
    node_connections = defaultdict(int)
    for edge in edges.values():
        source_depth = depths.get(edge["source"], float('inf'))
        target_depth = depths.get(edge["target"], float('inf'))
        if source_depth <= 2 and target_depth <= 2:
            node_connections[edge["source"]] += 1
            node_connections[edge["target"]] += 1
    
    orphaned = [node for node in nodes 
                if depths.get(node, float('inf')) <= 2 and 
                node_connections[node] == 0]
    
    if orphaned:
        print(f"\nFound {len(orphaned)} orphaned nodes (nodes with no connections):")
        for node in sorted(orphaned):
            print(f"- {node} (depth {depths.get(node, 'unknown')})")

def export_graph(edges: Dict):
    """Export the graph for visualization."""
    # Calculate depths
    depths = calculate_depths(edges)
    
    # Collect all nodes first
    nodes = set()
    for edge in edges.values():
        nodes.add(edge["source"])
        nodes.add(edge["target"])
    
    # Create graph data structure
    graph_data = {
        "nodes": [
            {
                "id": title,
                "depth": depths.get(title, float('inf')),
                "category": "root" if title == "Architecture" else "node"
            }
            for title in nodes
            if depths.get(title, float('inf')) <= 2
        ],
        "links": [
            {
                "source": edge["source"],
                "target": edge["target"],
                "depth": max(
                    depths.get(edge["source"], float('inf')),
                    depths.get(edge["target"], float('inf'))
                )
            }
            for edge in edges.values()
            if (depths.get(edge["source"], float('inf')) <= 2 and
                depths.get(edge["target"], float('inf')) <= 2)
        ]
    }
    
    # Ensure public directory exists
    os.makedirs('public', exist_ok=True)
    
    # Save to file
    output_path = os.path.join('public', 'graph.json')
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(graph_data, f, ensure_ascii=False, indent=2)
    
    return output_path

def main():
    print("Starting graph analysis and export process...")
    start_time = time.time()
    
    # Load edges
    print("\nLoading edge data...")
    edges = load_edges()
    
    # Analyze the graph
    print("\nAnalyzing graph structure...")
    analyze_graph(edges)
    
    # Export the graph
    print("\nExporting graph for visualization...")
    output_path = export_graph(edges)
    
    # Print completion message
    end_time = time.time()
    duration = end_time - start_time
    print(f"\nProcess completed in {duration:.1f} seconds!")
    print(f"Graph has been exported to {output_path}")

if __name__ == "__main__":
    main() 