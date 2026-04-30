# SPEC_MODULES

## AppShell

Responsabilita:

- Orchestrare i moduli.
- Mantenere `UiState`.
- Passare stato e azioni ai moduli.
- Coordinare preview, draft e submit mock.

Input:

- Stato iniziale vuoto o draft locale.

Output:

- `UiState` completo.

Validazioni:

- Verifica presenza dei moduli richiesti.
- Non valida regole di dominio specifiche dei singoli moduli.

Vietato:

- Chiamare endpoint reali.
- Costruire direttamente `LegacyPayload`.
- Conoscere dettagli DAM/SQS/Google/WhatsApp.

## RiderModule

Responsabilita:

- Gestire dati rider.

Input:

- `weight`
- `gender`
- `level`

Output:

- `UiState.rider`

Validazioni:

- `weight` obbligatorio.
- `weight` numerico come stringa.
- `level` obbligatorio.
- `gender` opzionale, valori ammessi `M`, `F`, `null`.

Vietato:

- Inferire peso o livello.
- Chiamare scout/cervello.
- Modificare altri moduli.

## BoardModule

Responsabilita:

- Gestire tipo e misura tavola.

Input:

- `board`
- `boardSize`

Output:

- `UiState.board`

Validazioni:

- `board` obbligatorio.
- `boardSize` opzionale.
- Valori compatibili con legacy.

Vietato:

- Cambiare semanticamente `board`.
- Deducere risultato sessione.
- Scrivere payload finale.

## KiteModule

Responsabilita:

- Gestire vela, marca e modello.

Input:

- `kite`
- `brand`
- `model`

Output:

- `UiState.kite`

Validazioni:

- `kite` obbligatorio.
- `kite` numerico come stringa.
- `brand` opzionale.
- `model` opzionale.

Vietato:

- Normalizzare in modo distruttivo marca/modello.
- Chiamare cataloghi reali.
- Cambiare `kite` usando suggerimenti esterni.

## WindUserInputModule

Responsabilita:

- Gestire il vento dichiarato dall'utente.

Input:

- `wind`

Output:

- `UiState.windUserInput`

Validazioni:

- `wind` obbligatorio.
- `wind` numerico come stringa.

Vietato:

- Leggere Live Wind come valore operativo.
- Sovrascrivere `wind`.
- Mediare `wind` con dati provider.

## SpotModule

Responsabilita:

- Gestire lo spot dichiarato dall'utente.

Input:

- `location`

Output:

- `UiState.spot`

Validazioni:

- `location` opzionale.
- Trim non distruttivo.

Vietato:

- Riscrivere lo spot con resolver reale.
- Nascondere il valore inserito dall'utente.
- Mandare query a servizi reali in fase mock-only.

## WaterModule

Responsabilita:

- Gestire condizioni acqua.

Input:

- `water`

Output:

- `UiState.water`

Validazioni:

- `water` opzionale.
- Valori compatibili con legacy.

Vietato:

- Inferire acqua da spot o vento.
- Modificare risultato.

## ResultModule

Responsabilita:

- Gestire risultato dichiarato dall'utente.

Input:

- `result`

Output:

- `UiState.result`

Validazioni:

- `result` obbligatorio.
- Valori compatibili con legacy.

Vietato:

- Usare modelli fisici per correggere outcome.
- Usare Live Wind per cambiare outcome.
- Salvare risultati derivati come se fossero utente.

## NoteModule

Responsabilita:

- Gestire note libere.

Input:

- `note`

Output:

- `UiState.note`

Validazioni:

- Campo opzionale.
- Nessun parsing operativo in fase UI.

Vietato:

- Estrarre dati operativi dalla nota.
- Chiamare NLP, scout o cervello.

## SubmitModule

Responsabilita:

- Validare stato complessivo.
- Generare `PayloadContractV1`.
- Passare al `LegacyCompatibilityAdapter`.
- Usare `MockSubmitConnector` in fase iniziale.

Input:

- `UiState`

Output:

- Risultato submit mock.
- Eventuale `PayloadDiff`.

Validazioni:

- Campi obbligatori presenti.
- Payload legacy generabile.

Vietato:

- Chiamare DAM reale in fase mock-only.
- Chiamare Google Sheet.
- Chiamare WhatsApp.
- Chiamare Live Wind reale.

## LiveWindReadonlyModule

Responsabilita:

- Mostrare vento live in modalita visuale e separata.

Input:

- `location` o spot display.

Output:

- `UiState.readonly.liveWind`

Validazioni:

- Nessuna validazione sul payload operativo.

Vietato:

- Scrivere `wind`.
- Scrivere `result`.
- Scrivere `location`.
- Entrare in `LegacyPayload`.

## StatusFeedbackModule

Responsabilita:

- Mostrare stati UI: pronto, valido, errore, inviato mock.
- Mostrare ricevute mock.
- Mostrare differenze payload in fase test.

Input:

- Stato submit.
- Esito connettori mock.
- Diff payload.

Output:

- Stato visuale.

Validazioni:

- Nessuna validazione dati operativi.

Vietato:

- Decidere successo operativo reale.
- Aprire WhatsApp reale.
- Inviare dati a Google Sheet.
