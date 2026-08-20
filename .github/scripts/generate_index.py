#!/usr/bin/env python3
"""Regenerate index.json from the skills/ directory.

Scans skills/<slug>/skill.md, reads the YAML front matter block at the top
of each file, and builds the registry. Run from anywhere in the repo; it
locates the repo root relative to this script.

Front matter keys supported:
  name, slug, description, category, version, tags

Only "name" and a file named skill.md are strictly required; everything
else falls back to a sensible default so adding a skill is still just
"create a folder, drop a file, push".
"""

import json
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
SKILLS_DIR = os.path.join(ROOT, "skills")
OUT_PATH = os.path.join(ROOT, "index.json")


def parse_front_matter(text):
    """Parse a simple YAML front matter block (key: value lines)."""
    if not text.startswith("---"):
        return {}
    parts = text.split("---", 2)
    if len(parts) < 3:
        return {}
    meta = {}
    for line in parts[1].splitlines():
        line = line.strip()
        if not line or line.startswith("#"):
            continue
        m = re.match(r"^([A-Za-z0-9_-]+):\s*(.*)$", line)
        if not m:
            continue
        key, val = m.group(1), m.group(2).strip()
        if val.startswith("[") and val.endswith("]"):
            inner = val[1:-1].strip()
            items = [x.strip().strip('"').strip("'") for x in inner.split(",") if x.strip()]
            meta[key] = items
        else:
            meta[key] = val.strip('"').strip("'")
    return meta


def read_skill(entry):
    md = os.path.join(SKILLS_DIR, entry, "skill.md")
    if not os.path.isfile(md):
        return None
    with open(md, encoding="utf-8") as f:
        text = f.read()
    fm = parse_front_matter(text)

    slug = fm.get("slug") or entry
    name = fm.get("name") or slug.replace("-", " ").title()

    item = {
        "name": name,
        "slug": slug,
        "description": fm.get("description", ""),
        "category": fm.get("category", "General"),
        "path": "skills/{}/skill.md".format(slug),
    }
    if fm.get("version"):
        item["version"] = str(fm["version"])
    if fm.get("tags"):
        tags = fm["tags"]
        if isinstance(tags, list) and tags:
            item["tags"] = tags
    return item


def build():
    skills = []
    if os.path.isdir(SKILLS_DIR):
        for entry in sorted(os.listdir(SKILLS_DIR)):
            item = read_skill(entry)
            if item:
                skills.append(item)

    data = {
        "$comment": "Auto-generated from skills/*/skill.md by .github/scripts/generate_index.py. Do not edit manually.",
        "skills": skills,
    }

    with open(OUT_PATH, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
        f.write("\n")
    print("Wrote {} entries to {}".format(len(skills), OUT_PATH))


if __name__ == "__main__":
    build()