export interface BaseNode {
  id: string;
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

export interface Node extends BaseNode {
  depth: number;
  category: 'root' | 'architecture';
  loaded?: boolean;
}

export interface Link {
  source: string;
  target: string;
  depth?: number;
  loaded?: boolean;
}

export interface GraphData {
  nodes: Node[];
  links: Link[];
}

export interface GraphProps {
  width: number;
  height: number;
  data: GraphData;
  onNodeClick?: (node: Node) => void;
} 