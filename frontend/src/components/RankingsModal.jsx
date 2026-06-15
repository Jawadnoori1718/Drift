import { useMemo, useState } from 'react';
import { METRICS, METRIC_ORDER } from '../data/metrics';
import { STATIC_COUNTRY_DATA, flagFromISO2 } from '../data/countries';
import { IconClose } from './Icons';

// Map iso2 → display name from the static table
const NAME_BY_ISO2 = Object.values(STATIC_COUNTRY_DATA).reduce((acc, v) => {
  acc[v[0]] = v[1];
  return acc;
}, {});

export default function RankingsModal({ metric, allMetrics, onClose, onPick }) {
  const [sel, setSel] = useState(metric);
  const m = METRICS[sel];

  const rows = useMemo(() => {
    const data = allMetrics?.[sel];
    if (!data) return [];
    return Object.entries(data)
      .filter(([, v]) => Number.isFinite(v))
      .sort(([, a], [, b]) => b - a);
  }, [allMetrics, sel]);

  const max = rows.length ? rows[0][1] : 1;
  const min = rows.length ? rows[rows.length - 1][1] : 0;
  const span = max - min || 1;

  return (
    <div className="modal-overlay">
      <div className="modal">
        <button className="modal-close" onClick={onClose}><IconClose /></button>
        <div className="modal-title">Country Rankings</div>
        <div className="modal-sub">Every country ranked by the selected indicator</div>

        <div className="corr-controls" style={{ marginBottom: 18 }}>
          <select className="corr-select" value={sel} onChange={(e) => setSel(e.target.value)}>
            {METRIC_ORDER.map((k) => <option key={k} value={k}>{METRICS[k].label}</option>)}
          </select>
        </div>

        <div className="rank-list">
          {rows.map(([iso2, val], i) => {
            const w = 6 + 94 * ((val - min) / span);
            return (
              <button
                key={iso2}
                className={`rank-row ${i < 3 ? 'top' : ''}`}
                onClick={() => { onPick?.(iso2); onClose(); }}
              >
                <span className="rank-num">{i + 1}</span>
                <span className="rank-flag">{flagFromISO2(iso2)}</span>
                <span className="rank-name">{NAME_BY_ISO2[iso2] || iso2}</span>
                <span className="rank-bar-wrap">
                  <span className="rank-bar-track">
                    <span className="rank-bar" style={{ width: `${w}%` }} />
                  </span>
                  <span className="rank-val">{m.fmt(val)}</span>
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
