import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

const graphPath = path.join(process.cwd(), 'public', 'graph.json');
let cachedGraph: any = null;

// Helper function to get node ID from source/target
function getNodeId(node: any): string {
  return typeof node === 'string' ? node : node.id;
}

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
  const loadDepth2 = searchParams.get('depth2') === 'true';

  if (!nodeId) {
    return NextResponse.json({ error: 'Node ID is required' }, { status: 400 });
  }

  try {
    const graphData = await getGraphData();

    // For Architecture node, return initially loaded nodes and links
    if (nodeId === 'Architecture') {
      return NextResponse.json({
        nodes: graphData.nodes.filter((n: any) => n.loaded),
        links: graphData.links.filter((l: any) => l.loaded)
      });
    }

    // For depth 2 request, get all connections for the node
    if (loadDepth2) {
      // Get all links connected to this node
      const nodeConnections = graphData.links.filter((link: any) =>
        getNodeId(link.source) === nodeId || getNodeId(link.target) === nodeId
      );

      // Get all connected node IDs
      const connectedNodeIds = new Set<string>([nodeId]);
      nodeConnections.forEach((link: any) => {
        connectedNodeIds.add(
          getNodeId(link.source) === nodeId ? 
          getNodeId(link.target) : 
          getNodeId(link.source)
        );
      });

      // Get the nodes
      const connectedNodes = graphData.nodes.filter((node: any) =>
        connectedNodeIds.has(node.id)
      );

      // Mark these as loaded in our response
      const responseNodes = connectedNodes.map((node: any) => ({
        ...node,
        loaded: true
      }));

      const responseLinks = nodeConnections.map((link: any) => ({
        ...link,
        loaded: true
      }));

      return NextResponse.json({
        nodes: responseNodes,
        links: responseLinks
      });
    }

    // For regular request, return only loaded connections
    const nodeConnections = graphData.links.filter((link: any) =>
      (getNodeId(link.source) === nodeId || getNodeId(link.target) === nodeId) && 
      link.loaded
    );

    const connectedNodeIds = new Set<string>([nodeId]);
    nodeConnections.forEach((link: any) => {
      connectedNodeIds.add(
        getNodeId(link.source) === nodeId ? 
        getNodeId(link.target) : 
        getNodeId(link.source)
      );
    });

    const connectedNodes = graphData.nodes.filter((node: any) =>
      connectedNodeIds.has(node.id) && node.loaded
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