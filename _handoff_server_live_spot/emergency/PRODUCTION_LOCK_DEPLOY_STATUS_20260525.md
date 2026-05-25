# PRODUCTION LOCK V1 — Deploy status (2026-05-25)

## Server (`api.ventolive.com` / `/opt/live_spot_server`)

| File | Repo → server SHA256 match |
|------|----------------------------|
| `tools/zero_drift_kernel_v1.py` | yes |
| `tools/zero_drift_enforcer_v1.py` | yes |
| `tools/server_contract_schema_lock_v1.py` | yes |
| `app.py` (from `app_wind_wrapper_patch.py`) | yes |

**Service:** `live-spot-server.service` — runtime serves lock contract (verified localhost + public).

## Frontend (`ventolive.com`)

Passive chain scripts: verified SHA256 match repo ↔ CDN (see deploy run log).

`index.html`: script chain identical (no SIERRA); production adds Cloudflare email-decode script only.

## Public API checks (post-deploy)

- `/health`: `zero_drift_kernel` = `zero_drift_kernel_v1`, `wind_latest_contract` = `server_contract_schema_lock_v1`
- `/wind/latest`: `contract_version` present, `data_state` = `full`, `display.*` populated
- No root `WIND DECISION OUTPUT V1`, no engine leak top-level keys

## SIERRA (repo only, not in production `index.html`)

- `resolve_wind_contract_v1.js`
- `single_truth_display_v1.js`
- `kite_score_layer_v1.js`
- `time_ui_v1.js` (wind)
- `ux_trust_layer_v1.js`

## Repo drift

- `app_wind_wrapper_patch.py`: `sys.path` tools fix (local, redeployed)
- `deploy_production_lock_server.sh`: new helper
- `main` may be ahead of `origin/main` — push for GitHub Pages sync if needed
