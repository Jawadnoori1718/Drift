package com.drift.api.etl;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.core.annotation.Order;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * Startup sequence: seed the DB from the bundled dataset (instant data),
 * then ingest full World Bank history in a background virtual thread.
 * A weekly scheduled run keeps the data fresh.
 */
@Component
public class DataInitializer {

    private static final Logger log = LoggerFactory.getLogger(DataInitializer.class);

    private final SeedLoader seedLoader;
    private final EtlService etlService;
    private final boolean etlOnStartup;

    public DataInitializer(SeedLoader seedLoader,
                           EtlService etlService,
                           @Value("${drift.etl.on-startup:true}") boolean etlOnStartup) {
        this.seedLoader = seedLoader;
        this.etlService = etlService;
        this.etlOnStartup = etlOnStartup;
    }

    @EventListener(ApplicationReadyEvent.class)
    @Order(1)   // seed before MetricsService warms its caches (@Order(10))
    public void onReady() {
        seedLoader.seedIfEmpty();
        if (etlOnStartup) {
            Thread.ofVirtual().name("etl-startup").start(etlService::runFullIngestion);
        } else {
            log.info("Startup ETL disabled (drift.etl.on-startup=false)");
        }
    }

    // Weekly refresh
    @Scheduled(fixedDelay = 7 * 24 * 60 * 60 * 1000L, initialDelay = 7 * 24 * 60 * 60 * 1000L)
    public void scheduledRefresh() {
        if (etlOnStartup) etlService.runFullIngestion();
    }
}
