# USER INTENT GATE V1 + I18N GLOBAL RULE

## Flow

```
USER INPUT (spot + click "Vedi Live Spot")
  → hasUserIntent(spot non vuoto)
  → windFetchActivated = true (solo su azione esplicita)
  → API → resolveWindContractV1 → renderWindUI
```

Senza intent: **renderIdleUI** — solo `—`, nessun fetch, nessun "Caricamento…", nessun "Connessione vento…".

## Moduli

| File | Ruolo |
|------|--------|
| `user_intent_gate_v1.js` | `hasUserIntent()`, `idleViewModel()` |
| `ventolive_i18n_v1.js` | `t(key, lang)` — fallback `en` |
| `translations.js` | Chiavi `wind_ui_*` (it, en, de, es, fr, pl) |

## Stati UX

| Stato | Trigger | Testo i18n |
|-------|---------|------------|
| idle | Nessun fetch utente | `wind_ui_state_idle` (`—`) |
| fetching | Click + richiesta in corso | `wind_ui_state_fetching` |
| partial/full | Dati V1 parziali/completi | campi reali + `wind_ui_field_missing` |
| empty | Fetch fallito, zero dati | `wind_ui_state_empty` |

## Script order (index.html)

Dopo `translations.js`:

1. `ventolive_i18n_v1.js`
2. `user_intent_gate_v1.js`
3. `resolve_wind_contract_v1.js`
4. … resto pipeline

## Vietato

- Fetch automatico all'avvio
- Render vento su cambio lingua / vista KITER-METEO senza fetch precedente
- Stringhe hardcoded in layer vento (tutto via `ventoLiveT` / `VentoLiveI18nV1.t`)
