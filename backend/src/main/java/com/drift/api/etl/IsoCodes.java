package com.drift.api.etl;

import java.util.Collections;
import java.util.HashMap;
import java.util.Map;

/** ISO 3166-1 lookups shared by the ETL and seed loaders. */
public final class IsoCodes {

    private IsoCodes() {}

    /** alpha-3 → alpha-2. Aggregates (regions, income groups) are absent, which filters them out. */
    public static final Map<String, String> ISO3_TO_ISO2 = buildIso3Map();

    /** alpha-2 → display name for the bundled seed dataset. */
    public static final Map<String, String> SEED_NAMES = buildSeedNames();

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

    private static Map<String, String> buildSeedNames() {
        Map<String, String> m = new HashMap<>();
        m.put("US","United States");      m.put("CN","China");           m.put("JP","Japan");
        m.put("DE","Germany");            m.put("GB","United Kingdom");  m.put("FR","France");
        m.put("IN","India");              m.put("IT","Italy");           m.put("CA","Canada");
        m.put("KR","South Korea");        m.put("AU","Australia");       m.put("BR","Brazil");
        m.put("RU","Russia");             m.put("ES","Spain");           m.put("MX","Mexico");
        m.put("ID","Indonesia");          m.put("SA","Saudi Arabia");    m.put("TR","Turkey");
        m.put("NL","Netherlands");        m.put("CH","Switzerland");     m.put("SE","Sweden");
        m.put("NO","Norway");             m.put("PL","Poland");          m.put("AR","Argentina");
        m.put("SG","Singapore");          m.put("MY","Malaysia");        m.put("TH","Thailand");
        m.put("VN","Vietnam");            m.put("PH","Philippines");     m.put("PK","Pakistan");
        m.put("BD","Bangladesh");         m.put("NZ","New Zealand");     m.put("HK","Hong Kong");
        m.put("AE","United Arab Emirates");m.put("QA","Qatar");          m.put("EG","Egypt");
        m.put("MA","Morocco");            m.put("ZA","South Africa");    m.put("NG","Nigeria");
        m.put("KE","Kenya");              m.put("ET","Ethiopia");        m.put("GH","Ghana");
        m.put("TZ","Tanzania");           m.put("DZ","Algeria");         m.put("IQ","Iraq");
        m.put("IL","Israel");             m.put("IR","Iran");            m.put("AT","Austria");
        m.put("BE","Belgium");            m.put("DK","Denmark");         m.put("FI","Finland");
        m.put("PT","Portugal");           m.put("GR","Greece");          m.put("IE","Ireland");
        m.put("CZ","Czech Republic");     m.put("SK","Slovakia");        m.put("HU","Hungary");
        m.put("RO","Romania");            m.put("UA","Ukraine");         m.put("BY","Belarus");
        m.put("BG","Bulgaria");           m.put("CL","Chile");           m.put("CO","Colombia");
        m.put("PE","Peru");               m.put("VE","Venezuela");       m.put("CR","Costa Rica");
        m.put("EC","Ecuador");            m.put("BO","Bolivia");         m.put("KZ","Kazakhstan");
        m.put("UZ","Uzbekistan");
        return Collections.unmodifiableMap(m);
    }
}
