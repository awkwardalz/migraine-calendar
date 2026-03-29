import { Router } from 'express';
import db from '../db.js';
import { authenticateToken } from '../middleware/auth.js';
import { fetchRangeAroundDate } from '../utils/weather.js';

const router = Router();

router.get('/', async (req, res) => {
  const rs = await db.execute('SELECT * FROM preventive_medications ORDER BY date DESC');
  res.json(rs.rows);
});

router.get('/:id', async (req, res) => {
  const rs = await db.execute({ sql: 'SELECT * FROM preventive_medications WHERE id = ?', args: [req.params.id] });
  if (!rs.rows[0]) return res.status(404).json({ error: 'Entry not found' });
  res.json(rs.rows[0]);
});

router.post('/', authenticateToken, async (req, res) => {
  const { date, medication_name, medication_type, dosage, notes } = req.body;
  if (!date || !medication_name) return res.status(400).json({ error: 'Date and medication name are required' });

  const result = await db.execute({
    sql: 'INSERT INTO preventive_medications (date, medication_name, medication_type, dosage, notes) VALUES (?, ?, ?, ?, ?)',
    args: [date, medication_name, medication_type || null, dosage || null, notes || null],
  });
  const rs = await db.execute({ sql: 'SELECT * FROM preventive_medications WHERE id = ?', args: [Number(result.lastInsertRowid)] });
  fetchRangeAroundDate(date);
  res.status(201).json(rs.rows[0]);
});

router.put('/:id', authenticateToken, async (req, res) => {
  const existing = (await db.execute({ sql: 'SELECT * FROM preventive_medications WHERE id = ?', args: [req.params.id] })).rows[0];
  if (!existing) return res.status(404).json({ error: 'Entry not found' });

  const { date, medication_name, medication_type, dosage, notes } = req.body;
  await db.execute({
    sql: `UPDATE preventive_medications SET date=?, medication_name=?, medication_type=?, dosage=?, notes=?, updated_at=datetime('now') WHERE id=?`,
    args: [date ?? existing.date, medication_name ?? existing.medication_name, medication_type ?? existing.medication_type, dosage ?? existing.dosage, notes ?? existing.notes, req.params.id],
  });
  const rs = await db.execute({ sql: 'SELECT * FROM preventive_medications WHERE id = ?', args: [req.params.id] });
  res.json(rs.rows[0]);
});

router.delete('/:id', authenticateToken, async (req, res) => {
  const existing = (await db.execute({ sql: 'SELECT * FROM preventive_medications WHERE id = ?', args: [req.params.id] })).rows[0];
  if (!existing) return res.status(404).json({ error: 'Entry not found' });
  await db.execute({ sql: 'DELETE FROM preventive_medications WHERE id = ?', args: [req.params.id] });
  res.json({ message: 'Entry deleted' });
});

export default router;
