package com.drift.api.ml;

import com.drift.api.etl.SeedLoader;
import com.drift.api.metrics.MetricsService;
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
class InsightsApiTest {

    @Autowired MockMvc mvc;
    @Autowired SeedLoader seedLoader;
    @Autowired MetricsService metricsService;

    @BeforeEach
    void seed() {
        seedLoader.seedIfEmpty();
        metricsService.rebuildCaches();
    }

    @Test
    void similarCountriesAreSortedAndExcludeSelf() throws Exception {
        mvc.perform(get("/api/similar/US"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.country", is("US")))
            .andExpect(jsonPath("$.neighbors", hasSize(8)))
            .andExpect(jsonPath("$.neighbors[*].iso2", not(hasItem("US"))))
            .andExpect(jsonPath("$.features_used", is(16)));
    }

    @Test
    void neighborsOfUsLookEconomicallySane() throws Exception {
        // The US's nearest statistical neighbours should be rich countries,
        // not low-income ones — a smoke test that normalization works.
        String body = mvc.perform(get("/api/similar/US"))
            .andExpect(status().isOk())
            .andReturn().getResponse().getContentAsString();

        var mapper = new com.fasterxml.jackson.databind.ObjectMapper();
        var neighbors = mapper.readTree(body).get("neighbors");

        double prev = -1;
        for (var nb : neighbors) {
            double d = nb.get("distance").asDouble();
            org.junit.jupiter.api.Assertions.assertTrue(d >= prev, "neighbors must be sorted by distance");
            prev = d;
        }
        String nearest = neighbors.get(0).get("iso2").asText();
        org.junit.jupiter.api.Assertions.assertTrue(
            java.util.Set.of("CA", "AU", "GB", "DE", "NL", "SE", "NO", "CH", "DK", "IE", "NZ", "AT", "BE", "FI").contains(nearest),
            "nearest neighbor of US should be a wealthy country, got " + nearest);
    }

    @Test
    void correlationOfGdpAndLifeExpectancyIsPositive() throws Exception {
        mvc.perform(get("/api/correlate/gdp/life_expectancy"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.n", greaterThan(50)))
            .andExpect(jsonPath("$.pearson_r", greaterThan(0.3)))
            .andExpect(jsonPath("$.points[0].iso2").exists())
            .andExpect(jsonPath("$.points[0].x").exists())
            .andExpect(jsonPath("$.points[0].y").exists());
    }

    @Test
    void unknownCountryOrMetricIsClientError() throws Exception {
        mvc.perform(get("/api/similar/XX")).andExpect(status().is4xxClientError());
        mvc.perform(get("/api/correlate/gdp/nonsense")).andExpect(status().is4xxClientError());
    }
}
