import { Router } from 'express';
import db from '../db.js';
import { authenticateToken } from '../middleware/auth.js';
import { fetchRangeAroundDate } from '../utils/weather.js';

const router = Router();

function parseEntry(e) {
  return {
    ...e,
    pain_location: JSON.parse(e.pain_location || '[]'),
    pain_area: JSON.parse(e.pain_area || '[]'),
    medications: JSON.parse(e.medications || '[]'),
    symptoms: JSON.parse(e.symptoms || '[]'),
    triggers: JSON.parse(e.triggers || '[]'),
  };
}

router.get('/', async (req, res) => {
  const { year, month } = req.query;
  let sql = 'SELECT * FROM headache_entries';
  const args = [];
  if (year) {
    if (!/^\d{4}$/.test(year)) return res.status(400).json({ error: 'Invalid year' });
    if (month) {
      if (!/^\d{1,2}$/.test(month)) return res.status(400).json({ error: 'Invalid month' });
      sql += ' WHERE date LIKE ?';
      args.push(`${year}-${month.padStart(2, '0')}%`);
    } else {
      sql += ' WHERE date LIKE ?';
      args.push(`${year}%`);
    }
  }
  sql += ' ORDER BY date DESC';
  const rs = await db.execute({ sql, args });
  res.json(rs.rows.map(parseEntry));
});

router.get('/date/:date', async (req, res) => {
  const rs = await db.execute({ sql: 'SELECT * FROM headache_entries WHERE date = ? ORDER BY id DESC', args: [req.params.date] });
  res.json(rs.rows.map(parseEntry));
});

router.get('/:id', async (req, res) => {
  const rs = await db.execute({ sql: 'SELECT * FROM headache_entries WHERE id = ?', args: [req.params.id] });
  if (!rs.rows[0]) return res.status(404).json({ error: 'Entry not found' });
  res.json(parseEntry(rs.rows[0]));
});

router.post('/', authenticateToken, async (req, res) => {
  const { date, pain_location, pain_area, intensity, time_of_day, duration_hours, medications, symptoms, triggers, notes } = req.body;
  if (!date) return res.status(400).json({ error: 'Date is required' });
  if (intensity !== undefined && (intensity < 1 || intensity > 10))
    return res.status(400).json({ error: 'Intensity must be between 1 and 10' });

  const result = await db.execute({
    sql: `INSERT INTO headache_entries (date, pain_location, pain_area, intensity, time_of_day, duration_hours, medications, symptoms, triggers, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      date,
      JSON.stringify(pain_location || []),
      JSON.stringify(pain_area || []),
      intensity || null,
      time_of_day || null,
      duration_hours || null,
      JSON.stringify(medications || []),
      JSON.stringify(symptoms || []),
      JSON.stringify(triggers || []),
      notes || null,
    ],
  });
  const rs = await db.execute({ sql: 'SELECT * FROM headache_entries WHERE id = ?', args: [Number(result.lastInsertRowid)] });
  fetchRangeAroundDate(date); // fire-and-forget
  res.status(201).json(parseEntry(rs.rows[0]));
});

router.put('/:id', authenticateToken, async (req, res) => {
  const existing = (await db.execute({ sql: 'SELECT * FROM headache_entries WHERE id = ?', args: [req.params.id] })).rows[0];
  if (!existing) return res.status(404).json({ error: 'Entry not found' });

  const { date, pain_location, pain_area, intensity, time_of_day, duration_hours, medications, symptoms, triggers, notes } = req.body;
  if (intensity !== undefined && (intensity < 1 || intensity > 10))
    return res.status(400).json({ error: 'Intensity must be between 1 and 10' });

  await db.execute({
    sql: `UPDATE headache_entries SET date=?, pain_location=?, pain_area=?, intensity=?, time_of_day=?, duration_hours=?, medications=?, symptoms=?, triggers=?, notes=?, updated_at=datetime('now') WHERE id=?`,
    args: [
      date ?? existing.date,
      JSON.stringify(pain_location ?? JSON.parse(existing.pain_location || '[]')),
      JSON.stringify(pain_area ?? JSON.parse(existing.pain_area || '[]')),
      intensity ?? existing.intensity,
      time_of_day ?? existing.time_of_day,
      duration_hours ?? existing.duration_hours,
      JSON.stringify(medications ?? JSON.parse(existing.medications || '[]')),
      JSON.stringify(symptoms ?? JSON.parse(existing.symptoms || '[]')),
      JSON.stringify(triggers ?? JSON.parse(existing.triggers || '[]')),
      notes ?? existing.notes,
      req.params.id,
    ],
  });
  const rs = await db.execute({ sql: 'SELECT * FROM headache_entries WHERE id = ?', args: [req.params.id] });
  res.json(parseEntry(rs.rows[0]));
});

router.delete('/:id', authenticateToken, async (req, res) => {
  const existing = (await db.execute({ sql: 'SELECT * FROM headache_entries WHERE id = ?', args: [req.params.id] })).rows[0];
  if (!existing) return res.status(404).json({ error: 'Entry not found' });
  await db.execute({ sql: 'DELETE FROM headache_entries WHERE id = ?', args: [req.params.id] });
  res.json({ message: 'Entry deleted' });
});

export default router;
