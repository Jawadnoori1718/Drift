package com.drift.api.etl;

import com.drift.api.db.Country;
import com.drift.api.db.CountryRepository;
import com.drift.api.db.Metric;
import com.drift.api.db.MetricRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.sql.PreparedStatement;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.atomic.AtomicBoolean;

/**
 * Ingests World Bank history into the observation table.
 * Upserts are idempotent (MERGE keyed on country+metric+year), so the ETL can
 * run repeatedly — on startup and on schedule — without creating duplicates.
 */
@Service
public class EtlService {

    private static final Logger log = LoggerFactory.getLogger(EtlService.class);
    private static final int BATCH_SIZE = 1000;

    private final WorldBankClient worldBankClient;
    private final CountryRepository countryRepository;
    private final MetricRepository metricRepository;
    private final JdbcTemplate jdbc;
    private final List<Runnable> completionListeners = new ArrayList<>();
    private final AtomicBoolean running = new AtomicBoolean(false);

    public EtlService(WorldBankClient worldBankClient,
                      CountryRepository countryRepository,
                      MetricRepository metricRepository,
                      JdbcTemplate jdbc) {
        this.worldBankClient = worldBankClient;
        this.countryRepository = countryRepository;
        this.metricRepository = metricRepository;
        this.jdbc = jdbc;
    }

    /** Register a callback invoked after each full ETL run (e.g. cache rebuild). */
    public void onComplete(Runnable listener) {
        completionListeners.add(listener);
    }

    public boolean isRunning() {
        return running.get();
    }

    /** Run the full ingestion: every World Bank-backed metric, full history. */
    public void runFullIngestion() {
        if (!running.compareAndSet(false, true)) {
            log.info("ETL already running, skipping");
            return;
        }
        try {
            long start = System.currentTimeMillis();
            log.info("ETL starting: full World Bank history ingestion");

            int totalUpserted = 0;
            for (Metric metric : metricRepository.findAll()) {
                if (metric.getIndicatorCode() == null) continue;  // static-source metrics
                try {
                    List<WorldBankClient.DataPoint> points =
                        fetchWithRetry(metric.getIndicatorCode());
                    int n = upsertPoints(metric, points);
                    totalUpserted += n;
                    log.info("  {} → {} observations", metric.getKey(), n);
                } catch (Exception e) {
                    log.warn("  {} → ingestion failed: {}", metric.getKey(), e.getMessage());
                }
            }
            log.info("ETL finished: {} observations upserted in {}s",
                totalUpserted, (System.currentTimeMillis() - start) / 1000);
        } finally {
            running.set(false);
            completionListeners.forEach(Runnable::run);
        }
    }

    /** One retry on transient failures (the World Bank API is occasionally slow). */
    private List<WorldBankClient.DataPoint> fetchWithRetry(String indicatorCode) {
        try {
            return worldBankClient.fetchHistory(indicatorCode);
        } catch (Exception first) {
            log.info("  retrying {} after: {}", indicatorCode, first.getMessage());
            return worldBankClient.fetchHistory(indicatorCode);
        }
    }

    /** Upsert a batch of data points for one metric. Returns rows written. */
    public int upsertPoints(Metric metric, List<WorldBankClient.DataPoint> points) {
        Map<String, Long> countryIds = ensureCountries(points);

        List<Object[]> rows = new ArrayList<>();
        for (WorldBankClient.DataPoint p : points) {
            String iso2 = IsoCodes.ISO3_TO_ISO2.get(p.iso3());
            if (iso2 == null) continue;                       // skip aggregates/regions
            Long countryId = countryIds.get(iso2);
            if (countryId == null) continue;
            rows.add(new Object[]{countryId, metric.getId(), p.year(), p.value()});
        }

        String sql = """
            MERGE INTO observation (country_id, metric_id, obs_year, obs_value)
            KEY (country_id, metric_id, obs_year)
            VALUES (?, ?, ?, ?)
            """;
        for (int i = 0; i < rows.size(); i += BATCH_SIZE) {
            List<Object[]> chunk = rows.subList(i, Math.min(i + BATCH_SIZE, rows.size()));
            jdbc.batchUpdate(sql, chunk, chunk.size(), (PreparedStatement ps, Object[] row) -> {
                ps.setLong(1, (Long) row[0]);
                ps.setLong(2, (Long) row[1]);
                ps.setInt(3, (Integer) row[2]);
                ps.setDouble(4, (Double) row[3]);
            });
        }
        return rows.size();
    }

    /** Make sure every real country in the batch exists; returns iso2 → id. */
    private Map<String, Long> ensureCountries(List<WorldBankClient.DataPoint> points) {
        Map<String, Long> ids = new HashMap<>();
        countryRepository.findAll().forEach(c -> ids.put(c.getIso2(), c.getId()));

        Map<String, WorldBankClient.DataPoint> newOnes = new HashMap<>();
        for (WorldBankClient.DataPoint p : points) {
            String iso2 = IsoCodes.ISO3_TO_ISO2.get(p.iso3());
            if (iso2 != null && !ids.containsKey(iso2)) newOnes.putIfAbsent(iso2, p);
        }
        newOnes.forEach((iso2, p) -> {
            String name = p.countryName() == null || p.countryName().isBlank() ? iso2 : p.countryName();
            Country saved = countryRepository.save(new Country(iso2, p.iso3(), name));
            ids.put(iso2, saved.getId());
        });
        return ids;
    }
}
