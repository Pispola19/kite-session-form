# SERVER CONTRACT SCHEMA LOCK V1

## Architettura

```
SERVER ENGINE (internal)
  → trust_enrichment (internal)
  → build_server_contract_lock()  ← SINGLE public builder
  → zero_drift_enforcer_v1        ← mandatory validation
  → GET /wind/latest response

UI: hardGate → display.* only (STOP if contract_version mismatch or engine leak)
```

## ZERO DRIFT KERNEL V1 (immutable gatekeeper)

```
ENGINE (internal) → build_lock_contract_draft (internal)
                 → zero_drift_kernel_v1.emit_wind_latest_contract()
                 → enforce_lock_contract() [MANDATORY]
                 → OR build_safe_error_contract() on drift
```

- `tools/zero_drift_kernel_v1.py` — **ONLY** `/wind/latest` UX exit
- `tools/zero_drift_enforcer_v1.py` — schema validation (kernel-only)
- `tools/server_contract_schema_lock_v1.py` — draft builder (not UX-facing)
- Golden: `tests/golden/server_contract_schema_lock_v1_full.json`

Safe failure display uses `--` / `ERROR` / `LOW` per kernel spec (no engine leak).

## Endpoint

`GET /wind/latest?spot=...`

**Unica risposta UX-valida:** `contract_version: server_contract_schema_lock_v1`

## UI script chain (produzione)

1. `ventolive_api_routing_v1.js`
2. `ventolive_i18n_v1.js`
3. `user_intent_gate_v1.js`
4. `server_contract_passive_v1.js`
5. `live_spot_wind_adapter_v1.js`
6. `wind_ui_single_writer_v1.js`
7. `mock_ui.js`

## SIERRA (non caricare)

- `resolve_wind_contract_v1.js`
- `single_truth_display_v1.js`
- `time_ui_v1.js` (wind)
- `ux_trust_layer_v1.js`
- `kite_score_layer_v1.js`

## Server deploy

Copy `_handoff_server_live_spot/emergency/tools/server_contract_schema_lock_v1.py` to `/opt/live_spot_server/tools/` and update `app.py` per `app_wind_wrapper_patch.py`.

## Test

```bash
python3 -m pytest tests/test_server_contract_schema_lock_v1.py -q
node ui-lab/mock-ui/select_options_render.contract.test.js
```
