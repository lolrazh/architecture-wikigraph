import fetch from 'node-fetch';

async function testApi() {
  const baseUrl = 'http://localhost:3000/api/node-connections';
  
  try {
    // Test root node (Architecture)
    console.log('Testing root node (Architecture)...');
    const rootResponse = await fetch(`${baseUrl}?id=Architecture`);
    const rootData = await rootResponse.json();
    console.log('Root node response status:', rootResponse.status);
    console.log('Root node data counts:', {
      nodes: rootData.nodes?.length ?? 0,
      links: rootData.links?.length ?? 0
    });

    // Test a specific node
    console.log('\nTesting specific node (Gothic architecture)...');
    const nodeResponse = await fetch(`${baseUrl}?id=Gothic%20architecture`);
    const nodeData = await nodeResponse.json();
    console.log('Node response status:', nodeResponse.status);
    console.log('Node data counts:', {
      nodes: nodeData.nodes?.length ?? 0,
      links: nodeData.links?.length ?? 0
    });
    console.log('Connected nodes:', nodeData.nodes?.map(n => n.id));

    // Test error case (missing ID)
    console.log('\nTesting error case (missing ID)...');
    const errorResponse = await fetch(baseUrl);
    console.log('Error response status:', errorResponse.status);
    const errorData = await errorResponse.json();
    console.log('Error message:', errorData.error);

  } catch (error) {
    console.error('Test failed:', error);
  }
}

testApi(); 