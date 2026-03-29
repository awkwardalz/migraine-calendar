import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../api';
import DatePickerField from './DatePickerField';

const PREVENTIVE_MEDICATIONS = [
  { name: 'Aimovig (erenumab)', type: 'Injection', defaultDosage: '70mg' },
  { name: 'Ajovy (fremanezumab)', type: 'Injection', defaultDosage: '225mg' },
  { name: 'Emgality (galcanezumab)', type: 'Injection', defaultDosage: '120mg' },
  { name: 'Nurtec ODT (rimegepant)', type: 'Oral', defaultDosage: '75mg' },
  { name: 'Botox', type: 'Injection', defaultDosage: '155 units' },
  { name: 'Topiramate', type: 'Oral', defaultDosage: '' },
  { name: 'Propranolol', type: 'Oral', defaultDosage: '' },
  { name: 'Amitriptyline', type: 'Oral', defaultDosage: '' },
];

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default function PreventiveForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = !!id;

  const [form, setForm] = useState({
    date: todayStr(),
    medication_name: '',
    medication_type: '',
    dosage: '',
    notes: '',
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (id) {
      setLoading(true);
      api.getPreventiveById(id)
        .then(entry => {
          setForm({
            date: entry.date,
            medication_name: entry.medication_name,
            medication_type: entry.medication_type || '',
            dosage: entry.dosage || '',
            notes: entry.notes || '',
          });
        })
        .catch(err => setError(err.message))
        .finally(() => setLoading(false));
    }
  }, [id]);

  const handleMedSelect = (med) => {
    setForm(prev => ({
      ...prev,
      medication_name: med.name,
      medication_type: med.type,
      dosage: med.defaultDosage,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.medication_name) {
      setError('Please select a medication');
      return;
    }
    setSaving(true);
    setError('');
    try {
      if (isEdit) {
        await api.updatePreventive(id, form);
      } else {
        await api.createPreventive(form);
      }
      navigate('/');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Delete this entry?')) return;
    try {
      await api.deletePreventive(id);
      navigate('/');
    } catch (err) {
      setError(err.message);
    }
  };

  if (loading) return <div className="loading">Loading entry...</div>;

  return (
    <div className="form-container">
      <h2>{isEdit ? 'Edit Preventive Medication' : 'Record Preventive Medication'}</h2>

      <form onSubmit={handleSubmit} className="preventive-form">
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
          <label>Medication</label>
          <div className="med-select-grid">
            {PREVENTIVE_MEDICATIONS.map(med => (
              <button
                key={med.name}
                type="button"
                className={`med-select-btn ${form.medication_name === med.name ? 'active' : ''}`}
                onClick={() => handleMedSelect(med)}
              >
                <span className="med-name">{med.name}</span>
                <span className="med-type-label">{med.type}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Type</label>
            <select
              value={form.medication_type}
              onChange={e => setForm({ ...form, medication_type: e.target.value })}
            >
              <option value="">Select type</option>
              <option value="Injection">Injection</option>
              <option value="Oral">Oral</option>
              <option value="Other">Other</option>
            </select>
          </div>
          <div className="form-group">
            <label>Dosage</label>
            <input
              type="text"
              value={form.dosage}
              onChange={e => setForm({ ...form, dosage: e.target.value })}
              placeholder="e.g. 70mg"
            />
          </div>
        </div>

        <div className="form-group">
          <label>Notes</label>
          <textarea
            value={form.notes}
            onChange={e => setForm({ ...form, notes: e.target.value })}
            rows={3}
            placeholder="Side effects, observations..."
          />
        </div>

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
