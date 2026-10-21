# Basket Tactics Motion — PRD

## Problem statement (sintesi)
PWA in italiano per allenatori di basket: lavagna tattica animata (fasi/timeline), campo intero/metà, giocatori trascinabili, strumenti di disegno, libreria schemi, salvataggio locale, import/export JSON, export video/PNG, offline. Iterazione 2: motore difensivo deterministico a regole (uomo, zona 2-3, zona 3-2).

## Architettura
- Frontend-only React (CRA) + Canvas 2D; nessun backend usato. localStorage `btm.plays.v1`, `btm.settings.v1`.
- lib: court.js (campo/viste), engine.js (timeline, interpolazione, ritardo difensivo), render.js, model.js, presets.js, recorder.js (MediaRecorder/PNG), defense.js (motore difensivo), store.js.
- PWA: public/manifest.json, public/sw.js (network-first + cache offline), icone.

## Implementato
- 2026-06 v1: editor completo, timeline/animazione, disegno, libreria 16 schemi, gestione schemi, export JSON/PNG/video, PWA.
- 2026-06 v2: motore difensivo (uomo con anticipo/aiuto/tagli/penetrazione+aiuto+rotazione+recupero, 6 strategie sui blocchi con cambio persistente; zone 2-3 e 3-2 con formazioni punta/ala/angolo/post/area/gomito interpolate), lettura palla (zona, lato forte/debole), 9 parametri, pannello Difesa, protezione modifiche manuali (mantieni/copia/sovrascrivi), 13 schemi di test in libreria. Fix toolbar iPhone.

## Limiti dichiarati
- Pressing a tutto campo non gestito dal motore (preset manuale). GIF non disponibile.
- Zone: nessun raddoppio/trap esplicito; ruoli zona assegnati per numero.
- Blocchi riconosciuti solo se disegnati con lo strumento Blocco.

## Backlog
- P1: ruoli zona personalizzabili, regole "forza fondo vs forza centro", match-up zone.
- P2: pressing/zone press nel motore, trap.
