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

// Fetch a contiguous date range from Open-Meteo in one API call.
// Returns array of raw day objects (no pressure_delta yet).
async function fetchOpenMeteoRange(startDate, endDate) {
  const url = new URL('https://api.open-meteo.com/v1/forecast');
  url.searchParams.set('latitude', HK_LAT);
  url.searchParams.set('longitude', HK_LON);
  url.searchParams.set('daily', ['temperature_2m_max','temperature_2m_min','precipitation_sum','weathercode'].join(','));
  url.searchParams.set('hourly', 'surface_pressure');
  url.searchParams.set('timezone', 'Asia/Hong_Kong');
  url.searchParams.set('start_date', startDate);
  url.searchParams.set('end_date', endDate);

  console.log(`[weather] fetchOpenMeteoRange: ${startDate} → ${endDate}`);
  console.log(`[weather] URL: ${url.toString()}`);

  try {
    const res = await fetch(url.toString());
    console.log(`[weather] Open-Meteo response status: ${res.status}`);
    if (!res.ok) {
      const body = await res.text();
      console.error(`[weather] Open-Meteo error body: ${body}`);
      return [];
    }
    const json = await res.json();
    console.log(`[weather] Open-Meteo daily.time:`, json.daily?.time);
    console.log(`[weather] Open-Meteo hourly.surface_pressure length:`, json.hourly?.surface_pressure?.length);

    const daily = json.daily;
    if (!daily?.time?.length) return [];

    // hourly surface_pressure: 24 values per day, in day order
    const hourly = json.hourly?.surface_pressure ?? [];
    const nDays = daily.time.length;
    const results = [];
    for (let i = 0; i < nDays; i++) {
      const dayHours = hourly.slice(i * 24, (i + 1) * 24).filter(v => v != null);
      results.push({
        date: daily.time[i],
        temp_max: daily.temperature_2m_max?.[i] ?? null,
        temp_min: daily.temperature_2m_min?.[i] ?? null,
        precipitation: daily.precipitation_sum?.[i] ?? null,
        pressure_max: dayHours.length ? Math.max(...dayHours) : null,
        pressure_min: dayHours.length ? Math.min(...dayHours) : null,
        weathercode: daily.weathercode?.[i] ?? null,
      });
    }
    console.log(`[weather] fetchOpenMeteoRange parsed ${results.length} days`);
    return results;
  } catch (err) {
    console.error(`[weather] fetchOpenMeteoRange exception:`, err);
    return [];
  }
}

// Batch-fetch a date range using at most two API calls:
//   1. One call for historical dates not yet in cache
//   2. One call for today + future forecast (always refreshed)
// Existing cached historical rows are preserved as-is.
export async function batchFetchAndCache(startDate, endDate) {
  const today = new Date().toISOString().slice(0, 10);
  console.log(`[weather] batchFetchAndCache called: ${startDate} → ${endDate}, today=${today}`);

  // Determine which past dates (before today) are missing from cache
  let uncachedHistorical = [];
  const yesterday = getPrevDay(today);
  if (startDate <= yesterday) {
    const histEnd = endDate < today ? endDate : yesterday;
    const rs = await db.execute({
      sql: 'SELECT date FROM weather_cache WHERE date >= ? AND date <= ?',
      args: [startDate, histEnd],
    });
    const cached = new Set(rs.rows.map(r => String(r.date)));
    console.log(`[weather] Already cached historical dates (${cached.size}):`, [...cached].slice(0, 5), '...');
    const cur = new Date(startDate + 'T00:00:00Z');
    const last = new Date(histEnd + 'T00:00:00Z');
    while (cur <= last) {
      const d = cur.toISOString().slice(0, 10);
      if (!cached.has(d)) uncachedHistorical.push(d);
      cur.setUTCDate(cur.getUTCDate() + 1);
    }
  }
  console.log(`[weather] Uncached historical dates: ${uncachedHistorical.length}`, uncachedHistorical.slice(0, 5));

  const allRows = [];

  // One batch call for all missing historical dates
  if (uncachedHistorical.length > 0) {
    console.log(`[weather] Fetching historical batch: ${uncachedHistorical[0]} → ${uncachedHistorical[uncachedHistorical.length - 1]}`);
    const rows = await fetchOpenMeteoRange(
      uncachedHistorical[0],
      uncachedHistorical[uncachedHistorical.length - 1],
    );
    const needed = new Set(uncachedHistorical);
    const filtered = rows.filter(r => needed.has(r.date));
    console.log(`[weather] Historical rows returned: ${rows.length}, after filter: ${filtered.length}`);
    allRows.push(...filtered);
  }

  // One batch call for today through end (always refresh forecast)
  if (endDate >= today) {
    const foreStart = startDate > today ? startDate : today;
    console.log(`[weather] Fetching forecast batch: ${foreStart} → ${endDate}`);
    const rows = await fetchOpenMeteoRange(foreStart, endDate);
    console.log(`[weather] Forecast rows returned: ${rows.length}`);
    allRows.push(...rows);
  }

  console.log(`[weather] Total rows to insert: ${allRows.length}`);

  if (allRows.length === 0) return 0;

  // Build a quick lookup from this batch for pressure_delta calculation
  const batchMap = Object.fromEntries(allRows.map(r => [r.date, r]));

  for (const row of allRows) {
    const prevDay = getPrevDay(row.date);
    let prevPressureMin = batchMap[prevDay]?.pressure_min ?? null;
    if (prevPressureMin == null && prevDay) {
      const rs = await db.execute({ sql: 'SELECT pressure_min FROM weather_cache WHERE date = ?', args: [prevDay] });
      prevPressureMin = rs.rows[0]?.pressure_min ?? null;
    }
    let pressureDelta = null;
    if (row.pressure_max != null && prevPressureMin != null) {
      pressureDelta = parseFloat((row.pressure_max - Number(prevPressureMin)).toFixed(2));
    }
    await db.execute({
      sql: `INSERT OR REPLACE INTO weather_cache
              (date, temp_max, temp_min, precipitation, pressure_max, pressure_min, pressure_delta, weathercode, fetched_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
      args: [row.date, row.temp_max, row.temp_min, row.precipitation, row.pressure_max, row.pressure_min, pressureDelta, row.weathercode],
    });
  }

  return allRows.length;
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
