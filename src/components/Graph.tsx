'use client';

import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { GraphProps, Node } from '../types/graph';
import { QuadTree } from '../lib/quadtree';
import { ForceCalculator } from '../lib/force.calculator';
import { Space_Mono } from 'next/font/google';
import { LoadingOverlay, LoadingState } from './LoadingOverlay';

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
        // Clear velocity vectors
        node.vx = undefined;
        node.vz = undefined;
        
        // Clear any cached calculations
        delete (node as any)._force;
        delete (node as any)._quadtreeRef;
    });
};

const Graph: React.FC<GraphProps> = ({ width, height, data, onNodeClick }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const graphRef = useRef<any>(null);
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
    const memoizedData = useMemo(() => data, [
        data.nodes.length,
        data.links.length
    ]);

    // Cleanup function for QuadTree
    const cleanupQuadTree = useCallback(() => {
        if (quadTreeRef.current) {
            quadTreeRef.current.dispose();
            quadTreeRef.current = null;
        }
    }, []);

    const updateForcesForNode = useCallback((movedNode: Node) => {
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
            const localBounds = calculateBounds(affectedNodes);
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

            // Calculate forces only for affected nodes
            affectedNodes.forEach(node => {
                if (node.x === undefined || node.z === undefined || !quadTreeRef.current?.root) return;

                try {
                    const point = { x: node.x, y: node.z, mass: 1 };
                    const force = forceCalculatorRef.current.calculateForces(point, quadTreeRef.current.root);

                    // Apply forces with damping
                    const damping = 0.9;
                    node.vx = ((node.vx || 0) + force.fx) * damping;
                    node.vz = ((node.vz || 0) + force.fy) * damping;
                    node.x += node.vx;
                    node.z += node.vz;
                } catch (e) {
                    console.warn('Force calculation error:', e);
                }
            });

            // Cancel any pending animation frame
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
            }

            // Schedule next update
            if (!isDisposingRef.current && graphRef.current) {
                animationFrameRef.current = requestAnimationFrame(() => {
                    if (graphRef.current) {
                        graphRef.current.refresh();
                    }
                });
            }
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
        import('3d-force-graph').then(module => {
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
            const graph = ForceGraph3DRef.current()(containerRef.current)
                .width(width)
                .height(height)
                .graphData(memoizedData)
                .nodeColor((node: Node) => getNodeColor(node.depth))
                .nodeLabel((node: Node) => node.id)
                .nodeResolution(8)
                .backgroundColor('#000000')
                .onNodeClick((node: Node) => onNodeClick && onNodeClick(node))
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
                    graphRef.current._destructor();
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
            if (forceCalculatorRef.current) {
                forceCalculatorRef.current.dispose();
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
                        "A SANDHEEP RAJKUMAR PROJECT"
                    </div>
                </>
            )}
        </div>
    );
};

// Helper function to calculate bounds
function calculateBounds(nodes: Node[]) {
    let minX = Infinity;
    let maxX = -Infinity;
    let minZ = Infinity;
    let maxZ = -Infinity;

    nodes.forEach(node => {
        if (node.x !== undefined && node.z !== undefined) {
            minX = Math.min(minX, node.x);
            maxX = Math.max(maxX, node.x);
            minZ = Math.min(minZ, node.z);
            maxZ = Math.max(maxZ, node.z);
        }
    });

    return { minX, maxX, minZ, maxZ };
}

export default Graph; 