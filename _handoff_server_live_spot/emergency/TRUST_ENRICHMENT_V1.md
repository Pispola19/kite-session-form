# TRUST RESTORATION LAYER V1

**Server path:** `/opt/live_spot_server/tools/trust_enrichment_layer_v1.py`  
**Hook:** `app.py` → dopo `enforce_always_respond_wind_contract`, prima di `JSONResponse`

## Non modificato

- `wind_decision_output_engine_v1.py`
- `resolver.py`, `providers.py`, `cache_db.py`, DB
- Route `/wind/latest` (solo arricchimento risposta)
- Campi esistenti del prodotto (mai sovrascritti se già validi)

## Campi aggiunti (solo se assenti)

| Livello | Campo | Regola |
| --- | --- | --- |
| Root | `updated_at` | UTC ISO8601 server |
| Root | `trust_enrichment_v1` | Metadati audit (gust_source, applied_at) |
| Prodotto | `GUST NOW (knots)` | Da payload osservato, altrimenti `wind_now × 1.2` (o ×1.15 se trend stabile) |
| Prodotto | `UPDATED AT` | Da payload o timestamp server |

## Riavvio servizio

```bash
sudo systemctl restart live-spot-server.service
curl -sS http://127.0.0.1:5000/health
# atteso: "trust_enrichment_layer": "v1"
```

## Verifica

```bash
curl -sS "http://127.0.0.1:5000/wind/latest?spot=Okinawa" | jq '."WIND DECISION OUTPUT V1"["GUST NOW (knots)"], .updated_at'
```
