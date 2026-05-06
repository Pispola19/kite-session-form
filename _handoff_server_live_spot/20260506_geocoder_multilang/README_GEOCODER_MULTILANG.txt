VENTO LIVE — PATCH GEOCODER MULTILINGUA

File modificato:
providers.py

Funzione:
geocode_candidates()

Obiettivo:
migliorare /spot/candidates senza far decidere automaticamente il sistema al posto dell'utente.

Cosa fa:
- cerca il nome originale digitato dall'utente
- cerca in più lingue: en, it, de, es, fr
- aggiunge alias controllati per città molto note:
  Napoli / Naples / Nápoles
  Roma / Rome
  Venezia / Venice
  Firenze / Florence
- deduplica risultati per id/coordinate
- ricalcola ranking interno
- mantiene needs_disambiguation quando ci sono più candidati

Verificato:
- Napoli -> Napoli IT Campania rank 1
- Naples -> Naples IT Campania rank 1
- Napoles -> Napoli IT Campania rank 1
- Yyteri -> Yyteri FI rank 1
- Grado -> resta ambiguo, utente sceglie

Regola:
il geocoder allarga la ricerca, non decide al posto dell'utente.
