import { Node, Link } from './graph';

declare module '3d-force-graph' {
  // Base types for nodes and links with required 3D force graph properties
  export interface NodeObject extends Node {
    x?: number;
    y?: number;
    z?: number;
    vx?: number;
    vy?: number;
    vz?: number;
    fx?: number;
    fy?: number;
    fz?: number;
  }

  export interface LinkObject extends Link {
    source: string;
    target: string;
  }

  export interface D3ForceLink {
    distance(distance: number): this;
  }

  export interface D3ForceCharge {
    strength(strength: number): this;
    distanceMax(distance: number): this;
  }

  export interface D3ForceCenter {
    strength(strength: number): this;
  }

  export interface D3ForceCollide {
    radius(radius: number): this;
  }

  export interface Controls {
    dispose(): void;
  }

  export interface IForceGraph3D<NodeType extends NodeObject = NodeObject, LinkType extends LinkObject = LinkObject> {
    width(width: number): this;
    height(height: number): this;
    backgroundColor(color: string): this;
    nodeAutoColorBy(field: string): this;
    nodeColor(fn: (node: NodeType) => string): this;
    nodeVal(fn: (node: NodeType) => number): this;
    nodeLabel(fn: (node: NodeType) => string): this;
    linkColor(fn: (link: LinkType) => string): this;
    linkOpacity(opacity: number): this;
    linkWidth(width: number): this;
    d3Force(name: 'link', force: D3ForceLink | null): this;
    d3Force(name: 'charge', force: D3ForceCharge | null): this;
    d3Force(name: 'center', force: D3ForceCenter | null): this;
    d3Force(name: 'collide', force: D3ForceCollide | null): this;
    d3Force(name: string, force: unknown): this;
    onNodeClick(fn: (node: NodeType) => void): this;
    graphData(data: { nodes: NodeType[]; links: LinkType[] }): this;
    tickFrame(): void;
    _destructor(): void;
    refresh(): void;
    controls(): Controls;
    nodeResolution(resolution: number): this;
    onNodeDragEnd(fn: (node: NodeType) => void): this;
  }

  export type ForceGraph3DFn = () => (element: HTMLElement) => IForceGraph3D;
  export type ForceGraph3DModule = { default: ForceGraph3DFn };
} 