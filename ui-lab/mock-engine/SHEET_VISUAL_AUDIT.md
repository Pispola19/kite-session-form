# SHEET_VISUAL_AUDIT

## Scopo

Questo documento fissa una regola architetturale: Google Sheet e' controllo visivo per l'utente, non e' la tubatura operativa del dato.

## Google Sheet e' controllo visivo

Le righe Sheet A:P mostrano una vista leggibile della sessione. Sono utili per controllo umano, audit manuale e confronto visuale.

Non devono essere trattate come payload DAM completo.

## Google Sheet non e' payload DAM completo

Una riga Sheet tipica contiene campi come:

- `timestamp`
- `weight`
- `gender`
- `board`
- `board_size`
- `level`
- `kite_size`
- `brand`
- `model`
- `wind`
- `location`
- `water`
- `result`
- `notes`
- `ID`
- `src`

Questa forma e' parziale e trasformata rispetto al `LegacyPayload` operativo.

## ID Sheet non e' un ID operativo DAM

Il campo `ID` della riga Sheet resta solo `sheet_visual_id`.

Non deve diventare:

- `message_id`
- `session_id`
- `technical_id`

## Timestamp Sheet non sempre e' event_ts certo

Il campo `timestamp` viene mappato solo come `event_ts_candidate`.

Non deve essere promosso automaticamente a `event_ts` certo per DAM, perche puo' rappresentare una vista, un valore trasformato o un timestamp non abbastanza tracciato.

## Campi DAM mancanti

Per un payload DAM completo mancano sempre:

- `session_id`
- `technical_id`
- `event_ts` certo
- `ts`
- `message_id`

Senza questi campi, una riga Sheet non puo' diventare golden DAM.

## Perche Google non deve essere fonte operativa

Google Sheet e' utile per vedere il dato, ma non garantisce il contratto operativo completo:

- ha nomi campo trasformati;
- puo' perdere identificatori tecnici;
- puo' avere timestamp non certo;
- non contiene `message_id`;
- non rappresenta la coda DAM/SQS;
- non garantisce deduplica operativa.

## Cuore operativo

La verita operativa resta:

```text
Payload legacy completo
-> DAM
-> SQS / dump / tubatura
-> worker / bridge
-> DB
```

Google Sheet puo' restare un controllo visuale laterale, mai la sorgente primaria.
