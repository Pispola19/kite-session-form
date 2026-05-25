# UI SINGLE WRITER MODE V1

## Pipeline (obbligatoria)

```
fetch → LiveSpotWindAdapterV1 (parse V1)
     → KiteScoreLayerV1.computeKiteScore (solo dati)
     → UxTrustLayerV1.normalizeTrustUI (solo dati)
     → WindUISingleWriterV1.renderWindUI (unico DOM writer)
```

## Script order (index.html)

1. `ventolive_api_routing_v1.js`
2. `live_spot_wind_adapter_v1.js`
3. `kite_score_layer_v1.js`
4. `ux_trust_layer_v1.js`
5. `wind_ui_single_writer_v1.js`
6. `mock_ui.js`

## Rimosso

- `legacy_kill_switch_ui_v1.js`
- Scrittura DOM vento in `mock_ui.js` (nessun `Decisione … · Rel …`)
- Kite score dentro trust layer

## Deploy

Caricare **tutti** i file sopra su ventolive.com; hard refresh (Ctrl+Shift+R).
