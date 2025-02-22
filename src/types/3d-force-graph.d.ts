declare module '3d-force-graph' {
  interface D3ForceLink {
    distance(distance: number): this;
  }

  interface D3ForceCharge {
    strength(strength: number): this;
    distanceMax(distance: number): this;
  }

  interface D3ForceCenter {
    strength(strength: number): this;
  }

  interface D3ForceCollide {
    radius(radius: number): this;
  }

  interface ForceGraphMethods {
    width(width: number): this;
    height(height: number): this;
    backgroundColor(color: string): this;
    nodeAutoColorBy(field: string): this;
    nodeColor(fn: (node: any) => string): this;
    nodeVal(fn: (node: any) => number): this;
    nodeLabel(fn: (node: any) => string): this;
    linkColor(fn: () => string): this;
    linkOpacity(opacity: number): this;
    linkWidth(width: number): this;
    d3Force(name: 'link', force: D3ForceLink | null): this;
    d3Force(name: 'charge', force: D3ForceCharge | null): this;
    d3Force(name: 'center', force: D3ForceCenter | null): this;
    d3Force(name: 'collide', force: D3ForceCollide | null): this;
    d3Force(name: string, force: any): this;
    onNodeClick(fn: (node: any) => void): this;
    graphData(data: any): this;
    tickFrame(): void;
    _destructor(): void;
  }

  interface ForceGraphInstance extends ForceGraphMethods {
    d3Force(name: string): any;
  }

  interface ForceGraphConstructor {
    (options?: { extraRenderers?: any[] }): (element: HTMLElement) => ForceGraphInstance;
  }

  const ForceGraph3D: ForceGraphConstructor;
  export default ForceGraph3D;
} 