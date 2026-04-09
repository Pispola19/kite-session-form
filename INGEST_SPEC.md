# Ingest passivo - specifica layer trasporto

Questo file documenta il comportamento del layer di ingest **passivo**: estrazione senza interpretazione.

**Uso interno:** sicurezza ingest e protezione dataset.

---

## Filtro di accettazione messaggi WhatsApp (pre-ingest)

**Obiettivo:** accettare **solo** messaggi conformi al formato emesso dal form ufficiale. WhatsApp resta un semplice canale di trasporto; il **gate** è il filtro di ingest.

**Nota di trust:** il form può emettere una `SIG` client-side come mitigazione minima, ma **non garantisce autenticità crittografica reale**. La chiusura del trust gap richiede una firma server-side futura.

**Principio:** un messaggio è **valido solo se** soddisfa **tutte** le condizioni sotto. In caso contrario -> **ignorato completamente** (nessuna correzione, nessun recupero, nessun parsing del corpo).

### 1. Presenza blocco tecnico finale

Il messaggio deve terminare con un blocco conforme al formato prodotto dal form:

```text
---
ID: <10 caratteri>
TS: <RFC3339 con timezone>
SRC: rdk_v1
SIG: <10 caratteri hex>
---
```

Il testo libero dell'utente precede il primo `---` del blocco.

### 2. Validazione `ID`

- lunghezza **esattamente** `10`
- charset: **`[a-z0-9]`** (solo minuscolo e cifre)

Se non valido -> **SCARTA**

### 3. Validazione `TS`

- formato **RFC3339 con timezone**
- esempio valido: `2026-04-07T18:30:00+02:00`

Se non valido -> **SCARTA**

### 4. Validazione `SRC`

- valore **esattamente** `rdk_v1`

Se diverso -> **SCARTA**

### 5. Validazione `SIG`

- lunghezza **esattamente** `10`
- charset: **`[a-f0-9]`**

Se non valida -> **SCARTA**

**Importante:** `SIG` client-side e' una mitigazione leggera contro modifiche banali, **non** una prova di autenticita'. La soluzione corretta resta una firma server-side.

### 6. Struttura completa

Il blocco deve includere **tutte** le righe:

- `ID: ...`
- `TS: ...`
- `SRC: ...`
- `SIG: ...`

Se manca anche una -> **SCARTA**

### 7. Deduplicazione

- se **`ID` gia' presente** nello store ingest (stesso invio / copia duplicata) -> **SCARTA**

### Comportamento

| Esito       | Azione                         |
|------------|---------------------------------|
| Non valido | Ignorato; nessuna elaborazione |
| Valido     | Procede allo STEP 5            |

### Vincoli del filtro

- **NON** interpretare il contenuto libero prima del blocco
- **NON** correggere formato o normalizzare `ID` / `TS`
- **NON** accettare varianti di `SRC` o del layout del blocco

### Risultato atteso

- Ingest piu' difendibile
- Dataset meno contaminato
- Base pronta per evoluzione backend

---

## STEP 5 - PARSE MINIMO (NO LOGICA)

**Obiettivo:** estrarre i dati dal messaggio **senza** interpretarli.

### Regole

- split riga su `:` (prima occorrenza)
- trim spazi
- associare chiave -> valore

### Canonicalizzazione lingua

Il form puo' restare multilingua a livello UI, ma il payload trasportato su WhatsApp deve essere **sempre canonico in inglese**.

Quindi il parser ingest:

- **NON** gestisce piu' varianti lingua
- **SI** aspetta etichette payload canoniche EN

### Esempi canonici

| Riga nel messaggio        | Chiave payload   | Valore         |
|---------------------------|------------------|----------------|
| `⚖️ Weight (kg): 75`      | `weight_kg`      | `"75"`         |
| `🪁 Kite (m²): 9`         | `kite_size_m2`   | `"9"`          |
| `🌬️ Wind (kts): 18`      | `wind_kts`       | `"18"`         |
| `📍 Spot: Punta Trettu`   | `location`       | `"Punta Trettu"` |
| `🏷️ Brand: Duotone`      | `brand_raw`      | `"Duotone"`    |
| `🪵 Board size: 140x42`   | `board_size_raw` | `"140x42"`     |
| `🎯 Level: Advanced`      | `level`          | `"Advanced"`   |

Il **valore** (dopo `:`) resta stringa grezza, senza normalizzazione ingest.

Se la riga e' assente nel messaggio, la relativa chiave non compare nel payload.

### Vincoli

- **NON** convertire numeri
- **NON** validare valori in ingest
- **NON** correggere dati
- **NON** dedurre nulla

**Nota:** le validazioni leggere su `weight`, `wind` e `kite` avvengono **solo nel form**, per ridurre input sporchi senza introdurre logica nell'ingest.

---

## STEP 6 - OUTPUT GREZZO (PASS-THROUGH)

Output diretto senza modifiche:

```json
{
  "id": "<ID>",
  "ts": "<TS>",
  "source": "whatsapp_rdk",
  "payload": {
    "weight_kg": "75",
    "kite_size_m2": "9",
    "wind_kts": "18",
    "brand_raw": "Duotone",
    "model_raw": "Orbit"
  },
  "raw_text": "<messaggio completo originale>"
}
```

Il payload contiene tutte le coppie chiave/valore estratte dal parse minimo; i campi sopra sono solo esempio.

---

## STEP 6B - PROIEZIONE SICURA SU GOOGLE SHEET

Quando il payload viene materializzato su Google Sheet, la scrittura deve essere **a chiave** e mai per posizione.

### Regole obbligatorie

- **NON** usare indice colonna fisso
- leggere sempre gli header correnti del foglio
- mappare ogni valore per **nome colonna**
- se una colonna attesa manca -> **saltare**
- se esiste una colonna extra -> **lasciare vuota**
- nessun campo mancante deve shiftare i successivi

### Schema fisso riga

```text
timestamp | weight | gender | board | board_size | level | kite_size | wind | brand | model | location | water | result | note
```

### Mapping esplicito

| Etichetta payload EN     | Colonna Sheet |
|--------------------------|---------------|
| `Weight (kg)`            | `weight`      |
| `Gender`                 | `gender`      |
| `Board type`             | `board`       |
| `Board size`             | `board_size`  |
| `Level`                  | `level`       |
| `Kite (m²)`              | `kite_size`   |
| `Wind (kts)`             | `wind`        |
| `Brand`                  | `brand`       |
| `Model`                  | `model`       |
| `Spot`                   | `location`    |
| `Water conditions`       | `water`       |
| `Session result`         | `result`      |
| `Notes`                  | `note`        |

### Gestione campi opzionali

- `gender` se assente -> `null`
- ogni altro campo assente -> `null`
- nessuna correzione posizionale

### Compatibilita'

- messaggi vecchi senza `Gender` restano validi
- aggiunte future di colonne non devono rompere il mapping esistente
- la proiezione Sheet e' downstream del parse minimo e non modifica il `raw_text`

---

## STEP 7 - NESSUNA CLASSIFICAZIONE

**Esplicitamente vietato:**

- NO L1 / L2 / L3
- NO GOLD / SILVER
- NO valutazioni qualita'
- NO controlli coerenza

---

## Principio

Questo layer e' un **trasporto dati**.

- NON e' una fabbrica
- NON e' un validatore
- NON e' un sistema intelligente

## Responsabilita'

| Layer         | Ruolo                           |
|--------------|----------------------------------|
| Questo layer | Estrae e passa                  |
| Fabbrica     | Interpreta, pulisce, classifica |

## Risultato

- Dato originale preservato al 100%
- Nessuna perdita informativa
- Nessuna contaminazione

---

*FINE*
