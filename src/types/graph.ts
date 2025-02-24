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
  label?: string;
  description?: string;
  loaded?: boolean;
}

export interface Link {
  id?: number;
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
}

export interface GraphState {
  nodesData: Node[];
  linksData: Link[];
  selectedNode: Node | null;
  expandedNodes: Set<string>;
  highlightedConnections: Set<string>;
  isLoading: boolean;
  error: string | null;
}

export interface GraphActions {
  setNodesData: (nodes: Node[]) => void;
  setLinksData: (links: Link[]) => void;
  setSelectedNode: (node: Node | null) => void;
  addExpandedNode: (nodeId: string) => void;
  removeExpandedNode: (nodeId: string) => void;
  addHighlightedConnection: (nodeId: string) => void;
  removeHighlightedConnection: (nodeId: string) => void;
  clearHighlights: () => void;
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
} 