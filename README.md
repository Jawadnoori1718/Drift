# Drift — World Data Intelligence Platform

> Explore 60+ years of world development data on an interactive 3D globe — and see where it's heading.

Drift is a full-stack data platform that ingests historical indicators for ~200 countries from the World Bank API into a relational database, serves them through a REST API, and visualizes them on a hand-built D3 orthographic globe. On top of the raw data it layers machine learning — trend forecasting and country similarity clustering — implemented from scratch on the backend.

## Features

- 🌍 **Interactive 3D globe** — orthographic projection with drag, momentum, zoom, and choropleth coloring across 16 development metrics (GDP, life expectancy, CO₂, internet adoption, HDI, happiness, and more)
- ⏳ **Time travel** — scrub a timeline from 1960 to today and watch the world change: economies bloom, life expectancy rise, the internet sweep the planet
- 📈 **Country deep-dives** — historical charts for any country and metric, with world ranking and comparison against the global average
- 🔮 **Forecasting** — least-squares trend models project each metric 10 years forward, with honest confidence bands
- 🧭 **Country similarity** — k-means clustering over normalized indicators finds the countries most statistically similar to any selection
- 🔬 **Correlation explorer** — plot any two metrics against each other across all countries, with a fitted regression line and r²

## Architecture

| Layer | Tech | Role |
|---|---|---|
| `frontend/` | React 18 · Vite · D3 v7 | Globe rendering, timeline, charts, panels |
| `backend/` | Spring Boot 3.3 · Java 21 | REST API, scheduled ETL, ML (regression, k-means) |
| database | H2 (file mode) / PostgreSQL | ~190,000 historical observations, Flyway-migrated schema |

```
World Bank API ──► ETL (scheduled, idempotent upserts) ──► Database
                                                              │
React + D3 globe ◄────────── REST API (JSON) ◄────────────────┘
                              ├─ /api/metrics/{metric}/{year}
                              ├─ /api/countries/{iso2}/history/{metric}
                              ├─ /api/forecast/{iso2}/{metric}
                              └─ /api/similar/{iso2}
```

The ML layer is implemented in plain Java — ordinary least squares for forecasting and k-means for similarity — no external ML dependencies.

## Quick start

Requirements: **Java 21**, **Maven 3.9+**, **Node 18+**.

```bash
# Terminal 1 — backend (DB schema is created automatically; data ingests in the background)
cd backend
mvn spring-boot:run

# Terminal 2 — frontend
cd frontend
npm install
npm run dev
```

Open http://localhost:5173. The app is usable immediately from a bundled seed dataset; full historical data finishes ingesting from the World Bank API within a couple of minutes and persists in the database for future runs.

## Testing

```bash
cd backend && mvn test
```

Covers the ETL parsing, the forecasting and clustering math, and the REST layer (MockMvc).

## Data sources

- [World Bank Open Data](https://data.worldbank.org/) — historical indicators (1960–present)
- [UNDP](https://hdr.undp.org/) — Human Development Index
- [World Happiness Report](https://worldhappiness.report/) — happiness scores
- [Transparency International](https://www.transparency.org/) — Corruption Perceptions Index
- [world-atlas](https://github.com/topojson/world-atlas) — TopoJSON country geometry

## License

MIT — see [LICENSE](LICENSE).
