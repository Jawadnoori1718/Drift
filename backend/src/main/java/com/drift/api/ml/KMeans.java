package com.drift.api.ml;

import java.util.Arrays;
import java.util.Random;

/**
 * K-means clustering implemented from scratch: k-means++ seeding followed by
 * Lloyd's algorithm. Deterministic for a fixed random seed.
 */
public final class KMeans {

    private static final int MAX_ITERATIONS = 100;

    private KMeans() {}

    public record Result(int[] assignments, double[][] centroids, int iterations) {}

    public static Result cluster(double[][] data, int k, long seed) {
        if (data.length == 0) throw new IllegalArgumentException("No data points");
        if (k < 1 || k > data.length) {
            throw new IllegalArgumentException("k must be between 1 and the number of points");
        }
        int n = data.length, dims = data[0].length;
        Random rnd = new Random(seed);

        // ── k-means++ seeding: spread initial centroids apart ────────────────
        double[][] centroids = new double[k][];
        centroids[0] = data[rnd.nextInt(n)].clone();
        double[] distSq = new double[n];
        for (int c = 1; c < k; c++) {
            double total = 0;
            for (int i = 0; i < n; i++) {
                double best = Double.MAX_VALUE;
                for (int j = 0; j < c; j++) {
                    best = Math.min(best, squaredDistance(data[i], centroids[j]));
                }
                distSq[i] = best;
                total += best;
            }
            // Sample next centroid proportional to squared distance
            double r = rnd.nextDouble() * total;
            double acc = 0;
            int chosen = n - 1;
            for (int i = 0; i < n; i++) {
                acc += distSq[i];
                if (acc >= r) { chosen = i; break; }
            }
            centroids[c] = data[chosen].clone();
        }

        // ── Lloyd's iterations ───────────────────────────────────────────────
        int[] assignments = new int[n];
        Arrays.fill(assignments, -1);
        int iter = 0;
        for (; iter < MAX_ITERATIONS; iter++) {
            boolean changed = false;

            for (int i = 0; i < n; i++) {
                int best = 0;
                double bestDist = Double.MAX_VALUE;
                for (int c = 0; c < k; c++) {
                    double d = squaredDistance(data[i], centroids[c]);
                    if (d < bestDist) { bestDist = d; best = c; }
                }
                if (assignments[i] != best) { assignments[i] = best; changed = true; }
            }
            if (!changed) break;

            double[][] sums = new double[k][dims];
            int[] counts = new int[k];
            for (int i = 0; i < n; i++) {
                counts[assignments[i]]++;
                double[] row = data[i];
                double[] sum = sums[assignments[i]];
                for (int d = 0; d < dims; d++) sum[d] += row[d];
            }
            for (int c = 0; c < k; c++) {
                if (counts[c] == 0) {
                    // Empty cluster: re-seed at a random point
                    centroids[c] = data[rnd.nextInt(n)].clone();
                    continue;
                }
                for (int d = 0; d < dims; d++) centroids[c][d] = sums[c][d] / counts[c];
            }
        }
        return new Result(assignments, centroids, iter);
    }

    public static double squaredDistance(double[] a, double[] b) {
        double s = 0;
        for (int i = 0; i < a.length; i++) {
            double d = a[i] - b[i];
            s += d * d;
        }
        return s;
    }
}
