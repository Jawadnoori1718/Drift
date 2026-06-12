package com.drift.api.trade;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Service;

import java.io.InputStream;
import java.util.*;

@Service
public class TradeService {

    private static final Logger log = LoggerFactory.getLogger(TradeService.class);

    private final ObjectMapper mapper = new ObjectMapper();
    private Map<String, List<TradeFlow>> tradeData = new HashMap<>();

    @PostConstruct
    public void init() {
        try {
            ClassPathResource resource = new ClassPathResource("trade-data.json");
            try (InputStream is = resource.getInputStream()) {
                tradeData = mapper.readValue(is, new TypeReference<>() {});
                log.info("Loaded trade data for {} countries.", tradeData.size());
            }
        } catch (Exception e) {
            log.error("Failed to load trade-data.json: {}", e.getMessage());
        }
    }

    public List<TradeFlow> getTradeFlows(String iso2) {
        return tradeData.getOrDefault(iso2.toUpperCase(), Collections.emptyList());
    }
}
