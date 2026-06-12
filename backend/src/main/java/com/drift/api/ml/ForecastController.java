package com.drift.api.ml;

import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/forecast")
public class ForecastController {

    private final ForecastService forecastService;

    public ForecastController(ForecastService forecastService) {
        this.forecastService = forecastService;
    }

    /** 10-year trend projection with 95% prediction intervals. */
    @GetMapping("/{iso2}/{metric}")
    public Map<String, Object> forecast(@PathVariable String iso2, @PathVariable String metric) {
        return forecastService.forecast(iso2, metric);
    }
}
