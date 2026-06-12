package com.drift.api.metrics;

import com.drift.api.etl.EtlService;
import org.springframework.web.bind.annotation.*;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api")
public class MetricsController {

    private final MetricsService metricsService;
    private final EtlService etlService;

    public MetricsController(MetricsService metricsService, EtlService etlService) {
        this.metricsService = metricsService;
        this.etlService = etlService;
    }

    /** Latest value per country for every metric: {metric: {iso2: value}} */
    @GetMapping("/metrics")
    public Map<String, Map<String, Double>> getAllMetrics() {
        return metricsService.getAllLatest();
    }

    /** Health/coverage info. (Literal path wins over the {metric} variable.) */
    @GetMapping("/metrics/status")
    public Map<String, Object> status() {
        Map<String, Integer> counts = new LinkedHashMap<>();
        metricsService.getAllLatest().forEach((k, v) -> counts.put(k, v.size()));
        return Map.of(
            "ready", metricsService.isReady(),
            "etl_running", etlService.isRunning(),
            "indicators", counts
        );
    }

    /** Latest value per country for one metric: {iso2: value} */
    @GetMapping("/metrics/{metric}")
    public Map<String, Double> getMetric(@PathVariable String metric) {
        return metricsService.getLatest(metric);
    }

    /** Full historical matrix for one metric: {year: {iso2: value}} — powers the time slider. */
    @GetMapping("/metrics/{metric}/series")
    public Map<Integer, Map<String, Double>> getSeries(@PathVariable String metric) {
        return metricsService.getSeries(metric);
    }

    /** One year's slice for one metric: {iso2: value} */
    @GetMapping("/metrics/{metric}/{year}")
    public Map<String, Double> getYear(@PathVariable String metric, @PathVariable int year) {
        return metricsService.getYear(metric, year);
    }

    /** Metric catalogue with coverage (year range, country counts). */
    @GetMapping("/meta")
    public List<Map<String, Object>> meta() {
        return metricsService.getMeta();
    }

    /** Historical series for one country and metric: [{year, value}, …] */
    @GetMapping("/countries/{iso2}/history/{metric}")
    public List<Map<String, Object>> history(@PathVariable String iso2, @PathVariable String metric) {
        return metricsService.getHistory(iso2, metric);
    }
}
