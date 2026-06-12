import * as d3 from 'd3';

const CATEGORIES = [
  {
    label: 'ECONOMY',
    metrics: [
      { key: 'gdp',          label: 'GDP per Capita',      unit: 'USD/capita' },
      { key: 'gini',         label: 'Inequality (Gini)',   unit: 'index 0–100' },
      { key: 'unemployment', label: 'Unemployment',        unit: '% labour force' },
      { key: 'military_exp', label: 'Military Spending',   unit: '% of GDP' },
    ],
  },
  {
    label: 'SOCIETY',
    metrics: [
      { key: 'life_expectancy',  label: 'Life Expectancy',    unit: 'years' },
      { key: 'infant_mortality', label: 'Infant Mortality',   unit: 'per 1,000 births' },
      { key: 'health_exp',       label: 'Health Spending',    unit: '% of GDP' },
      { key: 'urban_pop',        label: 'Urbanisation',       unit: '% urban' },
      { key: 'happiness',        label: 'Happiness Score',    unit: 'score 0–10' },
      { key: 'hdi',              label: 'Human Dev. Index',   unit: 'score 0–1' },
    ],
  },
  {
    label: 'ENVIRONMENT',
    metrics: [
      { key: 'co2',          label: 'CO₂ Emissions',      unit: 't per capita' },
      { key: 'forest_cover', label: 'Forest Cover',       unit: '% land area' },
    ],
  },
  {
    label: 'CONNECTIVITY',
    metrics: [
      { key: 'internet',           label: 'Internet Users',    unit: '% population' },
      { key: 'electricity_access', label: 'Electricity Access',unit: '% population' },
      { key: 'pop_density',        label: 'Pop. Density',      unit: 'per km²' },
      { key: 'cpi',                label: 'Anti-Corruption',   unit: 'CPI score 0–100' },
    ],
  },
];

export default function LayerPanel({
  selectedMetric,
  onMetricChange,
  colorScale,
  metricData,
  dark,
  onDarkChange,
  loading,
}) {
  const currentData = metricData?.[selectedMetric] || {};
  const values      = Object.values(currentData).filter(Number.isFinite);
  const minVal      = values.length ? d3.min(values) : 0;
  const maxVal      = values.length ? d3.max(values) : 1;

  const swatches = colorScale
    ? Array.from({ length: 9 }, (_, i) => {
        const t = i / 8;
        const v = minVal + t * (maxVal - minVal);
        return { color: colorScale(v), label: formatVal(v, selectedMetric) };
      })
    : [];

  return (
    <aside className="layer-panel">
      <div className="lp-brand">
        <svg className="lp-brand-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <circle cx="12" cy="12" r="9.5" stroke="currentColor" strokeWidth="1.4" />
          <ellipse cx="12" cy="12" rx="4.5" ry="9.5" stroke="currentColor" strokeWidth="1.2" />
          <line x1="2.5" y1="12" x2="21.5" y2="12" stroke="currentColor" strokeWidth="1.2" />
        </svg>
        <span className="lp-brand-name">Drift</span>
      </div>

      {loading && <div className="lp-loading-bar" />}

      {CATEGORIES.map((cat) => (
        <div key={cat.label} className="lp-category">
          <div className="lp-section">{cat.label}</div>
          {cat.metrics.map((m) => (
            <button
              key={m.key}
              className={`lp-metric-btn ${selectedMetric === m.key ? 'active' : ''}`}
              onClick={() => onMetricChange(m.key)}
            >
              <span className="lp-metric-dot" />
              <div className="lp-metric-text">
                <span className="lp-metric-label">{m.label}</span>
                <span className="lp-metric-unit">{m.unit}</span>
              </div>
            </button>
          ))}
        </div>
      ))}

      {swatches.length > 0 && (
        <div className="lp-category">
          <div className="lp-section">COLOR SCALE</div>
          <div className="lp-legend">
            <div
              className="lp-gradient"
              style={{
                background: `linear-gradient(to right, ${swatches.map((s) => s.color).join(', ')})`,
              }}
            />
            <div className="lp-legend-labels">
              <span>{formatVal(minVal, selectedMetric)}</span>
              <span>{formatVal(maxVal, selectedMetric)}</span>
            </div>
          </div>
        </div>
      )}

      <div className="lp-category">
        <div className="lp-section">DISPLAY</div>
        <div className="lp-row">
          <span className="lp-row-label">Dark mode</span>
          <button
            className="lp-toggle"
            data-on={String(!!dark)}
            onClick={() => onDarkChange(!dark)}
            aria-pressed={!!dark}
          >
            <i />
          </button>
        </div>
      </div>

      <div className="lp-footer">
        <div className="lp-source">World Bank · UNDP · TI · WHR</div>
        <div className="lp-source">2021–2023 data</div>
      </div>
    </aside>
  );
}

function formatVal(v, metric) {
  if (v == null || !Number.isFinite(v)) return '—';
  switch (metric) {
    case 'gdp':
      return v >= 1000 ? '$' + (v / 1000).toFixed(0) + 'k' : '$' + v.toFixed(0);
    case 'pop_density':
      return v >= 1000 ? (v / 1000).toFixed(1) + 'k' : v.toFixed(0);
    case 'hdi':
      return v.toFixed(2);
    case 'happiness':
      return v.toFixed(1);
    case 'military_exp':
      return v.toFixed(1) + '%';
    default:
      return v.toFixed(1);
  }
}
