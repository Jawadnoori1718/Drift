// Single source of truth for all 16 indicators: labels, units, hues, formatting.

export const METRICS = {
  gdp:               { label: 'GDP per Capita',   short: 'GDP',          unit: 'USD / capita',      cat: 'economy',      icon: 'economy', emoji: '💰', hue: '#6d5dfc', fmt: (v) => '$' + Math.round(v).toLocaleString(), short_fmt: (v) => v >= 1000 ? '$' + (v/1000).toFixed(0) + 'k' : '$' + Math.round(v) },
  gini:              { label: 'Gini Index',        short: 'Gini',         unit: 'index 0–100',       cat: 'economy',      icon: 'economy', emoji: '⚖️', hue: '#ec4899', fmt: (v) => v.toFixed(1),                short_fmt: (v) => v.toFixed(1) },
  unemployment:      { label: 'Unemployment',      short: 'Unemploy.',    unit: '% labour force',    cat: 'economy',      icon: 'economy', emoji: '📉', hue: '#ef4759', fmt: (v) => v.toFixed(1) + '%',          short_fmt: (v) => v.toFixed(1) + '%' },
  military_exp:      { label: 'Military Spending', short: 'Military',     unit: '% of GDP',          cat: 'economy',      icon: 'economy', emoji: '🛡️', hue: '#f97316', fmt: (v) => v.toFixed(2) + '%',          short_fmt: (v) => v.toFixed(1) + '%' },

  life_expectancy:   { label: 'Life Expectancy',   short: 'Life Exp.',    unit: 'years',             cat: 'society',      icon: 'society', emoji: '❤️', hue: '#22b573', fmt: (v) => v.toFixed(1) + ' yr',        short_fmt: (v) => v.toFixed(1) },
  infant_mortality:  { label: 'Infant Mortality',  short: 'Infant Mort.', unit: 'per 1,000 births',  cat: 'society',      icon: 'society', emoji: '👶', hue: '#ef4759', fmt: (v) => v.toFixed(1),                short_fmt: (v) => v.toFixed(1) },
  health_exp:        { label: 'Health Spending',   short: 'Health',       unit: '% of GDP',          cat: 'society',      icon: 'society', emoji: '🏥', hue: '#14b8a6', fmt: (v) => v.toFixed(1) + '%',          short_fmt: (v) => v.toFixed(1) + '%' },
  urban_pop:         { label: 'Urbanisation',      short: 'Urban',        unit: '% urban',           cat: 'society',      icon: 'society', emoji: '🏙️', hue: '#8b5cf6', fmt: (v) => v.toFixed(1) + '%',          short_fmt: (v) => v.toFixed(0) + '%' },
  happiness:         { label: 'Happiness Score',   short: 'Happiness',    unit: 'score 0–10',        cat: 'society',      icon: 'society', emoji: '😊', hue: '#f59e0b', fmt: (v) => v.toFixed(2),                short_fmt: (v) => v.toFixed(1) },
  hdi:               { label: 'Human Dev. Index',  short: 'HDI',          unit: 'score 0–1',         cat: 'society',      icon: 'society', emoji: '🌟', hue: '#3b82f6', fmt: (v) => v.toFixed(3),                short_fmt: (v) => v.toFixed(2) },

  co2:               { label: 'CO₂ Emissions',     short: 'CO₂',          unit: 't per capita',      cat: 'environment',  icon: 'environment', emoji: '🏭', hue: '#f97316', fmt: (v) => v.toFixed(2) + ' t',     short_fmt: (v) => v.toFixed(1) },
  forest_cover:      { label: 'Forest Cover',      short: 'Forest',       unit: '% land area',       cat: 'environment',  icon: 'environment', emoji: '🌳', hue: '#22b573', fmt: (v) => v.toFixed(1) + '%',      short_fmt: (v) => v.toFixed(0) + '%' },

  internet:          { label: 'Internet Users',    short: 'Internet',     unit: '% population',      cat: 'connectivity', icon: 'connectivity', emoji: '🌐', hue: '#3b82f6', fmt: (v) => v.toFixed(1) + '%',    short_fmt: (v) => v.toFixed(0) + '%' },
  electricity_access:{ label: 'Electricity Access',short: 'Electricity',  unit: '% population',      cat: 'connectivity', icon: 'connectivity', emoji: '⚡', hue: '#f59e0b', fmt: (v) => v.toFixed(1) + '%',    short_fmt: (v) => v.toFixed(0) + '%' },
  pop_density:       { label: 'Population Density', short: 'Density',      unit: 'per km²',           cat: 'connectivity', icon: 'connectivity', emoji: '👥', hue: '#14b8a6', fmt: (v) => v >= 1000 ? (v/1000).toFixed(1)+'k' : v.toFixed(0), short_fmt: (v) => v >= 1000 ? (v/1000).toFixed(1)+'k' : v.toFixed(0) },
  cpi:               { label: 'Anti-Corruption',   short: 'Corruption',   unit: 'CPI 0–100',         cat: 'connectivity', icon: 'connectivity', emoji: '🏛️', hue: '#6d5dfc', fmt: (v) => v.toFixed(0),          short_fmt: (v) => v.toFixed(0) },
};

export const CATEGORIES = [
  { key: 'economy',      label: 'Economy',      sub: 'GDP, Inflation, Spending', icon: 'economy' },
  { key: 'society',      label: 'Society',      sub: 'Health, Education, Life',  icon: 'society' },
  { key: 'environment',  label: 'Environment',  sub: 'Climate, Emissions',      icon: 'environment' },
  { key: 'connectivity', label: 'Connectivity', sub: 'Internet, Access, Tech',  icon: 'connectivity' },
];

export const METRIC_ORDER = Object.keys(METRICS);
