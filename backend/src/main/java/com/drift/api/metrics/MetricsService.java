package com.drift.api.metrics;

import com.drift.api.db.*;
import com.drift.api.etl.EtlService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.core.annotation.Order;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Read side of the metrics data: serves latest values, per-year slices, full
 * series matrices, and per-country histories from the database, with
 * in-memory caches that are rebuilt whenever the ETL completes.
 */
@Service
public class MetricsService {

    private static final Logger log = LoggerFactory.getLogger(MetricsService.class);

    private final JdbcTemplate jdbc;
    private final MetricRepository metricRepository;
    private final CountryRepository countryRepository;
    private final ObservationRepository observationRepository;

    // metric key → (iso2 → latest value)
    private final Map<String, Map<String, Double>> latestCache = new ConcurrentHashMap<>();
    // metric key → (year → (iso2 → value)) — full matrix for the time slider
    private final Map<String, Map<Integer, Map<String, Double>>> seriesCache = new ConcurrentHashMap<>();

    public MetricsService(JdbcTemplate jdbc,
                          MetricRepository metricRepository,
                          CountryRepository countryRepository,
                          ObservationRepository observationRepository,
                          EtlService etlService) {
        this.jdbc = jdbc;
        this.metricRepository = metricRepository;
        this.countryRepository = countryRepository;
        this.observationRepository = observationRepository;
        etlService.onComplete(this::rebuildCaches);
    }

    /** Build caches once the seed has been loaded (runs before the async ETL finishes). */
    @EventListener(ApplicationReadyEvent.class)
    @Order(10)
    public void warmUp() {
        rebuildCaches();
    }

    public synchronized void rebuildCaches() {
        long start = System.currentTimeMillis();
        Map<String, Map<String, Double>> latest = new HashMap<>();
        Map<String, Map<Integer, Map<String, Double>>> series = new HashMap<>();

        for (Metric metric : metricRepository.findAll()) {
            List<Map<String, Object>> rows = jdbc.queryForList("""
                SELECT c.iso2, o.obs_year, o.obs_value
                FROM observation o
                JOIN country c ON c.id = o.country_id
                WHERE o.metric_id = ?
                """, metric.getId());

            Map<Integer, Map<String, Double>> byYear = new TreeMap<>();
            Map<String, Double> latestVals = new HashMap<>();
            Map<String, Integer> latestYears = new HashMap<>();

            for (Map<String, Object> row : rows) {
                String iso2 = (String) row.get("iso2");
                int year    = ((Number) row.get("obs_year")).intValue();
                double val  = ((Number) row.get("obs_value")).doubleValue();

                byYear.computeIfAbsent(year, y -> new HashMap<>()).put(iso2, val);
                if (year >= latestYears.getOrDefault(iso2, Integer.MIN_VALUE)) {
                    latestYears.put(iso2, year);
                    latestVals.put(iso2, val);
                }
            }
            if (!latestVals.isEmpty()) {
                latest.put(metric.getKey(), latestVals);
                series.put(metric.getKey(), byYear);
            }
        }

        latestCache.clear();
        latestCache.putAll(latest);
        seriesCache.clear();
        seriesCache.putAll(series);
        log.info("Metric caches rebuilt: {} metrics in {}ms",
            latest.size(), System.currentTimeMillis() - start);
    }

    // ── Query API ────────────────────────────────────────────────────────────

    /** Latest value per country, for every metric. Shape: {metric: {iso2: value}} */
    public Map<String, Map<String, Double>> getAllLatest() {
        return Collections.unmodifiableMap(latestCache);
    }

    /** Latest value per country for one metric. */
    public Map<String, Double> getLatest(String metricKey) {
        Map<String, Double> data = latestCache.get(metricKey);
        if (data == null) throw new IllegalArgumentException("Unknown metric: " + metricKey);
        return data;
    }

    /** Full time matrix for one metric: {year: {iso2: value}} — powers the time slider. */
    public Map<Integer, Map<String, Double>> getSeries(String metricKey) {
        Map<Integer, Map<String, Double>> data = seriesCache.get(metricKey);
        if (data == null) throw new IllegalArgumentException("Unknown metric: " + metricKey);
        return data;
    }

    /** One year's slice for one metric: {iso2: value}. */
    public Map<String, Double> getYear(String metricKey, int year) {
        Map<String, Double> slice = getSeries(metricKey).get(year);
        return slice != null ? slice : Map.of();
    }

    /** Historical series for one country+metric: ordered list of {year, value}. */
    public List<Map<String, Object>> getHistory(String iso2, String metricKey) {
        Country country = countryRepository.findByIso2(iso2.toUpperCase())
            .orElseThrow(() -> new NoSuchElementException("Unknown country: " + iso2));
        Metric metric = metricRepository.findByKey(metricKey)
            .orElseThrow(() -> new IllegalArgumentException("Unknown metric: " + metricKey));

        List<Map<String, Object>> out = new ArrayList<>();
        for (Observation o : observationRepository.findHistory(country.getId(), metric.getId())) {
            out.add(Map.of("year", o.getYear(), "value", o.getValue()));
        }
        return out;
    }

    /** Catalogue + coverage info for every metric. */
    public List<Map<String, Object>> getMeta() {
        List<Map<String, Object>> out = new ArrayList<>();
        for (Metric m : metricRepository.findAll()) {
            Map<Integer, Map<String, Double>> series = seriesCache.get(m.getKey());
            Map<String, Object> info = new LinkedHashMap<>();
            info.put("key", m.getKey());
            info.put("label", m.getLabel());
            info.put("unit", m.getUnit());
            info.put("source", m.getSource());
            if (series != null && !series.isEmpty()) {
                List<Integer> years = new ArrayList<>(series.keySet());
                info.put("min_year", years.get(0));
                info.put("max_year", years.get(years.size() - 1));
                info.put("countries", latestCache.getOrDefault(m.getKey(), Map.of()).size());
            }
            out.add(info);
        }
        return out;
    }

    public boolean isReady() {
        return !latestCache.isEmpty();
    }
}
