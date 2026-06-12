package com.drift.api.ml;

import com.drift.api.db.Country;
import com.drift.api.db.CountryRepository;
import com.drift.api.metrics.MetricsService;
import org.springframework.stereotype.Service;

import java.util.*;

/**
 * Cross-country correlation between two metrics, using latest values.
 * Returns the scatter points, Pearson's r, and an OLS regression line.
 */
@Service
public class CorrelationService {

    private final MetricsService metricsService;
    private final CountryRepository countryRepository;

    public CorrelationService(MetricsService metricsService, CountryRepository countryRepository) {
        this.metricsService = metricsService;
        this.countryRepository = countryRepository;
    }

    public Map<String, Object> correlate(String metricX, String metricY) {
        Map<String, Double> xs = metricsService.getLatest(metricX);
        Map<String, Double> ys = metricsService.getLatest(metricY);

        Map<String, String> names = new HashMap<>();
        for (Country c : countryRepository.findAll()) names.put(c.getIso2(), c.getName());

        List<String> shared = new ArrayList<>();
        for (String iso2 : xs.keySet()) {
            Double x = xs.get(iso2), y = ys.get(iso2);
            if (x != null && y != null && Double.isFinite(x) && Double.isFinite(y)) shared.add(iso2);
        }
        Collections.sort(shared);
        if (shared.size() < 3) {
            throw new IllegalArgumentException("Not enough overlapping countries to correlate");
        }

        int n = shared.size();
        double[] x = new double[n], y = new double[n];
        List<Map<String, Object>> points = new ArrayList<>(n);
        for (int i = 0; i < n; i++) {
            String iso2 = shared.get(i);
            x[i] = xs.get(iso2);
            y[i] = ys.get(iso2);
            Map<String, Object> p = new LinkedHashMap<>();
            p.put("iso2", iso2);
            p.put("name", names.getOrDefault(iso2, iso2));
            p.put("x", x[i]);
            p.put("y", y[i]);
            points.add(p);
        }

        double r = pearson(x, y);
        LinearRegression.Fit fit = LinearRegression.fit(x, y);

        Map<String, Object> out = new LinkedHashMap<>();
        out.put("x_metric", metricX);
        out.put("y_metric", metricY);
        out.put("n", n);
        out.put("pearson_r", r);
        out.put("r2", r * r);
        out.put("slope", fit.slope());
        out.put("intercept", fit.intercept());
        out.put("points", points);
        return out;
    }

    static double pearson(double[] x, double[] y) {
        int n = x.length;
        double meanX = 0, meanY = 0;
        for (int i = 0; i < n; i++) { meanX += x[i]; meanY += y[i]; }
        meanX /= n;
        meanY /= n;

        double sxy = 0, sxx = 0, syy = 0;
        for (int i = 0; i < n; i++) {
            double dx = x[i] - meanX, dy = y[i] - meanY;
            sxy += dx * dy;
            sxx += dx * dx;
            syy += dy * dy;
        }
        double denom = Math.sqrt(sxx * syy);
        return denom == 0 ? 0 : sxy / denom;
    }
}
