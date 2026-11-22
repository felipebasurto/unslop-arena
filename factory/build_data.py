#!/usr/bin/env python3
"""Rebuild the arena dataset: data.js + pages/ from factory runs.

Scans factory/runs/*/meta.json (preferred) and falls back to
factory/ledger.jsonl entries whose pages/<id>/ already exists. Emits
ARENA_RUNS at the repo root (window.ARENA_RUNS) and copies each run's
static site into pages/<id>/.

  python3 factory/build_data.py
"""
import json
import os
import shutil

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
RUNS = os.path.join(HERE, "runs")
LEDGER = os.path.join(HERE, "ledger.jsonl")
PAGES = os.path.join(ROOT, "pages")
DATA = os.path.join(ROOT, "data.js")


def slop_score(total):
    """0-100 meter: saturating curve so 0->0 and ~30 tells -> ~70."""
    return round(100 * total / (total + 12))


def record_from_meta(meta, run_dir):
    score = meta.get("score") or {}
    surface = score.get("surface") or {}
    tells = {rule: int(v.get("count") or v) for rule, v in surface.items()
             if isinstance(v, (dict, int)) and rule != "total"}
    total = int(surface.get("total") or 0)
    site = os.path.join(run_dir, "site")
    if meta.get("status") != "ok" or not os.path.isdir(site):
        return None
    rid = meta["id"]
    dest = os.path.join(PAGES, rid)
    if os.path.exists(dest):
        shutil.rmtree(dest)
    shutil.copytree(site, dest)
    return {
        "id": rid,
        "page": meta.get("brief"),
        "stack": meta.get("stack"),
        "agent": meta.get("agent"),
        "config": meta.get("config"),
        "preview": "pages/{}/index.html".format(rid),
        "tells": tells,
        "total": total,
        "slop": slop_score(total),
        "seconds": int(meta.get("seconds") or 0),
    }


def record_from_ledger(line):
    """Fallback for runs whose workspace was cleaned: pages/<id> must exist."""
    rid = line.get("id")
    if not rid or not os.path.exists(os.path.join(PAGES, rid, "index.html")):
        return None
    total = int(line.get("surface_total") or line.get("total") or 0)
    return {
        "id": rid,
        "page": line.get("brief"),
        "stack": line.get("stack"),
        "agent": line.get("agent"),
        "config": line.get("config"),
        "preview": "pages/{}/index.html".format(rid),
        "tells": {},
        "total": total,
        "slop": slop_score(total),
        "seconds": int(line.get("seconds") or 0),
    }


def main():
    records, seen = [], set()
    if os.path.isdir(RUNS):
        for name in sorted(os.listdir(RUNS)):
            meta_path = os.path.join(RUNS, name, "meta.json")
            if not os.path.exists(meta_path):
                continue
            try:
                meta = json.load(open(meta_path, encoding="utf-8"))
            except Exception:
                continue
            rec = record_from_meta(meta, os.path.join(RUNS, name))
            if rec:
                records.append(rec)
                seen.add(rec["id"])
    if os.path.exists(LEDGER):
        for line in open(LEDGER, encoding="utf-8"):
            line = line.strip()
            if not line:
                continue
            try:
                rec = record_from_ledger(json.loads(line))
            except Exception:
                continue
            if rec and rec["id"] not in seen:
                records.append(rec)
                seen.add(rec["id"])
    os.makedirs(PAGES, exist_ok=True)
    with open(DATA, "w", encoding="utf-8") as f:
        f.write("window.ARENA_RUNS = {}\n".format(json.dumps(records, indent=1)))
    print("{} runs -> {}".format(len(records), DATA))


if __name__ == "__main__":
    main()
