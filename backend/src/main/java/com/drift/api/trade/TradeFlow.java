package com.drift.api.trade;

public record TradeFlow(
    String iso2,
    String name,
    double export,
    double imports
) {}
