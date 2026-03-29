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

          <div className="report-footer">
            <p>This report was generated from Migraine Diary. All data entered by patient.</p>
          </div>
        </div>
      )}
    </div>
  );
}
