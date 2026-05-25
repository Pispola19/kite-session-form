# VENTO LIVE UNIVERSAL CONTRACT V1

## Principio

**Una sola verità del vento** per request: `WIND DECISION OUTPUT V1` (backend).

## Flow obbligatorio

```
API /wind/latest
  → WIND DECISION OUTPUT V1 (backend, UTC)
  → resolveWindContractV1(payload)   ← unico punto logico
  → buildWindUIViewModel (dati display)
  → renderWindUI (unico DOM writer)
```

## Moduli

| File | Ruolo |
|------|--------|
| `resolve_wind_contract_v1.js` | **Contract layer** — `resolveWindContractV1()` |
| `live_spot_wind_adapter_v1.js` | Fetch/parse HTTP → delega al contract |
| `kite_score_layer_v1.js` | Solo dati score (non DOM) |
| `ux_trust_layer_v1.js` | Solo traduzione label (non DOM, non score) |
| `time_ui_v1.js` | Solo `normalizeTimeToUI` → Europe/Rome |
| `wind_ui_single_writer_v1.js` | Solo `renderWindUI` → DOM |

## Regole anti-rottura

1. **Single source of truth** — backend V1; UX non interpreta vento.
2. **No dual rendering** — solo KITE SCORE + STATUS; mai `Decisione … · Rel …`.
3. **No fallback creativi** — niente 0 kn inventati, Tramontana default, dati sintetici.
4. **Time** — backend UTC; UI solo `normalizeTimeToUI` (Europe/Rome).
5. **Spot** — `SPOT RESOLVED` dal contract; UX non fa geocoding/alias.

## Legacy

Payload con `wind_knots` root senza V1 → `legacy_rejected` → stato loading (mai render dati fake).

## Script order

Vedi `WIND_UI_SINGLE_WRITER_V1.md`.

## UX Safe Render (V1)

Vedi `UX_SAFE_RENDER_RULE_V1.md`.

- `partial` — almeno wind / direction / spot → render campo per campo (`—` se manca)
- `empty` — nessun dato → `Connessione vento…`
- `fetching` — solo durante richiesta attiva → `Caricamento…`

## Validazione

- Stesso output su tutti i device
- Nessun campo duplicato (score + decision string)
- Contract test: `select_options_render.contract.test.js`
