"use strict";

const LIVE_SPOT_CONFIG = {
  ENABLE_REAL: true,
  BASE_URL: "https://api.ventolive.com",
  TIMEOUT_MS: 5000
};

const SESSION_SUBMIT_CONFIG = {
  ENABLE_REAL_SUBMIT: true,
  PRIMARY_URL: "https://nx1smwgmbe.execute-api.us-east-1.amazonaws.com/prod/dam/submit",
  TIMEOUT_MS: 4000
};

const GOOGLE_SECONDARY_CONFIG = {
  ENABLE: true,
  WEBHOOK_URL: "https://script.google.com/macros/s/AKfycbyBvRK58kLL13TwOPPNqyAmNn-eRb-lYKzHsfKr1OG0UAVzHzyhG1l2T_svP_it3IICag/exec",
  TIMEOUT_MS: 25000
};

const WHATSAPP_SECONDARY_CONFIG = {
  ENABLE: true,
  PHONE: "393205316981",
  FALLBACK_DELAY_MS: 800
};

const WHATSAPP_SUMMARY_LANGS = Object.freeze(["it", "en", "de", "es", "fr"]);

// Mappa chiavi UI locali (usate in data-i18n / data-i18n-placeholder) -> chiavi legacy
// presenti in window.RDK_TRANSLATIONS (definito in translations.js).
// REGOLA: NON contiene stringhe tradotte, solo nomi di chiavi.
const LEGACY_KEY_MAP = Object.freeze({
  spot:      "label_location",
  weight:    "label_weight",
  gender:    "label_gender",
  level:     "label_level",
  boardType: "label_board",
  boardSize: "label_board_size",
  kiteSize:  "label_kite_size",
  brand:     "label_brand",
  model:     "label_model",
  wind:      "label_wind",
  water:     "label_water",
  result:    "label_result",
  note:      "label_notes",
  submit:    "btn_send",
  spotPh:    "ph_location",
  weightPh:  "ph_weight",
  windPh:    "ph_wind",
  notePh:    "ph_notes",

  lsReadonlyBadge:     "live_spot_mock_readonly_badge",
  lsPanelTitle:        "live_spot_mock_panel_title",
  lsReadonlyPill:      "live_spot_mock_readonly_pill",
  lsOverviewHeading:   "live_spot_mock_overview_heading",
  lsOverviewSpotLabel: "live_spot_mock_overview_spot",
  lsOverviewConfidence: "live_spot_mock_confidence",
  lsOverviewUpdated:   "live_spot_mock_last_update",
  lsWindNowHeading:    "live_spot_mock_wind_now_heading",
  lsWindSpeed:         "live_spot_mock_wind_speed",
  lsWindDirection:     "live_spot_mock_wind_direction",
  lsWindNameLabel:     "live_spot_mock_wind_name_label",
  lsWindGust:          "live_spot_mock_wind_gust",
  lsAnemometer:        "live_spot_mock_anemometer",
  lsForecastHeading:   "live_spot_mock_forecast_heading",
  lsFc1:               "live_spot_mock_fc_1",
  lsFc2:               "live_spot_mock_fc_2",
  lsFc3:               "live_spot_mock_fc_3"
});

// Mappa value tecnico (legacy) -> chiave label legacy per ogni enum select.
// Il VALUE resta SEMPRE quello legacy: cambia solo la label visibile.
const OPTION_KEY_MAP = Object.freeze({
  level: {
    beginner:    "opt_level_beginner",
    independent: "opt_level_independent",
    advanced:    "opt_level_advanced"
  },
  board: {
    twintip:   "opt_board_twintip",
    surfboard: "opt_board_surfboard",
    foil:      "opt_board_foil"
  },
  gender: {
    M: "opt_gender_male",
    F: "opt_gender_female"
  },
  water: {
    flat:        "opt_water_flat",
    chop_light:  "opt_water_chop_light",
    chop:        "opt_water_chop",
    chop_strong: "opt_water_chop_strong",
    small_waves: "opt_water_small_waves",
    waves:       "opt_water_waves",
    big_waves:   "opt_water_big_waves"
  },
  result: {
    underpowered: "opt_result_underpowered",
    good:         "opt_result_good",
    powered:      "opt_result_powered",
    overpowered:  "opt_result_overpowered",
    survival:     "opt_result_survival"
  }
});

// Prompt option ("seleziona ...") per ciascun select, mappato per data-state-field
const PROMPT_KEY_MAP = Object.freeze({
  "rider.gender":  "opt_gender_prompt",
  "rider.level":   "opt_level_prompt",
  "board.board":   "opt_board_prompt",
  "board.boardSize": "opt_board_size_prompt",
  "water.water":   "opt_water_prompt",
  "result.result": "opt_result_prompt",
  "kite.brand":    "opt_brand_prompt",
  "kite.model":    "opt_model_prompt"
});

// Testo corto solo per prima option dei select (valori tecnici degli option restano invariati).
const SHORT_SELECT_PROMPTS = Object.freeze({
  it: Object.freeze({
    "rider.gender": "-",
    "rider.level": "Livello",
    "board.board": "Tipo",
    "board.boardSize": "Misura",
    "water.water": "Acqua",
    "result.result": "Risultato",
    "kite.brand": "Marca",
    "kite.model": "Modello"
  }),
  en: Object.freeze({
    "rider.gender": "-",
    "rider.level": "Level",
    "board.board": "Board",
    "board.boardSize": "Size",
    "water.water": "Water",
    "result.result": "Result",
    "kite.brand": "Brand",
    "kite.model": "Model"
  }),
  de: Object.freeze({
    "rider.gender": "-",
    "rider.level": "Level",
    "board.board": "Board",
    "board.boardSize": "Größe",
    "water.water": "Wasser",
    "result.result": "Ergebnis",
    "kite.brand": "Marke",
    "kite.model": "Modell"
  }),
  es: Object.freeze({
    "rider.gender": "-",
    "rider.level": "Nivel",
    "board.board": "Tabla",
    "board.boardSize": "Talla",
    "water.water": "Agua",
    "result.result": "Resultado",
    "kite.brand": "Marca",
    "kite.model": "Modelo"
  }),
  fr: Object.freeze({
    "rider.gender": "-",
    "rider.level": "Niveau",
    "board.board": "Planche",
    "board.boardSize": "Taille",
    "water.water": "Eau",
    "result.result": "Résultat",
    "kite.brand": "Marque",
    "kite.model": "Modèle"
  })
});

function shortPromptForSelectPath(path) {
  const lc = String(currentLang || "").toLowerCase();
  const lang = WHATSAPP_SUMMARY_LANGS.includes(lc) ? lc : "it";
  const bucket = SHORT_SELECT_PROMPTS[lang] || SHORT_SELECT_PROMPTS.it;
  return bucket[path] || "";
}

const SHORT_KITE_PLACEHOLDER = Object.freeze({
  it: "Kite",
  en: "Kite",
  de: "Kite",
  es: "Kite",
  fr: "Kite"
});

function shortKiteInputPlaceholder() {
  const lc = String(currentLang || "").toLowerCase();
  const lang = WHATSAPP_SUMMARY_LANGS.includes(lc) ? lc : "it";
  return SHORT_KITE_PLACEHOLDER[lang] || SHORT_KITE_PLACEHOLDER.it;
}

const SPOT_PLACEHOLDER_BY_LANG = Object.freeze({
  it: "es. Is Solinas",
  en: "e.g. Is Solinas",
  de: "z. B. Is Solinas",
  es: "ej. Is Solinas",
  fr: "ex. Is Solinas"
});

function spotInputPlaceholder() {
  const lc = String(currentLang || "").toLowerCase();
  const lang = WHATSAPP_SUMMARY_LANGS.includes(lc) ? lc : "it";
  return SPOT_PLACEHOLDER_BY_LANG[lang] || SPOT_PLACEHOLDER_BY_LANG.it;
}

// Stringhe non coperte da window.RDK_TRANSLATIONS: fallback locale puro UI mock.
// NON contengono value tecnici, solo testo libero che non ha equivalente legacy.
const LOCAL_FALLBACK = Object.freeze({
  windHint: "Separate from Live Spot: this is the declared wind."
});

const WIND_DECLARED_HINT_BY_LANG = Object.freeze({
  it: "Separato dal Live Spot: questo è il vento dichiarato.",
  en: "Separate from Live Spot: this is the wind you enter yourself.",
  de: "Getrennt vom Live Spot: das ist der Wind, den du selbst einträgst.",
  es: "Separado del Live Spot: este es el viento que declaras tú.",
  fr: "Séparé du Live Spot : c’est le vent que tu saisis toi-même."
});

const REQUIRED_FIELD_LABEL_KEYS = Object.freeze({
  "rider.weight": "weight",
  "board.board": "boardType",
  "rider.level": "level",
  "kite.kite": "kiteSize",
  "windUserInput.wind": "wind",
  "result.result": "result"
});

const REQUIRED_FIELD_MESSAGE_BY_LANG = Object.freeze({
  it: "Compila il campo {field}",
  en: "Fill in the {field} field",
  de: "Fülle das Feld {field} aus",
  es: "Completa el campo {field}",
  fr: "Renseigne le champ {field}"
});

function declaredWindHint() {
  const lc = String(currentLang || "").toLowerCase();
  const lang = WHATSAPP_SUMMARY_LANGS.includes(lc) ? lc : "it";
  return WIND_DECLARED_HINT_BY_LANG[lang] || WIND_DECLARED_HINT_BY_LANG.it;
}

const FORECAST_MISSING_BY_LANG = Object.freeze({
  it: "N.P.",
  en: "N.A.",
  de: "k.A.",
  es: "N.D.",
  fr: "N.D."
});

function forecastMissingLabel() {
  const lc = String(currentLang || "").toLowerCase();
  const lang = WHATSAPP_SUMMARY_LANGS.includes(lc) ? lc : "it";
  return FORECAST_MISSING_BY_LANG[lang] || FORECAST_MISSING_BY_LANG.it;
}

const LIVE_SPOT_VIEW_MODE = Object.freeze({
  KITE: "kite",
  METEO: "meteo"
});

const LIVE_SPOT_VIEW_UI_BY_LANG = Object.freeze({
  it: Object.freeze({ group: "Vista Live Spot", kite: "KITER", meteo: "METEO" }),
  en: Object.freeze({ group: "Live Spot view", kite: "KITER", meteo: "METEO" }),
  de: Object.freeze({ group: "Live-Spot-Ansicht", kite: "KITER", meteo: "METEO" }),
  es: Object.freeze({ group: "Vista Live Spot", kite: "KITER", meteo: "METEO" }),
  fr: Object.freeze({ group: "Vue Live Spot", kite: "KITER", meteo: "METEO" })
});

function liveSpotViewUiStrings() {
  const lc = String(currentLang || "").toLowerCase();
  const lang = WHATSAPP_SUMMARY_LANGS.includes(lc) ? lc : "it";
  return LIVE_SPOT_VIEW_UI_BY_LANG[lang] || LIVE_SPOT_VIEW_UI_BY_LANG.it;
}

const LIVE_SPOT_BUTTON_UI = Object.freeze({
  it: Object.freeze({ idle: "Vedi Live Spot", loading: "Cerco vento…", message: "Aggiornamento Live Spot…", disambiguationPrompt: "Scegli la località corretta: ", locationFallback: "Località", updatingWind: "Aggiornamento vento live...", unavailable: "Vento live non disponibile, riprova", updatedPrefix: "Live Spot aggiornato: " }),
  en: Object.freeze({ idle: "View Live Spot", loading: "Fetching wind…", message: "Updating Live Spot…", disambiguationPrompt: "Choose the correct location: ", locationFallback: "Location", updatingWind: "Updating live wind...", unavailable: "Live wind unavailable, try again", updatedPrefix: "Live Spot updated: " }),
  de: Object.freeze({ idle: "Live Spot anzeigen", loading: "Wind wird geladen…", message: "Live Spot wird aktualisiert…", disambiguationPrompt: "Wähle den richtigen Ort: ", locationFallback: "Ort", updatingWind: "Live-Wind wird aktualisiert...", unavailable: "Live-Wind nicht verfügbar, versuche es erneut", updatedPrefix: "Live Spot aktualisiert: " }),
  es: Object.freeze({ idle: "Ver Live Spot", loading: "Buscando viento…", message: "Actualizando Live Spot…", disambiguationPrompt: "Elige la localidad correcta: ", locationFallback: "Localidad", updatingWind: "Actualizando viento live...", unavailable: "Viento live no disponible, vuelve a intentarlo", updatedPrefix: "Live Spot actualizado: " }),
  fr: Object.freeze({ idle: "Voir Live Spot", loading: "Recherche du vent…", message: "Mise à jour du Live Spot…", disambiguationPrompt: "Choisis la bonne localité : ", locationFallback: "Localité", updatingWind: "Mise à jour du vent live...", unavailable: "Vent live indisponible, réessaie", updatedPrefix: "Live Spot mis à jour : " })
});

function liveSpotUiStrings() {
  const lc = String(currentLang || "").toLowerCase();
  const lang = WHATSAPP_SUMMARY_LANGS.includes(lc) ? lc : "it";
  return LIVE_SPOT_BUTTON_UI[lang] || LIVE_SPOT_BUTTON_UI.it;
}

function syncCtaIdlePipelineMessage() {
  if (thankYouBanner && !thankYouBanner.hidden) return;
  if (message) {
    message.textContent = "";
    message.classList.remove("is-error");
  }
}

const LiveSpotReadonlyConnector = (() => {
  const DIR_ABBR_16 = Object.freeze([
    "N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE",
    "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"
  ]);

  const DIR_ARROW_16 = Object.freeze([
    "↑", "↗", "↗", "→", "→", "↘", "↘", "↓",
    "↓", "↙", "↙", "←", "←", "↖", "↖", "↑"
  ]);

  function windDirectionPresentationDeg(deg) {
    if (typeof deg !== "number" || Number.isNaN(deg)) return null;
    const d = ((deg % 360) + 360) % 360;
    const idx = Math.round(d / 22.5) % 16;
    return {
      arrow: DIR_ARROW_16[idx],
      abbr: DIR_ABBR_16[idx],
      idx
    };
  }

  function windDirectionDisplayDeg(deg, mode) {
    if (typeof deg !== "number" || Number.isNaN(deg)) return null;
    const d = ((deg % 360) + 360) % 360;
    return mode === LIVE_SPOT_VIEW_MODE.KITE ? (d + 180) % 360 : d;
  }

  function translateLiveSpotLegacy(legacyKey) {
    const fn = window.__mockUiTranslateLegacy;
    if (typeof fn !== "function" || !legacyKey) return "";
    return fn(legacyKey);
  }

  function formatWindDirectionArrow(deg, mode) {
    const displayDeg = windDirectionDisplayDeg(deg, mode);
    const pres = windDirectionPresentationDeg(displayDeg);
    if (!pres) return "---";
    return pres.arrow;
  }

  function formatWindDirectionDegreesAbbr(deg) {
    const fromDeg = windDirectionDisplayDeg(deg, LIVE_SPOT_VIEW_MODE.METEO);
    const pres = windDirectionPresentationDeg(fromDeg);
    if (fromDeg == null || !pres) return "---";
    const degText = Number.isInteger(fromDeg) ? String(fromDeg) : String(Number(fromDeg.toFixed(1)));
    return `${degText}° ${pres.abbr}`;
  }

  function formatWindDirectionForMode(deg, mode) {
    if (mode === LIVE_SPOT_VIEW_MODE.KITE) {
      return formatWindDirectionArrow(deg, LIVE_SPOT_VIEW_MODE.KITE);
    }
    return formatWindDirectionDegreesAbbr(deg);
  }

  function formatWindDirectionNameI18n(deg) {
    const pres = windDirectionPresentationDeg(deg);
    if (!pres) return "---";
    const text = translateLiveSpotLegacy(`live_spot_mock_wind_name_${pres.idx}`);
    return text ? String(text).trim() : "---";
  }

  function normalizeForecastSlice(raw) {
    if (!raw || typeof raw !== "object") return null;
    const wind_knots = typeof raw.wind_knots === "number" ? raw.wind_knots : null;
    const gust_knots = typeof raw.gust_knots === "number" ? raw.gust_knots : null;
    const wind_direction = typeof raw.wind_direction === "number" ? raw.wind_direction : null;
    const forecast_at = typeof raw.forecast_at === "string" ? raw.forecast_at : null;
    if (
      wind_knots == null &&
      gust_knots == null &&
      wind_direction == null &&
      forecast_at == null
    ) {
      return null;
    }
    return { wind_knots, gust_knots, wind_direction, forecast_at };
  }

  function forecastWindKnShort(fc) {
    if (!fc || typeof fc !== "object" || fc.wind_knots == null) return "--";
    return `${fc.wind_knots} kn`;
  }

  const SAMPLE_LIVE_OK = Object.freeze({
    ok: true,
    spot: "Punta Trettu",
    wind_knots: 18,
    gust_knots: 22,
    wind_direction: 315,
    source: "mock_open_meteo",
    source_type: "forecast",
    confidence: 0.78,
    observed_at: "2026-04-30T12:00:00.000Z",
    updated_at: "2026-04-30T12:05:00.000Z",
    cache: "mock_fresh",
    forecast_1h: {
      wind_knots: 17,
      gust_knots: null,
      wind_direction: 312,
      forecast_at: "2026-04-30T13:00:00.000Z"
    },
    forecast_2h: {
      wind_knots: 18,
      gust_knots: null,
      wind_direction: 318,
      forecast_at: "2026-04-30T14:00:00.000Z"
    },
    forecast_3h: {
      wind_knots: 20,
      gust_knots: 24,
      wind_direction: 320,
      forecast_at: "2026-04-30T15:00:00.000Z"
    }
  });

  const SAMPLE_LIVE_NULL = Object.freeze({
    ok: true,
    spot: "Punta Trettu",
    wind_knots: null,
    gust_knots: null,
    wind_direction: null,
    source: "mock_open_meteo",
    source_type: "forecast",
    confidence: null,
    observed_at: null,
    updated_at: "2026-04-30T12:05:00.000Z",
    cache: "mock_no_data",
    forecast_3h: null
  });

  const SAMPLE_LIVE_ERROR_SAFE = Object.freeze({
    ok: true,
    spot: "Punta Trettu",
    wind_knots: null,
    gust_knots: null,
    wind_direction: null,
    source: null,
    source_type: null,
    confidence: null,
    observed_at: null,
    updated_at: "2026-04-30T12:05:00.000Z",
    cache: "error_safe_response",
    error: "MockError",
    forecast_3h: null
  });

  const READONLY_DEFAULT = Object.freeze({
    spot: "",
    wind_knots: null,
    gust_knots: null,
    wind_direction: null,
    source: null,
    source_type: null,
    confidence: null,
    observed_at: null,
    updated_at: "",
    cache: "mock_no_data",
    error: null,
    forecast_3h: null
  });

  let lastNormalized = READONLY_DEFAULT;

  function normalizeLiveSpotPayload(data) {
    const raw = (data && typeof data === "object") ? data : {};
    const forecastRaw = raw.forecast_3h && typeof raw.forecast_3h === "object" ? raw.forecast_3h : null;
    const forecast1Raw = raw.forecast_1h && typeof raw.forecast_1h === "object" ? raw.forecast_1h : null;
    const forecast2Raw = raw.forecast_2h && typeof raw.forecast_2h === "object" ? raw.forecast_2h : null;
    const sourcesUsedRaw = Array.isArray(raw.sources_used) ? raw.sources_used : null;
    const resolutionRaw = raw.resolution && typeof raw.resolution === "object" ? raw.resolution : null;

    const normalized = {
      ok: Boolean(raw.ok),
      spot: typeof raw.spot === "string" ? raw.spot : "",
      wind_knots: typeof raw.wind_knots === "number" ? raw.wind_knots : null,
      gust_knots: typeof raw.gust_knots === "number" ? raw.gust_knots : null,
      wind_direction: typeof raw.wind_direction === "number" ? raw.wind_direction : null,
      source: typeof raw.source === "string" ? raw.source : null,
      sources_used: sourcesUsedRaw
        ? sourcesUsedRaw.map((v) => String(v || "").trim()).filter(Boolean)
        : null,
      source_type: typeof raw.source_type === "string" ? raw.source_type : null,
      confidence: typeof raw.confidence === "number" ? raw.confidence : null,
      observed_at: typeof raw.observed_at === "string" ? raw.observed_at : null,
      updated_at: typeof raw.updated_at === "string" ? raw.updated_at : "",
      cache: typeof raw.cache === "string" ? raw.cache : "mock_no_data",
      error: typeof raw.error === "string" ? raw.error : null,
      resolution: resolutionRaw ? {
        canonical_spot: typeof resolutionRaw.canonical_spot === "string" ? resolutionRaw.canonical_spot : null
      } : null,
      forecast_1h: normalizeForecastSlice(forecast1Raw),
      forecast_2h: normalizeForecastSlice(forecast2Raw),
      forecast_3h: forecastRaw ? {
        wind_knots: typeof forecastRaw.wind_knots === "number" ? forecastRaw.wind_knots : null,
        gust_knots: typeof forecastRaw.gust_knots === "number" ? forecastRaw.gust_knots : null,
        wind_direction: typeof forecastRaw.wind_direction === "number" ? forecastRaw.wind_direction : null,
        forecast_at: typeof forecastRaw.forecast_at === "string" ? forecastRaw.forecast_at : null
      } : null
    };

    lastNormalized = Object.freeze(normalized);
    return lastNormalized;
  }

  function buildLiveSpotReadonlyState(normalizedPayload) {
    const p = normalizedPayload || READONLY_DEFAULT;
    return {
      speed: p.wind_knots,
      gust: p.gust_knots,
      direction: p.wind_direction == null ? "" : String(p.wind_direction),
      updated_at: p.updated_at || "",
      provider: p.source || "mock_visual",
      meta: {
        cache: p.cache || "mock_no_data",
        confidence: p.confidence,
        source_type: p.source_type,
        observed_at: p.observed_at,
        error: p.error,
        forecast_3h: p.forecast_3h
      }
    };
  }

  function renderLiveSpotReadonly(panelEl, normalizedPayload) {
    if (!panelEl) return;
    const p = normalizedPayload || READONLY_DEFAULT;
    const cards = Array.from(panelEl.querySelectorAll(".info-card"));
    const windNow = cards.find((card) => String(card.className || "").includes("status-ok")) || null;
    if (!windNow) return;
    const spotOverview = cards.find((card) => String(card.className || "").includes("status-search")) || null;

    const windDd = windNow.querySelector('[data-live-spot-dd="wind"]');
    const dirDd = windNow.querySelector('[data-live-spot-dd="direction"]');
    const windNameDd = windNow.querySelector('[data-live-spot-dd="wind_name"]');
    const gustDd = windNow.querySelector('[data-live-spot-dd="gust"]');
    const providerDd = windNow.querySelector('[data-live-spot-dd="anemometer"]');

    if (windDd) {
      windDd.textContent = p.wind_knots == null ? "-- kn" : `${p.wind_knots} kn`;
    }
    if (gustDd) {
      gustDd.textContent = p.gust_knots == null ? "-- kn" : `${p.gust_knots} kn`;
    }
    if (dirDd) {
      dirDd.textContent = formatWindDirectionForMode(p.wind_direction, liveSpotViewMode);
    }
    if (windNameDd) {
      windNameDd.textContent =
        p.wind_direction == null ? "---" : formatWindDirectionNameI18n(p.wind_direction);
    }
    if (providerDd) {
      const missing = forecastMissingLabel();
      const dir = p.wind_direction == null
        ? missing
        : formatWindDirectionDegreesAbbr(p.wind_direction);
      const wind = p.wind_knots == null ? missing : `${p.wind_knots} kn`;
      const gust = p.gust_knots == null ? missing : `${p.gust_knots} kn`;
      providerDd.textContent = `Dir ${dir} · Vel ${wind} · Raff ${gust}`;
    }

    if (spotOverview) {
      const spotDd = spotOverview.querySelector('[data-live-spot-dd="overview_spot"]');
      const confDd = spotOverview.querySelector('[data-live-spot-dd="overview_confidence"]');
      const updatedDd = spotOverview.querySelector('[data-live-spot-dd="overview_updated"]');

      const resolvedSpot =
        (p.spot && String(p.spot).trim()) ||
        (p.resolution && p.resolution.canonical_spot ? String(p.resolution.canonical_spot).trim() : "") ||
        (p.meta && p.meta.resolution && p.meta.resolution.canonical_spot ? String(p.meta.resolution.canonical_spot).trim() : "");

      const pickSpot = translateLiveSpotLegacy("live_spot_mock_pick_spot");

      if (spotDd) {
        spotDd.textContent = resolvedSpot || pickSpot || "---";
      }

      if (confDd) {
        if (typeof p.confidence === "number" && p.confidence >= 0 && p.confidence <= 1) {
          confDd.textContent = `${Math.round(p.confidence * 100)}%`;
        } else {
          confDd.textContent = translateLiveSpotLegacy("live_spot_mock_confidence_pending") || "---";
        }
      }

      if (updatedDd) {
        const rawTs =
          (p.updated_at && String(p.updated_at).trim()) ||
          (p.observed_at && String(p.observed_at).trim()) ||
          (p.meta && p.meta.updated_at ? String(p.meta.updated_at).trim() : "") ||
          (p.meta && p.meta.observed_at ? String(p.meta.observed_at).trim() : "");

        let display = "--:--";
        if (rawTs) {
          const d = new Date(rawTs);
          if (!Number.isNaN(d.getTime())) {
            display = d.toLocaleTimeString("it-IT", {
              hour: "2-digit",
              minute: "2-digit",
              hour12: false
            });
          } else {
            const m = rawTs.match(/T(\\d{2}:\\d{2})/);
            display = m ? m[1] : String(rawTs).slice(0, 5);
            if (!display.includes(":")) display = "--:--";
          }
        }
        updatedDd.textContent = display;
      }
    }

    const fc1 = p.forecast_1h || null;
    const fc2 = p.forecast_2h || null;
    const fc3 = p.forecast_3h || (p.meta && p.meta.forecast_3h) || null;
    const hours = panelEl.querySelector(".hours");
    if (!hours) return;
    const setFc = (slot, fc) => {
      const box = hours.querySelector(`[data-live-spot-fc="${slot}"]`);
      if (!box) return;
      const missing = forecastMissingLabel();
      const hasFc = fc && typeof fc === "object";
      const hasDirection = hasFc && fc.wind_direction != null;
      const valueEl = box.querySelector("strong");
      if (valueEl) valueEl.textContent = hasFc && fc.wind_knots != null ? forecastWindKnShort(fc) : missing;
      let directionEl = box.querySelector(".forecast-direction");
      let windNameEl = box.querySelector(".forecast-name");
      if (!directionEl) {
        directionEl = document.createElement("span");
        directionEl.className = "forecast-direction";
        box.appendChild(directionEl);
      }
      if (!windNameEl) {
        windNameEl = document.createElement("span");
        windNameEl.className = "forecast-name";
        box.appendChild(windNameEl);
      }
      if (!hasFc) {
        directionEl.hidden = true;
        windNameEl.hidden = true;
        directionEl.textContent = "";
        windNameEl.textContent = "";
        return;
      }
      directionEl.hidden = false;
      windNameEl.hidden = false;
      directionEl.textContent = hasDirection ? formatWindDirectionForMode(fc.wind_direction, liveSpotViewMode) : missing;
      windNameEl.textContent = hasDirection ? formatWindDirectionNameI18n(fc.wind_direction) : missing;
    };
    setFc("1", fc1);
    setFc("2", fc2);
    setFc("3", fc3);
  }

  function getReadonlyState() {
    return buildLiveSpotReadonlyState(lastNormalized);
  }

  function getSample(kind) {
    if (kind === "null") return SAMPLE_LIVE_NULL;
    if (kind === "error_safe") return SAMPLE_LIVE_ERROR_SAFE;
    return SAMPLE_LIVE_OK;
  }

  function getLastNormalizedPayload() {
    return lastNormalized;
  }

  return {
    normalizeLiveSpotPayload,
    buildLiveSpotReadonlyState,
    renderLiveSpotReadonly,
    getReadonlyState,
    getSample,
    getLastNormalizedPayload
  };
})();

async function fetchLiveSpotReal(spot, candidate) {
  if (!LIVE_SPOT_CONFIG.ENABLE_REAL) return null;
  if (!spot) return null;

  let url =
    LIVE_SPOT_CONFIG.BASE_URL +
    "/wind/latest?spot=" +
    encodeURIComponent(spot);

  if (
    candidate &&
    typeof candidate.lat === "number" &&
    typeof candidate.lon === "number"
  ) {
    url +=
      "&lat=" +
      encodeURIComponent(String(candidate.lat)) +
      "&lon=" +
      encodeURIComponent(String(candidate.lon));
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), LIVE_SPOT_CONFIG.TIMEOUT_MS);

    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);

    if (!res.ok) throw new Error("HTTP_" + res.status);

    return await res.json();
  } catch (err) {
    return {
      ok: true,
      wind_knots: null,
      gust_knots: null,
      wind_direction: null,
      cache: "ui_fetch_error",
      error: err.message
    };
  }
}

async function submitSessionPrimary(legacyPayload) {
  if (!SESSION_SUBMIT_CONFIG.ENABLE_REAL_SUBMIT) {
    return { ok: true, skipped: true, reason: "real_submit_disabled" };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), SESSION_SUBMIT_CONFIG.TIMEOUT_MS);

  try {
    const res = await fetch(SESSION_SUBMIT_CONFIG.PRIMARY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(legacyPayload),
      signal: controller.signal
    });

    clearTimeout(timeout);

    let data = null;
    try {
      data = await res.json();
    } catch (_) {
      data = null;
    }

    if (!res.ok) {
      return {
        ok: false,
        error: "HTTP_" + res.status,
        response: data
      };
    }

    return data || { ok: true };

  } catch (err) {
    clearTimeout(timeout);
    return {
      ok: false,
      error: err && err.message ? err.message : "submit_failed"
    };
  }
}

async function submitSessionToGoogleSecondary(legacyPayload) {
  if (GOOGLE_SECONDARY_CONFIG.ENABLE !== true) {
    return { ok: true, skipped: true, reason: "google_secondary_disabled" };
  }

  const url = String(GOOGLE_SECONDARY_CONFIG.WEBHOOK_URL || "").trim();
  if (!url) {
    return { ok: false, error: "google_webhook_missing" };
  }

  const lp = legacyPayload && typeof legacyPayload === "object" ? legacyPayload : {};

  const googlePayload = {
    session_id: lp.session_id,
    technical_id: lp.technical_id,
    event_ts: lp.event_ts,
    src: lp.src,

    peso_kg: lp.weight,
    gender: lp.gender,
    tavola_tipo: lp.board,
    tavola_misura: lp.boardSize,
    livello: lp.level,
    kite_m2: lp.kite,
    marca: lp.brand,
    modello: lp.model,
    vento_kn: lp.wind,
    spot: lp.location,
    acqua: lp.water,
    risultato: lp.result,
    note: lp.note
  };

  return await new Promise((resolve) => {
    const targetName = `rdk-google-secondary-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const iframe = document.createElement("iframe");
    const postForm = document.createElement("form");

    let settled = false;
    const settle = (value) => {
      if (settled) return;
      settled = true;
      if (value && value.ok === true) {
        window.setTimeout(() => {
          cleanup();
          resolve(value);
        }, 1000);
        return;
      }
      cleanup();
      resolve(value);
    };

    const cleanup = () => {
      iframe.removeEventListener("load", onLoad);
      if (timeoutId) window.clearTimeout(timeoutId);
      try { postForm.remove(); } catch (_) {}
      try { iframe.remove(); } catch (_) {}
    };

    const onLoad = () => {
      settle({ ok: true, probable: true, source: "iframe_load" });
    };

    const timeoutId = window.setTimeout(() => {
      settle({ ok: false, error: "google_timeout" });
    }, GOOGLE_SECONDARY_CONFIG.TIMEOUT_MS);

    try {
      iframe.id = targetName;
      iframe.name = targetName;
      iframe.setAttribute("aria-hidden", "true");
      iframe.style.display = "none";
      iframe.style.width = "0";
      iframe.style.height = "0";
      iframe.style.border = "0";
      iframe.addEventListener("load", onLoad);

      postForm.method = "POST";
      postForm.action = url;
      postForm.target = targetName;
      postForm.style.display = "none";
      postForm.acceptCharset = "UTF-8";

      Object.entries(googlePayload).forEach(([key, value]) => {
        const input = document.createElement("input");
        input.type = "hidden";
        input.name = key;
        input.value = value == null ? "" : String(value);
        postForm.appendChild(input);
      });

      document.body.appendChild(iframe);
      document.body.appendChild(postForm);
      postForm.submit();
    } catch (err) {
      settle({
        ok: false,
        error: err && err.message ? err.message : "google_secondary_failed"
      });
    }
  });
}

function renderLiveSpotReadonly(payload) {
  LiveSpotReadonlyConnector.renderLiveSpotReadonly(liveSpotPanel, payload);
}

let currentLang = "it";
let liveSpotViewMode = LIVE_SPOT_VIEW_MODE.KITE;

if (typeof window.RDK_TRANSLATIONS === "undefined") {
  console.warn("[mock_ui] window.RDK_TRANSLATIONS non disponibile: assicurati di caricare translations.js prima di mock_ui.js. Uso fallback EN minimi.");
}

if (typeof window.MOCK_DATA === "undefined") {
  console.warn("[mock_ui] MOCK_DATA non disponibile: assicurati di caricare static_data.js prima di mock_ui.js. Uso fallback minimi.");
}

const MOCK_DATA = window.MOCK_DATA || Object.freeze({
  CANONICAL_VALUES: {
    level: {
      beginner: "Beginner",
      independent: "Independent",
      advanced: "Advanced"
    },
    water: {
      flat: "Flat",
      chop_light: "Chop light",
      chop: "Chop",
      chop_strong: "Chop strong",
      small_waves: "Small waves",
      waves: "Waves",
      big_waves: "Big waves"
    },
    result: {
      underpowered: "Underpowered",
      good: "Good",
      powered: "Powered",
      overpowered: "Overpowered",
      survival: "Survival"
    },
    board: {
      twintip: "Twintip",
      surfboard: "Surfboard",
      foil: "Foil"
    },
    gender: {
      M: "Male",
      F: "Female"
    }
  },
  BRAND_LIST: [],
  MODELS_BY_BRAND: {}
});

const OPTION_VALUES = {
  level:  Object.keys(MOCK_DATA.CANONICAL_VALUES.level),
  water:  Object.keys(MOCK_DATA.CANONICAL_VALUES.water),
  result: Object.keys(MOCK_DATA.CANONICAL_VALUES.result),
  board:  Object.keys(MOCK_DATA.CANONICAL_VALUES.board),
  gender: Object.keys(MOCK_DATA.CANONICAL_VALUES.gender),
  brand:  MOCK_DATA.BRAND_LIST,
  model:  []
};

function tLegacy(legacyKey) {
  const T = window.RDK_TRANSLATIONS;
  if (!T || !legacyKey) return "";
  const dict = T[currentLang] || T.en || T.it;
  if (dict && Object.prototype.hasOwnProperty.call(dict, legacyKey)) return dict[legacyKey];
  if (T.en && Object.prototype.hasOwnProperty.call(T.en, legacyKey)) return T.en[legacyKey];
  return "";
}

window.__mockUiTranslateLegacy = function (legacyKey) {
  return tLegacy(legacyKey);
};

function t(key) {
  if (key === "windHint") return declaredWindHint();
  if (key === "spotPh") return spotInputPlaceholder();
  const legacyKey = LEGACY_KEY_MAP[key];
  if (legacyKey) {
    const v = tLegacy(legacyKey);
    if (v) return v;
  }
  const direct = tLegacy(key);
  if (direct) return direct;
  if (Object.prototype.hasOwnProperty.call(LOCAL_FALLBACK, key)) {
    return LOCAL_FALLBACK[key];
  }
  return "";
}

function tOption(category, value) {
  const map = OPTION_KEY_MAP[category];
  if (!map) return value;
  const legacyKey = map[value];
  if (!legacyKey) return value;
  return tLegacy(legacyKey) || value;
}

function tPrompt(path) {
  const legacyKey = PROMPT_KEY_MAP[path];
  if (!legacyKey) return "";
  return tLegacy(legacyKey) || "";
}

function populateSelect(field, values, labels, promptText) {
  if (!field) return;
  const previous = String(field.value || "");
  field.innerHTML = "";
  const defaultOption = document.createElement("option");
  defaultOption.value = "";
  defaultOption.textContent = promptText;
  field.appendChild(defaultOption);
  values.forEach((value, index) => {
    const opt = document.createElement("option");
    opt.value = value;
    opt.textContent = labels && labels[index] != null ? labels[index] : value;
    field.appendChild(opt);
  });
  if (previous && values.includes(previous)) {
    field.value = previous;
  }
}

function populateModelsForBrand(brandValue) {
  const modelField = document.querySelector('[data-state-field="kite.model"]');
  const brandKey = String(brandValue || "");
  const models = (MOCK_DATA.MODELS_BY_BRAND && MOCK_DATA.MODELS_BY_BRAND[brandKey]) || [];
  populateSelect(
    modelField,
    models,
    models,
    shortPromptForSelectPath("kite.model") || tPrompt("kite.model")
  );
}

function populateBoardSizesForType(boardType) {
  const boardSizeField = document.querySelector('[data-state-field="board.boardSize"]');
  const typeKey = String(boardType || "");
  const sizes = (MOCK_DATA.BOARD_SIZE_BY_TYPE && MOCK_DATA.BOARD_SIZE_BY_TYPE[typeKey]) || [];
  populateSelect(
    boardSizeField,
    sizes,
    sizes,
    shortPromptForSelectPath("board.boardSize") || tPrompt("board.boardSize")
  );
}

function renderUI() {
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    const key = el.getAttribute("data-i18n");
    if (!key) return;
    const translated = t(key);
    if (translated) {
      el.textContent = translated;
    }
  });
  document.querySelectorAll("[data-i18n-placeholder]").forEach((el) => {
    const key = el.getAttribute("data-i18n-placeholder");
    if (key) el.setAttribute("placeholder", t(key));
  });

  document.querySelectorAll("[data-t-legacy]").forEach((el) => {
    const key = el.getAttribute("data-t-legacy");
    if (!key) return;
    const v = tLegacy(key);
    if (v) el.textContent = v;
  });

  if (showLiveSpot) {
    showLiveSpot.textContent = liveSpotUiStrings().idle;
  }
  syncLiveSpotViewControls();

  const formEl = document.getElementById("mockSessionForm");
  if (!formEl) return;

  const cv = MOCK_DATA.CANONICAL_VALUES;
  const selectsSpec = [
    { path: "rider.gender",  values: OPTION_VALUES.gender, category: "gender", canonical: cv.gender },
    { path: "rider.level",   values: OPTION_VALUES.level,  category: "level",  canonical: cv.level },
    { path: "board.board",   values: OPTION_VALUES.board,  category: "board",  canonical: cv.board },
    { path: "water.water",   values: OPTION_VALUES.water,  category: "water",  canonical: cv.water },
    { path: "result.result", values: OPTION_VALUES.result, category: "result", canonical: cv.result },
    { path: "kite.brand",    values: OPTION_VALUES.brand,  category: null,     canonical: null }
  ];
  selectsSpec.forEach((spec) => {
    const field = formEl.querySelector(`[data-state-field="${spec.path}"]`);
    let labels;
    if (spec.category) {
      labels = spec.values.map((v) => tOption(spec.category, v) || (spec.canonical && spec.canonical[v]) || v);
    } else {
      labels = spec.values;
    }
    const promptText = shortPromptForSelectPath(spec.path) || tPrompt(spec.path);
    populateSelect(field, spec.values, labels, promptText);
  });

  const boardTypeField = formEl.querySelector('[data-state-field="board.board"]');
  populateBoardSizesForType(boardTypeField ? boardTypeField.value : "");

  const brandField = formEl.querySelector('[data-state-field="kite.brand"]');
  populateModelsForBrand(brandField ? brandField.value : "");

  const kiteInput = formEl.querySelector('[data-state-field="kite.kite"]');
  if (kiteInput) kiteInput.setAttribute("placeholder", shortKiteInputPlaceholder());

  const spotInput = formEl.querySelector('[data-state-field="spot.location"]');
  if (spotInput) {
    const lab = t("spot");
    if (lab) spotInput.setAttribute("aria-label", lab);
  }
  const noteTa = formEl.querySelector('[data-state-field="note.note"]');
  if (noteTa) {
    const labNote = t("note");
    if (labNote) noteTa.setAttribute("aria-label", labNote);
  }

  const lsPanel = document.getElementById("liveSpotPanel");
  if (lsPanel && LiveSpotReadonlyConnector && typeof LiveSpotReadonlyConnector.getLastNormalizedPayload === "function") {
    LiveSpotReadonlyConnector.renderLiveSpotReadonly(lsPanel, LiveSpotReadonlyConnector.getLastNormalizedPayload());
  }
}

const form = document.getElementById("mockSessionForm");
const cta = document.getElementById("visualCta");
const message = document.getElementById("visualCtaMessage");
const showLiveSpot = document.getElementById("showLiveSpot");
const liveSpotPanel = document.getElementById("liveSpotPanel");
const liveSpotMessage = document.getElementById("liveSpotMessage");
const languageButtons = Array.from(document.querySelectorAll(".language-button"));
const liveSpotViewButtons = Array.from(document.querySelectorAll("[data-live-spot-view]"));
const uiStatePreview = document.getElementById("uiStatePreview");
const payloadContractPreview = document.getElementById("payloadContractPreview");
const legacyPayloadPreview = document.getElementById("legacyPayloadPreview");
const userDataPreview = document.getElementById("userDataPreview");
const readonlyLeakStatus = document.getElementById("readonlyLeakStatus");
const endpointCallsStatus = document.getElementById("endpointCallsStatus");
const thankYouBanner = document.getElementById("thankYouBanner");

function normalizeLiveSpotViewMode(mode) {
  return mode === LIVE_SPOT_VIEW_MODE.METEO ? LIVE_SPOT_VIEW_MODE.METEO : LIVE_SPOT_VIEW_MODE.KITE;
}

function syncLiveSpotViewControls() {
  const copy = liveSpotViewUiStrings();
  const currentMode = normalizeLiveSpotViewMode(liveSpotViewMode);
  const switcher = document.querySelector(".live-spot-view-switch");
  if (switcher && copy.group) {
    switcher.setAttribute("aria-label", copy.group);
  }

  liveSpotViewButtons.forEach((button) => {
    const mode = normalizeLiveSpotViewMode(button.getAttribute("data-live-spot-view"));
    const isActive = mode === currentMode;
    button.textContent = mode === LIVE_SPOT_VIEW_MODE.METEO ? copy.meteo : copy.kite;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-pressed", isActive ? "true" : "false");
  });

  if (liveSpotPanel && LiveSpotReadonlyConnector && typeof LiveSpotReadonlyConnector.getLastNormalizedPayload === "function") {
    LiveSpotReadonlyConnector.renderLiveSpotReadonly(liveSpotPanel, LiveSpotReadonlyConnector.getLastNormalizedPayload());
  }
}

const THANK_YOU_BANNER_MESSAGES = Object.freeze({
  it: Object.freeze({
    title: "Grazie!",
    phrase:
      "Il tuo dato è stato ricevuto. Ogni sessione aiuta VENTO LIVE a diventare più utile per tutti i rider."
  }),
  en: Object.freeze({
    title: "Thank you!",
    phrase:
      "Your data has been received. Every session helps VENTO LIVE become more useful for all riders."
  }),
  de: Object.freeze({
    title: "Danke!",
    phrase:
      "Deine Daten wurden empfangen. Jede Session hilft VENTO LIVE, für alle Rider nützlicher zu werden."
  }),
  es: Object.freeze({
    title: "¡Gracias!",
    phrase:
      "Tus datos han sido recibidos. Cada sesión ayuda a que VENTO LIVE sea más útil para todos los riders."
  }),
  fr: Object.freeze({
    title: "Merci !",
    phrase:
      "Tes données ont bien été reçues. Chaque session aide VENTO LIVE à devenir plus utile pour tous les riders."
  })
});

function renderThankYouBanner() {
  if (!thankYouBanner) return;
  const lc = String(currentLang || "").toLowerCase();
  const lang = WHATSAPP_SUMMARY_LANGS.includes(lc) ? lc : "it";
  const copy = THANK_YOU_BANNER_MESSAGES[lang] || THANK_YOU_BANNER_MESSAGES.it;
  thankYouBanner.innerHTML =
    `<strong class="thank-you-banner__title">${copy.title}</strong>` +
    `<p class="thank-you-banner__text">${copy.phrase}</p>`;
  thankYouBanner.hidden = false;
}

function hideThankYouBanner() {
  if (!thankYouBanner) return;
  thankYouBanner.hidden = true;
  thankYouBanner.innerHTML = "";
}

const REQUIRED_FIELDS = Object.freeze([
  "rider.weight",
  "board.board",
  "rider.level",
  "kite.kite",
  "windUserInput.wind",
  "result.result"
]);

const endpointCalls = 0;
const MOCK_FIXED_META = Object.freeze({
  session_id: "ui_mock_session_0001",
  technical_id: "ui_mock_technical_0001",
  event_ts: "2026-04-30T00:00:00.000Z",
  src: "form_v1",
  ts: "2026-04-30T00:00:00.000Z"
});

function buildRuntimeMeta() {
  const now = new Date();
  const iso = now.toISOString();

  const months = ["jan","feb","mar","apr","may","jun","jul","aug","sep","oct","nov","dec"];
  const compactDate =
    String(now.getUTCDate()).padStart(2, "0") +
    months[now.getUTCMonth()] +
    String(now.getUTCHours()).padStart(2, "0") +
    String(now.getUTCMinutes()).padStart(2, "0");

  const randomPart = Math.random().toString(36).slice(2, 10);
  const randomPart2 = Math.random().toString(36).slice(2, 10);

  return {
    session_id: compactDate + randomPart,
    technical_id: randomPart + randomPart2,
    event_ts: iso,
    ts: iso,
    src: "form_v1"
  };
}

function readField(path) {
  const field = form?.querySelector(`[data-state-field="${path}"]`);
  return String(field?.value ?? "").trim();
}

const FormStateLayer = Object.freeze({
  read() {
    const readonlyState = LiveSpotReadonlyConnector.getReadonlyState();
    return {
      rider: {
        weight: readField("rider.weight"),
        gender: readField("rider.gender") || null,
        level: readField("rider.level")
      },
      board: {
        board: readField("board.board"),
        boardSize: readField("board.boardSize")
      },
      kite: {
        kite: readField("kite.kite"),
        brand: readField("kite.brand"),
        model: readField("kite.model")
      },
      windUserInput: {
        wind: readField("windUserInput.wind")
      },
      spot: {
        location: readField("spot.location")
      },
      water: {
        water: readField("water.water")
      },
      result: {
        result: readField("result.result")
      },
      note: {
        note: readField("note.note")
      },
      readonly: {
        liveWind: {
          speed: readonlyState.speed,
          gust: readonlyState.gust,
          direction: readonlyState.direction,
          updated_at: readonlyState.updated_at,
          provider: readonlyState.provider,
          meta: readonlyState.meta
        }
      },
      meta: {
        ui_version: "mock_ui_v3_state_layer",
        submit_channel: "mock"
      }
    };
  }
});

function setInvalid(field, invalid) {
  const wrapper = field?.closest("label");
  wrapper?.classList.toggle("is-invalid", Boolean(invalid));
}

function requiredFieldMessage(path) {
  const labelKey = REQUIRED_FIELD_LABEL_KEYS[path];
  const label = labelKey ? t(labelKey) : "";
  const field = label || path;
  const lc = String(currentLang || "").toLowerCase();
  const lang = WHATSAPP_SUMMARY_LANGS.includes(lc) ? lc : "it";
  const template = REQUIRED_FIELD_MESSAGE_BY_LANG[lang] || REQUIRED_FIELD_MESSAGE_BY_LANG.it;
  return template.replace("{field}", field);
}

function focusRequiredField(path) {
  const field = form?.querySelector(`[data-state-field="${path}"]`);
  if (!field) return;
  if (typeof field.scrollIntoView === "function") {
    field.scrollIntoView({ behavior: "smooth", block: "center" });
  }
  try {
    field.focus({ preventScroll: true });
  } catch (_) {
    field.focus();
  }
}

function validateRequiredFields() {
  const missing = [];

  REQUIRED_FIELDS.forEach((path) => {
    const field = form?.querySelector(`[data-state-field="${path}"]`);
    const invalid = !String(field?.value ?? "").trim();
    setInvalid(field, invalid);
    if (invalid) missing.push(path);
  });

  return {
    ok: missing.length === 0,
    missing
  };
}

function buildMockPayloads() {
  if (!window.MockEngine) {
    return {
      error: "MockEngine non disponibile",
      uiState: FormStateLayer.read(),
      payloadContract: null,
      legacyPayload: null,
      readonlyLeak: { ok: true, leaked_fields: [] }
    };
  }

  const uiState = FormStateLayer.read();
  const runtimeMeta = buildRuntimeMeta();
  const payloadContract = window.MockEngine.buildPayloadContractV1(uiState, runtimeMeta);
  const legacyPayload = window.MockEngine.toLegacyPayload(payloadContract);
  const readonlyLeak = window.MockEngine.assertNoReadonlyLeak(legacyPayload);

  return {
    uiState,
    payloadContract,
    legacyPayload,
    readonlyLeak
  };
}

function renderPayloadDebug(payloads = buildMockPayloads()) {
  if (payloads.error && message) {
    message.textContent = payloads.error;
  }
  if (uiStatePreview) {
    uiStatePreview.textContent = JSON.stringify(payloads.uiState, null, 2);
  }
  if (payloadContractPreview) {
    payloadContractPreview.textContent = JSON.stringify(payloads.payloadContract || {}, null, 2);
  }
  if (legacyPayloadPreview) {
    legacyPayloadPreview.textContent = JSON.stringify(payloads.legacyPayload || {}, null, 2);
  }
  if (userDataPreview) {
    const lp = payloads.legacyPayload || {};
    const st = payloads.uiState && typeof payloads.uiState === "object" ? payloads.uiState : null;
    const show = (value) => value === null || value === undefined || value === "" ? "-" : String(value);
    const lw = st && st.readonly && st.readonly.liveWind ? st.readonly.liveWind : null;
    const meta = lw && lw.meta && typeof lw.meta === "object" ? lw.meta : null;
    const lines = [
      `⚖️ Weight (kg): ${show(lp.weight)}`,
      `Gender: ${show(st && st.rider ? st.rider.gender : null)}`,
      `📦 Board type: ${show(lp.board)}`,
      `📏 Board size: ${show(lp.boardSize)}`,
      `🎯 Level: ${show(lp.level)}`,
      `🪁 Kite (m²): ${show(lp.kite)}`,
      `🏷️ Brand: ${show(lp.brand)}`,
      `🚀 Model: ${show(lp.model)}`,
      `🌬️ Wind (kts): ${show(lp.wind)}`,
      `📍 Spot: ${show(lp.location)}`,
      `🌊 Water conditions: ${show(lp.water)}`,
      `✅ Session result: ${show(lp.result)}`,
      `Notes: ${show(lp.note)}`,
      "---",
      `Live Spot (readonly, non inviato): wind kn ${show(lw ? lw.speed : null)}, gust ${show(lw ? lw.gust : null)}, dir° ${show(lw ? lw.direction : null)}, provider ${show(lw ? lw.provider : null)}, cache ${show(meta ? meta.cache : null)}`
    ];
    userDataPreview.textContent = lines.join("\n");
  }
  if (readonlyLeakStatus) {
    readonlyLeakStatus.textContent = String(!payloads.readonlyLeak.ok);
  }
  if (endpointCallsStatus) {
    endpointCallsStatus.textContent = String(endpointCalls);
  }
}

function buildWhatsAppSummaryFromLegacyPayload(legacyPayload) {
  const lc = String(currentLang || "").toLowerCase();
  const lang = WHATSAPP_SUMMARY_LANGS.includes(lc) ? lc : "it";
  const lp = legacyPayload && typeof legacyPayload === "object" ? legacyPayload : {};
  const dash = (v) => (v === null || v === undefined || v === "" ? "-" : String(v));

  const weight = dash(lp.weight);
  const board = dash(lp.board);
  const boardSize = dash(lp.boardSize);
  const level = dash(lp.level);
  const kite = dash(lp.kite);
  const brand = dash(lp.brand);
  const model = dash(lp.model);
  const wind = dash(lp.wind);
  const location = dash(lp.location);
  const water = dash(lp.water);
  const result = dash(lp.result);
  const note = dash(lp.note);

  if (lang === "it") {
    return (
      `🪁 VENTO LIVE - riepilogo della tua sessione\n\n` +
      `⚖️ Peso (kg): ${weight}\n` +
      `📦 Tavola: ${board}\n` +
      `📏 Misura tavola: ${boardSize}\n` +
      `🎯 Livello: ${level}\n` +
      `🪁 Kite (m²): ${kite}\n` +
      `🏷️ Marca: ${brand}\n` +
      `🚀 Modello: ${model}\n` +
      `🌬️ Vento (kn): ${wind}\n` +
      `📍 Spot: ${location}\n` +
      `🌊 Acqua: ${water}\n` +
      `✅ Risultato sessione: ${result}\n` +
      `Note: ${note}\n\n` +
      `Puoi salvare questo messaggio come promemoria personale della sessione.`
    );
  }
  if (lang === "en") {
    return (
      `🪁 VENTO LIVE - your session summary\n\n` +
      `⚖️ Weight (kg): ${weight}\n` +
      `📦 Board type: ${board}\n` +
      `📏 Board size: ${boardSize}\n` +
      `🎯 Level: ${level}\n` +
      `🪁 Kite (m²): ${kite}\n` +
      `🏷️ Brand: ${brand}\n` +
      `🚀 Model: ${model}\n` +
      `🌬️ Wind (kn): ${wind}\n` +
      `📍 Spot: ${location}\n` +
      `🌊 Water conditions: ${water}\n` +
      `✅ Session result: ${result}\n` +
      `Notes: ${note}\n\n` +
      `You can save this message as a personal reminder of your session.`
    );
  }
  if (lang === "de") {
    return (
      `🪁 VENTO LIVE - Zusammenfassung deiner Session\n\n` +
      `⚖️ Gewicht (kg): ${weight}\n` +
      `📦 Boardtyp: ${board}\n` +
      `📏 Boardgröße: ${boardSize}\n` +
      `🎯 Level: ${level}\n` +
      `🪁 Kite (m²): ${kite}\n` +
      `🏷️ Marke: ${brand}\n` +
      `🚀 Modell: ${model}\n` +
      `🌬️ Wind (kn): ${wind}\n` +
      `📍 Spot: ${location}\n` +
      `🌊 Wasserbedingungen: ${water}\n` +
      `✅ Session-Ergebnis: ${result}\n` +
      `Notizen: ${note}\n\n` +
      `Du kannst diese Nachricht als persönliche Erinnerung an deine Session speichern.`
    );
  }
  if (lang === "es") {
    return (
      `🪁 VENTO LIVE - resumen de tu sesión\n\n` +
      `⚖️ Peso (kg): ${weight}\n` +
      `📦 Tipo de tabla: ${board}\n` +
      `📏 Medida de tabla: ${boardSize}\n` +
      `🎯 Nivel: ${level}\n` +
      `🪁 Kite (m²): ${kite}\n` +
      `🏷️ Marca: ${brand}\n` +
      `🚀 Modelo: ${model}\n` +
      `🌬️ Viento (kn): ${wind}\n` +
      `📍 Spot: ${location}\n` +
      `🌊 Condiciones del agua: ${water}\n` +
      `✅ Resultado de la sesión: ${result}\n` +
      `Notas: ${note}\n\n` +
      `Puedes guardar este mensaje como recordatorio personal de tu sesión.`
    );
  }
  if (lang === "fr") {
    return (
      `🪁 VENTO LIVE - résumé de ta session\n\n` +
      `⚖️ Poids (kg): ${weight}\n` +
      `📦 Type de planche: ${board}\n` +
      `📏 Taille de planche: ${boardSize}\n` +
      `🎯 Niveau: ${level}\n` +
      `🪁 Kite (m²): ${kite}\n` +
      `🏷️ Marque: ${brand}\n` +
      `🚀 Modèle: ${model}\n` +
      `🌬️ Vent (kn): ${wind}\n` +
      `📍 Spot: ${location}\n` +
      `🌊 Conditions d'eau: ${water}\n` +
      `✅ Résultat de session: ${result}\n` +
      `Notes: ${note}\n\n` +
      `Tu peux garder ce message comme mémo personnel de ta session.`
    );
  }
  return "";
}

function openWhatsAppSecondary(legacyPayload) {
  if (WHATSAPP_SECONDARY_CONFIG.ENABLE !== true) {
    return { ok: true, skipped: true };
  }
  const summary = buildWhatsAppSummaryFromLegacyPayload(legacyPayload);
  const encoded = encodeURIComponent(summary);
  const phone = String(WHATSAPP_SECONDARY_CONFIG.PHONE || "").replace(/\D/g, "");
  window.location.href = `whatsapp://send?phone=${phone}&text=` + encoded;
  window.setTimeout(() => {
    window.location.href = `https://wa.me/${phone}?text=` + encoded;
  }, WHATSAPP_SECONDARY_CONFIG.FALLBACK_DELAY_MS);
  return { ok: true, attempted: true };
}

function resetVisualFormAfterSuccess() {
  try {
    form?.reset();
  } catch (_) {}
  if (form) {
    Array.from(form.querySelectorAll("[data-state-field]")).forEach((el) => {
      try {
        el.dispatchEvent(new Event("input", { bubbles: true }));
        el.dispatchEvent(new Event("change", { bubbles: true }));
      } catch (_) {}
    });
    renderUI();
    validateRequiredFields();
  }
  renderPayloadDebug();
}

cta?.addEventListener("click", async () => {
  hideThankYouBanner();
  message?.classList.remove("is-error");
  const validation = validateRequiredFields();
  const payloads = buildMockPayloads();
  renderPayloadDebug(payloads);

  if (!message) return;

  if (payloads.error) {
    message.textContent = payloads.error;
    return;
  }

  if (!validation.ok) {
    const firstMissing = validation.missing[0];
    message.textContent = requiredFieldMessage(firstMissing);
    message.classList.add("is-error");
    focusRequiredField(firstMissing);
    return;
  }

  const primaryResult = await submitSessionPrimary(payloads.legacyPayload);
  if (primaryResult && primaryResult.ok === true) {
    let googleResult = null;
    try {
      googleResult = await submitSessionToGoogleSecondary(payloads.legacyPayload);
    } catch (err) {
      googleResult = { ok: false, error: err && err.message ? err.message : "google_secondary_failed" };
    }

    const googleOk =
      googleResult &&
      (googleResult.ok === true || googleResult.probable === true || googleResult.skipped === true);

    openWhatsAppSecondary(payloads.legacyPayload);

    if (googleOk) {
      message.textContent = "Dati ricevuti. WhatsApp si apre con il riepilogo.";
    } else {
      message.textContent = "Dati ricevuti. Google Sheet non aggiornato.";
    }

    resetVisualFormAfterSuccess();
    renderThankYouBanner();
  } else {
    message.textContent = "Invio dati non riuscito - riprova";
  }
});

form?.addEventListener("input", (event) => {
  hideThankYouBanner();
  const field = event.target?.closest?.("[data-state-field]");
  if (field?.dataset.required === "true") {
    setInvalid(field, !String(field.value || "").trim());
  }
  renderPayloadDebug();
});

form?.addEventListener("change", (event) => {
  hideThankYouBanner();
  const field = event.target?.closest?.("[data-state-field]");
  if (field?.dataset.required === "true") {
    setInvalid(field, !String(field.value || "").trim());
  }
  if (field && field.getAttribute("data-state-field") === "kite.brand") {
    populateModelsForBrand(field.value);
  }
  if (field && field.getAttribute("data-state-field") === "board.board") {
    populateBoardSizesForType(field.value);
  }
  renderPayloadDebug();
});

showLiveSpot?.addEventListener("click", async () => {
  const lsUi = liveSpotUiStrings();
  const setLiveSpotPanelFeedback = (text) => {
    if (!liveSpotPanel) return;
    const windDd = liveSpotPanel.querySelector('[data-live-spot-dd="wind"]');
    const dirDd = liveSpotPanel.querySelector('[data-live-spot-dd="direction"]');
    const windNameDd = liveSpotPanel.querySelector('[data-live-spot-dd="wind_name"]');
    const gustDd = liveSpotPanel.querySelector('[data-live-spot-dd="gust"]');
    const providerDd = liveSpotPanel.querySelector('[data-live-spot-dd="anemometer"]');
    const spotDd = liveSpotPanel.querySelector('[data-live-spot-dd="overview_spot"]');
    const confDd = liveSpotPanel.querySelector('[data-live-spot-dd="overview_confidence"]');
    const updatedDd = liveSpotPanel.querySelector('[data-live-spot-dd="overview_updated"]');

    if (windDd) windDd.textContent = text;
    if (dirDd) dirDd.textContent = "---";
    if (windNameDd) windNameDd.textContent = "---";
    if (gustDd) gustDd.textContent = "-- kn";
    if (providerDd) providerDd.textContent = text;
    if (spotDd) spotDd.textContent = text;
    if (confDd) confDd.textContent = "---";
    if (updatedDd) updatedDd.textContent = "--:--";
  };
  const scrollLiveSpotPanel = () => {
    if (window.matchMedia("(max-width: 760px)").matches) {
      if (liveSpotPanel && typeof liveSpotPanel.scrollIntoView === "function") {
        liveSpotPanel.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }
  };
  showLiveSpot.disabled = true;
  showLiveSpot.classList.add("is-loading");
  showLiveSpot.textContent = lsUi.loading;
  if (liveSpotMessage) {
    liveSpotMessage.textContent = lsUi.message;
  }

  try {
    const uiState = FormStateLayer.read();
    const spot = uiState?.spot?.location || "";

    let payload;

    if (LIVE_SPOT_CONFIG.ENABLE_REAL) {
      if (!spot) {
        setLiveSpotPanelFeedback("Inserisci prima lo spot per vedere il vento live");
        scrollLiveSpotPanel();
        return;
      }
      setLiveSpotPanelFeedback("Aggiornamento vento live...");
      scrollLiveSpotPanel();
      const realData = await fetchLiveSpotReal(spot);

      if (
        realData &&
        realData.needs_disambiguation &&
        Array.isArray(realData.candidates) &&
        realData.candidates.length
      ) {
        if (liveSpotMessage) {
          liveSpotMessage.textContent = "";
          const intro = document.createElement("span");
          intro.textContent = lsUi.disambiguationPrompt;
          liveSpotMessage.appendChild(intro);

          realData.candidates.slice(0, 5).forEach((candidate) => {
            const btn = document.createElement("button");
            btn.type = "button";
            btn.textContent = candidate.label || candidate.name || lsUi.locationFallback;
            btn.style.margin = "0.25rem";
            btn.style.padding = "0.35rem 0.55rem";
            btn.style.borderRadius = "999px";
            btn.style.border = "1px solid currentColor";
            btn.style.background = "transparent";
            btn.style.color = "inherit";
            btn.style.cursor = "pointer";
            btn.addEventListener("click", async () => {
              showLiveSpot.disabled = true;
              showLiveSpot.classList.add("is-loading");
              showLiveSpot.textContent = lsUi.loading;
              setLiveSpotPanelFeedback(lsUi.updatingWind);
              const selectedData = await fetchLiveSpotReal(spot, candidate);
              const selectedHasLiveWindData =
                selectedData &&
                (typeof selectedData.wind_knots === "number" || typeof selectedData.wind_direction === "number");
              if (!selectedHasLiveWindData) {
                setLiveSpotPanelFeedback(lsUi.unavailable);
                showLiveSpot.disabled = false;
                showLiveSpot.classList.remove("is-loading");
                showLiveSpot.textContent = lsUi.idle;
                return;
              }
              const selectedPayload = LiveSpotReadonlyConnector.normalizeLiveSpotPayload(selectedData);
              renderLiveSpotReadonly(selectedPayload);
              renderPayloadDebug();
              if (liveSpotPanel) {
                liveSpotPanel.classList.add("is-visible");
              }
              if (liveSpotMessage) {
                liveSpotMessage.textContent = lsUi.updatedPrefix + (candidate.label || spot);
              }
              showLiveSpot.disabled = false;
              showLiveSpot.classList.remove("is-loading");
              showLiveSpot.textContent = lsUi.idle;
            });
            liveSpotMessage.appendChild(btn);
          });
        }
        scrollLiveSpotPanel();
        return;
      }

      const hasLiveWindData =
        realData &&
        (typeof realData.wind_knots === "number" || typeof realData.wind_direction === "number");
      if (!hasLiveWindData) {
        setLiveSpotPanelFeedback("Vento live non disponibile, riprova");
        scrollLiveSpotPanel();
        return;
      }
      payload = LiveSpotReadonlyConnector.normalizeLiveSpotPayload(realData);
    } else {
      payload = LiveSpotReadonlyConnector.normalizeLiveSpotPayload(
        LiveSpotReadonlyConnector.getSample()
      );
    }

    renderLiveSpotReadonly(payload);

    renderPayloadDebug();

    if (liveSpotPanel) {
      liveSpotPanel.classList.remove("cockpit--live-updated");
      window.requestAnimationFrame(() => {
        liveSpotPanel.classList.add("cockpit--live-updated");
        window.setTimeout(() => {
          liveSpotPanel.classList.remove("cockpit--live-updated");
        }, 700);
      });
    }

    scrollLiveSpotPanel();
  } finally {
    showLiveSpot.disabled = false;
    showLiveSpot.classList.remove("is-loading");
    showLiveSpot.textContent = liveSpotUiStrings().idle;
  }
});

liveSpotViewButtons.forEach((button) => {
  button.addEventListener("click", () => {
    liveSpotViewMode = normalizeLiveSpotViewMode(button.getAttribute("data-live-spot-view"));
    syncLiveSpotViewControls();
  });
});

languageButtons.forEach((button) => {
  button.addEventListener("click", () => {
    hideThankYouBanner();
    languageButtons.forEach((item) => {
      item.classList.toggle("is-active", item === button);
      item.setAttribute("aria-pressed", item === button ? "true" : "false");
    });
    const langCode = String(button.getAttribute("data-language") || "IT").toLowerCase();
    const T = window.RDK_TRANSLATIONS;
    if (T && T[langCode]) {
      currentLang = langCode;
    } else if (T && T.en) {
      currentLang = "en";
    } else {
      currentLang = "it";
    }
    renderUI();
    renderPayloadDebug();
    syncCtaIdlePipelineMessage();
  });
});

renderUI();
validateRequiredFields();
renderPayloadDebug();
syncCtaIdlePipelineMessage();
