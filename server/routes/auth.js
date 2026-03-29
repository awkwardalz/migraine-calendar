import { Router } from 'express';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

const router = Router();

function safeCompare(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

router.post('/login', (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  const validUser = safeCompare(username, process.env.APP_USERNAME);
  const validPass = safeCompare(password, process.env.APP_PASSWORD);

  if (validUser && validPass) {
    const token = jwt.sign({ username }, process.env.JWT_SECRET, { expiresIn: '7d' });
    return res.json({ token, username });
  }

  return res.status(401).json({ error: 'Invalid credentials' });
});

router.get('/verify', (req, res) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.status(401).json({ error: 'No token' });

  try {
    const user = jwt.verify(token, process.env.JWT_SECRET);
    res.json({ valid: true, username: user.username });
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
});

export default router;
