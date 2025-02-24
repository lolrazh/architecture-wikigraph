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
      // For other nodes, use a single optimized query
      const data = await db.all<(Node & { link_id: number, target_id: string })[]>(`
        WITH connected_links AS (
          SELECT id as link_id, source, target
          FROM links 
          WHERE source = ? OR target = ?
        )
        SELECT 
          n.id, n.depth, n.category,
          l.link_id,
          CASE 
            WHEN l.source = n.id THEN l.target 
            ELSE l.source 
          END as target_id
        FROM nodes n
        LEFT JOIN connected_links l 
          ON n.id = l.source OR n.id = l.target
        WHERE n.id = ? OR l.link_id IS NOT NULL
      `, [nodeId, nodeId, nodeId]);

      // Transform results
      const nodes = Array.from(new Set(data.map(row => ({
        id: row.id,
        depth: row.depth,
        category: row.category
      }))));

      const links = data
        .filter(row => row.link_id)
        .map(row => ({
          id: row.link_id,
          source: nodeId,
          target: row.target_id
        }));

      result = { nodes, links };
    }

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