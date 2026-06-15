import { useEffect, useMemo, useState } from 'react';
import { STATIC_COUNTRY_DATA, flagFromISO2 } from '../data/countries';
import { METRICS, METRIC_ORDER } from '../data/metrics';
import { getHistory, getForecast, getSimilar } from '../lib/backend';
import HistoryChart from './HistoryChart';
import {
  IconStar, IconClose, IconArrowRight,
  IconEconomy, IconSociety, IconEnvironment, IconConnectivity,
} from './Icons';

const CAT_ICON = {
  economy: IconEconomy, society: IconSociety,
  environment: IconEnvironment, connectivity: IconConnectivity,
};

export default function CountryPanel({
  feature, allMetrics, selectedMetric,
  yearData, year, isLatestYear, onSelectIso2, onMetricChange, onClose,
}) {
  const meta = STATIC_COUNTRY_DATA[feature?.id];
  const [iso2, name, capital] = meta || [];

  const [history,  setHistory]  = useState(null);
  const [forecast, setForecast] = useState(null);
  const [similar,  setSimilar]  = useState(null);
  const [starred,  setStarred]  = useState(false);

  useEffect(() => {
    if (!iso2) return;
    let cancelled = false;
    setHistory(null); setForecast(null);
    getHistory(iso2, selectedMetric).then((h) => !cancelled && setHistory(h)).catch(() => !cancelled && setHistory(null));
    getForecast(iso2, selectedMetric).then((f) => !cancelled && setForecast(f)).catch(() => !cancelled && setForecast(null));
    return () => { cancelled = true; };
  }, [iso2, selectedMetric]);

  useEffect(() => {
    if (!iso2) return;
    let cancelled = false;
    setSimilar(null);
    getSimilar(iso2).then((s) => !cancelled && setSimilar(s)).catch(() => !cancelled && setSimilar(null));
    return () => { cancelled = true; };
  }, [iso2]);

  const def = METRICS[selectedMetric];
  const heroData = yearData || allMetrics?.[selectedMetric];
  const value = heroData?.[iso2];
  const hasValue = value != null && Number.isFinite(value);

  const rankInfo = useMemo(() => {
    if (!heroData || value == null) return null;
    const entries = Object.entries(heroData).filter(([, v]) => Number.isFinite(v)).sort(([, a], [, b]) => b - a);
    const rank = entries.findIndex(([k]) => k === iso2) + 1;
    const total = entries.length;
    const worldAvg = entries.reduce((s, [, v]) => s + v, 0) / total;
    return { rank, total, worldAvg };
  }, [heroData, iso2, value]);

  const vsAvg = rankInfo && hasValue ? (value / rankInfo.worldAvg) : null;

  if (!meta) return null;

  return (
    <aside className="country-panel">
      {/* header */}
      <div className="cp-card">
        <div className="cp-head">
          <span className="cp-flag">{flagFromISO2(iso2)}</span>
          <div className="cp-head-text">
            <div className="cp-name">{name}</div>
            <div className="cp-sub">{iso2}{capital ? ` · ${capital}` : ''}</div>
          </div>
          <button className={`cp-star ${starred ? 'on' : ''}`} onClick={() => setStarred((s) => !s)} title="Favourite">
            <IconStar filled={starred} />
          </button>
          <button className="cp-close-x" onClick={onClose} aria-label="Close"><IconClose /></button>
        </div>
      </div>

      {/* hero metric */}
      <div className="cp-card">
        <div className="cp-hero-top">
          <span className="cp-hero-label">
            {def.label}
            {year != null && <span className={`cp-year-chip ${isLatestYear ? 'latest' : ''}`}>{isLatestYear ? 'Latest' : year}</span>}
          </span>
          {rankInfo && hasValue && (
            <span className="cp-rank">
              <div className="cp-rank-label">Rank</div>
              <div className="cp-rank-val">{rankInfo.rank}</div>
            </span>
          )}
        </div>
        <div className="cp-hero-value" style={{ '--hue': def.hue }}>
          {hasValue ? def.fmt(value) : '—'}
        </div>
        <div className="cp-hero-foot">
          <span className="cp-hero-unit">{def.unit}</span>
          {vsAvg != null && (
            <span className={`cp-delta ${vsAvg >= 1 ? 'up' : 'down'}`}>
              {vsAvg >= 1 ? '▲' : '▼'} {vsAvg.toFixed(2)}× vs World Avg
            </span>
          )}
        </div>
      </div>

      {/* history & forecast */}
      {history && history.length > 1 && (
        <div className="cp-card">
          <div className="cp-card-title">
            <div>
              <h4>History & Forecast</h4>
              <span className="sub">{def.unit}</span>
            </div>
            {forecast && <span className="cp-info-i" title={`${forecast.model} model · R² ${forecast.r2?.toFixed(2)}`}>i</span>}
          </div>
          <HistoryChart history={history} forecast={forecast} hue={def.hue} formatValue={def.fmt} />
          {forecast && (
            <div className="cp-forecast-meta">
              {forecast.model === 'log-linear' && forecast.annual_growth_pct != null
                ? <>trend {forecast.annual_growth_pct >= 0 ? '+' : ''}{forecast.annual_growth_pct.toFixed(1)}%/yr</>
                : forecast.annual_change != null
                  ? <>trend {forecast.annual_change >= 0 ? '+' : ''}{formatTrend(forecast.annual_change)}/yr</> : null}
              <span className="cp-fm-dot">·</span>R² {forecast.r2?.toFixed(2)}
              <span className="cp-fm-dot">·</span>{forecast.model}
            </div>
          )}
        </div>
      )}

      {/* similar countries */}
      {similar?.neighbors?.length > 0 && (
        <div className="cp-card">
          <div className="cp-card-title"><h4>Similar Countries</h4></div>
          <div className="cp-similar">
            {similar.neighbors.slice(0, 5).map((nb, i) => {
              const maxD = similar.neighbors[similar.neighbors.length - 1].distance || 1;
              const score = Math.max(0, 1 - nb.distance / (maxD * 1.25));
              return (
                <button key={nb.iso2} className="cp-sim-row" onClick={() => onSelectIso2?.(nb.iso2)}>
                  <span className="cp-sim-rank">{i + 1}</span>
                  <span className="cp-sim-flag">{flagFromISO2(nb.iso2)}</span>
                  <span className="cp-sim-name">{nb.name}</span>
                  <span className="cp-sim-score">{score.toFixed(2)}</span>
                </button>
              );
            })}
          </div>
          <button className="cp-viewall-row" onClick={() => onSelectIso2?.(similar.neighbors[0].iso2)}>
            View All ({similar.countries_compared}) <IconArrowRight style={{ width: 14, height: 14 }} />
          </button>
        </div>
      )}

      {/* all indicators grid */}
      <div className="cp-card">
        <div className="cp-card-title">
          <h4>All Indicators <span className="sub">(16)</span></h4>
        </div>
        <div className="cp-ind-grid">
          {METRIC_ORDER.filter((k) => k !== selectedMetric).slice(0, 8).map((key) => {
            const mm = METRICS[key];
            const v = allMetrics?.[key]?.[iso2];
            const hasV = v != null && Number.isFinite(v);
            const Ic = CAT_ICON[mm.icon];
            return (
              <button key={key} className="cp-ind-cell" onClick={() => onMetricChange?.(key)} title={mm.label}>
                <span className="cp-ind-ic" style={{ background: mm.hue }}><Ic /></span>
                <span className="cp-ind-val">{hasV ? mm.short_fmt(v) : '—'}</span>
                <span className="cp-ind-key">{mm.short}</span>
              </button>
            );
          })}
        </div>
      </div>
    </aside>
  );
}

function formatTrend(v) {
  const a = Math.abs(v);
  if (a >= 1000) return (v / 1000).toFixed(1) + 'k';
  if (a >= 10) return v.toFixed(0);
  if (a >= 0.1) return v.toFixed(2);
  return v.toFixed(3);
}
