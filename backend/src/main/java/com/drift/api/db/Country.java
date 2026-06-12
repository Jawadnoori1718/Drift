package com.drift.api.db;

import jakarta.persistence.*;

@Entity
@Table(name = "country")
public class Country {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 2, unique = true)
    private String iso2;

    @Column(length = 3)
    private String iso3;

    @Column(nullable = false, length = 120)
    private String name;

    protected Country() {}

    public Country(String iso2, String iso3, String name) {
        this.iso2 = iso2;
        this.iso3 = iso3;
        this.name = name;
    }

    public Long getId()      { return id; }
    public String getIso2()  { return iso2; }
    public String getIso3()  { return iso3; }
    public String getName()  { return name; }

    public void setIso3(String iso3) { this.iso3 = iso3; }
    public void setName(String name) { this.name = name; }
}
