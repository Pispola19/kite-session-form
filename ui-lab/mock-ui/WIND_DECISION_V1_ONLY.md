# WIND DECISION OUTPUT V1 — unico contratto (definitivo)

## Regola

Il frontend legge **solo** `WIND DECISION OUTPUT V1` da:

`https://api.ventolive.com/wind/latest`

## Vietato

- Mapping legacy `wind_knots` / `gust_knots` parallelo
- `applyUiWindFallback` e numeri sintetici (0 kn, -0.4, 12 kn default)
- `"Scegli spot"` come stato con dati V1 validi
- Tramontana / N default quando API invia `NE`
- IP diretti, `ventolive.com/wind/latest`

## Se V1 manca

Mostra **Caricamento…** su tutti i campi — mai dati falsi.

## Moduli

| File | Ruolo |
| --- | --- |
| `ventolive_api_routing_v1.js` | URL canonico + `cache: no-store` |
| `live_spot_wind_adapter_v1.js` | Parse V1 → view model (unico adapter) |
| `mock_ui.js` | Render diretto, no layer intermedio che modifica valori |

## Verifica

```bash
curl -sS "https://api.ventolive.com/wind/latest?spot=is%20solinas"
```

Poi hard-refresh su ventolive.com (Ctrl+Shift+R).
