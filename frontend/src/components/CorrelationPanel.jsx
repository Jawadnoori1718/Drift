import { useEffect, useMemo, useState } from 'react';
import * as d3 from 'd3';
import { getCorrelation } from '../lib/backend';
import { flagFromISO2 } from '../data/countries';

const METRIC_OPTIONS = [
  { key: 'gdp',                label: 'GDP per Capita' },
  { key: 'life_expectancy',    label: 'Life Expectancy' },
  { key: 'happiness',          label: 'Happiness Score' },
  { key: 'hdi',                label: 'Human Dev. Index' },
  { key: 'internet',           label: 'Internet Users' },
  { key: 'co2',                label: 'CO₂ Emissions' },
  { key: 'gini',               label: 'Inequality (Gini)' },
  { key: 'unemployment',       label: 'Unemployment' },
  { key: 'urban_pop',          label: 'Urban Population' },
  { key: 'health_exp',         label: 'Health Expenditure' },
  { key: 'military_exp',       label: 'Military Expenditure' },
  { key: 'infant_mortality',   label: 'Infant Mortality' },
  { key: 'forest_cover',       label: 'Forest Cover' },
  { key: 'electricity_access', label: 'Electricity Access' },
  { key: 'pop_density',        label: 'Population Density' },
  { key: 'cpi',                label: 'Corruption Index' },
];

const W = 600, H = 400;
const M = { top: 16, right: 18, bottom: 38, left: 56 };

/**
 * Correlation explorer: scatter any two metrics across all countries, with
 * an OLS regression line and Pearson's r. GDP-like axes switch to log scale.
 */
export default function CorrelationPanel({ onClose }) {
  const [xMetric, setXMetric] = useState('gdp');
  const [yMetric, setYMetric] = useState('happiness');
  const [data, setData]       = useState(null);
  const [error, setError]     = useState(null);
  const [hover, setHover]     = useState(null);

  useEffect(() => {
    let cancelled = false;
    setData(null);
    setError(null);
    setHover(null);
    if (xMetric === yMetric) { setError('Pick two different metrics'); return; }

    getCorrelation(xMetric, yMetric)
      .then((d) => { if (!cancelled) setData(d); })
      .catch(() => { if (!cancelled) setError('Not enough overlapping data'); });

    return () => { cancelled = true; };
  }, [xMetric, yMetric]);

  const chart = useMemo(() => {
    if (!data?.points?.length) return null;
    const pts = data.points;

    const xVals = pts.map((p) => p.x);
    const yVals = pts.map((p) => p.y);

    // Log scale for heavily skewed positive axes (GDP, density)
    const useLogX = shouldLog(xVals);
    const useLogY = shouldLog(yVals);

    const x = (useLogX ? d3.scaleLog() : d3.scaleLinear())
      .domain(pad(d3.extent(xVals), useLogX))
      .range([M.left, W - M.right]);
    const y = (useLogY ? d3.scaleLog() : d3.scaleLinear())
      .domain(pad(d3.extent(yVals), useLogY))
      .range([H - M.bottom, M.top]);

    // OLS line endpoints (computed on raw values by the backend)
    const [x0, x1] = d3.extent(xVals);
    const linePts = [
      { x: x0, y: data.intercept + data.slope * x0 },
      { x: x1, y: data.intercept + data.slope * x1 },
    ];

    return {
      x, y, useLogX, useLogY,
      xTicks: x.ticks(6), yTicks: y.ticks(6),
      linePts,
      points: pts,
    };
  }, [data]);

  return (
    <div className="corr-overlay" onClick={onClose}>
      <div className="corr-panel" onClick={(e) => e.stopPropagation()}>
        <button className="cp-close" onClick={onClose} aria-label="Close">✕</button>

        <div className="corr-title">Correlation Explorer</div>
        <div className="corr-sub">Each dot is a country · latest values</div>

        <div className="corr-controls">
          <select className="corr-select" value={xMetric} onChange={(e) => setXMetric(e.target.value)}>
            {METRIC_OPTIONS.map((m) => <option key={m.key} value={m.key}>{m.label}</option>)}
          </select>
          <span className="corr-vs">vs</span>
          <select className="corr-select" value={yMetric} onChange={(e) => setYMetric(e.target.value)}>
            {METRIC_OPTIONS.map((m) => <option key={m.key} value={m.key}>{m.label}</option>)}
          </select>
        </div>

        {error && <div className="corr-error">{error}</div>}
        {!error && !chart && <div className="corr-loading">Loading…</div>}

        {chart && (
          <>
            <div className="corr-stats">
              <span><b>{data.n}</b> countries</span>
              <span>Pearson r <b>{data.pearson_r.toFixed(2)}</b></span>
              <span>r² <b>{data.r2.toFixed(2)}</b></span>
              <span className="corr-strength">{describeStrength(data.pearson_r)}</span>
            </div>

            <svg viewBox={`0 0 ${W} ${H}`} className="corr-svg">
              {/* Grid */}
              {chart.yTicks.map((t) => (
                <g key={`y${t}`}>
                  <line className="hc-grid" x1={M.left} x2={W - M.right} y1={chart.y(t)} y2={chart.y(t)} />
                  <text className="hc-tick-y" x={M.left - 6} y={chart.y(t) + 3}>{fmtTick(t)}</text>
                </g>
              ))}
              {chart.xTicks.map((t) => (
                <text key={`x${t}`} className="hc-tick-x" x={chart.x(t)} y={H - 18}>{fmtTick(t)}</text>
              ))}

              {/* Axis labels */}
              <text className="corr-axis-label" x={(M.left + W - M.right) / 2} y={H - 3}>
                {labelOf(xMetric)}{chart.useLogX ? ' (log)' : ''}
              </text>
              <text
                className="corr-axis-label"
                transform={`translate(11 ${(M.top + H - M.bottom) / 2}) rotate(-90)`}
              >
                {labelOf(yMetric)}{chart.useLogY ? ' (log)' : ''}
              </text>

              {/* OLS regression line (clipped to plot area) */}
              <line
                className="corr-ols"
                x1={chart.x(chart.linePts[0].x)} y1={clampY(chart.y(chart.linePts[0].y))}
                x2={chart.x(chart.linePts[1].x)} y2={clampY(chart.y(chart.linePts[1].y))}
              />

              {/* Scatter */}
              {chart.points.map((p) => (
                <circle
                  key={p.iso2}
                  className={`corr-dot ${hover?.iso2 === p.iso2 ? 'hot' : ''}`}
                  cx={chart.x(p.x)}
                  cy={chart.y(p.y)}
                  r={hover?.iso2 === p.iso2 ? 5 : 3}
                  onMouseEnter={() => setHover(p)}
                  onMouseLeave={() => setHover(null)}
                />
              ))}
            </svg>

            <div className="corr-hover-info">
              {hover
                ? <>{flagFromISO2(hover.iso2)} <b>{hover.name}</b> — {labelOf(xMetric)}: {fmtTick(hover.x)} · {labelOf(yMetric)}: {fmtTick(hover.y)}</>
                : 'Hover a dot to identify the country'}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function shouldLog(vals) {
  const pos = vals.filter((v) => v > 0);
  if (pos.length !== vals.length) return false;
  return d3.max(pos) / d3.min(pos) > 50;
}

function pad([lo, hi], log) {
  if (log) return [lo * 0.8, hi * 1.2];
  const span = hi - lo || 1;
  return [lo - span * 0.05, hi + span * 0.05];
}

function clampY(v) {
  return Math.max(M.top, Math.min(H - M.bottom, v));
}

function labelOf(key) {
  return METRIC_OPTIONS.find((m) => m.key === key)?.label || key;
}

function fmtTick(v) {
  if (Math.abs(v) >= 1e6) return (v / 1e6).toFixed(0) + 'M';
  if (Math.abs(v) >= 1e4) return (v / 1e3).toFixed(0) + 'k';
  if (Math.abs(v) >= 100) return Math.round(v).toString();
  if (Math.abs(v) >= 1)   return (+v.toFixed(1)).toString();
  return (+v.toFixed(2)).toString();
}

function describeStrength(r) {
  const a = Math.abs(r);
  const dir = r >= 0 ? 'positive' : 'negative';
  if (a >= 0.7) return `strong ${dir} correlation`;
  if (a >= 0.4) return `moderate ${dir} correlation`;
  if (a >= 0.2) return `weak ${dir} correlation`;
  return 'little to no correlation';
}
