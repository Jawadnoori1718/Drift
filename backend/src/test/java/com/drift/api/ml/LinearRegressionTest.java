package com.drift.api.ml;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class LinearRegressionTest {

    @Test
    void fitsPerfectLineExactly() {
        // y = 2x + 1
        double[] x = {1, 2, 3, 4, 5};
        double[] y = {3, 5, 7, 9, 11};
        LinearRegression.Fit fit = LinearRegression.fit(x, y);

        assertEquals(2.0, fit.slope(), 1e-9);
        assertEquals(1.0, fit.intercept(), 1e-9);
        assertEquals(1.0, fit.r2(), 1e-9);
        assertEquals(21.0, fit.predict(10), 1e-9);
    }

    @Test
    void noisyDataGivesReasonableFitAndPositiveInterval() {
        double[] x = {2000, 2001, 2002, 2003, 2004, 2005, 2006, 2007};
        double[] y = {10.2,  11.8,  11.9,  14.1,  14.0,  16.3,  15.8,  18.1};
        LinearRegression.Fit fit = LinearRegression.fit(x, y);

        assertTrue(fit.slope() > 0.8 && fit.slope() < 1.4, "slope ~1.05, got " + fit.slope());
        assertTrue(fit.r2() > 0.9, "strong but imperfect fit, got r2=" + fit.r2());

        double half = fit.intervalHalfWidth(2010);
        assertTrue(half > 0, "interval must be positive");
        // Uncertainty grows as we extrapolate further from the data
        assertTrue(fit.intervalHalfWidth(2015) > half);
    }

    @Test
    void rejectsDegenerateInputs() {
        assertThrows(IllegalArgumentException.class,
            () -> LinearRegression.fit(new double[]{1, 2}, new double[]{1, 2}));
        assertThrows(IllegalArgumentException.class,
            () -> LinearRegression.fit(new double[]{1, 2, 3}, new double[]{1, 2}));
        assertThrows(IllegalArgumentException.class,
            () -> LinearRegression.fit(new double[]{5, 5, 5}, new double[]{1, 2, 3}));
    }
}
