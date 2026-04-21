# APP_JS MAP

## 1. Panoramica generale

`app.js` e' costruito oggi come file monolitico end-to-end. Nello stesso scope convivono dati hardcoded di dominio, accesso al DOM, logica di validazione, costruzione del payload, persistenza locale, integrazione con Google Sheets, submit locale e apertura di WhatsApp.

La struttura non e' ancora separata per moduli tecnici, ma per accumulo progressivo di responsabilita' nello stesso file. I confini esistono soprattutto come macro-zone funzionali, non come moduli isolati.

Il file ha tre caratteristiche forti:

- una grossa sezione iniziale di costanti e dataset hardcoded
- una parte centrale di utility UI e logica form
- una parte finale di orchestrazione submit, persistenza e wiring eventi

## 2. Macro-blocchi funzionali

### Bootstrap e guard

- Nome del blocco: bootstrap e guard
- Funzione: apre la IIFE, verifica la presenza delle traduzioni minime, definisce URL hardcoded, chiavi `localStorage`, costanti di controllo e variabili di stato globali del file
- Range righe indicativo: `1-40`
- Dipendenze principali: `window`, `window.RDK_TRANSLATIONS`, URL WhatsApp, URL Google Sheets, `localStorage`

### Dati hardcoded di dominio

- Nome del blocco: dati hardcoded di dominio
- Funzione: contiene i brand supportati, i modelli per brand, le misure tavole per tipologia, i valori canonici e le regole numeriche usate dal form
- Range righe indicativo: `41-374`
- Dipendenze principali: costanti brand, struttura del form, testo canonico del payload, logica UI successiva

### Cache DOM e stato runtime

- Nome del blocco: cache DOM e stato runtime
- Funzione: memorizza i riferimenti principali ai nodi DOM e inizializza lo stato runtime locale del file
- Range righe indicativo: `376-392`
- Dipendenze principali: ID presenti in `index.html`, variabili di stato del form, lingua corrente, audio feedback

### Utility UI / traduzione / modal / share

- Nome del blocco: utility UI / traduzione / modal / share
- Funzione: gestisce lock submit, traduzioni, esempi community, wrapper `localStorage`, modal di stato, pannello post-submit, condivisione link app e notice di validazione
- Range righe indicativo: `393-800`
- Dipendenze principali: `translations`, `localStorage`, modal DOM, pannello DOM, Web Share API, clipboard API

### Accesso campi e UI dinamica

- Nome del blocco: accesso campi e UI dinamica
- Funzione: legge e scrive i valori dei campi, gestisce gender, brand custom, modello custom, select dinamiche dei modelli per brand e select delle misure tavola
- Range righe indicativo: `801-1321`
- Dipendenze principali: DOM del form, costanti `BOARD_SIZE_OTHER`, `BRAND_OTHER`, `MODEL_OTHER`, dataset brand-modelli, `translations`

### Validazione numerica

- Nome del blocco: validazione numerica
- Funzione: sanifica e valida i campi numerici principali del form, imposta `setCustomValidity` e aggiorna i messaggi lato form
- Range righe indicativo: `1322-1402`
- Dipendenze principali: `NUMERIC_RULES`, `t()`, `interpolate()`, HTML form validation API

### Identita', timestamp e payload sessione

- Nome del blocco: identita', timestamp e payload sessione
- Funzione: genera `session_id`, `technical_id`, timestamp, firma tecnica e costruisce l'oggetto `sessionData` a partire dallo stato del form
- Range righe indicativo: `1405-1557`
- Dipendenze principali: `window.crypto`, `Intl.DateTimeFormat`, costanti mese, valori del form, mapping canonici

### Submit Google Sheets

- Nome del blocco: submit Google Sheets
- Funzione: gestisce il bridge verso Google Apps Script tramite `iframe` e `form POST`, con gestione `postMessage`, timeout, cleanup e stati intermedi
- Range righe indicativo: `1559-1699`
- Dipendenze principali: `GOOGLE_SHEETS_WEBHOOK_URL`, `pendingGoogleSubmit`, DOM dinamico creato a runtime, `window.postMessage`, `window.pageshow`

### Draft, persistenza e reset form

- Nome del blocco: draft, persistenza e reset form
- Funzione: salva la bozza, salva l'ultima sessione, ripristina lo stato del form da `localStorage` e resetta il form dopo il submit
- Range righe indicativo: `1701-1782`
- Dipendenze principali: `localStorage`, `buildSessionData()`, `syncBoardSizeOptions()`, `syncBrandCustomUI()`, `syncModelUI()`, `refreshPreview()`

### Costruzione messaggio e apertura WhatsApp

- Nome del blocco: costruzione messaggio e apertura WhatsApp
- Funzione: costruisce il messaggio canonico da inviare, aggiunge il blocco tecnico finale e apre WhatsApp con deep link e fallback web
- Range righe indicativo: `1784-1871`
- Dipendenze principali: `CANONICAL_LABELS`, `selectedText()`, `hasFirstSubmitDone()`, `appendTechnicalBlockSync()`, `window.location`

### Submit locale

- Nome del blocco: submit locale
- Funzione: invia in modo fire-and-forget una copia JSON della sessione all'endpoint locale `127.0.0.1:8000/submit`
- Range righe indicativo: `2005-2013`
- Dipendenze principali: `fetch`, endpoint locale, `buildSessionData()`

### Binding eventi e wiring finale

- Nome del blocco: binding eventi e wiring finale
- Funzione: collega input, change, blur, submit, cambio lingua, share, modal close e bootstrap finale del form con restore bozza e traduzioni
- Range righe indicativo: `1873-2102`
- Dipendenze principali: tutti i blocchi precedenti, DOM del form, `handleFormSubmit()`, `applyTranslations()`, `restoreDraftSession()`

## 3. Punti critici

- `syncModelUI()` circa righe `912-1275`: e' la zona piu' lunga e ripetitiva del file. Contiene molte ramificazioni quasi identiche per brand diversi e mescola regole di dominio con show/hide del DOM.
- `handleFormSubmit()` circa righe `1951-2061`: concentra troppe responsabilita' insieme. Valida, aggiorna UI, invia al submit locale, invia a Google Sheets, salva stato, costruisce il messaggio, gestisce feedback e apre WhatsApp.
- `submitSessionToGoogleSheets()` circa righe `1599-1699`: e' complessa perche' unisce mapping payload, creazione DOM temporaneo, timeout, bridge `postMessage` e cleanup.
- `applyTranslations()` circa righe `757-792`: non si limita alla lingua. Oltre ai testi, riallinea altri aspetti applicativi come preview, flag, board size, modal e validazione.
- `restoreDraftSession()` circa righe `1736-1768`: mescola lettura storage, reidratazione campi, riallineamento della UI dinamica e validazione.

## 4. Duplicazioni o ridondanze

- `syncModelUI()` replica quasi lo stesso flusso per molti brand supportati, con differenze minime.
- `getModelValue()` circa righe `1335-1356` ripete una lunga catena `if/else` che nella maggior parte dei casi restituisce sempre `getFilteredModelValue()`.
- La raccolta dei valori del form e' ripetuta in tre aree diverse: `buildSessionData()`, `buildDraftData()` e `buildCoreMessage()`.
- La logica di focus e scroll sul primo campo invalido compare sia in `focusFirstInvalidField()` sia nel ramo invalid di `handleFormSubmit()`.
- `LS_PENDING_GOOGLE_SUBMIT` viene rimosso ma in `app.js` non risulta mai realmente scritto o recuperato.
- `LS_LAST_SESSION` viene scritto tramite `saveLastSession()` ma nel file non risulta poi riletto.

## 5. Zone dove UI e logica sono mescolate

- `syncModelUI()`: regole di dominio sui brand e comportamento visuale convivono nella stessa funzione.
- `syncBoardSizeOptions()`: logica di disponibilita' delle misure e manipolazione del select UI sono fuse.
- `buildCoreMessage()`: serializzazione del messaggio e lettura diretta del DOM sono accoppiate.
- `handleFormSubmit()`: orchestration applicativa e dettagli di UI sono trattati nello stesso flusso.
- Gli handler numerici attorno alle righe `1894-1909` mescolano sanificazione input, validazione, stato modal, salvataggio draft e aggiornamento preview.
- `bindDraftField()` non si limita a persistere la bozza, ma chiude anche modal e pannello post-submit.

## 6. Zone ad alto rischio da NON toccare per prime

- `handleFormSubmit()` perche' collega quasi tutto il flusso utente e un errore qui puo' rompere validazione, submit, persistenza e apertura WhatsApp.
- `submitSessionToGoogleSheets()` perche' tocca un'integrazione esterna gia' sensibile e ha un comportamento asincrono non banale.
- `buildSessionData()` perche' e' il punto di convergenza del payload usato da piu' flussi.
- `syncModelUI()` perche' e' fragile, lunga e piena di casistiche condizionali.
- `applyTranslations()` perche' oggi aggiorna non solo testi ma anche altri aspetti funzionali della UI.

## 7. Candidato migliore per il primo micro-refactor futuro

L'area relativamente piu' sicura da isolare per prima, in un futuro step conservativo, e' la **validazione numerica**.

Motivi principali:

- ha confini funzionali abbastanza chiari
- tocca un sottoinsieme limitato di campi (`weight`, `wind`, `kite`)
- dipende soprattutto da `NUMERIC_RULES`, `t()` e dalle API standard di validazione HTML
- ha meno dipendenze incrociate rispetto ai blocchi di submit, persistenza o integrazione esterna
- permette di iniziare a separare logica e UI senza intervenire subito sulle parti piu' delicate del file

Pur non essendo completamente pura, e' il punto piu' adatto per iniziare un futuro micro-refactor con rischio relativamente piu' basso rispetto alle altre zone critiche.
