#!/usr/bin/env python3
"""Regenerate index.json and llms.txt from the skills/ directory.

Scans skills/<topic>/*.md (one Markdown file per skill, grouped into topic
folders that can hold several skills), reads the YAML front matter block at
the top of each file, and builds the registry. Run from anywhere in the
repo; it locates the repo root relative to this script.

Front matter keys supported:
  name, slug, description, category, version, tags, date, related

Only "name" is strictly required; everything else falls back to a sensible
default so adding a skill is still just "drop a file into a topic folder,
push".
"""

import json
import os
import re

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
SKILLS_DIR = os.path.join(ROOT, "skills")
INDEX_OUT = os.path.join(ROOT, "index.json")
LLMS_OUT = os.path.join(ROOT, "llms.txt")


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


def read_skill(topic, md):
    if not os.path.isfile(md):
        return None
    with open(md, encoding="utf-8") as f:
        text = f.read()
    fm = parse_front_matter(text)

    stem = os.path.splitext(os.path.basename(md))[0]
    slug = fm.get("slug") or stem
    name = fm.get("name") or slug.replace("-", " ").title()

    item = {
        "name": name,
        "slug": slug,
        "description": fm.get("description", ""),
        "category": fm.get("category", "General"),
        "topic": topic,
        "path": os.path.relpath(md, ROOT).replace(os.sep, "/"),
    }
    if fm.get("version"):
        item["version"] = str(fm["version"])
    if fm.get("tags"):
        tags = fm["tags"]
        if isinstance(tags, list) and tags:
            item["tags"] = tags
    if fm.get("date"):
        item["date"] = str(fm["date"])
    if fm.get("related"):
        rel = fm["related"]
        if isinstance(rel, list) and rel:
            item["related"] = rel
    return item


def site_base():
    """Absolute base URL for absolute links in llms.txt."""
    url = os.environ.get("SITE_URL")
    if url:
        return url.rstrip("/") + "/"
    repo = os.environ.get("GITHUB_REPOSITORY", "")
    if "/" in repo:
        owner, name = repo.split("/", 1)
        if name.lower() == owner.lower() + ".github.io":
            return "https://{}.github.io/".format(owner)
        return "https://{}.github.io/{}/".format(owner, name)
    return ""


def build():
    skills = []
    if os.path.isdir(SKILLS_DIR):
        for topic in sorted(os.listdir(SKILLS_DIR)):
            tdir = os.path.join(SKILLS_DIR, topic)
            if not os.path.isdir(tdir) or topic.startswith("."):
                continue
            for entry in sorted(os.listdir(tdir)):
                md = os.path.join(tdir, entry)
                if not os.path.isfile(md) or not md.endswith(".md"):
                    continue
                item = read_skill(topic, md)
                if item:
                    skills.append(item)

    data = {
        "$comment": "Auto-generated from skills/<topic>/*.md by .github/scripts/generate_index.py. Do not edit manually.",
        "skills": skills,
    }

    with open(INDEX_OUT, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
        f.write("\n")
    print("Wrote {} entries to {}".format(len(skills), INDEX_OUT))

    write_llms(skills)


def write_llms(skills):
    base = site_base()
    lines = ["# Skill Shelf", ""]
    lines.append("> A lightweight, public registry of reusable AI agent skills. Each skill is a plain Markdown file (SKILL.md) that an AI agent can fetch directly.")
    lines.append("")
    lines.append("## Skills")
    lines.append("")
    for s in skills:
        url = base + s["path"] if base else s["path"]
        desc = s.get("description", "")
        lines.append("- [{}]({}): {}".format(s["name"], url, desc))
    lines.append("")
    lines.append("## Machine-readable index")
    lines.append("")
    idx = base + "index.json" if base else "index.json"
    lines.append("- [Registry]({}): Full metadata for every skill.".format(idx))
    lines.append("")
    with open(LLMS_OUT, "w", encoding="utf-8") as f:
        f.write("\n".join(lines))
    print("Wrote {}".format(LLMS_OUT))


if __name__ == "__main__":
    build()