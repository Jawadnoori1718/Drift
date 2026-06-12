import { useMemo, useState } from 'react';
import * as d3 from 'd3';

const W = 304, H = 150;
const M = { top: 10, right: 10, bottom: 22, left: 42 };

/**
 * Line chart of a country's historical series with an optional dashed
 * forecast projection and shaded 95% confidence band.
 */
export default function HistoryChart({ history, forecast, colorClass, formatValue }) {
  const [hover, setHover] = useState(null);   // {x, y, year, value, kind}

  const chart = useMemo(() => {
    if (!history || history.length < 2) return null;

    const fPoints = forecast?.points || [];
    const allYears  = [...history.map((d) => d.year),  ...fPoints.map((d) => d.year)];
    const allValues = [...history.map((d) => d.value), ...fPoints.flatMap((d) => [d.lower, d.upper, d.value])];

    const x = d3.scaleLinear()
      .domain(d3.extent(allYears))
      .range([M.left, W - M.right]);
    const y = d3.scaleLinear()
      .domain([Math.min(0, d3.min(allValues)) * 1.0, d3.max(allValues) * 1.06])
      .nice()
      .range([H - M.bottom, M.top]);

    const line = d3.line()
      .x((d) => x(d.year))
      .y((d) => y(d.value));

    const historyPath = line(history);

    // Forecast line starts from the last historical point for continuity
    const last = history[history.length - 1];
    let forecastPath = null, bandPath = null;
    if (fPoints.length) {
      forecastPath = line([{ year: last.year, value: last.value }, ...fPoints]);
      const area = d3.area()
        .x((d) => x(d.year))
        .y0((d) => y(d.lower))
        .y1((d) => y(d.upper));
      bandPath = area([{ year: last.year, lower: last.value, upper: last.value }, ...fPoints]);
    }

    const xTicks = x.ticks(5).filter(Number.isInteger);
    const yTicks = y.ticks(4);

    return { x, y, historyPath, forecastPath, bandPath, xTicks, yTicks, last };
  }, [history, forecast]);

  if (!chart) return null;

  const { x, y, historyPath, forecastPath, bandPath, xTicks, yTicks, last } = chart;
  const fPoints = forecast?.points || [];

  const handleMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const mx = ((e.clientX - rect.left) / rect.width) * W;
    const yearAt = Math.round(x.invert(mx));

    const h = history.find((d) => d.year === yearAt);
    const f = fPoints.find((d) => d.year === yearAt);
    const pt = h || f;
    if (pt) {
      setHover({
        x: x(pt.year),
        y: y(pt.value),
        year: pt.year,
        value: pt.value,
        kind: h ? 'history' : 'forecast',
      });
    } else {
      setHover(null);
    }
  };

  return (
    <div className="history-chart">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className={`hc-svg ${colorClass || ''}`}
        onMouseMove={handleMove}
        onMouseLeave={() => setHover(null)}
      >
        {/* Grid + y axis labels */}
        {yTicks.map((t) => (
          <g key={t}>
            <line className="hc-grid" x1={M.left} x2={W - M.right} y1={y(t)} y2={y(t)} />
            <text className="hc-tick-y" x={M.left - 5} y={y(t) + 3}>
              {formatAxis(t)}
            </text>
          </g>
        ))}

        {/* X axis labels */}
        {xTicks.map((t) => (
          <text key={t} className="hc-tick-x" x={x(t)} y={H - 6}>{t}</text>
        ))}

        {/* Divider between history and forecast */}
        {forecastPath && (
          <line className="hc-now-line" x1={x(last.year)} x2={x(last.year)} y1={M.top} y2={H - M.bottom} />
        )}

        {/* Confidence band */}
        {bandPath && <path className="hc-band" d={bandPath} />}

        {/* History line */}
        <path className="hc-line" d={historyPath} />

        {/* Forecast dashed line */}
        {forecastPath && <path className="hc-forecast" d={forecastPath} />}

        {/* Hover marker */}
        {hover && (
          <g>
            <line className="hc-hover-line" x1={hover.x} x2={hover.x} y1={M.top} y2={H - M.bottom} />
            <circle className="hc-hover-dot" cx={hover.x} cy={hover.y} r="3.5" />
          </g>
        )}
      </svg>

      {hover && (
        <div className="hc-tooltip" style={{ left: `${(hover.x / W) * 100}%` }}>
          <span className="hc-tt-year">{hover.year}{hover.kind === 'forecast' ? ' (projected)' : ''}</span>
          <span className="hc-tt-value">{formatValue ? formatValue(hover.value) : hover.value.toFixed(1)}</span>
        </div>
      )}
    </div>
  );
}

function formatAxis(v) {
  if (Math.abs(v) >= 1e6) return (v / 1e6).toFixed(0) + 'M';
  if (Math.abs(v) >= 1e3) return (v / 1e3).toFixed(0) + 'k';
  if (Math.abs(v) >= 10)  return v.toFixed(0);
  return v.toFixed(1);
}
