import { useMemo, useState } from 'react';
import * as d3 from 'd3';

const W = 320, H = 168;
const M = { top: 12, right: 12, bottom: 24, left: 44 };

/**
 * Line chart of a country's historical series with an optional dashed
 * forecast projection and shaded 95% confidence band.
 */
export default function HistoryChart({ history, forecast, hue, formatValue }) {
  const [hover, setHover] = useState(null);

  const chart = useMemo(() => {
    if (!history || history.length < 2) return null;

    const fPoints = forecast?.points || [];
    const allYears  = [...history.map((d) => d.year),  ...fPoints.map((d) => d.year)];
    const allValues = [...history.map((d) => d.value), ...fPoints.flatMap((d) => [d.lower, d.upper, d.value])];

    const x = d3.scaleLinear().domain(d3.extent(allYears)).range([M.left, W - M.right]);
    const y = d3.scaleLinear()
      .domain([Math.min(0, d3.min(allValues)), d3.max(allValues) * 1.06]).nice()
      .range([H - M.bottom, M.top]);

    const line = d3.line().x((d) => x(d.year)).y((d) => y(d.value)).curve(d3.curveMonotoneX);
    const areaGen = d3.area().x((d) => x(d.year)).y0(y(Math.min(0, d3.min(allValues)))).y1((d) => y(d.value)).curve(d3.curveMonotoneX);

    const historyPath = line(history);
    const areaPath = areaGen(history);

    const last = history[history.length - 1];
    let forecastPath = null, bandPath = null;
    if (fPoints.length) {
      forecastPath = line([{ year: last.year, value: last.value }, ...fPoints]);
      const band = d3.area().x((d) => x(d.year)).y0((d) => y(d.lower)).y1((d) => y(d.upper)).curve(d3.curveMonotoneX);
      bandPath = band([{ year: last.year, lower: last.value, upper: last.value }, ...fPoints]);
    }

    return { x, y, historyPath, areaPath, forecastPath, bandPath,
      xTicks: x.ticks(5).filter(Number.isInteger), yTicks: y.ticks(4), last };
  }, [history, forecast]);

  if (!chart) return null;
  const { x, y, historyPath, areaPath, forecastPath, bandPath, xTicks, yTicks, last } = chart;
  const fPoints = forecast?.points || [];

  const handleMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const mx = ((e.clientX - rect.left) / rect.width) * W;
    const yearAt = Math.round(x.invert(mx));
    const h = history.find((d) => d.year === yearAt);
    const f = fPoints.find((d) => d.year === yearAt);
    const pt = h || f;
    if (pt) setHover({ x: x(pt.year), y: y(pt.value), year: pt.year, value: pt.value, kind: h ? 'history' : 'forecast' });
    else setHover(null);
  };

  return (
    <div className="history-chart">
      <svg viewBox={`0 0 ${W} ${H}`} className="hc-svg" style={{ '--hue': hue }}
        onMouseMove={handleMove} onMouseLeave={() => setHover(null)}>
        {yTicks.map((t) => (
          <g key={t}>
            <line className="hc-grid" x1={M.left} x2={W - M.right} y1={y(t)} y2={y(t)} />
            <text className="hc-tick-y" x={M.left - 6} y={y(t) + 3}>{formatAxis(t)}</text>
          </g>
        ))}
        {xTicks.map((t) => (
          <text key={t} className="hc-tick-x" x={x(t)} y={H - 7}>{t}</text>
        ))}

        <path className="hc-area" d={areaPath} />
        {bandPath && <path className="hc-band" d={bandPath} />}
        {forecastPath && <line className="hc-now-line" x1={x(last.year)} x2={x(last.year)} y1={M.top} y2={H - M.bottom} />}
        <path className="hc-line" d={historyPath} />
        {forecastPath && <path className="hc-forecast" d={forecastPath} />}

        {hover && (
          <g>
            <line className="hc-hover-line" x1={hover.x} x2={hover.x} y1={M.top} y2={H - M.bottom} />
            <circle className="hc-hover-dot" cx={hover.x} cy={hover.y} r="4" />
          </g>
        )}
      </svg>

      {hover && (
        <div className="hc-tooltip" style={{ left: `${(hover.x / W) * 100}%` }}>
          <span className="hc-tt-year">{hover.year}{hover.kind === 'forecast' ? ' · projected' : ''}</span>
          <span className="hc-tt-value">{formatValue ? formatValue(hover.value) : hover.value.toFixed(1)}</span>
        </div>
      )}

      <div className="hc-legend">
        <span className="hc-leg-item"><span className="hc-leg-line" /> Actual</span>
        {forecast && <span className="hc-leg-item"><span className="hc-leg-line dash" /> Forecast</span>}
      </div>
    </div>
  );
}

function formatAxis(v) {
  if (Math.abs(v) >= 1e6) return (v / 1e6).toFixed(0) + 'M';
  if (Math.abs(v) >= 1e3) return (v / 1e3).toFixed(0) + 'k';
  if (Math.abs(v) >= 10)  return v.toFixed(0);
  return v.toFixed(1);
}
