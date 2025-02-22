'use client';

import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { GraphProps, Node } from '../types/graph';
import { QuadTree } from '../lib/quadtree';
import { ForceCalculator } from '../lib/force.calculator';
import { Space_Mono } from 'next/font/google';

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

const LoadingText = () => {
    const [dots, setDots] = useState('');

    useEffect(() => {
        const interval = setInterval(() => {
            setDots(prev => prev.length >= 3 ? '' : prev + '.');
        }, 500);
        return () => clearInterval(interval);
    }, []);

    return <span>Loading graph{dots}</span>;
};

const Graph: React.FC<GraphProps> = ({ width, height, data, onNodeClick }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const graphRef = useRef<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const ForceGraph3DRef = useRef<any>(null);
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

    const updateForcesForNode = useCallback((movedNode: Node) => {
        if (!memoizedData.nodes || !memoizedData.links) return;

        // Create quadtree only for nodes within influence radius
        const influenceRadius = 100; // Adjust based on your needs
        const affectedNodes = memoizedData.nodes.filter(node => {
            if (node === movedNode) return true;
            const dx = (node.x || 0) - (movedNode.x || 0);
            const dz = (node.z || 0) - (movedNode.z || 0);
            return Math.sqrt(dx * dx + dz * dz) < influenceRadius;
        });

        // Create local quadtree for affected region
        const localBounds = calculateBounds(affectedNodes);
        const quadTree = new QuadTree({
            x: (localBounds.maxX + localBounds.minX) / 2,
            y: (localBounds.maxZ + localBounds.minZ) / 2,
            width: Math.max(localBounds.maxX - localBounds.minX, localBounds.maxZ - localBounds.minZ) * 1.1
        });

        // Insert affected nodes
        affectedNodes.forEach(node => {
            if (node.x !== undefined && node.z !== undefined) {
                quadTree.insert({
                    x: node.x,
                    y: node.z,
                    mass: 1
                });
            }
        });

        // Calculate forces only for affected nodes
        affectedNodes.forEach(node => {
            if (node.x === undefined || node.z === undefined) return;

            const point = { x: node.x, y: node.z, mass: 1 };
            const force = forceCalculatorRef.current.calculateForces(point, quadTree.root);

            // Apply forces with damping
            const damping = 0.9;
            node.vx = ((node.vx || 0) + force.fx) * damping;
            node.vz = ((node.vz || 0) + force.fy) * damping;
            node.x += node.vx;
            node.z += node.vz;
        });

        // Update affected edges
        const affectedLinks = memoizedData.links.filter(link => {
            const source = memoizedData.nodes.find(n => n.id === link.source);
            const target = memoizedData.nodes.find(n => n.id === link.target);
            return affectedNodes.includes(source!) || affectedNodes.includes(target!);
        });

        affectedLinks.forEach(link => {
            const source = memoizedData.nodes.find(n => n.id === link.source);
            const target = memoizedData.nodes.find(n => n.id === link.target);
            
            if (!source || !target || source.x === undefined || source.z === undefined || 
                target.x === undefined || target.z === undefined) return;

            const force = forceCalculatorRef.current.calculateAttraction({
                source: { x: source.x, y: source.z, mass: 1 },
                target: { x: target.x, y: target.z, mass: 1 }
            });

            // Apply attraction forces
            source.vx = (source.vx || 0) + force.fx;
            source.vz = (source.vz || 0) + force.fy;
            target.vx = (target.vx || 0) - force.fx;
            target.vz = (target.vz || 0) - force.fy;
        });

        // Refresh graph
        if (graphRef.current) {
            graphRef.current.refresh();
        }
    }, [memoizedData.nodes, memoizedData.links]);

    // Load ForceGraph3D module once
    useEffect(() => {
        import('3d-force-graph').then(module => {
            ForceGraph3DRef.current = module.default;
            setIsLoading(false);
        }).catch(error => {
            console.error('Failed to load ForceGraph3D:', error);
            setIsLoading(false);
        });
    }, []);

    // Initialize graph when container and module are ready
    useEffect(() => {
        if (isLoading || !containerRef.current || !ForceGraph3DRef.current) {
            return undefined; // Early return with undefined for cleanup
        }

        try {
            const graph = ForceGraph3DRef.current()(containerRef.current)
                .width(width)
                .height(height)
                .graphData(memoizedData) // Use memoized data
                .nodeColor((node: Node) => getNodeColor(node.depth))
                .nodeLabel((node: Node) => node.id)
                .nodeResolution(8)
                .backgroundColor('#000000')
                .onNodeClick((node: Node) => onNodeClick && onNodeClick(node))
                .onNodeDragEnd((node: Node) => {
                    updateForcesForNode(node);
                });

            graphRef.current = graph;

            return () => {
                if (graphRef.current) {
                    graphRef.current._destructor();
                }
            };
        } catch (error) {
            console.error('Error initializing graph:', error);
            return undefined; // Return undefined in case of error
        }
    }, [isLoading, width, height, memoizedData, onNodeClick, updateForcesForNode]); // Use memoizedData in deps

    if (isLoading) {
        return (
            <div className={spaceMono.className} style={{ 
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                display: 'flex', 
                flexDirection: 'column',
                alignItems: 'center', 
                justifyContent: 'center',
                background: '#0a0a0a',
                color: '#e5e7eb',
                margin: 0,
                padding: 0,
                overflow: 'hidden'
            }}>
                <div style={{
                    position: 'absolute',
                    top: '1rem',
                    left: '1rem',
                    fontSize: '1.25rem',
                    fontWeight: 'bold',
                    zIndex: 10
                }}>
                    Architecture Wikigraph
                </div>
                <div style={{
                    fontSize: '1.25rem'
                }}>
                    <LoadingText />
                </div>
            </div>
        );
    }

    return (
        <div className={spaceMono.className}>
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