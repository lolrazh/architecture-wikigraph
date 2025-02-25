import { useCallback, useRef, useEffect } from 'react';
import { useGraphStore } from '../store/useGraphStore';
import type { Node } from '../types/graph';

export const useGraphInteractions = () => {
  const {
    selectedNode,
    setSelectedNode,
    isLoading,
    error
  } = useGraphStore();

  // Use ref to track the last clicked node to prevent duplicate processing
  const lastClickedRef = useRef<{ id: string; time: number } | null>(null);
  
  // Debug logging for loading state and errors
  useEffect(() => {
    if (isLoading) {
      console.log('Loading data from API...');
    }
    if (error) {
      console.error('API Error:', error);
    }
  }, [isLoading, error]);

  // Handle clicks outside of nodes (background clicks)
  const handleBackgroundClick = useCallback(() => {
    // Optional: deselect the node when clicking the background
    // setSelectedNode(null);
    console.log('Background click detected');
  }, []);

  // Simplified node click handler - only handles basic selection
  const handleNodeClick = useCallback((node: Node, event: any) => {
    const nativeEvent = event?.srcEvent || event;
    
    // Prevent default behavior
    if (nativeEvent) {
      nativeEvent.preventDefault();
      nativeEvent.stopPropagation();
      nativeEvent.stopImmediatePropagation();
    }
    
    // Prevent the wrapper event too
    if (event) {
      event.preventDefault?.();
      event.stopPropagation?.();
    }

    // Debounce clicks to prevent double processing
    const now = Date.now();
    if (lastClickedRef.current && 
        lastClickedRef.current.id === node.id && 
        now - lastClickedRef.current.time < 300) {
      return;
    }
    lastClickedRef.current = { id: node.id, time: now };

    // Handle regular click - just select the node
    console.log('Regular click on node:', node.id, 'depth:', node.depth);
    setSelectedNode(node);
  }, [setSelectedNode]);

  return {
    selectedNode,
    handleNodeClick,
    handleBackgroundClick,
    isLoading,
    error
  };
}; 