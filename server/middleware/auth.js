import jwt from 'jsonwebtoken';

export function requireAdmin(req, res, next) {
  if (req.user?.role === 'guest') {
    return res.status(403).json({ error: 'Guests cannot modify data' });
  }
  next();
}

export function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    const user = jwt.verify(token, process.env.JWT_SECRET);
    req.user = user;
    next();
  } catch {
    return res.status(403).json({ error: 'Invalid or expired token' });
  }
}
