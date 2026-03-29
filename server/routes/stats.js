import { Router } from 'express';
import db from '../db.js';

const router = Router();

router.get('/', (req, res) => {
  // Monthly counts for the past 12 months
  const monthlyCounts = db.prepare(`
    SELECT strftime('%Y-%m', date) as month, COUNT(*) as count, ROUND(AVG(intensity), 1) as avg_intensity
    FROM headache_entries
    GROUP BY month
    ORDER BY month DESC
    LIMIT 12
  `).all().reverse();

  // Day of week distribution
  const dayOfWeek = db.prepare(`
    SELECT strftime('%w', date) as dow, COUNT(*) as count
    FROM headache_entries
    GROUP BY dow
    ORDER BY dow
  `).all();

  // Pain location distribution
  const allLocations = db.prepare('SELECT pain_location FROM headache_entries').all();
  const locationCounts = {};
  allLocations.forEach(e => {
    JSON.parse(e.pain_location || '[]').forEach(loc => {
      locationCounts[loc] = (locationCounts[loc] || 0) + 1;
    });
  });

  // Medication usage
  const allMeds = db.prepare('SELECT medications FROM headache_entries WHERE medications IS NOT NULL AND medications != \'[]\'').all();
  const medCounts = {};
  allMeds.forEach(e => {
    JSON.parse(e.medications || '[]').forEach(med => {
      medCounts[med.name] = (medCounts[med.name] || 0) + (med.quantity || 1);
    });
  });

  // Symptom frequency
  const allSymptoms = db.prepare('SELECT symptoms FROM headache_entries').all();
  const symptomCounts = {};
  allSymptoms.forEach(e => {
    JSON.parse(e.symptoms || '[]').forEach(s => {
      symptomCounts[s] = (symptomCounts[s] || 0) + 1;
    });
  });

  // Trigger frequency
  const allTriggers = db.prepare('SELECT triggers FROM headache_entries').all();
  const triggerCounts = {};
  allTriggers.forEach(e => {
    JSON.parse(e.triggers || '[]').forEach(t => {
      triggerCounts[t] = (triggerCounts[t] || 0) + 1;
    });
  });

  // Overall totals
  const totals = db.prepare('SELECT COUNT(*) as total, ROUND(AVG(intensity), 1) as avg_intensity FROM headache_entries').get();

  // This month
  const now = new Date();
  const thisMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const thisMonth = db.prepare('SELECT COUNT(*) as count, ROUND(AVG(intensity), 1) as avg_intensity FROM headache_entries WHERE date LIKE ?').get(`${thisMonthStr}%`);

  // Streak: consecutive days without migraine
  const recentDates = db.prepare('SELECT DISTINCT date FROM headache_entries ORDER BY date DESC LIMIT 365').all().map(r => r.date);
  let streakDays = 0;
  const today = now.toISOString().split('T')[0];
  const checkDate = new Date(now);
  while (true) {
    const ds = checkDate.toISOString().split('T')[0];
    if (recentDates.includes(ds)) break;
    streakDays++;
    checkDate.setDate(checkDate.getDate() - 1);
    if (streakDays > 365) break;
  }

  // Preventive medications
  const preventiveMeds = db.prepare('SELECT * FROM preventive_medications ORDER BY date DESC').all();

  res.json({
    monthlyCounts,
    dayOfWeek,
    locationCounts,
    medCounts,
    symptomCounts,
    triggerCounts,
    totalEntries: totals.total,
    avgIntensity: totals.avg_intensity,
    thisMonth,
    migraineFreeDays: streakDays,
    preventiveMeds,
  });
});

export default router;
