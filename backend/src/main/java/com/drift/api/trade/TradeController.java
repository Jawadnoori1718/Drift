package com.drift.api.trade;

import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/trade")
public class TradeController {

    private final TradeService tradeService;

    public TradeController(TradeService tradeService) {
        this.tradeService = tradeService;
    }

    @GetMapping("/{iso2}")
    public List<TradeFlow> getTradeFlows(@PathVariable String iso2) {
        return tradeService.getTradeFlows(iso2);
    }
}
