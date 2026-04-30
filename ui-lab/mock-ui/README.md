# UI mock v2 visual wireframe

## Scopo

Questa pagina serve solo a valutare la faccia visiva della futura UI VENTO LIVE.

Non e' una UI operativa. Non collega dati reali. Genera solo payload mock locale. Non invia nulla.

## Cosa contiene

- Header con identita VENTO LIVE.
- Immagine kiter identitaria in modalita watermark soft.
- Form kiter a blocchi come elemento principale.
- State layer mock che legge il form e produce `UiState`.
- Connettore browser `window.MockEngine` che produce `PayloadContractV1` e `LegacyPayload` mock.
- Debug payload collassabile, chiuso di default.
- Cockpit Live Spot solo visuale come supporto secondario.
- Card istruzioni minima.
- Stati visivi statici.
- Messaggio statico sul bottone.

## Cosa non contiene

- Nessun dato reale collegato.
- Nessun payload reale.
- Nessuna tubatura.
- Nessuna integrazione esterna.
- Nessun motore dati.
- Nessun codice della vecchia UI.

## State layer mock

Il form espone prese interne tramite attributi `data-state-field`.

`FormStateLayer` legge solo questi campi e costruisce:

- `rider`
- `board`
- `kite`
- `windUserInput`
- `spot`
- `water`
- `result`
- `note`
- `readonly.liveWind`
- `meta`

Il Live Spot resta dentro `readonly.liveWind` e non entra nel payload legacy.

La pagina carica `../mock-engine/mock_engine.browser.js` prima di `mock_ui.js`.

`mock_ui.js` non contiene un adapter payload alternativo: usa solo `window.MockEngine` per generare `PayloadContractV1`, `LegacyPayload` e controllo anti-leak.

## Come aprirla

Apri direttamente:

```text
ui-lab/mock-ui/index.html
```

## Regola

Questa fase serve a guardare layout, densita, palette, blocchi e identita visiva prima di collegare qualunque adapter.

## V2.1 layout priority

Il form e' il cuore:

- desktop: form dominante a sinistra, Live Spot e istruzioni a destra;
- mobile: form subito visibile, poi Live Spot, poi istruzioni.

Live Spot supporta e non scrive nei dati.

## V3.8A — Live Spot readonly connector (zero-endpoint)

`mock_ui.js` include un modulo isolato `LiveSpotReadonlyConnector` che prepara il futuro collegamento al Live Spot **senza** chiamare alcun endpoint:

- usa solo payload sample statici (`SAMPLE_LIVE_OK`, `SAMPLE_LIVE_NULL`, `SAMPLE_LIVE_ERROR_SAFE`)
- normalizza la shape server in `normalizeLiveSpotPayload(...)`
- aggiorna **solo**:
  - il pannello UI Live Spot (read-only)
  - `readonly.liveWind` dentro `UiState` (visibile nel debug)

Vincoli:

- non tocca `windUserInput.wind` (vento dichiarato)
- non tocca `spot.location`
- non scrive nel `LegacyPayload`

Endpoint concettuali (non usati nel codice in questa fase):

- `/spot/resolve?spot=...`
- `/wind/latest?spot=...`

## V3.2 / V3.2B — dati reali statici, contratto legacy

`static_data.js` espone `window.MOCK_DATA` come oggetto **`Object.freeze`-d**, contenente:

- `CANONICAL_VALUES` con i value tecnici legacy (`level`, `water`, `result`, `board`, `gender`)
- `BRAND_LIST` (catalogo esteso: 43 brand totali. Include i 19 brand legacy + brand aggiuntivi trovati in `tabelle_kite_ordinate/01_kites.csv` e `fabbrica_output/kites_clean.csv`)
- `MODELS_BY_BRAND` (catalogo esteso: 43 chiavi brand. Totale 230 modelli *noti*. I brand aggiuntivi che nei CSV non riportano modelli espliciti restano con lista vuota: nessun modello viene inventato)
- `BOARD_SIZE_BY_TYPE` (misure legacy: `twintip` / `surfboard` / `foil`; UI `board.boardSize` popolata dinamicamente in base al tipo tavola, value invariati)

I value emessi nel `LegacyPayload` sono identici a quelli della UI legacy:

- `level`: `beginner` / `independent` / `advanced`
- `water`: `flat` / `chop_light` / `chop` / `chop_strong` / `small_waves` / `waves` / `big_waves`
- `result`: `underpowered` / `good` / `powered` / `overpowered` / `survival`
- `board`: `twintip` / `surfboard` / `foil`
- `gender`: `M` / `F`

Le label UI sono separate dai value: la label e' presa da `CANONICAL_VALUES.X[value]` (canonical EN) per default, da `RDK_TRANSLATIONS` quando le mappe i18n sono attive (v3.3).

## V3.3 — i18n legacy

La pagina carica `../../translations.js` come **dizionario dati read-only**: espone `window.RDK_TRANSLATIONS` (5 lingue: `it`, `en`, `de`, `es`, `fr`) con 173 chiavi simmetriche, lo stesso oggetto usato dalla UI legacy.

`mock_ui.js` non contiene piu un I18N inline. Mantiene 3 mappature di sole chiavi (no testo tradotto):

- `LEGACY_KEY_MAP`: chiave UI mock (`weight`, `boardType`, ...) -> chiave legacy (`label_weight`, `label_board`, ...)
- `OPTION_KEY_MAP`: per ogni enum, value tecnico (`independent`, `chop_light`, ...) -> chiave legacy (`opt_level_independent`, `opt_water_chop_light`, ...)
- `PROMPT_KEY_MAP`: per ogni `data-state-field` di un select, chiave legacy del prompt (`opt_level_prompt`, `opt_water_prompt`, ...)

Funzioni di lookup pure:

- `tLegacy(legacyKey)`: legge da `window.RDK_TRANSLATIONS[currentLang][legacyKey]` con fallback EN
- `t(key)`: usa `LEGACY_KEY_MAP[key]` -> `tLegacy(...)` con fallback locale per `windHint` (chiave non presente in legacy)
- `tOption(category, value)`: traduce solo la **label visibile** dell'option, lasciando il **value tecnico** intatto
- `tPrompt(path)`: traduce il prompt vuoto del select per il `data-state-field` indicato

Brand e model sono nomi propri: non vengono mai tradotti, solo i prompt dei select brand/model usano `opt_brand_prompt` / `opt_model_prompt`.

Cliccare IT / EN / DE / ES / FR nel language switch:

- aggiorna `currentLang`
- richiama `renderUI()` e `renderPayloadDebug()`
- aggiorna le label, i placeholder e i testi delle option
- **NON modifica i value** dei select; le selezioni gia fatte restano se il loro value tecnico esiste ancora (sempre, perche' non cambia mai)

`translations.js` e' caricato esclusivamente come dizionario; non viene reinterpretato e non viene importata nessuna logica da `app.js` o dalla UI legacy.

## Sicurezza

In `index.html`, `mock_ui.js` e `static_data.js` non ci sono:

- `fetch(`, `XMLHttpRequest`, `https?://`, `execute-api`
- riferimenti a `wa.me`, `whatsapp`, `script.google`, `googleapis`, `sheets.google`
- `localStorage`, `serviceWorker`
- import di `app.js`

L'unico file esterno caricato e' `../../translations.js`, dato puro.
