# BIBBIA UI — ANTI-CORRUPTION LAYER

Data: 2026-05-10
Area: VENTO LIVE / KITE DATA SYSTEM — UI modulare LAB
Scopo: proteggere UI modulare, payload legacy e pipeline dati da effetti collaterali.

---

## 1. PRINCIPIO SACRO

La UI modulare è la faccia del sistema, non la verità operativa.

Gerarchia sacra:

- DAM / dump / worker / bridge / DB = verità operativa
- Google Sheet = solo controllo visivo dell'utente
- WhatsApp = solo controllo / conferma utente
- UI = faccia modulare
- Payload legacy = sacro
- MockEngine / mapper payload = zona da proteggere
- La UI non deve diventare proprietaria della pipeline

Se una modifica estetica o UX richiede di toccare payload, submit, required, endpoint, DAM, Google Sheet, WhatsApp o Live Spot, allora non è una modifica estetica: è una modifica architetturale e richiede audit dedicato.

---

## 2. DIAGNOSI ATTUALE

La UI modulare funziona, ma la separazione non è ancora completamente architetturale.

Oggi alcune responsabilità sono ancora concentrate in ui-lab/mock-ui/mock_ui.js:

- UI presentazionale
- stato form
- select / options
- validazione
- payload preview
- submit primario DAM
- Google Sheet secondario
- WhatsApp secondario
- Live Spot
- reset / success / error
- gestione lingua / renderUI
- gestione CTA

Dagli audit risulta:

- non è emerso un MutationObserver attivo sui select nel LAB attuale
- il rischio vero è l'accoppiamento interno a mock_ui.js
- il payload legacy è centralizzato tramite MockEngine, ma la shell UI è ancora troppo vicina a submit e integrazioni
- renderUI e populateSelect sono zone sensibili perché possono ricostruire select e influire sui valori letti dal form
- il click visualCta è zona rossa perché governa validazione, payload, DAM, Google, WhatsApp e reset

---

## 3. OBIETTIVO ARCHITETTURALE

Il modello desiderato è un vero Anti-Corruption Layer.

Struttura ideale futura:

UI pura -> form state -> legacy adapter -> MockEngine / legacy payload mapper -> submit adapter -> DAM / canali secondari

La UI deve parlare con API esplicite, non con dettagli legacy sparsi.

API future desiderate, NON da implementare ora senza audit:

- getFormState()
- setFieldValue()
- loadOptions(brand)
- buildLegacyPayload()
- submitLegacyPayload()
- fetchLiveSpot()
- resetUiAfterSuccess()
- renderLiveSpotReadonly()

Queste API devono diventare confini, non scorciatoie.

Regola centrale:

Nessun componente visivo deve conoscere DOM legacy, pipeline, endpoint, payload sacro o canali secondari.

---

## 4. REGOLE VIETATE

È vietato:

- cambiare payload legacy senza audit PAYLOAD_CONTRACT dedicato
- cambiare required senza audit REQUIRED_FIELDS dedicato
- cambiare submit DAM senza audit SUBMIT_ADAPTER dedicato
- cambiare endpoint senza audit dedicato
- cambiare Google Sheet o WhatsApp senza audit dedicato
- cambiare Live Spot dentro patch estetiche
- usare MutationObserver sui select per sincronizzare UI
- creare connector furbi che osservano e mutano gli stessi nodi
- mischiare DOM legacy e componenti UI nuovi
- modificare renderUI dentro patch solo estetiche
- modificare populateSelect dentro patch solo estetiche
- modificare resetVisualFormAfterSuccess senza audit dedicato
- modificare index.html o ordine script senza audit dedicato
- spostare funzioni tra file senza prima mappa firme / comportamento
- fare refactor ampio senza test di confronto prima/dopo
- toccare DAM / dump / worker / bridge / DB da patch UI

---

## 5. ZONE ROSSE

Queste zone non vanno toccate in patch UX leggere o estetiche.

Submit / pipeline:

- SESSION_SUBMIT_CONFIG
- submitSessionPrimary
- handler click visualCta
- buildMockPayloads
- buildRuntimeMeta
- FormStateLayer.read

Google Sheet secondario:

- GOOGLE_SECONDARY_CONFIG
- submitSessionToGoogleSecondary

WhatsApp secondario:

- WHATSAPP_SECONDARY_CONFIG
- openWhatsAppSecondary
- buildWhatsAppSummaryFromLegacyPayload

Live Spot:

- LIVE_SPOT_CONFIG
- fetchLiveSpotReal
- LiveSpotReadonlyConnector
- handler click showLiveSpot

Validazione:

- REQUIRED_FIELDS
- validateRequiredFields
- setInvalid
- requiredFieldMessage
- focusRequiredField

Select / render:

- renderUI
- populateSelect
- populateModelsForBrand
- populateBoardSizesForType

Reset:

- resetVisualFormAfterSuccess

---

## 6. REGOLE PER MODIFICHE FUTURE

Se cambio colori, sfondi, spaziature o dimensioni:

- toccare solo CSS, tokens o componenti presentazionali
- non toccare submit, payload, required, Live Spot, Google, WhatsApp, renderUI o populateSelect

Se cambio brand / model / options:

- serve audit SELECT_OPTIONS

Se cambio submit:

- serve audit SUBMIT_ADAPTER

Se cambio payload:

- serve audit PAYLOAD_CONTRACT

Se cambio Live Spot:

- serve audit LIVE_SPOT_ADAPTER

Se cambio validazione:

- serve audit REQUIRED_FIELDS

Se cambio lingua/copy:

- attenzione: renderUI oggi non cambia solo testo, ma può ricostruire select
- verificare che non perda valori brand/model/board/size

---

## 7. ROADMAP FUTURA

### Fase 0 — Stato attuale

Obiettivo: non rompere nulla.

Regole:

- nessuna patch notturna su submit, Live Spot o payload
- nessun connector nuovo
- nessun refactor ampio
- solo audit o documentazione
- ogni intervento deve essere reversibile

### Fase 1 — Congelamento confini

Obiettivo: rendere chiaro cosa appartiene a UI, stato, adapter, mapper e submit.

Azioni future:

1. mantenere questa Bibbia come guardrail
2. aggiornare ogni audit citando la sezione toccata
3. vietare patch generiche su mock_ui.js
4. creare report prima di ogni modifica rossa

### Fase 2 — Adapter read-only

Obiettivo: introdurre confini senza cambiare comportamento.

Possibili step futuri:

1. creare wrapper read-only per lettura stato form
2. mantenere firma e output identici a FormStateLayer.read
3. confrontare prima/dopo payload legacy
4. nessun cambio submit
5. nessun cambio DOM

### Fase 3 — Submit adapter

Obiettivo: separare il cancello verso la fabbrica dalla UI.

Possibili step futuri:

1. documentare ordine submit attuale
2. creare orchestratore submit con stesso ordine
3. mantenere identici payload legacy, endpoint, Google secondario, WhatsApp secondario, reset ed error handling
4. verificare diff e comportamento prima/dopo

### Fase 4 — Live Spot adapter

Obiettivo: separare fetch e normalizzazione Live Spot dalla UI presentazionale.

Possibili step futuri:

1. isolare fetch
2. isolare normalizzazione
3. mantenere identico render utente
4. non influire su submit
5. non influire su payload legacy

### Fase 5 — Select/options adapter

Obiettivo: rendere brand/model/board/size meno fragili.

Possibili step futuri:

1. documentare valori tecnici e label
2. evitare ricostruzioni inutili dei select
3. separare opzioni da render lingua
4. verificare che cambio lingua non perda stato form

### Fase 6 — Test contratto

Obiettivo: bloccare regressioni.

Test futuri desiderati:

- stesso input UI -> stesso payload legacy
- stesso submit order
- stessi endpoint
- stessi required
- stesso WhatsApp dopo successo primario
- Google resta secondario
- Live Spot non parte durante submit
- cambio lingua non perde select

### Fase 7 — Refactor ampio solo dopo stabilità

Solo dopo adapter e test minimi si può valutare un refactor più grande.

Fino ad allora:

- niente riscritture
- niente framework
- niente TypeScript obbligatorio
- niente pulizie generiche
- niente patch estetiche che toccano logica

---

## 8. COMANDI DI VERIFICA DOPO OGNI PATCH FUTURA

Da eseguire sempre dopo ogni patch UI:

- git diff --stat
- git diff -- ui-lab/mock-ui/mock_ui.js
- grep -R "MutationObserver\|observer.observe" -n index.html ui-lab/mock-ui ui-lab/mock-engine translations.js
- grep -n "submitSessionPrimary\|submitSessionToGoogleSecondary\|openWhatsAppSecondary\|buildMockPayloads\|renderUI\|populateSelect\|resetVisualFormAfterSuccess\|fetchLiveSpotReal" ui-lab/mock-ui/mock_ui.js
- git status -sb

Per patch submit future aggiungere controllo manuale:

- payload legacy prima/dopo identico
- ordine submit identico
- endpoint identici
- Google secondario non primario
- WhatsApp solo dopo successo primario
- nessun cambio required
- nessun cambio Live Spot
- nessun cambio renderUI/populateSelect

---

## 9. REGOLA DI LAVORO CON CURSOR / CODEX / AI

Cursor, Codex o qualsiasi AI non devono ricevere libertà generica su questa zona.

Ogni ordine deve dire:

- file consentiti
- file vietati
- cosa leggere
- cosa non toccare
- output obbligatorio
- conferma git diff
- conferma git status
- divieto di commit/push
- divieto di refactor non richiesto

Per audit:

- read-only
- nessun file modificato
- report con righe/funzioni
- proposte non applicate

Per patch:

- una sola modifica
- uno scopo
- diff minimo
- comportamento identico salvo richiesta esplicita
- rollback facile

Se Cursor propone una patch ma non sa indicare quale sezione della Bibbia rispetta, la patch non va applicata.

---

## 10. NOTA FINALE

Questo documento non cambia il runtime.

Non modifica:

- UI
- JavaScript
- HTML
- CSS
- payload
- submit
- endpoint
- Live Spot
- DAM
- Google Sheet
- WhatsApp
- worker
- bridge
- DB

Serve come guardrail operativo.

Qualsiasi patch futura deve citare quale sezione della Bibbia rispetta.

Se una patch non sa dire quale confine tocca, non deve essere applicata.

Regola finale:

Prima si capisce il confine.
Poi si fa audit.
Poi si propone.
Poi si autorizza.
Solo alla fine si modifica.
