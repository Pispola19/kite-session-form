# BIBBIA — PROBLEMI UX — 2026-05-09

La UI modulare funziona, ma non è ancora abbastanza isolata/sicura.

Principio sacro:
- DAM/dump/worker/bridge/DB = verità operativa
- Google Sheet = solo controllo visivo
- WhatsApp = solo controllo/conferma utente
- UI = faccia modulare
- Payload legacy = sacro

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
