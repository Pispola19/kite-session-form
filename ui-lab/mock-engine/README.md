# ui-lab mock-engine

## Scopo

`mock-engine` e' un piccolo motore locale per verificare la catena dati della futura UI modulare:

1. legge uno `UiState` finto;
2. genera `PayloadContractV1`;
3. genera `LegacyPayload`;
4. confronta payload atteso e payload generato;
5. verifica che i dati read-only non entrino nel legacy.

## Come eseguire tutti i casi

Dal progetto UI:

```sh
node ui-lab/mock-engine/run_payload_diff.js
```

Equivalente esplicito:

```sh
node ui-lab/mock-engine/run_payload_diff.js all
```

## Browser wrapper

La mock UI file-based carica:

```sh
ui-lab/mock-engine/mock_engine.browser.js
```

Il wrapper espone `window.MockEngine` con:

- `buildPayloadContractV1`
- `toLegacyPayload`
- `diffPayload`
- `assertNoReadonlyLeak`
- `buildLegacyMessageId`

Il wrapper e' temporaneo e allineato a `mock_engine.js`.
Non legge DOM, non salva dati e non invia dati.

## Come eseguire solo i casi mock

```sh
node ui-lab/mock-engine/run_payload_diff.js mock
```

## Come eseguire solo i casi golden

```sh
node ui-lab/mock-engine/run_payload_diff.js golden
```

## Come eseguire un singolo caso

```sh
node ui-lab/mock-engine/run_payload_diff.js ui-lab/mock-engine/test-cases/06-live-wind-different
```

## Casi disponibili

- `01-basic`: dati completi normali.
- `02-empty-optionals`: opzionali vuoti e `gender` nullo.
- `03-gender-null`: `gender` nullo con altri campi pieni.
- `04-custom-board-brand-model`: valori custom per tavola, marca e modello.
- `05-long-note`: nota lunga senza effetto sugli altri campi.
- `06-live-wind-different`: dato read-only diverso dal vento utente.
- `07-dirty-numeric-inputs`: numerici sporchi normalizzati a cifre.

## Golden cases

- `01-golden`: esempio locale public gateway.
- `02-golden`: esempio locale flat SQS.
- `03-golden`: record storico locale anonimizzato e ricostruito per payload legacy.

## Cosa significa all_equal=true

`all_equal=true` significa che tutti i casi hanno generato un payload legacy uguale all'atteso, senza campi mancanti, senza campi extra, senza campi cambiati e senza leak read-only.

## Legacy hash parity

Per verificare il calcolo legacy di `message_id`:

```sh
node ui-lab/mock-engine/run_legacy_hash_parity.js
```

Il report distingue:

- `matched`: `message_id` atteso uguale a quello calcolato con la logica legacy.
- `mismatched`: differenza reale su un caso verificabile.
- `not_verifiable`: golden con `message_id` canary o ricostruito, non dimostrato come output storico del vecchio form.

## Sheet row mapping

Per verificare che una riga Google Sheet resti una vista visuale parziale:

```sh
node ui-lab/mock-engine/run_sheet_row_mapping.js
```

Il mapping produce `LegacyPayloadPartial`, marca sempre i campi mancanti per DAM completo e impedisce che `ID` venga trattato come `message_id`, `session_id` o `technical_id`.

## Sheet visual audit

Per generare un report chiaro su cosa contiene una riga Sheet e cosa manca rispetto a DAM:

```sh
node ui-lab/mock-engine/run_sheet_visual_audit.js
```

Il report deve mantenere `dam_golden_cases` a `0` e `all_google_visual_only` a `true`.

## Cosa garantisce

- Il payload legacy contiene solo i campi autorizzati.
- `wind` deriva solo da `windUserInput.wind`.
- I dati read-only restano fuori dal legacy.
- Il diff e' stabile grazie a identificatori e timestamp fissi.
- Nessun file della vecchia UI viene letto o modificato.

## Cosa NON garantisce

- Non valida la pipeline reale.
- Non valida code path di produzione.
- Non valida storage, code, worker, bridge o DB.
- Non sostituisce test end-to-end futuri.
- Non replica ancora in modo certificato ogni dettaglio interno del vecchio generatore `message_id`.

## Divieti

- Nessun target di rete reale.
- Nessun submit reale.
- Nessuna modifica alla vecchia UI.
- Nessuna scrittura su DB, code, log, JSONL o offset.
- Nessun codice grafico operativo.
