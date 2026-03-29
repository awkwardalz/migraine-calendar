/**
 * Fetches and caches Hong Kong weather from Open-Meteo.
 * Only fetches dates >= 2026-03-29 that are not yet in the cache.
 */
import db from '../db.js';

const HK_LAT = 22.3193;
const HK_LON = 114.1694;
const CUTOFF = '2026-03-29'; // never fetch weather before this date

// WMO weather code → emoji + label
export function weatherLabel(code) {
  if (code === 0) return { icon: '☀️', label: 'Clear' };
  if (code <= 2) return { icon: '⛅', label: 'Partly cloudy' };
  if (code === 3) return { icon: '☁️', label: 'Overcast' };
  if (code <= 49) return { icon: '🌫️', label: 'Foggy' };
  if (code <= 59) return { icon: '🌦️', label: 'Drizzle' };
  if (code <= 69) return { icon: '🌧️', label: 'Rain' };
  if (code <= 79) return { icon: '🌨️', label: 'Snow' };
  if (code <= 82) return { icon: '🌧️', label: 'Showers' };
  if (code <= 84) return { icon: '🌨️', label: 'Snow showers' };
  if (code <= 99) return { icon: '⛈️', label: 'Thunderstorm' };
  return { icon: '🌡️', label: 'Unknown' };
}

/**
 * Fetch weather for a single date (YYYY-MM-DD) if not already cached.
 * Silently ignores dates before CUTOFF.
 * Pass force=true to overwrite cached forecasts with actual observed data.
 */
export async function fetchAndCacheWeather(dateStr, force = false) {
  if (dateStr < CUTOFF) return;

  if (!force) {
    const existing = db.prepare('SELECT date FROM weather_cache WHERE date = ?').get(dateStr);
    if (existing) return; // already cached
  }

  try {
    const url = new URL('https://api.open-meteo.com/v1/forecast');
    url.searchParams.set('latitude', HK_LAT);
    url.searchParams.set('longitude', HK_LON);
    url.searchParams.set('daily', [
      'temperature_2m_max',
      'temperature_2m_min',
      'precipitation_sum',
      'weathercode',
    ].join(','));
    // surface_pressure is hourly-only in Open-Meteo; fetch it separately
    url.searchParams.set('hourly', 'surface_pressure');
    url.searchParams.set('timezone', 'Asia/Hong_Kong');
    url.searchParams.set('start_date', dateStr);
    url.searchParams.set('end_date', dateStr);

    const res = await fetch(url.toString());
    if (!res.ok) return;
    const json = await res.json();

    const daily = json.daily;
    if (!daily?.time?.[0]) return;

    // Compute pressure max/min from the 24 hourly values
    const hourlyPressures = (json.hourly?.surface_pressure ?? []).filter(v => v != null);
    const pressureMax = hourlyPressures.length ? Math.max(...hourlyPressures) : null;
    const pressureMin = hourlyPressures.length ? Math.min(...hourlyPressures) : null;

    // Pressure delta: compare to previous cached day
    const prevDay = getPrevDay(dateStr);
    const prevCache = prevDay
      ? db.prepare('SELECT pressure_min FROM weather_cache WHERE date = ?').get(prevDay)
      : null;
    const pressureDelta = prevCache?.pressure_min != null && pressureMax != null
      ? parseFloat((pressureMax - prevCache.pressure_min).toFixed(2))
      : null;

    db.prepare(`
      INSERT OR REPLACE INTO weather_cache
        (date, temp_max, temp_min, precipitation, pressure_max, pressure_min, pressure_delta, weathercode, fetched_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `).run(
      daily.time[0],
      daily.temperature_2m_max?.[0] ?? null,
      daily.temperature_2m_min?.[0] ?? null,
      daily.precipitation_sum?.[0] ?? null,
      pressureMax,
      pressureMin,
      pressureDelta,
      daily.weathercode?.[0] ?? null,
    );
  } catch {
    // Non-fatal: weather is supplementary data
  }
}

/**
 * Fetch weather for anchorDate and the preceding daysBefore days.
 * Past dates (≤ today) are force-fetched so forecasts are replaced with actuals.
 * Future dates are cached only if not already present.
 */
export async function fetchRangeAroundDate(anchorDate, daysBefore = 7) {
  const today = new Date().toISOString().slice(0, 10);
  const anchor = new Date(anchorDate + 'T00:00:00Z');
  const promises = [];
  for (let i = daysBefore; i >= 0; i--) {
    const d = new Date(anchor);
    d.setUTCDate(d.getUTCDate() - i);
    const dateStr = d.toISOString().slice(0, 10);
    const force = dateStr <= today; // replace forecasts with actuals for past dates
    promises.push(fetchAndCacheWeather(dateStr, force).catch(() => null));
  }
  await Promise.all(promises);
}

/**
 * Returns YYYY-MM-DD of the day before dateStr.
 */
function getPrevDay(dateStr) {
  const d = new Date(dateStr + 'T12:00:00');
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}
