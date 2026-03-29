import { useState, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { api } from '../api';
import DatePickerField from './DatePickerField';

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default function PeriodForm() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const isEdit = !!id;

  const [form, setForm] = useState({
    start_date: searchParams.get('date') || todayStr(),
    cycle_length: '',
    period_length: 5,
    notes: '',
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [preview, setPreview] = useState(null);

  useEffect(() => {
    if (id) {
      setLoading(true);
      api.getPeriodById(id)
        .then(entry => {
          setForm({
            start_date: entry.start_date,
            cycle_length: entry.cycle_length || '',
            period_length: entry.period_length || 5,
            notes: entry.notes || '',
          });
          setPreview(entry);
        })
        .catch(err => setError(err.message))
        .finally(() => setLoading(false));
    }
  }, [id]);

  // Live preview of cycle dates
  useEffect(() => {
    if (!form.start_date) return;
    const cycleLen = parseInt(form.cycle_length) || 28;
    const periodLen = parseInt(form.period_length) || 5;
    const addDays = (d, n) => {
      const dt = new Date(d + 'T00:00:00');
      dt.setDate(dt.getDate() + n);
      return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    };
    const periodEnd = form.start_date ? addDays(form.start_date, periodLen - 1) : null;
    const ovDay = form.start_date ? addDays(form.start_date, cycleLen - 14) : null;
    const fertileStart = form.start_date ? addDays(form.start_date, cycleLen - 16) : null;
    const fertileEnd = form.start_date ? addDays(form.start_date, cycleLen - 12) : null;
    const nextPeriod = form.start_date ? addDays(form.start_date, cycleLen) : null;
    setPreview({ periodEnd, ovDay, fertileStart, fertileEnd, nextPeriod });
  }, [form.start_date, form.cycle_length, form.period_length]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const data = {
        ...form,
        cycle_length: form.cycle_length ? parseInt(form.cycle_length) : undefined,
        period_length: parseInt(form.period_length),
      };
      if (isEdit) {
        await api.updatePeriod(id, data);
      } else {
        await api.createPeriod(data);
      }
      navigate('/');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Delete this period entry?')) return;
    try {
      await api.deletePeriod(id);
      navigate('/');
    } catch (err) {
      setError(err.message);
    }
  };

  if (loading) return <div className="loading">Loading...</div>;

  return (
    <div className="form-container">
      <h2>{isEdit ? 'Edit Period Entry' : 'Record Period'}</h2>

      <form onSubmit={handleSubmit} className="period-form">
        {error && <div className="error-message">{error}</div>}

        <div className="form-group">
          <label>Period Start Date</label>
          <DatePickerField
            value={form.start_date}
            onChange={date => setForm({ ...form, start_date: date })}
            required
          />
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Period Length (days)</label>
            <input
              type="number"
              min="2"
              max="10"
              value={form.period_length}
              onChange={e => setForm({ ...form, period_length: e.target.value })}
            />
            <span className="form-hint">Typically 3–7 days</span>
          </div>
          <div className="form-group">
            <label>Cycle Length (days)</label>
            <input
              type="number"
              min="21"
              max="45"
              value={form.cycle_length}
              onChange={e => setForm({ ...form, cycle_length: e.target.value })}
              placeholder="Auto-calculated"
            />
            <span className="form-hint">Leave blank — auto-calculated from previous entry</span>
          </div>
        </div>

        <div className="form-group">
          <label>Notes</label>
          <textarea
            value={form.notes}
            onChange={e => setForm({ ...form, notes: e.target.value })}
            rows={2}
            placeholder="Flow intensity, cramps, mood..."
          />
        </div>

        {preview && (
          <div className="cycle-preview">
            <h3>Cycle Forecast</h3>
            <div className="cycle-preview-grid">
              <div className="cycle-preview-item period-item">
                <span className="cycle-icon">🌸</span>
                <div>
                  <div className="cycle-label">Period ends ~</div>
                  <div className="cycle-date">{preview.periodEnd}</div>
                </div>
              </div>
              <div className="cycle-preview-item fertile-item">
                <span className="cycle-icon">✦</span>
                <div>
                  <div className="cycle-label">Fertile window</div>
                  <div className="cycle-date">{preview.fertileStart} – {preview.fertileEnd}</div>
                </div>
              </div>
              <div className="cycle-preview-item ovulation-item">
                <span className="cycle-icon">◎</span>
                <div>
                  <div className="cycle-label">Ovulation ~</div>
                  <div className="cycle-date">{preview.ovDay}</div>
                </div>
              </div>
              <div className="cycle-preview-item next-item">
                <span className="cycle-icon">↻</span>
                <div>
                  <div className="cycle-label">Next period ~</div>
                  <div className="cycle-date">{preview.nextPeriod}</div>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="form-actions">
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'Saving...' : isEdit ? 'Update' : 'Save'}
          </button>
          {isEdit && (
            <button type="button" className="btn btn-danger" onClick={handleDelete}>
              Delete
            </button>
          )}
          <button type="button" className="btn btn-outline" onClick={() => navigate(-1)}>
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
