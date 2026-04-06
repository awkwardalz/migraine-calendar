import { useState, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { api } from '../api';
import DatePickerField from './DatePickerField';

const PAIN_LOCATIONS = ['Left side', 'Right side', 'Whole head'];
const PAIN_AREAS = ['Forehead', 'Temples', 'Back of head', 'Top of head', 'Behind eyes'];
const TIME_OPTIONS = ['Early morning', 'Morning', 'Afternoon', 'Evening', 'Night'];
const MEDICATIONS = [
  { name: 'Paracetamol 500mg', maxQty: 8 },
  { name: 'Panadol Extra', maxQty: 8 },
  { name: 'Eve (Ibuprofen 200mg)', maxQty: 3 },
  { name: 'Relpax 20mg', maxQty: 2 },
  { name: 'Nurtec', maxQty: 2 },
];
const SYMPTOMS = [
  'Nausea', 'Vomiting', 'Sensitivity to light', 'Sensitivity to sound',
  'Sensitivity to smell', 'Aura (visual)', 'Dizziness', 'Neck stiffness',
  'Fatigue', 'Blurred vision', 'Difficulty concentrating', 'Numbness/tingling',
];
const TRIGGERS = [
  'Stress', 'Lack of sleep', 'Too much sleep', 'Weather changes',
  'Hormonal', 'Food/drink', 'Skipped meal', 'Dehydration',
  'Exercise', 'Screen time', 'Strong smells', 'Alcohol', 'Caffeine withdrawal',
];

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default function HeadacheForm() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const isEdit = !!id;

  const [form, setForm] = useState({
    date: searchParams.get('date') || todayStr(),
    pain_location: [],
    pain_area: [],
    intensity: 5,
    time_of_day: '',
    duration_hours: '',
    medications: [],
    symptoms: [],
    triggers: [],
    notes: '',
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (id) {
      setLoading(true);
      api.getHeadache(id)
        .then(entry => {
          setForm({
            date: entry.date,
            pain_location: entry.pain_location || [],
            pain_area: entry.pain_area || [],
            intensity: entry.intensity || 5,
            time_of_day: entry.time_of_day || '',
            duration_hours: entry.duration_hours || '',
            medications: entry.medications || [],
            symptoms: entry.symptoms || [],
            triggers: entry.triggers || [],
            notes: entry.notes || '',
          });
        })
        .catch(err => setError(err.message))
        .finally(() => setLoading(false));
    }
  }, [id]);

  const toggleArrayItem = (field, value) => {
    setForm(prev => ({
      ...prev,
      [field]: prev[field].includes(value)
        ? prev[field].filter(v => v !== value)
        : [...prev[field], value],
    }));
  };

  const updateMedication = (name, quantity) => {
    setForm(prev => {
      const meds = prev.medications.filter(m => m.name !== name);
      if (quantity > 0) meds.push({ name, quantity });
      return { ...prev, medications: meds };
    });
  };

  const getMedQuantity = (name) => {
    const med = form.medications.find(m => m.name === name);
    return med ? med.quantity : 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const data = {
        ...form,
        duration_hours: form.duration_hours ? parseFloat(form.duration_hours) : null,
      };
      if (isEdit) {
        await api.updateHeadache(id, data);
      } else {
        await api.createHeadache(data);
      }
      navigate('/');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this entry?')) return;
    try {
      await api.deleteHeadache(id);
      navigate('/');
    } catch (err) {
      setError(err.message);
    }
  };

  if (loading) return <div className="loading">Loading entry...</div>;

  return (
    <div className="form-container">
      <h2>{isEdit ? 'Edit Headache Entry' : 'Record Headache'}</h2>

      <form onSubmit={handleSubmit} className="headache-form">
        {error && <div className="error-message">{error}</div>}

        <div className="form-group">
          <label>Date</label>
          <DatePickerField
            value={form.date}
            onChange={date => setForm({ ...form, date })}
            required
          />
        </div>

        <div className="form-group">
          <label>Pain Location</label>
          <div className="chip-group">
            {PAIN_LOCATIONS.map(loc => (
              <button
                key={loc}
                type="button"
                className={`chip ${form.pain_location.includes(loc) ? 'active' : ''}`}
                onClick={() => toggleArrayItem('pain_location', loc)}
              >
                {loc}
              </button>
            ))}
          </div>
        </div>

        <div className="form-group">
          <label>Pain Area</label>
          <div className="chip-group">
            {PAIN_AREAS.map(area => (
              <button
                key={area}
                type="button"
                className={`chip ${form.pain_area.includes(area) ? 'active' : ''}`}
                onClick={() => toggleArrayItem('pain_area', area)}
              >
                {area}
              </button>
            ))}
          </div>
        </div>

        <div className="form-group">
          <label>Intensity: <strong>{form.intensity}/10</strong></label>
          <input
            type="range"
            min="1"
            max="10"
            value={form.intensity}
            onChange={e => setForm({ ...form, intensity: parseInt(e.target.value) })}
            className="intensity-slider"
          />
          <div className="intensity-labels">
            <span>1 - Mild</span>
            <span>5 - Moderate</span>
            <span>10 - Severe</span>
          </div>
        </div>

        <div className="form-group">
          <label>Time of Day</label>
          <div className="chip-group">
            {TIME_OPTIONS.map(time => (
              <button
                key={time}
                type="button"
                className={`chip ${form.time_of_day === time ? 'active' : ''}`}
                onClick={() => setForm({ ...form, time_of_day: form.time_of_day === time ? '' : time })}
              >
                {time}
              </button>
            ))}
          </div>
        </div>

        <div className="form-group">
          <label>Duration (hours)</label>
          <input
            type="number"
            min="0.5"
            max="72"
            step="0.5"
            value={form.duration_hours}
            onChange={e => setForm({ ...form, duration_hours: e.target.value })}
            placeholder="e.g. 4"
          />
        </div>

        <div className="form-group">
          <label>Medications Taken</label>
          <div className="medication-grid">
            {MEDICATIONS.map(med => (
              <div key={med.name} className="medication-item">
                <span className="med-label">{med.name}</span>
                <div className="quantity-control">
                  <button
                    type="button"
                    className="qty-btn"
                    onClick={() => updateMedication(med.name, Math.max(0, getMedQuantity(med.name) - 1))}
                  >
                    −
                  </button>
                  <span className="qty-value">{getMedQuantity(med.name)}</span>
                  <button
                    type="button"
                    className="qty-btn"
                    onClick={() => updateMedication(med.name, Math.min(med.maxQty, getMedQuantity(med.name) + 1))}
                  >
                    +
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="form-group">
          <label>Symptoms</label>
          <div className="chip-group">
            {SYMPTOMS.map(symptom => (
              <button
                key={symptom}
                type="button"
                className={`chip ${form.symptoms.includes(symptom) ? 'active' : ''}`}
                onClick={() => toggleArrayItem('symptoms', symptom)}
              >
                {symptom}
              </button>
            ))}
          </div>
        </div>

        <div className="form-group">
          <label>Possible Triggers</label>
          <div className="chip-group">
            {TRIGGERS.map(trigger => (
              <button
                key={trigger}
                type="button"
                className={`chip ${form.triggers.includes(trigger) ? 'active' : ''}`}
                onClick={() => toggleArrayItem('triggers', trigger)}
              >
                {trigger}
              </button>
            ))}
          </div>
        </div>

        <div className="form-group">
          <label>Notes</label>
          <textarea
            value={form.notes}
            onChange={e => setForm({ ...form, notes: e.target.value })}
            rows={3}
            placeholder="Any additional notes..."
          />
        </div>

        <div className="form-actions">
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'Saving...' : isEdit ? 'Update Entry' : 'Save Entry'}
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
