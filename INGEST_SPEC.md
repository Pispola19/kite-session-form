# Ingest passivo — specifica layer trasporto

Questo file documenta il comportamento del layer di ingest **passivo**: estrazione senza interpretazione.

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
