# ANTI_BREAK_BASELINE

## Contratti congelati

- Non modificare `index.html` per quanto riguarda `id`, `name`, ordine dei campi, presenza del form `#kiteForm`, `#sendBtn`, `#validationNotice`, `#previewText`, `#installBanner`, `#shareAppBtn`, `#statusModal`.
- Non modificare la shape del payload costruito dal frontend.
- Non modificare le chiavi usate in `localStorage`.
- Non modificare le chiavi `data-i18n` e `data-i18n-placeholder`.
- Non modificare il mapping verso Google Sheets.
- Non modificare il flusso submit attuale, inclusi lock/unlock del bottone, modal di stato, reset finale e apertura WhatsApp.

## Funzioni vietate

- `handleFormSubmit()`
- `submitPayload()`
- `submitSessionToGoogleSheets()`
- `collectFormData()`
- `buildPayload()`
- `generateMessageId()`
- `openWhatsAppWithMessage()`
- `syncModelUI()`
- `syncBoardSizeOptions()`
- `applyTranslations()`
- `restoreDraftSession()`

## Path vitale dati

Il path vitale dati da preservare senza variazioni e':

1. Lettura campi dal DOM
2. `collectFormData()`
3. `buildPayload()`
4. `savePendingLocalSubmit(...)`
5. `submitPayload(...)`
6. Salvataggio locale durevole confermato
7. Solo dopo: messaggio uscente, Google Sheets, WhatsApp, UI accessoria

## Regola assoluta

- Trasporto dati intoccabile fino a nuovo ordine.
- Il tratto da inizio submit fino al cancello/fabbrica non si tocca.
- Nessuna modifica a trasporto locale, payload, mapping, ordine del submit o contratti tra frontend e backend.

## Successo reale del dato

- Il successo reale e' `submitPayload(payload)` con `response.ok`, `result.ok === true` e `result.durable === true`.
- Dopo `localDurableConfirmed = true` il dato e' considerato salvo nel worker path.
- Google Sheets e' canale di controllo / backup.
- WhatsApp e' canale di riscontro operativo umano.
- Errori Google/WhatsApp/messaggio dopo `localDurableConfirmed` non devono annullare il successo reale.
- Questi errori devono diventare warning, non `submit_error` principale.
- Solo gli errori prima del worker durable sono critical.

## Test obbligatori

- Caricamento pagina senza errori.
- Cambio lingua senza regressioni visibili.
- `board` -> `boardSize` ancora funzionante.
- `brand` -> `model` ancora funzionante.
- Validazione required e numerica invariata.
- Preview ancora coerente con i campi.
- Draft salvato e ripristinato correttamente dopo reload.
- Submit completo invariato end-to-end.
- Modal pending/success/error invariato.
- Bottone `send` correttamente bloccato e sbloccato.
- Reset form invariato dopo submit riuscito.
- Apertura WhatsApp invariata.

## Rollback

- Uno step per volta, perimetro stretto.
- Se cambia anche un solo comportamento del baseline, rollback immediato dello step corrente.
- Se cambia payload, mapping, draft, validazione, submit sequence o reset finale, rollback obbligatorio.
- Nessuno step successivo puo' partire finche il baseline non torna identico.
