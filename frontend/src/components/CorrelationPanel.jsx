import { useEffect, useMemo, useState } from 'react';
import * as d3 from 'd3';
import { getCorrelation } from '../lib/backend';
import { flagFromISO2 } from '../data/countries';
import { METRICS, METRIC_ORDER } from '../data/metrics';
import { IconClose, IconSpark, IconArrowRight } from './Icons';

const PRESETS = [
  { q: 'Does wealth bring happiness?',        x: 'gdp',        y: 'happiness' },
  { q: 'Does money mean a longer life?',      x: 'gdp',        y: 'life_expectancy' },
  { q: 'Does the internet fight corruption?', x: 'internet',   y: 'cpi' },
  { q: 'Do richer countries pollute more?',   x: 'gdp',        y: 'co2' },
  { q: 'Does inequality lower happiness?',     x: 'gini',       y: 'happiness' },
  { q: 'Does health spending extend life?',    x: 'health_exp', y: 'life_expectancy' },
];

const W = 780, H = 300;
const M = { top: 16, right: 22, bottom: 42, left: 60 };

export default function CorrelationPanel({ onClose }) {
  const [xMetric, setXMetric] = useState('gdp');
  const [yMetric, setYMetric] = useState('happiness');
  const [data, setData]   = useState(null);
  const [error, setError] = useState(null);
  const [hover, setHover] = useState(null);
  const [pinned, setPinned] = useState(null);   // clicked country → insight card

  useEffect(() => {
    let cancelled = false;
    setData(null); setError(null); setHover(null); setPinned(null);
    if (xMetric === yMetric) { setError('Pick two different indicators to compare.'); return; }
    getCorrelation(xMetric, yMetric)
      .then((d) => { if (!cancelled) setData(d); })
      .catch(() => { if (!cancelled) setError('Not enough overlapping data for these two.'); });
    return () => { cancelled = true; };
  }, [xMetric, yMetric]);

  const surprise = () => {
    let a = METRIC_ORDER[Math.floor(Math.random() * METRIC_ORDER.length)];
    let b = METRIC_ORDER[Math.floor(Math.random() * METRIC_ORDER.length)];
    while (b === a) b = METRIC_ORDER[Math.floor(Math.random() * METRIC_ORDER.length)];
    setXMetric(a); setYMetric(b);
  };

  const xLabel = METRICS[xMetric].label, yLabel = METRICS[yMetric].label;
  const fmtX = METRICS[xMetric].fmt, fmtY = METRICS[yMetric].fmt;
  const story = data ? describe(data.pearson_r, xLabel, yLabel) : null;

  const chart = useMemo(() => {
    if (!data?.points?.length) return null;
    const { slope, intercept } = data;
    // attach each country's residual (actual − model-predicted)
    const pts = data.points.map((p) => ({ ...p, pred: intercept + slope * p.x, resid: p.y - (intercept + slope * p.x) }));

    const xVals = pts.map((p) => p.x), yVals = pts.map((p) => p.y);
    const useLogX = shouldLog(xVals), useLogY = shouldLog(yVals);
    const x = (useLogX ? d3.scaleLog() : d3.scaleLinear()).domain(pad(d3.extent(xVals), useLogX)).range([M.left, W - M.right]);
    const y = (useLogY ? d3.scaleLog() : d3.scaleLinear()).domain(pad(d3.extent(yVals), useLogY)).range([H - M.bottom, M.top]);

    const [x0, x1] = d3.extent(xVals);
    const linePts = [{ x: x0, y: intercept + slope * x0 }, { x: x1, y: intercept + slope * x1 }];

    // anomaly detection: the countries furthest from the trend line
    const ranked = [...pts].sort((a, b) => Math.abs(b.resid) - Math.abs(a.resid));
    const outliers = ranked.slice(0, 4);
    const outlierSet = new Set(outliers.map((o) => o.iso2));

    return { x, y, useLogX, useLogY, xTicks: niceTicks(x, useLogX), yTicks: niceTicks(y, useLogY),
      linePts, points: pts, outliers, outlierSet };
  }, [data]);

  // auto AI insight: the single most surprising country
  const autoInsight = useMemo(() => {
    if (!chart) return null;
    const o = chart.outliers[0];
    if (!o) return null;
    const dir = o.resid > 0 ? 'higher' : 'lower';
    return { iso2: o.iso2, name: o.name,
      text: `${o.name} has far ${dir} ${yLabel} than its ${xLabel} predicts.` };
  }, [chart, xLabel, yLabel]);

  const insight = pinned && chart ? modelInsight(pinned, fmtY) : null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal corr-modal" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose} aria-label="Close"><IconClose /></button>

        <div className="modal-title">Compare</div>
        <div className="modal-sub">See how any two things about countries relate — our model finds the pattern, the exceptions, and predicts each country.</div>

        <div className="corr-presets">
          {PRESETS.map((p) => {
            const on = p.x === xMetric && p.y === yMetric;
            return (
              <button key={p.q} className={`corr-chip ${on ? 'on' : ''}`}
                onClick={() => { setXMetric(p.x); setYMetric(p.y); }}>{p.q}</button>
            );
          })}
        </div>

        <div className="corr-controls">
          <select className="corr-select" value={xMetric} onChange={(e) => setXMetric(e.target.value)}>
            {METRIC_ORDER.map((k) => <option key={k} value={k}>{METRICS[k].label}</option>)}
          </select>
          <span className="corr-vs">compared with</span>
          <select className="corr-select" value={yMetric} onChange={(e) => setYMetric(e.target.value)}>
            {METRIC_ORDER.map((k) => <option key={k} value={k}>{METRICS[k].label}</option>)}
          </select>
          <button className="corr-surprise" onClick={surprise} title="Pick a random pair"><IconSpark /> Surprise me</button>
        </div>

        {error && <div className="corr-error">{error}</div>}
        {!error && !chart && <div className="corr-loading">Crunching the numbers…</div>}

        {chart && story && (
          <>
            <div className={`corr-verdict ${story.tone}`}>
              <div className="corr-verdict-head">
                <span className="corr-verdict-badge">{story.strength}</span>
                <span className="corr-verdict-pct">{story.pct}% match</span>
              </div>
              <div className="corr-meter"><span className="corr-meter-fill" style={{ width: `${story.pct}%` }} /></div>
              <p className="corr-verdict-text">{story.sentence}</p>
              {autoInsight && (
                <button className="corr-ai-insight" onClick={() => setPinned(chart.points.find((p) => p.iso2 === autoInsight.iso2))}>
                  <IconSpark style={{ width: 13, height: 13 }} />
                  <span><b>AI insight:</b> {autoInsight.text}</span>
                </button>
              )}
            </div>

            <div className="corr-chart-hint">
              Each dot is a country · <span className="corr-anom-key">ringed</span> = breaks the pattern · click any dot for the model's take
            </div>

            <div className="corr-plot">
              <svg viewBox={`0 0 ${W} ${H}`} className="corr-svg" onClick={() => setPinned(null)}>
                {chart.yTicks.map((t) => (
                  <g key={`y${t}`}>
                    <line className="hc-grid" x1={M.left} x2={W - M.right} y1={chart.y(t)} y2={chart.y(t)} />
                    <text className="hc-tick-y" x={M.left - 8} y={chart.y(t) + 3}>{METRICS[yMetric].short_fmt(t)}</text>
                  </g>
                ))}
                {chart.xTicks.map((t) => (
                  <text key={`x${t}`} className="hc-tick-x" x={chart.x(t)} y={H - 22}>{METRICS[xMetric].short_fmt(t)}</text>
                ))}

                <text className="corr-axis-label" x={(M.left + W - M.right) / 2} y={H - 4}>{xLabel} →{chart.useLogX ? ' (log)' : ''}</text>
                <text className="corr-axis-label" transform={`translate(14 ${(M.top + H - M.bottom) / 2}) rotate(-90)`}>{yLabel} →{chart.useLogY ? ' (log)' : ''}</text>

                <line className="corr-ols"
                  x1={chart.x(chart.linePts[0].x)} y1={clampY(chart.y(chart.linePts[0].y))}
                  x2={chart.x(chart.linePts[1].x)} y2={clampY(chart.y(chart.linePts[1].y))} />

                {chart.points.map((p) => {
                  const hot = hover?.iso2 === p.iso2 || pinned?.iso2 === p.iso2;
                  const out = chart.outlierSet.has(p.iso2);
                  return (
                    <circle key={p.iso2}
                      className={`corr-dot ${out ? 'outlier' : ''} ${hot ? 'hot' : ''} ${pinned?.iso2 === p.iso2 ? 'pinned' : ''}`}
                      cx={chart.x(p.x)} cy={chart.y(p.y)} r={hot ? 6.5 : out ? 5 : 4}
                      onMouseEnter={() => setHover(p)} onMouseLeave={() => setHover(null)}
                      onClick={(e) => { e.stopPropagation(); setPinned(p); }} />
                  );
                })}
              </svg>

              {/* click-a-dot insight popup */}
              {pinned && insight && (() => {
                const px = (chart.x(pinned.x) / W) * 100;
                const py = (chart.y(pinned.y) / H) * 100;
                const below = py < 34;
                const left = Math.max(16, Math.min(84, px));
                return (
                  <div className="corr-pin" style={{
                    left: `${left}%`, top: `${py}%`,
                    transform: below ? 'translate(-50%, 16px)' : 'translate(-50%, calc(-100% - 16px))',
                  }}>
                    <button className="corr-pin-close" onClick={() => setPinned(null)}><IconClose style={{ width: 13, height: 13 }} /></button>
                    <div className="corr-pin-head">
                      <span className="corr-pin-flag">{flagFromISO2(pinned.iso2)}</span>
                      <span className="corr-pin-name">{pinned.name}</span>
                    </div>
                    <div className="corr-pin-row"><span>{xLabel}</span><b>{fmtX(pinned.x)}</b></div>
                    <div className="corr-pin-row"><span>{yLabel}</span><b>{fmtY(pinned.y)}</b></div>
                    <div className="corr-pin-model">
                      <span className="corr-pin-model-label"><IconSpark style={{ width: 11, height: 11 }} /> Model expected</span>
                      <b>~{fmtY(Math.max(0, pinned.pred))}</b>
                    </div>
                    <div className={`corr-pin-badge ${insight.tone}`}>{insight.verdict}</div>
                  </div>
                );
              })()}
            </div>

            <div className="corr-hover-info">
              {hover
                ? <><span className="corr-hi-flag">{flagFromISO2(hover.iso2)}</span> <b>{hover.name}</b> — {xLabel}: <b>{fmtX(hover.x)}</b> · {yLabel}: <b>{fmtY(hover.y)}</b></>
                : <>Pattern-breakers: {chart.outliers.slice(0, 3).map((o, i) => (
                    <button key={o.iso2} className="corr-anom-link" onClick={() => setPinned(o)}>
                      {flagFromISO2(o.iso2)} {o.name}{i < 2 ? ',' : ''}&nbsp;
                    </button>
                  ))}</>}
            </div>

            <div className="corr-nums">
              <span className="corr-num" title="How many countries are included in this comparison.">
                <b>{data.n}</b> countries</span>
              <span className="corr-num" title="Correlation (−1 to 1): how tightly the dots follow a straight line.">
                correlation <b>{data.pearson_r.toFixed(2)}</b></span>
              <span className="corr-num" title="R-squared: how much of one is explained by the other (0–100%).">
                explained <b>{Math.round(data.r2 * 100)}%</b></span>
              <span className="corr-num" title="Anomalies: countries that sit furthest from the model's trend line.">
                <b>{chart.outliers.length}</b> anomalies</span>
            </div>

            <div className="corr-note">
              <IconArrowRight style={{ width: 13, height: 13, flexShrink: 0 }} />
              A pattern means these tend to move together — it doesn't prove one <i>causes</i> the other.
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function modelInsight(p, fmtY) {
  const pct = p.pred !== 0 ? (p.resid / Math.abs(p.pred)) * 100 : 0;
  const a = Math.abs(pct);
  if (a < 8) return { verdict: 'right on the model’s trend', tone: 'neutral' };
  if (p.resid > 0) return { verdict: `${Math.round(a)}% higher than the model expected`, tone: 'up' };
  return { verdict: `${Math.round(a)}% lower than the model expected`, tone: 'down' };
}

function describe(r, xLabel, yLabel) {
  const a = Math.abs(r);
  let strength, freq, tone;
  if (a >= 0.7)      { strength = 'Strong connection';        freq = 'almost always'; tone = 'strong'; }
  else if (a >= 0.4) { strength = 'Moderate connection';      freq = 'often';         tone = 'moderate'; }
  else if (a >= 0.2) { strength = 'Weak connection';          freq = 'sometimes';     tone = 'weak'; }
  else               { strength = 'Little to no connection';  freq = null;            tone = 'none'; }
  let sentence;
  if (!freq) sentence = `Across countries, there's no clear pattern between ${xLabel} and ${yLabel}.`;
  else {
    const dir = r >= 0 ? 'higher' : 'lower';
    sentence = `Countries with higher ${xLabel} ${freq} have ${dir} ${yLabel}.`;
  }
  return { strength, sentence, tone, pct: Math.round(a * 100) };
}

function niceTicks(scale, isLog) {
  if (!isLog) return scale.ticks(6);
  const [lo, hi] = scale.domain();
  const ticks = [];
  for (let p = Math.floor(Math.log10(lo)); p <= Math.ceil(Math.log10(hi)); p++) {
    const v = Math.pow(10, p);
    if (v >= lo * 0.96 && v <= hi * 1.04) ticks.push(v);
  }
  if (ticks.length <= 3) {
    for (let p = Math.floor(Math.log10(lo)); p <= Math.ceil(Math.log10(hi)); p++) {
      const v = 3 * Math.pow(10, p);
      if (v >= lo && v <= hi) ticks.push(v);
    }
    ticks.sort((a, b) => a - b);
  }
  return ticks;
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
function clampY(v) { return Math.max(M.top, Math.min(H - M.bottom, v)); }
