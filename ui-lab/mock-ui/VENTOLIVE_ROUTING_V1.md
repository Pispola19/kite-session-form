# VENTOLIVE ROUTING FIX V1

## Regola

**Unica API vento:** `https://api.ventolive.com/wind/latest`

Mai:

- `https://ventolive.com/wind/latest`
- `http://100.108.166.103:5000/wind/latest`
- `localhost` / IP diretti

## File

| File | Ruolo |
| --- | --- |
| `ventolive_api_routing_v1.js` | URL canonico + `coerceCanonicalUrl` + fail-safe payload |
| `mock_ui.js` | `fetch(..., { cache: "no-store" })` + fail-safe render |
| `index.html` | Carica routing prima di adapter/mock_ui |

## Fail-safe UI (no “vento non disponibile”)

| Campo | Valore |
| --- | --- |
| vento | `– kn` |
| direzione | `calcolando…` |
| reliability | `LOW` |
| forecast | slot vuoti sicuri |

## Verifica terminale (1 comando)

```bash
curl -sS -w "\nHTTP:%{http_code}\n" "https://api.ventolive.com/wind/latest?spot=Hurghada" | head -c 600
```

Atteso: `HTTP:200` + JSON con `"WIND DECISION OUTPUT V1"`.
