import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';

export default function History() {
  const [headaches, setHeadaches] = useState([]);
  const [preventive, setPreventive] = useState([]);
  const [periods, setPeriods] = useState([]);
  const [tab, setTab] = useState('headaches');
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    Promise.all([api.getHeadaches(), api.getPreventive(), api.getPeriods()])
      .then(([h, p, pr]) => { setHeadaches(h); setPreventive(p); setPeriods(pr); })
      .finally(() => setLoading(false));
  }, []);

  const handleDelete = async (type, id, e) => {
    e.stopPropagation();
    if (!confirm('Delete this entry?')) return;
    if (type === 'headache') {
      await api.deleteHeadache(id);
      setHeadaches(prev => prev.filter(x => x.id !== id));
    } else if (type === 'preventive') {
      await api.deletePreventive(id);
      setPreventive(prev => prev.filter(x => x.id !== id));
    } else if (type === 'period') {
      await api.deletePeriod(id);
      setPeriods(prev => prev.filter(x => x.id !== id));
    }
  };

  if (loading) return <div className="loading">Loading history...</div>;

  return (
    <div className="history-container">
      <h2>History</h2>
      <div className="tab-bar">
        <button
          className={`tab-btn ${tab === 'headaches' ? 'active' : ''}`}
          onClick={() => setTab('headaches')}
        >
          🤯 Headaches ({headaches.length})
        </button>
        <button
          className={`tab-btn ${tab === 'preventive' ? 'active' : ''}`}
          onClick={() => setTab('preventive')}
        >
          💊 Preventive ({preventive.length})
        </button>
        <button
          className={`tab-btn ${tab === 'period' ? 'active' : ''}`}
          onClick={() => setTab('period')}
        >
          🩸 Period ({periods.length})
        </button>
      </div>

      {tab === 'headaches' && (
        <div className="entry-list">
          {headaches.length === 0 && <p className="no-entries">No headache entries yet</p>}
          {headaches.map(entry => (
            <div
              key={entry.id}
              className="history-card"
              onClick={() => navigate(`/record/${entry.id}`)}
            >
              <div className="history-card-header">
                <span className="history-date">
                  {new Date(entry.date + 'T00:00:00').toLocaleDateString('en-US', {
                    weekday: 'short', year: 'numeric', month: 'short', day: 'numeric',
                  })}
                </span>
                <div className="history-card-actions">
                  <span className={`intensity-badge intensity-${entry.intensity <= 3 ? 'low' : entry.intensity <= 6 ? 'medium' : 'high'}`}>
                    {entry.intensity}/10
                  </span>
                  <button
                    className="btn-delete"
                    onClick={(e) => handleDelete('headache', entry.id, e)}
                    title="Delete entry"
                  >✕</button>
                </div>
              </div>
              <div className="history-card-body">
                {entry.pain_location?.length > 0 && (
                  <span className="tag">{entry.pain_location.join(', ')}</span>
                )}
                {entry.time_of_day && <span className="tag">{entry.time_of_day}</span>}
                {entry.duration_hours && <span className="tag">{entry.duration_hours}h</span>}
                {entry.medications?.length > 0 && (
                  <span className="tag med-tag">
                    {entry.medications.map(m => `${m.name} ×${m.quantity}`).join(', ')}
                  </span>
                )}
              </div>
              {entry.symptoms?.length > 0 && (
                <div className="history-card-symptoms">
                  {entry.symptoms.slice(0, 4).map(s => (
                    <span key={s} className="mini-tag">{s}</span>
                  ))}
                  {entry.symptoms.length > 4 && <span className="mini-tag">+{entry.symptoms.length - 4}</span>}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {tab === 'preventive' && (
        <div className="entry-list">
          {preventive.length === 0 && <p className="no-entries">No preventive medication entries yet</p>}
          {preventive.map(entry => (
            <div
              key={entry.id}
              className="history-card preventive-history"
              onClick={() => navigate(`/preventive/${entry.id}`)}
            >
              <div className="history-card-header">
                <span className="history-date">
                  {new Date(entry.date + 'T00:00:00').toLocaleDateString('en-US', {
                    weekday: 'short', year: 'numeric', month: 'short', day: 'numeric',
                  })}
                </span>
                <div className="history-card-actions">
                  <span className="tag">{entry.medication_type}</span>
                  <button
                    className="btn-delete"
                    onClick={(e) => handleDelete('preventive', entry.id, e)}
                    title="Delete entry"
                  >✕</button>
                </div>
              </div>
              <div className="history-card-body">
                <strong>{entry.medication_name}</strong>
                {entry.dosage && <span className="tag">{entry.dosage}</span>}
              </div>
              {entry.notes && <p className="history-notes">{entry.notes}</p>}
            </div>
          ))}
        </div>
      )}

      {tab === 'period' && (
        <div className="entry-list">
          {periods.length === 0 && <p className="no-entries">No period entries yet</p>}
          {periods.map(entry => (
            <div
              key={entry.id}
              className="history-card period-history"
              onClick={() => navigate(`/period/${entry.id}`)}
            >
              <div className="history-card-header">
                <span className="history-date">
                  {new Date(entry.start_date + 'T00:00:00').toLocaleDateString('en-US', {
                    weekday: 'short', year: 'numeric', month: 'short', day: 'numeric',
                  })}
                </span>
                <div className="history-card-actions">
                  <span className="tag">{entry.period_length} days</span>
                  <button
                    className="btn-delete"
                    onClick={(e) => handleDelete('period', entry.id, e)}
                    title="Delete entry"
                  >✕</button>
                </div>
              </div>
              <div className="history-card-body">
                <span className="tag">Cycle: {entry.cycle_length} days</span>
              </div>
              {entry.notes && <p className="history-notes">{entry.notes}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

