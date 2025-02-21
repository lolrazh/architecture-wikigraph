'use client';

import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { SimulationNodeDatum } from 'd3-force';
import { Space_Mono } from 'next/font/google';

const spaceMono = Space_Mono({
  weight: '400',
  subsets: ['latin'],
});

// Add type definitions for D3 value functions
type D3ValueFn<T, U> = d3.ValueFn<d3.BaseType, T, U>;

// Add type definitions for the simplified data format
type NodeCategory = 'root' | 'architecture';

interface NodeData {
  id: string;
  depth: number;
  category: NodeCategory;
  loaded?: boolean;
  x?: number;
  y?: number;
  fx?: number | null;
  fy?: number | null;
}

interface Node extends d3.SimulationNodeDatum, NodeData {}

interface Link extends d3.SimulationLinkDatum<Node> {
  source: Node | string;
  target: Node | string;
  depth?: number;
  loaded?: boolean;
}

interface GraphData {
  nodes: Node[];
  links: Link[];
}

function denormalizeTitle(title: string): string {
  return title.replace(/_/g, ' ');
}

// Function to wrap text
function wrap(text: d3.Selection<SVGTextElement, Node, SVGGElement, unknown>, width: number) {
  text.each(function() {
    const text = d3.select(this);
    const words = text.text().split(/\s+/);
    const lineHeight = 1.1; // ems
    const y = text.attr('y');
    const dy = parseFloat(text.attr('dy') || '0');

    let line: string[] = [];
    let lineNumber = 0;
    let tspan = text.text(null).append('tspan')
      .attr('x', 0)
      .attr('y', y)
      .attr('dy', dy + 'em');

    words.forEach((word, i) => {
      line.push(word);
      tspan.text(line.join(' '));

      if ((tspan.node()?.getComputedTextLength() || 0) > width) {
        line.pop();
        tspan.text(line.join(' '));
        line = [word];
        tspan = text.append('tspan')
          .attr('x', 0)
          .attr('y', y)
          .attr('dy', ++lineNumber * lineHeight + dy + 'em')
          .text(word);
      }
    });
  });
}

export default function Home() {
  const svgRef = useRef<SVGSVGElement>(null);
  const [graphData, setGraphData] = useState<GraphData>({ nodes: [], links: [] });
  const [simulation, setSimulation] = useState<d3.Simulation<Node, Link> | null>(null);

  // Helper function to get node ID regardless of format
  const getNodeId = (node: any): string => {
    return typeof node === 'string' ? node : node.id;
  };

  // Function to merge new data with existing graph
  const mergeGraphData = (existing: GraphData, newData: GraphData) => {
    const nodes = [...existing.nodes];
    const links = [...existing.links];
    
    // Add new nodes
    newData.nodes.forEach(newNode => {
      const existingIndex = nodes.findIndex(n => n.id === newNode.id);
      if (existingIndex === -1) {
        nodes.push(newNode);
      } else {
        nodes[existingIndex] = { ...nodes[existingIndex], ...newNode };
      }
    });

    // Add new links
    newData.links.forEach(newLink => {
      const existingIndex = links.findIndex(l => 
        getNodeId(l.source) === getNodeId(newLink.source) && 
        getNodeId(l.target) === getNodeId(newLink.target)
      );
      if (existingIndex === -1) {
        // For new links, ensure source and target are node references
        const sourceNode = nodes.find(n => n.id === getNodeId(newLink.source));
        const targetNode = nodes.find(n => n.id === getNodeId(newLink.target));
        if (sourceNode && targetNode) {
          links.push({
            ...newLink,
            source: sourceNode,
            target: targetNode
          });
        }
      } else {
        links[existingIndex] = { ...links[existingIndex], ...newLink };
      }
    });

    return { nodes, links };
  };

  useEffect(() => {
    const initGraph = async () => {
      if (!svgRef.current) return;

      // Clear any existing content
      d3.select(svgRef.current).selectAll('*').remove();

      // Setup SVG
      const width = window.innerWidth;
      const height = window.innerHeight;
      const svg = d3.select(svgRef.current)
        .attr('width', width)
        .attr('height', height);

      // Create container group for zoom
      const g = svg.append('g');

      // Setup zoom behavior
      const zoom = d3.zoom<SVGSVGElement, unknown>()
        .scaleExtent([0.1, 4])
        .on('zoom', (event) => g.attr('transform', event.transform));

      svg.call(zoom);

      // Fetch all graph data
      console.log('Loading complete graph data...');
      const response = await fetch('/api/node-connections?id=Architecture');
      const data = await response.json();
      
      console.log('Received graph data:', {
        nodes: data.nodes.length,
        links: data.links.length
      });

      // Process links to use node references instead of string IDs
      const processedLinks = data.links.map((link: any) => {
        const sourceNode = data.nodes.find((n: Node) => n.id === getNodeId(link.source));
        const targetNode = data.nodes.find((n: Node) => n.id === getNodeId(link.target));
        return {
          ...link,
          source: sourceNode || link.source,
          target: targetNode || link.target
        };
      });

      // Create simulation with stronger initial forces for better layout
      const sim = d3.forceSimulation<Node>(data.nodes)
        .force('link', d3.forceLink<Node, Link>(processedLinks)
          .id(d => d.id)
          .distance(200)
        )
        .force('charge', d3.forceManyBody<Node>()
          .strength(-2000)
        )
        .force('center', d3.forceCenter(width / 2, height / 2))
        .force('collision', d3.forceCollide(50));

      setSimulation(sim);
      setGraphData({ nodes: data.nodes, links: processedLinks });

      // Color scheme based on depth
      const getNodeColor = (depth: number): string => {
        switch (depth) {
          case 0: return '#94a3b8'; // Root (Architecture)
          case 1: return '#fca5a5'; // Direct connections
          case 2: return '#86efac'; // Secondary connections (depth 2)
          default: return '#94a3b8';
        }
      };

      // Create links
      const links = g.append('g')
        .selectAll<SVGLineElement, Link>('line')
        .data(processedLinks)
        .join('line')
        .attr('stroke', 'rgba(255, 255, 255, 0.3)')
        .attr('stroke-width', 1);

      // Create nodes
      const nodes = g.append('g')
        .selectAll<SVGGElement, Node>('g')
        .data(data.nodes)
        .join('g')
        .call(d3.drag<SVGGElement, Node>()
          .on('start', (event, d) => {
            if (!event.active) sim.alphaTarget(0.3).restart();
            d.fx = d.x;
            d.fy = d.y;
          })
          .on('drag', (event, d) => {
            d.fx = event.x;
            d.fy = event.y;
          })
          .on('end', (event, d) => {
            if (!event.active) sim.alphaTarget(0);
            d.fx = null;
            d.fy = null;
          }) as any);

      // Add circles to nodes
      nodes.append('circle')
        .attr('r', function(d: Node) { return d.category === 'root' ? 12 : 8; } as any)
        .attr('fill', function(d: Node) { return getNodeColor(d.depth); } as any)
        .attr('stroke', '#fff')
        .attr('stroke-width', 1);

      // Add labels
      nodes.append('text')
        .text(function(d: Node) { return denormalizeTitle(d.id); } as any)
        .attr('x', 0)
        .attr('y', function(d: Node) { return d.category === 'root' ? 24 : 20; } as any)
        .attr('text-anchor', 'middle')
        .attr('fill', '#fff')
        .attr('font-size', function(d: Node) { return d.category === 'root' ? '14px' : '12px'; } as any)
        .style('pointer-events', 'none');

      // Add click handler for Wikipedia links
      nodes.on('click', function(this: SVGGElement, event: any, d: Node) {
        window.open(`https://en.wikipedia.org/wiki/${encodeURIComponent(d.id)}`, '_blank');
      });

      // Update positions on tick
      sim.on('tick', () => {
        links
          .attr('x1', function(d: Link) { return (d.source as Node).x!; })
          .attr('y1', function(d: Link) { return (d.source as Node).y!; })
          .attr('x2', function(d: Link) { return (d.target as Node).x!; })
          .attr('y2', function(d: Link) { return (d.target as Node).y!; });

        nodes.attr('transform', function(d: Node) { 
          return `translate(${d.x},${d.y})`; 
        });
      });

      // Handle window resize
      const handleResize = () => {
        const width = window.innerWidth;
        const height = window.innerHeight;
        svg.attr('width', width).attr('height', height);
        sim.force('center', d3.forceCenter(width / 2, height / 2));
      };

      window.addEventListener('resize', handleResize);
      return () => {
        window.removeEventListener('resize', handleResize);
        sim.stop();
      };
    };

    initGraph();
  }, []);

  return (
    <main className="fixed inset-0 overflow-hidden bg-[#0a0a0a] text-gray-200">
      <svg ref={svgRef} className="w-screen h-screen" />
      <div className="absolute bottom-2 right-2 text-[8px] text-gray-400 font-medium">
        A SANDHEEP RAJKUMAR PROJECT
      </div>
    </main>
  );
} 