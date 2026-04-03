# Ingest passivo — specifica layer trasporto

Questo file documenta il comportamento del layer di ingest **passivo**: estrazione senza interpretazione.

**Uso interno:** sicurezza ingest e protezione dataset.

---

## Filtro di accettazione messaggi WhatsApp (pre-ingest)

**Obiettivo:** accettare **solo** messaggi generati dal sistema ufficiale (form RDK + blocco tecnico). WhatsApp è solo canale di trasporto; il **gate** è il filtro di ingest.

**Principio:** un messaggio è **valido solo se** soddisfa **tutte** le condizioni sotto. In caso contrario → **ignorato completamente** (nessuna correzione, nessun recupero, nessun parsing del corpo).

### 1. Presenza blocco tecnico

Il messaggio deve contenere un blocco finale conforme al formato prodotto dal form (nessuna riga vuota extra tra delimitatori e righe chiave):

```text
---
ID: <10 caratteri>
TS: <timestamp>
SRC: rdk_v1
---
```

*(Il testo libero dell’utente precede il primo `---` del blocco.)*

### 2. Validazione `ID`

- lunghezza **esattamente** `10`
- charset: **`[a-z0-9]`** (solo minuscolo e cifre)

Se non valido → **SCARTA**

### 3. Validazione `SRC`

- valore **esattamente** `rdk_v1` (nessuna variante, case-sensitive come da emissione)

Se diverso → **SCARTA**

### 4. Struttura completa

Il blocco deve includere **tutte** le righe:

- `ID: ...`
- `TS: ...`
- `SRC: ...`

Se manca anche una → **SCARTA**

*(Opzionale implementativo: rifiutare più di un blocco tecnico valido nello stesso testo, per evitare concatenazioni ambigue.)*

### 5. Deduplicazione

- se **`ID` già presente** nello store ingest (stesso invio / copia duplicata) → **SCARTA**

### Comportamento

| Esito        | Azione                          |
|-------------|----------------------------------|
| Non valido  | Ignorato; nessuna elaborazione   |
| Valido      | Procede allo STEP 5 (parse minimo) |

### Vincoli del filtro

- **NON** interpretare il contenuto libero prima del blocco
- **NON** correggere formato o normalizzare `ID` / `TS`
- **NON** accettare varianti di `SRC` o del layout del blocco

### Risultato atteso

- Ingest sicuro e dataset protetto da input esterni non firmati dal canale ufficiale
- Base per automazione futura senza contaminazione

---

## STEP 5 — PARSE MINIMO (NO LOGICA)

**Obiettivo:** estrarre i dati dal messaggio **senza** interpretazione.

**Regole:**

- split riga su `:` (prima occorrenza)
- trim spazi
- associare chiave → valore

**Esempi:**

| Riga nel messaggio       | Chiave payload   | Valore        |
|--------------------------|------------------|---------------|
| `⚖️ Peso (kg): 75`       | `weight_kg`      | `"75"`        |
| `🪁 Kite (m²): 9`       | `kite_size_m2`   | `"9"`         |
| `🌬️ Vento (kts): 18`   | `wind_kts`       | `"18"`        |
| `📍 Spot: Punta Trettu`  | `location`       | `"Punta Trettu"` |
| `🏷️ Marca: Duotone`    | `brand_raw`      | `"Duotone"`   |
| `🪵 Misura tavola: 140x42` | `board_size_raw` | `"140x42"`  |
| `🪵 Board size: 140x42` | `board_size_raw` | `"140x42"`  |
| `🎯 Livello: Independent` | `level`        | `"Independent"` |
| `🎯 Level: Independent` | `level`          | `"Independent"` |

**Compatibilità lingue (etichetta → stesse chiavi payload):**

Il form è multilingua: la parte **prima** del primo `:` (dopo trim) può comparire in italiano o in inglese. Per il parse minimo, mappare sullo stesso campo di output indipendentemente dalla variante:

| Concetto     | Varianti etichetta accettate (testo dopo emoji / sul lato chiave) | Chiave payload   |
|-------------|-------------------------------------------------------------------|------------------|
| Board size  | `Misura tavola`, `Board size`                                     | `board_size_raw` |
| Level       | `Livello`, `Level`                                                | `level`          |

Il **valore** (dopo `:`) resta stringa grezza, senza normalizzazione.

**Chiavi payload (grezze):** `board_size_raw`, `level` — valori stringa identici al testo dopo `:`, senza conversione.

Se la riga è assente nel messaggio, la relativa chiave non compare nel payload (retrocompatibilità con messaggi precedenti all’estensione form; `level` obbligatorio solo su invii nuovi dal form).

**Vincoli:**

- **NON** convertire numeri
- **NON** validare valori
- **NON** correggere dati
- **NON** dedurre nulla

---

## STEP 6 — OUTPUT GREZZO (PASS-THROUGH)

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

*(Il payload contiene tutte le coppie chiave/valore estratte dal parse minimo; i campi sopra sono solo esempio.)*

---

## STEP 7 — NESSUNA CLASSIFICAZIONE

**Esplicitamente vietato:**

- NO L1 / L2 / L3
- NO GOLD / SILVER
- NO valutazioni qualità
- NO controlli coerenza

---

## Principio

Questo layer è un **trasporto dati**.

- NON è una fabbrica
- NON è un validatore
- NON è un sistema intelligente

## Responsabilità

| Layer        | Ruolo                                      |
|-------------|---------------------------------------------|
| Questo layer | Estrae e passa                             |
| Fabbrica     | Interpreta, pulisce, classifica            |

## Risultato

- Dato originale preservato al 100%
- Nessuna perdita informativa
- Nessuna contaminazione

---

*FINE*
