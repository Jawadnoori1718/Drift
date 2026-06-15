// Minimal stroke-based icon set (24×24, 1.7 stroke), inherits currentColor.

const base = {
  width: 18, height: 18, viewBox: '0 0 24 24', fill: 'none',
  stroke: 'currentColor', strokeWidth: 1.7, strokeLinecap: 'round', strokeLinejoin: 'round',
};

// Brand mark — D + globe + motion lines, drawn in currentColor (white on the violet tile)
export const IconBrand = (p) => (
  <svg viewBox="0 0 64 64" fill="none" {...p}>
    <g stroke="currentColor" strokeWidth="4.4" strokeLinecap="round">
      <line x1="11" y1="24" x2="23" y2="24" />
      <line x1="8" y1="32" x2="20" y2="32" opacity="0.7" />
      <line x1="12" y1="40" x2="21" y2="40" opacity="0.5" />
    </g>
    <path d="M31 15 H34 a17 17 0 0 1 0 34 H31" fill="none" stroke="currentColor" strokeWidth="5.6" strokeLinecap="round" />
    <g stroke="currentColor" strokeWidth="2.1" fill="none">
      <circle cx="31.5" cy="32" r="9.5" />
      <ellipse cx="31.5" cy="32" rx="4.2" ry="9.5" />
      <line x1="22" y1="32" x2="41" y2="32" />
    </g>
  </svg>
);

export const IconGlobe = (p) => (
  <svg {...base} {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M3 12h18" />
    <path d="M12 3c2.5 2.6 2.5 15.4 0 18M12 3c-2.5 2.6-2.5 15.4 0 18" />
  </svg>
);

export const IconAnalytics = (p) => (
  <svg {...base} {...p}>
    <path d="M4 19V5" />
    <path d="M4 15l4-4 4 3 7-8" />
    <path d="M15 6h5v5" />
  </svg>
);

export const IconRankings = (p) => (
  <svg {...base} {...p}>
    <rect x="4" y="11" width="4" height="9" rx="1" />
    <rect x="10" y="6" width="4" height="14" rx="1" />
    <rect x="16" y="14" width="4" height="6" rx="1" />
  </svg>
);

export const IconEconomy = (p) => (
  <svg {...base} {...p}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M12 7v10M14.5 9.2c-.5-.9-1.5-1.4-2.6-1.4-1.4 0-2.4.8-2.4 2 0 2.6 5 1.4 5 4 0 1.2-1.1 2-2.6 2-1.1 0-2.1-.5-2.6-1.4" />
  </svg>
);

export const IconSociety = (p) => (
  <svg {...base} {...p}>
    <circle cx="9" cy="8" r="3" />
    <path d="M3.5 19a5.5 5.5 0 0 1 11 0" />
    <path d="M16 6.5a3 3 0 0 1 0 5.6" />
    <path d="M17.5 14.2A5.5 5.5 0 0 1 20.5 19" />
  </svg>
);

export const IconEnvironment = (p) => (
  <svg {...base} {...p}>
    <path d="M12 21c5-1 8-5 8-11V5l-6 1c-4 .7-7 3.5-7 8 0 3 1.5 5.5 5 7z" />
    <path d="M9 16c1.5-3.5 4-5.5 7-6.5" />
  </svg>
);

export const IconConnectivity = (p) => (
  <svg {...base} {...p}>
    <path d="M5 12.5a9 9 0 0 1 14 0" />
    <path d="M8 15.5a5 5 0 0 1 8 0" />
    <circle cx="12" cy="19" r="1" fill="currentColor" stroke="none" />
  </svg>
);

export const IconSearch = (p) => (
  <svg {...base} {...p}>
    <circle cx="11" cy="11" r="7" />
    <path d="M20 20l-3.5-3.5" />
  </svg>
);

export const IconMoon = (p) => (
  <svg {...base} {...p}>
    <path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z" />
  </svg>
);

export const IconSun = (p) => (
  <svg {...base} {...p}>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M4 12H2M22 12h-2M5 5l1.5 1.5M17.5 17.5L19 19M19 5l-1.5 1.5M6.5 17.5L5 19" />
  </svg>
);

export const IconStar = ({ filled, ...p }) => (
  <svg {...base} fill={filled ? 'currentColor' : 'none'} {...p}>
    <path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 17l-5.2 2.6 1-5.8L3.5 9.7l5.9-.9z" />
  </svg>
);

export const IconChart = (p) => (
  <svg {...base} {...p}>
    <path d="M4 19V5" />
    <path d="M4 15l4-4 4 3 7-8" />
  </svg>
);

export const IconPlay = (p) => (
  <svg {...base} fill="currentColor" stroke="none" {...p}>
    <path d="M8 5.5v13l11-6.5z" />
  </svg>
);

export const IconPause = (p) => (
  <svg {...base} fill="currentColor" stroke="none" {...p}>
    <rect x="6.5" y="5.5" width="3.5" height="13" rx="1" />
    <rect x="14" y="5.5" width="3.5" height="13" rx="1" />
  </svg>
);

export const IconPlus = (p) => (
  <svg {...base} {...p}><path d="M12 5v14M5 12h14" /></svg>
);

export const IconMinus = (p) => (
  <svg {...base} {...p}><path d="M5 12h14" /></svg>
);

export const IconRefresh = (p) => (
  <svg {...base} {...p}>
    <path d="M20 11a8 8 0 1 0-1.5 5" />
    <path d="M20 5v5h-5" />
  </svg>
);

export const IconLocate = (p) => (
  <svg {...base} {...p}>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
  </svg>
);

export const IconChevron = (p) => (
  <svg {...base} {...p}><path d="M6 9l6 6 6-6" /></svg>
);

export const IconArrowRight = (p) => (
  <svg {...base} {...p}><path d="M5 12h14M13 6l6 6-6 6" /></svg>
);

export const IconClose = (p) => (
  <svg {...base} {...p}><path d="M6 6l12 12M18 6L6 18" /></svg>
);

export const IconCalendar = (p) => (
  <svg {...base} {...p}>
    <rect x="4" y="5" width="16" height="16" rx="3" />
    <path d="M4 9h16M8 3v4M16 3v4" />
  </svg>
);

export const IconSpark = (p) => (
  <svg {...base} fill="currentColor" stroke="none" {...p}>
    <path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z" />
  </svg>
);
