package com.drift.api.etl;

import com.drift.api.db.Metric;
import com.drift.api.db.MetricRepository;
import com.drift.api.db.ObservationRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@ActiveProfiles("test")
@Transactional
class EtlServiceTest {

    @Autowired EtlService etlService;
    @Autowired MetricRepository metricRepository;
    @Autowired ObservationRepository observationRepository;

    @Test
    void upsertIsIdempotentAndUpdatesValues() {
        Metric gdp = metricRepository.findByKey("gdp").orElseThrow();

        List<WorldBankClient.DataPoint> batch1 = List.of(
            new WorldBankClient.DataPoint("USA", "United States", 2020, 63500.0),
            new WorldBankClient.DataPoint("USA", "United States", 2021, 70200.0),
            new WorldBankClient.DataPoint("DEU", "Germany",       2021, 51200.0),
            new WorldBankClient.DataPoint("ARB", "Arab World",    2021, 99999.0)  // aggregate → skipped
        );

        long before = observationRepository.countByMetricId(gdp.getId());
        int written1 = etlService.upsertPoints(gdp, batch1);
        assertEquals(3, written1, "aggregate rows must be filtered out");
        assertEquals(before + 3, observationRepository.countByMetricId(gdp.getId()));

        // Re-run the same batch with one changed value → same row count, value updated
        List<WorldBankClient.DataPoint> batch2 = List.of(
            new WorldBankClient.DataPoint("USA", "United States", 2021, 70999.0)
        );
        etlService.upsertPoints(gdp, batch2);
        assertEquals(before + 3, observationRepository.countByMetricId(gdp.getId()),
            "re-ingesting must not create duplicates");

        var history = observationRepository.findAll().stream()
            .filter(o -> o.getMetricId().equals(gdp.getId()) && o.getYear() == 2021)
            .toList();
        assertTrue(history.stream().anyMatch(o -> o.getValue() == 70999.0),
            "re-ingested value must overwrite the old one");
    }
}
