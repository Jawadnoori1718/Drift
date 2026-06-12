import { useMemo } from 'react';
import { STATIC_COUNTRY_DATA, flagFromISO2 } from '../data/countries';

const METRIC_DEFS = {
  gdp: {
    label: 'GDP per Capita',
    unit: 'current USD',
    format: (v) => '$' + v.toLocaleString('en-US', { maximumFractionDigits: 0 }),
    colorClass: 'blue',
    description: 'Gross domestic product divided by midyear population.',
    source: 'World Bank 2022',
  },
  co2: {
    label: 'CO₂ Emissions',
    unit: 'metric tons per capita',
    format: (v) => v.toFixed(2) + ' t',
    colorClass: 'orange',
    description: 'Carbon dioxide emissions from fossil fuels and cement manufacturing.',
    source: 'World Bank / Global Carbon Project 2021',
  },
  life_expectancy: {
    label: 'Life Expectancy',
    unit: 'years at birth',
    format: (v) => v.toFixed(1) + ' yr',
    colorClass: 'green',
    description: 'Average number of years a newborn is expected to live under current mortality rates.',
    source: 'World Bank 2021',
  },
  internet: {
    label: 'Internet Users',
    unit: '% of population',
    format: (v) => v.toFixed(1) + '%',
    colorClass: 'purple',
    description: 'Share of individuals who have used the internet in the last 3 months.',
    source: 'World Bank / ITU 2021',
  },
  pop_density: {
    label: 'Population Density',
    unit: 'people per km²',
    format: (v) => v >= 1000 ? (v / 1000).toFixed(1) + 'k /km²' : v.toFixed(1) + ' /km²',
    colorClass: 'brown',
    description: 'Number of people per square kilometre of land area.',
    source: 'World Bank 2022',
  },
  gini: {
    label: 'Inequality (Gini)',
    unit: 'index 0–100',
    format: (v) => v.toFixed(1),
    colorClass: 'red',
    description: 'Gini coefficient — 0 is perfect equality, 100 is complete inequality.',
    source: 'World Bank / OECD (latest available)',
  },
  unemployment: {
    label: 'Unemployment Rate',
    unit: '% of labour force',
    format: (v) => v.toFixed(1) + '%',
    colorClass: 'red',
    description: 'Share of the labour force that is without work but available and seeking employment.',
    source: 'World Bank / ILO 2022',
  },
  urban_pop: {
    label: 'Urban Population',
    unit: '% of total',
    format: (v) => v.toFixed(1) + '%',
    colorClass: 'purple',
    description: 'Share of the population living in urban areas as defined by national authorities.',
    source: 'World Bank / UN 2022',
  },
  health_exp: {
    label: 'Health Expenditure',
    unit: '% of GDP',
    format: (v) => v.toFixed(1) + '%',
    colorClass: 'green',
    description: 'Current health expenditure as a share of gross domestic product.',
    source: 'World Bank / WHO 2020',
  },
  military_exp: {
    label: 'Military Expenditure',
    unit: '% of GDP',
    format: (v) => v.toFixed(2) + '%',
    colorClass: 'orange',
    description: 'All government spending on the armed forces, including salaries, operations, and procurement.',
    source: 'SIPRI 2022',
  },
  infant_mortality: {
    label: 'Infant Mortality',
    unit: 'deaths per 1,000 live births',
    format: (v) => v.toFixed(1),
    colorClass: 'red',
    description: 'Probability of dying between birth and age 1, per 1,000 live births.',
    source: 'World Bank / UN IGME 2021',
  },
  forest_cover: {
    label: 'Forest Cover',
    unit: '% of land area',
    format: (v) => v.toFixed(1) + '%',
    colorClass: 'green',
    description: 'Land under natural or planted stands of trees of at least 5 metres in situ.',
    source: 'World Bank / FAO 2021',
  },
  electricity_access: {
    label: 'Electricity Access',
    unit: '% of population',
    format: (v) => v.toFixed(1) + '%',
    colorClass: 'blue',
    description: 'Share of the population with access to electricity.',
    source: 'World Bank / IEA 2021',
  },
  hdi: {
    label: 'Human Dev. Index',
    unit: 'score 0–1',
    format: (v) => v.toFixed(3),
    colorClass: 'blue',
    description: 'Composite index of life expectancy, education, and income per capita.',
    source: 'UNDP Human Development Report 2022',
  },
  happiness: {
    label: 'Happiness Score',
    unit: 'score 0–10',
    format: (v) => v.toFixed(2),
    colorClass: 'green',
    description: 'Average life evaluation from the Cantril ladder survey (0 = worst, 10 = best).',
    source: 'World Happiness Report 2023',
  },
  cpi: {
    label: 'Corruption Index',
    unit: 'score 0–100',
    format: (v) => v.toFixed(0),
    colorClass: 'purple',
    description: 'Corruption Perceptions Index — higher score means less corruption.',
    source: 'Transparency International 2023',
  },
};

export default function CountryPanel({
  feature,
  allMetrics,
  selectedMetric,
  onClose,
}) {
  const meta = STATIC_COUNTRY_DATA[feature?.id];
  if (!meta) return null;

  const [iso2, name, capital, lang] = meta;
  const flag = flagFromISO2(iso2);
  const def  = METRIC_DEFS[selectedMetric];

  const value = allMetrics?.[selectedMetric]?.[iso2];

  const rankInfo = useMemo(() => {
    const data = allMetrics?.[selectedMetric];
    if (!data || value == null) return null;
    const entries = Object.entries(data)
      .filter(([, v]) => Number.isFinite(v))
      .sort(([, a], [, b]) => b - a);
    const rank = entries.findIndex(([k]) => k === iso2) + 1;
    const total = entries.length;
    const worldAvg = entries.reduce((s, [, v]) => s + v, 0) / total;
    return { rank, total, worldAvg };
  }, [allMetrics, selectedMetric, iso2, value]);

  const vsAvg = rankInfo && value != null
    ? ((value - rankInfo.worldAvg) / rankInfo.worldAvg * 100)
    : null;

  const hasValue = value != null && Number.isFinite(value);

  return (
    <div className="country-panel">
      <button className="cp-close" onClick={onClose} aria-label="Close">✕</button>

      {/* Header */}
      <div className="cp-header">
        <span className="cp-flag">{flag}</span>
        <div className="cp-titles">
          <div className="cp-name">{name}</div>
          <div className="cp-meta">
            {capital && <span>{capital}</span>}
            {lang && <><span className="cp-dot">·</span><span>{lang}</span></>}
          </div>
        </div>
      </div>

      {/* Metric hero */}
      <div className="cp-hero">
        <div className="cp-hero-label">{def?.label ?? selectedMetric}</div>
        <div className={`cp-hero-value ${def?.colorClass || ''}`}>
          {hasValue ? def?.format(value) : '—'}
        </div>
        {def?.unit && <div className="cp-hero-unit">{def.unit}</div>}

        {rankInfo && hasValue && (
          <div className="cp-hero-stats">
            <div className="cp-rank-badge">
              #{rankInfo.rank} <span className="cp-rank-of">of {rankInfo.total} countries</span>
            </div>
            {vsAvg != null && (
              <div className={`cp-vs-avg ${vsAvg >= 0 ? 'above' : 'below'}`}>
                {vsAvg >= 0 ? '▲' : '▼'} {Math.abs(vsAvg).toFixed(0)}% vs world avg
                <span className="cp-avg-val"> ({def?.format(rankInfo.worldAvg)})</span>
              </div>
            )}
          </div>
        )}

        {def?.description && (
          <div className="cp-hero-desc">{def.description}</div>
        )}
        {def?.source && (
          <div className="cp-hero-source">Source: {def.source}</div>
        )}
      </div>

      {/* Quick snapshot of other metrics */}
      <div className="cp-section">OTHER INDICATORS</div>
      <div className="cp-snapshot">
        {Object.entries(METRIC_DEFS)
          .filter(([key]) => key !== selectedMetric)
          .map(([key, d]) => {
            const v = allMetrics?.[key]?.[iso2];
            const hasV = v != null && Number.isFinite(v);
            return (
              <div key={key} className="cp-snap-row">
                <span className="cp-snap-label">{d.label}</span>
                <span className={`cp-snap-val ${hasV ? d.colorClass : 'faint'}`}>
                  {hasV ? d.format(v) : '—'}
                </span>
              </div>
            );
          })}
      </div>

      {/* External links */}
      <div className="cp-actions">
        <a
          className="cp-action-btn"
          href={`https://en.wikipedia.org/wiki/${encodeURIComponent(name)}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          Wikipedia ↗
        </a>
        <a
          className="cp-action-btn"
          href={`https://www.google.com/maps/search/${encodeURIComponent(name)}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          Maps ↗
        </a>
      </div>
    </div>
  );
}
