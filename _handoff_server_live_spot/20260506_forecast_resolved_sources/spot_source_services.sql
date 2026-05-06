PRAGMA foreign_keys=OFF;
BEGIN TRANSACTION;
CREATE TABLE spot_source_services (
  service_id INTEGER PRIMARY KEY AUTOINCREMENT,
  continent TEXT,
  service_key TEXT NOT NULL,
  service_name TEXT NOT NULL,
  url_main TEXT,
  type TEXT,
  role TEXT,
  coverage_note TEXT,
  notes_global TEXT,
  has_spot_details TEXT,
  has_forecast TEXT,
  has_wind_stats TEXT,
  priority INTEGER DEFAULT 100,
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO spot_source_services VALUES(1,'Global','kiteforum','Kiteforum Locations','https://se.kiteforum.com/spots','spot_directory','primary_spot_source','Huge global database','Community-driven spot DB','yes','no','no',1,1,'2026-05-02 18:57:03','2026-05-02 18:57:03');
INSERT INTO spot_source_services VALUES(2,'Global','wannakitesurf','Wannakitesurf','https://www.wannakitesurf.com','spot_atlas','secondary_spot_source','Global atlas with GPS','Structured spot atlas','yes','no','no',2,1,'2026-05-02 18:57:03','2026-05-02 18:57:03');
INSERT INTO spot_source_services VALUES(3,'Global','windy_app','Windy.app','https://windy.app/search','meteo_app+spots','forecast_layer','Global wind + spots','Strong for forecast + spot DB','yes','yes','yes',1,1,'2026-05-02 18:57:03','2026-05-02 18:57:03');
INSERT INTO spot_source_services VALUES(4,'Global','ikitesurf','iKitesurf','https://wx.ikitesurf.com/map','meteo_app+stations','wind_station_network','Real-time stations','Very strong real wind network','limited','yes','yes',1,1,'2026-05-02 18:57:03','2026-05-02 18:57:03');
INSERT INTO spot_source_services VALUES(5,'Europe','windguru','Windguru','https://www.windguru.cz','forecast_platform','forecast_reference','Europe + worldwide','Molto usato dai kiter europei','yes','yes','yes',1,1,'2026-05-06 20:04:36','2026-05-06 20:04:36');
INSERT INTO spot_source_services VALUES(6,'Europe','windfinder','Windfinder','https://www.windfinder.com','forecast_platform','forecast_reference','Worldwide','Ottimo per spot costieri e statistiche','yes','yes','yes',1,1,'2026-05-06 20:04:36','2026-05-06 20:04:36');
INSERT INTO spot_source_services VALUES(7,'Europe','meteoblue','Meteoblue','https://www.meteoblue.com','weather_model','secondary_forecast','Worldwide','Buona copertura globale','limited','yes','yes',3,1,'2026-05-06 20:04:36','2026-05-06 20:04:36');
INSERT INTO spot_source_services VALUES(8,'Global','windy','Windy','https://www.windy.com','forecast_platform','multi_model_reference','Worldwide','ECMWF + GFS + modelli multipli','yes','yes','yes',1,1,'2026-05-06 20:04:36','2026-05-06 20:04:36');
INSERT INTO spot_source_services VALUES(9,'Global','openmeteo','Open-Meteo','https://open-meteo.com','weather_api','runtime_forecast','Worldwide','Fonte runtime primaria attuale','limited','yes','yes',1,1,'2026-05-06 20:04:36','2026-05-06 20:04:36');
INSERT INTO spot_source_services VALUES(10,'Global','ecmwf','ECMWF','https://www.ecmwf.int','weather_model','premium_model_reference','Worldwide','Modello europeo ad alta qualità','no','yes','yes',1,1,'2026-05-06 20:04:36','2026-05-06 20:04:36');
INSERT INTO spot_source_services VALUES(11,'Global','noaa','NOAA','https://www.noaa.gov','weather_agency','official_reference','US + oceans','Fonte governativa USA','limited','yes','yes',2,1,'2026-05-06 20:04:36','2026-05-06 20:04:36');
INSERT INTO spot_source_services VALUES(12,'Global','predictwind','PredictWind','https://www.predictwind.com','marine_forecast','marine_reference','Worldwide marine','Molto usato nel sailing/offshore','yes','yes','yes',2,1,'2026-05-06 20:04:36','2026-05-06 20:04:36');
INSERT INTO spot_source_services VALUES(13,'Global','surfline','Surfline','https://www.surfline.com','surf_conditions','wave_wind_support','Surf spots worldwide','Utile per spot wave/ocean','yes','yes','limited',3,1,'2026-05-06 20:04:36','2026-05-06 20:04:36');
INSERT INTO spot_source_services VALUES(14,'Global','ventusky','Ventusky','https://www.ventusky.com','visual_weather','visual_crosscheck','Worldwide','Ottimo per visualizzazione masse aria','limited','yes','limited',4,1,'2026-05-06 20:04:36','2026-05-06 20:04:36');
COMMIT;
