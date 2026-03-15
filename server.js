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
async function authenticate(req, res, next) {
  const userId = req.cookies.user_id;
  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const db = await getDb();
  const user = await db.get('SELECT * FROM users WHERE id = ?', [userId]);
  if (!user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  req.user = user;
  next();
}

// Routes
app.post('/api/register', async (req, res) => {
  const { username, password, city } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Missing fields' });
  
  const db = await getDb();
  const pwdHash = await bcrypt.hash(password, 10);
  
  try {
    const result = await db.run('INSERT INTO users (username, password_hash, city) VALUES (?, ?, ?)', [username, pwdHash, city]);
    res.cookie('user_id', result.lastID, { httpOnly: true, secure: false }); 
    res.json({ message: 'Registered successfully', user: { id: result.lastID, username, city } });
  } catch (err) {
    if (err.message.includes('UNIQUE constraint failed')) {
      return res.status(400).json({ error: 'Username already exists' });
    }
    res.status(500).json({ error: 'Database error' });
  }
});

app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Missing fields' });
  
  const db = await getDb();
  const user = await db.get('SELECT * FROM users WHERE username = ?', [username]);
  if (!user || !(await bcrypt.compare(password, user.password_hash))) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  
  res.cookie('user_id', user.id, { httpOnly: true });
  res.json({ message: 'Logged in successfully', user: { id: user.id, username: user.username, city: user.city } });
});

app.post('/api/logout', (req, res) => {
  res.clearCookie('user_id');
  res.json({ message: 'Logged out' });
});

app.get('/api/me', authenticate, (req, res) => {
  res.json({ user: { id: req.user.id, username: req.user.username, city: req.user.city } });
});

app.get('/api/waste', authenticate, async (req, res) => {
  const db = await getDb();
  const logs = await db.all('SELECT * FROM waste_logs WHERE user_id = ? ORDER BY date DESC', [req.user.id]);
  res.json({ logs });
});

app.post('/api/waste', authenticate, async (req, res) => {
  const { date, orders, packaging_type, waste_kg } = req.body;
  const db = await getDb();
  await db.run(
    'INSERT INTO waste_logs (user_id, date, orders, packaging_type, waste_kg) VALUES (?, ?, ?, ?, ?)',
    [req.user.id, date, orders, packaging_type, waste_kg]
  );
  res.json({ message: 'Logged waste' });
});

app.delete('/api/waste/:id', authenticate, async (req, res) => {
  const db = await getDb();
  await db.run('DELETE FROM waste_logs WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
  res.json({ message: 'Deleted' });
});

app.get('/api/pledges', authenticate, async (req, res) => {
  const db = await getDb();
  const pledges = await db.all('SELECT * FROM pledges WHERE user_id = ?', [req.user.id]);
  res.json({ pledges });
});

app.post('/api/pledges', authenticate, async (req, res) => {
  const { pledge_id, isActive, rank, impact } = req.body;
  const db = await getDb();
  if (isActive) {
    await db.run(
      'INSERT OR REPLACE INTO pledges (user_id, pledge_id, rank, impact) VALUES (?, ?, ?, ?)',
      [req.user.id, pledge_id, rank || 1, impact || 0]
    );
  } else {
    await db.run('DELETE FROM pledges WHERE user_id = ? AND pledge_id = ?', [req.user.id, pledge_id]);
  }
  res.json({ message: 'Pledge updated' });
});

initDb().then(() => {
  app.listen(PORT, () => {
    console.log(`Server listening on http://localhost:${PORT}`);
  });
}).catch(console.error);
