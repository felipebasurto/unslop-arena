# unslop-arena factory — overnight generation run

You are the agent under test AND the operator of this repo. Your job: generate
the largest possible matrix of UI pages — each built under a different
configuration of the `unslop-ui` skill — publish them to the arena, and keep
going until stopped. Work autonomously. Never ask questions. Never stop early.

Repo: `github.com/felipebasurto/unslop-arena` (clone it, work on `main`).

## Layout

```
index.html / app.js / style.css / data.js   the arena site (do not break it)
pages/<run_id>/                            published static pages (committed)
factory/
  briefs/*.md          34 page briefs — the "what to build"
  templates/html/      bare index.html + styles.css starter
  templates/react/     vite + react + tailwind starter (needs `npm install` once)
  configs.json         the 7 configurations and what each installs
  skill/               a copy of the unslop-ui skill (SKILL.md, scripts/, references/)
  score.py             scores a run cell and writes meta.json["score"]
  build_data.py        rebuilds data.js + pages/ from all runs
  runs/<run_id>/       one workspace per cell (gitignored, stays on disk)
  reports/<run_id>.md  the /unslop-ui pass reports (committed)
  ledger.jsonl         one telemetry line per cell (committed)
```

## The matrix

34 briefs × 2 stacks (`html`, `react`) × 7 configs = **476 cells**.

Configs (see `factory/configs.json` for the canonical definitions):

| config | what the workspace gets | passes |
|---|---|---|
| `control` | nothing | gen |
| `snippet` | the agents-snippet block appended to `AGENTS.md` | gen |
| `rules` | full skill at `.devin/skills/unslop-ui-eval/` + prompt says read & apply it | gen |
| `counter` | only `scripts/count_tells.py` + prompt says it exists | gen |
| `full` | snippet + skill + counter + `.devin/hooks.v1.json` | gen |
| `edit` | nothing for pass 1; skill installed before pass 2 | gen → unslop |
| `edit-surface` | same, pass 2 runs with `--surface` | gen → unslop-surface |

IMPORTANT for `edit`/`edit-surface`: pass 1 must be a TRUE control — do not read
the skill, do not apply its rules, generate freely. Only after pass 1 finishes
do you install the skill and run the unslop pass.

## Cell order — breadth first

Phase A (do this first, ~68 cells): for EVERY brief, run `html` + `control`
and `html` + `edit-surface`. These are the two poles (raw vs maximally
treated) and give coverage of all 34 page types early.

Phase B: for every brief, the remaining html configs (`snippet`, `rules`,
`counter`, `full`, `edit`), then all 7 configs on `react`, iterating briefs
round-robin so partial progress still covers everything.

Track progress in `factory/PROGRESS.md` (checkbox per cell) and check it before
each cell — resume exactly where it stopped if the session restarts.

## Per-cell procedure

Run id: `<brief>.<stack>.<config>-<HHMMSS>` e.g. `kanban.html.control-143022`.

1. `mkdir -p factory/runs/<run_id>` and copy the stack template into it:
   - html: `cp factory/templates/html/* factory/runs/<run_id>/`
   - react: `mkdir factory/runs/<run_id> && cp -R factory/templates/react/index.html factory/templates/react/package.json factory/templates/react/package-lock.json factory/templates/react/tsconfig.json factory/templates/react/vite.config.ts factory/templates/react/src factory/runs/<run_id>/ && ln -sfn "$(cd factory/templates/react && pwd)/node_modules" factory/runs/<run_id>/node_modules`
     (if `npm run build` fails on the symlink, `cd` into the cell, `rm node_modules && npm install`, retry)
2. Install what the config says (see table). Concretely:
   - `snippet`: create `AGENTS.md` in the cell containing `# Project rules` + a blank line + the inner markdown block of `factory/skill/references/agents-snippet.md` (the content between the ```markdown fences).
   - `skill`: `mkdir -p .devin/skills/unslop-ui-eval && cp -R ../../skill/. .devin/skills/unslop-ui-eval/` — adjust the relative path so it resolves inside the cell (`factory/skill` absolute path is safest).
   - `counter`: `mkdir -p scripts && cp <abs>/factory/skill/scripts/count_tells.py scripts/`
   - `full`: all of the above plus `.devin/hooks.v1.json` = `{"PostToolUse":[{"matcher":"write|edit|apply_patch|notebook_edit","hooks":[{"type":"command","command":"python3 <abs>/factory/skill/scripts/hook.py"}]}]}`. Hooks will not auto-fire in this context — that is expected, install for fidelity anyway.
   - `rules`/`full`/`edit*` prompt extras are in `configs.json → prompt_extras`.
3. **Generation pass**: read `factory/briefs/<brief>.md` and build the page.
   - html stack suffix: "Single self-contained page. `index.html` + `styles.css` (you may add more local files). No build step, no frameworks, no external requests — everything inline or local. It must render by opening `index.html` directly."
   - react stack suffix: "Build it in `src/` (App.tsx etc). `npm run build` must pass. Keep it one screen."
   - Apply the config's `prompt_extra` line if the config has one.
   - Timebox: if generation is not converging after ~15 minutes of edits, ship what you have and note it in meta.
4. **Unslop pass** (only `edit`, `edit-surface`): install the skill into the cell, then read `.devin/skills/unslop-ui-eval/SKILL.md` and its references, apply the skill to the page sources (`/unslop-ui .` or `/unslop-ui . --surface` semantics), and save the full report (Verdict line, rule table, rewritten strings, kept items, tasks) to `factory/reports/<run_id>.md`. If react, rebuild afterwards.
5. **Publish the static site** into `factory/runs/<run_id>/site/`:
   - html: copy `index.html`, `styles.css` and every local asset the page references.
   - react: `npm run build`, then copy `dist/*` into `site/`.
   - `site/index.html` must exist and render standalone.
6. **Score**: `python3 factory/score.py factory/runs/<run_id>` — writes `meta.json["score"]`.
7. **meta.json** in the run dir, exactly this shape:
   ```json
   {"id":"<run_id>","brief":"<brief>","stack":"html|react","agent":"devin-cloud","config":"<config>","status":"ok|error","seconds":<int>,"passes":[{"name":"gen","seconds":<int>},{"name":"unslop","seconds":<int>}],"build":"ok|fail","ts":"<iso8601>"}
   ```
   `score.py` fills `score`. On error still write meta.json with `status:"error"` and a `note`.
8. **Ledger**: append one line to `factory/ledger.jsonl`:
   `{"id","brief","stack","agent":"devin-cloud","config","status","seconds","surface_total","ts"}`
   where `surface_total` = `meta.score.surface.total` (0 if error).
9. Mark the cell done in `factory/PROGRESS.md`.

## Cadence

- Every ~10 completed cells: `python3 factory/build_data.py && git add -A && git commit -m "cells: <n> new (<briefs>)" && git push`
- Every ~25 cells or if data.js looks stale: run `build_data.py` before committing so `pages/` and `data.js` stay fresh.
- If the session is ending or context is tight: finish the current cell, run `build_data.py`, commit and push everything, update PROGRESS.md.

## Rules

- Pages in English, mock data inline, no external services, no real images (CSS shapes/gradients/initials).
- Match each brief's required elements — they are the spec.
- `control` cells must contain zero skill influence. `snippet`/`rules`/`counter`/`full` get exactly what the config says — no more.
- Do not modify the arena files (`index.html`, `app.js`, `style.css`), `factory/skill/`, `factory/score.py`, `factory/build_data.py`, or `factory/briefs/` — you are the subject, not the experimenter.
- If a cell fails twice, mark it `status:"error"` in meta + ledger and move on. Do not loop.
- Quality bar for yourself: the page must actually look like a real product screen — layout, spacing, typography, states. Slop is the variable under test, not brokenness.
