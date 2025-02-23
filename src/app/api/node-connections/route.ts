import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import { GraphData, Node, Link } from '../../../types/graph';

const graphPath = path.join(process.cwd(), 'public', 'graph.json');
let cachedGraph: GraphData | null = null;

// Type guard for unknown values
function isObject(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
}

// Validate node structure
function isValidNode(node: unknown): node is Node {
    if (!isObject(node)) return false;
    return (
        typeof node.id === 'string' &&
        typeof node.depth === 'number' &&
        (node.category === 'root' || node.category === 'architecture')
    );
}

// Validate link structure
function isValidLink(link: unknown): link is Link {
    if (!isObject(link)) return false;
    return (
        typeof link.source === 'string' &&
        typeof link.target === 'string' &&
        (typeof link.depth === 'undefined' || typeof link.depth === 'number')
    );
}

// Validate graph data structure
function isValidGraphData(data: unknown): data is GraphData {
    if (!isObject(data)) return false;
    return (
        Array.isArray(data.nodes) &&
        Array.isArray(data.links) &&
        data.nodes.every(isValidNode) &&
        data.links.every(isValidLink)
    );
}

// Cache the graph data in memory after first load
async function getGraphData(): Promise<GraphData> {
  if (!cachedGraph) {
    try {
      const data = JSON.parse(await fs.readFile(graphPath, 'utf-8'));
      if (!isValidGraphData(data)) {
        throw new Error('Invalid graph data structure');
      }
      cachedGraph = data;
    } catch (error) {
      console.error('Error reading graph data:', error);
      throw new Error('Failed to read graph data');
    }
  }
  return cachedGraph;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const nodeId = searchParams.get('id');

  if (!nodeId) {
    return NextResponse.json({ error: 'Node ID is required' }, { status: 400 });
  }

  try {
    const graphData = await getGraphData();

    // For Architecture node (initial load), return all nodes and links
    if (nodeId === 'Architecture') {
      return NextResponse.json(graphData);
    }

    // For other nodes, return their immediate connections
    const nodeConnections = graphData.links.filter(link =>
      link.source === nodeId || link.target === nodeId
    );

    const connectedNodeIds = new Set<string>([nodeId]);
    nodeConnections.forEach(link => {
      connectedNodeIds.add(link.source === nodeId ? link.target : link.source);
    });

    const connectedNodes = graphData.nodes.filter(node =>
      connectedNodeIds.has(node.id)
    );

    return NextResponse.json({
      nodes: connectedNodes,
      links: nodeConnections
    });

  } catch (error) {
    console.error('Error fetching node connections:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch node connections' },
      { status: 500 }
    );
  }
} 