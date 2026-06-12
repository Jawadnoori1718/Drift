const BASE = import.meta.env.VITE_API_URL || 'http://localhost:8080/api';

async function get(path) {
  const res = await fetch(`${BASE}${path}`);
  if (!res.ok) throw new Error(`HTTP ${res.status} — ${path}`);
  return res.json();
}

export const getAllMetrics   = () => get('/metrics');
export const getMetricStatus = () => get('/metrics/status');
export const getMetric      = (key) => get(`/metrics/${key}`);
export const getTradeFlows  = (iso2) => get(`/trade/${iso2}`);
