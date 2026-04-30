# SPEC_LEGACY_ADAPTER

## Obiettivo

`LegacyCompatibilityAdapter` separa la nuova UI modulare dal sistema attuale.

Il suo compito e' trasformare lo stato modulare in un payload compatibile con il vecchio `app.js`, senza chiamare endpoint e senza introdurre campi che possano rompere DAM/SQS/bridge.

## Da UiState a PayloadContractV1

Passi:

1. Leggere i moduli da `UiState`.
2. Applicare trim non distruttivo.
3. Validare i campi obbligatori.
4. Generare identificatori e timestamp.
5. Copiare solo campi operativi.
6. Aggiungere metadati di contract.

Mapping:

- `UiState.rider.weight` -> `weight`
- `UiState.rider.gender` -> `gender`
- `UiState.rider.level` -> `level`
- `UiState.board.board` -> `board`
- `UiState.board.boardSize` -> `boardSize`
- `UiState.kite.kite` -> `kite`
- `UiState.kite.brand` -> `brand`
- `UiState.kite.model` -> `model`
- `UiState.windUserInput.wind` -> `wind`
- `UiState.spot.location` -> `location`
- `UiState.water.water` -> `water`
- `UiState.result.result` -> `result`
- `UiState.note.note` -> `note`

## Da PayloadContractV1 a LegacyPayload

`LegacyPayload` deve contenere solo i campi legacy:

```js
{
  session_id,
  technical_id,
  event_ts,
  src,
  weight,
  gender,
  board,
  boardSize,
  level,
  kite,
  wind,
  brand,
  model,
  location,
  water,
  result,
  note,
  ts,
  message_id
}
```

Campi esclusi dal legacy:

- `payload_contract_version`
- `ui_version`
- `submit_channel`
- `readonly`
- `liveWind`
- preview
- stato validazione
- errori visuali
- ricevute mock
- diff payload

## Cosa deve restare identico al vecchio app.js

- Nomi campo legacy.
- `src` uguale a `form_v1`.
- `weight`, `kite`, `wind` come stringhe numeriche.
- Campi opzionali assenti come stringhe vuote, salvo `gender` se legacy accetta `null`.
- `message_id` deterministico.
- `session_id`, `technical_id`, `event_ts`, `ts` sempre presenti.
- Nessun campo live/scout/cervello nel payload legacy.

## Cosa NON deve entrare nel payload

- Vento live.
- Direzione vento live.
- Raffica live.
- Fonte meteo.
- Timestamp meteo.
- Suggerimenti scout.
- Output cervello.
- Stato UI.
- Label tradotte.
- Testi di preview.
- Ricevute mock.

## Regole per non rompere bridge/DAM/SQS

- Non rinominare campi legacy.
- Non cambiare `src` senza migrazione esplicita.
- Non cambiare il tipo dei campi core.
- Non eliminare campi vuoti opzionali se il legacy li include.
- Non inserire oggetti annidati nel payload legacy.
- Non includere metadati visuali.
- Non generare `message_id` usando campi read-only.
- Non inviare payload reale prima di diff e validazione.

## Test richiesti prima di attivare DAM reale

- Diff su payload completo.
- Test campi obbligatori.
- Test custom board/brand/model.
- Test `gender` vuoto.
- Test `location` vuoto.
- Test `note` lunga.
- Test Live Wind presente ma escluso dal legacy.
- Test `message_id` stabile.
