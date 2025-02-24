import sqlite3 from 'sqlite3';
import { Database, open } from 'sqlite';

async function verifyDatabase() {
  let db: Database | null = null;
  try {
    console.log('Opening database...');
    db = await open({
      filename: './graph.db',
      driver: sqlite3.Database
    });
    console.log('Database opened successfully');

    // Check total counts
    console.log('Querying node count...');
    const nodeCount = await db.get('SELECT COUNT(*) as count FROM nodes');
    console.log('Querying link count...');
    const linkCount = await db.get('SELECT COUNT(*) as count FROM links');
    console.log('\nDatabase statistics:');
    console.log(`Total nodes: ${nodeCount?.count ?? 0}`);
    console.log(`Total links: ${linkCount?.count ?? 0}`);

    // Sample some nodes
    console.log('\nQuerying sample nodes...');
    const nodes = await db.all('SELECT * FROM nodes LIMIT 5');
    console.log('Sample nodes:');
    console.log(nodes);

    // Sample some links
    console.log('\nQuerying sample links...');
    const links = await db.all('SELECT * FROM links LIMIT 5');
    console.log('Sample links:');
    console.log(links);

    // Check node categories
    console.log('\nQuerying node categories...');
    const categories = await db.all('SELECT DISTINCT category, COUNT(*) as count FROM nodes GROUP BY category');
    console.log('Node categories:');
    console.log(categories);

    // Check depth distribution
    console.log('\nQuerying depth distribution...');
    const depths = await db.all('SELECT depth, COUNT(*) as count FROM nodes GROUP BY depth ORDER BY depth');
    console.log('Depth distribution:');
    console.log(depths);

    if (db) {
      console.log('\nClosing database connection...');
      await db.close();
      console.log('Database connection closed');
    }
  } catch (error) {
    console.error('Verification failed with error:', error);
    if (db) {
      try {
        await db.close();
        console.log('Database connection closed after error');
      } catch (closeError) {
        console.error('Error while closing database:', closeError);
      }
    }
    process.exit(1);
  }
}

// Run the verification
console.log('Starting database verification...');
verifyDatabase(); 