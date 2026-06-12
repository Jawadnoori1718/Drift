package com.drift.api.ml;

import com.drift.api.metrics.MetricsService;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Trend forecasting on a country's historical series.
 *
 * Model selection: both a linear model (y = a + bx) and — when all values are
 * positive — a log-linear model (y = a·e^(bx)) are fitted on the most recent
 * {@value #WINDOW} years, and the one with the higher R² in original units
 * wins. Exponential growers (GDP) pick log-linear; bounded or saturating
 * series (percentages, life expectancy) pick linear.
 */
@Service
public class ForecastService {

    private static final int WINDOW = 30;          // fit on the last 30 data points
    private static final int HORIZON = 10;         // forecast 10 years ahead
    private static final int MIN_POINTS = 5;

    private final MetricsService metricsService;

    public ForecastService(MetricsService metricsService) {
        this.metricsService = metricsService;
    }

    public Map<String, Object> forecast(String iso2, String metricKey) {
        List<Map<String, Object>> history = metricsService.getHistory(iso2, metricKey);
        if (history.size() < MIN_POINTS) {
            throw new IllegalArgumentException(
                "Not enough history to forecast (need " + MIN_POINTS + " points, have " + history.size() + ")");
        }

        List<Map<String, Object>> window = history.size() > WINDOW
            ? history.subList(history.size() - WINDOW, history.size())
            : history;

        int n = window.size();
        double[] years  = new double[n];
        double[] values = new double[n];
        boolean allPositive = true;
        for (int i = 0; i < n; i++) {
            years[i]  = ((Number) window.get(i).get("year")).doubleValue();
            values[i] = ((Number) window.get(i).get("value")).doubleValue();
            if (values[i] <= 0) allPositive = false;
        }

        // Candidate 1: plain linear
        LinearRegression.Fit linearFit = LinearRegression.fit(years, values);
        double linearR2 = r2InOriginalSpace(years, values, linearFit, false);

        // Candidate 2: log-linear (only valid for strictly positive series)
        LinearRegression.Fit logFit = null;
        double logR2 = -Double.MAX_VALUE;
        if (allPositive) {
            double[] logs = new double[n];
            for (int i = 0; i < n; i++) logs[i] = Math.log(values[i]);
            logFit = LinearRegression.fit(years, logs);
            logR2 = r2InOriginalSpace(years, values, logFit, true);
        }

        boolean useLog = logFit != null && logR2 > linearR2;
        LinearRegression.Fit fit = useLog ? logFit : linearFit;
        double r2 = useLog ? logR2 : linearR2;

        int lastYear = (int) years[n - 1];
        List<Map<String, Object>> points = new ArrayList<>();
        for (int h = 1; h <= HORIZON; h++) {
            int year = lastYear + h;
            double pred = fit.predict(year);
            double half = fit.intervalHalfWidth(year);

            double value, lower, upper;
            if (useLog) {
                value = Math.exp(pred);
                lower = Math.exp(pred - half);
                upper = Math.exp(pred + half);
            } else {
                value = pred;
                lower = pred - half;
                upper = pred + half;
            }
            // All our metrics are non-negative quantities
            lower = Math.max(0, lower);
            value = Math.max(0, value);

            Map<String, Object> p = new LinkedHashMap<>();
            p.put("year", year);
            p.put("value", value);
            p.put("lower", lower);
            p.put("upper", upper);
            points.add(p);
        }

        Map<String, Object> out = new LinkedHashMap<>();
        out.put("model", useLog ? "log-linear" : "linear");
        out.put("r2", r2);
        out.put("n", n);
        out.put("window_start", (int) years[0]);
        out.put("window_end", lastYear);
        if (useLog) {
            out.put("annual_growth_pct", (Math.exp(fit.slope()) - 1) * 100);
        } else {
            out.put("annual_change", fit.slope());
        }
        out.put("points", points);
        return out;
    }

    /** R² computed against the untransformed values, so models are comparable. */
    private static double r2InOriginalSpace(double[] x, double[] y,
                                            LinearRegression.Fit fit, boolean logSpace) {
        double meanY = 0;
        for (double v : y) meanY += v;
        meanY /= y.length;

        double rss = 0, syy = 0;
        for (int i = 0; i < y.length; i++) {
            double pred = fit.predict(x[i]);
            if (logSpace) pred = Math.exp(pred);
            rss += (y[i] - pred) * (y[i] - pred);
            syy += (y[i] - meanY) * (y[i] - meanY);
        }
        return syy == 0 ? 1.0 : 1.0 - rss / syy;
    }
}
