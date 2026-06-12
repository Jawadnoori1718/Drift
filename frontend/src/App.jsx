import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as d3 from 'd3';

import GlobeView from './components/GlobeView';
import LayerPanel from './components/LayerPanel';
import CountryPanel from './components/CountryPanel';
import ErrorBoundary from './components/ErrorBoundary';

import { STATIC_COUNTRY_DATA, flagFromISO2 } from './data/countries';
import { usePersistentState, useDebounced } from './lib/utils';
import { getAllMetrics, getMetricStatus, getTradeFlows } from './lib/backend';

// ── Metric configuration ─────────────────────────────────────────────────────
const METRIC_CONFIG = {
  // Economy
  gdp:              { color: d3.interpolateGnBu,                        log: true  },
  gini:             { color: (t) => d3.interpolateRdYlGn(1 - t),        log: false },
  unemployment:     { color: (t) => d3.interpolateOrRd(t),              log: false },
  military_exp:     { color: (t) => d3.interpolateReds(t),              log: false },
  // Society
  life_expectancy:  { color: d3.interpolateYlGn,                        log: false },
  infant_mortality: { color: (t) => d3.interpolateOrRd(t),              log: false },
  health_exp:       { color: d3.interpolatePuBuGn,                      log: false },
  urban_pop:        { color: d3.interpolatePurples,                     log: false },
  happiness:        { color: d3.interpolateYlGn,                        log: false },
  hdi:              { color: d3.interpolateBlues,                       log: false },
  // Environment
  co2:              { color: d3.interpolateOrRd,                        log: false },
  forest_cover:     { color: d3.interpolateGreens,                      log: false },
  // Connectivity
  internet:         { color: d3.interpolatePuBu,                        log: false },
  electricity_access:{ color: d3.interpolateYlOrBr,                    log: false },
  pop_density:      { color: d3.interpolateYlOrBr,                      log: true  },
  cpi:              { color: d3.interpolatePurples,                     log: false },
};

// Build quantile color scale from values array
function buildColorScale(metricKey, values) {
  if (!values || values.length === 0) return () => '#2c3e50';
  const cfg = METRIC_CONFIG[metricKey];
  if (!cfg) return () => '#2c3e50';
  const sorted = [...values].sort((a, b) => a - b);
  const quantiles = [0, 0.1, 0.2, 0.35, 0.5, 0.65, 0.8, 0.92, 1].map(
    (p) => sorted[Math.min(sorted.length - 1, Math.floor(p * sorted.length))]
  );
  const colors = d3.quantize(cfg.color, quantiles.length);
  return d3.scaleThreshold().domain(quantiles.slice(1, -1)).range(colors);
}

// Approximate country centroids for trade arc endpoints (supplement TopoJSON)
const CAPITAL_COORDS = {
  US:[-77.04,38.91], CN:[116.41,39.90], DE:[13.41,52.52], JP:[139.65,35.68],
  GB:[-0.13,51.51],  FR:[2.35,48.86],   KR:[126.98,37.57],IN:[77.21,28.61],
  CA:[-75.70,45.42], AU:[149.13,-35.28],BR:[-47.93,-15.78],RU:[37.62,55.76],
  MX:[-99.13,19.43], SA:[46.68,24.71],  AE:[54.38,24.45], TR:[32.86,39.93],
  NL:[4.90,52.37],   IT:[12.50,41.90],  ES:[-3.70,40.42], CH:[7.45,46.95],
  SG:[103.82,1.35],  ZA:[28.19,-25.75], NG:[7.40,9.08],   EG:[31.24,30.04],
  AR:[-58.38,-34.60],ID:[106.85,-6.21], MY:[101.69,3.15], TH:[100.50,13.76],
  VN:[105.83,21.03], PH:[120.98,14.60], PK:[73.05,33.68], CL:[-70.67,-33.45],
  CO:[-74.07,4.71],  QA:[51.53,25.29],  IQ:[44.37,33.32], UA:[30.52,50.45],
  KZ:[71.45,51.18],  GH:[-0.19,5.56],   MA:[-6.85,33.99], NZ:[174.78,-41.29],
  BE:[4.35,50.85],   AT:[16.37,48.21],  DK:[12.57,55.68], FI:[24.94,60.17],
  PT:[-9.14,38.72],  GR:[23.73,37.98],  IE:[-6.26,53.35], PL:[21.01,52.23],
  SE:[18.07,59.33],  NO:[10.75,59.91],  IL:[35.21,31.77], BG:[23.32,42.70],
  RO:[26.10,44.43],  HU:[19.04,47.50],  CZ:[14.44,50.08], SK:[17.11,48.15],
  TW:[121.53,25.03], HK:[114.17,22.32], BD:[90.41,23.72], PY:[-57.66,-25.29],
  VE:[-66.90,10.48], PE:[-77.04,-12.05],EC:[-78.52,-0.23], BO:[-68.13,-16.50],
  UZ:[69.24,41.30],  BY:[27.57,53.91],  LV:[24.11,56.95], LT:[25.28,54.69],
  EE:[24.73,59.44],
};

export default function App() {
  // ── Persistent preferences ──────────────────────────────────────────────
  const [dark,            setDark]           = usePersistentState('drift:dark', false);
  const [selectedMetric,  setSelectedMetric] = usePersistentState('drift:metric', 'gdp');
  const [showTradeArcs,   setShowTradeArcs]  = usePersistentState('drift:trade', true);

  // ── Globe interaction state ─────────────────────────────────────────────
  const [selected,        setSelected]       = useState(null);   // GeoJSON feature
  const [hoverFeature,    setHoverFeature]   = useState(null);
  const [hoverPos,        setHoverPos]       = useState({ x: 0, y: 0 });
  const [spinning,        setSpinning]       = useState(true);
  const [search,          setSearch]         = useState('');
  const [searchOpen,      setSearchOpen]     = useState(false);
  const [searchFocusIdx,  setSearchFocusIdx] = useState(0);

  // ── Data state ──────────────────────────────────────────────────────────
  const [allMetrics,    setAllMetrics]    = useState({});   // { gdp:{US:76000,...}, co2:{...}, ... }
  const [tradeFlows,    setTradeFlows]    = useState([]);   // for selected country
  const [metricsLoading,setMetricsLoading]= useState(true);
  const [tradeLoading,  setTradeLoading]  = useState(false);

  // ── Computed trade arcs ─────────────────────────────────────────────────
  const [tradeArcs, setTradeArcs] = useState(null);  // { src, flows }

  const [winW, setWinW] = useState(() => (typeof window !== 'undefined' ? window.innerWidth  : 1280));
  const [winH, setWinH] = useState(() => (typeof window !== 'undefined' ? window.innerHeight : 900));

  const globeApiRef = useRef(null);

  // ── Apply dark class to body ────────────────────────────────────────────
  useEffect(() => {
    document.body.classList.toggle('dark', !!dark);
  }, [dark]);

  // ── Responsive sizing ──────────────────────────────────────────────────
  useEffect(() => {
    let t;
    const onResize = () => {
      clearTimeout(t);
      t = setTimeout(() => {
        setWinW(window.innerWidth);
        setWinH(window.innerHeight);
      }, 150);
    };
    window.addEventListener('resize', onResize);
    return () => { window.removeEventListener('resize', onResize); clearTimeout(t); };
  }, []);

  // Globe size: fill the space between the layer panel and any country panel.
  const PANEL_W = winW >= 900 ? 220 : 0;
  const DETAIL_W = selected && winW >= 700 ? 360 : 0;
  const availW = winW - PANEL_W - DETAIL_W - 48;
  const availH = winH - 60 - 40;   // topbar + footer
  const globeSize = Math.max(280, Math.min(availW, availH, 750));

  // ── Fetch metrics, polling until the backend has loaded World Bank data ──
  useEffect(() => {
    let cancelled = false;
    let attempt   = 0;

    const poll = () => {
      if (cancelled) return;
      getAllMetrics()
        .then((data) => {
          if (cancelled) return;
          const ready = Object.values(data).some((v) => Object.keys(v).length > 10);
          if (ready) {
            setAllMetrics(data);
            setMetricsLoading(false);
          } else {
            // Backend started but World Bank fetch not done yet — retry
            attempt++;
            const delay = Math.min(3000 + attempt * 1000, 10000);
            setTimeout(poll, delay);
          }
        })
        .catch(() => {
          if (cancelled) return;
          attempt++;
          if (attempt < 20) setTimeout(poll, 4000);
          else setMetricsLoading(false);
        });
    };

    poll();
    return () => { cancelled = true; };
  }, []);

  // ── Color scale for current metric ───────────────────────────────────
  const colorScale = useMemo(() => {
    const data = allMetrics[selectedMetric];
    if (!data) return null;
    const vals = Object.values(data).filter(Number.isFinite);
    return buildColorScale(selectedMetric, vals);
  }, [allMetrics, selectedMetric]);

  // ── Country search ────────────────────────────────────────────────────
  const allCountries = useMemo(
    () =>
      Object.entries(STATIC_COUNTRY_DATA)
        .map(([id, v]) => ({ id, iso2: v[0], name: v[1], capital: v[2], lang: v[3] }))
        .sort((a, b) => a.name.localeCompare(b.name)),
    []
  );

  const debouncedSearch = useDebounced(search, 80);
  const matches = useMemo(() => {
    const q = debouncedSearch.trim().toLowerCase();
    if (!q) return [];
    const prefix = [], sub = [];
    for (const c of allCountries) {
      const n   = c.name.toLowerCase();
      const cap = (c.capital || '').toLowerCase();
      if (n.startsWith(q) || cap.startsWith(q)) prefix.push(c);
      else if (n.includes(q) || cap.includes(q)) sub.push(c);
    }
    return [...prefix, ...sub].slice(0, 8);
  }, [debouncedSearch, allCountries]);

  useEffect(() => { setSearchFocusIdx(0); }, [debouncedSearch]);

  // ── Select a country ─────────────────────────────────────────────────
  const handleSelect = useCallback((feature, opts = {}) => {
    if (!feature) return;

    const centroid = d3.geoCentroid(feature);
    if (centroid && Number.isFinite(centroid[0])) {
      globeApiRef.current?.animateTo([-centroid[0], -centroid[1] - 5, 0], 750);
    }

    setSelected(feature);
    setSpinning(false);

    // Fetch trade flows for this country
    const meta = STATIC_COUNTRY_DATA[feature.id];
    const iso2 = meta?.[0];
    if (iso2) {
      setTradeLoading(true);
      setTradeFlows([]);
      setTradeArcs(null);

      getTradeFlows(iso2)
        .then((flows) => {
          setTradeFlows(flows);

          // Resolve partner coords → build trade arc data
          if (flows && flows.length > 0 && centroid) {
            const resolvedFlows = flows.map((tf) => {
              // Try capital coords lookup first, then TopoJSON centroid
              let coords = CAPITAL_COORDS[tf.iso2] || null;
              if (!coords && globeApiRef.current) {
                coords = globeApiRef.current.getCentroidByISO2(tf.iso2);
              }
              return {
                iso2: tf.iso2,
                name: tf.name,
                coords,
                value: (tf.export || 0) + (tf.imports || 0),
              };
            }).filter((f) => f.coords);

            setTradeArcs({ src: centroid, flows: resolvedFlows });
          }
          setTradeLoading(false);
        })
        .catch(() => {
          setTradeLoading(false);
        });
    }

    // Update URL deep-link
    if (iso2) {
      const url = new URL(window.location.href);
      url.searchParams.set('country', iso2);
      window.history.replaceState({}, '', url);
    }
  }, []);

  const handleClear = useCallback(() => {
    setSelected(null);
    setTradeFlows([]);
    setTradeArcs(null);
    setSpinning(true);
    const url = new URL(window.location.href);
    url.searchParams.delete('country');
    window.history.replaceState({}, '', url);
  }, []);

  const handleGlobeReady = useCallback((api) => {
    globeApiRef.current = api;
    // Deep-link on load
    const c = new URL(window.location.href).searchParams.get('country');
    if (c) {
      const f = api.getCountryByISO2(c.toUpperCase());
      if (f) handleSelect(f, { skipArc: true });
    }
  }, [handleSelect]);

  const handleSearchPick = useCallback((c) => {
    const f = globeApiRef.current?.getCountryById(c.id);
    if (f) { handleSelect(f); setSearch(''); setSearchOpen(false); }
  }, [handleSelect]);

  const handleSearchKey = (e) => {
    if (!searchOpen || !matches.length) return;
    if      (e.key === 'ArrowDown')  { e.preventDefault(); setSearchFocusIdx((i) => (i+1) % matches.length); }
    else if (e.key === 'ArrowUp')    { e.preventDefault(); setSearchFocusIdx((i) => (i-1+matches.length) % matches.length); }
    else if (e.key === 'Enter')      { e.preventDefault(); handleSearchPick(matches[searchFocusIdx]); }
  };

  // ── Global keyboard shortcuts ─────────────────────────────────────────
  useEffect(() => {
    const onKey = (e) => {
      const inInput = ['INPUT','TEXTAREA'].includes(document.activeElement?.tagName);
      if      (e.key === '/' && !inInput)  { e.preventDefault(); document.getElementById('search-input')?.focus(); setSearchOpen(true); }
      else if (e.key === 'Escape')          { if (searchOpen) { setSearchOpen(false); document.getElementById('search-input')?.blur(); } else if (selected) { handleClear(); } }
      else if (e.key === ' ' && !inInput)  { e.preventDefault(); setSpinning((s) => !s); }
      else if ((e.key === 'd' || e.key === 'D') && !inInput) { setDark((v) => !v); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selected, searchOpen, handleClear, setDark]);

  const currentMetricData = allMetrics[selectedMetric] || null;

  return (
    <div className={`app ${dark ? 'dark' : ''}`}>
      {/* ── Top bar ───────────────────────────────────────────────────── */}
      <header className="topbar">
        <div className="search-wrap">
          <input
            id="search-input"
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setSearchOpen(true); }}
            onFocus={() => setSearchOpen(true)}
            onBlur={() => setTimeout(() => setSearchOpen(false), 120)}
            onKeyDown={handleSearchKey}
            placeholder="Search country or capital…"
            className="search-input"
            spellCheck={false}
            autoComplete="off"
          />
          {searchOpen && matches.length > 0 && (
            <div className="search-dropdown">
              {matches.map((c, idx) => (
                <button
                  key={c.id}
                  className={`search-row ${idx === searchFocusIdx ? 'focused' : ''}`}
                  onMouseDown={() => handleSearchPick(c)}
                  onMouseEnter={() => setSearchFocusIdx(idx)}
                >
                  <span className="search-flag">{flagFromISO2(c.iso2)}</span>
                  <span className="search-name">{c.name}</span>
                  <span className="search-cap">{c.capital}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="topbar-tools">
          <button
            className={`tool ${spinning ? 'active' : ''}`}
            onClick={() => setSpinning((s) => !s)}
            title="Toggle spin (Space)"
          >
            {spinning ? '❚❚ Pause' : '▶ Spin'}
          </button>
          {metricsLoading && (
            <div className="topbar-loading">
              <span className="loading-dot" />
              Loading data…
            </div>
          )}
        </div>
      </header>

      {/* ── Body layout: panel + globe + detail ──────────────────────── */}
      <div className="body-layout">
        <ErrorBoundary>
          <LayerPanel
            selectedMetric={selectedMetric}
            onMetricChange={setSelectedMetric}
            showTradeArcs={showTradeArcs}
            onTradeArcsChange={setShowTradeArcs}
            colorScale={colorScale}
            metricData={allMetrics}
            dark={dark}
            onDarkChange={setDark}
            loading={metricsLoading}
          />
        </ErrorBoundary>

        <main className="globe-main" onClick={() => selected && handleClear()}>
          {/* Hover tooltip */}
          {hoverFeature && !selected && (
            <div
              className="hover-tag"
              style={{ left: hoverPos.x + 14, top: hoverPos.y + 14 }}
            >
              {hoverFeature.properties?.name || STATIC_COUNTRY_DATA[hoverFeature.id]?.[1]}
            </div>
          )}

          <div className="globe-hint">
            Click any country · Drag to rotate · Scroll to zoom
          </div>

          <div className="globe-stage">
            <GlobeView
              size={globeSize}
              selected={selected?.id}
              onSelect={handleSelect}
              onHover={(f, x, y) => { setHoverFeature(f); if (f) setHoverPos({ x, y }); }}
              spinning={spinning}
              spinSpeed="normal"
              onUserInteract={() => setSpinning(false)}
              whirl={true}
              graticule={true}
              dark={dark}
              metricData={currentMetricData}
              colorScale={colorScale}
              tradeArcs={tradeArcs}
              showTradeArcs={showTradeArcs}
              onReady={handleGlobeReady}
            />
          </div>
        </main>

        {/* ── Country detail panel ────────────────────────────────────── */}
        {selected && (
          <ErrorBoundary>
            <CountryPanel
              feature={selected}
              allMetrics={allMetrics}
              selectedMetric={selectedMetric}
              onClose={handleClear}
            />
          </ErrorBoundary>
        )}
      </div>

      <footer className="footer">
        <span>Drift · Global Analytics</span>
        <span>World Bank · WTO · 2022</span>
      </footer>
    </div>
  );
}
