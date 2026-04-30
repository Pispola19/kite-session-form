# SPEC_PAYLOAD_CONTRACT_V1

## Obiettivo

Definire un contratto dati stabile per la nuova UI modulare, mantenendo compatibilita piena con il payload legacy oggi atteso da DAM/SQS/bridge.

## UiState modulare

`UiState` e' lo stato interno della nuova UI. Non e' inviato direttamente a nessun backend.

```js
{
  rider: {
    weight: "",
    gender: null,
    level: ""
  },
  board: {
    board: "",
    boardSize: ""
  },
  kite: {
    kite: "",
    brand: "",
    model: ""
  },
  windUserInput: {
    wind: ""
  },
  spot: {
    location: ""
  },
  water: {
    water: ""
  },
  result: {
    result: ""
  },
  note: {
    note: ""
  },
  readonly: {
    liveWind: null
  },
  meta: {
    ui_version: "ui_lab_v1",
    submit_channel: "mock"
  }
}
```

## PayloadContractV1

`PayloadContractV1` e' il contratto stabile versionato generato dalla UI modulare.

```js
{
  payload_contract_version: "v1",
  ui_version: "ui_lab_v1",
  submit_channel: "mock",

  session_id: "",
  technical_id: "",
  event_ts: "",
  src: "form_v1",

  weight: "",
  gender: null,
  board: "",
  boardSize: "",
  level: "",
  kite: "",
  wind: "",
  brand: "",
  model: "",
  location: "",
  water: "",
  result: "",
  note: "",

  ts: "",
  message_id: ""
}
```

## LegacyPayload

`LegacyPayload` e' il payload compatibile con il sistema attuale.

Deve mantenere esattamente questi campi:

- `session_id`
- `technical_id`
- `event_ts`
- `src`
- `weight`
- `gender`
- `board`
- `boardSize`
- `level`
- `kite`
- `wind`
- `brand`
- `model`
- `location`
- `water`
- `result`
- `note`
- `ts`
- `message_id`

I campi nuovi del contract, come `payload_contract_version`, `ui_version` e `submit_channel`, non devono entrare nel payload legacy verso DAM salvo decisione futura esplicita.

## Campi obbligatori

Obbligatori per submit legacy:

- `weight`
- `board`
- `level`
- `kite`
- `wind`
- `result`
- `session_id`
- `technical_id`
- `event_ts`
- `src`
- `ts`
- `message_id`

## Campi opzionali

Opzionali:

- `gender`
- `boardSize`
- `brand`
- `model`
- `location`
- `water`
- `note`

Valori opzionali assenti devono diventare stringa vuota, tranne `gender`, che puo' restare `null` se coerente con il legacy.

## Regole wind / live wind

- `wind` e' sempre il vento dichiarato dall'utente.
- Live Wind non puo' sovrascrivere `wind`.
- Live Wind non puo' modificare `result`.
- Live Wind non puo' modificare `location`.
- Live Wind puo' stare solo in `UiState.readonly.liveWind`.
- Live Wind non entra in `LegacyPayload`.

## Regole session_id

`session_id` deve restare compatibile con la logica legacy:

- generato al momento del submit;
- stabile per quel tentativo di submit;
- non derivato da Live Wind, scout o cervello;
- adatto a deduplica e tracciamento downstream.

## Regole technical_id

`technical_id` deve restare un identificatore tecnico univoco:

- generato lato UI;
- non dipendente dal contenuto visuale;
- presente in ogni payload legacy;
- non riusato tra submit diversi.

## Regole event_ts / ts

- `event_ts` e' il timestamp operativo del submit.
- `ts` resta come campo legacy compatibile.
- Entrambi devono essere generati al submit.
- Formato raccomandato: stringa ISO/RFC3339 compatibile con il legacy.

## Regole message_id

`message_id` deve essere deterministico sugli stessi campi stabili usati dal legacy.

Regole:

- non deve includere Live Wind;
- non deve includere stato UI puramente visuale;
- non deve includere messaggi di errore o preview;
- deve restare stabile per lo stesso contenuto operativo;
- deve evitare rotture di deduplica DAM/SQS/bridge.
