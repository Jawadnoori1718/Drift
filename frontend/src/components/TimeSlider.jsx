import { useEffect, useRef } from 'react';

/**
 * Timeline scrubber under the globe: drag through history or hit play and
 * watch the world change year by year.
 */
export default function TimeSlider({
  minYear,
  maxYear,
  year,
  onYearChange,
  playing,
  onPlayingChange,
}) {
  const intervalRef = useRef(null);

  // Advance one year per tick while playing; stop at the end.
  useEffect(() => {
    if (!playing) return;
    intervalRef.current = setInterval(() => {
      onYearChange((y) => {
        if (y >= maxYear) {
          onPlayingChange(false);
          return y;
        }
        return y + 1;
      });
    }, 180);
    return () => clearInterval(intervalRef.current);
  }, [playing, maxYear, onYearChange, onPlayingChange]);

  const handlePlay = () => {
    // Restart from the beginning if we're already at the end
    if (!playing && year >= maxYear) onYearChange(minYear);
    onPlayingChange(!playing);
  };

  const pct = maxYear > minYear ? ((year - minYear) / (maxYear - minYear)) * 100 : 100;

  return (
    <div className="time-slider" onClick={(e) => e.stopPropagation()}>
      <button
        className={`ts-play ${playing ? 'playing' : ''}`}
        onClick={handlePlay}
        title={playing ? 'Pause' : 'Play through history'}
        aria-label={playing ? 'Pause timeline' : 'Play timeline'}
      >
        {playing ? '❚❚' : '▶'}
      </button>

      <span className="ts-year-min">{minYear}</span>

      <div className="ts-track-wrap">
        <input
          type="range"
          className="ts-range"
          min={minYear}
          max={maxYear}
          value={year}
          onChange={(e) => {
            onPlayingChange(false);
            onYearChange(Number(e.target.value));
          }}
          style={{ '--pct': `${pct}%` }}
        />
      </div>

      <span className="ts-year-max">{maxYear}</span>

      <div className="ts-current" data-live={year >= maxYear}>
        {year}
        {year >= maxYear && <span className="ts-live-tag">LATEST</span>}
      </div>
    </div>
  );
}
