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
