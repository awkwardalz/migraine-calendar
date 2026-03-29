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
  for (let i = 0; i < (entry.period_length || 5); i++) periodDays.push(addDays(entry.start_date, i));
  const ovulationDay = addDays(entry.start_date, (entry.cycle_length || 28) - 14);
  return {
    periodDays,
    ovulationDay,
    fertileStart: addDays(ovulationDay, -2),
    fertileEnd: addDays(ovulationDay, 2),
    nextPeriod: addDays(entry.start_date, entry.cycle_length || 28),
  };
}

router.get('/', async (req, res) => {
  const rs = await db.execute('SELECT * FROM period_entries ORDER BY start_date DESC');
  res.json(rs.rows.map(e => ({ ...e, ...computeCycle(e) })));
});

router.get('/:id', async (req, res) => {
  const rs = await db.execute({ sql: 'SELECT * FROM period_entries WHERE id = ?', args: [req.params.id] });
  if (!rs.rows[0]) return res.status(404).json({ error: 'Not found' });
  const entry = rs.rows[0];
  res.json({ ...entry, ...computeCycle(entry) });
});

router.post('/', authenticateToken, async (req, res) => {
  const { start_date, cycle_length, period_length, notes } = req.body;
  if (!start_date) return res.status(400).json({ error: 'start_date required' });

  let finalCycleLength = cycle_length;
  if (!finalCycleLength) {
    const prevRs = await db.execute('SELECT start_date FROM period_entries ORDER BY start_date DESC LIMIT 1');
    const prev = prevRs.rows[0];
    if (prev) {
      const diff = Math.round((new Date(start_date + 'T00:00:00Z') - new Date(prev.start_date + 'T00:00:00Z')) / 86400000);
      if (diff >= 21 && diff <= 45) finalCycleLength = diff;
    }
  }
  finalCycleLength = finalCycleLength || 28;

  const insertRs = await db.execute({
    sql: 'INSERT INTO period_entries (start_date, cycle_length, period_length, notes) VALUES (?, ?, ?, ?)',
    args: [start_date, finalCycleLength, period_length || 5, notes || null],
  });

  const prevRs2 = await db.execute({ sql: 'SELECT * FROM period_entries WHERE start_date < ? ORDER BY start_date DESC LIMIT 1', args: [start_date] });
  const prev2 = prevRs2.rows[0];
  if (prev2) {
    const actualGap = Math.round((new Date(start_date + 'T00:00:00Z') - new Date(prev2.start_date + 'T00:00:00Z')) / 86400000);
    if (actualGap >= 21 && actualGap <= 45) {
      await db.execute({ sql: `UPDATE period_entries SET cycle_length=?, updated_at=datetime('now') WHERE id=?`, args: [actualGap, prev2.id] });
    }
  }

  const rs = await db.execute({ sql: 'SELECT * FROM period_entries WHERE id = ?', args: [Number(insertRs.lastInsertRowid)] });
  const entry = rs.rows[0];
  fetchRangeAroundDate(start_date);
  res.status(201).json({ ...entry, ...computeCycle(entry) });
});

router.put('/:id', authenticateToken, async (req, res) => {
  const existing = (await db.execute({ sql: 'SELECT * FROM period_entries WHERE id = ?', args: [req.params.id] })).rows[0];
  if (!existing) return res.status(404).json({ error: 'Not found' });

  const { start_date, cycle_length, period_length, notes } = req.body;
  await db.execute({
    sql: `UPDATE period_entries SET start_date=?, cycle_length=?, period_length=?, notes=?, updated_at=datetime('now') WHERE id=?`,
    args: [start_date ?? existing.start_date, cycle_length ?? existing.cycle_length, period_length ?? existing.period_length, notes ?? existing.notes, req.params.id],
  });
  const rs = await db.execute({ sql: 'SELECT * FROM period_entries WHERE id = ?', args: [req.params.id] });
  const updated = rs.rows[0];
  res.json({ ...updated, ...computeCycle(updated) });
});

router.delete('/:id', authenticateToken, async (req, res) => {
  const existing = (await db.execute({ sql: 'SELECT * FROM period_entries WHERE id = ?', args: [req.params.id] })).rows[0];
  if (!existing) return res.status(404).json({ error: 'Not found' });
  await db.execute({ sql: 'DELETE FROM period_entries WHERE id = ?', args: [req.params.id] });
  res.json({ message: 'Deleted' });
});

export default router;
