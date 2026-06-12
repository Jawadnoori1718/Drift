/**
 * Thin REST Countries (https://restcountries.com) client with:
 *  - in-memory caching to avoid repeat fetches
 *  - localStorage persistence so a returning visitor sees data instantly
 *  - timeout + AbortController so a slow network never hangs the UI
 */

const MEM_CACHE = new Map();
const STORAGE_KEY = 'atlas:rc-cache';
const STORAGE_VERSION = 1;
const TIMEOUT_MS = 6000;

// Hydrate memory cache from localStorage on module load.
try {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw) {
    const parsed = JSON.parse(raw);
    if (parsed && parsed.v === STORAGE_VERSION && parsed.entries) {
      for (const [k, v] of Object.entries(parsed.entries)) MEM_CACHE.set(k, v);
    }
  }
} catch {
  /* corrupt or unavailable; ignore */
}

function persist() {
  try {
    const entries = Object.fromEntries(MEM_CACHE);
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ v: STORAGE_VERSION, entries }));
  } catch {
    /* storage may be disabled */
  }
}

async function fetchWithTimeout(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Look up rich country data by ISO alpha-2 code (e.g. "GB", "JP").
 * Returns the first match or null on failure.
 */
export async function fetchCountryByISO2(iso2) {
  if (!iso2) return null;
  const key = `iso2:${iso2.toUpperCase()}`;
  if (MEM_CACHE.has(key)) return MEM_CACHE.get(key);

  const fields = [
    'name',
    'cca2',
    'cca3',
    'capital',
    'region',
    'subregion',
    'population',
    'area',
    'languages',
    'currencies',
    'borders',
    'timezones',
    'tld',
    'flag',
    'idd',
    'continents',
    'maps',
    'demonyms',
    'unMember',
    'independent',
    'startOfWeek',
    'fifa',
  ].join(',');

  try {
    const data = await fetchWithTimeout(
      `https://restcountries.com/v3.1/alpha/${encodeURIComponent(iso2)}?fields=${fields}`
    );
    const arr = Array.isArray(data) ? data : [data];
    const result = arr[0] || null;
    MEM_CACHE.set(key, result);
    persist();
    return result;
  } catch (err) {
    console.warn('REST Countries lookup failed:', err.message);
    return null;
  }
}

/**
 * Look up a country by its alpha-3 code (used for borders, which the
 * TopoJSON data exposes only as alpha-3).
 */
export async function fetchCountryByISO3(iso3) {
  if (!iso3) return null;
  const key = `iso3:${iso3.toUpperCase()}`;
  if (MEM_CACHE.has(key)) return MEM_CACHE.get(key);
  try {
    const data = await fetchWithTimeout(
      `https://restcountries.com/v3.1/alpha/${encodeURIComponent(iso3)}?fields=cca2,cca3,name,flag`
    );
    const arr = Array.isArray(data) ? data : [data];
    const result = arr[0] || null;
    MEM_CACHE.set(key, result);
    persist();
    return result;
  } catch {
    return null;
  }
}
