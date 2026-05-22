# SPEC_LOCAL_TRIANGULATION_ENGINE_V1

## Stato

- Specifica V1 per motore di triangolazione locale evidence-only.
- Documento di progetto, non implementazione runtime.
- Additive-only: definisce contesto, risultato e candidati descrittivi senza cambiare componenti operativi.
- Separato da discovery, runtime L0, promotion manuale e UI.

Riferimenti di coerenza:

- `SPEC_GLOBAL_SPOT_GEO_RESOLUTION_V1`: la triangolazione riceve spot o micro-zona gia risolti.
- `SPEC_REAL_WIND_SOURCE_REGISTRY_V1`: la triangolazione usa candidate sources gia censite o rese disponibili dal registry.
- `OCCHIO_DEL_RE_REPORT_CONTRACT_V1`: l'output puo alimentare report evidence-only, review umana e diagnostica locale.

## Scopo

Definire un motore locale che, dato uno spot o una micro-zona gia risolta e un insieme di candidate sources provenienti dal registry, produca una lettura osservativa descrittiva della realta vento locale.

La triangolazione V1 deve:

1. confrontare le candidate sources disponibili;
2. pesare la loro utilita locale rispetto allo spot risolto;
3. classificare ogni candidato per valore osservativo locale;
4. produrre sintesi evidence-only per report, review umana e analisi;
5. preferire incertezza esplicita a certezza forzata.

La triangolazione non governa il dato runtime e non decide promotion.

## Principio

Reality-first significa separare cio che il sistema osserva da cio che il runtime pubblica o rende operativo.

La triangolazione locale V1:

- osserva fonti;
- misura prossimita e coerenza;
- dichiara limiti;
- conserva blockers;
- restituisce evidenza descrittiva.

Non trasforma automaticamente una fonte in verita locale. Non trasforma uno score in ranking operativo. Non trasforma una coerenza temporale in promotion.

Regole centrali:

- triangolazione non significa promozione;
- un anemometro locale diretto e sano prevale descrittivamente su anchor lontane;
- un METAR e anchor di coerenza, non verita locale di default;
- un segnale debole deve restare `weak_signal` o `rejected` se non regge come evidenza locale;
- nessuna osservazione viene corretta in modo distruttivo.

## Boundary

### IN

- Spot canonico o micro-zona gia risolta.
- Geometria minima dello spot o della micro-zona.
- Candidate sources lette dal source registry.
- Snapshot evidence-only delle sorgenti candidate.
- Metadata descrittivi di distanza, quota, esposizione, stato endpoint/parser e affidabilita storica.

### OUT

- Mutazioni runtime.
- Scritture in `anemometer_station`.
- Scritture in `wind_cache`.
- Scritture in `forecast_cache`.
- Modifiche a `/wind/latest`.
- Modifiche a `resolver.py`.
- Modifiche a provider operativi.
- Modifiche a ranking operativo.
- Auto-promotion.
- SCART usato come gate runtime.
- Correzioni distruttive del dato osservato.

### Separazioni obbligatorie

| Area | Regola |
| --- | --- |
| Geo resolution | Risolve spot o micro-zona prima della triangolazione. |
| Source registry | Fornisce candidate sources; non riceve promotion automatica dalla triangolazione. |
| Local triangulation | Calcola evidenza locale descrittiva. |
| Discovery | Cerca e registra possibilita; non coincide con la triangolazione. |
| Runtime L0 | Resta separato e non viene scritto dalla triangolazione. |
| Review | Puo leggere il risultato; decide solo tramite processo umano separato. |

## Input

L'input V1 consigliato e composto da tre parti:

1. `triangulation_context`
2. `registry_candidates`
3. `candidate_evidence_snapshots`

### `triangulation_context`

`triangulation_context` descrive il punto locale rispetto al quale le fonti vengono valutate.

Campi consigliati:

| Campo | Tipo | Descrizione |
| --- | --- | --- |
| `spot_id` | string | Identificativo canonico dello spot risolto. |
| `spot_name` | string | Nome umano dello spot. |
| `micro_zone_id` | string oppure null | Identificativo micro-zona se disponibile. |
| `reference_lat` | number | Latitudine di riferimento. |
| `reference_lon` | number | Longitudine di riferimento. |
| `coast_orientation_deg` | number oppure null | Orientamento locale utile alla lettura di esposizione. |
| `target_time` | string | Timestamp ISO 8601 della finestra osservativa. |
| `time_window_minutes` | number | Finestra di tolleranza temporale per candidate evidence. |
| `resolved_by` | string oppure null | Riferimento descrittivo alla risoluzione geo upstream. |
| `context_notes` | array | Note evidence-only sul contesto locale. |

### Candidate sources dal registry

Ogni source candidate deve arrivare dal registry o da un adapter registry-compatible. La triangolazione non inventa sorgenti operative e non le promuove.

Informazioni minime attese:

- identita sorgente;
- tipo sorgente;
- label umana;
- posizione o riferimento geografico disponibile;
- quota sensore se nota;
- classe di esposizione se nota;
- stato endpoint/parser osservato;
- ultima evidence temporale disponibile;
- storia descrittiva di affidabilita se disponibile.

## Output

L'output V1 consigliato contiene:

1. `triangulation_context`
2. `triangulation_result`
3. `triangulation_candidates`

### `triangulation_result`

`triangulation_result` e una sintesi descrittiva. Non e un dato runtime.

Campi consigliati:

| Campo | Tipo | Descrizione |
| --- | --- | --- |
| `result_class` | enum | Stato sintetico del risultato locale. |
| `local_reading_available` | boolean | Indica se esiste una lettura locale descrittiva sufficiente. |
| `primary_candidate_source_id` | string oppure null | Candidato con maggiore valore locale descrittivo. |
| `anchor_candidate_source_ids` | array | Anchor utili alla coerenza ma non verita locale di default. |
| `candidate_count` | number | Numero candidati valutati. |
| `strong_local_candidate_count` | number | Numero candidati classificati `local_observed`. |
| `nearby_candidate_count` | number | Numero candidati classificati `nearby_observed`. |
| `blocking_flags` | array | Limiti che impediscono una lettura forte. |
| `result_notes` | array | Note evidence-only per report o review. |
| `promotion_allowed` | boolean | Sempre `false` in V1. |

Valori consigliati per `result_class`:

- `local_observed`
- `nearby_observed`
- `context_only`
- `weak_signal`
- `rejected`
- `not_available`

### `triangulation_candidates`

`triangulation_candidates` e l'array descrittivo dei candidati valutati.

Ogni candidato deve poter essere riportato in un report o review senza diventare una mutation instruction.

Campi minimi consigliati per candidato:

| Campo | Tipo | Descrizione |
| --- | --- | --- |
| `source_id` | string | Identificativo sorgente dal registry. |
| `source_type` | string | Tipo sorgente. |
| `label` | string | Label umana. |
| `distance_km` | number oppure null | Distanza dal riferimento locale. |
| `bearing_deg` | number oppure null | Bearing dal riferimento locale alla sorgente. |
| `sensor_height_m` | number oppure null | Quota o altezza sensore rilevante. |
| `exposure_class` | enum/string | Classe descrittiva di esposizione. |
| `endpoint_status` | enum/string | Stato endpoint osservato. |
| `parser_status` | enum/string | Stato parser osservato. |
| `local_truth_class` | enum | Classificazione evidence-only locale. |
| `triangulation_weight` | number oppure null | Peso descrittivo della triangolazione. |
| `triangulation_notes` | array | Note tecniche descrittive. |
| `promotion_allowed` | boolean | Sempre `false` in V1. |
| `promotion_blockers` | array | Motivi che impediscono promotion automatica. |

Campi additivi consigliati:

| Campo | Tipo | Descrizione |
| --- | --- | --- |
| `provider` | string oppure null | Provider o origine evidence. |
| `latest_observed_wind` | object oppure null | Snapshot osservativo non corretto in modo distruttivo. |
| `observed_at` | string oppure null | Timestamp osservazione. |
| `time_delta_minutes` | number oppure null | Scarto temporale dal `target_time`. |
| `temporal_coherence_class` | enum/string | Coerenza temporale descrittiva. |
| `reliability_history_class` | enum/string | Sintesi storica evidence-only. |
| `scart_flags` | array | Flag osservativi, mai gate runtime. |
| `flags` | array | Altri segnali descrittivi. |

## Fattori di triangolazione

Il motore V1 deve valutare almeno i seguenti fattori:

| Fattore | Uso descrittivo |
| --- | --- |
| Distanza | Piu una fonte e vicina e coerente col micro-contesto, maggiore e il suo valore locale. |
| Bearing | Aiuta a capire lato costa, sopravento/sottovento e possibili discontinuita locali. |
| Esposizione | Distingue sensore realmente esposto da sensore schermato o in contesto ambiguo. |
| Quota sensore | Evita equivalenze ingenue tra sensori a quote o altezze non comparabili. |
| Tipo sorgente | Anemometro locale, PWS, porto, boa, METAR, webcam o modello non hanno lo stesso ruolo. |
| Endpoint status | Fonte irraggiungibile o instabile pesa meno. |
| Parser status | Dato non parseable o ambiguo non deve essere forzato. |
| Coerenza temporale | Evidenze fuori finestra temporale perdono valore locale. |
| Storia di affidabilita | Stabilita, drift, buchi e coerenza storica restano descrittivi. |
| Coerenza tra fonti | Fonti indipendenti vicine e temporalmente coerenti rafforzano il quadro. |

Fattori non disponibili devono restare `null`, `unknown` o nota esplicita. Assenza di metadata non va mascherata da score alto.

## Classificazione candidate

`local_truth_class` classifica il ruolo locale del candidato.

| Classe | Significato |
| --- | --- |
| `local_observed` | Osservazione direttamente locale o micro-locale con evidence forte e temporalmente valida. |
| `nearby_observed` | Osservazione vicina e utile, ma non equivalente di default alla verita sullo spot. |
| `non_local_anchor` | Anchor di coerenza o contesto, utile per confronto ma non locale di default. |
| `weak_signal` | Evidenza debole, incompleta, temporalmente povera o troppo ambigua. |
| `rejected` | Evidenza non utilizzabile nel risultato descrittivo corrente. |

Regole di classificazione:

1. Un anemometro locale diretto con endpoint/parser sani, finestra temporale coerente ed esposizione nota puo essere `local_observed`.
2. Una sorgente vicina ma non micro-locale puo essere `nearby_observed` anche se numericamente coerente.
3. Un METAR deve partire da ruolo `non_local_anchor` salvo evidenza specifica e manualmente argomentata che ne cambi il ruolo descrittivo in un contesto futuro.
4. Un modello puo descrivere contesto o coerenza, ma non sostituisce observed local evidence.
5. Fonte con parser rotto, timestamp non utilizzabile o contesto geografico non affidabile deve degradare verso `weak_signal` o `rejected`.

## Regole di scoring descrittivo

`triangulation_weight` e un peso evidence-only. Non e `rank_score` operativo, non e `trust_score` runtime, non e confidence di promotion.

### Regola V1

Il peso puo essere normalizzato in intervallo `0.0` - `1.0` solo per confronto interno al risultato descrittivo della stessa triangolazione.

Fattori positivi possibili:

- distanza micro-locale;
- tipo sorgente direttamente osservativo;
- endpoint e parser sani;
- timestamp dentro finestra;
- esposizione nota e compatibile;
- affidabilita storica descrittivamente stabile;
- coerenza con almeno una evidenza indipendente non distruttiva.

Fattori riduttivi possibili:

- distanza elevata;
- barriera geografica o esposizione non comparabile;
- quota sensore ignota o non comparabile;
- endpoint instabile;
- parser ambiguo;
- timestamp vecchio;
- storia di affidabilita debole;
- fonte che puo essere solo anchor di contesto.

### Precedenze descrittive

1. `local_observed` forte prevale su `non_local_anchor` lontane anche se le anchor sono stabili.
2. Due anchor lontane coerenti non trasformano da sole un'area senza sensore locale in `local_observed`.
3. Uno score alto senza evidence locale sufficiente deve restare contestuale.
4. Se la classificazione e debole, il risultato deve dichiararlo invece di promuovere una certezza.

### Uso vietato dello scoring

Lo score non deve:

- aggiornare ranking operativo;
- cambiare output `/wind/latest`;
- correggere osservazioni salvate;
- scrivere cache runtime;
- abilitare auto-promotion;
- usare SCART come cancello runtime.

## Fallback policy

La fallback policy V1 e conservativa.

| Caso | Fallback |
| --- | --- |
| Nessun candidato dal registry | `triangulation_result.result_class = "not_available"`. |
| Candidati senza evidence parseable | Classificare `weak_signal` o `rejected`. |
| Solo METAR o anchor lontane | Restituire contesto/anchor; non dichiarare verita locale. |
| Segnali temporalmente fuori finestra | Ridurre peso e dichiarare blocking flag. |
| Fonti vicine in conflitto | Esporre conflitto, preservare letture, chiedere review/analisi. |
| Anemometro locale sano piu anchor lontane divergenti | Preservare divergenza; non correggere distruttivamente il dato locale. |
| Metadata esposizione/quota mancanti | Dichiarare incertezza e non forzare classe forte. |

Se il sistema non riesce a sostenere una lettura locale descrittiva, deve restituire `weak_signal`, `rejected` o `not_available`.

## Non-goals

Questa specifica non definisce:

- implementazione runtime;
- mutation path verso DB o cache;
- promozione automatica di source;
- update di `anemometer_station`;
- update di `wind_cache`;
- update di `forecast_cache`;
- modifica a `/wind/latest`;
- modifica a resolver o provider;
- ranking operativo;
- correzione distruttiva del dato osservato;
- discovery di nuove fonti;
- gate SCART per runtime;
- UI pubblica;
- automatismi di decisione umana.

## Relazione con Occhio del Re

Occhio del Re puo leggere la triangolazione come evidence-only.

Mapping additivo consigliato:

| Triangulation | Occhio del Re |
| --- | --- |
| `triangulation_candidates` | `observed_candidates` oppure sezione report additiva referenziata. |
| `local_truth_class` | `observed_candidates[].local_truth_class`. |
| `triangulation_weight` | Nota/score descrittivo locale, mai promotion gate. |
| `triangulation_result.blocking_flags` | `diagnostics.blocking_flags` se pertinenti al report. |
| `triangulation_result.result_notes` | `diagnostics.diagnostic_notes` o attachment locale. |

Guardrail obbligatori per report/review:

- `promotion_allowed` resta `false`;
- il risultato resta evidence-only;
- SCART e ranker restano osservatori;
- report e review locali non mutano runtime;
- una eventuale decisione umana futura resta processo separato.

## Esempio JSON minimo

```json
{
  "schema_version": "local_triangulation_engine_v1",
  "generated_at": "2026-05-21T10:00:00+00:00",
  "triangulation_context": {
    "spot_id": "punta_trettu",
    "spot_name": "Punta Trettu",
    "micro_zone_id": "punta_trettu_lagoon",
    "reference_lat": 39.109,
    "reference_lon": 8.435,
    "coast_orientation_deg": 220,
    "target_time": "2026-05-21T10:00:00+00:00",
    "time_window_minutes": 20,
    "resolved_by": "geo_resolution_v1",
    "context_notes": [
      "Spot gia risolto prima della triangolazione."
    ]
  },
  "triangulation_result": {
    "result_class": "nearby_observed",
    "local_reading_available": false,
    "primary_candidate_source_id": "pws_sant_antioco_01",
    "anchor_candidate_source_ids": [
      "metar_liec"
    ],
    "candidate_count": 2,
    "strong_local_candidate_count": 0,
    "nearby_candidate_count": 1,
    "blocking_flags": [
      "no_direct_local_anemometer",
      "anchor_not_local_truth"
    ],
    "result_notes": [
      "La PWS vicina offre contesto osservativo utile.",
      "Il METAR resta anchor di coerenza e non verita locale di default."
    ],
    "promotion_allowed": false
  },
  "triangulation_candidates": [
    {
      "source_id": "pws_sant_antioco_01",
      "source_type": "pws",
      "label": "PWS Sant Antioco",
      "provider": "registry_snapshot",
      "distance_km": 7.4,
      "bearing_deg": 185,
      "sensor_height_m": 11,
      "exposure_class": "partially_exposed",
      "endpoint_status": "ok",
      "parser_status": "ok",
      "latest_observed_wind": {
        "wind_knots": 16.2,
        "gust_knots": 21.0,
        "wind_direction": 310,
        "observed_at": "2026-05-21T09:54:00+00:00",
        "unit_original": "kt",
        "converted_to_knots": false
      },
      "observed_at": "2026-05-21T09:54:00+00:00",
      "time_delta_minutes": 6,
      "temporal_coherence_class": "inside_window",
      "reliability_history_class": "stable_context",
      "local_truth_class": "nearby_observed",
      "triangulation_weight": 0.74,
      "triangulation_notes": [
        "Vicino allo spot ma non sensore micro-locale.",
        "Esposizione parziale da mantenere visibile in review."
      ],
      "promotion_allowed": false,
      "promotion_blockers": [
        "not_direct_local_anemometer",
        "manual_review_required"
      ]
    },
    {
      "source_id": "metar_liec",
      "source_type": "metar",
      "label": "METAR Cagliari",
      "provider": "registry_snapshot",
      "distance_km": 61.0,
      "bearing_deg": 96,
      "sensor_height_m": null,
      "exposure_class": "airport_anchor",
      "endpoint_status": "ok",
      "parser_status": "ok",
      "local_truth_class": "non_local_anchor",
      "triangulation_weight": 0.31,
      "triangulation_notes": [
        "Anchor di coerenza non locale.",
        "Non sostituisce osservazione locale sullo spot."
      ],
      "promotion_allowed": false,
      "promotion_blockers": [
        "non_local_anchor",
        "not_spot_local"
      ]
    }
  ]
}
```

## Decisione finale

`SPEC_LOCAL_TRIANGULATION_ENGINE_V1` e approvabile come specifica evidence-only e additive-only.

La triangolazione locale V1 deve restare:

- separata da discovery;
- separata da runtime L0;
- separata da promotion;
- non distruttiva verso observed data;
- compatibile con report e review locali;
- incapace, per design, di scrivere DB, cache, resolver, provider, ranking operativo o `/wind/latest`.

Ogni implementazione futura deve dimostrare prima questi boundary. Se un passaggio richiede mutation runtime, auto-promotion o correzione operativa del dato, esce da questa specifica e richiede decisione separata.
