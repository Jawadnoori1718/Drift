package com.drift.api.etl;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

import java.util.ArrayList;
import java.util.List;

/**
 * Fetches full historical series from the World Bank API.
 * One indicator request covers all countries and years (1960–present),
 * paginated when the result set exceeds the page size.
 */
@Component
public class WorldBankClient {

    private static final Logger log = LoggerFactory.getLogger(WorldBankClient.class);

    private static final String URL =
        "https://api.worldbank.org/v2/country/all/indicator/%s?format=json&per_page=20000&date=1960:2025&page=%d";

    private final RestTemplate restTemplate;
    private final ObjectMapper mapper = new ObjectMapper();

    public WorldBankClient() {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(10_000);
        factory.setReadTimeout(60_000);
        this.restTemplate = new RestTemplate(factory);
    }

    /** A single (country, year, value) data point. */
    public record DataPoint(String iso3, String countryName, int year, double value) {}

    /** Fetch the complete history for one indicator across all countries. */
    public List<DataPoint> fetchHistory(String indicatorCode) {
        List<DataPoint> all = new ArrayList<>();
        int page = 1, totalPages = 1;
        do {
            String json = restTemplate.getForObject(String.format(URL, indicatorCode, page), String.class);
            if (json == null) break;
            ParsedPage parsed = parsePage(json);
            totalPages = parsed.totalPages();
            all.addAll(parsed.points());
            page++;
        } while (page <= totalPages);
        log.debug("WB {} → {} data points", indicatorCode, all.size());
        return all;
    }

    record ParsedPage(int totalPages, List<DataPoint> points) {}

    /** Parse one page of a World Bank API response. Package-private for tests. */
    ParsedPage parsePage(String json) {
        try {
            JsonNode root = mapper.readTree(json);
            if (!root.isArray() || root.size() < 2) return new ParsedPage(1, List.of());

            int totalPages = root.get(0).path("pages").asInt(1);
            JsonNode dataArray = root.get(1);
            if (dataArray == null || !dataArray.isArray()) return new ParsedPage(totalPages, List.of());

            List<DataPoint> points = new ArrayList<>();
            for (JsonNode item : dataArray) {
                JsonNode valNode = item.get("value");
                if (valNode == null || valNode.isNull()) continue;
                double value = valNode.asDouble();
                if (!Double.isFinite(value)) continue;

                String iso3 = item.path("countryiso3code").asText("").toUpperCase();
                if (iso3.isBlank()) continue;

                int year = item.path("date").asInt(-1);
                if (year < 1900) continue;

                String name = item.path("country").path("value").asText("");
                points.add(new DataPoint(iso3, name, year, value));
            }
            return new ParsedPage(totalPages, points);
        } catch (Exception e) {
            log.warn("Failed to parse WB response: {}", e.getMessage());
            return new ParsedPage(1, List.of());
        }
    }
}
