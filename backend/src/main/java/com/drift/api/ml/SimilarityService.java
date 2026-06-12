package com.drift.api.ml;

import com.drift.api.db.Country;
import com.drift.api.db.CountryRepository;
import com.drift.api.metrics.MetricsService;
import org.springframework.stereotype.Service;

import java.util.*;

/**
 * Country similarity over the latest values of every metric.
 *
 * Pipeline: build a countries × metrics feature matrix, z-score normalize
 * each column (so GDP in dollars doesn't drown out Gini points), mean-impute
 * the gaps, then (a) rank nearest neighbours by Euclidean distance and
 * (b) label macro-groups with k-means (k=6, k-means++ seeding).
 */
@Service
public class SimilarityService {

    private static final int K = 6;                 // macro clusters
    private static final long SEED = 42L;           // deterministic clustering
    private static final int NEIGHBORS = 8;
    private static final double MIN_COVERAGE = 0.6; // require 60% of metrics present

    private final MetricsService metricsService;
    private final CountryRepository countryRepository;

    public SimilarityService(MetricsService metricsService, CountryRepository countryRepository) {
        this.metricsService = metricsService;
        this.countryRepository = countryRepository;
    }

    public Map<String, Object> similar(String iso2) {
        String target = iso2.toUpperCase();
        FeatureMatrix fm = buildMatrix();

        int idx = fm.index.getOrDefault(target, -1);
        if (idx < 0) {
            throw new NoSuchElementException("No feature data for country: " + iso2);
        }

        // K-means cluster labels
        KMeans.Result km = KMeans.cluster(fm.rows, Math.min(K, fm.rows.length), SEED);
        int cluster = km.assignments()[idx];
        int clusterSize = 0;
        for (int a : km.assignments()) if (a == cluster) clusterSize++;

        // Nearest neighbours by Euclidean distance
        record Neighbor(String iso2, double dist) {}
        List<Neighbor> all = new ArrayList<>();
        for (Map.Entry<String, Integer> e : fm.index.entrySet()) {
            if (e.getKey().equals(target)) continue;
            double d = Math.sqrt(KMeans.squaredDistance(fm.rows[idx], fm.rows[e.getValue()]));
            all.add(new Neighbor(e.getKey(), d));
        }
        all.sort(Comparator.comparingDouble(Neighbor::dist));

        Map<String, String> names = countryNames();
        List<Map<String, Object>> neighbors = new ArrayList<>();
        for (Neighbor nb : all.subList(0, Math.min(NEIGHBORS, all.size()))) {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("iso2", nb.iso2());
            m.put("name", names.getOrDefault(nb.iso2(), nb.iso2()));
            m.put("distance", nb.dist());
            m.put("same_cluster", km.assignments()[fm.index.get(nb.iso2())] == cluster);
            neighbors.add(m);
        }

        Map<String, Object> out = new LinkedHashMap<>();
        out.put("country", target);
        out.put("name", names.getOrDefault(target, target));
        out.put("cluster", cluster);
        out.put("cluster_size", clusterSize);
        out.put("countries_compared", fm.rows.length);
        out.put("features_used", fm.metricKeys.size());
        out.put("neighbors", neighbors);
        return out;
    }

    // ── Feature engineering ──────────────────────────────────────────────────

    private record FeatureMatrix(double[][] rows, Map<String, Integer> index, List<String> metricKeys) {}

    private FeatureMatrix buildMatrix() {
        Map<String, Map<String, Double>> latest = metricsService.getAllLatest();
        List<String> metricKeys = new ArrayList<>(new TreeSet<>(latest.keySet()));

        // Countries with enough coverage
        Map<String, Integer> coverage = new HashMap<>();
        for (String mk : metricKeys) {
            for (String c : latest.get(mk).keySet()) coverage.merge(c, 1, Integer::sum);
        }
        List<String> countries = coverage.entrySet().stream()
            .filter(e -> e.getValue() >= MIN_COVERAGE * metricKeys.size())
            .map(Map.Entry::getKey)
            .sorted()
            .toList();
        if (countries.isEmpty()) throw new IllegalStateException("No countries with sufficient data");

        int n = countries.size(), p = metricKeys.size();
        double[][] raw = new double[n][p];
        boolean[][] present = new boolean[n][p];

        for (int j = 0; j < p; j++) {
            Map<String, Double> col = latest.get(metricKeys.get(j));
            for (int i = 0; i < n; i++) {
                Double v = col.get(countries.get(i));
                if (v != null && Double.isFinite(v)) {
                    raw[i][j] = v;
                    present[i][j] = true;
                }
            }
        }

        // Z-score per column over present values; impute missing as the mean (z=0)
        for (int j = 0; j < p; j++) {
            double sum = 0; int cnt = 0;
            for (int i = 0; i < n; i++) if (present[i][j]) { sum += raw[i][j]; cnt++; }
            double mean = cnt > 0 ? sum / cnt : 0;

            double varSum = 0;
            for (int i = 0; i < n; i++) if (present[i][j]) varSum += Math.pow(raw[i][j] - mean, 2);
            double std = cnt > 1 ? Math.sqrt(varSum / (cnt - 1)) : 1;
            if (std == 0) std = 1;

            for (int i = 0; i < n; i++) {
                raw[i][j] = present[i][j] ? (raw[i][j] - mean) / std : 0.0;
            }
        }

        Map<String, Integer> index = new HashMap<>();
        for (int i = 0; i < n; i++) index.put(countries.get(i), i);
        return new FeatureMatrix(raw, index, metricKeys);
    }

    private Map<String, String> countryNames() {
        Map<String, String> names = new HashMap<>();
        for (Country c : countryRepository.findAll()) names.put(c.getIso2(), c.getName());
        return names;
    }
}
