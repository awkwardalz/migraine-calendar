import { Router } from 'express';
import db from '../db.js';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const monthlyCounts = (await db.execute(`
      SELECT strftime('%Y-%m', date) as month, COUNT(*) as count, ROUND(AVG(intensity), 1) as avg_intensity
      FROM headache_entries GROUP BY month ORDER BY month DESC LIMIT 12`
    )).rows.slice().reverse();

    const dayOfWeek = (await db.execute(`
      SELECT strftime('%w', date) as dow, COUNT(*) as count
      FROM headache_entries GROUP BY dow ORDER BY dow`
    )).rows;

    const locRows = (await db.execute('SELECT pain_location FROM headache_entries')).rows;
    const locationCounts = {};
    locRows.forEach(e => JSON.parse(e.pain_location || '[]').forEach(loc => { locationCounts[loc] = (locationCounts[loc] || 0) + 1; }));

    const medRows = (await db.execute("SELECT medications FROM headache_entries WHERE medications IS NOT NULL AND medications != '[]'")).rows;
    const medCounts = {};
    medRows.forEach(e => JSON.parse(e.medications || '[]').forEach(med => { medCounts[med.name] = (medCounts[med.name] || 0) + (med.quantity || 1); }));

    const symRows = (await db.execute('SELECT symptoms FROM headache_entries')).rows;
    const symptomCounts = {};
    symRows.forEach(e => JSON.parse(e.symptoms || '[]').forEach(s => { symptomCounts[s] = (symptomCounts[s] || 0) + 1; }));

    const trigRows = (await db.execute('SELECT triggers FROM headache_entries')).rows;
    const triggerCounts = {};
    trigRows.forEach(e => JSON.parse(e.triggers || '[]').forEach(t => { triggerCounts[t] = (triggerCounts[t] || 0) + 1; }));

    const totalsRow = (await db.execute('SELECT COUNT(*) as total, ROUND(AVG(intensity), 1) as avg_intensity FROM headache_entries')).rows[0];

    const now = new Date();
    const thisMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const thisMonth = (await db.execute({ sql: 'SELECT COUNT(*) as count, ROUND(AVG(intensity), 1) as avg_intensity FROM headache_entries WHERE date LIKE ?', args: [`${thisMonthStr}%`] })).rows[0];

    const recentDates = (await db.execute('SELECT DISTINCT date FROM headache_entries ORDER BY date DESC LIMIT 365')).rows.map(r => r.date);
    let streakDays = 0;
    const checkDate = new Date(now);
    while (true) {
      const ds = checkDate.toISOString().split('T')[0];
      if (recentDates.includes(ds)) break;
      streakDays++;
      checkDate.setDate(checkDate.getDate() - 1);
      if (streakDays > 365) break;
    }

    const preventiveMeds = (await db.execute('SELECT * FROM preventive_medications ORDER BY date DESC')).rows;

    res.json({ monthlyCounts, dayOfWeek, locationCounts, medCounts, symptomCounts, triggerCounts,
      totalEntries: totalsRow.total, avgIntensity: totalsRow.avg_intensity,
      thisMonth, migraineFreeDays: streakDays, preventiveMeds });
  } catch (err) {
    console.error('Stats error:', err);
    res.status(500).json({ error: 'Failed to load stats' });
  }
});

export default router;
