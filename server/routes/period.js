import { Router } from 'express';
import db from '../db.js';
import { authenticateToken } from '../middleware/auth.js';
import { fetchRangeAroundDate } from '../utils/weather.js';

const router = Router();

function addDays(dateStr, n) {
  const d = new Date(dateStr + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().split('T')[0];
}

function computeCycle(entry) {
  const periodDays = [];
  for (let i = 0; i < (entry.period_length || 5); i++) {
    periodDays.push(addDays(entry.start_date, i));
  }
  // Ovulation typically ~14 days before next period
  const ovulationDay = addDays(entry.start_date, (entry.cycle_length || 28) - 14);
  const fertileStart = addDays(ovulationDay, -2);
  const fertileEnd = addDays(ovulationDay, 2);
  const nextPeriod = addDays(entry.start_date, entry.cycle_length || 28);
  return { periodDays, ovulationDay, fertileStart, fertileEnd, nextPeriod };
}

// Get all periods with computed cycle info (public)
router.get('/', (req, res) => {
  const entries = db.prepare('SELECT * FROM period_entries ORDER BY start_date DESC').all();
  const result = entries.map(e => ({ ...e, ...computeCycle(e) }));
  res.json(result);
});

// Get single
router.get('/:id', (req, res) => {
  const entry = db.prepare('SELECT * FROM period_entries WHERE id = ?').get(req.params.id);
  if (!entry) return res.status(404).json({ error: 'Not found' });
  res.json({ ...entry, ...computeCycle(entry) });
});

// Create (protected)
router.post('/', authenticateToken, (req, res) => {
  const { start_date, cycle_length, period_length, notes } = req.body;
  if (!start_date) return res.status(400).json({ error: 'start_date required' });

  // Estimate cycle_length from previous entry if not provided
  let finalCycleLength = cycle_length;
  if (!finalCycleLength) {
    const prev = db.prepare('SELECT start_date FROM period_entries ORDER BY start_date DESC LIMIT 1').get();
    if (prev) {
      const diff = Math.round(
        (new Date(start_date + 'T00:00:00Z') - new Date(prev.start_date + 'T00:00:00Z')) / 86400000
      );
      if (diff >= 21 && diff <= 45) finalCycleLength = diff;
    }
  }
  finalCycleLength = finalCycleLength || 28;

  const result = db.prepare(
    'INSERT INTO period_entries (start_date, cycle_length, period_length, notes) VALUES (?, ?, ?, ?)'
  ).run(start_date, finalCycleLength, period_length || 5, notes || null);

  // Update previous entry's cycle_length based on actual gap
  const prev = db.prepare('SELECT * FROM period_entries WHERE start_date < ? ORDER BY start_date DESC LIMIT 1').get(start_date);
  if (prev) {
    const actualGap = Math.round(
      (new Date(start_date + 'T00:00:00Z') - new Date(prev.start_date + 'T00:00:00Z')) / 86400000
    );
    if (actualGap >= 21 && actualGap <= 45) {
      db.prepare("UPDATE period_entries SET cycle_length = ?, updated_at = datetime('now') WHERE id = ?")
        .run(actualGap, prev.id);
    }
  }

  const entry = db.prepare('SELECT * FROM period_entries WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json({ ...entry, ...computeCycle(entry) });
  // Fire-and-forget weather fetch: period start date + preceding 7 days, actuals replace forecasts
  fetchRangeAroundDate(start_date);
});

// Update (protected)
router.put('/:id', authenticateToken, (req, res) => {
  const existing = db.prepare('SELECT * FROM period_entries WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Not found' });

  const { start_date, cycle_length, period_length, notes } = req.body;
  db.prepare(`UPDATE period_entries SET start_date=?, cycle_length=?, period_length=?, notes=?, updated_at=datetime('now') WHERE id=?`)
    .run(
      start_date ?? existing.start_date,
      cycle_length ?? existing.cycle_length,
      period_length ?? existing.period_length,
      notes ?? existing.notes,
      req.params.id
    );

  const updated = db.prepare('SELECT * FROM period_entries WHERE id = ?').get(req.params.id);
  res.json({ ...updated, ...computeCycle(updated) });
});

// Delete (protected)
router.delete('/:id', authenticateToken, (req, res) => {
  const existing = db.prepare('SELECT * FROM period_entries WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Not found' });
  db.prepare('DELETE FROM period_entries WHERE id = ?').run(req.params.id);
  res.json({ message: 'Deleted' });
});

export default router;
