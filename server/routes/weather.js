import { Router } from 'express';
import db from '../db.js';
import { weatherLabel, fetchAndCacheWeather, batchFetchAndCache } from '../utils/weather.js';

const router = Router();

router.get('/', async (req, res) => {
  const { start, end } = req.query;
  if (start && !/^\d{4}-\d{2}-\d{2}$/.test(start)) return res.status(400).json({ error: 'Invalid start date' });
  if (end   && !/^\d{4}-\d{2}-\d{2}$/.test(end))   return res.status(400).json({ error: 'Invalid end date' });

  let sql = 'SELECT * FROM weather_cache';
  const args = [];
  if (start && end)   { sql += ' WHERE date >= ? AND date <= ?'; args.push(start, end); }
  else if (start)     { sql += ' WHERE date >= ?'; args.push(start); }
  else if (end)       { sql += ' WHERE date <= ?'; args.push(end); }
  sql += ' ORDER BY date ASC';

  const rows = (await db.execute({ sql, args })).rows;
  res.json(rows.map(row => ({ ...row, ...weatherLabel(row.weathercode) })));
});

router.post('/fetch', async (req, res) => {
  const defaultStart = new Date(Date.now() - 90 * 86400000).toISOString().slice(0, 10);
  const defaultEnd = new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10);
  const start = req.body?.start || defaultStart;
  const end   = req.body?.end   || defaultEnd;
  console.log(`[weather route] POST /fetch body:`, req.body, `→ start=${start}, end=${end}`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(start) || !/^\d{4}-\d{2}-\d{2}$/.test(end))
    return res.status(400).json({ error: 'Invalid date format' });

  const fetched = await batchFetchAndCache(start, end);
  console.log(`[weather route] POST /fetch done, fetched=${fetched}`);
  res.json({ fetched, start, end });
});

export default router;
