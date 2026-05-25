# UX EMERGENCY ROLLBACK V1

**Solo frontend** — backend `/wind/latest` invariato.

## Causa regressione (audit)

1. `fetchLiveSpotReal` scartava risposte **HTTP 4xx** anche con body `WIND DECISION OUTPUT V1` completo → UI mostrava “vento non disponibile”.
2. `hasUsableLiveSpotData` troppo restrittivo su V1 (richiedeva numeri/campi singoli invece di accettare il blocco V1).
3. `normalizeWindDecisionOutput` non mappava `RELIABILITY` → `confidence`; forecast senza direzione se solo trend numerico.
4. Renderer forecast nascondeva frecce se `forecast_*` incompleto anche con vento/direzione su “now”.

## Fix

| File | Ruolo |
| --- | --- |
| `live_spot_wind_adapter_v1.js` | Adapter unico V1 + legacy + fallback UI |
| `mock_ui.js` | Usa adapter; fetch tollerante; render null-safe |
| `index.html`, `ui-lab/mock-ui/index.html` | Carica adapter prima di `mock_ui.js` |
| `live_spot.html` | Stesso adapter per pagina legacy |

## Mapping V1 → UI

- `SPOT RESOLVED` → `spot`
- `WIND NOW (knots)` → `wind_knots`
- `WIND DIRECTION (kite-relevant)` → `wind_direction` (gradi 0–360)
- `WIND TREND` → `forecast_1h/2h/3h`
- `RELIABILITY` → `reliability` + `confidence` (HIGH 0.82, MEDIUM 0.55, LOW 0.28)
- `KITE DECISION` → badge provider

## Regole UI

- Presenza di `WIND DECISION OUTPUT V1` → **sempre** render.
- LOW confidence → mostra comunque vento/direzione/forecast (stimati se necessario).
- Mai schermo vuoto: `applyUiWindFallback` riempie campi mancanti lato UI only.

## Verifica

```bash
node ui-lab/mock-ui/select_options_render.contract.test.js
```

Contratto `wind_decision_output_v1_renders_legacy_ui_contract` deve passare.
