# Drift — World Data Intelligence Platform

> Explore 60+ years of world development data on an interactive 3D globe — and see where it's heading.

Drift is a full-stack data platform. A Spring Boot backend ingests the complete historical record of 13 World Bank indicators (~92,000 observations, 1960–today, ~195 countries) into a relational database through a scheduled, idempotent ETL pipeline, layers machine learning on top — trend forecasting and k-means country similarity, both implemented from scratch — and serves it all through a REST API to a hand-built D3 orthographic globe.

## Features

- 🌍 **Interactive 3D globe** — orthographic projection with drag, momentum, zoom, and choropleth coloring across 16 development metrics (GDP, life expectancy, CO₂, internet adoption, HDI, happiness, corruption, and more)
- ⏳ **Time travel** — scrub a timeline from 1960 to today, or press play and watch the world change: economies bloom, life expectancy rise, the internet sweep the planet
- 📈 **Country deep-dives** — select any country for its full historical curve, world ranking, and comparison against the global average — all year-aware as you scrub
- 🔮 **ML forecasting** — least-squares trend models project each metric 10 years forward with 95% confidence bands. Linear and log-linear models compete per series; the better fit (R² in original units) wins
- 🧭 **Country similarity** — k-means (k-means++ seeding) over z-score-normalized indicators finds each country's nearest statistical neighbours. South Korea's? Japan, then Estonia.
- 🔬 **Correlation explorer** — scatter any two metrics across all countries with an OLS regression line and Pearson's r. Does money buy happiness? (r ≈ 0.75)

## Architecture

| Layer | Tech | Role |
|---|---|---|
| `frontend/` | React 18 · Vite · D3 v7 | Globe, timeline, charts, panels |
| `backend/` | Spring Boot 3.3 · Java 21 | REST API, scheduled ETL, ML (OLS regression, k-means) |
| database | H2 (file mode) · Flyway | ~92,000 historical observations, migrated schema |

```
World Bank API ──► ETL (background virtual thread, idempotent
                        MERGE upserts, retry, weekly refresh) ──► DB
                                                                   │
React + D3 ◄──────────────── REST API (JSON) ◄─────────────────────┘
```

The ML layer is dependency-free Java: ordinary least squares with prediction intervals, and k-means with k-means++ seeding. The bundled seed dataset makes the app fully usable offline on first boot; the ETL enriches it with full history in the background and persists it, so later startups are instant.

### REST API

| Endpoint | Returns |
|---|---|
| `GET /api/metrics` | latest value per country, all metrics |
| `GET /api/metrics/{metric}` | latest values for one metric |
| `GET /api/metrics/{metric}/series` | full year × country matrix (time slider) |
| `GET /api/metrics/{metric}/{year}` | one year's slice |
| `GET /api/countries/{iso2}/history/{metric}` | a country's full series |
| `GET /api/forecast/{iso2}/{metric}` | 10-year projection with 95% intervals |
| `GET /api/similar/{iso2}` | nearest statistical neighbours + cluster |
| `GET /api/correlate/{x}/{y}` | scatter points, Pearson's r, OLS line |
| `GET /api/meta` | metric catalogue with coverage |
| `GET /api/metrics/status` | readiness + ETL state |

## Quick start

Requirements: **Java 21**, **Maven 3.9+**, **Node 18+**.

```bash
# Terminal 1 — backend (schema migrates automatically; data ingests in background)
cd backend
mvn spring-boot:run

# Terminal 2 — frontend
cd frontend
npm install
npm run dev
```

Open http://localhost:5173. The app works immediately from the bundled seed dataset; the full 1960–2024 history finishes ingesting from the World Bank API within a few minutes and persists in `backend/data/` for future runs.

## Testing

```bash
cd backend && mvn test
```

29 tests cover the ETL parsing and upsert idempotency, the regression and clustering math (including that prediction intervals widen with distance and that the US's nearest neighbour is a wealthy country), and the REST layer via MockMvc.

## Data sources

- [World Bank Open Data](https://data.worldbank.org/) — historical indicators (1960–present)
- [UNDP](https://hdr.undp.org/) — Human Development Index
- [World Happiness Report](https://worldhappiness.report/) — happiness scores
- [Transparency International](https://www.transparency.org/) — Corruption Perceptions Index
- [world-atlas](https://github.com/topojson/world-atlas) — TopoJSON country geometry

## License

MIT — see [LICENSE](LICENSE).
