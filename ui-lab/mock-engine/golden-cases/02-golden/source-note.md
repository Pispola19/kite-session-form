# 02-golden

Deriva da `/Users/PER_TEST/raccolta_dati_K_test/tests/test_sqs_engine_message_shapes.py`, funzione `_flat_lambda_body`.

Tipo: esempio locale di forma legacy flat accettata dal motore SQS.

Anonimizzazione: nessun dato personale presente nel test sorgente; valori canary mantenuti per stabilita del diff.

Nessun endpoint chiamato. Nessun submit eseguito.

Hash parity: not verifiable. Il `message_id` e' un valore canary gia' presente nel test locale, non e' dimostrato che sia stato generato da `app.js`.
