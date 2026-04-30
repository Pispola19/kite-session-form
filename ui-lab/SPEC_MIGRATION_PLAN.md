# SPEC_MIGRATION_PLAN

## A. ui-lab mock-only

Creare ambiente isolato dentro `ui-lab`.

Vincoli:

- Nessun endpoint reale.
- Nessun DAM.
- Nessun Google Sheet.
- Nessun WhatsApp.
- Nessun Live Wind reale.
- Nessuna modifica alla vecchia UI.

Obiettivo:

- Dimostrare architettura e stato modulare.

## B. payload mock

Generare `UiState`, `PayloadContractV1` e `LegacyPayload` con dati finti.

Obiettivo:

- Verificare che il payload legacy sia producibile senza dipendere dal vecchio DOM.

## C. payload diff

Confrontare payload vecchio e nuovo su casi controllati.

Obiettivo:

- Identificare differenze di nomi, tipi, valori vuoti, timestamp e `message_id`.

## D. adapter compatibility

Stabilizzare `LegacyCompatibilityAdapter`.

Obiettivo:

- Produrre payload legacy equivalente a quello attuale.

Gate:

- Nessun campo mancante.
- Nessun campo extra nel legacy.
- Nessuna contaminazione da Live Wind.

## E. test locale

Eseguire test locali mock-only.

Obiettivo:

- Validare moduli, contract, adapter, diff e draft senza rete.

Vietato:

- Avviare submit reale.
- Scrivere su DB o JSONL.
- Chiamare backend.

## F. innesto dietro flag

Solo dopo validazione, preparare innesto controllato.

Obiettivo:

- Tenere vecchia UI disponibile.
- Attivare nuova UI solo con flag esplicito.

Gate:

- Rollback immediato.
- Nessun cambio ai campi operativi.

## G. DAM reale solo dopo validazione

Attivare `DamSubmitConnector` solo dopo:

- payload diff approvato;
- adapter stabile;
- test end-to-end in ambiente controllato;
- autorizzazione esplicita;
- piano rollback.

Obiettivo:

- Rendere DAM l'unica verita operativa.

## H. vecchia UI nascosta

Dopo prove reali positive, nascondere la vecchia UI senza rimuoverla.

Obiettivo:

- Ridurre rischio utente mantenendo rollback.

## I. vecchia UI rimossa solo dopo backup e rollback

Rimuovere la vecchia UI solo quando:

- esiste backup;
- la nuova UI e' stabile;
- DAM/SQS/bridge sono validati;
- Google Sheet e WhatsApp sono confermati non operativi;
- esiste piano rollback documentato.

Obiettivo:

- Eliminare la faccia vecchia solo dopo prova completa del nuovo percorso.
