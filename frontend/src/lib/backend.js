const BASE = import.meta.env.VITE_API_URL || 'http://localhost:8080/api';

async function get(path) {
  const res = await fetch(`${BASE}${path}`);
  if (!res.ok) throw new Error(`HTTP ${res.status} — ${path}`);
  return res.json();
}

export const getAllMetrics   = () => get('/metrics');
export const getMetricStatus = () => get('/metrics/status');
export const getMetric       = (key) => get(`/metrics/${key}`);
export const getSeries       = (key) => get(`/metrics/${key}/series`);
export const getMeta         = () => get('/meta');
export const getHistory      = (iso2, key) => get(`/countries/${iso2}/history/${key}`);
export const getForecast     = (iso2, key) => get(`/forecast/${iso2}/${key}`);
export const getSimilar      = (iso2) => get(`/similar/${iso2}`);
export const getCorrelation  = (x, y) => get(`/correlate/${x}/${y}`);
