import { Router } from 'express';
import db from '../db.js';
import { authenticateToken } from '../middleware/auth.js';
import { weatherLabel } from '../utils/weather.js';

const router = Router();

function addDays(dateStr, n) {
  const d = new Date(dateStr + 'T12:00:00');
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

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

// GET /api/stats/report?from=YYYY-MM-DD&to=YYYY-MM-DD
router.get('/report', authenticateToken, async (req, res) => {
  try {
    const { from, to } = req.query;
    if (!from || !to || !/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to)) {
      return res.status(400).json({ error: 'from and to (YYYY-MM-DD) are required' });
    }

    const parseEntry = (e) => ({
      ...e,
      pain_location: JSON.parse(e.pain_location || '[]'),
      pain_area: JSON.parse(e.pain_area || '[]'),
      medications: JSON.parse(e.medications || '[]'),
      symptoms: JSON.parse(e.symptoms || '[]'),
      triggers: JSON.parse(e.triggers || '[]'),
    });

    const headaches = (await db.execute({
      sql: 'SELECT * FROM headache_entries WHERE date BETWEEN ? AND ? ORDER BY date',
      args: [from, to],
    })).rows.map(parseEntry);

    const preventive = (await db.execute({
      sql: 'SELECT * FROM preventive_medications WHERE date BETWEEN ? AND ? ORDER BY date',
      args: [from, to],
    })).rows;

    const periods = (await db.execute({
      sql: 'SELECT * FROM period_entries WHERE start_date BETWEEN ? AND ? ORDER BY start_date',
      args: [from, to],
    })).rows;

    // Summary stats for the range
    const totalDays = Math.round((new Date(to) - new Date(from)) / 86400000) + 1;
    const avgIntensity = headaches.length
      ? (headaches.reduce((s, e) => s + (e.intensity || 0), 0) / headaches.length).toFixed(1)
      : null;

    const symptomCounts = {};
    const triggerCounts = {};
    const locationCounts = {};
    const medCounts = {};
    headaches.forEach(e => {
      e.symptoms.forEach(s => { symptomCounts[s] = (symptomCounts[s] || 0) + 1; });
      e.triggers.forEach(t => { triggerCounts[t] = (triggerCounts[t] || 0) + 1; });
      e.pain_location.forEach(l => { locationCounts[l] = (locationCounts[l] || 0) + 1; });
      e.medications.forEach(m => { medCounts[m.name] = (medCounts[m.name] || 0) + (m.quantity || 1); });
    });

    // Fetch weather context: ±3 days around each headache date
    let weatherByDate = {};
    if (headaches.length > 0) {
      const sortedDates = headaches.map(h => h.date).sort();
      const weatherStart = addDays(sortedDates[0], -3);
      const weatherEnd = addDays(sortedDates[sortedDates.length - 1], 3);
      const weatherRows = (await db.execute({
        sql: 'SELECT * FROM weather_cache WHERE date BETWEEN ? AND ? ORDER BY date',
        args: [weatherStart, weatherEnd],
      })).rows;
      weatherRows.forEach(row => {
        weatherByDate[row.date] = { ...row, ...weatherLabel(row.weathercode) };
      });
    }

    res.json({
      from, to, totalDays,
      headaches,
      preventive,
      periods,
      weatherByDate,
      summary: {
        migraineDays: headaches.length,
        migraineFreeDays: totalDays - headaches.length,
        avgIntensity,
        symptomCounts,
        triggerCounts,
        locationCounts,
        medCounts,
      },
    });
  } catch (err) {
    console.error('Report error:', err);
    res.status(500).json({ error: 'Failed to generate report' });
  }
});

export default router;
