import json
import os
from collections import defaultdict

def load_data():
    try:
        with open('data/nodes.json', 'r', encoding='utf-8') as f:
            nodes = json.load(f)
    except (json.JSONDecodeError, FileNotFoundError):
        nodes = {}
    
    try:
        with open('data/progress.json', 'r', encoding='utf-8') as f:
            progress = json.load(f)
    except (json.JSONDecodeError, FileNotFoundError):
        progress = {'to_visit': [], 'visited': set()}
    
    # Count edges by reading the file line by line
    edge_count = 0
    try:
        with open('data/edges.json', 'r', encoding='utf-8') as f:
            for line in f:
                if '"source":' in line:  # Count lines containing edges
                    edge_count += 1
    except FileNotFoundError:
        edge_count = 0
    
    return nodes, edge_count, progress

def format_time(seconds):
    hours = int(seconds // 3600)
    minutes = int((seconds % 3600) // 60)
    return f"{hours} hours and {minutes} minutes"

def analyze_progress():
    nodes, edge_count, progress = load_data()
    
    # Basic stats
    total_nodes = len(nodes)
    total_edges = edge_count
    to_visit = len(progress.get('to_visit', []))
    visited = len(progress.get('visited', set()))
    
    # Calculate nodes per depth
    depth_counts = defaultdict(int)
    for item in progress.get('to_visit', []):
        if isinstance(item, (list, tuple)) and len(item) >= 2:
            depth_counts[item[1]] += 1
    
    # Print stats
    print(f"\nCurrent Progress:")
    print(f"Total nodes collected: {total_nodes}")
    print(f"Approximate total connections: {total_edges}")
    print(f"\nQueue Status:")
    print(f"Pages visited: {visited}")
    print(f"Pages waiting to be processed: {to_visit}")
    
    print("\nPages waiting by depth:")
    for depth in sorted(depth_counts.keys()):
        print(f"Depth {depth}: {depth_counts[depth]} pages")
    
    # Estimate remaining time
    avg_edges_per_node = total_edges / total_nodes if total_nodes > 0 else 0
    print(f"\nAverage connections per page: {avg_edges_per_node:.1f}")
    
    # Time estimates for different concurrency levels
    print("\nTime Estimates:")
    
    # For depth 2 only
    depth2_pages = depth_counts.get(2, 0)
    print(f"\nDepth 2 only ({depth2_pages:,} pages):")
    for concurrent in [20, 50, 100]:
        time_depth2 = depth2_pages / concurrent * 1.1  # 1.1s per request
        print(f"  With {concurrent} concurrent requests: {format_time(time_depth2)}")
    
    # For depth 3 only
    depth3_pages = depth_counts.get(3, 0)
    print(f"\nDepth 3 only ({depth3_pages:,} pages):")
    for concurrent in [20, 50, 100]:
        time_depth3 = depth3_pages / concurrent * 1.1  # 1.1s per request
        print(f"  With {concurrent} concurrent requests: {format_time(time_depth3)}")
    
    # For all remaining pages
    print(f"\nAll remaining pages ({to_visit:,} pages):")
    for concurrent in [20, 50, 100]:
        time_all = to_visit / concurrent * 1.1  # 1.1s per request
        print(f"  With {concurrent} concurrent requests: {format_time(time_all)}")
    
    print("\nNote: These estimates assume Wikipedia's API will allow higher concurrency")
    print("In reality, too many concurrent requests might get rate-limited or blocked")

if __name__ == "__main__":
    analyze_progress() 