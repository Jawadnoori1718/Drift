package com.drift.api.db;

import jakarta.persistence.*;

@Entity
@Table(name = "observation")
public class Observation {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "country_id", nullable = false)
    private Long countryId;

    @Column(name = "metric_id", nullable = false)
    private Long metricId;

    @Column(name = "obs_year", nullable = false)
    private int year;

    @Column(name = "obs_value", nullable = false)
    private double value;

    protected Observation() {}

    public Observation(Long countryId, Long metricId, int year, double value) {
        this.countryId = countryId;
        this.metricId  = metricId;
        this.year      = year;
        this.value     = value;
    }

    public Long getId()        { return id; }
    public Long getCountryId() { return countryId; }
    public Long getMetricId()  { return metricId; }
    public int getYear()       { return year; }
    public double getValue()   { return value; }
}
