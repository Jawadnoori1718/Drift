package com.drift.api.etl;

import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

class WorldBankClientTest {

    private final WorldBankClient client = new WorldBankClient();

    @Test
    void parsesValidResponse() {
        String json = """
            [
              {"page":1,"pages":3,"per_page":2,"total":6},
              [
                {"indicator":{"id":"NY.GDP.PCAP.CD"},"country":{"id":"US","value":"United States"},
                 "countryiso3code":"USA","date":"2022","value":76398.6},
                {"indicator":{"id":"NY.GDP.PCAP.CD"},"country":{"id":"DE","value":"Germany"},
                 "countryiso3code":"DEU","date":"2021","value":51203.5}
              ]
            ]
            """;
        WorldBankClient.ParsedPage page = client.parsePage(json);

        assertEquals(3, page.totalPages());
        assertEquals(2, page.points().size());

        WorldBankClient.DataPoint us = page.points().get(0);
        assertEquals("USA", us.iso3());
        assertEquals("United States", us.countryName());
        assertEquals(2022, us.year());
        assertEquals(76398.6, us.value(), 0.001);
    }

    @Test
    void skipsNullValuesAndBlankCodes() {
        String json = """
            [
              {"page":1,"pages":1,"per_page":10,"total":3},
              [
                {"country":{"id":"US","value":"United States"},"countryiso3code":"USA","date":"2022","value":null},
                {"country":{"id":"1A","value":"Arab World"},"countryiso3code":"","date":"2022","value":12345.0},
                {"country":{"id":"FR","value":"France"},"countryiso3code":"FRA","date":"2022","value":40963.8}
              ]
            ]
            """;
        WorldBankClient.ParsedPage page = client.parsePage(json);

        assertEquals(1, page.points().size());
        assertEquals("FRA", page.points().get(0).iso3());
    }

    @Test
    void handlesMalformedResponseGracefully() {
        assertTrue(client.parsePage("not json at all").points().isEmpty());
        assertTrue(client.parsePage("{\"message\":\"error\"}").points().isEmpty());
        assertTrue(client.parsePage("[]").points().isEmpty());
    }

    @Test
    void aggregateRegionsAreNotInIsoMap() {
        // ETL filters aggregates by ISO3→ISO2 lookup; regions like "Arab World" (ARB) must be absent
        assertNull(IsoCodes.ISO3_TO_ISO2.get("ARB"));
        assertNull(IsoCodes.ISO3_TO_ISO2.get("WLD"));
        assertNull(IsoCodes.ISO3_TO_ISO2.get("EUU"));
        assertEquals("US", IsoCodes.ISO3_TO_ISO2.get("USA"));
        assertEquals("DE", IsoCodes.ISO3_TO_ISO2.get("DEU"));
    }

    @Test
    void parseReturnsEmptyForMissingDataArray() {
        String json = """
            [{"page":1,"pages":1,"per_page":10,"total":0}]
            """;
        List<WorldBankClient.DataPoint> points = client.parsePage(json).points();
        assertTrue(points.isEmpty());
    }
}
