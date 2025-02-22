'use client';

import React, { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { Space_Mono } from 'next/font/google';
import { GraphData, Node } from '../types/graph';

// Dynamically import the Graph component with no SSR
const Graph = dynamic(() => import('../components/Graph').then(mod => mod.Graph), {
  ssr: false,
});

const spaceMono = Space_Mono({
  weight: '400',
  subsets: ['latin'],
});

export default function Home() {
  const [graphData, setGraphData] = useState<GraphData>({ nodes: [], links: [] });
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Load graph data
    const loadGraphData = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await fetch('/graph.json');
        if (!response.ok) {
          throw new Error(`Failed to load graph data: ${response.statusText}`);
        }
        const data = await response.json();
        // Validate data structure
        if (!Array.isArray(data.nodes) || !Array.isArray(data.links)) {
          throw new Error('Invalid graph data structure');
        }
        setGraphData(data);
      } catch (error) {
        console.error('Error loading graph data:', error);
        setError(error instanceof Error ? error.message : 'Failed to load graph data');
      } finally {
        setLoading(false);
      }
    };

    loadGraphData();
  }, []);

  useEffect(() => {
    // Set initial dimensions
    setDimensions({
      width: window.innerWidth,
      height: window.innerHeight,
    });

    // Update dimensions on window resize
    const handleResize = () => {
      setDimensions({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleNodeClick = (node: Node) => {
    window.open(`https://en.wikipedia.org/wiki/${encodeURIComponent(node.id)}`, '_blank');
  };

  if (loading) {
    return (
      <main className={`fixed inset-0 flex items-center justify-center bg-[#0a0a0a] text-gray-200 ${spaceMono.className}`}>
        <div className="text-center">
          <div className="mb-4 text-xl">Loading graph data...</div>
          <div className="text-gray-400">Please wait while we prepare the visualization</div>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className={`fixed inset-0 flex items-center justify-center bg-[#0a0a0a] text-gray-200 ${spaceMono.className}`}>
        <div className="text-center">
          <div className="mb-4 text-xl text-red-500">Error</div>
          <div className="text-gray-400">{error}</div>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-gray-800 rounded hover:bg-gray-700"
          >
            Retry
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className={`fixed inset-0 overflow-hidden bg-[#0a0a0a] text-gray-200 ${spaceMono.className}`}>
      <Graph
        width={dimensions.width}
        height={dimensions.height}
        data={graphData}
        onNodeClick={handleNodeClick}
      />
      <div className="absolute bottom-2 right-2 text-[8px] text-gray-400 font-bold">
        "A SANDHEEP RAJKUMAR PROJECT"
      </div>
    </main>
  );
} 