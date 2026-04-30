# legacy_sierra/ — Capsula legacy NON OPERATIVA

> ATTENZIONE: questa cartella è una **capsula di sola conservazione**.
> NON è collegata a nulla. NON viene servita. NON viene caricata.
> Serve solo come snapshot freddo della UI legacy ("Sierra") prima
> dello switch temporaneo di facciata verso `ui-lab/mock-ui/`.

## Data snapshot

- Creata il: **2026-04-30 18:09:01 CEST**
- Branch git al momento dello snapshot: pulito (solo `ui-lab/` untracked)
- Commit di riferimento: vedi `git log -1` al momento della copia

## Elenco file copiati (root → legacy_sierra/)

File singoli:

- `index.html`            (28826 B, mtime 2026-04-28 09:08)
- `app.js`                (68776 B, mtime 2026-04-28 08:58)
- `styles.css`            (26349 B, mtime 2026-04-27 10:49)
- `translations.js`       (51530 B, mtime 2026-04-27 11:02)
- `pwa.js`                (413 B,   mtime 2026-04-22 15:39)
- `manifest.json`         (572 B,   mtime 2026-04-22 15:39)
- `ui_readonly.safe.js`   (590 B,   mtime 2026-04-24 18:33)
- `ui_extras.safe.js`     (2051 B,  mtime 2026-04-24 23:58)
- `live_spot.html`        (27987 B, mtime 2026-04-27 00:34)

Directory:

- `assets/`  — copia ricorsiva (cp -Rp)
- `icons/`   — copia ricorsiva (cp -Rp)

Tutte le copie sono state effettuate con `cp -p` / `cp -Rp` per
preservare i timestamp originali, così che la capsula resti
**bit-identica** ai file root al momento dello snapshot.

## Stato

- **Capsula legacy, NON OPERATIVA.**
- Nessun file qui dentro deve essere modificato.
- Nessun file qui dentro è referenziato da `index.html`, `app.js`,
  pipeline, worker, bridge, DAM, Google Sheets o WhatsApp.
- Serve solo come riferimento storico e come fonte di rollback
  manuale qualora il backup `index_legacy_backup.html` non bastasse.

## Cosa NON fare

- NON modificare i file in questa cartella.
- NON aggiungere `<script>` o `<link>` che puntano a `legacy_sierra/`.
- NON usare percorsi `legacy_sierra/...` da nessun file servito.
- NON committare modifiche in massa a questa cartella.
