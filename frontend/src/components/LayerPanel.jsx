import { METRICS, CATEGORIES, METRIC_ORDER } from '../data/metrics';
import {
  IconGlobe, IconAnalytics, IconRankings, IconEconomy, IconSociety,
  IconEnvironment, IconConnectivity, IconChevron,
} from './Icons';

const CAT_ICON = {
  economy: IconEconomy, society: IconSociety,
  environment: IconEnvironment, connectivity: IconConnectivity,
};

// Gradient brand mark (no background tile)
function BrandMark() {
  return (
    <svg width="40" height="40" viewBox="0 0 64 64" fill="none" aria-hidden="true">
      <defs>
        <linearGradient id="bm" x1="6" y1="10" x2="56" y2="54" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#3b82f6" />
          <stop offset="1" stopColor="#7c3aed" />
        </linearGradient>
      </defs>
      <g stroke="url(#bm)" strokeWidth="4.6" strokeLinecap="round">
        <line x1="7" y1="23" x2="23" y2="23" />
        <line x1="3" y1="32" x2="19" y2="32" opacity="0.6" />
        <line x1="8" y1="41" x2="21" y2="41" opacity="0.42" />
      </g>
      <path d="M31 13 H34 a19 19 0 0 1 0 38 H31" fill="none" stroke="url(#bm)" strokeWidth="7" strokeLinecap="round" />
      <g stroke="url(#bm)" strokeWidth="2.4" fill="none">
        <circle cx="31.5" cy="32" r="11.5" />
        <ellipse cx="31.5" cy="32" rx="5" ry="11.5" />
        <line x1="20" y1="32" x2="43" y2="32" />
      </g>
    </svg>
  );
}

export default function LayerPanel({
  selectedMetric, onMetricChange,
  view, onViewChange,
  categoryFilter, onCategoryChange,
}) {
  // Indicators are only shown once a category is selected.
  const indicators = categoryFilter
    ? METRIC_ORDER.filter((k) => METRICS[k].cat === categoryFilter)
    : [];

  return (
    <aside className="sidebar">
      <div className="sb-brand">
        <div className="sb-logo"><BrandMark /></div>
        <div className="sb-brand-text">
          <span className="sb-brand-name">Drift</span>
          <span className="sb-brand-sub">Global Data · Intelligent Insights</span>
        </div>
      </div>

      <div className="sb-scroll">
        {/* OVERVIEW */}
        <div className="sb-section-label">OVERVIEW</div>
        <NavItem icon={<IconGlobe />} title="World Map" sub="Explore Global Data"
          active={view === 'map'} onClick={() => onViewChange('map')} />
        <NavItem icon={<IconAnalytics />} title="Analytics" sub="Correlations & Trends"
          active={view === 'analytics'} onClick={() => onViewChange('analytics')} />
        <NavItem icon={<IconRankings />} title="Rankings" sub="Compare Countries"
          active={view === 'rankings'} onClick={() => onViewChange('rankings')} />

        {/* CATEGORIES */}
        <div className="sb-section-label">CATEGORIES</div>
        {CATEGORIES.map((c) => {
          const Ic = CAT_ICON[c.key];
          return (
            <NavItem key={c.key} icon={<Ic />} title={c.label} sub={c.sub}
              active={categoryFilter === c.key}
              onClick={() => onCategoryChange(c.key)} />
          );
        })}

        {/* INDICATORS — only after a category is chosen */}
        {categoryFilter && (
          <>
            <div className="sb-section-label">
              {CATEGORIES.find((c) => c.key === categoryFilter)?.label.toUpperCase()} INDICATORS
            </div>
            {indicators.map((key) => {
              const m = METRICS[key];
              const active = selectedMetric === key;
              return (
                <button key={key} className={`sb-item ${active ? 'active' : ''}`}
                  onClick={() => onMetricChange(key)}>
                  <span className="sb-ind-dot" style={{ '--dot': m.hue }}><i /></span>
                  <span className="sb-item-text">
                    <span className="sb-item-title">{m.label}</span>
                    <span className="sb-item-sub">{m.unit}</span>
                  </span>
                  {active && <span className="sb-item-chevron"><IconChevron style={{ transform: 'rotate(-90deg)' }} /></span>}
                </button>
              );
            })}
          </>
        )}

      </div>

      <div className="sb-footer">
        <div className="sb-footer-name">Drift v1.0.0</div>
        <div className="sb-footer-sub">© 2026 Global Analytics</div>
      </div>
    </aside>
  );
}

function NavItem({ icon, title, sub, active, onClick }) {
  return (
    <button className={`sb-item ${active ? 'active' : ''}`} onClick={onClick}>
      <span className="sb-item-icon">{icon}</span>
      <span className="sb-item-text">
        <span className="sb-item-title">{title}</span>
        <span className="sb-item-sub">{sub}</span>
      </span>
    </button>
  );
}
