import { NextResponse } from 'next/server';
import { getNodeConnections } from '@/lib/database';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const nodeId = searchParams.get('id');

  if (!nodeId) {
    return NextResponse.json({ error: 'Node ID is required' }, { status: 400 });
  }

  try {
    const data = await getNodeConnections(nodeId);
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching node connections:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch node connections' },
      { status: 500 }
    );
  }
} 