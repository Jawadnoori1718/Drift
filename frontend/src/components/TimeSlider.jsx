import { useEffect, useRef } from 'react';
import { IconPlay, IconPause } from './Icons';

/**
 * Timeline scrubber: drag through history or hit play to watch the world change.
 */
export default function TimeSlider({
  minYear, maxYear, year, onYearChange, playing, onPlayingChange,
}) {
  const intervalRef = useRef(null);

  useEffect(() => {
    if (!playing) return;
    intervalRef.current = setInterval(() => {
      onYearChange((y) => {
        if (y >= maxYear) { onPlayingChange(false); return y; }
        return y + 1;
      });
    }, 340);
    return () => clearInterval(intervalRef.current);
  }, [playing, maxYear, onYearChange, onPlayingChange]);

  const handlePlay = () => {
    if (!playing && year >= maxYear) onYearChange(minYear);
    onPlayingChange(!playing);
  };

  const isLatest = year >= maxYear;
  const pct = maxYear > minYear ? ((year - minYear) / (maxYear - minYear)) * 100 : 100;

  return (
    <div className="time-slider" onClick={(e) => e.stopPropagation()}>
      <button className="ts-play" onClick={handlePlay} aria-label={playing ? 'Pause' : 'Play'}>
        {playing ? <IconPause /> : <IconPlay />}
      </button>

      <span className="ts-current">{year}</span>
      <span className="ts-year-edge">{minYear}</span>

      <div className="ts-track-wrap">
        <input
          type="range" className="ts-range"
          min={minYear} max={maxYear} value={year}
          onChange={(e) => { onPlayingChange(false); onYearChange(Number(e.target.value)); }}
          style={{ '--pct': `${pct}%` }}
        />
      </div>

      <span className="ts-year-edge">{maxYear}</span>

      <button
        className={`ts-latest ${isLatest ? 'on' : ''}`}
        onClick={() => { onPlayingChange(false); onYearChange(maxYear); }}
      >
        Latest
      </button>
    </div>
  );
}
