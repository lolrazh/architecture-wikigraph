import sqlite3 from 'sqlite3';
import { Database, open } from 'sqlite';
import path from 'path';

// Connection pool size
const MAX_CONNECTIONS = 5;
const CONNECTION_TIMEOUT = 5000; // 5 seconds

// Connection pool
const connectionPool: Database[] = [];
const connectionInUse = new Set<Database>();

async function createConnection(): Promise<Database> {
  try {
    const db = await open({
      filename: path.join(process.cwd(), 'graph.db'),
      driver: sqlite3.Database
    });
    
    // Enable WAL mode for better concurrent access
    await db.exec('PRAGMA journal_mode = WAL');
    // Optimize cache
    await db.exec('PRAGMA cache_size = -2000'); // 2MB cache
    
    return db;
  } catch (error) {
    console.error('Failed to create database connection:', error);
    throw new Error('Database connection failed');
  }
}

async function getConnection(): Promise<Database> {
  // Try to get an available connection
  const availableConnection = connectionPool.find(conn => !connectionInUse.has(conn));
  if (availableConnection) {
    connectionInUse.add(availableConnection);
    return availableConnection;
  }

  // Create new connection if pool isn't full
  if (connectionPool.length < MAX_CONNECTIONS) {
    const newConnection = await createConnection();
    connectionPool.push(newConnection);
    connectionInUse.add(newConnection);
    return newConnection;
  }

  // Wait for a connection to become available
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('Connection timeout'));
    }, CONNECTION_TIMEOUT);

    const checkConnection = async () => {
      const conn = connectionPool.find(c => !connectionInUse.has(c));
      if (conn) {
        clearTimeout(timeout);
        connectionInUse.add(conn);
        resolve(conn);
      } else {
        setTimeout(checkConnection, 100);
      }
    };

    checkConnection();
  });
}

function releaseConnection(db: Database) {
  connectionInUse.delete(db);
}

export type Node = {
  id: string;
  depth: number;
  category: string;
}

export type Link = {
  id: number;
  source: string;
  target: string;
}

export type GraphData = {
  nodes: Node[];
  links: Link[];
}

// Simple in-memory cache
const cache = new Map<string, { data: GraphData; timestamp: number }>();
const CACHE_TTL = 60000; // 1 minute

function getCachedData(key: string): GraphData | null {
  const cached = cache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }
  cache.delete(key);
  return null;
}

function setCachedData(key: string, data: GraphData) {
  cache.set(key, { data, timestamp: Date.now() });
}

export async function getNodeConnections(nodeId: string): Promise<GraphData> {
  // Check cache first
  const cached = getCachedData(nodeId);
  if (cached) {
    return cached;
  }

  const db = await getConnection();
  try {
    let result: GraphData;

    if (nodeId === 'Architecture') {
      // For root node, use pagination or limit results
      const [nodes, links] = await Promise.all([
        db.all<Node[]>(`
          SELECT * FROM nodes 
          WHERE depth <= 1 
          LIMIT 1000
        `),
        db.all<Link[]>(`
          SELECT l.* FROM links l
          JOIN nodes n1 ON l.source = n1.id
          JOIN nodes n2 ON l.target = n2.id
          WHERE n1.depth <= 1 AND n2.depth <= 1
          LIMIT 2000
        `)
      ]);
      result = { nodes, links };
    } else {
      // For other nodes, get both direct connections (depth 1) and secondary connections (depth 2)
      // First, get all directly connected nodes
      console.log(`Fetching depth-1 and depth-2 connections for node: ${nodeId}`);
      
      // Get direct connections (depth-1)
      interface DirectConnection {
        id: string;
      }
      
      const directConnections = await db.all<DirectConnection[]>(`
        SELECT 
          CASE 
            WHEN source = ? THEN target
            ELSE source 
          END as id
        FROM links 
        WHERE source = ? OR target = ?
      `, [nodeId, nodeId, nodeId]);
      
      const directNodeIds = directConnections.map(conn => conn.id);
      console.log(`Found ${directNodeIds.length} direct connections`);
      
      // If no direct connections, return empty result
      if (directNodeIds.length === 0) {
        console.log('No direct connections found, returning empty result');
        return { nodes: [], links: [] };
      }
      
      // Get the nodes and their metadata including depth-2 connections
      const nodesQuery = `
        SELECT * 
        FROM nodes 
        WHERE id = ? ${directNodeIds.length > 0 ? 'OR id IN (' + directNodeIds.map(() => '?').join(',') + ')' : ''}
      `;
      
      const nodes = await db.all<Node[]>(
        nodesQuery, 
        [nodeId, ...directNodeIds]
      );
      
      console.log(`Retrieved ${nodes.length} nodes`);
      
      // Get all links between these nodes
      const linksQuery = `
        SELECT * 
        FROM links 
        WHERE (source = ? ${directNodeIds.length > 0 ? 'OR source IN (' + directNodeIds.map(() => '?').join(',') + ')' : ''})
        OR (target = ? ${directNodeIds.length > 0 ? 'OR target IN (' + directNodeIds.map(() => '?').join(',') + ')' : ''})
      `;
      
      const links = await db.all<Link[]>(
        linksQuery, 
        [nodeId, ...directNodeIds, nodeId, ...directNodeIds]
      );
      
      console.log(`Retrieved ${links.length} links`);
      
      // Find depth-2 nodes (connected to direct connections)
      const depth2NodeIds = new Set<string>();
      links.forEach(link => {
        const sourceId = link.source;
        const targetId = link.target;
        
        // If source is direct connection and target is not the origin node or another direct connection
        if (directNodeIds.includes(sourceId) && sourceId !== nodeId && targetId !== nodeId && !directNodeIds.includes(targetId)) {
          depth2NodeIds.add(targetId);
        }
        
        // If target is direct connection and source is not the origin node or another direct connection
        if (directNodeIds.includes(targetId) && targetId !== nodeId && sourceId !== nodeId && !directNodeIds.includes(sourceId)) {
          depth2NodeIds.add(sourceId);
        }
      });
      
      console.log(`Found ${depth2NodeIds.size} depth-2 nodes`);
      
      // Get depth-2 node details if any found
      let depth2Nodes: Node[] = [];
      if (depth2NodeIds.size > 0) {
        const depth2Query = `
          SELECT * 
          FROM nodes 
          WHERE id IN (${Array.from(depth2NodeIds).map(() => '?').join(',')})
        `;
        
        depth2Nodes = await db.all<Node[]>(
          depth2Query, 
          Array.from(depth2NodeIds)
        );
        
        console.log(`Retrieved ${depth2Nodes.length} depth-2 node details`);
      }
      
      // Combine all nodes and links
      result = { 
        nodes: [...nodes, ...depth2Nodes],
        links 
      };
    }

    // Mark depths explicitly
    result.nodes.forEach(node => {
      if (node.id === nodeId) {
        node.depth = 0; // Origin node
      } else if (result.links.some(link => 
        (link.source === nodeId && link.target === node.id) || 
        (link.target === nodeId && link.source === node.id)
      )) {
        node.depth = 1; // Direct connection
      } else {
        node.depth = 2; // Secondary connection
      }
    });

    // Cache the results
    setCachedData(nodeId, result);
    return result;
  } catch (error) {
    console.error('Error fetching node connections:', error);
    throw error;
  } finally {
    releaseConnection(db);
  }
}

export async function closeAllConnections(): Promise<void> {
  await Promise.all(connectionPool.map(db => db.close()));
  connectionPool.length = 0;
  connectionInUse.clear();
  cache.clear();
} 