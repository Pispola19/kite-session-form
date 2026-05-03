# SAFE MODULE STEP 2 READONLY

## Scopo

Preparare un modulo read-only non collegato al sito, destinato a leggere in futuro un piccolo snapshot dello stato UI senza cambiare il comportamento esistente.

## Perché non rompe nulla

- Il file `ui_readonly.safe.js` non è richiamato da `index.html`.
- Non esistono import/export.
- La funzione `readReadonlyFieldSnapshot` non viene chiamata.
- Non viene assegnato nulla a `window`.
- Non viene modificato `app.js`.
- Non viene toccato `handleFormSubmit`.
- Non cambia payload, localStorage, submit, worker path, Google o WhatsApp.

## Cosa legge in futuro

- Campo `location`.
- Campo `wind`.
- Campo `kiteSize`.
- Campo `weight`, esposto nello snapshot come `riderWeight`.

## Cosa NON deve mai fare

- Non deve inviare dati.
- Non deve chiamare `fetch`.
- Non deve leggere o scrivere `localStorage`.
- Non deve modificare il DOM.
- Non deve decidere il successo reale del dato.
- Non deve alterare payload, submit o worker path.
- Non deve invertire la diga dati: il worker path resta il canale principale e il successo reale resta `submitPayload(payload)` con `durable true`.

## Regola di avanzamento

Read-only prima, test esplicito poi, collegamento solo in uno step separato e dichiarato.
