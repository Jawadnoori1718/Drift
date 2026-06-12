package com.drift.api.ml;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class KMeansTest {

    @Test
    void separatesTwoObviousBlobs() {
        // Blob A around (0,0), blob B around (10,10)
        double[][] data = {
            {0.1, 0.2}, {-0.2, 0.1}, {0.0, -0.1}, {0.3, 0.0},
            {10.1, 9.8}, {9.9, 10.2}, {10.0, 10.1}, {9.8, 9.9},
        };
        KMeans.Result r = KMeans.cluster(data, 2, 42L);

        // All of blob A in one cluster, all of blob B in the other
        int a = r.assignments()[0];
        for (int i = 0; i < 4; i++) assertEquals(a, r.assignments()[i], "blob A must be one cluster");
        int b = r.assignments()[4];
        for (int i = 4; i < 8; i++) assertEquals(b, r.assignments()[i], "blob B must be one cluster");
        assertNotEquals(a, b, "the two blobs must be different clusters");
    }

    @Test
    void deterministicForFixedSeed() {
        double[][] data = new double[40][3];
        java.util.Random rnd = new java.util.Random(7);
        for (double[] row : data)
            for (int j = 0; j < 3; j++) row[j] = rnd.nextDouble() * 10;

        KMeans.Result r1 = KMeans.cluster(data, 4, 42L);
        KMeans.Result r2 = KMeans.cluster(data, 4, 42L);
        assertArrayEquals(r1.assignments(), r2.assignments());
    }

    @Test
    void rejectsBadInputs() {
        double[][] data = {{1, 2}, {3, 4}};
        assertThrows(IllegalArgumentException.class, () -> KMeans.cluster(data, 0, 1L));
        assertThrows(IllegalArgumentException.class, () -> KMeans.cluster(data, 3, 1L));
        assertThrows(IllegalArgumentException.class, () -> KMeans.cluster(new double[0][], 1, 1L));
    }

    @Test
    void pearsonCorrelationSanity() {
        double[] x = {1, 2, 3, 4, 5};
        assertEquals(1.0,  CorrelationService.pearson(x, new double[]{2, 4, 6, 8, 10}), 1e-9);
        assertEquals(-1.0, CorrelationService.pearson(x, new double[]{10, 8, 6, 4, 2}), 1e-9);
        double weak = CorrelationService.pearson(x, new double[]{3, 1, 4, 1, 5});
        assertTrue(Math.abs(weak) < 0.6, "scattered data should correlate weakly");
    }
}
