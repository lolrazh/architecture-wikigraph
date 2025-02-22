'use client';

import React, { useEffect, useRef } from 'react';
import ForceGraph3D from '3d-force-graph';
import { GraphProps, Node } from '../types/graph';

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
      .nodeAutoColorBy('depth')
      .nodeVal(node => (node as Node).category === 'root' ? 8 : 5)
      .nodeLabel(node => (node as Node).id.replace(/_/g, ' '))
      // Link styling
      .linkColor(() => '#94a3b8')
      .linkOpacity(0.6)
      .linkWidth(1)
      // Add interaction and data
      .onNodeClick((node: any) => onNodeClick?.(node as Node))
      .graphData(data);

    // Configure forces
    graph.d3Force('charge')?.strength(-3000).distanceMax(500);
    graph.d3Force('link')?.distance(250);
    graph.d3Force('center')?.strength(1);
    graph.d3Force('collide')?.radius(60);

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

// Helper function to get node color based on depth
function getNodeColor(depth: number): string {
  switch (depth) {
    case 0: return '#94a3b8'; // Root (Architecture)
    case 1: return '#fca5a5'; // Direct connections
    case 2: return '#86efac'; // Secondary connections
    default: return '#94a3b8';
  }
} 