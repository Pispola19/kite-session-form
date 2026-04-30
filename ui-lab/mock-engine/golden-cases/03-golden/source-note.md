# 03-golden

Deriva da `/Users/PER_TEST/raccolta_dati_K_test/ingest_api/storage/worker_output.jsonl`, riga storica con `src=form_v1`.

Tipo: record reale locale anonimizzato e ricostruito per audit del payload legacy.

Anonimizzazione:

- `session_id` sostituito con `golden03_session`.
- `technical_id` sostituito con `golden03_technical`.
- `location` sostituita con `anon_spot`.
- `note` sostituita con `anon_note`.
- `brand` e `model` sostituiti con valori neutri.
- `message_id` aggiunto come valore fisso `msg_golden03` perche il record storico locale non conservava quel campo.

Campi tecnici preservati per il diff: `src`, `weight`, `gender`, `board`, `boardSize`, `level`, `kite`, `wind`, `water`, `result`, `event_ts`, `ts`.

Nessun endpoint chiamato. Nessun submit eseguito.

Hash parity: not verifiable. Il `message_id` e' stato aggiunto come valore fisso per il golden ricostruito perche il record storico locale non conservava quel campo.
