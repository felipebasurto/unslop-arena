# unslop arena

Generated UI pages — dashboards, pricing, docs, slides, apps, documents — each
built by an agent under a different configuration of
[/unslop-ui](https://github.com/felipebasurto/unslop-ui), rated by slop level.

Open the site: the page fills the screen, drag the slop slider, that's it.
`index` (bottom-right) browses every page with its score.

## How pages get here

`factory/` is the generation harness. `factory/PROMPT.md` is the operating
protocol for the agent that produces cells overnight: 34 briefs × 2 stacks ×
7 skill configurations. `factory/build_data.py` turns completed runs into
`data.js` + `pages/`.

## Repo layout

- `index.html`, `app.js`, `style.css` — the arena (static, no backend)
- `data.js`, `pages/` — generated dataset (rebuilt by `factory/build_data.py`)
- `factory/briefs/` — page specs
- `factory/templates/` — html + react starters
- `factory/skill/` — pinned copy of unslop-ui used by the configs
- `factory/runs/` — per-cell workspaces (gitignored)
- `factory/reports/` — /unslop-ui pass reports
- `factory/ledger.jsonl` — one telemetry line per cell
