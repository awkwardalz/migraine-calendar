import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../api';

export default function Header() {
  const { user, logout } = useAuth();
  const isGuest = user?.role === 'guest';
  const navigate = useNavigate();
  const [weatherStatus, setWeatherStatus] = useState(null); // null | 'loading' | 'done'

  const handleFetchWeather = async () => {
    if (weatherStatus === 'loading') return;
    setWeatherStatus('loading');
    try {
      const today = new Date().toISOString().slice(0, 10);
      const start = new Date(Date.now() - 90 * 86400000).toISOString().slice(0, 10);
      const end = new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10);
      await api.triggerWeatherFetch(start, end);
      setWeatherStatus('done');
      window.dispatchEvent(new CustomEvent('weather-fetched'));
      setTimeout(() => setWeatherStatus(null), 2500);
    } catch {
      setWeatherStatus(null);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <header className="header">
      <div className="header-content">
        <Link to="/" className="logo">
          <span className="logo-icon">🧠</span>
          <h1>Migraine Diary</h1>
        </Link>
        <nav className="nav">
          <Link to="/" className="nav-link">Dashboard</Link>
          {user && (
            <>
              {!isGuest && <Link to="/record" className="nav-link">🤯</Link>}
              {!isGuest && <Link to="/preventive" className="nav-link">💊</Link>}
              {!isGuest && <Link to="/period" className="nav-link">🩸</Link>}
              <Link to="/history" className="nav-link">📝</Link>
              <Link to="/report" className="nav-link">📄</Link>
            </>
          )}
        </nav>
        <div className="auth-section">
          {user && !isGuest && (
            <button
              onClick={handleFetchWeather}
              className="btn-weather-fetch"
              title="Fetch weather data"
              disabled={weatherStatus === 'loading'}
            >
              {weatherStatus === 'loading' ? '⏳' : weatherStatus === 'done' ? '✅' : '🌤️'}
            </button>
          )}
          {user ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {isGuest && <span className="badge-guest">Guest</span>}
              <button onClick={handleLogout} className="btn btn-outline btn-sm">Logout</button>
            </div>
          ) : (
            <Link to="/login" className="btn btn-primary btn-sm">Login</Link>
          )}
        </div>
      </div>
    </header>
  );
}
