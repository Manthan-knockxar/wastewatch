const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const bcrypt = require('bcrypt');
const path = require('path');
const { getDb, initDb } = require('./database.js');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(cors());
app.use(cookieParser());
app.use(express.static(__dirname));

// Auth Middleware
function authenticate(req, res, next) {
  const userId = req.cookies.user_id;
  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  try {
    const db = getDb();
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    req.user = user;
    next();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
}

// Routes
app.post('/api/register', async (req, res) => {
  const { username, password, city } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Missing fields' });
  
  try {
    const db = getDb();
    const pwdHash = await bcrypt.hash(password, 10);
    const result = db.prepare('INSERT INTO users (username, password_hash, city) VALUES (?, ?, ?)').run(username, pwdHash, city);
    res.cookie('user_id', result.lastInsertRowid, { httpOnly: true, secure: process.env.NODE_ENV === 'production' }); 
    res.json({ message: 'Registered successfully', user: { id: result.lastInsertRowid, username, city } });
  } catch (err) {
    if (err.message && err.message.includes('UNIQUE constraint failed')) {
      return res.status(400).json({ error: 'Username already exists' });
    }
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Missing fields' });
  
  try {
    const db = getDb();
    const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    res.cookie('user_id', user.id, { httpOnly: true, secure: process.env.NODE_ENV === 'production' });
    res.json({ message: 'Logged in successfully', user: { id: user.id, username: user.username, city: user.city } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

app.post('/api/logout', (req, res) => {
  res.clearCookie('user_id');
  res.json({ message: 'Logged out' });
});

app.get('/api/me', authenticate, (req, res) => {
  res.json({ user: { id: req.user.id, username: req.user.username, city: req.user.city } });
});

app.get('/api/waste', authenticate, (req, res) => {
  try {
    const db = getDb();
    const logs = db.prepare('SELECT * FROM waste_logs WHERE user_id = ? ORDER BY date DESC').all(req.user.id);
    res.json({ logs });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

app.post('/api/waste', authenticate, (req, res) => {
  const { date, orders, packaging_type, waste_kg } = req.body;
  try {
    const db = getDb();
    db.prepare('INSERT INTO waste_logs (user_id, date, orders, packaging_type, waste_kg) VALUES (?, ?, ?, ?, ?)')
      .run(req.user.id, date, orders, packaging_type, waste_kg);
    res.json({ message: 'Logged waste' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

app.delete('/api/waste/:id', authenticate, (req, res) => {
  try {
    const db = getDb();
    db.prepare('DELETE FROM waste_logs WHERE id = ? AND user_id = ?').run(req.params.id, req.user.id);
    res.json({ message: 'Deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

app.get('/api/pledges', authenticate, (req, res) => {
  try {
    const db = getDb();
    const pledges = db.prepare('SELECT * FROM pledges WHERE user_id = ?').all(req.user.id);
    res.json({ pledges });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

app.post('/api/pledges', authenticate, (req, res) => {
  const { pledge_id, isActive, rank, impact } = req.body;
  try {
    const db = getDb();
    if (isActive) {
      db.prepare('INSERT OR REPLACE INTO pledges (user_id, pledge_id, rank, impact) VALUES (?, ?, ?, ?)')
        .run(req.user.id, pledge_id, rank || 1, impact || 0);
    } else {
      db.prepare('DELETE FROM pledges WHERE user_id = ? AND pledge_id = ?').run(req.user.id, pledge_id);
    }
    res.json({ message: 'Pledge updated' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

try {
  initDb();
  app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});
} catch (error) {
  console.error('Failed to initialize database:', error);
}
