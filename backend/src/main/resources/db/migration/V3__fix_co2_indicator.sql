-- The World Bank archived EN.ATM.CO2E.PC; CO2 per-capita now lives under the
-- GHG series (AR5 global-warming-potential basis).
UPDATE metric
SET indicator_code = 'EN.GHG.CO2.PC.CE.AR5'
WHERE metric_key = 'co2';
