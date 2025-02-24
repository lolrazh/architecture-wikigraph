import sqlite3 from 'sqlite3';
import { Database, open } from 'sqlite';
import { promises as fs } from 'fs';
import path from 'path';

interface Node {
  id: string;
  depth: number;
  category: string;
}

interface Link {
  source: string;
  target: string;
}

interface GraphData {
  nodes: Node[];
  links: Link[];
}

async function createDatabase(): Promise<Database> {
  // Open database connection
  const db = await open({
    filename: './graph.db',
    driver: sqlite3.Database
  });

  // Create tables
  await db.exec(`
    CREATE TABLE IF NOT EXISTS nodes (
      id TEXT PRIMARY KEY,
      depth INTEGER NOT NULL,
      category TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS links (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      source TEXT NOT NULL,
      target TEXT NOT NULL,
      FOREIGN KEY (source) REFERENCES nodes(id),
      FOREIGN KEY (target) REFERENCES nodes(id)
    );

    -- Create indexes for better query performance
    CREATE INDEX IF NOT EXISTS idx_links_source ON links(source);
    CREATE INDEX IF NOT EXISTS idx_links_target ON links(target);
  `);

  return db;
}

async function readJsonFile(filePath: string): Promise<GraphData> {
  const data = await fs.readFile(filePath, 'utf-8');
  return JSON.parse(data) as GraphData;
}

async function migrateData() {
  try {
    // Create database and tables
    const db = await createDatabase();
    console.log('Database and tables created successfully');

    // Read both JSON files
    const depth0_1Data = await readJsonFile(path.join(process.cwd(), 'public', 'graph_depth0_1.json'));
    const depth2Data = await readJsonFile(path.join(process.cwd(), 'public', 'graph_depth2.json'));

    // Combine and deduplicate nodes
    const allNodes = new Map<string, Node>();
    [...depth0_1Data.nodes, ...depth2Data.nodes].forEach(node => {
      if (!allNodes.has(node.id)) {
        allNodes.set(node.id, node);
      }
    });

    // Begin transaction for nodes
    await db.exec('BEGIN TRANSACTION');
    
    // Insert nodes
    const stmt = await db.prepare(
      'INSERT OR IGNORE INTO nodes (id, depth, category) VALUES (?, ?, ?)'
    );
    
    for (const node of allNodes.values()) {
      await stmt.run(node.id, node.depth, node.category);
    }
    
    await stmt.finalize();
    await db.exec('COMMIT');
    console.log(`Inserted ${allNodes.size} nodes`);

    // Combine links
    const allLinks = new Set<string>();
    const links = [...depth0_1Data.links, ...depth2Data.links];
    
    // Begin transaction for links
    await db.exec('BEGIN TRANSACTION');
    
    // Insert links
    const linkStmt = await db.prepare(
      'INSERT OR IGNORE INTO links (source, target) VALUES (?, ?)'
    );

    let linkCount = 0;
    for (const link of links) {
      // Create a unique key for the link to avoid duplicates
      const linkKey = `${link.source}:${link.target}`;
      if (!allLinks.has(linkKey)) {
        allLinks.add(linkKey);
        await linkStmt.run(link.source, link.target);
        linkCount++;
      }
    }

    await linkStmt.finalize();
    await db.exec('COMMIT');
    console.log(`Inserted ${linkCount} links`);

    await db.close();
    console.log('Migration completed successfully');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

// Run the migration
migrateData(); 