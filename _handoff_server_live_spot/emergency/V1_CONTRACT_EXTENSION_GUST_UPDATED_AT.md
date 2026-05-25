# V1 Contract Extension — GUST + updated_at (safe add)

**Module:** `tools/trust_enrichment_layer_v1.py`  
**Hook:** `app.py` → after `enforce_always_respond_wind_contract`, before `JSONResponse`

## Pipeline

```text
Engine V1 → always-respond wrapper → TRUST FINAL ENRICHMENT → response JSON
```

## Fields added (only if missing)

| Field | Location | Rule |
| --- | --- | --- |
| `GUST NOW (knots)` | `WIND DECISION OUTPUT V1` | From resolver `gust_knots`, else `wind_now × 1.2` |
| `updated_at` | product + root | Server UTC ISO8601 (`Z`), **never** from provider |

## Never modified

`WIND NOW (knots)`, `WIND DIRECTION (kite-relevant)`, `WIND TREND`, `KITE DECISION`, `RELIABILITY`

## Restart + verify

```bash
sudo systemctl restart live-spot-server.service
curl -sS "http://127.0.0.1:5000/wind/latest?spot=Hurghada" | python3 -c "
import sys,json
d=json.load(sys.stdin)
p=d['WIND DECISION OUTPUT V1']
print('gust',p.get('GUST NOW (knots)'))
print('updated_at',p.get('updated_at'),d.get('updated_at'))
"
```
