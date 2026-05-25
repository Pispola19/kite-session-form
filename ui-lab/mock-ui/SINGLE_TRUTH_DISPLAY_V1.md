# SINGLE TRUTH DISPLAY CONTRACT V1

## Principio

**WIND DECISION OUTPUT V1** = unica verità. La UI è un **renderer passivo**.

## Pipeline

```
API (V1)
  → resolveWindContractV1()     // parse + data_state
  → buildSingleTruthDisplay()   // campi display (present | missing_data | no_forecast)
  → renderWindUI()              // DOM: solo display.text
```

## data_state (contract)

| Stato | Significato |
|-------|-------------|
| `idle` | Nessun intent utente / nessun fetch |
| `fetching` | Richiesta in corso |
| `full` | wind + direction + spot presenti |
| `partial` | almeno un campo, non tutti |
| `error` | nessun dato V1 utile |
| `no_forecast` | per slot forecast singolo |

## Cosa mostra la UI (valori contract)

- **Vento / raffiche / trend:** numero API + suffisso layout ` kn`
- **Direzione / nome vento:** etichetta API (`NE`, …) — **no** Tramontana i18n
- **Affidabilità:** `HIGH` / `MEDIUM` / `LOW` — **no** traduzione semantica
- **Anemometro:** `KITE DECISION` API (`GO`, `NO GO`, …) — **no** kite score UI
- **Ora:** `updated_at` → Europe/Rome (solo formattazione timestamp)

## i18n ammesso

Solo etichette statiche UI e messaggi stato pannello (`fetching`, `error`, `idle`).

## Rimosso dalla catena script

- `kite_score_layer_v1.js` (non più nel render path)
- `ux_trust_layer_v1.js` (non più nel render path)

I file restano in repo ma non sono caricati in produzione.

## Script order

`single_truth_display_v1.js` → `resolve_wind_contract_v1.js` → `time_ui_v1.js` → `wind_ui_single_writer_v1.js`
