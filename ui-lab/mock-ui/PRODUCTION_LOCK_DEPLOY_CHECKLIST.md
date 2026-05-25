# PRODUCTION LOCK — Deploy checklist (file-per-file)

**Server:** `ssh -p 2222 massimiliano@100.108.166.103` · `/opt/live_spot_server`  
**Frontend:** ventolive.com (static da repo `index.html` + `ui-lab/mock-ui/`)

---

## Messaggio di commit (proposto)

```
PRODUCTION LOCK: zero drift kernel + passive UI contract

- Add server-side ZERO DRIFT KERNEL and ENFORCER for schema_lock_v1
- /wind/latest returns only server_contract_schema_lock_v1 (or safe error)
- UI: server_contract_passive hard gate; render display.* only
- Remove resolve/single_truth/kite_score/ux_trust from production script chain
- Add pytest + JS production lock acceptance tests and golden snapshots
```

---

## Fase 1 — Git (locale, quando decidi)

```bash
cd /Users/PER_TEST/raccolta_dati_K_test

# Server handoff + tools
git add _handoff_server_live_spot/emergency/app_wind_wrapper_patch.py
git add _handoff_server_live_spot/emergency/tools/

# Frontend produzione
git add index.html
git add ui-lab/mock-ui/index.html
git add ui-lab/mock-ui/server_contract_passive_v1.js
git add ui-lab/mock-ui/live_spot_wind_adapter_v1.js
git add ui-lab/mock-ui/wind_ui_single_writer_v1.js
git add ui-lab/mock-ui/user_intent_gate_v1.js
git add ui-lab/mock-ui/mock_ui.js
git add ui-lab/mock-ui/select_options_render.contract.test.js
git add ui-lab/mock-ui/production_lock_acceptance.test.js

# Test + golden
git add tests/

# Docs
git add ui-lab/mock-ui/PRODUCTION_LOCK_V1.md
git add ui-lab/mock-ui/SERVER_CONTRACT_SCHEMA_LOCK_V1.md
git add ui-lab/mock-ui/PRODUCTION_LOCK_DEPLOY_CHECKLIST.md

# SIERRA (opzionale: comment-only markers, non in chain)
git add ui-lab/mock-ui/resolve_wind_contract_v1.js
git add ui-lab/mock-ui/single_truth_display_v1.js
git add ui-lab/mock-ui/kite_score_layer_v1.js
git add ui-lab/mock-ui/ux_trust_layer_v1.js
git add ui-lab/mock-ui/SINGLE_TRUTH_DISPLAY_V1.md

# NON includere in index.html: resolve, single_truth, time_ui, kite_score, ux_trust

git commit -m "$(cat <<'EOF'
PRODUCTION LOCK: zero drift kernel + passive UI contract

Server emits only server_contract_schema_lock_v1 via kernel+enforcer.
Frontend hard-gates legacy engine envelopes and renders display.* only.

EOF
)"
```

---

## Fase 2 — Deploy SERVER (ordine obbligatorio)

| # | Repo path | Destinazione server | Azione |
|---|-----------|---------------------|--------|
| 1 | `_handoff_server_live_spot/emergency/tools/zero_drift_enforcer_v1.py` | `/opt/live_spot_server/tools/zero_drift_enforcer_v1.py` | **NUOVO** |
| 2 | `_handoff_server_live_spot/emergency/tools/server_contract_schema_lock_v1.py` | `/opt/live_spot_server/tools/server_contract_schema_lock_v1.py` | **NUOVO** |
| 3 | `_handoff_server_live_spot/emergency/tools/zero_drift_kernel_v1.py` | `/opt/live_spot_server/tools/zero_drift_kernel_v1.py` | **NUOVO** |
| 4 | `_handoff_server_live_spot/emergency/app_wind_wrapper_patch.py` | `/opt/live_spot_server/app.py` | **SOSTITUISCI** (backup prima) |
| 5 | — | `app.py.bak_before_production_lock_YYYYMMDD` | Backup `cp app.py` |

```bash
ssh -p 2222 massimiliano@100.108.166.103
cd /opt/live_spot_server
sudo cp app.py app.py.bak_before_production_lock_$(date +%Y%m%d)
# scp/rsync i 3 file tools + app.py
sudo systemctl restart live-spot-server.service
```

### Verifica server (obbligatoria)

```bash
curl -sS http://127.0.0.1:5000/health | jq '.zero_drift_kernel, .wind_latest_contract, .server_contract_schema_lock'
curl -sS "http://127.0.0.1:5000/wind/latest?spot=Is%20Solinas" | jq '.contract_version, .data_state, .display.wind'
```

**Atteso:**

- `zero_drift_kernel`: `"zero_drift_kernel_v1"`
- `contract_version`: `"server_contract_schema_lock_v1"`
- **NO** chiave root `"WIND DECISION OUTPUT V1"`

---

## Fase 3 — Deploy FRONTEND (ventolive.com)

| # | Repo path | Note |
|---|-----------|------|
| 1 | `index.html` | Script chain senza resolve/single_truth/time_ui/kite/ux |
| 2 | `ui-lab/mock-ui/server_contract_passive_v1.js` | **NUOVO** |
| 3 | `ui-lab/mock-ui/live_spot_wind_adapter_v1.js` | Aggiornato |
| 4 | `ui-lab/mock-ui/wind_ui_single_writer_v1.js` | Aggiornato |
| 5 | `ui-lab/mock-ui/user_intent_gate_v1.js` | Aggiornato |
| 6 | `ui-lab/mock-ui/mock_ui.js` | Aggiornato |
| 7 | `ui-lab/mock-ui/ventolive_api_routing_v1.js` | Invariato (verificare presente) |
| 8 | `ui-lab/mock-ui/ventolive_i18n_v1.js` | Invariato |
| 9 | `translations.js` | Se usato da index |

**NON deployare come script attivi** (SIERRA):  
`resolve_wind_contract_v1.js`, `single_truth_display_v1.js`, `time_ui_v1.js`, `kite_score_layer_v1.js`, `ux_trust_layer_v1.js`

### Script order in `index.html` (deve essere esattamente)

1. `translations.js`
2. `mock_engine.browser.js` / `static_data.js`
3. `ventolive_api_routing_v1.js`
4. `ventolive_i18n_v1.js`
5. `user_intent_gate_v1.js`
6. `server_contract_passive_v1.js`
7. `live_spot_wind_adapter_v1.js`
8. `wind_ui_single_writer_v1.js`
9. `mock_ui.js`

### Verifica browser

- Hard refresh: Ctrl+Shift+R
- DevTools → Network → `wind/latest` → response con `contract_version`
- Pannello Live Spot: valori da `display.*` (es. `9.4 kn`, `NO GO`, `HIGH`)
- **NO** testo `Decisione` / `Rel HIGH` / `KITE SCORE`

---

## Fase 4 — Test post-deploy

```bash
# Locale (opzionale, dopo pull)
python3 -m pytest tests/ -q
node ui-lab/mock-ui/production_lock_acceptance.test.js
node ui-lab/mock-ui/select_options_render.contract.test.js

# Produzione
curl -sS "https://api.ventolive.com/health" | jq '.zero_drift_kernel, .wind_latest_contract'
curl -sS "https://api.ventolive.com/wind/latest?spot=Is%20Solinas" | jq '.contract_version, .display.wind, .display.kite_decision'
```

---

## Rollback rapido

**Server:**

```bash
sudo cp app.py.bak_before_production_lock_YYYYMMDD /opt/live_spot_server/app.py
sudo systemctl restart live-spot-server.service
```

**Frontend:** ripristinare `index.html` con chain `resolve_wind_contract_v1` + commit `0b459f9`.

---

## Stato attuale vs target

| Check | Prima deploy | Dopo deploy |
|-------|--------------|-------------|
| API `contract_version` | assente | `server_contract_schema_lock_v1` |
| UI parse engine | possibile (vecchia chain) | bloccato |
| ZERO DRIFT garantito | no | sì |
