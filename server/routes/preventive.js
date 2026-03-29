import { Router } from 'express';
import db from '../db.js';
import { authenticateToken } from '../middleware/auth.js';
import { fetchRangeAroundDate } from '../utils/weather.js';

const router = Router();

// Get all (public)
router.get('/', (req, res) => {
  const entries = db.prepare('SELECT * FROM preventive_medications ORDER BY date DESC').all();
  res.json(entries);
});

// Get single
router.get('/:id', (req, res) => {
  const entry = db.prepare('SELECT * FROM preventive_medications WHERE id = ?').get(req.params.id);
  if (!entry) return res.status(404).json({ error: 'Entry not found' });
  res.json(entry);
});

// Create (protected)
router.post('/', authenticateToken, (req, res) => {
  const { date, medication_name, medication_type, dosage, notes } = req.body;
  if (!date || !medication_name) {
    return res.status(400).json({ error: 'Date and medication name are required' });
  }

  const result = db.prepare(
    'INSERT INTO preventive_medications (date, medication_name, medication_type, dosage, notes) VALUES (?, ?, ?, ?, ?)'
  ).run(date, medication_name, medication_type || null, dosage || null, notes || null);

  const entry = db.prepare('SELECT * FROM preventive_medications WHERE id = ?').get(result.lastInsertRowid);
  fetchRangeAroundDate(date);
  res.status(201).json(entry);
});

// Update (protected)
router.put('/:id', authenticateToken, (req, res) => {
  const existing = db.prepare('SELECT * FROM preventive_medications WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Entry not found' });

  const { date, medication_name, medication_type, dosage, notes } = req.body;

  db.prepare(
    `UPDATE preventive_medications SET date=?, medication_name=?, medication_type=?, dosage=?, notes=?, updated_at=datetime('now') WHERE id=?`
  ).run(
    date ?? existing.date,
    medication_name ?? existing.medication_name,
    medication_type ?? existing.medication_type,
    dosage ?? existing.dosage,
    notes ?? existing.notes,
    req.params.id
  );

  const updated = db.prepare('SELECT * FROM preventive_medications WHERE id = ?').get(req.params.id);
  res.json(updated);
});

// Delete (protected)
router.delete('/:id', authenticateToken, (req, res) => {
  const existing = db.prepare('SELECT * FROM preventive_medications WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Entry not found' });

  db.prepare('DELETE FROM preventive_medications WHERE id = ?').run(req.params.id);
  res.json({ message: 'Entry deleted' });
});

export default router;
