# ui-lab

## Scopo

`ui-lab` e' lo spazio isolato per progettare la futura UI modulare di VENTO LIVE / Kite Data System.

Questa cartella serve a definire contratti, moduli, adapter e piano di migrazione prima di scrivere una UI funzionante o collegare qualsiasi canale reale.

## Cosa puo' fare

- Documentare la nuova architettura modulare.
- Definire `UiState`, `PayloadContractV1` e `LegacyPayload`.
- Definire i moduli UI futuri.
- Definire connettori mock e connettori reali futuri.
- Definire le regole di compatibilita con il payload legacy.
- Preparare un piano di migrazione controllato.

## Cosa NON puo' fare

- Non puo' chiamare DAM.
- Non puo' chiamare Google Sheet.
- Non puo' chiamare WhatsApp.
- Non puo' chiamare Live Wind reale.
- Non puo' chiamare SQS o backend reali.
- Non puo' scrivere su DB, JSONL, offset, log, worker o bridge.
- Non puo' modificare la UI esistente.
- Non puo' sostituire `app.js`.
- Non puo' cambiare endpoint, nomi campi o ID HTML della UI attuale.

## Regola mock-only

Ogni implementazione futura dentro `ui-lab` deve partire in modalita mock-only.

Il primo submit ammesso sara' un submit simulato verso `MockSubmitConnector`, con ricevuta finta e nessuna rete.

## Regola nessun endpoint reale

Endpoint reali, URL reali, token, SQS, DAM, Google Apps Script, WhatsApp e Live Wind reale non devono essere inseriti in codice operativo di `ui-lab` durante la fase iniziale.

I connettori reali possono essere descritti come specifica, ma devono restare disattivati fino a validazione esplicita.

## Regola vecchia UI intoccabile

Questi file restano fuori perimetro:

- `index.html`
- `app.js`
- `styles.css`
- `translations.js`
- `pwa.js`
- `manifest.json`
- `ingest_api`
- `dam`
- worker
- bridge
- DB, JSONL, offset e log

La vecchia UI verra' solo osservata per confronto payload, mai modificata da `ui-lab`.
