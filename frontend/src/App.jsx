import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as d3 from 'd3';

import GlobeView from './components/GlobeView';
import LayerPanel from './components/LayerPanel';
import CountryPanel from './components/CountryPanel';
import TimeSlider from './components/TimeSlider';
import CorrelationPanel from './components/CorrelationPanel';
import RankingsModal from './components/RankingsModal';
import ErrorBoundary from './components/ErrorBoundary';
import {
  IconSearch, IconMoon, IconSun, IconSpark, IconGlobe,
  IconChevron, IconPlus, IconMinus, IconLocate, IconCalendar,
  IconRefresh, IconPause,
} from './components/Icons';

import { STATIC_COUNTRY_DATA, flagFromISO2 } from './data/countries';
import { METRICS } from './data/metrics';
import { usePersistentState, useDebounced } from './lib/utils';
import { getAllMetrics, getMetricStatus, getSeries } from './lib/backend';

// ── Choropleth color ramps (single-hue, tuned for light background) ──────────
const RAMP = {
  gdp: d3.interpolatePurples,           gini: d3.interpolateRdPu,
  unemployment: d3.interpolateReds,     military_exp: d3.interpolateOranges,
  life_expectancy: d3.interpolateGreens,infant_mortality: d3.interpolateReds,
  health_exp: d3.interpolateBuGn,       urban_pop: d3.interpolatePurples,
  happiness: d3.interpolateYlOrBr,      hdi: d3.interpolateBlues,
  co2: d3.interpolateOranges,           forest_cover: d3.interpolateGreens,
  internet: d3.interpolateBlues,        electricity_access: d3.interpolateYlOrBr,
  pop_density: d3.interpolateBuGn,      cpi: d3.interpolatePurples,
};

function buildColorScale(metricKey, values, dark) {
  if (!values || values.length === 0) return () => (dark ? '#23203f' : '#e6e6f0');
  const ramp = RAMP[metricKey] || d3.interpolatePurples;
  const sorted = [...values].sort((a, b) => a - b);
  const quantiles = [0, 0.1, 0.2, 0.35, 0.5, 0.65, 0.8, 0.92, 1].map(
    (p) => sorted[Math.min(sorted.length - 1, Math.floor(p * sorted.length))]
  );
  const n = quantiles.length;
  // Light: low value = pale, high = deep (reads on a light globe).
  // Dark:  low value = mid, high = bright (glows on a dark globe).
  const colors = quantiles.map((_, i) => {
    const t = i / (n - 1);
    return dark ? ramp(0.64 - 0.48 * t) : ramp(0.18 + 0.82 * t);
  });
  const scale = d3.scaleThreshold().domain(quantiles.slice(1, -1)).range(colors);
  scale._thresholds = quantiles;
  scale._colors = colors;
  return scale;
}

export default function App() {
  const [dark,           setDark]           = usePersistentState('drift:dark', false);
  // Start blank — nothing selected until the user picks a category + indicator.
  const [selectedMetric, setSelectedMetric] = useState(null);
  const [categoryFilter, setCategoryFilter] = useState(null);

  // Picking an indicator anywhere also moves the sidebar to its category.
  const chooseMetric = useCallback((key) => {
    setSelectedMetric(key);
    if (METRICS[key]) setCategoryFilter(METRICS[key].cat);
  }, []);
  const [view,           setView]           = useState('map');   // map | analytics | rankings
  const [navOpen,        setNavOpen]        = useState(false);

  const [selected,       setSelected]       = useState(null);
  const [hoverFeature,   setHoverFeature]   = useState(null);
  const [hoverPos,       setHoverPos]       = useState({ x: 0, y: 0 });
  const [spinning,       setSpinning]       = useState(true);
  const [search,         setSearch]         = useState('');
  const [searchOpen,     setSearchOpen]     = useState(false);
  const [searchFocusIdx, setSearchFocusIdx] = useState(0);

  const [allMetrics,     setAllMetrics]     = useState({});
  const [metricsLoading, setMetricsLoading] = useState(true);

  const [series,    setSeries]    = useState(null);
  const [year,      setYear]      = useState(null);
  const [playing,   setPlaying]   = useState(false);
  const [dataEpoch, setDataEpoch] = useState(0);
  const seriesCacheRef = useRef({});

  const [globeSize, setGlobeSize] = useState(440);
  const stageRef    = useRef(null);
  const globeApiRef = useRef(null);

  useEffect(() => { document.body.classList.toggle('dark', !!dark); }, [dark]);

  // Measure the globe stage and size the globe to fit
  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      const r = el.getBoundingClientRect();
      const s = Math.max(260, Math.min(r.width, r.height, 900));
      setGlobeSize(s);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // ── Fetch metrics (poll until backend data is ready, then watch ETL) ──────
  useEffect(() => {
    let cancelled = false, attempt = 0, statusTimer = null;
    const watchEtl = () => {
      let checks = 0;
      statusTimer = setInterval(() => {
        if (cancelled || ++checks > 40) { clearInterval(statusTimer); return; }
        getMetricStatus().then((s) => {
          if (cancelled || s.etl_running) return;
          clearInterval(statusTimer);
          getAllMetrics().then((data) => {
            if (cancelled) return;
            setAllMetrics(data); seriesCacheRef.current = {}; setDataEpoch((e) => e + 1);
          }).catch(() => {});
        }).catch(() => {});
      }, 15000);
    };
    const poll = () => {
      if (cancelled) return;
      getAllMetrics().then((data) => {
        if (cancelled) return;
        const ready = Object.values(data).some((v) => Object.keys(v).length > 10);
        if (ready) { setAllMetrics(data); setMetricsLoading(false); watchEtl(); }
        else { attempt++; setTimeout(poll, Math.min(3000 + attempt * 1000, 10000)); }
      }).catch(() => {
        if (cancelled) return;
        attempt++;
        if (attempt < 20) setTimeout(poll, 4000); else setMetricsLoading(false);
      });
    };
    poll();
    return () => { cancelled = true; if (statusTimer) clearInterval(statusTimer); };
  }, []);

  // ── Historical series for the selected metric ─────────────────────────────
  useEffect(() => {
    let cancelled = false;
    setPlaying(false);
    if (!selectedMetric) { setSeries(null); return; }
    const cached = seriesCacheRef.current[selectedMetric];
    if (cached) { setSeries(cached); return; }
    setSeries(null);
    getSeries(selectedMetric).then((data) => {
      if (cancelled) return;
      seriesCacheRef.current[selectedMetric] = data; setSeries(data);
    }).catch(() => { if (!cancelled) setSeries(null); });
    return () => { cancelled = true; };
  }, [selectedMetric, dataEpoch]);

  const timeline = useMemo(() => {
    if (!series) return null;
    const years = Object.keys(series).map(Number).filter(Number.isFinite).sort((a, b) => a - b);
    if (!years.length) return null;
    const minYear = years[0], maxYear = years[years.length - 1];
    const carried = {}; let running = {};
    for (let y = minYear; y <= maxYear; y++) {
      if (series[y]) running = { ...running, ...series[y] };
      carried[y] = running;
    }
    return { minYear, maxYear, carried, years: years.slice().reverse() };
  }, [series]);

  const displayYear = timeline
    ? Math.min(Math.max(year ?? timeline.maxYear, timeline.minYear), timeline.maxYear)
    : null;
  const isLatestYear = !timeline || displayYear === timeline.maxYear;

  const colorScale = useMemo(() => {
    let vals = null;
    if (series) vals = Object.values(series).flatMap((m) => Object.values(m)).filter(Number.isFinite);
    else if (allMetrics[selectedMetric]) vals = Object.values(allMetrics[selectedMetric]).filter(Number.isFinite);
    if (!vals || !vals.length) return null;
    return buildColorScale(selectedMetric, vals, dark);
  }, [series, allMetrics, selectedMetric, dark]);

  // ── Search ────────────────────────────────────────────────────────────────
  const allCountries = useMemo(
    () => Object.entries(STATIC_COUNTRY_DATA)
      .map(([id, v]) => ({ id, iso2: v[0], name: v[1], capital: v[2], lang: v[3] }))
      .sort((a, b) => a.name.localeCompare(b.name)), []);

  const debouncedSearch = useDebounced(search, 80);
  const matches = useMemo(() => {
    const q = debouncedSearch.trim().toLowerCase();
    if (!q) return [];
    const prefix = [], sub = [];
    for (const c of allCountries) {
      const n = c.name.toLowerCase(), cap = (c.capital || '').toLowerCase();
      if (n.startsWith(q) || cap.startsWith(q)) prefix.push(c);
      else if (n.includes(q) || cap.includes(q)) sub.push(c);
    }
    return [...prefix, ...sub].slice(0, 8);
  }, [debouncedSearch, allCountries]);

  useEffect(() => { setSearchFocusIdx(0); }, [debouncedSearch]);

  const handleSelect = useCallback((feature) => {
    if (!feature) return;
    const centroid = d3.geoCentroid(feature);
    if (centroid && Number.isFinite(centroid[0])) {
      globeApiRef.current?.animateTo([-centroid[0], -centroid[1] - 5, 0], 750);
    }
    setSelected(feature);
    setSpinning(false);
    const iso2 = STATIC_COUNTRY_DATA[feature.id]?.[0];
    if (iso2) {
      const url = new URL(window.location.href);
      url.searchParams.set('country', iso2);
      window.history.replaceState({}, '', url);
    }
  }, []);

  const handleClear = useCallback(() => {
    setSelected(null); setSpinning(true);
    const url = new URL(window.location.href);
    url.searchParams.delete('country');
    window.history.replaceState({}, '', url);
  }, []);

  const handleGlobeReady = useCallback((api) => {
    globeApiRef.current = api;
    const c = new URL(window.location.href).searchParams.get('country');
    if (c) { const f = api.getCountryByISO2(c.toUpperCase()); if (f) handleSelect(f); }
  }, [handleSelect]);

  const selectByIso2 = useCallback((iso2) => {
    const f = globeApiRef.current?.getCountryByISO2(iso2);
    if (f) handleSelect(f);
  }, [handleSelect]);

  const handleSearchPick = useCallback((c) => {
    const f = globeApiRef.current?.getCountryById(c.id);
    if (f) { handleSelect(f); setSearch(''); setSearchOpen(false); }
  }, [handleSelect]);

  const handleSearchKey = (e) => {
    if (!searchOpen || !matches.length) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setSearchFocusIdx((i) => (i + 1) % matches.length); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setSearchFocusIdx((i) => (i - 1 + matches.length) % matches.length); }
    else if (e.key === 'Enter') { e.preventDefault(); handleSearchPick(matches[searchFocusIdx]); }
  };

  useEffect(() => {
    const onKey = (e) => {
      const inInput = ['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName);
      if ((e.key === '/' || (e.key === 'k' && (e.metaKey || e.ctrlKey))) && !inInput) {
        e.preventDefault(); document.getElementById('search-input')?.focus(); setSearchOpen(true);
      } else if (e.key === 'Escape') {
        if (view !== 'map') setView('map');
        else if (searchOpen) { setSearchOpen(false); document.getElementById('search-input')?.blur(); }
        else if (selected) handleClear();
      } else if (e.key === ' ' && !inInput) { e.preventDefault(); setSpinning((s) => !s); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selected, searchOpen, view, handleClear]);

  const currentMetricData = timeline ? timeline.carried[displayYear] : (allMetrics[selectedMetric] || null);
  const m = METRICS[selectedMetric];

  const countryCount = useMemo(() => {
    let max = 0;
    for (const v of Object.values(allMetrics)) max = Math.max(max, Object.keys(v).length);
    return max || 195;
  }, [allMetrics]);

  return (
    <div className={`app ${dark ? 'dark' : ''} ${navOpen ? 'nav-open' : ''} ${selectedMetric ? '' : 'globe-empty'}`}>
      <div className="scrim" onClick={() => setNavOpen(false)} />

      <LayerPanel
        selectedMetric={selectedMetric}
        onMetricChange={(k) => { chooseMetric(k); setNavOpen(false); }}
        view={view}
        onViewChange={(v) => { setView(v); setNavOpen(false); }}
        categoryFilter={categoryFilter}
        onCategoryChange={setCategoryFilter}
      />

      <div className="main-area">
        {/* ── Topbar ─────────────────────────────────────────────── */}
        <header className="topbar">
          <button className="sb-toggle" onClick={() => setNavOpen((o) => !o)} aria-label="Menu">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M4 7h16M4 12h16M4 17h16"/></svg>
          </button>

          <div className="search-wrap">
            <span className="search-icon"><IconSearch /></span>
            <input
              id="search-input" type="text" value={search}
              onChange={(e) => { setSearch(e.target.value); setSearchOpen(true); }}
              onFocus={() => setSearchOpen(true)}
              onBlur={() => setTimeout(() => setSearchOpen(false), 120)}
              onKeyDown={handleSearchKey}
              placeholder="Search a country or capital..."
              className="search-input" spellCheck={false} autoComplete="off"
            />
            <span className="search-kbd">⌘K</span>
            {searchOpen && matches.length > 0 && (
              <div className="search-dropdown">
                {matches.map((c, idx) => (
                  <button key={c.id}
                    className={`search-row ${idx === searchFocusIdx ? 'focused' : ''}`}
                    onMouseDown={() => handleSearchPick(c)}
                    onMouseEnter={() => setSearchFocusIdx(idx)}>
                    <span className="search-flag">{flagFromISO2(c.iso2)}</span>
                    <span className="search-name">{c.name}</span>
                    <span className="search-cap">{c.capital}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="topbar-right">
            <div className="live-pill">
              <span className="live-pill-top"><span className="live-dot" /> {metricsLoading ? 'Loading' : 'Live Data'}</span>
              <span className="live-pill-sub">{metricsLoading ? 'Fetching…' : 'Updated just now'}</span>
            </div>
            <button className="icon-btn" onClick={() => setDark((d) => !d)} title="Toggle theme">
              {dark ? <IconSun /> : <IconMoon />}
            </button>
            <button className="btn-primary" onClick={() => setView('analytics')}>
              <IconSpark /> <span>Compare</span>
            </button>
          </div>
        </header>

        {/* ── Workspace ──────────────────────────────────────────── */}
        <div className="workspace">
          <div className="center-col">
            {/* control bar */}
            <div className="control-bar">
              <label className="ctrl-card">
                <span className="ctrl-icon"><IconGlobe /></span>
                <div className="ctrl-body">
                  <span className="ctrl-label">Active Indicator</span>
                  <div className="ctrl-select-row">
                    <span className={`ctrl-value ${m ? '' : 'placeholder'}`}>{m ? m.label : 'Select an indicator'}</span>
                    <span className="ctrl-chev"><IconChevron /></span>
                  </div>
                  <span className="ctrl-sub">{m ? m.unit : 'none selected yet'}</span>
                </div>
                <select className="ctrl-overlay-select" value={selectedMetric ?? ''}
                  onChange={(e) => chooseMetric(e.target.value)} aria-label="Active indicator">
                  <option value="" disabled>Select an indicator…</option>
                  {Object.entries(METRICS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                </select>
              </label>

              {timeline && (
                <label className="ctrl-card">
                  <span className="ctrl-icon" style={{ background: 'var(--surface-3)', color: 'var(--ink-2)' }}><IconCalendar /></span>
                  <div className="ctrl-body">
                    <span className="ctrl-label">Year</span>
                    <div className="ctrl-select-row">
                      <span className="ctrl-value">{displayYear}</span>
                      <span className="ctrl-chev"><IconChevron /></span>
                    </div>
                    <span className="ctrl-sub">{isLatestYear ? 'Latest available' : 'Historical'}</span>
                  </div>
                  <select className="ctrl-overlay-select" value={displayYear}
                    onChange={(e) => { setPlaying(false); setYear(Number(e.target.value)); }} aria-label="Year">
                    {timeline.years.map((y) => <option key={y} value={y}>{y}</option>)}
                  </select>
                </label>
              )}

              <div className="ctrl-card view">
                <div className="ctrl-body">
                  <span className="ctrl-label">Motion</span>
                  <div className="ctrl-seg">
                    <button className={spinning ? 'on' : ''} onClick={() => setSpinning(true)}>
                      <IconRefresh /> Spin
                    </button>
                    <button className={!spinning ? 'on' : ''} onClick={() => setSpinning(false)}>
                      <IconPause /> Pause
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* globe */}
            <div className="globe-wrap" onClick={() => selected && handleClear()}>
              {hoverFeature && !selected && (
                <div className="hover-tag" style={{ left: hoverPos.x + 14, top: hoverPos.y + 14 }}>
                  {hoverFeature.properties?.name || STATIC_COUNTRY_DATA[hoverFeature.id]?.[1]}
                </div>
              )}

              <Legend metricKey={selectedMetric} colorScale={colorScale} />

              <div className="globe-stage" ref={stageRef}>
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
                  onReady={handleGlobeReady}
                />
              </div>

              <div className="globe-ctrls col" onClick={(e) => e.stopPropagation()}>
                <button className="gc-btn" onClick={() => globeApiRef.current?.zoomBy(1.25)} title="Zoom in"><IconPlus /></button>
                <button className="gc-btn" onClick={() => globeApiRef.current?.zoomBy(0.8)} title="Zoom out"><IconMinus /></button>
                <button className="gc-btn" onClick={() => globeApiRef.current?.reset?.()} title="Reset view"><IconLocate /></button>
              </div>
            </div>

            {/* time slider */}
            {timeline && timeline.maxYear > timeline.minYear && (
              <TimeSlider
                minYear={timeline.minYear} maxYear={timeline.maxYear}
                year={displayYear} onYearChange={setYear}
                playing={playing} onPlayingChange={setPlaying}
              />
            )}

            {/* stats bar */}
            <div className="stats-bar">
              <Stat val={String(countryCount)} k="Countries" sub="Total" />
              <Stat val="16" k="Indicators" sub="Metrics" />
              <Stat val={timeline ? `${timeline.minYear}–${timeline.maxYear}` : '1960–2024'} k="Years" sub={timeline ? `${timeline.maxYear - timeline.minYear} Years` : '64 Years'} />
              <Stat val="~92,000" k="Observations" sub="Data Points" />
              <Stat val="World Bank" k="Data Source" sub="Official API" />
              <Stat val={<><span className="dot" /> {metricsLoading ? 'Syncing' : 'Just now'}</>} k="Last Updated" sub="Live Sync" />
            </div>
          </div>

          {/* country panel */}
          {selected && (
            <ErrorBoundary>
              <CountryPanel
                feature={selected}
                allMetrics={allMetrics}
                selectedMetric={selectedMetric}
                yearData={currentMetricData}
                year={displayYear}
                isLatestYear={isLatestYear}
                onSelectIso2={selectByIso2}
                onMetricChange={chooseMetric}
                onClose={handleClear}
              />
            </ErrorBoundary>
          )}
        </div>
      </div>

      {view === 'analytics' && (
        <ErrorBoundary><CorrelationPanel onClose={() => setView('map')} /></ErrorBoundary>
      )}
      {view === 'rankings' && (
        <ErrorBoundary>
          <RankingsModal metric={selectedMetric} allMetrics={allMetrics}
            onClose={() => setView('map')} onPick={selectByIso2} />
        </ErrorBoundary>
      )}
    </div>
  );
}

function Stat({ val, k, sub }) {
  return (
    <div className="stat-cell">
      <span className="stat-val">{val}</span>
      <span className="stat-key">{k}</span>
      <span className="stat-sub">{sub}</span>
    </div>
  );
}

function Legend({ metricKey, colorScale }) {
  if (!colorScale || !colorScale._thresholds) return null;
  const m = METRICS[metricKey];
  const t = colorScale._thresholds;     // n quantile breakpoints
  const colors = colorScale._colors;     // n colors
  const n = colors.length;
  // build rows from highest bucket to lowest
  const rows = [];
  for (let i = n - 1; i >= 0; i--) {
    let label;
    if (i === n - 1) label = '> ' + m.short_fmt(t[i]);
    else if (i === 0) label = '< ' + m.short_fmt(t[1]);
    else label = m.short_fmt(t[i]) + ' – ' + m.short_fmt(t[i + 1]);
    rows.push({ color: colors[i], label });
  }
  const shown = rows;
  return (
    <div className="legend" onClick={(e) => e.stopPropagation()}>
      <div className="legend-title">{m.label} <span style={{ color: 'var(--ink-3)', fontWeight: 500 }}>({m.unit})</span></div>
      {shown.map((r, i) => (
        <div className="legend-row" key={i}>
          <span className="legend-sw" style={{ background: r.color }} />
          <span className="legend-lbl">{r.label}</span>
        </div>
      ))}
    </div>
  );
}
