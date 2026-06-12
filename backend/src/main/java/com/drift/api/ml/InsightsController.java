package com.drift.api.ml;

import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api")
public class InsightsController {

    private final SimilarityService similarityService;
    private final CorrelationService correlationService;

    public InsightsController(SimilarityService similarityService,
                              CorrelationService correlationService) {
        this.similarityService = similarityService;
        this.correlationService = correlationService;
    }

    /** Most statistically similar countries (z-scored features, k-means cluster labels). */
    @GetMapping("/similar/{iso2}")
    public Map<String, Object> similar(@PathVariable String iso2) {
        return similarityService.similar(iso2);
    }

    /** Cross-country scatter of two metrics with Pearson's r and an OLS line. */
    @GetMapping("/correlate/{metricX}/{metricY}")
    public Map<String, Object> correlate(@PathVariable String metricX, @PathVariable String metricY) {
        return correlationService.correlate(metricX, metricY);
    }
}
