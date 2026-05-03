# SAFE MODULE STEP 1

## Scopo

Preparare un modulo safe per future funzioni laterali come community, share e audio, senza collegarlo al sito e senza cambiare il comportamento esistente.

## Perché non rompe nulla

- Il file `ui_extras.safe.js` contiene solo commenti.
- Il file non è richiamato da `index.html`.
- Non esistono import/export.
- Non viene modificato `app.js`.
- Non viene toccato `handleFormSubmit`.
- Non cambia payload, localStorage, submit, worker path, Google o WhatsApp.

## Cosa potrà contenere in futuro

- Funzioni UI laterali.
- Logica community non autoritativa.
- Share/PWA non critico.
- Audio o feedback utente non critico.
- Adapter isolati con failure mode separato.

## Regola di avanzamento

Prima modulo non collegato, poi test, poi eventuale collegamento esplicito in uno step separato.

Ogni step futuro deve dichiarare esplicitamente che non cambia la diga dati: il worker path resta il canale principale e il successo reale resta `submitPayload(payload)` con `durable true`.
