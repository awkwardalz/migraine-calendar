import { useState } from 'react';
import { api } from '../api';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function formatDate(str) {
  return new Date(str + 'T00:00:00').toLocaleDateString('en-US', {
    weekday: 'short', year: 'numeric', month: 'short', day: 'numeric',
  });
}

function formatDateShort(str) {
  return new Date(str + 'T00:00:00').toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
  });
}

function topEntries(obj, n = 5) {
  return Object.entries(obj)
    .sort((a, b) => b[1] - a[1])
    .slice(0, n);
}

function addDays(dateStr, n) {
  const d = new Date(dateStr + 'T12:00:00');
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

function dateRange(start, end) {
  const dates = [];
  let d = start;
  while (d <= end) { dates.push(d); d = addDays(d, 1); }
  return dates;
}

// Returns period info for a date: { day: N, isStart: bool, period } or null.
function getPeriodInfo(date, periods) {
  for (const p of periods) {
    const start = p.start_date;
    const periodLen = p.period_length || 5;
    const end = addDays(start, periodLen - 1);
    if (date >= start && date <= end) {
      const day = Math.round((new Date(date + 'T12:00:00') - new Date(start + 'T12:00:00')) / 86400000) + 1;
      return { day, isStart: date === start, period: p };
    }
  }
  return null;
}

// Groups headache dates into clusters where ±3 day windows overlap (dates ≤6 days apart).
// Returns array of { start, end, headacheDates, rows[] }.
function buildWeatherClusters(headaches, weatherByDate, periods = []) {
  if (!headaches.length) return [];

  const uniqueDates = [...new Set(headaches.map(h => h.date))].sort();
  const headachesByDate = {};
  headaches.forEach(h => {
    if (!headachesByDate[h.date]) headachesByDate[h.date] = [];
    headachesByDate[h.date].push(h);
  });

  const clusters = [];
  let wStart = addDays(uniqueDates[0], -3);
  let wEnd = addDays(uniqueDates[0], 3);
  let clusterDates = [uniqueDates[0]];

  for (let i = 1; i < uniqueDates.length; i++) {
    const nextWindowStart = addDays(uniqueDates[i], -3);
    if (nextWindowStart <= wEnd) {
      const nextWindowEnd = addDays(uniqueDates[i], 3);
      if (nextWindowEnd > wEnd) wEnd = nextWindowEnd;
      clusterDates.push(uniqueDates[i]);
    } else {
      clusters.push({ start: wStart, end: wEnd, headacheDates: clusterDates });
      wStart = nextWindowStart;
      wEnd = addDays(uniqueDates[i], 3);
      clusterDates = [uniqueDates[i]];
    }
  }
  clusters.push({ start: wStart, end: wEnd, headacheDates: clusterDates });

  return clusters.map(cluster => ({
    ...cluster,
    rows: dateRange(cluster.start, cluster.end).map(date => ({
      date,
      weather: weatherByDate[date] || null,
      isHeadacheDay: !!headachesByDate[date],
      headacheEntries: headachesByDate[date] || [],
      periodInfo: getPeriodInfo(date, periods),
    })),
  }));
}

function defaultFrom() {
  const d = new Date();
  d.setMonth(d.getMonth() - 3);
  return d.toISOString().slice(0, 10);
}
function defaultTo() {
  return new Date().toISOString().slice(0, 10);
}

export default function Report() {
  const [from, setFrom] = useState(defaultFrom());
  const [to, setTo] = useState(defaultTo());
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleGenerate = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await api.getReport(from, to);
      setReport(data);
    } catch (err) {
      setError(err.message || 'Failed to generate report');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="report-page">
      {/* Controls — hidden when printing */}
      <div className="report-controls no-print">
        <h2>Doctor's Report</h2>
        <p className="report-subtitle">Generate a printable summary of your migraine history</p>
        <form className="report-form" onSubmit={handleGenerate}>
          <div className="report-date-row">
            <div className="form-group">
              <label>From</label>
              <input type="date" value={from} onChange={e => setFrom(e.target.value)} required />
            </div>
            <div className="form-group">
              <label>To</label>
              <input type="date" value={to} onChange={e => setTo(e.target.value)} required />
            </div>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Generating…' : 'Generate Report'}
            </button>
          </div>
          {error && <div className="error-message">{error}</div>}
        </form>
        {report && (
          <button className="btn btn-outline" onClick={() => window.print()}>
            🖨️ Print / Save as PDF
          </button>
        )}
      </div>

      {/* Printable report */}
      {report && (
        <div className="report-document">
          {/* Header */}
          <div className="report-header">
            <h1>Migraine Diary — Medical Report</h1>
            <p className="report-period">
              Period: <strong>{formatDateShort(report.from)}</strong> to <strong>{formatDateShort(report.to)}</strong>
            </p>
            <p className="report-generated">Generated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
          </div>

          {/* Summary */}
          <section className="report-section">
            <h2>Summary</h2>
            <div className="report-summary-grid">
              <div className="report-stat-box">
                <div className="report-stat-value">{report.summary.migraineDays}</div>
                <div className="report-stat-label">Migraine Days</div>
              </div>
              <div className="report-stat-box">
                <div className="report-stat-value">{report.totalDays}</div>
                <div className="report-stat-label">Total Days</div>
              </div>
              <div className="report-stat-box">
                <div className="report-stat-value">
                  {report.totalDays > 0
                    ? Math.round((report.summary.migraineDays / report.totalDays) * 100)
                    : 0}%
                </div>
                <div className="report-stat-label">Migraine Frequency</div>
              </div>
              <div className="report-stat-box">
                <div className="report-stat-value">{report.summary.avgIntensity ?? '—'}</div>
                <div className="report-stat-label">Avg Intensity (1-10)</div>
              </div>
              <div className="report-stat-box">
                <div className="report-stat-value">{report.preventive.length}</div>
                <div className="report-stat-label">Preventive Doses</div>
              </div>
              <div className="report-stat-box">
                <div className="report-stat-value">{report.periods.length}</div>
                <div className="report-stat-label">Period Records</div>
              </div>
            </div>
          </section>

          {/* Top triggers + symptoms */}
          <div className="report-two-col">
            {Object.keys(report.summary.triggerCounts).length > 0 && (
              <section className="report-section">
                <h2>Top Triggers</h2>
                <table className="report-table">
                  <thead><tr><th>Trigger</th><th>Occurrences</th></tr></thead>
                  <tbody>
                    {topEntries(report.summary.triggerCounts).map(([k, v]) => (
                      <tr key={k}><td>{k}</td><td>{v}</td></tr>
                    ))}
                  </tbody>
                </table>
              </section>
            )}
            {Object.keys(report.summary.symptomCounts).length > 0 && (
              <section className="report-section">
                <h2>Top Symptoms</h2>
                <table className="report-table">
                  <thead><tr><th>Symptom</th><th>Occurrences</th></tr></thead>
                  <tbody>
                    {topEntries(report.summary.symptomCounts).map(([k, v]) => (
                      <tr key={k}><td>{k}</td><td>{v}</td></tr>
                    ))}
                  </tbody>
                </table>
              </section>
            )}
          </div>

          {/* Medications used */}
          {Object.keys(report.summary.medCounts).length > 0 && (
            <section className="report-section">
              <h2>Acute Medications Used</h2>
              <table className="report-table">
                <thead><tr><th>Medication</th><th>Total Doses</th></tr></thead>
                <tbody>
                  {topEntries(report.summary.medCounts, 10).map(([k, v]) => (
                    <tr key={k}><td>{k}</td><td>{v}</td></tr>
                  ))}
                </tbody>
              </table>
            </section>
          )}

          {/* Preventive medications */}
          {report.preventive.length > 0 && (
            <section className="report-section">
              <h2>Preventive Medications</h2>
              <table className="report-table">
                <thead>
                  <tr><th>Date</th><th>Medication</th><th>Type</th><th>Dosage</th><th>Notes</th></tr>
                </thead>
                <tbody>
                  {report.preventive.map(e => (
                    <tr key={e.id}>
                      <td>{formatDate(e.date)}</td>
                      <td>{e.medication_name}</td>
                      <td>{e.medication_type}</td>
                      <td>{e.dosage}</td>
                      <td>{e.notes}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          )}

          {/* Headache entries */}
          <section className="report-section">
            <h2>Headache Entries ({report.headaches.length})</h2>
            {report.headaches.length === 0 ? (
              <p className="no-entries">No headache entries in this period.</p>
            ) : (
              <table className="report-table report-headache-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Intensity</th>
                    <th>Location</th>
                    <th>Time</th>
                    <th>Duration</th>
                    <th>Symptoms</th>
                    <th>Triggers</th>
                    <th>Medications</th>
                    <th>Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {report.headaches.map(e => (
                    <tr key={e.id}>
                      <td style={{ whiteSpace: 'nowrap' }}>{formatDate(e.date)}</td>
                      <td><span className={`intensity-badge intensity-${e.intensity <= 3 ? 'low' : e.intensity <= 6 ? 'medium' : 'high'}`}>{e.intensity}/10</span></td>
                      <td>{e.pain_location.join(', ')}</td>
                      <td>{e.time_of_day}</td>
                      <td>{e.duration_hours ? `${e.duration_hours}h` : ''}</td>
                      <td>{e.symptoms.join(', ')}</td>
                      <td>{e.triggers.join(', ')}</td>
                      <td>{e.medications.map(m => `${m.name} ×${m.quantity}`).join(', ')}</td>
                      <td>{e.notes}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>

          {/* Period entries */}
          {report.periods.length > 0 && (
            <section className="report-section">
              <h2>Menstrual Cycle Records</h2>
              <table className="report-table">
                <thead>
                  <tr><th>Start Date</th><th>Period Length</th><th>Cycle Length</th><th>Notes</th></tr>
                </thead>
                <tbody>
                  {report.periods.map(e => (
                    <tr key={e.id}>
                      <td>{formatDate(e.start_date)}</td>
                      <td>{e.period_length} days</td>
                      <td>{e.cycle_length} days</td>
                      <td>{e.notes}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          )}

          {/* Weather context per headache cluster */}
          {report.headaches.length > 0 && Object.keys(report.weatherByDate || {}).length > 0 && (() => {
            const clusters = buildWeatherClusters(report.headaches, report.weatherByDate || {}, report.periods || []);
            return (
              <section className="report-section">
                <h2>Weather Context</h2>
                <p className="report-subtitle-small">Weather ±3 days around each headache incident. Headache days are highlighted.</p>
                {clusters.map((cluster, ci) => (
                  <div key={ci} className="weather-cluster">
                    <h3 className="weather-cluster-title">
                      Incident {ci + 1}: {cluster.headacheDates.map(d => formatDate(d)).join(', ')}
                    </h3>
                    <table className="report-table weather-context-table">
                      <thead>
                        <tr>
                          <th>Date</th>
                          <th>Condition</th>
                          <th>Temp (°C)</th>
                          <th>Pressure (hPa)</th>
                          <th>Δ Pressure</th>
                          <th>Rain (mm)</th>
                          <th>Period</th>
                          <th>Headache</th>
                        </tr>
                      </thead>
                      <tbody>
                        {cluster.rows.map(row => (
                          <tr key={row.date} className={row.isHeadacheDay ? 'weather-row-headache' : row.periodInfo ? 'weather-row-period' : ''}>
                            <td style={{ whiteSpace: 'nowrap' }}>
                              {row.isHeadacheDay ? <strong>{formatDate(row.date)}</strong> : formatDate(row.date)}
                            </td>
                            <td>{row.weather ? `${row.weather.icon} ${row.weather.label}` : '—'}</td>
                            <td>{row.weather ? `${row.weather.temp_min?.toFixed(0)}–${row.weather.temp_max?.toFixed(0)}` : '—'}</td>
                            <td>{row.weather?.pressure_max != null ? row.weather.pressure_max.toFixed(0) : '—'}</td>
                            <td className={row.weather?.pressure_delta < -8 ? 'pressure-drop-cell' : ''}>
                              {row.weather?.pressure_delta != null
                                ? `${row.weather.pressure_delta > 0 ? '+' : ''}${row.weather.pressure_delta.toFixed(1)}`
                                : '—'}
                            </td>
                            <td>{row.weather?.precipitation > 0 ? row.weather.precipitation.toFixed(1) : '—'}</td>
                            <td>
                              {row.periodInfo
                                ? <span className="period-day-badge">{row.periodInfo.isStart ? '🩸 Day 1' : `🩸 Day ${row.periodInfo.day}`}</span>
                                : ''}
                            </td>
                            <td>
                              {row.isHeadacheDay
                                ? row.headacheEntries.map(h => (
                                  <span key={h.id} className={`intensity-badge intensity-${h.intensity <= 3 ? 'low' : h.intensity <= 6 ? 'medium' : 'high'}`}>
                                    {h.intensity}/10
                                  </span>
                                ))
                                : ''}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ))}
              </section>
            );
          })()}

          <div className="report-footer">
            <p>This report was generated from Migraine Diary. All data entered by patient.</p>
          </div>
        </div>
      )}
    </div>
  );
}
