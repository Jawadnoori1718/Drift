package com.drift.api.metrics;

import com.drift.api.etl.SeedLoader;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import static org.hamcrest.Matchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class MetricsApiTest {

    @Autowired MockMvc mvc;
    @Autowired SeedLoader seedLoader;
    @Autowired MetricsService metricsService;

    @BeforeEach
    void seed() {
        seedLoader.seedIfEmpty();
        metricsService.rebuildCaches();
    }

    @Test
    void latestMetricsReturnsSeedData() throws Exception {
        mvc.perform(get("/api/metrics"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.gdp.US", greaterThan(50000.0)))
            .andExpect(jsonPath("$.life_expectancy.JP", greaterThan(80.0)));
    }

    @Test
    void statusReportsReady() throws Exception {
        mvc.perform(get("/api/metrics/status"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.ready", is(true)))
            .andExpect(jsonPath("$.indicators.gdp", greaterThan(50)));
    }

    @Test
    void seriesReturnsYearMatrix() throws Exception {
        mvc.perform(get("/api/metrics/gdp/series"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.2022.US", greaterThan(50000.0)));
    }

    @Test
    void yearSliceReturnsCountriesForThatYear() throws Exception {
        mvc.perform(get("/api/metrics/gdp/2022"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.US", greaterThan(50000.0)));
    }

    @Test
    void historyReturnsOrderedSeries() throws Exception {
        mvc.perform(get("/api/countries/US/history/gdp"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$", hasSize(greaterThanOrEqualTo(1))))
            .andExpect(jsonPath("$[0].year").exists())
            .andExpect(jsonPath("$[0].value").exists());
    }

    @Test
    void metaListsAllMetricsWithCoverage() throws Exception {
        mvc.perform(get("/api/meta"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$", hasSize(16)))
            .andExpect(jsonPath("$[?(@.key=='gdp')].countries", contains(greaterThan(50))));
    }

    @Test
    void unknownMetricReturnsClientError() throws Exception {
        mvc.perform(get("/api/metrics/nonsense"))
            .andExpect(status().is4xxClientError());
    }

    @Test
    void unknownCountryReturnsClientError() throws Exception {
        mvc.perform(get("/api/countries/XX/history/gdp"))
            .andExpect(status().is4xxClientError());
    }
}
