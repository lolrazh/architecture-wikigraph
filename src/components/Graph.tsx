'use client';

import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { GraphProps, Node } from '../types/graph';
import { QuadTree } from '../lib/quadtree';
import { ForceCalculator } from '../lib/force.calculator';
import { Space_Mono } from 'next/font/google';
import { LoadingOverlay, LoadingState } from './LoadingOverlay';
import type { IForceGraph3D } from '3d-force-graph';

interface CachedNode extends Node {
    _force?: { x: number; y: number };
    _quadtreeRef?: QuadTree;
}

const spaceMono = Space_Mono({
    weight: '400',
    subsets: ['latin'],
});

// Helper function to get node color based on depth
function getNodeColor(depth: number): string {
    switch (depth) {
        case 0: return '#96bfea'; // Root (Architecture) - Light blue
        case 1: return '#a0c7a9'; // Direct connections - Sage green
        case 2: return '#e1acdc'; // Secondary connections - Light purple
        default: return '#94a3b8'; // Default - Gray
    }
}

// Resource cleanup utility
const cleanupResources = (nodes: Node[]) => {
    nodes.forEach(node => {
        const cachedNode = node as CachedNode;
        // Clear velocity vectors
        node.vx = undefined;
        node.vz = undefined;
        
        // Clear any cached calculations
        delete cachedNode._force;
        delete cachedNode._quadtreeRef;
    });
};

const Graph: React.FC<GraphProps> = ({ width, height, data, onNodeClick }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const graphRef = useRef<IForceGraph3D | null>(null);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ForceGraph3DRef = useRef<any>(null);
    const quadTreeRef = useRef<QuadTree | null>(null);
    const animationFrameRef = useRef<number>();
    const isDisposingRef = useRef<boolean>(false);

    const forceCalculatorRef = useRef<ForceCalculator>(new ForceCalculator({
        theta: 0.5,
        repulsionStrength: 1,
        attractionStrength: 0.1
    }));

    // Memoize data to prevent unnecessary updates
    const memoizedData = useMemo(() => data, [data]);

    // Cleanup function for QuadTree
    const cleanupQuadTree = useCallback(() => {
        if (quadTreeRef.current) {
            quadTreeRef.current.dispose();
            quadTreeRef.current = null;
        }
    }, []);

    const updateForcesForNode = useCallback(async (movedNode: Node) => {
        if (!memoizedData.nodes || !memoizedData.links || isDisposingRef.current) return;

        try {
            // Cleanup previous QuadTree before creating new one
            cleanupQuadTree();

            // Create quadtree only for nodes within influence radius
            const influenceRadius = 100;
            const affectedNodes = memoizedData.nodes.filter(node => {
                if (node === movedNode) return true;
                const dx = (node.x || 0) - (movedNode.x || 0);
                const dz = (node.z || 0) - (movedNode.z || 0);
                return Math.sqrt(dx * dx + dz * dz) < influenceRadius;
            });

            // Create local quadtree for affected region
            const localBounds = affectedNodes.reduce((bounds, node) => {
                bounds.minX = Math.min(bounds.minX, node.x || 0);
                bounds.maxX = Math.max(bounds.maxX, node.x || 0);
                bounds.minZ = Math.min(bounds.minZ, node.z || 0);
                bounds.maxZ = Math.max(bounds.maxZ, node.z || 0);
                return bounds;
            }, { minX: Infinity, maxX: -Infinity, minZ: Infinity, maxZ: -Infinity });

            quadTreeRef.current = new QuadTree({
                x: (localBounds.maxX + localBounds.minX) / 2,
                y: (localBounds.maxZ + localBounds.minZ) / 2,
                width: Math.max(localBounds.maxX - localBounds.minX, localBounds.maxZ - localBounds.minZ) * 1.1
            });

            // Insert affected nodes
            affectedNodes.forEach(node => {
                if (node.x !== undefined && node.z !== undefined) {
                    quadTreeRef.current?.insert({
                        x: node.x,
                        y: node.z,
                        mass: 1
                    });
                }
            });

            // Calculate forces in parallel for affected nodes
            if (quadTreeRef.current?.root) {
                const nodePoints = affectedNodes.map(node => ({
                    x: node.x ?? 0,  // Use nullish coalescing to handle undefined
                    y: node.z ?? 0,  // Use nullish coalescing to handle undefined
                    mass: 1
                }));

                const forces = await forceCalculatorRef.current.calculateForcesParallel(
                    nodePoints,
                    quadTreeRef.current.root
                );

                // Apply forces with damping
                forces.forEach((force, index) => {
                    const node = affectedNodes[index];
                    if (node.x === undefined || node.z === undefined) return;
                    
                    const damping = 0.9;
                    node.vx = ((node.vx || 0) + force.fx) * damping;
                    node.vz = ((node.vz || 0) + force.fy) * damping;
                    node.x += node.vx;
                    node.z += node.vz;
                });
            }

            // Cancel any pending animation frame
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
            }

            // Schedule next update
            animationFrameRef.current = requestAnimationFrame(() => {
                if (graphRef.current) {
                    graphRef.current.refresh();
                }
            });
        } catch (e) {
            console.warn('Force update error:', e);
        }
    }, [memoizedData.nodes, memoizedData.links, cleanupQuadTree]);

    const [loadingState, setLoadingState] = useState<LoadingState>({
        dataLoading: false,
        graphModuleLoading: true,
        graphInitializing: true
    });

    // Load ForceGraph3D module once
    useEffect(() => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        import('3d-force-graph').then((module: any) => {
            ForceGraph3DRef.current = module.default;
            setLoadingState(prev => ({ ...prev, graphModuleLoading: false }));
        }).catch(error => {
            console.error('Failed to load ForceGraph3D:', error);
            setLoadingState(prev => ({ ...prev, graphModuleLoading: false }));
        });
    }, []);

    // Initialize graph when container and module are ready
    useEffect(() => {
        if (loadingState.graphModuleLoading || !containerRef.current || !ForceGraph3DRef.current) {
            return undefined;
        }

        try {
            const graph = ForceGraph3DRef.current()(containerRef.current);
            
            graph
                .width(width)
                .height(height)
                .graphData(memoizedData)
                .nodeColor((node: Node) => getNodeColor(node.depth))
                .nodeLabel((node: Node) => node.id)
                .backgroundColor('#000000')
                .onNodeClick((node: Node) => onNodeClick && onNodeClick(node))
                .nodeResolution(8)
                .onNodeDragEnd((node: Node) => {
                    updateForcesForNode(node);
                });

            graphRef.current = graph;
            
            // Set initializing to false after a short delay to ensure graph is rendered
            setTimeout(() => {
                setLoadingState(prev => ({ ...prev, graphInitializing: false }));
            }, 1000);

            return () => {
                if (graphRef.current) {
                    graphRef.current.controls().dispose();
                }
            };
        } catch (error) {
            console.error('Error initializing graph:', error);
            setLoadingState(prev => ({ ...prev, graphInitializing: false }));
            return undefined;
        }
    }, [loadingState.graphModuleLoading, width, height, memoizedData, onNodeClick, updateForcesForNode]);

    // Effect for handling component unmount cleanup
    useEffect(() => {
        // Store reference to force calculator that will be cleaned up
        const forceCalculator = forceCalculatorRef.current;
        
        return () => {
            isDisposingRef.current = true;

            // Cleanup animation frame
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
            }

            // Cleanup QuadTree
            cleanupQuadTree();

            // Cleanup node resources
            if (memoizedData.nodes) {
                cleanupResources(memoizedData.nodes);
            }

            // Cleanup 3D graph
            if (graphRef.current) {
                // Remove all event listeners and dispose of the graph
                graphRef.current.controls().dispose();
                graphRef.current = null;
            }

            // Cleanup force calculator last
            if (forceCalculator) {
                forceCalculator.dispose();
            }
        };
    }, [cleanupQuadTree, memoizedData.nodes]);

    return (
        <div className={spaceMono.className}>
            <LoadingOverlay loadingState={loadingState} />
            <div style={{ 
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: '#0a0a0a',
                margin: 0,
                padding: 0,
                overflow: 'hidden'
            }}>
                <div ref={containerRef} style={{ 
                    width: '100%', 
                    height: '100%',
                    position: 'absolute',
                    top: 0,
                    left: 0
                }} />
            </div>
            
            {!Object.values(loadingState).some(state => state) && (
                <>
                    {/* Title */}
                    <div style={{
                        position: 'fixed',
                        top: '1rem',
                        left: '1rem',
                        color: '#e5e7eb',
                        fontSize: '1.25rem',
                        fontWeight: 'bold',
                        zIndex: 10,
                        pointerEvents: 'none'
                    }}>
                        Architecture Wikigraph
                    </div>

                    {/* Author Credit */}
                    <div style={{
                        position: 'fixed',
                        bottom: '0.5rem',
                        right: '0.5rem',
                        color: '#9ca3af',
                        fontSize: '0.5rem',
                        fontWeight: 'bold',
                        zIndex: 10,
                        textAlign: 'right',
                        pointerEvents: 'none'
                    }}>
                        &ldquo;A SANDHEEP RAJKUMAR PROJECT&rdquo;
                    </div>
                </>
            )}
        </div>
    );
};

export default Graph; 