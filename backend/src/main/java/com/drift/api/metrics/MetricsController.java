package com.drift.api.metrics;

import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/metrics")
public class MetricsController {

    private final MetricsService metricsService;

    public MetricsController(MetricsService metricsService) {
        this.metricsService = metricsService;
    }

    @GetMapping
    public Map<String, Map<String, Double>> getAllMetrics() {
        return metricsService.getAllMetrics();
    }

    @GetMapping("/{metric}")
    public Map<String, Double> getMetric(@PathVariable String metric) {
        Map<String, Double> data = metricsService.getAllMetrics().get(metric);
        if (data == null) throw new IllegalArgumentException("Unknown metric: " + metric);
        return data;
    }

    @GetMapping("/status")
    public Map<String, Object> status() {
        boolean ready = metricsService.isReady();
        Map<String, Integer> counts = new java.util.LinkedHashMap<>();
        metricsService.getAllMetrics().forEach((k, v) -> counts.put(k, v.size()));
        return Map.of("ready", ready, "indicators", counts);
    }
}
