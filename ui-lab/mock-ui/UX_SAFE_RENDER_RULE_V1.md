# UX SAFE RENDER RULE V1

## Stati UI

| Stato | Quando | Display |
|-------|--------|---------|
| `fetching` | Richiesta in corso (`ui_loading`) | `Caricamento…` |
| `full` | wind + direction + spot presenti | Render completo |
| `partial` | Almeno uno tra wind / direction / spot | Campo per campo; mancanti → `—` |
| `empty` | Nessun dato V1 utile | `Connessione vento…` |

## Regola contract

`hasAnyWindData(model)` è true se esiste almeno uno tra:

- `WIND NOW (knots)` (incluso 0 kn)
- `WIND DIRECTION (kite-relevant)` / `wind_direction_label`
- `SPOT RESOLVED`

Se V1 risponde con dati parziali → `valid: true`, `state: partial` — **mai** blocco globale su loading.

## Vietato

- Fallback numerici inventati
- Loading per singoli campi in partial state
- Nascondere tutta la UI se il contract V1 ha almeno un campo
