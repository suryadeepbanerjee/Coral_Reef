import { useState, useEffect } from 'react';

// ── Helpers ──────────────────────────────────────────────────

function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') { inQuotes = !inQuotes; }
    else if (ch === ',' && !inQuotes) { result.push(current.trim()); current = ''; }
    else { current += ch; }
  }
  result.push(current.trim());
  return result;
}

function toNum(val) {
  if (val === undefined || val === null) return null;
  const s = String(val).trim().toLowerCase();
  if (s === '' || s === 'nd' || s === 'na' || s === 'nan' || s === 'null') return null;
  const n = parseFloat(s);
  return isNaN(n) ? null : n;
}

function groupBy(arr, key, valueKey) {
  const map = {};
  for (const row of arr) {
    const k = row[key];
    if (k == null) continue;
    if (!map[k]) map[k] = { sum: 0, count: 0 };
    const v = row[valueKey];
    if (v != null) { map[k].sum += v; map[k].count++; }
  }
  return map;
}

function linearRegression(points) {
  const n = points.length;
  if (n < 2) return { slope: 0, intercept: 0 };
  let sx = 0, sy = 0, sxy = 0, sxx = 0;
  for (const p of points) { sx += p.x; sy += p.y; sxy += p.x * p.y; sxx += p.x * p.x; }
  const slope = (n * sxy - sx * sy) / (n * sxx - sx * sx);
  const intercept = (sy - slope * sx) / n;
  return { slope, intercept };
}

// ── Column indices (from CSV header) ─────────────────────────
const COL = {
  lat: 3, lon: 4, ocean: 5, country: 9, site_name: 11,
  turbidity: 14, cyclone: 15, year: 18, depth: 19,
  bleaching: 21, climSST: 22, windspeed: 27,
  ssta: 28, ssta_mean: 30, ssta_freq_max: 35, ssta_dhw: 37,
  tsa_mean: 45, tsa_freq: 46, tsa_dhw: 50,
  label: 58, temp_c: 59,
};

// ── Main hook ─────────────────────────────────────────────────
export function useCSVData() {
  const [state, setState] = useState({
    loading: true,
    error: null,
    yearlyTrend:      [],
    oceanStats:       [],
    countryStats:     [],
    mapPoints:        [],
    recentData:       [],
    worstYear:        null,
    worstOcean:       null,
    totalRecords:     0,
    avgBleaching:     0,
    tempVsBleaching:  [],
    sstaVsBleaching:  [],
    trendLine:        { slope: 0, intercept: 0 },
    sstaTrendLine:    { slope: 0, intercept: 0 },
  });

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const resp = await fetch('/data/final_coral_reef_data.csv');
        if (!resp.ok) throw new Error(`CSV fetch failed: ${resp.status}`);
        const text = await resp.text();
        const lines = text.split('\n');
        const header = parseCSVLine(lines[0]);

        const rows = [];
        for (let i = 1; i < lines.length; i++) {
          const line = lines[i].trim();
          if (!line) continue;
          const cells = parseCSVLine(line);
          if (cells.length < 59) continue;

          const lat       = toNum(cells[COL.lat]);
          const lon       = toNum(cells[COL.lon]);
          const bleaching = toNum(cells[COL.bleaching]);
          const temp      = toNum(cells[COL.temp_c]);
          const ssta      = toNum(cells[COL.ssta]);
          const dhw       = toNum(cells[COL.ssta_dhw]);
          const year      = toNum(cells[COL.year]);
          const depth     = toNum(cells[COL.depth]);
          const ocean     = cells[COL.ocean] || null;
          const country   = cells[COL.country] || null;
          const site      = cells[COL.site_name] || '';

          rows.push({ lat, lon, bleaching, temp, ssta, dhw, year, depth, ocean, country, site });
        }

        if (cancelled) return;

        // ── Valid subsets ──────────────────────
        const withBleach = rows.filter(r => r.bleaching != null && r.year != null);
        const withTemp   = rows.filter(r => r.temp != null && r.bleaching != null);
        const withSSTA   = rows.filter(r => r.ssta != null && r.bleaching != null);
        const mapValid   = rows.filter(r => r.lat != null && r.lon != null && r.bleaching != null);

        // ── Yearly trend ───────────────────────
        const byYear = groupBy(withBleach, 'year', 'bleaching');
        const yearlyTrend = Object.entries(byYear)
          .map(([y, { sum, count }]) => ({ year: parseInt(y), avg_bleaching: parseFloat((sum / count).toFixed(2)), count }))
          .filter(r => r.year >= 1980 && r.year <= 2020)
          .sort((a, b) => a.year - b.year);

        // ── Ocean stats ────────────────────────
        const byOcean = groupBy(withBleach, 'ocean', 'bleaching');
        const oceanStats = Object.entries(byOcean)
          .filter(([o]) => o && o !== 'nd')
          .map(([ocean, { sum, count }]) => ({
            ocean,
            avg_bleaching: parseFloat((sum / count).toFixed(2)),
            count,
          }))
          .sort((a, b) => b.avg_bleaching - a.avg_bleaching);

        // ── Country stats ──────────────────────
        const byCountry = groupBy(withBleach, 'country', 'bleaching');
        const countryStats = Object.entries(byCountry)
          .filter(([c]) => c && c !== 'nd')
          .map(([country, { sum, count }]) => ({
            country,
            avg_bleaching: parseFloat((sum / count).toFixed(2)),
            count,
          }))
          .sort((a, b) => b.avg_bleaching - a.avg_bleaching)
          .slice(0, 15);

        // ── Map points ─────────────────────────
        const mapPoints = mapValid.map(r => ({
          lat:      r.lat,
          lon:      r.lon,
          bleaching:r.bleaching,
          year:     r.year,
          country:  r.country,
          ocean:    r.ocean,
          sst:      r.temp,
          ssta:     r.ssta,
          dhw:      r.dhw,
          site_name:r.site,
          depth:    r.depth,
        }));

        // ── Recent data ────────────────────────
        const recentData = withBleach.filter(r => r.year >= 2015);

        // ── Worst year ─────────────────────────
        const worstYearEntry = [...yearlyTrend].sort((a, b) => b.avg_bleaching - a.avg_bleaching)[0] || null;

        // ── Worst ocean ────────────────────────
        const worstOcean = oceanStats[0] || null;

        // ── Global averages ────────────────────
        const totalRecords = withBleach.length;
        const avgBleaching = parseFloat((withBleach.reduce((s, r) => s + r.bleaching, 0) / totalRecords).toFixed(2));

        // ── Scatter samples (every 10th row, max 2000) ─
        const tempSample = withTemp.filter((_, i) => i % 10 === 0).slice(0, 2000)
          .map(r => ({ x: r.temp, y: r.bleaching }));
        const sstaSample = withSSTA.filter((_, i) => i % 10 === 0).slice(0, 2000)
          .map(r => ({ x: r.ssta, y: r.bleaching }));

        const trendLine    = linearRegression(tempSample);
        const sstaTrendLine = linearRegression(sstaSample);

        // Prepare colored scatter points
        const colorDot = (b) => b > 10 ? '#e74c3c' : b > 0 ? '#f39c12' : '#2ecc71';
        const tempVsBleaching = tempSample.map(p => ({ temp: p.x, bleaching: p.y, fill: colorDot(p.y) }));
        const sstaVsBleaching = sstaSample.map(p => ({ ssta: p.x, bleaching: p.y, fill: colorDot(p.y) }));

        setState({
          loading: false, error: null,
          yearlyTrend, oceanStats, countryStats,
          mapPoints, recentData,
          worstYear:   worstYearEntry,
          worstOcean,
          totalRecords, avgBleaching,
          tempVsBleaching, sstaVsBleaching,
          trendLine, sstaTrendLine,
        });
      } catch (err) {
        if (!cancelled) setState(s => ({ ...s, loading: false, error: err.message }));
      }
    }

    load();
    return () => { cancelled = true; };
  }, []);

  return state;
}
