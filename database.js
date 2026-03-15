const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');
const path = require('path');

// Render uses /opt/render/project/src/data for persistent disks
const dataDir = process.env.RENDER ? '/opt/render/project/src/data' : __dirname;
const dbPath = path.join(dataDir, 'wastewatch.db');

async function getDb() {
  return open({
    filename: dbPath,
    driver: sqlite3.Database
  });
}

async function initDb() {
  const db = await getDb();
  
  await db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      city TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS waste_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      date TEXT NOT NULL,
      orders INTEGER NOT NULL,
      packaging_type TEXT NOT NULL,
      waste_kg REAL NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id)
    );

    CREATE TABLE IF NOT EXISTS pledges (
      user_id INTEGER NOT NULL,
      pledge_id TEXT NOT NULL,
      activated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      rank INTEGER DEFAULT 1,
      impact REAL DEFAULT 0,
      PRIMARY KEY (user_id, pledge_id),
      FOREIGN KEY (user_id) REFERENCES users (id)
    );
  `);
  
  return db;
}

module.exports = { getDb, initDb };
