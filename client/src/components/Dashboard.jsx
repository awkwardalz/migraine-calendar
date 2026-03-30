import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Calendar from 'react-calendar';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import Stats from './Stats';
import 'react-calendar/dist/Calendar.css';

function formatDate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export default function Dashboard() {
  const [headaches, setHeadaches] = useState([]);
  const [preventive, setPreventive] = useState([]);
  const [stats, setStats] = useState(null);
  const [weather, setWeather] = useState({});
  const [selectedDate, setSelectedDate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeMonth, setActiveMonth] = useState(new Date());
  const { user } = useAuth();
  const isGuest = user?.role === 'guest';
  const navigate = useNavigate();

  useEffect(() => {
    Promise.all([api.getHeadaches(), api.getPreventive(), api.getStats()])
      .then(([h, p, s]) => {
        setHeadaches(h);
        setPreventive(p);
        setStats(s);
      })
      .finally(() => setLoading(false));
  }, []);

  // Load weather for the visible month (prev month start → next month end to cover navigation overlap)
  const loadWeather = (anchor = activeMonth) => {
    const y = anchor.getFullYear();
    const m = anchor.getMonth();
    const start = formatDate(new Date(y, m - 1, 1));
    const end = formatDate(new Date(y, m + 2, 0)); // last day of next month
    api.getWeather(start, end)
      .then(rows => {
        const map = {};
        rows.forEach(r => { map[r.date] = r; });
        setWeather(prev => ({ ...prev, ...map }));
      })
      .catch(() => {});
  };

  useEffect(() => {
    loadWeather(activeMonth);
  }, [activeMonth]);

  useEffect(() => {
    const handler = () => loadWeather(activeMonth);
    window.addEventListener('weather-fetched', handler);
    return () => window.removeEventListener('weather-fetched', handler);
  }, [activeMonth]);

  // Build lookup maps
  const headacheMap = {};
  headaches.forEach(h => {
    if (!headacheMap[h.date]) headacheMap[h.date] = [];
    headacheMap[h.date].push(h);
  });

  const preventiveMap = {};
  preventive.forEach(p => {
    if (!preventiveMap[p.date]) preventiveMap[p.date] = [];
    preventiveMap[p.date].push(p);
  });

  const tileClassName = ({ date, view }) => {
    if (view !== 'month') return null;
    const dateStr = formatDate(date);
    const classes = [];
    const entries = headacheMap[dateStr];
    if (entries?.length > 0) {
      const maxIntensity = Math.max(...entries.map(e => e.intensity || 5));
      classes.push('migraine-day');
      if (maxIntensity <= 3) classes.push('intensity-low');
      else if (maxIntensity <= 6) classes.push('intensity-medium');
      else classes.push('intensity-high');
    }
    if (preventiveMap[dateStr]) {
      classes.push('preventive-day');
    }
    return classes.length ? classes.join(' ') : null;
  };

  const tileContent = ({ date, view }) => {
    if (view !== 'month') return null;
    const dateStr = formatDate(date);
    const markers = [];
    const entries = headacheMap[dateStr];
    if (entries?.length > 0) {
      const maxIntensity = Math.max(...entries.map(e => e.intensity || 5));
      markers.push(
        <span key="m" className="tile-marker migraine-marker" title={`Intensity: ${maxIntensity}/10`}>
          ●
        </span>
      );
    }
    if (preventiveMap[dateStr]) {
      markers.push(
        <span key="p" className="tile-marker preventive-marker" title="Preventive medication">
          ◆
        </span>
      );
    }
    // Weather icon (only for current/future dates with cached data)
    const w = weather[dateStr];
    if (w) {
      markers.push(
        <span key="w" className="tile-marker weather-marker" title={`${w.label} · ${w.temp_min?.toFixed(0)}–${w.temp_max?.toFixed(0)}°C`}>
          {w.icon}
        </span>
      );
    }
    return markers.length > 0 ? <div className="tile-markers">{markers}</div> : null;
  };

  const handleDateClick = (date) => {
    const dateStr = formatDate(date);
    setSelectedDate(dateStr);
  };

  const selectedHeadaches = selectedDate ? (headacheMap[selectedDate] || []) : [];
  const selectedPreventive = selectedDate ? (preventiveMap[selectedDate] || []) : [];
  const selectedWeather = selectedDate ? (weather[selectedDate] || null) : null;

  if (loading) return <div className="loading">Loading your migraine data...</div>;

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h2>Migraine Calendar</h2>
        <div className="legend">
          <span className="legend-item">
            <span className="legend-dot migraine-low">●</span> Mild (1-3)
          </span>
          <span className="legend-item">
            <span className="legend-dot migraine-med">●</span> Moderate (4-6)
          </span>
          <span className="legend-item">
            <span className="legend-dot migraine-high">●</span> Severe (7-10)
          </span>
          <span className="legend-item">
            <span className="legend-dot preventive-dot">◆</span> Preventive Med
          </span>
        </div>
      </div>

      <div className="dashboard-grid">
        <div className="calendar-section">
          <div className="calendar-wrapper">
            <Calendar
              onClickDay={handleDateClick}
              onActiveStartDateChange={({ activeStartDate }) => {
                if (activeStartDate) setActiveMonth(activeStartDate);
              }}
              tileClassName={tileClassName}
              tileContent={tileContent}
              value={selectedDate ? new Date(selectedDate + 'T00:00:00') : new Date()}
              calendarType="gregory"
            />
          </div>

          {selectedDate && (
            <div className="day-detail">
              <div className="day-detail-header">
                <h3>{new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</h3>
                {user && !isGuest && (
                  <div className="day-detail-actions">
                    <button className="btn btn-outline btn-sm" onClick={() => navigate(`/record?date=${selectedDate}`)}>
                      🤯 Headache
                    </button>
                    <button className="btn btn-outline btn-sm" onClick={() => navigate(`/preventive?date=${selectedDate}`)}>
                      💊 Preventive
                    </button>
                    <button className="btn btn-outline btn-sm" onClick={() => navigate(`/period?date=${selectedDate}`)}>
                      🩸 Period
                    </button>
                  </div>
                )}
              </div>

              {selectedWeather && (
                <div className="weather-card">
                  <span className="weather-icon-lg">{selectedWeather.icon}</span>
                  <div className="weather-details">
                    <span className="weather-condition">{selectedWeather.label}</span>
                    <span className="weather-temp">{selectedWeather.temp_min?.toFixed(0)}–{selectedWeather.temp_max?.toFixed(0)}°C</span>
                    {selectedWeather.pressure_max != null && (
                      <span className={`weather-pressure${selectedWeather.pressure_delta < -8 ? ' pressure-drop' : ''}`}
                        title="Surface pressure">
                        ⊕ {selectedWeather.pressure_max?.toFixed(0)} hPa
                        {selectedWeather.pressure_delta != null && (
                          <span className="pressure-delta">
                            {selectedWeather.pressure_delta > 0 ? ' ▲' : ' ▼'}{Math.abs(selectedWeather.pressure_delta).toFixed(1)}
                          </span>
                        )}
                      </span>
                    )}
                    {selectedWeather.precipitation > 0 && (
                      <span className="weather-rain">💧 {selectedWeather.precipitation?.toFixed(1)} mm</span>
                    )}
                  </div>
                </div>
              )}

              {selectedHeadaches.length > 0 ? (
                selectedHeadaches.map(entry => (
                  <div key={entry.id} className="entry-card">
                    <div className="entry-header">
                      <span className={`intensity-badge intensity-${entry.intensity <= 3 ? 'low' : entry.intensity <= 6 ? 'medium' : 'high'}`}>
                        {entry.intensity}/10
                      </span>
                      {entry.time_of_day && <span className="tag">{entry.time_of_day}</span>}
                      {entry.duration_hours && <span className="tag">{entry.duration_hours}h</span>}
                    </div>
                    <div className="entry-details">
                      {entry.pain_location?.length > 0 && (
                        <p><strong>Location:</strong> {entry.pain_location.join(', ')}</p>
                      )}
                      {entry.pain_area?.length > 0 && (
                        <p><strong>Area:</strong> {entry.pain_area.join(', ')}</p>
                      )}
                      {entry.medications?.length > 0 && (
                        <p><strong>Meds:</strong> {entry.medications.map(m => `${m.name} ×${m.quantity}`).join(', ')}</p>
                      )}
                      {entry.symptoms?.length > 0 && (
                        <p><strong>Symptoms:</strong> {entry.symptoms.join(', ')}</p>
                      )}
                      {entry.triggers?.length > 0 && (
                        <p><strong>Triggers:</strong> {entry.triggers.join(', ')}</p>
                      )}
                      {entry.notes && <p><strong>Notes:</strong> {entry.notes}</p>}
                    </div>
                    {user && !isGuest && (
                      <button className="btn btn-outline btn-sm" onClick={() => navigate(`/record/${entry.id}`)}>
                        Edit
                      </button>
                    )}
                  </div>
                ))
              ) : (
                <p className="no-entries">No headache recorded on this day</p>
              )}

              {selectedPreventive.length > 0 && (
                <div className="preventive-section">
                  <h4>Preventive Medications</h4>
                  {selectedPreventive.map(entry => (
                    <div key={entry.id} className="entry-card preventive-card">
                      <div className="entry-header">
                        <strong>{entry.medication_name}</strong>
                        <span className="tag">{entry.medication_type}</span>
                      </div>
                      {entry.dosage && <p>Dosage: {entry.dosage}</p>}
                      {entry.notes && <p>Notes: {entry.notes}</p>}
                      {user && !isGuest && (
                        <button className="btn btn-outline btn-sm" onClick={() => navigate(`/preventive/${entry.id}`)}>
                          Edit
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="stats-section">
          {stats && <Stats stats={stats} />}
        </div>
      </div>
    </div>
  );
}
