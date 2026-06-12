-- Metric catalogue. indicator_code is the World Bank API code; NULL means the
-- metric comes from a static source (UNDP / WHR / TI) and is not ETL-refreshed.

INSERT INTO metric (metric_key, label, unit, indicator_code, source) VALUES
('gdp',                'GDP per Capita',      'current USD',                'NY.GDP.PCAP.CD',     'World Bank'),
('co2',                'CO2 Emissions',       't per capita',               'EN.ATM.CO2E.PC',     'World Bank / Global Carbon Project'),
('life_expectancy',    'Life Expectancy',     'years at birth',             'SP.DYN.LE00.IN',     'World Bank'),
('internet',           'Internet Users',      '% of population',            'IT.NET.USER.ZS',     'World Bank / ITU'),
('pop_density',        'Population Density',  'people per km2',             'EN.POP.DNST',        'World Bank'),
('gini',               'Inequality (Gini)',   'index 0-100',                'SI.POV.GINI',        'World Bank'),
('unemployment',       'Unemployment',        '% of labour force',          'SL.UEM.TOTL.ZS',     'World Bank / ILO'),
('urban_pop',          'Urban Population',    '% of total',                 'SP.URB.TOTL.IN.ZS',  'World Bank / UN'),
('health_exp',         'Health Expenditure',  '% of GDP',                   'SH.XPD.CHEX.GD.ZS',  'World Bank / WHO'),
('military_exp',       'Military Expenditure','% of GDP',                   'MS.MIL.XPND.GD.ZS',  'SIPRI'),
('infant_mortality',   'Infant Mortality',    'per 1,000 live births',      'SP.DYN.IMRT.IN',     'World Bank / UN IGME'),
('forest_cover',       'Forest Cover',        '% of land area',             'AG.LND.FRST.ZS',     'World Bank / FAO'),
('electricity_access', 'Electricity Access',  '% of population',            'EG.ELC.ACCS.ZS',     'World Bank / IEA'),
('hdi',                'Human Dev. Index',    'score 0-1',                  NULL,                 'UNDP 2022'),
('happiness',          'Happiness Score',     'score 0-10',                 NULL,                 'World Happiness Report 2023'),
('cpi',                'Corruption Index',    'score 0-100 (higher=cleaner)',NULL,                'Transparency International 2023');
