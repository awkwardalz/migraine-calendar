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

// Get all entries (public)
router.get('/', (req, res) => {
  const { year, month } = req.query;
  let query = 'SELECT * FROM headache_entries';
  const params = [];

  if (year) {
    if (!/^\d{4}$/.test(year)) return res.status(400).json({ error: 'Invalid year' });
    if (month) {
      if (!/^\d{1,2}$/.test(month)) return res.status(400).json({ error: 'Invalid month' });
      query += ' WHERE date LIKE ?';
      params.push(`${year}-${month.padStart(2, '0')}%`);
    } else {
      query += ' WHERE date LIKE ?';
      params.push(`${year}%`);
    }
  }

  query += ' ORDER BY date DESC';
  const entries = db.prepare(query).all(...params);
  res.json(entries.map(parseEntry));
});

// Get by date (public)
router.get('/date/:date', (req, res) => {
  const entries = db.prepare('SELECT * FROM headache_entries WHERE date = ? ORDER BY id DESC').all(req.params.date);
  res.json(entries.map(parseEntry));
});

// Get single entry
router.get('/:id', (req, res) => {
  const entry = db.prepare('SELECT * FROM headache_entries WHERE id = ?').get(req.params.id);
  if (!entry) return res.status(404).json({ error: 'Entry not found' });
  res.json(parseEntry(entry));
});

// Create (protected)
router.post('/', authenticateToken, (req, res) => {
  const { date, pain_location, pain_area, intensity, time_of_day, duration_hours, medications, symptoms, triggers, notes } = req.body;

  if (!date) return res.status(400).json({ error: 'Date is required' });
  if (intensity !== undefined && (intensity < 1 || intensity > 10)) {
    return res.status(400).json({ error: 'Intensity must be between 1 and 10' });
  }

  const result = db.prepare(`
    INSERT INTO headache_entries (date, pain_location, pain_area, intensity, time_of_day, duration_hours, medications, symptoms, triggers, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    date,
    JSON.stringify(pain_location || []),
    JSON.stringify(pain_area || []),
    intensity || null,
    time_of_day || null,
    duration_hours || null,
    JSON.stringify(medications || []),
    JSON.stringify(symptoms || []),
    JSON.stringify(triggers || []),
    notes || null
  );

  const entry = db.prepare('SELECT * FROM headache_entries WHERE id = ?').get(result.lastInsertRowid);
  // Fire-and-forget weather fetch: entry date + preceding 7 days, actuals replace forecasts
  fetchRangeAroundDate(date);
  res.status(201).json(parseEntry(entry));
});

// Update (protected)
router.put('/:id', authenticateToken, (req, res) => {
  const existing = db.prepare('SELECT * FROM headache_entries WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Entry not found' });

  const { date, pain_location, pain_area, intensity, time_of_day, duration_hours, medications, symptoms, triggers, notes } = req.body;

  if (intensity !== undefined && (intensity < 1 || intensity > 10)) {
    return res.status(400).json({ error: 'Intensity must be between 1 and 10' });
  }

  db.prepare(`
    UPDATE headache_entries SET
      date = ?, pain_location = ?, pain_area = ?, intensity = ?, time_of_day = ?,
      duration_hours = ?, medications = ?, symptoms = ?, triggers = ?, notes = ?,
      updated_at = datetime('now')
    WHERE id = ?
  `).run(
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
    req.params.id
  );

  const updated = db.prepare('SELECT * FROM headache_entries WHERE id = ?').get(req.params.id);
  res.json(parseEntry(updated));
});

// Delete (protected)
router.delete('/:id', authenticateToken, (req, res) => {
  const existing = db.prepare('SELECT * FROM headache_entries WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Entry not found' });

  db.prepare('DELETE FROM headache_entries WHERE id = ?').run(req.params.id);
  res.json({ message: 'Entry deleted' });
});

export default router;
