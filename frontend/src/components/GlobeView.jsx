import { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import * as topojson from 'topojson-client';
import { STATIC_COUNTRY_DATA } from '../data/countries';

// Module-level cache so topology is fetched once across hot-reloads / StrictMode double-mounts.
let _worldPromise = null;
function loadWorld() {
  if (_worldPromise) return _worldPromise;
  _worldPromise = d3
    .json('https://unpkg.com/world-atlas@2.0.2/countries-110m.json')
    .then((world) => {
      const fc = topojson.feature(world, world.objects.countries);
      fc.features.forEach((f) => {
        if (f.id != null) f.id = String(f.id).padStart(3, '0');
      });
      return fc.features;
    });
  return _worldPromise;
}

// Build iso_numeric → iso2 lookup once.
const NUM_TO_ISO2 = {};
Object.entries(STATIC_COUNTRY_DATA).forEach(([num, v]) => {
  NUM_TO_ISO2[num] = v[0];
});

const SPIN_SPEEDS = { slow: 8, normal: 22, fast: 45 };
const DEFAULT_FILL = '#2c3e50';
const HOVER_FILL   = '#4a90d9';
const SELECTED_FILL = '#1a2530';

/**
 * GlobeView — interactive 3D globe with choropleth + trade-flow arcs.
 *
 * Props:
 *  size          – pixel size of the square SVG
 *  selected      – ISO numeric id of selected country (or null)
 *  onSelect      – (feature) => void
 *  onHover       – (feature|null, clientX, clientY) => void
 *  spinning      – boolean auto-rotate
 *  spinSpeed     – 'slow' | 'normal' | 'fast'
 *  whirl         – decorative whirl rings
 *  graticule     – lat/lon grid
 *  dark          – theme flag
 *  metricData    – { [iso2]: number } current choropleth values
 *  colorScale    – d3 scale fn (value → css color)
 *  tradeArcs     – { src:[lon,lat], flows:[{coords:[lon,lat], value, iso2, name}] }
 *  showTradeArcs – boolean
 *  onReady       – (api) => void
 *  onUserInteract– () => void
 */
export default function GlobeView({
  size = 600,
  selected,
  onSelect,
  onHover,
  spinning,
  spinSpeed = 'normal',
  whirl = true,
  graticule = true,
  dark = false,
  metricData,
  colorScale,
  tradeArcs,
  showTradeArcs = true,
  onReady,
  onUserInteract,
}) {
  const svgRef = useRef(null);

  // Refs read each rAF tick — avoid stale closures.
  const spinningRef        = useRef(spinning);
  const spinSpeedRef       = useRef(spinSpeed);
  const metricDataRef      = useRef(metricData);
  const colorScaleRef      = useRef(colorScale);
  const tradeArcsRef       = useRef(tradeArcs);
  const showTradeArcsRef   = useRef(showTradeArcs);
  const hoveredRef         = useRef(null);

  useEffect(() => { spinningRef.current = spinning; },        [spinning]);
  useEffect(() => { spinSpeedRef.current = spinSpeed; },      [spinSpeed]);
  useEffect(() => { metricDataRef.current = metricData; },    [metricData]);
  useEffect(() => { colorScaleRef.current = colorScale; },    [colorScale]);
  useEffect(() => { tradeArcsRef.current = tradeArcs; },      [tradeArcs]);
  useEffect(() => { showTradeArcsRef.current = showTradeArcs; }, [showTradeArcs]);

  // D3 state bag (mutable, never triggers React renders).
  const stateRef = useRef({
    rotation: [0, -12, 0],
    scale: 1.0,
    dragging: false,
    lastTick: null,
    paths: null,
    sphere: null,
    grat: null,
    projection: null,
    pathGen: null,
    targetRotation: null,
    targetStart: null,
    targetT0: null,
    targetDur: 0,
    momentumLambda: 0,
    momentumPhi: 0,
    features: null,
    gTradeArcs: null,
    gMarkers: null,
    R: 0,
    whirlA: 0,
    whirlB: 0,
  });

  // ── Main setup effect (runs once per size) ───────────────────────────────
  useEffect(() => {
    const SIZE   = size;
    const CENTER = SIZE / 2;
    const R      = SIZE * 0.41;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    // ── Defs ──────────────────────────────────────────────────────────────
    const defs = svg.append('defs');

    defs.append('clipPath').attr('id', 'sphere-clip')
      .append('circle').attr('cx', CENTER).attr('cy', CENTER).attr('r', R);

    const sphereLight = defs.append('radialGradient')
      .attr('id', 'sphere-light').attr('cx', '38%').attr('cy', '32%').attr('r', '68%');
    sphereLight.append('stop').attr('offset', '0%').attr('stop-color', 'rgba(255,255,255,0.18)');
    sphereLight.append('stop').attr('offset', '55%').attr('stop-color', 'rgba(255,255,255,0.02)');
    sphereLight.append('stop').attr('offset', '100%').attr('stop-color', 'rgba(0,0,0,0.30)');

    const atmoGlow = defs.append('radialGradient')
      .attr('id', 'atmo-glow').attr('cx', '50%').attr('cy', '50%').attr('r', '50%');
    atmoGlow.append('stop').attr('offset', '76%').attr('stop-color', 'rgba(100,180,230,0)');
    atmoGlow.append('stop').attr('offset', '100%').attr('stop-color', 'rgba(100,180,230,0.28)');

    // ── Groups (z-order matters) ─────────────────────────────────────────
    const gOuter = svg.append('g').attr('class', 'g-outer');
    const gWhirl = svg.append('g').attr('class', 'g-whirl')
      .attr('transform', `translate(${CENTER},${CENTER})`);

    svg.append('circle').attr('cx', CENTER).attr('cy', CENTER).attr('r', R + 10)
      .attr('fill', 'url(#atmo-glow)').attr('pointer-events', 'none');

    const gGlobe      = svg.append('g').attr('class', 'g-globe').attr('clip-path', 'url(#sphere-clip)');
    const gTradeArcs  = svg.append('g').attr('class', 'g-trade-arcs').attr('clip-path', 'url(#sphere-clip)');
    const gMarkers    = svg.append('g').attr('class', 'g-markers').attr('clip-path', 'url(#sphere-clip)');

    // Outer dashed ring
    gOuter.append('circle').attr('cx', CENTER).attr('cy', CENTER).attr('r', R + 32).attr('class', 'ring-outer');

    // Whirl rings + comet
    const ringA = gWhirl.append('circle').attr('r', R + 14).attr('class', 'whirl-ring');
    const ringB = gWhirl.append('circle').attr('r', R + 22).attr('class', 'whirl-ring thin');
    const cR = R + 14, cSweep = (70 * Math.PI) / 180, ang0 = -cSweep / 2, ang1 = cSweep / 2;
    const cometD = `M ${Math.cos(ang0)*cR} ${Math.sin(ang0)*cR} A ${cR} ${cR} 0 0 1 ${Math.cos(ang1)*cR} ${Math.sin(ang1)*cR}`;
    const gComet = gWhirl.append('g');
    gComet.append('path').attr('d', cometD).attr('class', 'comet').attr('stroke-dasharray', '0 6 4 5 8 5 12 5 16 5 22');
    gComet.append('circle').attr('cx', Math.cos(ang1)*cR).attr('cy', Math.sin(ang1)*cR).attr('r', 2).attr('class', 'tick');

    // Projection
    const projection = d3.geoOrthographic()
      .scale(R * stateRef.current.scale)
      .translate([CENTER, CENTER])
      .clipAngle(90)
      .rotate(stateRef.current.rotation);
    const pathGen = d3.geoPath(projection);

    const sphere = gGlobe.append('path').datum({ type: 'Sphere' }).attr('class', 'sphere').attr('d', pathGen);
    const grat   = gGlobe.append('path').datum(d3.geoGraticule10()).attr('class', 'graticule').attr('d', pathGen);
    const gCountries = gGlobe.append('g').attr('class', 'countries');

    // 3D lighting overlay (above countries, no pointer events)
    gGlobe.append('circle').attr('cx', CENTER).attr('cy', CENTER).attr('r', R)
      .attr('fill', 'url(#sphere-light)').attr('pointer-events', 'none');

    Object.assign(stateRef.current, {
      gTradeArcs, gMarkers, ringA, ringB, gComet, sphere, grat, gCountries,
      projection, pathGen, whirlA: 0, whirlB: 0, R,
      momentumLambda: 0, momentumPhi: 0,
    });

    // ── Load topology ────────────────────────────────────────────────────
    let cancelled = false;
    loadWorld().then((features) => {
      if (cancelled) return;
      stateRef.current.features = features;

      const sel = gCountries.selectAll('path.country')
        .data(features, (d) => d.id)
        .enter().append('path')
        .attr('class', 'country')
        .attr('d', pathGen)
        .on('click', (event, d) => { event.stopPropagation(); onSelect && onSelect(d); })
        .on('mousemove', (event, d) => {
          hoveredRef.current = d.id;
          onHover && onHover(d, event.clientX, event.clientY);
          applyFills();
        })
        .on('mouseleave', () => {
          hoveredRef.current = null;
          onHover && onHover(null);
          applyFills();
        });

      stateRef.current.paths = sel;
      applyFills();

      onReady && onReady({
        getCountryById: (id) => features.find((f) => f.id === id),
        getCountryByISO2: (iso2) => {
          const entry = Object.entries(STATIC_COUNTRY_DATA).find(([, v]) => v[0] === iso2);
          return entry ? features.find((f) => f.id === entry[0]) : null;
        },
        getCentroidByISO2: (iso2) => {
          const entry = Object.entries(STATIC_COUNTRY_DATA).find(([, v]) => v[0] === iso2);
          if (!entry) return null;
          const f = features.find((feat) => feat.id === entry[0]);
          return f ? d3.geoCentroid(f) : null;
        },
        animateTo: (rot, dur = 900) => animateRotationTo(rot, dur),
        getRotation: () => stateRef.current.rotation.slice(),
        getCentroid: (id) => {
          const f = features.find((x) => x.id === id);
          return f ? d3.geoCentroid(f) : null;
        },
      });
    });

    // ── Drag / rotate ────────────────────────────────────────────────────
    let dragStart = null, rotStart = null, prevDragPos = null;
    const onDown = (e) => {
      stateRef.current.dragging = true;
      d3.select(svgRef.current).classed('dragging', true);
      const pt = e.touches ? e.touches[0] : e;
      dragStart   = [pt.clientX, pt.clientY];
      rotStart    = stateRef.current.rotation.slice();
      prevDragPos = [pt.clientX, pt.clientY];
      stateRef.current.momentumLambda = 0;
      stateRef.current.momentumPhi    = 0;
      stateRef.current.targetRotation = null;
      onUserInteract && onUserInteract();
      e.preventDefault();
    };
    const onMove = (e) => {
      if (!stateRef.current.dragging) return;
      const pt = e.touches ? e.touches[0] : e;
      const dx = pt.clientX - dragStart[0];
      const dy = pt.clientY - dragStart[1];
      const k  = 0.5 / stateRef.current.scale;
      const lambda = rotStart[0] + dx * k;
      const phi    = Math.max(-85, Math.min(85, rotStart[1] - dy * k));
      if (prevDragPos) {
        stateRef.current.momentumLambda = (pt.clientX - prevDragPos[0]) * k;
        stateRef.current.momentumPhi    = -(pt.clientY - prevDragPos[1]) * k;
      }
      prevDragPos = [pt.clientX, pt.clientY];
      stateRef.current.rotation = [lambda, phi, rotStart[2]];
      drawGlobe();
    };
    const onUp = () => {
      stateRef.current.dragging = false;
      d3.select(svgRef.current).classed('dragging', false);
    };

    const node = svgRef.current;
    node.addEventListener('mousedown', onDown);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    node.addEventListener('touchstart', onDown, { passive: false });
    window.addEventListener('touchmove', onMove, { passive: false });
    window.addEventListener('touchend', onUp);

    // Scroll to zoom
    const onWheel = (e) => {
      e.preventDefault();
      const delta = -e.deltaY * (e.deltaMode === 1 ? 0.05 : 0.0012);
      stateRef.current.scale = Math.max(0.7, Math.min(4.0, stateRef.current.scale + delta));
      stateRef.current.projection.scale(R * stateRef.current.scale);
      drawGlobe();
    };
    node.addEventListener('wheel', onWheel, { passive: false });

    // Pinch to zoom
    let pinchDist0 = null, pinchScale0 = null;
    const onTouchStart2 = (e) => {
      if (e.touches.length === 2) {
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        pinchDist0  = Math.hypot(dx, dy);
        pinchScale0 = stateRef.current.scale;
      }
    };
    const onTouchMove2 = (e) => {
      if (e.touches.length === 2 && pinchDist0 != null) {
        e.preventDefault();
        const dx   = e.touches[0].clientX - e.touches[1].clientX;
        const dy   = e.touches[0].clientY - e.touches[1].clientY;
        const dist = Math.hypot(dx, dy);
        stateRef.current.scale = Math.max(0.7, Math.min(4.0, pinchScale0 * (dist / pinchDist0)));
        stateRef.current.projection.scale(R * stateRef.current.scale);
        drawGlobe();
      }
    };
    node.addEventListener('touchstart', onTouchStart2, { passive: true });
    node.addEventListener('touchmove', onTouchMove2, { passive: false });
    node.addEventListener('touchend', () => { pinchDist0 = null; });

    // ── rAF loop ─────────────────────────────────────────────────────────
    function tick(ts) {
      if (cancelled) return;
      const s = stateRef.current;
      try {
        if (s.lastTick == null) s.lastTick = ts;
        const dt = Math.min(0.05, (ts - s.lastTick) / 1000);
        s.lastTick = ts;

        // Whirl rings animate regardless
        if (s.ringA) {
          s.whirlA += -90 * dt;
          s.whirlB +=  60 * dt;
          s.ringA.attr('transform', `rotate(${s.whirlA})`);
          s.gComet.attr('transform', `rotate(${s.whirlA})`);
          s.ringB.attr('transform', `rotate(${s.whirlB})`);
        }

        if (s.targetRotation) {
          const t  = Math.min(1, (performance.now() - s.targetT0) / s.targetDur);
          const e  = t < 0.5 ? 2*t*t : 1 - Math.pow(-2*t+2, 2)/2;
          const st = s.targetStart;
          const dL = (((s.targetRotation[0] - st[0] + 540) % 360) - 180);
          s.rotation = [
            st[0] + dL * e,
            st[1] + (s.targetRotation[1] - st[1]) * e,
            st[2] + (s.targetRotation[2] - st[2]) * e,
          ];
          if (t >= 1) s.targetRotation = null;
          drawGlobe();
        } else if (spinningRef.current && !s.dragging) {
          const speed = SPIN_SPEEDS[spinSpeedRef.current] ?? SPIN_SPEEDS.normal;
          s.rotation[0] = (s.rotation[0] + speed * dt) % 360;
          drawGlobe();
        } else if (!s.dragging && (Math.abs(s.momentumLambda) > 0.02 || Math.abs(s.momentumPhi) > 0.02)) {
          s.rotation[0] = (s.rotation[0] + s.momentumLambda) % 360;
          s.rotation[1] = Math.max(-89, Math.min(89, s.rotation[1] + s.momentumPhi));
          s.momentumLambda *= 0.88;
          s.momentumPhi    *= 0.88;
          drawGlobe();
        } else {
          // Redraw trade arcs every frame even when globe is still (projection-dependent).
          drawTradeArcs();
        }
      } catch (err) {
        console.error('tick error', err);
      }
      requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);

    return () => {
      cancelled = true;
      node.removeEventListener('mousedown', onDown);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      node.removeEventListener('touchstart', onDown);
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('touchend', onUp);
      node.removeEventListener('wheel', onWheel);
      node.removeEventListener('touchstart', onTouchStart2);
      node.removeEventListener('touchmove', onTouchMove2);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [size]);

  // ── Core draw helpers ────────────────────────────────────────────────────

  function drawGlobe() {
    const s = stateRef.current;
    if (!s.projection) return;
    s.projection.rotate(s.rotation);
    s.sphere.attr('d', s.pathGen);
    s.grat.attr('d', s.pathGen);
    if (s.paths) s.paths.attr('d', s.pathGen);
    applyFills();
    drawTradeArcs();
  }

  function applyFills() {
    const s = stateRef.current;
    if (!s.paths) return;
    const metric    = metricDataRef.current;
    const scale     = colorScaleRef.current;
    const hoveredId = hoveredRef.current;

    s.paths.attr('fill', (d) => {
      if (d.id === hoveredId) return HOVER_FILL;
      if (metric && scale) {
        const iso2 = NUM_TO_ISO2[d.id];
        const val  = iso2 ? metric[iso2] : null;
        if (val != null && Number.isFinite(val)) return scale(val);
      }
      return DEFAULT_FILL;
    });
  }

  function drawTradeArcs() {
    const s = stateRef.current;
    if (!s.gTradeArcs) return;
    s.gTradeArcs.selectAll('.trade-arc-path').remove();

    if (!showTradeArcsRef.current) return;
    const arcs = tradeArcsRef.current;
    if (!arcs || !arcs.src || !arcs.flows || arcs.flows.length === 0) return;

    const maxVal = Math.max(...arcs.flows.map((f) => f.value));

    arcs.flows.forEach((flow, i) => {
      if (!flow.coords) return;
      const line = { type: 'LineString', coordinates: [arcs.src, flow.coords] };
      const pathD = s.pathGen(line);
      if (!pathD) return;

      const weight = 1.0 + (flow.value / maxVal) * 3.5;
      const opacity = 0.55 + (flow.value / maxVal) * 0.4;

      s.gTradeArcs.append('path')
        .attr('class', 'trade-arc-path')
        .attr('d', pathD)
        .attr('stroke-width', weight)
        .attr('stroke-opacity', opacity)
        .style('animation-delay', `${i * 0.18}s`);
    });
  }

  function animateRotationTo(target, dur = 900) {
    const s = stateRef.current;
    s.targetRotation = target;
    s.targetStart    = s.rotation.slice();
    s.targetT0       = performance.now();
    s.targetDur      = dur;
  }

  // ── Update selection styling ─────────────────────────────────────────────
  useEffect(() => {
    const s = stateRef.current;
    if (!s.paths) return;
    s.paths.classed('selected', (d) => d.id === selected);
    applyFills();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected]);

  // Redraw fills when metric/colorscale changes (on next tick metricDataRef/colorScaleRef are updated,
  // but we also do an immediate repaint so the transition feels instant).
  useEffect(() => {
    applyFills();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [metricData, colorScale]);

  useEffect(() => {
    drawTradeArcs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tradeArcs, showTradeArcs]);

  return (
    <svg
      ref={svgRef}
      className={`globe-svg ${dark ? 'dark' : 'light'} ${whirl ? '' : 'no-whirl'} ${graticule ? '' : 'no-graticule'}`}
      viewBox={`0 0 ${size} ${size}`}
      style={{ width: size, height: size, touchAction: 'none', userSelect: 'none' }}
      role="img"
      aria-label="Interactive globe. Drag to rotate, scroll to zoom, click a country."
    />
  );
}
