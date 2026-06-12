package com.drift.api.metrics;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.io.InputStream;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class MetricsService {

    private static final Logger log = LoggerFactory.getLogger(MetricsService.class);

    // World Bank indicators fetched live
    private static final Map<String, String> WB_INDICATORS = new LinkedHashMap<>();
    static {
        WB_INDICATORS.put("gdp",              "NY.GDP.PCAP.CD");
        WB_INDICATORS.put("co2",              "EN.ATM.CO2E.PC");
        WB_INDICATORS.put("life_expectancy",  "SP.DYN.LE00.IN");
        WB_INDICATORS.put("internet",         "IT.NET.USER.ZS");
        WB_INDICATORS.put("pop_density",      "EN.POP.DNST");
        WB_INDICATORS.put("gini",             "SI.POV.GINI");
        WB_INDICATORS.put("unemployment",     "SL.UEM.TOTL.ZS");
        WB_INDICATORS.put("urban_pop",        "SP.URB.TOTL.IN.ZS");
        WB_INDICATORS.put("health_exp",       "SH.XPD.CHEX.GD.ZS");
        WB_INDICATORS.put("military_exp",     "MS.MIL.XPND.GD.ZS");
        WB_INDICATORS.put("infant_mortality", "SP.DYN.IMRT.IN");
        WB_INDICATORS.put("forest_cover",     "AG.LND.FRST.ZS");
        WB_INDICATORS.put("electricity_access","EG.ELC.ACCS.ZS");
    }

    // mrv=1 = single most-recent value per country (~195 records, fits in per_page=300)
    private static final String WB_URL =
        "https://api.worldbank.org/v2/country/all/indicator/%s?format=json&per_page=300&mrv=1";

    private final RestTemplate restTemplate;
    private final ObjectMapper mapper = new ObjectMapper();

    // cache holds the live merged dataset; starts from fallback, enriched by WB
    private final Map<String, Map<String, Double>> cache = new ConcurrentHashMap<>();

    public MetricsService() {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(8_000);
        factory.setReadTimeout(30_000);
        this.restTemplate = new RestTemplate(factory);
    }

    @PostConstruct
    public void init() {
        loadFallback();
        Thread.ofVirtual().start(this::refresh);
    }

    @Scheduled(fixedDelay = 12 * 60 * 60 * 1000L, initialDelay = 12 * 60 * 60 * 1000L)
    public void scheduledRefresh() {
        refresh();
    }

    // Load bundled static data so the API responds immediately on startup
    private void loadFallback() {
        try (InputStream is = getClass().getClassLoader().getResourceAsStream("fallback-metrics.json")) {
            if (is == null) {
                log.warn("fallback-metrics.json not found on classpath");
                return;
            }
            JsonNode root = mapper.readTree(is);
            root.fields().forEachRemaining(entry -> {
                String metric = entry.getKey();
                Map<String, Double> values = new HashMap<>();
                entry.getValue().fields().forEachRemaining(kv ->
                    values.put(kv.getKey(), kv.getValue().asDouble())
                );
                cache.put(metric, new ConcurrentHashMap<>(values));
            });
            log.info("Fallback metrics loaded: {} indicators", cache.size());
        } catch (Exception e) {
            log.error("Failed to load fallback metrics: {}", e.getMessage());
        }
    }

    // Fetch World Bank data and merge (WB values override fallback per-country)
    public void refresh() {
        log.info("Fetching World Bank metrics ({} indicators)...", WB_INDICATORS.size());
        for (Map.Entry<String, String> entry : WB_INDICATORS.entrySet()) {
            String key       = entry.getKey();
            String indicator = entry.getValue();
            try {
                Map<String, Double> fresh = fetchIndicator(indicator);
                if (!fresh.isEmpty()) {
                    // Merge: keep fallback values for countries not in WB response
                    Map<String, Double> merged = new ConcurrentHashMap<>(
                        cache.getOrDefault(key, Collections.emptyMap())
                    );
                    merged.putAll(fresh);
                    cache.put(key, merged);
                    log.info("  {} → {} countries (WB)", key, fresh.size());
                } else {
                    log.warn("  {} → empty WB response, keeping fallback", key);
                }
            } catch (Exception e) {
                log.warn("  {} → WB fetch failed ({}), keeping fallback", key, e.getMessage());
            }
        }
        log.info("Metrics ready: {} indicators", cache.size());
    }

    public Map<String, Map<String, Double>> getAllMetrics() {
        return Collections.unmodifiableMap(cache);
    }

    public boolean isReady() {
        return !cache.isEmpty();
    }

    // ── World Bank fetch ──────────────────────────────────────────────────────

    private Map<String, Double> fetchIndicator(String indicator) throws Exception {
        String url  = String.format(WB_URL, indicator);
        String json = restTemplate.getForObject(url, String.class);
        if (json == null) return Map.of();

        JsonNode root = mapper.readTree(json);
        if (!root.isArray() || root.size() < 2) {
            log.warn("Unexpected WB response structure for {}", indicator);
            return Map.of();
        }
        JsonNode dataArray = root.get(1);
        if (dataArray == null || !dataArray.isArray()) return Map.of();

        Map<String, Double> result = new HashMap<>();
        for (JsonNode item : dataArray) {
            JsonNode valNode = item.get("value");
            if (valNode == null || valNode.isNull()) continue;

            double value = valNode.asDouble();
            if (!Double.isFinite(value)) continue;

            String iso3 = item.has("countryiso3code")
                ? item.get("countryiso3code").asText("").toUpperCase()
                : "";
            if (iso3.isBlank()) continue;

            String iso2 = ISO3_TO_ISO2.get(iso3);
            if (iso2 == null) continue;

            result.put(iso2, value);
        }
        return result;
    }

    // ── ISO 3166-1 alpha-3 → alpha-2 ─────────────────────────────────────────

    private static final Map<String, String> ISO3_TO_ISO2 = buildIso3Map();

    private static Map<String, String> buildIso3Map() {
        Map<String, String> m = new HashMap<>();
        m.put("AFG","AF"); m.put("ALB","AL"); m.put("DZA","DZ"); m.put("AND","AD");
        m.put("AGO","AO"); m.put("ATG","AG"); m.put("ARG","AR"); m.put("ARM","AM");
        m.put("AUS","AU"); m.put("AUT","AT"); m.put("AZE","AZ"); m.put("BHS","BS");
        m.put("BHR","BH"); m.put("BGD","BD"); m.put("BRB","BB"); m.put("BLR","BY");
        m.put("BEL","BE"); m.put("BLZ","BZ"); m.put("BEN","BJ"); m.put("BTN","BT");
        m.put("BOL","BO"); m.put("BIH","BA"); m.put("BWA","BW"); m.put("BRA","BR");
        m.put("BRN","BN"); m.put("BGR","BG"); m.put("BFA","BF"); m.put("BDI","BI");
        m.put("CPV","CV"); m.put("KHM","KH"); m.put("CMR","CM"); m.put("CAN","CA");
        m.put("CAF","CF"); m.put("TCD","TD"); m.put("CHL","CL"); m.put("CHN","CN");
        m.put("COL","CO"); m.put("COM","KM"); m.put("COD","CD"); m.put("COG","CG");
        m.put("CRI","CR"); m.put("CIV","CI"); m.put("HRV","HR"); m.put("CUB","CU");
        m.put("CYP","CY"); m.put("CZE","CZ"); m.put("DNK","DK"); m.put("DJI","DJ");
        m.put("DOM","DO"); m.put("ECU","EC"); m.put("EGY","EG"); m.put("SLV","SV");
        m.put("GNQ","GQ"); m.put("ERI","ER"); m.put("EST","EE"); m.put("SWZ","SZ");
        m.put("ETH","ET"); m.put("FJI","FJ"); m.put("FIN","FI"); m.put("FRA","FR");
        m.put("GAB","GA"); m.put("GMB","GM"); m.put("GEO","GE"); m.put("DEU","DE");
        m.put("GHA","GH"); m.put("GRC","GR"); m.put("GRD","GD"); m.put("GTM","GT");
        m.put("GIN","GN"); m.put("GNB","GW"); m.put("GUY","GY"); m.put("HTI","HT");
        m.put("HND","HN"); m.put("HUN","HU"); m.put("ISL","IS"); m.put("IND","IN");
        m.put("IDN","ID"); m.put("IRN","IR"); m.put("IRQ","IQ"); m.put("IRL","IE");
        m.put("ISR","IL"); m.put("ITA","IT"); m.put("JAM","JM"); m.put("JPN","JP");
        m.put("JOR","JO"); m.put("KAZ","KZ"); m.put("KEN","KE"); m.put("KIR","KI");
        m.put("PRK","KP"); m.put("KOR","KR"); m.put("KWT","KW"); m.put("KGZ","KG");
        m.put("LAO","LA"); m.put("LVA","LV"); m.put("LBN","LB"); m.put("LSO","LS");
        m.put("LBR","LR"); m.put("LBY","LY"); m.put("LIE","LI"); m.put("LTU","LT");
        m.put("LUX","LU"); m.put("MDG","MG"); m.put("MWI","MW"); m.put("MYS","MY");
        m.put("MDV","MV"); m.put("MLI","ML"); m.put("MLT","MT"); m.put("MHL","MH");
        m.put("MRT","MR"); m.put("MUS","MU"); m.put("MEX","MX"); m.put("FSM","FM");
        m.put("MDA","MD"); m.put("MCO","MC"); m.put("MNG","MN"); m.put("MNE","ME");
        m.put("MAR","MA"); m.put("MOZ","MZ"); m.put("MMR","MM"); m.put("NAM","NA");
        m.put("NRU","NR"); m.put("NPL","NP"); m.put("NLD","NL"); m.put("NZL","NZ");
        m.put("NIC","NI"); m.put("NER","NE"); m.put("NGA","NG"); m.put("MKD","MK");
        m.put("NOR","NO"); m.put("OMN","OM"); m.put("PAK","PK"); m.put("PLW","PW");
        m.put("PAN","PA"); m.put("PNG","PG"); m.put("PRY","PY"); m.put("PER","PE");
        m.put("PHL","PH"); m.put("POL","PL"); m.put("PRT","PT"); m.put("QAT","QA");
        m.put("ROU","RO"); m.put("RUS","RU"); m.put("RWA","RW"); m.put("KNA","KN");
        m.put("LCA","LC"); m.put("VCT","VC"); m.put("WSM","WS"); m.put("SMR","SM");
        m.put("STP","ST"); m.put("SAU","SA"); m.put("SEN","SN"); m.put("SRB","RS");
        m.put("SLE","SL"); m.put("SGP","SG"); m.put("SVK","SK"); m.put("SVN","SI");
        m.put("SLB","SB"); m.put("SOM","SO"); m.put("ZAF","ZA"); m.put("SSD","SS");
        m.put("ESP","ES"); m.put("LKA","LK"); m.put("SDN","SD"); m.put("SUR","SR");
        m.put("SWE","SE"); m.put("CHE","CH"); m.put("SYR","SY"); m.put("TWN","TW");
        m.put("TJK","TJ"); m.put("TZA","TZ"); m.put("THA","TH"); m.put("TLS","TL");
        m.put("TGO","TG"); m.put("TON","TO"); m.put("TTO","TT"); m.put("TUN","TN");
        m.put("TUR","TR"); m.put("TKM","TM"); m.put("TUV","TV"); m.put("UGA","UG");
        m.put("UKR","UA"); m.put("ARE","AE"); m.put("GBR","GB"); m.put("USA","US");
        m.put("URY","UY"); m.put("UZB","UZ"); m.put("VUT","VU"); m.put("VEN","VE");
        m.put("VNM","VN"); m.put("YEM","YE"); m.put("ZMB","ZM"); m.put("ZWE","ZW");
        m.put("XKX","XK"); m.put("PSE","PS"); m.put("MAC","MO"); m.put("HKG","HK");
        return Collections.unmodifiableMap(m);
    }
}
