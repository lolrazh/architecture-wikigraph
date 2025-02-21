'use client';

import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { Space_Mono } from 'next/font/google';

const spaceMono = Space_Mono({
  weight: '400',
  subsets: ['latin'],
});

// Add type definitions for the new data format
type NodeCategory = 'root' | 'architecture' | 'related';

interface NodeData {
  id: string;
  depth: number;
  category: NodeCategory;
  group: number;
  title: string;
  first_paragraph: string;
  sections: string[];
  categories: string[];
  isExpanded?: boolean;
}

interface Node extends d3.SimulationNodeDatum, NodeData {}

interface Link extends d3.SimulationLinkDatum<Node> {
  source: Node;
  target: Node;
  value: number;
  section_context?: string;
  sentence_context?: string;
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
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [titlePosition, setTitlePosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [graphData, setGraphData] = useState<GraphData | null>(null);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set(['Architecture']));
  const [visibleNodes, setVisibleNodes] = useState<Node[]>([]);
  const [visibleLinks, setVisibleLinks] = useState<Link[]>([]);
  const simulationRef = useRef<d3.Simulation<Node, Link> | null>(null);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    // Prevent text selection during drag
    e.preventDefault();
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      setTitlePosition(prev => ({
        x: prev.x + e.movementX,
        y: prev.y + e.movementY
      }));
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    // Add global mouse event listeners
    document.addEventListener('mousemove', handleMouseMove as any);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove as any);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  const expandNode = (nodeId: string) => {
    if (expandedNodes.has(nodeId) || !graphData) return;
    
    const newExpandedNodes = new Set(expandedNodes);
    newExpandedNodes.add(nodeId);
    setExpandedNodes(newExpandedNodes);

    // Get all nodes that are directly connected to expanded nodes
    const newVisibleNodes = graphData.nodes.filter(node => 
      newExpandedNodes.has(node.id) || 
      graphData.links.some(link => 
        (link.source === nodeId && newExpandedNodes.has((link.target as Node).id)) ||
        (link.target === nodeId && newExpandedNodes.has((link.source as Node).id))
      )
    );

    // Get all links between visible nodes
    const newVisibleLinks = graphData.links.filter(link => 
      newExpandedNodes.has((link.source as Node).id) && 
      newExpandedNodes.has((link.target as Node).id)
    );

    setVisibleNodes(newVisibleNodes);
    setVisibleLinks(newVisibleLinks);

    // Restart simulation with new nodes
    if (simulationRef.current) {
      simulationRef.current.nodes(newVisibleNodes);
      simulationRef.current.force('link', d3.forceLink<Node, Link>(newVisibleLinks)
        .id(d => d.id)
        .distance(d => {
          const source = d.source as Node;
          const target = d.target as Node;
          return source.category === target.category ? 100 : 150;
        }));
      simulationRef.current.alpha(1).restart();
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        console.log('Fetching graph data...');
        const response = await fetch('/graph.json');
        if (!response.ok) {
          throw new Error(`Failed to fetch graph data: ${response.status} ${response.statusText}`);
        }
        const data: GraphData = await response.json();
        console.log('Graph data loaded:', {
          nodes: data.nodes.length,
          links: data.links.length
        });

        setGraphData(data);
        
        // Initialize with only the Architecture node and its immediate neighbors
        const initialNodes = data.nodes.filter(node => 
          node.id === 'Architecture' ||
          data.links.some(link => 
            (link.source === 'Architecture' && (link.target as Node).id === node.id) ||
            (link.target === 'Architecture' && (link.source as Node).id === node.id)
          )
        );

        const initialLinks = data.links.filter(link => 
          (link.source as Node).id === 'Architecture' ||
          (link.target as Node).id === 'Architecture'
        );

        setVisibleNodes(initialNodes);
        setVisibleLinks(initialLinks);
        
        if (!svgRef.current) {
          console.error('SVG ref is not available');
          return;
        }

        // Clear any existing content
        d3.select(svgRef.current).selectAll("*").remove();

        // Use window dimensions
        const width = window.innerWidth;
        const height = window.innerHeight;
        console.log('Canvas dimensions:', { width, height });
        
        // Create SVG
        const svg = d3.select(svgRef.current)
          .attr('width', width)
          .attr('height', height)
          .attr('class', 'bg-[#0a0a0a]');

        // Add zoom functionality
        const g = svg.append('g');
        svg.call(
          d3.zoom<SVGSVGElement, unknown>()
            .extent([[0, 0], [width, height]])
            .scaleExtent([0.1, 4])
            .on('zoom', (event) => {
              g.attr('transform', event.transform);
            })
        );

        // Color scale based on category
        const categoryColors = {
          'root': '#94a3b8',      // slate-400
          'architecture': '#fca5a5', // red-300
          'related': '#86efac'    // green-300
        };

        // Create force simulation
        const simulation = d3.forceSimulation<Node>(initialNodes)
          .force('link', d3.forceLink<Node, Link>(initialLinks)
            .id(d => d.id)
            .distance(d => {
              const source = d.source as Node;
              const target = d.target as Node;
              return source.category === target.category ? 100 : 150;
            }))
          .force('charge', d3.forceManyBody<Node>()
            .strength(d => d.category === 'root' ? -2000 : 
                         d.category === 'architecture' ? -1000 : -500))
          .force('center', d3.forceCenter(width / 2, height / 2))
          .force('collision', d3.forceCollide().radius(d => 
            d.category === 'root' ? 40 :
            d.category === 'architecture' ? 30 : 20))
          .force('x', d3.forceX(width / 2).strength(0.05))
          .force('y', d3.forceY(height / 2).strength(0.05));

        simulationRef.current = simulation;

        // Create links
        const links = g.append('g')
          .selectAll('line')
          .data(initialLinks)
          .join('line')
          .attr('stroke', d => {
            const source = d.source as Node;
            const target = d.target as Node;
            return source.category === target.category ? 
              'rgba(255, 255, 255, 0.3)' : 'rgba(255, 255, 255, 0.5)';
          })
          .attr('stroke-opacity', 0.6)
          .attr('stroke-width', d => {
            const source = d.source as Node;
            const target = d.target as Node;
            return (source.category === 'architecture' || target.category === 'architecture') ? 2 : 1;
          });

        // Create nodes
        const nodes = g.append('g')
          .selectAll<SVGGElement, Node>('g')
          .data(initialNodes)
          .join('g')
          .call(d3.drag<SVGGElement, Node>()
            .on('start', (event, d) => {
              if (!event.active) simulation.alphaTarget(0.3).restart();
              d.fx = d.x;
              d.fy = d.y;
            })
            .on('drag', (event, d) => {
              d.fx = event.x;
              d.fy = event.y;
            })
            .on('end', (event, d) => {
              if (!event.active) simulation.alphaTarget(0);
              d.fx = null;
              d.fy = null;
            }));

        // Add circles to nodes
        nodes.append('circle')
          .attr('r', d => d.category === 'root' ? 12 : 
                         d.category === 'architecture' ? 10 : 8)
          .attr('fill', d => categoryColors[d.category])
          .attr('stroke', d => {
            const color = d3.color(categoryColors[d.category]);
            return color ? color.darker(1.5).toString() : '#000';
          })
          .attr('stroke-width', 1)
          .style('transition', 'stroke-width 0.2s ease')
          .on('mouseover', function() {
            d3.select(this)
              .attr('stroke-width', 3);
          })
          .on('mouseout', function() {
            d3.select(this)
              .attr('stroke-width', 1);
          });

        // Add labels to nodes with text wrapping
        nodes.append('text')
          .text(d => denormalizeTitle(d.id))
          .attr('x', 0)
          .attr('y', d => d.category === 'root' ? 24 : 
                         d.category === 'architecture' ? 22 : 20)
          .attr('dy', 0)
          .attr('text-anchor', 'middle')
          .attr('fill', '#fff')
          .attr('font-size', d => d.category === 'root' ? '14px' : 
                                 d.category === 'architecture' ? '12px' : '11px')
          .attr('font-family', 'Inter, system-ui, sans-serif')
          .style('pointer-events', 'none')
          .style('text-shadow', '0 1px 8px rgba(0,0,0,0.5)')
          .call(wrap, 80);

        // Add title for hover tooltip
        nodes.append('title')
          .text(d => denormalizeTitle(d.id));

        // Add double-click handler to expand nodes
        nodes.on('dblclick', (event, d) => {
          event.preventDefault();
          event.stopPropagation();
          expandNode(d.id);
        });

        // Add click handler to open Wikipedia page
        nodes.on('click', (event, d) => {
          const title = denormalizeTitle(d.id);
          window.open(`https://en.wikipedia.org/wiki/${encodeURIComponent(title)}`, '_blank');
        });

        // Update positions on each tick
        simulation.on('tick', () => {
          links
            .attr('x1', d => (d.source as Node).x!)
            .attr('y1', d => (d.source as Node).y!)
            .attr('x2', d => (d.target as Node).x!)
            .attr('y2', d => (d.target as Node).y!);

          nodes.attr('transform', d => `translate(${d.x},${d.y})`);
        });

        setIsLoading(false);
        setError(null);
      } catch (error) {
        console.error('Error in visualization:', error);
        setError(error instanceof Error ? error.message : 'Unknown error occurred');
        setIsLoading(false);
      }
    };

    fetchData();

    // Add window resize handler
    const handleResize = () => {
      if (svgRef.current) {
        svgRef.current.setAttribute('width', window.innerWidth.toString());
        svgRef.current.setAttribute('height', window.innerHeight.toString());
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <main className="fixed inset-0 overflow-hidden bg-[#0a0a0a] text-gray-200">
      <svg ref={svgRef} className="w-screen h-screen" />
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-gray-400 font-medium">Loading visualization...</div>
        </div>
      )}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-red-400 font-medium bg-red-900/20 p-4 rounded-lg">
            Error: {error}
          </div>
        </div>
      )}
      <div 
        className="absolute px-6 py-3 backdrop-blur-md bg-white/5 rounded-2xl border border-white/10 shadow-xl cursor-move select-none"
        style={{
          transform: `translate(calc(-50% + ${titlePosition.x}px), calc(2rem + ${titlePosition.y}px))`,
          left: '50%',
        }}
        onMouseDown={handleMouseDown}
      >
        <h1 className={`text-lg bg-gradient-to-r from-blue-300 via-purple-300 to-pink-300 text-transparent bg-clip-text ${spaceMono.className}`}>
          Architecture Wikigraph
        </h1>
        <div className="mt-2 text-xs text-gray-400">
          Double-click nodes to expand • Click to open Wikipedia
        </div>
      </div>
      <div className="absolute bottom-2 right-2 text-[8px] text-gray-400 font-medium">
        A SANDHEEP RAJKUMAR PROJECT
      </div>
    </main>
  );
} 