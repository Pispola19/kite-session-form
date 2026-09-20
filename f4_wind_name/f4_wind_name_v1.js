/**
 * Via del Vento — nome vento da zona + settore + lingua. Non è W1.
 * Catalogo/i18n = JSON accanto (stesso contenuto). Rigenera: python3 f4_wind_name/embed_f4_wind_name_js_v1.py
 */
(function initF4WindNameV1(global) {
  "use strict";

  const SECTOR8 = Object.freeze(["N", "NE", "E", "SE", "S", "SW", "W", "NW"]);
  const ABBR_DEG = Object.freeze({
    N: 0,
    NNE: 22.5,
    NE: 45,
    ENE: 67.5,
    E: 90,
    ESE: 112.5,
    SE: 135,
    SSE: 157.5,
    S: 180,
    SSW: 202.5,
    SW: 225,
    WSW: 247.5,
    W: 270,
    WNW: 292.5,
    NW: 315,
    NNW: 337.5
  });
  const CATALOG = Object.freeze({"schema":"f4_wind_name_catalog_v1","sectors":["N","NE","E","SE","S","SW","W","NW"],"rule":"first_matching_basin_stops_even_if_sector_empty","basins":[{"id":"gibraltar_strait","bbox":{"lat_min":35.7,"lat_max":36.4,"lon_min":-5.9,"lon_max":-5.1},"by_sector":{"N":"","NE":"","E":"levante","SE":"","S":"","SW":"vendaval","W":"","NW":""}},{"id":"iberian_atlantic","bbox":{"lat_min":36.5,"lat_max":43.5,"lon_min":-10.0,"lon_max":-6.2},"by_sector":{"N":"nortada","NE":"","E":"","SE":"","S":"","SW":"","W":"","NW":"nortada"}},{"id":"mediterranean_europe","bbox":{"lat_min":29.0,"lat_max":46.0,"lon_min":-6.0,"lon_max":42.0},"by_sector":{"N":"tramontana","NE":"grecale","E":"levante","SE":"scirocco","S":"ostro","SW":"libeccio","W":"ponente","NW":"maestrale"}},{"id":"arabian_gulf","bbox":{"lat_min":12.0,"lat_max":32.0,"lon_min":47.0,"lon_max":60.0},"by_sector":{"N":"shamal","NE":"nashi","E":"","SE":"kaus","S":"","SW":"suhaili","W":"","NW":"shamal"}},{"id":"south_asia_monsoon","bbox":{"lat_min":5.0,"lat_max":30.0,"lon_min":62.0,"lon_max":100.0},"by_sector":{"N":"","NE":"","E":"","SE":"","S":"","SW":"southwest_monsoon","W":"","NW":""}},{"id":"southern_california","bbox":{"lat_min":32.4,"lat_max":35.6,"lon_min":-121.0,"lon_max":-116.0},"by_sector":{"N":"","NE":"santa_ana","E":"santa_ana","SE":"","S":"","SW":"","W":"","NW":""}},{"id":"baja_coromuel","bbox":{"lat_min":23.8,"lat_max":24.6,"lon_min":-110.8,"lon_max":-110.0},"by_sector":{"N":"","NE":"","E":"","SE":"","S":"","SW":"coromell","W":"coromell","NW":""}},{"id":"pacific_northwest_chinook","bbox":{"lat_min":39.0,"lat_max":54.0,"lon_min":-125.0,"lon_max":-104.0},"by_sector":{"N":"","NE":"","E":"","SE":"","S":"","SW":"chinook","W":"chinook","NW":""}},{"id":"mexico_gulf_norte","bbox":{"lat_min":18.0,"lat_max":30.0,"lon_min":-98.0,"lon_max":-80.0},"by_sector":{"N":"norte","NE":"","E":"","SE":"","S":"","SW":"","W":"","NW":""}},{"id":"chile_puelche","bbox":{"lat_min":-45.0,"lat_max":-35.0,"lon_min":-74.5,"lon_max":-70.0},"by_sector":{"N":"","NE":"","E":"puelche","SE":"","S":"","SW":"","W":"","NW":""}},{"id":"argentina_pampero","bbox":{"lat_min":-41.0,"lat_max":-32.0,"lon_min":-65.0,"lon_max":-56.0},"by_sector":{"N":"","NE":"","E":"","SE":"","S":"pampero","SW":"pampero","W":"","NW":""}},{"id":"west_africa_harmattan","bbox":{"lat_min":4.0,"lat_max":20.0,"lon_min":-18.0,"lon_max":15.0},"by_sector":{"N":"","NE":"harmattan","E":"","SE":"","S":"","SW":"","W":"","NW":""}},{"id":"libya_ghibli","bbox":{"lat_min":24.0,"lat_max":33.0,"lon_min":9.0,"lon_max":25.0},"by_sector":{"N":"","NE":"","E":"","SE":"ghibli","S":"ghibli","SW":"","W":"","NW":""}},{"id":"cape_peninsula","bbox":{"lat_min":-34.6,"lat_max":-33.5,"lon_min":18.0,"lon_max":18.9},"by_sector":{"N":"","NE":"","E":"berg","SE":"cape_doctor","S":"","SW":"","W":"","NW":""}},{"id":"western_australia_doctor","bbox":{"lat_min":-33.5,"lat_max":-31.5,"lon_min":115.0,"lon_max":116.5},"by_sector":{"N":"","NE":"","E":"","SE":"","S":"","SW":"fremantle_doctor","W":"fremantle_doctor","NW":""}},{"id":"nsw_coast","bbox":{"lat_min":-36.5,"lat_max":-32.5,"lon_min":150.5,"lon_max":153.2},"by_sector":{"N":"","NE":"","E":"","SE":"","S":"southerly_buster","SW":"","W":"","NW":"brickfielder"}},{"id":"southeast_australia_brickfielder","bbox":{"lat_min":-38.5,"lat_max":-33.5,"lon_min":138.0,"lon_max":150.4},"by_sector":{"N":"","NE":"","E":"","SE":"","S":"","SW":"","W":"","NW":"brickfielder"}},{"id":"canterbury_nz","bbox":{"lat_min":-44.2,"lat_max":-43.2,"lon_min":171.5,"lon_max":173.5},"by_sector":{"N":"","NE":"","E":"","SE":"","S":"","SW":"","W":"","NW":"canterbury_northwester"}}]});
  const I18N = Object.freeze({"schema":"f4_wind_name_i18n_v1","langs":["it","en","es","de","fr","pl"],"labels":{"tramontana":{"it":"Tramontana","en":"Tramontane","es":"Tramontana","de":"Tramontana","fr":"Tramontane","pl":"Tramontana"},"grecale":{"it":"Grecale","en":"Gregale","es":"Gregal","de":"Gregale","fr":"Grégal","pl":"Grecale"},"levante":{"it":"Levante","en":"Levanter","es":"Levante","de":"Levante","fr":"Levant","pl":"Lewant"},"scirocco":{"it":"Scirocco","en":"Sirocco","es":"Siroco","de":"Schirokko","fr":"Sirocco","pl":"Sirocco"},"ostro":{"it":"Ostro","en":"Ostro","es":"Ostro","de":"Ostro","fr":"Ostro","pl":"Ostro"},"libeccio":{"it":"Libeccio","en":"Southwesterly","es":"Lebeche","de":"Südwestwind","fr":"vent du sud-ouest","pl":"wiatr południowo-zachodni"},"ponente":{"it":"Ponente","en":"Westerly","es":"Poniente","de":"Westwind","fr":"Ponant","pl":"wiatr zachodni"},"maestrale":{"it":"Maestrale","en":"Mistral","es":"Mistral","de":"Mistral","fr":"Mistral","pl":"Mistral"},"norte":{"it":"Norte","en":"Norte","es":"Norte","de":"Norte","fr":"Norte","pl":"Norte"},"santa_ana":{"it":"Santa Ana","en":"Santa Ana","es":"Santa Ana","de":"Santa Ana","fr":"Santa Ana","pl":"Santa Ana"},"puelche":{"it":"Puelche","en":"Puelche","es":"Puelche","de":"Puelche","fr":"Puelche","pl":"Puelche"},"pampero":{"it":"Pampero","en":"Pampero","es":"Pampero","de":"Pampero","fr":"Pampero","pl":"Pampero"},"chinook":{"it":"Chinook","en":"Chinook","es":"Chinook","de":"Chinook","fr":"Chinook","pl":"Chinook"},"coromell":{"it":"Coromell","en":"Coromell","es":"Coromell","de":"Coromell","fr":"Coromell","pl":"Coromell"},"shamal":{"it":"Shamal","en":"Shamal","es":"Shamal","de":"Shamal","fr":"Shamal","pl":"Shamal"},"kaus":{"it":"Kaus","en":"Kaus","es":"Kaus","de":"Kaus","fr":"Kaus","pl":"Kaus"},"suhaili":{"it":"Suhaili","en":"Suhaili","es":"Suhaili","de":"Suhaili","fr":"Suhaili","pl":"Suhaili"},"harmattan":{"it":"Harmattan","en":"Harmattan","es":"Harmattan","de":"Harmattan","fr":"Harmattan","pl":"Harmattan"},"berg":{"it":"Berg","en":"Berg","es":"Berg","de":"Berg","fr":"Berg","pl":"Berg"},"ghibli":{"it":"Ghibli","en":"Ghibli","es":"Ghibli","de":"Ghibli","fr":"Ghibli","pl":"Ghibli"},"buran":{"it":"Buran","en":"Buran","es":"Buran","de":"Buran","fr":"Buran","pl":"Buran"},"karaburan":{"it":"Karaburan","en":"Karaburan","es":"Karaburan","de":"Karaburan","fr":"Karaburan","pl":"Karaburan"},"southwest_monsoon":{"it":"Monsone di sud-ovest","en":"Southwest monsoon","es":"Monzón del suroeste","de":"Südwestmonsun","fr":"Mousson du sud-ouest","pl":"Monsun południowo-zachodni"},"kosa":{"it":"Kosa","en":"Kosa","es":"Kosa","de":"Kosa","fr":"Kosa","pl":"Kosa"},"brickfielder":{"it":"Brickfielder","en":"Brickfielder","es":"Brickfielder","de":"Brickfielder","fr":"Brickfielder","pl":"Brickfielder"},"southerly_buster":{"it":"Southerly Buster","en":"Southerly Buster","es":"Southerly Buster","de":"Southerly Buster","fr":"Southerly Buster","pl":"Southerly Buster"},"canterbury_northwester":{"it":"Canterbury Northwester","en":"Canterbury Northwester","es":"Canterbury Northwester","de":"Canterbury Northwester","fr":"Canterbury Northwester","pl":"Canterbury Northwester"},"nashi":{"it":"Nashi","en":"Nashi","es":"Nashi","de":"Nashi","fr":"Nashi","pl":"Nashi"},"nortada":{"it":"Nortada","en":"Nortada","es":"Nortada","de":"Nortada","fr":"Nortada","pl":"Nortada"},"vendaval":{"it":"Vendaval","en":"Vendaval","es":"Vendaval","de":"Vendaval","fr":"Vendaval","pl":"Vendaval"},"cape_doctor":{"it":"Cape Doctor","en":"Cape Doctor","es":"Cape Doctor","de":"Cape Doctor","fr":"Cape Doctor","pl":"Cape Doctor"},"fremantle_doctor":{"it":"Fremantle Doctor","en":"Fremantle Doctor","es":"Fremantle Doctor","de":"Fremantle Doctor","fr":"Fremantle Doctor","pl":"Fremantle Doctor"}}});

  function sector8(directionLabel) {
    const raw = String(directionLabel || "")
      .trim()
      .toUpperCase()
      .replace(/\s+/g, "");
    if (!Object.prototype.hasOwnProperty.call(ABBR_DEG, raw)) return null;
    const deg = ABBR_DEG[raw];
    return SECTOR8[Math.floor((deg + 22.5) / 45) % 8];
  }

  function isCompassToken(text) {
    return sector8(text) != null;
  }

  function inBbox(lat, lon, bbox) {
    return lat >= bbox.lat_min && lat <= bbox.lat_max && lon >= bbox.lon_min && lon <= bbox.lon_max;
  }

  function resolveWindName(directionLabel, lat, lon, catalog) {
    const sector = sector8(directionLabel);
    if (sector == null || lat == null || lon == null) return "";
    const latN = Number(lat);
    const lonN = Number(lon);
    if (!Number.isFinite(latN) || !Number.isFinite(lonN)) return "";
    const data = catalog || CATALOG;
    const basins = data.basins || [];
    for (let i = 0; i < basins.length; i += 1) {
      const basin = basins[i];
      if (!inBbox(latN, lonN, basin.bbox || {})) continue;
      return String((basin.by_sector && basin.by_sector[sector]) || "").trim();
    }
    return "";
  }

  function labelWindName(key, lang) {
    const id = String(key || "").trim();
    if (!id) return "";
    const pack = (I18N.labels && I18N.labels[id]) || {};
    const lc = String(lang || "it").trim().toLowerCase();
    return String(pack[lc] || pack.it || "").trim();
  }

  global.F4WindNameV1 = Object.freeze({
    CATALOG,
    I18N,
    sector8,
    isCompassToken,
    resolveWindName,
    labelWindName
  });
})(typeof window !== "undefined" ? window : globalThis);

if (typeof module !== "undefined" && module.exports) {
  module.exports = globalThis.F4WindNameV1;
}
