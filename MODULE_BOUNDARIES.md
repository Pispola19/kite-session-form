# MODULE_BOUNDARIES

## Principio generale

- Ogni nuova funzione deve stare fuori dal core dati.
- Il worker path e' intoccabile.
- Google, WhatsApp e UI sono adapter secondari.
- Se un modulo si rompe, il dato deve comunque sopravvivere.

## Core intoccabile

- `collectFormData()`
- `buildPayload()`
- `submitPayload()`
- worker path
- payload shape
- `message_id`
- `technical_id`
- localStorage keys critiche
- `handleFormSubmit()` per ora non modificabile

## Moduli laterali consentiti

- spot services
- community real futura
- UI feedback
- preview
- share/PWA
- Google adapter
- WhatsApp adapter

## Regola di innesto futuro

Ogni modulo futuro deve avere:

- input chiaro
- output chiaro
- nessuna modifica al core
- fallback
- failure mode isolato
- rollback semplice

## Ordine di separazione consigliato

- prima documenti/contratti
- poi moduli read-only
- poi adapter secondari
- poi storage
- solo alla fine submit orchestrator

## Cose vietate

- modifiche miste
- refactor grandi
- toccare payload per feature UX
- cambiare `id`/`name` HTML
- collegare moduli nuovi dentro `handleFormSubmit` senza contratto

## Regola finale

Prima si crea il confine, poi si collega il modulo.
