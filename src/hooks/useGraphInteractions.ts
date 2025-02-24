import { useCallback } from 'react';
import { useGraphStore } from '../store/useGraphStore';
import type { Node } from '../types/graph';

export const useGraphInteractions = () => {
  const {
    selectedNode,
    expandedNodes,
    highlightedConnections,
    setSelectedNode,
    addExpandedNode,
    removeExpandedNode,
    addHighlightedConnection,
    removeHighlightedConnection,
    clearHighlights
  } = useGraphStore();

  const handleNodeClick = useCallback((node: Node, event: MouseEvent) => {
    // Handle regular click
    if (!event.shiftKey && !event.ctrlKey) {
      setSelectedNode(node);
      clearHighlights();
      return;
    }

    // Handle shift-click (expand node)
    if (event.shiftKey) {
      if (expandedNodes.has(node.id)) {
        removeExpandedNode(node.id);
      } else {
        addExpandedNode(node.id);
      }
      return;
    }

    // Handle control-click (highlight connections)
    if (event.ctrlKey) {
      if (highlightedConnections.has(node.id)) {
        removeHighlightedConnection(node.id);
      } else {
        addHighlightedConnection(node.id);
      }
    }
  }, [
    expandedNodes,
    highlightedConnections,
    setSelectedNode,
    addExpandedNode,
    removeExpandedNode,
    addHighlightedConnection,
    removeHighlightedConnection,
    clearHighlights
  ]);

  return {
    selectedNode,
    expandedNodes,
    highlightedConnections,
    handleNodeClick
  };
}; 