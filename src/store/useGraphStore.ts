import { create } from 'zustand';
import type { GraphState, GraphActions, Node, Link } from '../types/graph';

type GraphStore = GraphState & GraphActions;

export const useGraphStore = create<GraphStore>((set) => ({
  // Initial state
  nodesData: [],
  linksData: [],
  selectedNode: null,
  isLoading: false,
  error: null,
  
  // Keep empty sets for backward compatibility, but we won't use them
  expandedNodes: new Set<string>(),
  highlightedConnections: new Set<string>(),

  // Actions
  setNodesData: (nodes) => set({ nodesData: nodes }),
  
  setLinksData: (links) => set({ linksData: links }),
  
  setSelectedNode: (node) => set({ selectedNode: node }),
  
  // Simplified versions of these functions that do nothing
  addExpandedNode: () => {}, 
  removeExpandedNode: () => {},
  addHighlightedConnection: () => {},
  addHighlightedConnections: () => {},
  removeHighlightedConnection: () => {},
  clearHighlights: () => {},
  
  setLoading: (isLoading) => set({ isLoading }),
  
  setError: (error) => set({ error })
})); 