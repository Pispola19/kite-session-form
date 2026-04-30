# Legacy hash notes

## Fonte letta

Lettura read-only di `/Users/PER_TEST/raccolta_dati_K_test/app.js`.

Blocco rilevante:

- `signatureDigestHex(text)`
- `generateMessageId(formData)`
- assegnazione `formData.message_id = generateMessageId(formData)`

## Campi usati dal legacy

`generateMessageId(formData)` usa questi campi, in questo ordine:

1. `session_id`
2. `technical_id`
3. `event_ts`
4. `src`
5. `weight`
6. `gender`
7. `board`
8. `boardSize`
9. `level`
10. `kite`
11. `wind`
12. `brand`
13. `model`
14. `location`
15. `water`
16. `result`
17. `note`

Ogni valore `null` o `undefined` diventa stringa vuota. Gli altri valori diventano `String(value)`.

## Normalizzazione e separatori

Il legacy costruisce:

- `stableParts`: campi normalizzati uniti con separatore `U+001F`.
- `reversedParts`: caratteri di `stableParts` invertiti e poi riuniti.

Poi calcola quattro digest:

1. digest di `stableParts`
2. digest di `reversedParts`
3. digest di `stableParts + U+001E + reversedParts`
4. digest di `reversedParts + U+001E + stableParts`

I quattro digest vengono concatenati.

## Algoritmo digest

`signatureDigestHex(text)` usa FNV-1a 32 bit sincrono:

- seed `2166136261`
- per ogni carattere: xor con `charCodeAt(i)`
- moltiplicazione `Math.imul(hash, 16777619)`
- output unsigned `hash >>> 0`
- hex a 8 caratteri con padding a sinistra

Non usa Web Crypto, API async, DOM o rete.

## Formato message_id

Formato:

`msg_` + quattro digest concatenati + `_` + `sourceId`

`sourceId` e':

- primi 12 caratteri di `technical_id`, se presente;
- altrimenti primi 12 caratteri di `session_id`;
- altrimenti stringa vuota.

## Differenza tra session_id, technical_id e message_id

- `session_id`: ID sessione generato dal form.
- `technical_id`: ID tecnico univoco generato dal form.
- `message_id`: ID deterministico calcolato sui campi operativi del payload; include anche `session_id` e `technical_id` nel materiale hash.

## Golden non verificabili per hash

I golden attuali sono validi per shape e mapping del payload, ma non tutti sono prova di hash legacy:

- `01-golden`: `message_id` canary locale gia' presente, non dimostrato come output di `app.js`.
- `02-golden`: `message_id` canary locale gia' presente nel test SQS, non dimostrato come output di `app.js`.
- `03-golden`: `message_id` ricostruito fisso perche il record storico locale non conservava quel campo.

Per questi casi il report hash deve usare `not_verifiable` invece di forzare un pass falso.
