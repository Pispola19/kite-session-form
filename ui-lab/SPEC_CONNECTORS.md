# SPEC_CONNECTORS

## MockSubmitConnector

Tipo:

- Mock.
- Write simulato, nessuna rete.

Scopo:

- Simulare il submit in `ui-lab`.

Input:

- `LegacyPayload`

Output:

```js
{
  ok: true,
  durable: true,
  mock: true,
  receipt: {
    id: "mock_receipt"
  }
}
```

Rischio:

- Basso. Il rischio principale e' confondere ricevuta mock con successo reale.

Attivazione:

- Subito, fase A/B.

## DamSubmitConnector futuro

Tipo:

- Reale futuro.
- Write reale.

Scopo:

- Inviare il `LegacyPayload` validato alla pipeline DAM.

Input:

- `LegacyPayload`

Output:

- Risposta DAM reale con `ok` e `durable`.

Rischio:

- Alto. Puo' alimentare SQS, worker, bridge e DB.

Attivazione:

- Solo dopo payload diff zero, test adapter, rollback plan e autorizzazione esplicita.

## GoogleSheetVisualOnlyConnector futuro

Tipo:

- Futuro.
- Visual-only.
- Non operativo.

Scopo:

- Mostrare all'utente una vista di controllo equivalente a quanto andrebbe su foglio.

Input:

- `PayloadContractV1` o vista derivata.

Output:

- Preview visuale o stato di controllo.

Rischio:

- Medio. Il rischio e' farlo tornare tubo dati operativo.

Attivazione:

- Solo quando DAM e' confermato come unica verita operativa.

## WhatsAppFeedbackConnector futuro

Tipo:

- Futuro.
- Feedback utente.

Scopo:

- Generare un messaggio di conferma leggibile per l'utente.

Input:

- `PayloadContractV1` o vista sessione.

Output:

- Testo messaggio o link preparato.

Rischio:

- Medio. Non deve diventare sorgente dati.

Attivazione:

- Solo dopo separazione completa da submit operativo.

## LiveWindReadonlyConnector futuro

Tipo:

- Futuro.
- Read-only.

Scopo:

- Recuperare vento live per display, non per payload.

Input:

- `location` o identificatore spot.

Output:

```js
{
  speed: null,
  gust: null,
  direction: "",
  updated_at: "",
  source: ""
}
```

Rischio:

- Medio. Il rischio e' contaminare `wind` dichiarato dall'utente.

Attivazione:

- Prima con dati mock, poi reale solo in ramo read-only e con test che impedisce scrittura su `wind`.

## PayloadDiffConnector

Tipo:

- Read-only.
- Mock/test.

Scopo:

- Confrontare payload generato dalla nuova UI con payload legacy atteso.

Input:

- `LegacyPayload` atteso.
- `LegacyPayload` generato.

Output:

```js
{
  equal: false,
  missing_fields: [],
  extra_fields: [],
  changed_fields: []
}
```

Rischio:

- Basso.

Attivazione:

- Fase C.

## LocalDraftConnector

Tipo:

- Locale.
- Write browser storage.

Scopo:

- Salvare e ripristinare `UiState` in ambiente lab.

Input:

- `UiState`

Output:

- Draft ripristinabile con versione.

Rischio:

- Medio-basso. Rischio di ripristinare draft vecchi o schema non compatibile.

Attivazione:

- Dopo definizione di versione draft e clear/reset esplicito.
