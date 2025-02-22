'use client';

import React, { useEffect, useRef } from 'react';
import ForceGraph3D from '3d-force-graph';
import { GraphProps, Node } from '../types/graph';

// Helper function to get node color based on depth
function getNodeColor(depth: number): string {
  switch (depth) {
    case 0: return '#96bfea'; // Root (Architecture) - Light blue
    case 1: return '#a0c7a9'; // Direct connections - Sage green
    case 2: return '#e1acdc'; // Secondary connections - Light purple
    default: return '#94a3b8'; // Default - Gray
  }
}

// Helper function to get node size based on depth
function getNodeSize(node: Node): number {
  switch (node.depth) {
    case 0: return 25; // Root node (Architecture) - Much bigger
    case 1: return 10; // Direct connections
    case 2: return 6;  // Secondary connections
    default: return 4;
  }
}

export const Graph: React.FC<GraphProps> = ({ width, height, data, onNodeClick }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const graphRef = useRef<any>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Initialize the force graph
    const graph = ForceGraph3D()(containerRef.current)
      // Set dimensions
      .width(width)
      .height(height)
      // Set background color
      .backgroundColor('#0a0a0a')
      // Node styling
      .nodeColor((node: any) => getNodeColor((node as Node).depth))
      .nodeVal((node: any) => getNodeSize(node as Node))
      .nodeLabel(node => (node as Node).id.replace(/_/g, ' '))
      // Link styling
      .linkColor(() => '#cbd5e1') // Lighter gray for edges
      .linkOpacity(0.4) // Reduced opacity
      .linkWidth(0.5)   // Thinner links
      // Add interaction and data
      .onNodeClick((node: any) => onNodeClick?.(node as Node))
      .graphData(data);

    // Configure forces - Adjust to accommodate larger root node
    graph.d3Force('charge')?.strength(-3000).distanceMax(500);
    graph.d3Force('link')?.distance(300); // Increased distance
    graph.d3Force('center')?.strength(1);
    graph.d3Force('collide')?.radius(80); // Increased collision radius

    // Store reference for cleanup
    graphRef.current = graph;

    // Cleanup
    return () => {
      if (graphRef.current) {
        graphRef.current._destructor();
      }
    };
  }, [width, height, data, onNodeClick]);

  return <div ref={containerRef} />;
}; 