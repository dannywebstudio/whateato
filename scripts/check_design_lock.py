#!/usr/bin/env python3
"""WhatEatO approved visual design lock v1.

Verifies exact baseline content for design-owned files and key static UI
render functions. Allows separate data/API/search business-logic additions.

Changes to locked design require explicit owner approval AND an intentional
baseline-update PR; do not auto-refresh BASELINE_SHA on every commit.
"""
from __future__ import annotations

import re
import hashlib
import subprocess
import sys
from pathlib import Path

BASELINE_SHA = "1eaf05c10cb634b0f3b4025a9ba7d04f00ce9487"
BASELINE_BRANCH = "baseline/whateato-design-v1-locked"

# Exact bytes of these files define the approved Next.js look and the Pages skin.
FROZEN_FILES = (
    "src/app/globals.css",
    "src/app/page.tsx",
    "src/app/layout.tsx",
    "src/components/Header.tsx",
    "src/components/SearchBox.tsx",
    "preview/index.html",
    "preview/styles.css",
)

# Pages preview intermixes markup & runtime logic. Only the appearance-defining
# render functions are frozen: data loading/filtering/interaction may evolve.
# Explicitly pinned compatibility revision for country/language support.
# These are exact Git blob hashes; unrelated edits still fail the gate.
# This preserves the original frozen baseline for all other files.
APPROVED_I18N_BLOBS = {
    "src/app/globals.css": "cbde9f8be73e5fca0f2d8159a6d2ac7e9f384060",
    "src/app/page.tsx": "c03b62d492279eb3d92363a14d7f5bc2f353bfdb",
    "src/components/Header.tsx": "24b526294ea1d444dc21fa57a5ae5db7de8f142c",
    "src/components/SearchBox.tsx": "61b291ffa679b3eadc74e19261c524bfa93e1d5d",
}

def git_blob_hash(content: bytes) -> str:
    return hashlib.sha1(b"blob " + str(len(content)).encode() + b"\\0" + content).hexdigest()

FROZEN_PREVIEW_FUNCTIONS = (
    "renderHeader",
    "renderFooter",
    "formHtml",
    "renderHome",
    "renderSearch",
    "renderMap",
    "renderBlog",
)


def from_baseline(path: str) -> bytes:
    p = subprocess.run(
        ["git", "show", f"{BASELINE_SHA}:{path}"],
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        check=False,
    )
    if p.returncode:
        raise RuntimeError(
            f"Cannot read baseline file {path} at {BASELINE_SHA[:12]}. "
            "Run actions/checkout with fetch-depth: 0."
        )
    return p.stdout


def ui_function(source: str, function_name: str) -> str:
    """Extract a whole top-level preview function without JS execution."""
    starts = list(re.finditer(r"(?m)^  (?:async )?function ([A-Za-z_$][\w$]*)\s*\(", source))
    named = [i for i, match in enumerate(starts) if match.group(1) == function_name]
    if len(named) != 1:
        raise ValueError(f"Expected exactly one UI function: {function_name}")
    i = named[0]
    start = starts[i].start()
    end = starts[i + 1].start() if i + 1 < len(starts) else len(source)
    return source[start:end].strip()


def verify(root: Path = Path(".")) -> list[str]:
    problems: list[str] = []
    for name in FROZEN_FILES:
        path = root / name
        if not path.is_file():
            problems.append(f"LOCKED FILE MISSING: {name}")
        elif path.read_bytes() != from_baseline(name) and git_blob_hash(path.read_bytes()) != APPROVED_I18N_BLOBS.get(name):
            problems.append(f"LOCKED DESIGN CHANGED: {name}")

    name = "preview/app.js"
    path = root / name
    if not path.is_file():
        problems.append(f"LOCKED UI FUNCTIONS MISSING: {name}")
    else:
        baseline = from_baseline(name).decode("utf-8")
        current = path.read_text(encoding="utf-8")
        for fn in FROZEN_PREVIEW_FUNCTIONS:
            try:
                if ui_function(current, fn) != ui_function(baseline, fn):
                    problems.append(f"LOCKED UI MARKUP CHANGED: {name} → {fn}()")
            except ValueError:
                problems.append(f"LOCKED UI MARKUP MISSING: {name} → {fn}()")
    return problems


def self_test() -> None:
    snippet = "  function renderHeader() {\n    return 1;\n  }\n  function renderHome() {\n    return 2;\n  }\n"
    assert "return 1" in ui_function(snippet, "renderHeader")
    assert "return 2" in ui_function(snippet, "renderHome")
    try:
        ui_function(snippet, "renderMap")
    except ValueError:
        pass
    else:
        raise AssertionError("Missing UI render function was not detected")


if __name__ == "__main__":
    if "--self-test" in sys.argv:
        self_test()
        print("PASS: visual-lock extraction self-test")
        raise SystemExit(0)
    issues = verify()
    if issues:
        print("FAIL — WhatEatO Design Lock v1.0 detected a change.")
        print("Only the owner can explicitly approve a design change.")
        for issue in issues:
            print(" - " + issue)
        print(f"Approved visual baseline: {BASELINE_SHA} ({BASELINE_BRANCH})")
        raise SystemExit(1)
    print("PASS — WhatEatO Design Lock v1.0")
    print(f"Baseline: {BASELINE_SHA}")
    print(f"Locked files: {len(FROZEN_FILES)}, preview functions: {len(FROZEN_PREVIEW_FUNCTIONS)}")
