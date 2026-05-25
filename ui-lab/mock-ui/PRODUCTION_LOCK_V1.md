# PRODUCTION LOCK V1 — ZERO DRIFT FINAL STATE

## Architecture (immutable)

```
WIND ENGINE (server internal)
  → ZERO DRIFT KERNEL V1.emit_wind_latest_contract()
  → ZERO DRIFT ENFORCER V1.enforce_lock_contract()
  → server_contract_schema_lock_v1
  → GET /wind/latest
  → UI: server_contract_passive_v1.hardGate()
  → wind_ui_single_writer_v1: display.* → DOM
```

## Production script chain (`index.html`)

1. `ventolive_api_routing_v1.js`
2. `ventolive_i18n_v1.js` (panel labels only)
3. `user_intent_gate_v1.js`
4. `server_contract_passive_v1.js`
5. `wind_ui_visual_presentation_v1.js` (arrows, anemometer line — display.* only)
6. `live_spot_wind_adapter_v1.js`
7. `wind_ui_single_writer_v1.js`
8. `mock_ui.js` (fetch + intent only)

## SIERRA (must NOT be loaded in production)

- `resolve_wind_contract_v1.js`
- `single_truth_display_v1.js`
- `time_ui_v1.js` (wind)
- `ux_trust_layer_v1.js`
- `kite_score_layer_v1.js`
- `mock_ui.js` legacy direction helpers (dead code if scripts above omitted)

## Server deploy files

- `tools/zero_drift_kernel_v1.py`
- `tools/zero_drift_enforcer_v1.py`
- `tools/server_contract_schema_lock_v1.py`
- `app.py` (from `app_wind_wrapper_patch.py`)

## Acceptance

```bash
python3 -m pytest tests/test_production_lock_acceptance.py tests/test_zero_drift_kernel_v1.py -q
node ui-lab/mock-ui/production_lock_acceptance.test.js
curl -sS "https://api.ventolive.com/health" | jq '.zero_drift_kernel, .wind_latest_contract'
curl -sS "https://api.ventolive.com/wind/latest?spot=Is%20Solinas" | jq 'keys, .contract_version'
```

Expected: no `WIND DECISION OUTPUT V1` at response root; `contract_version` = `server_contract_schema_lock_v1`.
