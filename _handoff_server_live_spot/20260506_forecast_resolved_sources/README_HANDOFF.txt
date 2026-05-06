VENTO LIVE / LIVE SPOT — HANDOFF VERSIONAMENTO

Contenuto pacchetto:

1) resolver.py
- contiene la patch forecast_resolved
- aggiunge _resolve_forecast_samples()
- esclude anemometri dal forecast
- usa ensemble modelli per forecast_1h / forecast_2h / forecast_3h
- evita che cache fresh blocchi il forecast resolver

2) spot_source_services.sql
- dump della tabella spot_source_services
- contiene il Libro fonti globali del Cervello
- serve a Scout / Extractor / Cervello
- non è runtime live diretto

Stato verificato:
- live-spot-server active
- API health OK
- forecast_1h/2h/3h source = forecast_resolved
- backup finale server presente

Regola:
non importare DB runtime completo nel repo.
Versionare solo codice e migrazioni/dump controllati.
