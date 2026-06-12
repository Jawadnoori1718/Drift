/**
 * Format an integer with thousands separators (en-GB).
 */
export function formatNumber(n) {
  if (n == null || !Number.isFinite(n)) return '—';
  return n.toLocaleString('en-GB');
}

/**
 * Format an area in km² with a sensible level of precision.
 */
export function formatArea(km2) {
  if (km2 == null || !Number.isFinite(km2)) return '—';
  return `${formatNumber(Math.round(km2))} km²`;
}

/**
 * Convert a population number into a compact human-readable form
 * (e.g. 1.4B, 67.8M, 542K).
 */
export function formatPopulationCompact(n) {
  if (n == null || !Number.isFinite(n)) return '—';
  if (n >= 1e9) return `${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)}K`;
  return String(n);
}

/**
 * Tiny localStorage-backed state hook. Survives reloads, gracefully no-ops
 * in private mode or when storage is unavailable.
 */
import { useEffect, useState } from 'react';

export function usePersistentState(key, initial) {
  const [value, setValue] = useState(() => {
    try {
      const raw = localStorage.getItem(key);
      if (raw == null) return initial;
      return JSON.parse(raw);
    } catch {
      return initial;
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      /* storage may be disabled — fail silently */
    }
  }, [key, value]);
  return [value, setValue];
}

/**
 * Debounce a value: only update the returned reference after `delay` ms of
 * no changes. Useful for search inputs where we don't want to thrash on
 * every keystroke.
 */
export function useDebounced(value, delay = 200) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}
