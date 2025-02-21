import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

const graphPath = path.join(process.cwd(), 'public', 'graph.json');
let cachedGraph: any = null;

// Cache the graph data in memory after first load
async function getGraphData() {
  if (!cachedGraph) {
    try {
      cachedGraph = JSON.parse(await fs.readFile(graphPath, 'utf-8'));
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
      return NextResponse.json({
        nodes: graphData.nodes,
        links: graphData.links
      });
    }

    // For other nodes, return their immediate connections
    const nodeConnections = graphData.links.filter((link: any) =>
      link.source === nodeId || link.target === nodeId
    );

    const connectedNodeIds = new Set<string>([nodeId]);
    nodeConnections.forEach((link: any) => {
      connectedNodeIds.add(link.source === nodeId ? link.target : link.source);
    });

    const connectedNodes = graphData.nodes.filter((node: any) =>
      connectedNodeIds.has(node.id)
    );

    return NextResponse.json({
      nodes: connectedNodes,
      links: nodeConnections
    });

  } catch (error) {
    console.error('Error fetching node connections:', error);
    return NextResponse.json({ error: 'Failed to fetch node connections' }, { status: 500 });
  }
} 