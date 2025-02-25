'use client';

import React, { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { Space_Mono } from 'next/font/google';
import { GraphData } from '../types/graph';
import { LoadingOverlay, LoadingState } from '../components/LoadingOverlay';
import { useGraphStore } from '../store/useGraphStore';

// Dynamically import the Graph component with no SSR
const Graph = dynamic(() => import('../components/Graph'), {
  ssr: false,
});

const spaceMono = Space_Mono({
  weight: '400',
  subsets: ['latin'],
});

export default function Home() {
  const [graphData, setGraphData] = useState<GraphData>({ nodes: [], links: [] });
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [loadingState, setLoadingState] = useState<LoadingState>({
    dataLoading: true,
    graphModuleLoading: true,
    graphInitializing: true
  });
  const [error, setError] = useState<string | null>(null);
  const selectedNode = useGraphStore(state => state.selectedNode);

  // Handle opening Wikipedia when a node is selected
  useEffect(() => {
    if (selectedNode) {
      try {
        const wikiWindow = window.open(
          `https://en.wikipedia.org/wiki/${encodeURIComponent(selectedNode.id)}`,
          `wiki-${selectedNode.id}`, // Unique name prevents multiple windows
          'noopener,noreferrer'
        );
        if (wikiWindow) {
          wikiWindow.focus();
        }
      } catch (error) {
        console.error('Failed to open Wikipedia:', error);
      }
    }
  }, [selectedNode]);

  useEffect(() => {
    // Load graph data
    const loadGraphData = async () => {
      try {
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
        setLoadingState(prev => ({ ...prev, dataLoading: false }));
      } catch (error) {
        console.error('Error loading graph data:', error);
        setError(error instanceof Error ? error.message : 'Failed to load graph data');
        setLoadingState(prev => ({ ...prev, dataLoading: false }));
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

  if (error) {
    return (
      <main className={`fixed inset-0 flex items-center justify-center bg-[#0a0a0a] text-gray-200 ${spaceMono.className}`}>
        <div className="absolute top-4 left-4 text-xl font-bold z-10">
          Architecture Wikigraph
        </div>
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
      <LoadingOverlay loadingState={loadingState} />
      <Graph
        width={dimensions.width}
        height={dimensions.height}
        data={graphData}
      />
    </main>
  );
} 