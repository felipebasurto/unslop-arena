# unslop-arena — overnight orchestrator

## GOAL

Generate the unslop-ui evaluation matrix — 34 briefs × 2 stacks × 7 configs
(476 cells) — publish every finished cell to the arena, and after every ~25
cells run a self-review cycle that turns the accumulated telemetry into
findings and concrete skill-improvement proposals in `factory/FINDINGS.md`.

You work autonomously until stopped. Never ask questions. Never stop early.
Never modify the treatment: `factory/skill/` is a PINNED copy of unslop-ui —
editing it mid-run would corrupt the experiment. Improvements are *proposed*,
never applied here.

## Layout

```
index.html / app.js / style.css / data.js   arena site (do not modify)
pages/<run_id>/                            published pages (committed)
factory/
  briefs/*.md          34 page briefs — the "what to build"
  templates/html|react stack starters
  configs.json         the 7 configurations
  skill/               PINNED unslop-ui copy — read-only for you
  score.py             scores a run cell → meta.json["score"]
  build_data.py        rebuilds data.js + pages/ from runs + ledger
  runs/<run_id>/       one workspace per cell (gitignored)
  reports/<run_id>.md  /unslop-ui pass reports (committed)
  ledger.jsonl         one telemetry line per cell (committed)
  PROGRESS.md          cell checklist
  FINDINGS.md          YOUR review output — append-only log
  proposals/           concrete skill-change proposals (markdown diffs)
```

## The matrix

| config | workspace gets | passes |
|---|---|---|
| `control` | nothing | gen |
| `snippet` | agents-snippet block in `AGENTS.md` | gen |
| `rules` | skill at `.devin/skills/unslop-ui-eval/` + read-&-apply prompt | gen |
| `counter` | only `scripts/count_tells.py` + prompt says it exists | gen |
| `full` | snippet + skill + counter + `.devin/hooks.v1.json` | gen |
| `edit` | nothing for pass 1; skill installed before pass 2 | gen → unslop |
| `edit-surface` | same, pass 2 with `--surface` | gen → unslop-surface |

`edit`/`edit-surface` pass 1 MUST be a true control — no skill influence.
Prompt extras live in `configs.json → prompt_extras`.

## Order — breadth first

- **Phase A** (~68 cells): every brief × `html` × {`control`, `edit-surface`}.
- **Phase B**: remaining html configs per brief, then react × all 7 configs,
  iterating briefs round-robin.
- Check `factory/PROGRESS.md` before every cell; resume exactly where it stopped.

## Per-cell procedure

Run id: `<brief>.<stack>.<config>-<HHMMSS>`.

1. `mkdir -p factory/runs/<run_id>`; copy the stack template:
   - html: `cp factory/templates/html/* factory/runs/<run_id>/`
   - react: copy `index.html package.json package-lock.json tsconfig.json
     vite.config.ts src/` then
     `ln -sfn "$(cd factory/templates/react && pwd)/node_modules" factory/runs/<run_id>/node_modules`
     (fallback if build fails: `cd` cell, `rm node_modules && npm install`)
   - First react cell ever: `cd factory/templates/react && npm install` once.
2. Install what the config says:
   - `snippet`: `AGENTS.md` = `# Project rules` + blank line + inner markdown
     block of `factory/skill/references/agents-snippet.md` (between the fences).
   - `skill`: `mkdir -p .devin/skills/unslop-ui-eval` inside the cell and copy
     `factory/skill/*` there (absolute paths — you're in the cell dir).
   - `counter`: `mkdir -p scripts && cp <abs>/factory/skill/scripts/count_tells.py scripts/`
   - `full`: all of the above + `.devin/hooks.v1.json`:
     `{"PostToolUse":[{"matcher":"write|edit|apply_patch|notebook_edit","hooks":[{"type":"command","command":"python3 <abs>/factory/skill/scripts/hook.py"}]}]}`
     Hooks won't auto-fire here — install anyway for fidelity.
3. **Gen pass**: read `factory/briefs/<brief>.md`, build the page.
   - html suffix: "Single self-contained page. `index.html` + `styles.css` (more
     local files allowed). No build step, no frameworks, no external requests.
     Must render by opening `index.html` directly."
   - react suffix: "Build it in `src/`. `npm run build` must pass. One screen."
   - Apply the config's `prompt_extra` if present.
   - Timebox ~15 min of unproductive editing → ship what you have, note it.
4. **Unslop pass** (`edit`, `edit-surface` only): install the skill, read
   `.devin/skills/unslop-ui-eval/SKILL.md` + references, apply it to the page
   sources (`/unslop-ui .` / `--surface` semantics), save the FULL report
   (Verdict, rule table, rewritten, kept, tasks) to `factory/reports/<run_id>.md`.
   Rebuild react afterwards.
5. **Publish**: `factory/runs/<run_id>/site/` must contain `index.html` + every
   local asset. html → copy page files; react → `npm run build` then copy `dist/*`.
6. **Score**: `python3 factory/score.py factory/runs/<run_id>`.
7. **meta.json** in the run dir:
   `{"id","brief","stack","agent":"devin-cloud","config","status":"ok|error","seconds","passes":[{"name","seconds"}],"build","ts","note"?}`
8. **Ledger**: append to `factory/ledger.jsonl`:
   `{"id","brief","stack","agent":"devin-cloud","config","status","seconds","surface_total","ts"}`
9. Check the cell off in `factory/PROGRESS.md`.

## Self-review loop — every ~25 completed cells

When the cell count since the last review hits ~25 (and always at the end of
Phase A), pause generation and run a review cycle — budget ~10-15 min:

1. **Aggregate**: from `factory/ledger.jsonl` compute per-config and per-brief
   stats — mean/median `surface_total`, error rate, mean `seconds`. A short
   python script is fine; save it as `factory/analyze.py` so it's reusable.
2. **Sample**: read 3-5 `factory/reports/*.md` from the weakest-looking cells
   (highest slop in a treated config, or lowest in control) plus 1-2 control
   cells for contrast.
3. **Append to `factory/FINDINGS.md`** a dated entry:
   ```
   ## Review <date> — cells <a>→<b> (<n> total)
   - Numbers: <config × stack slop table, notable per-brief outliers>
   - Observations: <what the data shows, with run ids as evidence>
   - Hypotheses: <why — tie to specific rules U1-U26 / unslop items>
   - Proposals: <links to factory/proposals/*.md>
   - Next: <what the next cycle should check>
   ```
4. **Proposals**: when a finding implies a concrete skill change, write
   `factory/proposals/NNN-<slug>.md` containing: the evidence (run ids,
   scores, report excerpts), the proposed change (which file, what text —
   a unified-diff-style block is ideal), expected effect, and how to
   validate it later. Number sequentially. These are the input for the
   skill-improvement pass on the real repo — make them copy-paste actionable.
5. Resume generation.

Review lenses to apply each cycle (rotate emphasis):
- Does `snippet` ≈ `rules` ≈ `full` on structural tells? Where does each win?
- Which briefs produce the most residual slop AFTER `edit-surface`? (skill gaps)
- Counter vs reality: do `control` cells with low counter scores still look
  slop-y in `pages/`? (counter blind spots → proposals for count_tells.py)
- Guardrail leaks: any deleted links/buttons, invented claims, broken states?
- html vs react asymmetry per config.
- Time cost: `seconds` by config — is the unslop pass worth its minutes?

## Cadence

- Every ~10 cells: `python3 factory/build_data.py && git add -A && git commit -m "cells: <n> new" && git push`
- Every review cycle: commit FINDINGS.md + proposals + analyze.py too.
- Session ending / context tight: finish current cell → `build_data.py` →
  final FINDINGS entry → commit + push → stop.

## Hard rules

- English pages, mock data inline, no external services, no real images.
- Match each brief's required elements — they are the spec.
- `control` = zero skill influence. Other configs = exactly what they say.
- NEVER modify: arena files, `factory/skill/`, `factory/score.py`,
  `factory/build_data.py`, `factory/briefs/`, `factory/configs.json`.
  You may add `factory/analyze.py`, `factory/FINDINGS.md`, `factory/proposals/`.
- A cell failing twice → `status:"error"` in meta + ledger, move on.
- Pages must look like real product UI — slop is the variable, brokenness is not.
