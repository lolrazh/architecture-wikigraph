'use client';

import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';

interface Node extends d3.SimulationNodeDatum {
  id: string;
  x?: number;
  y?: number;
  fx?: number | null;
  fy?: number | null;
  depth?: number;
}

interface Link {
  source: string | Node;
  target: string | Node;
  weight: number;
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

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch('/graph.json');
        const graphData: GraphData = await response.json();
        
        if (!svgRef.current) return;

        // Clear any existing content
        d3.select(svgRef.current).selectAll("*").remove();

        // Calculate depth for each node using BFS
        const depthMap = new Map<string, number>();
        const queue = [{ id: "Architecture", depth: 0 }];
        depthMap.set("Architecture", 0);

        while (queue.length > 0) {
          const current = queue.shift()!;
          const links = graphData.links.filter(l => 
            (typeof l.source === 'string' ? l.source : l.source.id) === current.id
          );
          
          for (const link of links) {
            const targetId = typeof link.target === 'string' ? link.target : link.target.id;
            if (!depthMap.has(targetId)) {
              depthMap.set(targetId, current.depth + 1);
              queue.push({ id: targetId, depth: current.depth + 1 });
            }
          }
        }

        // Add depth to nodes
        graphData.nodes.forEach(node => {
          node.depth = depthMap.get(node.id) || 0;
        });

        // Use window dimensions
        const width = window.innerWidth;
        const height = window.innerHeight;
        
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

        // Color scale for depth - using pastel colors
        const depthColors = [
          '#94a3b8', // Root (slate-400)
          '#fca5a5', // Depth 1 (red-300)
          '#86efac', // Depth 2 (green-300)
          '#93c5fd', // Depth 3 (blue-300)
          '#c4b5fd'  // Depth 4 (violet-300)
        ];
        
        const colorScale = d3.scaleOrdinal<number, string>()
          .domain([0, 1, 2, 3, 4])
          .range(depthColors);

        // Create force simulation
        const simulation = d3.forceSimulation<Node>(graphData.nodes)
          .force('link', d3.forceLink<Node, Link>(graphData.links)
            .id(d => d.id)
            .distance(100))
          .force('charge', d3.forceManyBody<Node>()
            .strength(d => d.id === "Architecture" ? -2000 : -800))
          .force('center', d3.forceCenter(width / 2, height / 2))
          .force('collision', d3.forceCollide().radius(30))
          .force('x', d3.forceX(width / 2).strength(0.05))
          .force('y', d3.forceY(height / 2).strength(0.05));

        // Create links
        const links = g.append('g')
          .selectAll('line')
          .data(graphData.links)
          .join('line')
          .attr('stroke', 'rgba(255, 255, 255, 0.3)')
          .attr('stroke-opacity', 0.6)
          .attr('stroke-width', 1);

        // Create nodes
        const nodes = g.append('g')
          .selectAll<SVGGElement, Node>('g')
          .data(graphData.nodes)
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
          .attr('r', d => d.id === "Architecture" ? 12 : 8)
          .attr('fill', d => colorScale(d.depth || 0))
          .attr('stroke', d => {
            const color = d3.color(colorScale(d.depth || 0));
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
          .attr('y', d => d.id === "Architecture" ? 24 : 20)
          .attr('dy', 0)
          .attr('text-anchor', 'middle')
          .attr('fill', '#fff')
          .attr('font-size', d => d.id === "Architecture" ? '14px' : '11px')
          .attr('font-family', 'Inter, system-ui, sans-serif')
          .style('pointer-events', 'none')
          .style('text-shadow', '0 1px 8px rgba(0,0,0,0.5)')
          .call(wrap, 80);

        // Add title for hover tooltip
        nodes.append('title')
          .text(d => denormalizeTitle(d.id));

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
      } catch (error) {
        console.error('Error loading graph data:', error);
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
      <div className="absolute bottom-2 right-2 text-[8px] text-gray-300 font-medium">
        "A SANDHEEP RAJKUMAR PROJECT"
      </div>
    </main>
  );
} 