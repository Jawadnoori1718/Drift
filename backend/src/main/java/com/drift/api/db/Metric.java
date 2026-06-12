package com.drift.api.db;

import jakarta.persistence.*;

@Entity
@Table(name = "metric")
public class Metric {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "metric_key", nullable = false, length = 40, unique = true)
    private String key;

    @Column(nullable = false, length = 80)
    private String label;

    @Column(length = 60)
    private String unit;

    @Column(name = "indicator_code", length = 40)
    private String indicatorCode;

    @Column(length = 120)
    private String source;

    protected Metric() {}

    public Long getId()            { return id; }
    public String getKey()         { return key; }
    public String getLabel()       { return label; }
    public String getUnit()        { return unit; }
    public String getIndicatorCode() { return indicatorCode; }
    public String getSource()      { return source; }
}
