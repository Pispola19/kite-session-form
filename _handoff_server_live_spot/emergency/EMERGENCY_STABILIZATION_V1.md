# EMERGENCY STABILIZATION — ALWAYS RESPOND WIND CONTRACT V1

**Server:** `100.108.166.103:2222` · `/opt/live_spot_server`  
**Data deploy file:** 2026-05-25

## Cosa è stato fatto (solo safety layer)

| File | Azione |
| --- | --- |
| `tools/always_respond_wind_contract_v1.py` | **NUOVO** — wrapper finale |
| `app.py` | **Sostituito** — usa wrapper; sempre HTTP 200 se contratto completo |
| `app.py.bak_before_always_respond_v1_20260525` | Backup pre-patch |

**NON modificati:** `resolver.py`, `providers.py` (solo import funzioni esistenti), `wind_engine.py`, DB, catalogo, cache.

## Comportamento

1. Resolver → payload (invariato)
2. `wind_decision_output_engine_v1` → prodotto UI
3. Se incompleto → geocode (Open-Meteo API) → `fetch_open_meteo` → MEDIUM
4. Se ancora incompleto → stima climatologia deterministica → LOW (mai null)
5. HTTP **200** se tutti i campi prodotto sono valorizzati

## Riavvio obbligatorio

Il processo `live-spot-server.service` gira come utente `live_spot` e richiede **sudo**:

```bash
ssh -p 2222 massimiliano@100.108.166.103
sudo systemctl restart live-spot-server.service
curl -sS http://127.0.0.1:5000/health
# deve includere: "always_respond_wind_contract": "v1"
```

## Verifica post-restart

```bash
for s in "Hurghada" "Okinawa" "Alma Bay" "xyz_unknown_spot_999" ""; do
  echo "=== [$s] ==="
  curl -sS -w " HTTP:%{http_code}\n" "http://127.0.0.1:5000/wind/latest?spot=$(python3 -c "import urllib.parse;print(urllib.parse.quote('$s'))")"
done
```

Tutti devono essere **HTTP:200** con `WIND NOW`, `WIND DIRECTION`, trend 1h/2h/3h, `KITE DECISION`, `RELIABILITY` non null.
