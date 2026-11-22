#!/usr/bin/env python3
"""Score a factory run cell and merge the result into its meta.json.

Usage: python3 factory/score.py factory/runs/<run_id>

Detects the stack (index.html -> html, src/ -> react), runs count_tells.py
with and without --surface on the page sources, and writes/updates
meta.json["score"] as flat {"total": int, "<rule>": int} dicts.
Prints the score block as JSON.
"""
import json
import os
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
COUNTER = os.path.join(HERE, "skill", "scripts", "count_tells.py")


def count_tells(targets, surface):
    cmd = [sys.executable, COUNTER] + targets + (["--surface"] if surface else [])
    out = subprocess.run(cmd, capture_output=True, text=True, cwd=os.path.dirname(targets[0]) if False else None)
    if out.returncode != 0:
        raise RuntimeError("count_tells failed: " + out.stderr.strip()[:300])
    data = json.loads(out.stdout)
    flat = {}
    for rule, entry in data.items():
        if rule == "total":
            continue
        flat[rule] = int(entry.get("count", 0)) if isinstance(entry, dict) else int(entry)
    flat["total"] = int(data.get("total", 0))
    return flat


def main():
    run_dir = os.path.abspath(sys.argv[1])
    meta_path = os.path.join(run_dir, "meta.json")
    meta = json.load(open(meta_path, encoding="utf-8")) if os.path.exists(meta_path) else {}

    if os.path.exists(os.path.join(run_dir, "index.html")):
        targets = [os.path.join(run_dir, "index.html"), os.path.join(run_dir, "styles.css")]
        targets = [t for t in targets if os.path.exists(t)]
    elif os.path.isdir(os.path.join(run_dir, "src")):
        targets = [os.path.join(run_dir, "src")]
    else:
        print(json.dumps({"error": "no page sources found"}))
        sys.exit(1)

    score = {
        "copy": count_tells(targets, False),
        "surface": count_tells(targets, True),
    }
    meta["score"] = score
    meta.setdefault("id", os.path.basename(run_dir))
    with open(meta_path, "w", encoding="utf-8") as f:
        json.dump(meta, f, indent=1)
    print(json.dumps(score))


if __name__ == "__main__":
    main()
