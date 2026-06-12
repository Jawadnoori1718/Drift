package com.drift.api.ml;

/**
 * Ordinary least squares simple linear regression, implemented from scratch.
 * Provides point predictions and 95% prediction intervals.
 */
public final class LinearRegression {

    private LinearRegression() {}

    /**
     * Fitted model y = intercept + slope·x.
     *
     * @param stdError residual standard error (s)
     * @param meanX    mean of the predictor values
     * @param sxx      sum of squared deviations of x — Σ(xᵢ − x̄)²
     */
    public record Fit(double slope, double intercept, double r2,
                      double stdError, double meanX, double sxx, int n) {

        public double predict(double x) {
            return intercept + slope * x;
        }

        /**
         * Half-width of the 95% prediction interval at x:
         * 1.96 · s · √(1 + 1/n + (x − x̄)²/Sxx).
         * Widens as x moves away from the observed data — honest uncertainty.
         */
        public double intervalHalfWidth(double x) {
            return 1.96 * stdError * Math.sqrt(1.0 + 1.0 / n + Math.pow(x - meanX, 2) / sxx);
        }
    }

    public static Fit fit(double[] x, double[] y) {
        if (x.length != y.length || x.length < 3) {
            throw new IllegalArgumentException("Need at least 3 paired points");
        }
        int n = x.length;

        double meanX = 0, meanY = 0;
        for (int i = 0; i < n; i++) { meanX += x[i]; meanY += y[i]; }
        meanX /= n;
        meanY /= n;

        double sxx = 0, sxy = 0, syy = 0;
        for (int i = 0; i < n; i++) {
            double dx = x[i] - meanX, dy = y[i] - meanY;
            sxx += dx * dx;
            sxy += dx * dy;
            syy += dy * dy;
        }
        if (sxx == 0) throw new IllegalArgumentException("All x values are identical");

        double slope     = sxy / sxx;
        double intercept = meanY - slope * meanX;

        // Residual sum of squares and goodness of fit
        double rss = 0;
        for (int i = 0; i < n; i++) {
            double resid = y[i] - (intercept + slope * x[i]);
            rss += resid * resid;
        }
        double r2 = syy == 0 ? 1.0 : 1.0 - rss / syy;
        double stdError = n > 2 ? Math.sqrt(rss / (n - 2)) : 0.0;

        return new Fit(slope, intercept, r2, stdError, meanX, sxx, n);
    }
}
