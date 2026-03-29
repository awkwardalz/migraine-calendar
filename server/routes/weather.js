import { Router } from 'express';
import db from '../db.js';
import { weatherLabel, fetchAndCacheWeather } from '../utils/weather.js';

const router = Router();

// GET /api/weather?start=YYYY-MM-DD&end=YYYY-MM-DD
// Returns all cached entries in range, enriched with icon/label
router.get('/', (req, res) => {
  const { start, end } = req.query;

  if (start && !/^\d{4}-\d{2}-\d{2}$/.test(start)) {
    return res.status(400).json({ error: 'Invalid start date' });
  }
  if (end && !/^\d{4}-\d{2}-\d{2}$/.test(end)) {
    return res.status(400).json({ error: 'Invalid end date' });
  }

  let query = 'SELECT * FROM weather_cache';
  const params = [];

  if (start && end) {
    query += ' WHERE date >= ? AND date <= ?';
    params.push(start, end);
  } else if (start) {
    query += ' WHERE date >= ?';
    params.push(start);
  } else if (end) {
    query += ' WHERE date <= ?';
    params.push(end);
  }

  query += ' ORDER BY date ASC';

  const rows = db.prepare(query).all(...params);

  const result = rows.map(row => ({
    ...row,
    ...weatherLabel(row.weathercode),
  }));

  res.json(result);
});

// POST /api/weather/fetch  — manually trigger weather fetch for a date range
router.post('/fetch', async (req, res) => {
  const today = new Date().toISOString().slice(0, 10);
  const defaultEnd = new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10);
  const start = req.body?.start || today;
  const end   = req.body?.end   || defaultEnd;

  if (!/^\d{4}-\d{2}-\d{2}$/.test(start) || !/^\d{4}-\d{2}-\d{2}$/.test(end)) {
    return res.status(400).json({ error: 'Invalid date format' });
  }

  const dates = [];
  const cur = new Date(start + 'T00:00:00Z');
  const last = new Date(end + 'T00:00:00Z');
  while (cur <= last) {
    dates.push(cur.toISOString().slice(0, 10));
    cur.setUTCDate(cur.getUTCDate() + 1);
  }

  await Promise.all(dates.map(d =>
    fetchAndCacheWeather(d, d <= today).catch(() => null)
  ));
  res.json({ fetched: dates.length, start, end });
});

export default router;
