import db from '../db.js';

const HK_LAT = 22.3193;
const HK_LON = 114.1694;

export function weatherLabel(code) {
  if (code === 0)  return { icon: '\u2600\ufe0f', label: 'Clear' };
  if (code <= 2)   return { icon: '\u26c5', label: 'Partly cloudy' };
  if (code === 3)  return { icon: '\u2601\ufe0f', label: 'Overcast' };
  if (code <= 49)  return { icon: '\u{1f32b}\ufe0f', label: 'Foggy' };
  if (code <= 59)  return { icon: '\u{1f326}\ufe0f', label: 'Drizzle' };
  if (code <= 69)  return { icon: '\u{1f327}\ufe0f', label: 'Rain' };
  if (code <= 79)  return { icon: '\u{1f328}\ufe0f', label: 'Snow' };
  if (code <= 82)  return { icon: '\u{1f327}\ufe0f', label: 'Showers' };
  if (code <= 84)  return { icon: '\u{1f328}\ufe0f', label: 'Snow showers' };
  if (code <= 99)  return { icon: '\u26c8\ufe0f', label: 'Thunderstorm' };
  return { icon: '\u{1f321}\ufe0f', label: 'Unknown' };
}

export async function fetchAndCacheWeather(dateStr, force = false) {
  if (!force) {
    const rs = await db.execute({ sql: 'SELECT date FROM weather_cache WHERE date = ?', args: [dateStr] });
    if (rs.rows.length > 0) return;
  }

  try {
    const url = new URL('https://api.open-meteo.com/v1/forecast');
    url.searchParams.set('latitude', HK_LAT);
    url.searchParams.set('longitude', HK_LON);
    url.searchParams.set('daily', ['temperature_2m_max','temperature_2m_min','precipitation_sum','weathercode'].join(','));
    url.searchParams.set('hourly', 'surface_pressure');
    url.searchParams.set('timezone', 'Asia/Hong_Kong');
    url.searchParams.set('start_date', dateStr);
    url.searchParams.set('end_date', dateStr);

    const res = await fetch(url.toString());
    if (!res.ok) return;
    const json = await res.json();

    const daily = json.daily;
    if (!daily?.time?.[0]) return;

    const hourlyPressures = (json.hourly?.surface_pressure ?? []).filter(v => v != null);
    const pressureMax = hourlyPressures.length ? Math.max(...hourlyPressures) : null;
    const pressureMin = hourlyPressures.length ? Math.min(...hourlyPressures) : null;

    const prevDay = getPrevDay(dateStr);
    let pressureDelta = null;
    if (prevDay && pressureMax != null) {
      const prevRs = await db.execute({ sql: 'SELECT pressure_min FROM weather_cache WHERE date = ?', args: [prevDay] });
      const prevRow = prevRs.rows[0];
      if (prevRow?.pressure_min != null) {
        pressureDelta = parseFloat((pressureMax - Number(prevRow.pressure_min)).toFixed(2));
      }
    }

    await db.execute({
      sql: `INSERT OR REPLACE INTO weather_cache
              (date, temp_max, temp_min, precipitation, pressure_max, pressure_min, pressure_delta, weathercode, fetched_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
      args: [
        daily.time[0],
        daily.temperature_2m_max?.[0] ?? null,
        daily.temperature_2m_min?.[0] ?? null,
        daily.precipitation_sum?.[0] ?? null,
        pressureMax,
        pressureMin,
        pressureDelta,
        daily.weathercode?.[0] ?? null,
      ],
    });
  } catch {
    // Non-fatal: weather is supplementary data
  }
}

export async function fetchRangeAroundDate(anchorDate, daysBefore = 7) {
  const today = new Date().toISOString().slice(0, 10);
  const anchor = new Date(anchorDate + 'T00:00:00Z');
  const promises = [];
  for (let i = daysBefore; i >= 0; i--) {
    const d = new Date(anchor);
    d.setUTCDate(d.getUTCDate() - i);
    const dateStr = d.toISOString().slice(0, 10);
    promises.push(fetchAndCacheWeather(dateStr, dateStr > today).catch(() => null));
  }
  await Promise.all(promises);
}

function getPrevDay(dateStr) {
  const d = new Date(dateStr + 'T12:00:00');
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}
