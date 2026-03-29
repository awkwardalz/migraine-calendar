import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../api';

export default function Header() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [weatherStatus, setWeatherStatus] = useState(null); // null | 'loading' | 'done'

  const handleFetchWeather = async () => {
    if (weatherStatus === 'loading') return;
    setWeatherStatus('loading');
    try {
      const today = new Date().toISOString().slice(0, 10);
      const end = new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10);
      await api.triggerWeatherFetch(today, end);
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
              <Link to="/record" className="nav-link">🤯</Link>
              <Link to="/preventive" className="nav-link">💊</Link>
              <Link to="/period" className="nav-link">🩸</Link>
              <Link to="/history" className="nav-link">📝</Link>
            </>
          )}
        </nav>
        <div className="auth-section">
          {user && (
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
            <button onClick={handleLogout} className="btn btn-outline btn-sm">Logout</button>
          ) : (
            <Link to="/login" className="btn btn-primary btn-sm">Login</Link>
          )}
        </div>
      </div>
    </header>
  );
}
