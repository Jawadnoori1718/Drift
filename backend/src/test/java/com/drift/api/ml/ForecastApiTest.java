package com.drift.api.ml;

import com.drift.api.db.Metric;
import com.drift.api.db.MetricRepository;
import com.drift.api.etl.EtlService;
import com.drift.api.etl.SeedLoader;
import com.drift.api.etl.WorldBankClient;
import com.drift.api.metrics.MetricsService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;

import static org.hamcrest.Matchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class ForecastApiTest {

    @Autowired MockMvc mvc;
    @Autowired SeedLoader seedLoader;
    @Autowired EtlService etlService;
    @Autowired MetricRepository metricRepository;
    @Autowired MetricsService metricsService;

    @BeforeEach
    void seedWithHistory() {
        seedLoader.seedIfEmpty();

        // Synthetic exponential GDP history for the US: 3% growth from $30k
        Metric gdp = metricRepository.findByKey("gdp").orElseThrow();
        List<WorldBankClient.DataPoint> points = new ArrayList<>();
        double v = 30000;
        for (int year = 2000; year <= 2023; year++) {
            points.add(new WorldBankClient.DataPoint("USA", "United States", year, v));
            v *= 1.03;
        }
        etlService.upsertPoints(gdp, points);
        metricsService.rebuildCaches();
    }

    @Test
    void forecastReturnsTenYearsWithIntervals() throws Exception {
        mvc.perform(get("/api/forecast/US/gdp"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.model", is("log-linear")))
            .andExpect(jsonPath("$.r2", greaterThan(0.99)))
            .andExpect(jsonPath("$.annual_growth_pct", closeTo(3.0, 0.3)))
            .andExpect(jsonPath("$.points", hasSize(10)))
            .andExpect(jsonPath("$.points[0].year", is(2024)))
            .andExpect(jsonPath("$.points[9].year", is(2033)));
    }

    @Test
    void intervalsContainTheTrendAndWiden() throws Exception {
        String body = mvc.perform(get("/api/forecast/US/gdp"))
            .andExpect(status().isOk())
            .andReturn().getResponse().getContentAsString();

        var mapper = new com.fasterxml.jackson.databind.ObjectMapper();
        var root = mapper.readTree(body);
        var points = root.get("points");

        double firstSpread = -1, lastSpread = -1;
        for (var p : points) {
            double value = p.get("value").asDouble();
            double lower = p.get("lower").asDouble();
            double upper = p.get("upper").asDouble();
            org.junit.jupiter.api.Assertions.assertTrue(lower <= value && value <= upper,
                "value must sit inside its interval");
            double spread = upper - lower;
            if (firstSpread < 0) firstSpread = spread;
            lastSpread = spread;
        }
        org.junit.jupiter.api.Assertions.assertTrue(lastSpread > firstSpread,
            "uncertainty must widen further into the future");
    }

    @Test
    void tooLittleHistoryIsAClientError() throws Exception {
        // Seeded-only metric (hdi has exactly 1 observation per country)
        mvc.perform(get("/api/forecast/US/hdi"))
            .andExpect(status().is4xxClientError());
    }

    @Test
    void unknownCountryIsAClientError() throws Exception {
        mvc.perform(get("/api/forecast/XX/gdp"))
            .andExpect(status().is4xxClientError());
    }
}
