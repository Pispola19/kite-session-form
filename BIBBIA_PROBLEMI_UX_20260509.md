# BIBBIA — PROBLEMI UX — 2026-05-09

Documento vivo: problemi UX form + **vento Live Spot** + boundary browser/server.

Ultimo aggiornamento significativo: **2026-05-25 — PRODUCTION LOCK V1**.

---

## Principi sacro (aggiornati 2026-05-25)

| Layer | Ruolo |
| --- | --- |
| **Server wind** (`/wind/latest`) | Unica verità meteo — `server_contract_schema_lock_v1` via ZERO DRIFT KERNEL |
| **UI vento** | Renderer passivo: solo `display.*` — **no** parse engine, **no** fallback meteo |
| **DAM / worker / DB** | Verità operativa sessioni kite (ecosistema separato) |
| **Google Sheet** | Solo controllo visivo |
| **WhatsApp** | Solo controllo/conferma utente |
| **Payload legacy form** | Sacro (submit sessioni) |
| **localStorage** | Solo comodità browser (recent spot, peso rider) — **non** vento runtime |

Commit di riferimento vento: `3373478` — `PRODUCTION LOCK V1 - kernel + enforcer + UI passive`.

---

## PROBLEMI UX FORM (storico 2026-05-09)

La UI modulare funziona, ma non è ancora abbastanza isolata/sicura sui **custom select**.

Problemi osservati:
1. Thank-you banner poco visibile prima di WhatsApp.
2. Pulsante submit migliorato, ma UX ancora fragile.
3. Connector custom select ha rotto la UI locale.
4. Con connector attivo: loading infinito/campi vuoti.
5. Senza connector: UI normale.
6. Causa probabile: MutationObserver su select che modifica gli stessi figli osservati.

Decisione:
fermarsi qui, non committare/pushare il connector.

Direzione futura:
- audit UI lifecycle
- no MutationObserver sui select
- connector solo con eventi espliciti
- Other/Altro in fondo
- model custom solo dopo brand selezionato
- nessun brand_custom/model_custom
- nessun cambio payload/required/submit/pipeline

Riprendere con calma:
- audit first
- una modifica alla volta
- tutto reversibile
- tutto staccabile

## CHECKPOINT UX — LOCAL CONVENIENCE MEMORY

Data: 2026-05-22

### Recent Live Spot History

- PATCH_UI_RECENT_SPOTS_LOCAL_HISTORY_V1 aggiunge cronologia locale degli ultimi spot Live Spot.
- localStorage key: `vento_live_recent_spots_v1`.
- Massimo 5 spot.
- Salva solo nome spot pulito.
- Browser-side only.
- Boundary rispettati: nessun backend, DB, payload, submit, DAM, Google o WhatsApp.
- Test passati nel checkpoint patch.
- Commit/push associato: `556e1ba` - UX: add local recent Live Spot history chips.

### Rider Weight Local Memory

- PATCH_UI_LOCAL_RIDER_WEIGHT_MEMORY_V1 aggiunge memoria locale del peso rider.
- localStorage key: `vento_live_rider_weight_kg_v1`.
- Solo campo `rider.weight`.
- Validazione peso: 20-200 kg.
- Load solo se il campo peso e' vuoto.
- Save su blur/change.
- Cancellazione campo = rimozione memoria locale.
- Boundary rispettati: nessun backend, DB, payload, submit, DAM, Google o WhatsApp.
- Test passati nel checkpoint patch.
- Commit/push associato: `34db740` - UX: remember rider weight locally.

### Boundary Da Ribadire

- UI = faccia modulare.
- Payload legacy = sacro.
- localStorage = solo comodita' browser-side.
- Nessun dato locale deve diventare runtime/backend memory.
- Nessun cambio a submit, payload o required.
- Nessuna contaminazione DAM, Google o WhatsApp.
- Nessun MutationObserver.
- Nessun connector furbo.
- Patch piccole, reversibili, additive-only.

### Spec Locale Collegata

- `SPEC_LOCAL_TRIANGULATION_ENGINE_V1.md` e' una spec documentale locale.
- Commit locale associato: `2f9ada2` - Docs: add local triangulation engine spec.
- Non ancora pushata.

---

## CHECKPOINT — PRODUCTION LOCK V1 (VENTO LIVE) — 2026-05-25

### Problema risolto (architettura)

Prima: UI e FE (`resolveWindContractV1`, `single_truth_display`) **interpretavano** `WIND DECISION OUTPUT V1` → drift, testi legacy (`Decisione`, `Rel HIGH`, kite score), stati inventati.

Ora:

```
ENGINE (server) → ZERO DRIFT KERNEL → ENFORCER → schema_lock → /wind/latest → UI hardGate → display.*
```

### Cosa è in produzione (repo, commit `3373478`)

**Server (handoff → deploy `/opt/live_spot_server`):**

- `tools/zero_drift_kernel_v1.py` — unica uscita UX
- `tools/zero_drift_enforcer_v1.py` — validazione schema obbligatoria
- `tools/server_contract_schema_lock_v1.py` — builder draft + display
- `app_wind_wrapper_patch.py` → sostituisce `app.py`

**Frontend (`index.html` script chain):**

- `server_contract_passive_v1.js` — hard gate (blocca engine leak)
- `wind_ui_single_writer_v1.js` — solo DOM da `display.*`
- `live_spot_wind_adapter_v1.js`, `user_intent_gate_v1.js`, `mock_ui.js`

**NON caricare in HTML (SIERRA):** `resolve_wind_contract_v1`, `single_truth_display`, `time_ui` (wind), `kite_score`, `ux_trust`.

### Test

```bash
python3 -m pytest tests/ -q
node ui-lab/mock-ui/production_lock_acceptance.test.js
```

### Deploy ancora da completare (runtime)

| Target | Stato tipico |
| --- | --- |
| `git push origin main` | Dopo commit locale |
| API `api.ventolive.com` | Serve deploy server + restart |
| Static ventolive.com | Serve deploy `index.html` + mock-ui + hard refresh |

Verifica: `curl …/wind/latest | jq '.contract_version'` → `server_contract_schema_lock_v1`.

Checklist: `ui-lab/mock-ui/PRODUCTION_LOCK_DEPLOY_CHECKLIST.md`.

### Boundary UI vento (da non rompere)

- User Intent Gate: nessun fetch vento senza click esplicito.
- UI **non** traduce `HIGH` / `NO GO` / direzione in testi “amichevoli”.
- UI **non** calcola forecast, gradi, kite score.
- Errore server → safe contract (`data_state: error`, display `--` / `ERROR`) — mai mostrare raw engine.

### Problemi UX vento ancora aperti

1. **Deploy gap:** codice in git ≠ produzione finché non deploy server + FE.
2. **Codice morto in `mock_ui.js`:** helper direzione legacy (SIERRA) — non in chain ma confonde manutenzione.
3. **Disambiguazione spot:** UI prevede `needs_disambiguation` su `/wind/latest`; API usa `/spot/candidates` separato — allineare o rimuovere branch.
4. **Form submit / DAM:** fuori scope PRODUCTION LOCK — restano su track separata.

### Direzione “sistema intelligente” (vento)

- **Intelligenza** = solo server (resolver, engine, kernel relay).
- **UI** = finestra passiva (PRODUCTION LOCK).
- Discovery / SCART / triangulation = layer cognitivo **offline** — vedi BIBBIA_UNICA Parte I–II, non runtime UI.
