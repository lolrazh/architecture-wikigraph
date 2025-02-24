import { create } from 'zustand';
import type { GraphState, GraphActions } from '../types/graph';

type GraphStore = GraphState & GraphActions;

export const useGraphStore = create<GraphStore>((set) => ({
  // Initial state
  nodesData: [],
  linksData: [],
  selectedNode: null,
  expandedNodes: new Set<string>(),
  highlightedConnections: new Set<string>(),
  isLoading: false,
  error: null,

  // Actions
  setNodesData: (nodes) => set({ nodesData: nodes }),
  
  setLinksData: (links) => set({ linksData: links }),
  
  setSelectedNode: (node) => set({ selectedNode: node }),
  
  addExpandedNode: (nodeId) =>
    set((state) => ({
      expandedNodes: new Set([...state.expandedNodes, nodeId])
    })),
  
  removeExpandedNode: (nodeId) =>
    set((state) => {
      const newSet = new Set(state.expandedNodes);
      newSet.delete(nodeId);
      return { expandedNodes: newSet };
    }),
  
  addHighlightedConnection: (nodeId) =>
    set((state) => ({
      highlightedConnections: new Set([...state.highlightedConnections, nodeId])
    })),
  
  removeHighlightedConnection: (nodeId) =>
    set((state) => {
      const newSet = new Set(state.highlightedConnections);
      newSet.delete(nodeId);
      return { highlightedConnections: newSet };
    }),
  
  clearHighlights: () =>
    set({ highlightedConnections: new Set<string>() }),
  
  setLoading: (isLoading) => set({ isLoading }),
  
  setError: (error) => set({ error })
})); 