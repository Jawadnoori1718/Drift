package com.drift.api.etl;

import com.drift.api.db.*;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.InputStream;
import java.util.HashMap;
import java.util.Map;

/**
 * Seeds the database from the bundled fallback-metrics.json on first run, so
 * the API serves data immediately — before (and without) any network access.
 * The World Bank ETL then overwrites these values with full history.
 */
@Service
public class SeedLoader {

    private static final Logger log = LoggerFactory.getLogger(SeedLoader.class);

    /** Reference year of each bundled metric snapshot. */
    private static final Map<String, Integer> SEED_YEARS = Map.ofEntries(
        Map.entry("gdp", 2022),              Map.entry("co2", 2021),
        Map.entry("life_expectancy", 2021),  Map.entry("internet", 2021),
        Map.entry("pop_density", 2022),      Map.entry("gini", 2021),
        Map.entry("unemployment", 2022),     Map.entry("urban_pop", 2022),
        Map.entry("health_exp", 2020),       Map.entry("military_exp", 2022),
        Map.entry("infant_mortality", 2021), Map.entry("forest_cover", 2021),
        Map.entry("electricity_access", 2021), Map.entry("hdi", 2022),
        Map.entry("happiness", 2023),        Map.entry("cpi", 2023)
    );

    private final CountryRepository countryRepository;
    private final MetricRepository metricRepository;
    private final ObservationRepository observationRepository;
    private final ObjectMapper mapper = new ObjectMapper();

    public SeedLoader(CountryRepository countryRepository,
                      MetricRepository metricRepository,
                      ObservationRepository observationRepository) {
        this.countryRepository = countryRepository;
        this.metricRepository = metricRepository;
        this.observationRepository = observationRepository;
    }

    @Transactional
    public void seedIfEmpty() {
        if (observationRepository.count() > 0) {
            log.info("Database already has {} observations — skipping seed",
                observationRepository.count());
            return;
        }
        try (InputStream is = getClass().getClassLoader().getResourceAsStream("fallback-metrics.json")) {
            if (is == null) {
                log.warn("fallback-metrics.json not found — skipping seed");
                return;
            }
            JsonNode root = mapper.readTree(is);

            // Pre-create all seed countries
            Map<String, Country> countries = new HashMap<>();
            IsoCodes.SEED_NAMES.forEach((iso2, name) -> {
                Country c = countryRepository.findByIso2(iso2)
                    .orElseGet(() -> countryRepository.save(new Country(iso2, iso3Of(iso2), name)));
                countries.put(iso2, c);
            });

            int seeded = 0;
            var fields = root.fields();
            while (fields.hasNext()) {
                var entry = fields.next();
                String metricKey = entry.getKey();
                Metric metric = metricRepository.findByKey(metricKey).orElse(null);
                if (metric == null) continue;
                int year = SEED_YEARS.getOrDefault(metricKey, 2022);

                var values = entry.getValue().fields();
                while (values.hasNext()) {
                    var kv = values.next();
                    Country country = countries.get(kv.getKey());
                    if (country == null) continue;
                    observationRepository.save(new Observation(
                        country.getId(), metric.getId(), year, kv.getValue().asDouble()));
                    seeded++;
                }
            }
            log.info("Seeded {} observations from bundled dataset", seeded);
        } catch (Exception e) {
            log.error("Seed failed: {}", e.getMessage());
        }
    }

    private static String iso3Of(String iso2) {
        return IsoCodes.ISO3_TO_ISO2.entrySet().stream()
            .filter(e -> e.getValue().equals(iso2))
            .map(Map.Entry::getKey)
            .findFirst().orElse(null);
    }
}
