# CODEBASE MAP

## 1. Panoramica sintetica del progetto

Questa codebase contiene un frontend statico per raccolta dati di sessioni kite, con invio verso Google Sheets e con un layer ingest locale separato basato su file queue.

La struttura attuale e' divisa in cinque aree principali:

- frontend runtime attivo in root
- supporto PWA, asset e file statici di contorno
- layer ingest locale, specifiche e test
- stato runtime locale e stato condiviso con `dati_massivi_test`
- reference/external, archive/historical e artefatti generati non runtime

Questa mappa serve come base prudente per un refactor futuro conservativo, senza introdurre modifiche premature ai punti sensibili.

## 2. Classificazione delle aree

### Core frontend attivo

File che governano direttamente UI, comportamento del form, traduzioni e submit utente:

- `index.html`
- `app.js`
- `styles.css`
- `translations.js`

Note:

- `app.js` e' il file piu' centrale e piu' stratificato.
- Il frontend attuale non risulta leggere i CSV di supporto a runtime.

### Supporto/config/assets

File di supporto al deploy, PWA, asset e materiale statico non core:

- `pwa.js`
- `sw.js`
- `manifest.json`
- `icons/`
- `google7587c8ec7ec66e24.html`

Nota:

- questi file sono supporto del frontend o del deploy statico.
- `tabelle_kite_ordinate/` non e' supporto runtime del frontend; e' classificata sotto archive/historical.

### Ingest/spec/test

Area che documenta o implementa il trasporto e l'ingest in piu' strati:

- `INGEST_SPEC.md`
- `google_sheet_ingest_reference.py`
- `test_google_sheet_ingest_reference.py`
- `google_sheets_webhook.gs`
- `ingest_api/`

Contenuto principale di `ingest_api/`:

- `ingest_api/main.py`
- `ingest_api/queue.py`
- `ingest_api/worker.py`
- `ingest_api/storage/`

Nota:

- oggi coesistono tre forme parallele dello stesso dominio ingest: reference parser Python, webhook Google Apps Script e micro-pipeline locale con queue e worker.
- `ingest_api/storage/` contiene stato runtime vivo e stato condiviso con il bridge in `dati_massivi_test`; non e' documentazione.

### Stato runtime, archive/historical e generated artefact

Stato runtime locale o condiviso:

- `ingest_api/storage/`

Contenuto principale di `ingest_api/storage/`:

- `submissions.jsonl` - queue persistente locale di ingresso
- `worker_output.jsonl` - output del worker locale, consumato dal bridge in `dati_massivi_test`
- `worker_offset.txt` - stato di avanzamento del worker locale
- `bridge_offset.txt` - stato di avanzamento del bridge cross-directory

Archive/historical non runtime attivo:

- `tabelle_kite_ordinate/`

Contenuto principale di `tabelle_kite_ordinate/`:

- `01_kites.csv`
- `02_tavole_twin_tip.csv`
- `03_surfboard.csv`
- `04_tavole_kite_foil.csv`
- `05_piantoni_ali_foil.csv`
- `06_setup_foil_dettaglio.csv`
- `README.txt`

Generated artefact non runtime attivo:

- `fabbrica_output/`

Contenuto principale di `fabbrica_output/`:

- `brand_map.csv`
- `kites_clean.csv`
- `twintip_clean.csv`
- `surf_clean.csv`
- `foil_board_clean.csv`
- `foil_parts_clean.csv`
- `foil_setup_clean.csv`
- `processing_log.txt`

Elementi micro-puliti non piu' presenti nel perimetro attivo:

- `main`
- `__pycache__/`
- `ingest_api/__pycache__/`
- `.DS_Store`
- `ingest_api/.DS_Store`

Archivio reversibile:

- `/Users/PER_TEST/SIERRA/raccolta_dati_K_test_micro_pulizia_reversibile_20260421T162143`

Nota:

- `fabbrica_output/` e `tabelle_kite_ordinate/` non risultano runtime attivo.
- `ingest_api/storage/` e' runtime/stato operativo e non deve essere confuso con output generato pulibile.

### Stato chiarito e punti ancora da verificare

Stato chiarito:

- `main` era file vuoto in root ed e' stato spostato in archivio reversibile SIERRA.
- `__pycache__/`, `ingest_api/__pycache__/`, `.DS_Store` e `ingest_api/.DS_Store` erano artefatti generati o metadata macOS e sono stati spostati in archivio reversibile SIERRA.
- `ingest_api/storage/bridge_offset.txt` e' stato confermato come stato runtime condiviso: e' referenziato da `/Users/PER_TEST/dati_massivi_test/scripts/worker_output_bridge.py`.
- `ingest_api/storage/worker_output.jsonl` e' stato confermato come output consumato dal bridge cross-directory.

Punti ancora da verificare prima di qualunque riordino:

- eventuale uso storico o documentale di `tabelle_kite_ordinate/`
- eventuale uso storico o documentale di `fabbrica_output/`
- relazione reale tra `google_sheet_ingest_reference.py` e `google_sheets_webhook.gs`
- source of truth funzionale tra reference parser, webhook Google e layer `ingest_api/`

## 3. Elenco dei file/cartelle NON TOCCARE

Questi elementi sono da considerare sensibili finche' non esiste una strategia di refactor validata:

- `index.html`
- `app.js`
- `styles.css`
- `translations.js`
- `google_sheets_webhook.gs`
- `pwa.js`
- `sw.js`
- `manifest.json`
- `icons/`
- `google7587c8ec7ec66e24.html`
- `ingest_api/`
- `fabbrica_output/`
- `ingest_api/storage/`
- `tabelle_kite_ordinate/`

Nota:

- `app.js` e `google_sheets_webhook.gs` sono i due punti piu' delicati dal lato comportamento.

## 4. Elenco dei file/cartelle DA VERIFICARE

Da verificare prima di qualunque alleggerimento:

- `fabbrica_output/processing_log.txt`
- eventuale uso storico/documentale di `tabelle_kite_ordinate/`
- relazione tra `google_sheet_ingest_reference.py` e `google_sheets_webhook.gs`
- source of truth funzionale dell'ingest

Verifiche da fare in futuro:

- confermare se i CSV in `tabelle_kite_ordinate/` sono ancora fonte utile o solo archivio storico
- confermare se `fabbrica_output/` serve ancora a consultazione storica o solo a una fabbrica offline
- verificare se `submissions.jsonl` funge sia da storage storico sia da queue tecnica
- non trattare `worker_output.jsonl`, `worker_offset.txt` o `bridge_offset.txt` come residui: sono stato operativo.

## 5. Elenco dei possibili residui/artefatti

Residui gia' spostati in archivio reversibile SIERRA:

- `.DS_Store`
- `ingest_api/.DS_Store`
- `__pycache__/`
- `ingest_api/__pycache__/`
- `main` file vuoto in root

Stato runtime da NON trattare come residuo:

- `ingest_api/storage/submissions.jsonl`
- `ingest_api/storage/worker_output.jsonl`
- `ingest_api/storage/worker_offset.txt`
- `ingest_api/storage/bridge_offset.txt`

Artefatto generated/archive da trattare con cautela:

- `fabbrica_output/processing_log.txt`

Nota:

- gli elementi spostati in SIERRA non sono piu' nel perimetro attivo.
- i file in `ingest_api/storage/` non vanno rimossi o spostati senza verifica runtime e cross-directory.

## 6. Rischi principali di un refactor sbagliato

- rompere il submit del form intervenendo su `app.js` senza isolare prima i confini tra UI, validazione, serializzazione e integrazioni
- rompere l'integrazione Google Sheets intervenendo su `google_sheets_webhook.gs` senza preservare schema, deduplica e compatibilita'
- introdurre drift tra parser o spec Python e webhook Apps Script
- trattare dati offline e output generati come se fossero runtime attivo
- spostare o pulire file di storage senza sapere se il worker locale li usa come coda o come storico
- confondere artefatti con sorgenti e viceversa
- modificare un solo strato ingest pensando che sia la source of truth, quando oggi la responsabilita' e' distribuita
- sottovalutare i path hardcoded presenti nel layer ingest locale

## 7. Proposta di ordine futuro dei lavori, in step piccoli e reversibili

### Step 1

Confermare ufficialmente la mappa delle aree:

- frontend runtime
- supporto/config
- ingest locale/spec/test
- stato runtime locale e cross-directory
- reference/external, archive/historical e generated artefact non runtime

Output atteso:

- decisione condivisa su cosa e' runtime e cosa no

### Step 2

Identificare la source of truth dell'ingest.

Domanda chiave:

- il comportamento canonico vive in `google_sheets_webhook.gs`, in `google_sheet_ingest_reference.py`, oppure nel layer `ingest_api/`?

Output atteso:

- un solo punto dichiarato come riferimento funzionale

### Step 3

Documentare i confini del frontend senza cambiare logica:

- UI
- validazione
- costruzione payload
- submit Google
- submit locale
- apertura WhatsApp

Output atteso:

- mappa interna dei blocchi di `app.js`

### Step 4

Verificare i dati e gli output non runtime:

- `tabelle_kite_ordinate/`
- `fabbrica_output/`
- `processing_log.txt`

Output atteso:

- conferma di cosa e' input storico, output pulito o semplice archivio

### Step 5

Verificare il layer `ingest_api/storage/` come materiale operativo:

- distinguere queue, output, offset e storico

Output atteso:

- capire cosa puo' restare dov'e' e cosa potra' essere isolato in futuro

### Step 6

Solo dopo le conferme precedenti, preparare un piano minimo di riordino documentale:

- nessun cambio di logica
- nessun cambio UX
- nessun cambio integrazioni
- solo chiarimento dei confini

### Step 7

Eseguire eventuali micro-refactor futuri in ordine:

- prima documentazione
- poi isolamento dei moduli
- poi eventuale pulizia dei residui

Principio guida:

- ogni step deve essere piccolo, verificabile e facilmente reversibile

## Nota finale

Questo file e' una mappa conservativa della situazione attuale.

Non autorizza da solo cancellazioni, spostamenti, rinomini o refactor.
