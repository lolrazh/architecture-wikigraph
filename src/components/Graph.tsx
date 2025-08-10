'use client';

import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { GraphProps, Node } from '../types/graph';
import { QuadTree } from '../lib/quadtree';
import { ForceCalculator } from '../lib/force.calculator';
import { Space_Mono } from 'next/font/google';
import { LoadingOverlay, LoadingState } from './LoadingOverlay';
import { useGraphStore } from '../store/useGraphStore';
import { useGraphInteractions } from '../hooks/useGraphInteractions';
import type { IForceGraph3D } from '3d-force-graph';
import * as THREE from 'three';
import SpriteText from 'three-spritetext';

interface CachedNode extends Node {
    _force?: { x: number; y: number };
    _quadtreeRef?: QuadTree;
    __threeObj?: THREE.Object3D;
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
        node.vx = undefined;
        node.vz = undefined;
        delete cachedNode._force;
        delete cachedNode._quadtreeRef;
    });
};

// Create a reusable halo texture (billboarded ring facing the camera)
function createHaloTexture(): THREE.CanvasTexture {
    const size = 256;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;

    ctx.clearRect(0, 0, size, size);

    const center = size / 2;
    const outerRadius = size * 0.45;
    const innerRadius = size * 0.32;

    // Outer glow
    const gradient = ctx.createRadialGradient(center, center, innerRadius, center, center, outerRadius);
    gradient.addColorStop(0, 'rgba(173, 216, 230, 0.0)');
    gradient.addColorStop(0.7, 'rgba(173, 216, 230, 0.25)');
    gradient.addColorStop(1, 'rgba(173, 216, 230, 0.0)');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(center, center, outerRadius, 0, Math.PI * 2);
    ctx.fill();

    // Ring stroke
    ctx.lineWidth = size * 0.04;
    ctx.strokeStyle = 'rgba(173, 216, 230, 0.75)';
    ctx.beginPath();
    ctx.arc(center, center, (outerRadius + innerRadius) / 2, 0, Math.PI * 2);
    ctx.stroke();

    const texture = new THREE.CanvasTexture(canvas);
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.generateMipmaps = false;
    texture.needsUpdate = true;
    return texture;
}

const Graph: React.FC<GraphProps> = ({ width, height, data }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const graphRef = useRef<IForceGraph3D | null>(null);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ForceGraph3DRef = useRef<any>(null);
    const quadTreeRef = useRef<QuadTree | null>(null);
    const animationFrameRef = useRef<number>();
    const isDisposingRef = useRef<boolean>(false);
    const previousDataRef = useRef(data);

    const { setNodesData, setLinksData } = useGraphStore();
    const { handleNodeClick, handleBackgroundClick } = useGraphInteractions();

    const forceCalculatorRef = useRef<ForceCalculator>(new ForceCalculator({
        theta: 0.5,
        repulsionStrength: 1,
        attractionStrength: 0.1
    }));

    // Shared resources for better performance
    const shared = useMemo(() => {
        const sphereRadius = 3;
        const sphereGeometry = new THREE.SphereGeometry(sphereRadius, 16, 16);
        const materialsByDepth = new Map<number, THREE.MeshLambertMaterial>();
        const haloTexture = createHaloTexture();
        const haloMaterial = new THREE.SpriteMaterial({ map: haloTexture, transparent: true, depthWrite: false, opacity: 0.9 });
        return { sphereRadius, sphereGeometry, materialsByDepth, haloTexture, haloMaterial };
    }, []);

    // Only update store when data actually changes
    useEffect(() => {
        if (JSON.stringify(data) !== JSON.stringify(previousDataRef.current)) {
            setNodesData(data.nodes);
            setLinksData(data.links);
            previousDataRef.current = data;
        }
    }, [data, setNodesData, setLinksData]);

    // Memoize data to prevent unnecessary updates
    const memoizedData = useMemo(() => data, [data]);

    // Custom node object factory
    const createNodeObject = useCallback((node: Node) => {
        const color = getNodeColor(node.depth);

        let material = shared.materialsByDepth.get(node.depth);
        if (!material) {
            material = new THREE.MeshLambertMaterial({ color });
            shared.materialsByDepth.set(node.depth, material);
        }

        const sphere = new THREE.Mesh(shared.sphereGeometry, material);
        sphere.castShadow = false;
        sphere.receiveShadow = false;

        // Label sprite
        const labelText = node.label || node.id;
        const label = new SpriteText(labelText);
        label.color = '#e5e7eb';
        label.backgroundColor = 'rgba(0,0,0,0.35)';
        label.padding = 2;
        label.borderWidth = 0;
        label.textHeight = 3; // world units (smaller)
        label.position.set(0, shared.sphereRadius + 4, 0);

        // Halo sprite (billboard circle) - initially hidden
        const halo = new THREE.Sprite(shared.haloMaterial);
        const haloScale = shared.sphereRadius * 3.2;
        halo.scale.set(haloScale, haloScale, 1);
        halo.visible = false;

        // Group them together
        const group = new THREE.Group();
        group.add(sphere);
        group.add(label);
        group.add(halo);
        group.userData = { sphere, label, halo };

        // Store reference to the Three.js object for later manipulation
        (node as CachedNode).__threeObj = group;

        return group;
    }, [shared]);

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

    // Memoize the node click handler with stable reference
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handleNodeClickMemoized = useCallback((node: Node, event: any) => {
        const nativeEvent = event?.srcEvent || event;
        
        // Always prevent default for any click type
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

        // Use requestAnimationFrame to batch updates
        requestAnimationFrame(() => {
            handleNodeClick(node, event);
        });
    }, [handleNodeClick]);

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
                .linkColor('#4b5563')
                .linkOpacity(0.35)
                .linkWidth(0.5)
                // .nodeLabel removed in favor of always-on SpriteText labels
                .backgroundColor('#000000')
                .onNodeClick(handleNodeClickMemoized)
                .onBackgroundClick(handleBackgroundClick)
                .nodeResolution(8)
                .nodeThreeObject(createNodeObject)
                .onNodeDragEnd(updateForcesForNode)
                .onNodeHover((node: Node | null, prevNode: Node | null) => {
                    if (prevNode && (prevNode as CachedNode).__threeObj) {
                        const prevGroup = (prevNode as CachedNode).__threeObj as THREE.Group;
                        const { halo, sphere } = prevGroup.userData as { halo: THREE.Sprite; sphere: THREE.Mesh };
                        halo.visible = false;
                        sphere.scale.set(1, 1, 1);
                    }
                    if (node && (node as CachedNode).__threeObj) {
                        const group = (node as CachedNode).__threeObj as THREE.Group;
                        const { halo, sphere } = group.userData as { halo: THREE.Sprite; sphere: THREE.Mesh };
                        halo.visible = true;
                        sphere.scale.set(1.2, 1.2, 1.2);
                    }
                })
                .showNavInfo(false);

            // Renderer/controls optimizations
            try {
                const renderer = (graph as unknown as IForceGraph3D).renderer?.();
                if (renderer) {
                    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
                    renderer.outputColorSpace = THREE.SRGBColorSpace;
                    renderer.toneMapping = THREE.ACESFilmicToneMapping;
                }
                const controls = (graph as unknown as IForceGraph3D).controls?.();
                if (controls) {
                    // @ts-expect-error: runtime controls from 3d-force-graph expose these
                    controls.enableDamping = true;
                    // @ts-expect-error: runtime controls from 3d-force-graph expose these
                    controls.dampingFactor = 0.08;
                    // @ts-expect-error: runtime controls from 3d-force-graph expose these
                    controls.rotateSpeed = 0.8;
                    // @ts-expect-error: runtime controls from 3d-force-graph expose these
                    controls.zoomSpeed = 0.9;
                    // @ts-expect-error: runtime controls from 3d-force-graph expose these
                    controls.panSpeed = 0.8;
                }
            } catch {
                // noop
            }

            graphRef.current = graph;

            setTimeout(() => {
                setLoadingState(prev => ({ ...prev, graphInitializing: false }));
            }, 600);

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
    }, [
        loadingState.graphModuleLoading,
        width,
        height,
        memoizedData,
        handleNodeClickMemoized,
        handleBackgroundClick,
        createNodeObject,
        updateForcesForNode
    ]);

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

            // Dispose shared resources
            shared.sphereGeometry.dispose();
            shared.haloTexture.dispose();
            shared.haloMaterial.dispose();

            // Cleanup force calculator last
            if (forceCalculator) {
                forceCalculator.dispose();
            }
        };
    }, [cleanupQuadTree, memoizedData.nodes, shared]);

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