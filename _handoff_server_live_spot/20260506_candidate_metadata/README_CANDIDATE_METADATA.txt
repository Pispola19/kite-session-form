VENTO LIVE — PATCH CANDIDATE METADATA

File modificato:
providers.py

Funzione:
geocode_candidates()

Obiettivo:
aggiungere metadata di classificazione ai candidati geocoder
senza modificare ranking, sorting, filtering o needs_disambiguation.

Nuovi campi:
- candidate_type
- candidate_notes

Tipi iniziali:
- direct_exact
- translated_alias
- weak_related
- partial_match
- other

Verificato:
- Venezia IT -> direct_exact
- Venice US Florida -> translated_alias
- Dayton US Ohio -> weak_related
- Ross US Ohio -> weak_related

Regola:
non eliminare informazione utile.
Classificare prima, decidere dopo.
L'utente resta Re, il Cervello è cavalier servente.
