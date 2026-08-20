# Skill Shelf

A **lightweight, public web library** for reusable AI agent skills. Each skill is a plain Markdown (`SKILL.md`) file stored in this repository, published on **GitHub Pages**, and directly fetchable by AI agents — no backend, no database, no JavaScript required to consume the content.

![license](https://img.shields.io/badge/license-MIT-lightgrey)

## Features

- **Agent-friendly** — `/index.json` is the registry; `/skills/<slug>/skill.md` is the content. Both are plain files served as-is.
- **Zero dependencies** — plain HTML, CSS, and vanilla JavaScript. The Markdown renderer is hand-written and bundled.
- **Subpath safe** — works at `/` *and* under a GitHub Pages subpath like `/Skill-Shelf/`.
- **Search & filter** — live search across name, description, category, and tags, plus category chips.
- **Copy-first UX** — copy the direct skill URL or the raw `.md` link in one click.
- **Dark / light mode** — follows system preference, toggle persisted in `localStorage`.
- **Responsive** — clean card grid that adapts to mobile.

## Structure

```text
/
├── index.html          # SPA shell (list + detail views, hash-routed)
├── index.json          # Skill registry (auto-generated, not edited by hand)
├── assets/
│   ├── style.css       # All styling, dark/light themes
│   └── app.js          # Registry load, search, routing, markdown renderer
├── skills/
│   ├── android-pentesting/
│   │   └── skill.md
│   ├── appsec/
│   │   └── skill.md
│   └── ...
├── .github/
│   ├── workflows/
│   │   └── generate-index.yml   # Rebuilds index.json on every push
│   └── scripts/
│       └── generate_index.py    # Scans skills/ + front matter → index.json
└── README.md
```

## How it works

The site is a single static page. The frontend fetches `index.json`, renders skill cards, and on click loads the matching `skills/<slug>/skill.md` and renders it with a bundled Markdown renderer (including code blocks with copy buttons). On every push, a GitHub Action scans `skills/` and regenerates `index.json` from each file's front matter, so adding a skill is just adding a folder and a file.

Because everything is a plain file, an AI agent can bypass the UI entirely:

```bash
# 1. Discover available skills
curl https://USERNAME.github.io/REPOSITORY/index.json

# 2. Fetch a skill's content directly
curl https://USERNAME.github.io/REPOSITORY/skills/android-pentesting/skill.md
```

The raw `.md` URL is always reachable independently of the website — GitHub Pages serves it as a plain text file.

## Adding a new skill

**That's it — no `index.json` editing needed.** A GitHub Action
(`.github/workflows/generate-index.yml`) scans `skills/` on every push and
regenerates `index.json` automatically.

1. **Create a directory** under `skills/`:

   ```bash
   mkdir -p skills/my-new-skill
   ```

2. **Add `skill.md`** with a YAML front-matter block (recommended — it supplies the metadata shown on the site):

   ```markdown
   ---
   name: My New Skill
   slug: my-new-skill
   description: What this skill does, in one sentence.
   category: Workflow
   version: 1.0.0
   tags: [dev, automation]
   ---

   # My New Skill

   ...
   ```

3. **Commit and push.** The Action regenerates `index.json`, and GitHub Pages publishes the update. The card, styling, search, and detail page all appear automatically.

Only `name` and the `skill.md` file itself are strictly required. If you omit the front matter, the generator falls back to the folder name and a `General` category, so even a bare Markdown file still shows up.

### Front matter fields

| Field | Required | Description |
| ----- | -------- | ----------- |
| `name` | yes | Display name shown on cards and the skill page |
| `slug` | no | URL fragment (`#/skills/<slug>`); defaults to the folder name |
| `description` | no | Short summary shown on cards and the skill page |
| `category` | no | Drives the filter chips; defaults to `General` |
| `version` | no | Optional version string (kept in the registry metadata) |
| `tags` | no | Array of strings; searched and rendered as small chips |

> **Important:** keep the folder name and `slug` matching — the site resolves both against the repo's base URL so it works under any GitHub Pages subpath.

> `index.json` is now **auto-generated** (`.github/scripts/generate_index.py`). Don't edit it by hand; your changes will be overwritten on the next push.

## Deploying with GitHub Pages

1. **Create a repository** (e.g. `Skill-Shelf`) and push this project to it.
2. Go to **Settings → Pages** in the repository.
3. Under **Build and deployment**, choose:
   - **Source:** `Deploy from a branch`
   - **Branch:** `main` / `/ (root)`
4. Click **Save**. GitHub publishes at:

   ```text
   https://USERNAME.github.io/REPOSITORY/
   ```

   If the repo is named `<username>.github.io` the site is served at the domain root.

The site auto-detects its base path from the script location, so no configuration is needed for the subpath case.

## Local development

Any static file server works:

```bash
cd Skill-Shelf
python3 -m http.server 8080
# or
npx serve .
```

Open `http://localhost:8080/`.

To mimic a GitHub Pages subpath locally:

```bash
cd ..
python3 -m http.server 8080
# then visit http://localhost:8080/Skill-Shelf/
```

## Customizing

- **Colors / fonts** — edit the CSS variables at the top of `assets/style.css`.
- **Site name** — update the `<title>`, header brand, and hero in `index.html` (also the footer text).
- **GitHub link** — update the header "GitHub" link in `index.html`.

## Contributing

1. Add a skill: create `skills/<name>/skill.md` (see [Adding a new skill](#adding-a-new-skill)).
2. Commit and push. The Action regenerates `index.json` and the site updates automatically.
3. You can regenerate locally at any time with `python3 .github/scripts/generate_index.py`.

## License

MIT — use the skills, fork the site, share freely.