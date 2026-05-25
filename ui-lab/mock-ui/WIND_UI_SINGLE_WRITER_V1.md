# UI SINGLE WRITER MODE V1

## Pipeline (obbligatoria)

```
fetch → resolveWindContractV1 (unica verità logica)
     → KiteScoreLayerV1.computeKiteScore (solo dati)
     → UxTrustLayerV1.normalizeTrustUI (solo dati)
     → TimeUILayerV1.normalizeTimeToUI (solo ora display)
     → WindUISingleWriterV1.renderWindUI (unico DOM writer)
```

Vedi `VENTOLIVE_UNIVERSAL_CONTRACT_V1.md`.

## Script order (index.html)

1. `ventolive_api_routing_v1.js`
2. `resolve_wind_contract_v1.js`
3. `live_spot_wind_adapter_v1.js`
4. `kite_score_layer_v1.js`
5. `time_ui_v1.js`
6. `ux_trust_layer_v1.js`
7. `wind_ui_single_writer_v1.js`
8. `mock_ui.js`

## Ora UI (Europe/Rome)

Solo `TimeUILayerV1.normalizeTimeToUI()` formatta `updated_at` / `generated_at` per **Ultimo aggiornamento** (es. `04:34`). Mai UTC in UI.

## Rimosso

- `legacy_kill_switch_ui_v1.js`
- Scrittura DOM vento in `mock_ui.js` (nessun `Decisione … · Rel …`)
- Kite score dentro trust layer

## Deploy

Caricare **tutti** i file sopra su ventolive.com; hard refresh (Ctrl+Shift+R).
