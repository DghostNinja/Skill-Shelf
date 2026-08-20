# Skill Shelf

A **lightweight, public web library** for reusable AI agent skills. Each skill is a plain Markdown (`SKILL.md`) file stored in this repository, published on **GitHub Pages**, and directly fetchable by AI agents — no backend, no database, no JavaScript required to consume the content.

![license](https://img.shields.io/badge/license-MIT-lightgrey)

## Features

- **Agent-friendly** — `/index.json` is the registry; `/skills/<topic>/<skill>.md` is the content. Both are plain files served as-is.
- **Zero dependencies** — plain HTML, CSS, and vanilla JavaScript. The Markdown renderer is hand-written and bundled.
- **Subpath safe** — works at `/` *and* under a GitHub Pages subpath like `/Skill-Shelf/`.
- **Search & filter** — live search across name, description, category, and tags, plus category chips. Searches are shareable via the URL (`#/?q=...&c=...`).
- **Copy-first UX** — copy the direct skill URL, the raw `.md` link, or a ready-to-paste **agent snippet** in one click.
- **Auto table of contents** — generated from each skill's headings (only on longer skills).
- **Related skills** — optional `related` field links skills to each other.
- **Sorting** — A–Z or Newest (uses an optional `date` in front matter).
- **Dark / light mode** — follows system preference, toggle persisted in `localStorage`.
- **Responsive** — clean card grid that adapts to mobile.

## Structure

```text
/
├── index.html          # SPA shell (list + detail views, hash-routed)
├── index.json          # Skill registry (auto-generated, not edited by hand)
├── llms.txt            # Agent-readable index (auto-generated)
├── assets/
│   ├── style.css       # All styling, dark/light themes
│   └── app.js          # Registry load, search, routing, markdown renderer
├── skills/
│   ├── web/                  # web-pentesting.md, api-security-testing.md, ...
│   ├── appsec/               # appsec.md, secure-code-review.md, ...
│   ├── mobile/               # android-pentesting.md, mobile-hacking.md, ...
│   ├── hardware/             # hardware-hacking-arduino.md
│   ├── workflow/             # git-release-workflow.md
│   └── reporting/            # vulnerability-report-writer.md
├── .github/
│   ├── workflows/
│   │   └── generate-index.yml   # Rebuilds index.json + llms.txt on every push
│   └── scripts/
│       └── generate_index.py    # Scans skills/ + front matter → index.json
└── README.md
```

## How it works

The site is a single static page. The frontend fetches `index.json`, renders skill cards, and on click loads the matching `skills/<topic>/<skill>.md` and renders it with a bundled Markdown renderer (including code blocks with copy buttons). On every push, a GitHub Action scans `skills/` and regenerates `index.json` and `llms.txt` from each file's front matter, so adding a skill is just adding a file into a topic folder.

> **Note:** all example URLs below use `https://dghostninja.github.io/Skill-Shelf/`. If you self-host or run this locally, replace that base with your own URL (e.g. `http://localhost:8080/Skill-Shelf/`).

Because everything is a plain file, an AI agent can bypass the UI entirely:

```bash
# 1. Discover available skills
curl https://dghostninja.github.io/Skill-Shelf/index.json

# 2. Human/agent-readable index (same info, prose format)
curl https://dghostninja.github.io/Skill-Shelf/llms.txt

# 3. Fetch a skill's content directly
curl https://dghostninja.github.io/Skill-Shelf/skills/web/web-pentesting.md
```

The raw `.md` URL is always reachable independently of the website — GitHub Pages serves it as a plain text file.

## Usage with a model or agent

Every skill is a plain text file. There is no login, no app, no plugin to install. You only need a public URL.

> The same instructions are available on the site itself at `#/usage` (or via the **Usage** link in the header).

### Step 1: Give the model the registry

Open a chat with any model that can fetch URLs (ChatGPT, Claude, Gemini, a coding agent, etc.) and paste one of these:

```text
https://dghostninja.github.io/Skill-Shelf/index.json
```

or the readable version:

```text
https://dghostninja.github.io/Skill-Shelf/llms.txt
```

The model reads the list, sees the skill names, descriptions, and categories, and can pick one.

### Step 2: Point it at a specific skill

The raw file URL for any skill is:

```text
https://dghostninja.github.io/Skill-Shelf/skills/<topic>/<skill>.md
```

For example:

```text
https://dghostninja.github.io/Skill-Shelf/skills/appsec/appsec.md
```

### Step 3: Copy the agent snippet (easiest way)

Open any skill on the website. Near the top there is a box labelled **For AI agents** with a **Copy agent snippet** button. It copies a short block like this:

```text
Skill: Application Security Review
Category: Security
Description: Structured review of web applications for security flaws.

Fetch the skill file:
curl https://dghostninja.github.io/Skill-Shelf/skills/appsec/appsec.md
```

Paste that block into your model's prompt. It tells the model what the skill is and how to get the full instructions.

### What a ready-to-use prompt looks like

```text
Use this skill for the task.

Skill: Application Security Review
Category: Security
Description: Structured review of web applications for security flaws.

Fetch the skill file:
curl https://dghostninja.github.io/Skill-Shelf/skills/appsec/appsec.md

Follow the skill's steps and report your findings.
```

### If the model cannot fetch URLs

Download the raw `.md` file (right-click the Raw .md file button, save), then attach the file directly to the chat like any document.

### Command-line check

```bash
# See what skills exist
curl https://dghostninja.github.io/Skill-Shelf/index.json

# Get one skill's full instructions
curl https://dghostninja.github.io/Skill-Shelf/skills/appsec/appsec.md
```

That is the whole flow: registry for discovery, raw file for content. Both stay plain files, so any tool that can read a URL can use them.

## Adding a new skill

**That's it — no `index.json` editing needed.** A GitHub Action
(`.github/workflows/generate-index.yml`) scans `skills/` on every push and
regenerates `index.json` automatically.

Skills are grouped into **topic folders** (`web/`, `appsec/`, `mobile/`, `hardware/`,
`workflow/`, `reporting/`). A folder can hold several skills — one well-named Markdown
file per skill — so you don't end up with a folder per skill.

1. **Pick a topic folder** (or create a new one) under `skills/`:

   ```bash
   # add to an existing topic, or create a new one:
   mkdir -p skills/my-topic
   ```

2. **Add one Markdown file per skill** — name it after the skill (e.g. `skills/web/my-new-skill.md`) with a YAML front-matter block (recommended — it supplies the metadata shown on the site):

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

Only `name` is strictly required. If you omit the front matter, the generator falls back to the file name and a `General` category, so even a bare Markdown file still shows up.

### Front matter fields

| Field | Required | Description |
| ----- | -------- | ----------- |
| `name` | yes | Display name shown on cards and the skill page |
| `slug` | no | URL fragment (`#/skills/<slug>`); defaults to the file name |
| `description` | no | Short summary shown on cards and the skill page |
| `category` | no | Drives the filter chips; defaults to `General` |
| `version` | no | Optional version string (kept in the registry metadata) |
| `tags` | no | Array of strings; searched and rendered as small chips |
| `date` | no | ISO date (`2026-08-01`); powers the "Newest" sort |
| `related` | no | Array of other skill slugs (`[appsec, web-pentesting]`); rendered as links on the detail page |

> **Important:** keep the file name and `slug` matching — the site resolves both against the repo's base URL so it works under any GitHub Pages subpath.

> `index.json` is now **auto-generated** (`.github/scripts/generate_index.py`). Don't edit it by hand; your changes will be overwritten on the next push.

## Deploying with GitHub Pages

1. **Create a repository** (e.g. `Skill-Shelf`) and push this project to it.
2. Go to **Settings → Pages** in the repository.
3. Under **Build and deployment**, choose:
   - **Source:** `Deploy from a branch`
   - **Branch:** `main` / `/ (root)`
4. Click **Save**. GitHub publishes at:

   ```text
   https://dghostninja.github.io/Skill-Shelf/
   ```

   If the repo is named `<username>.github.io` the site is served at the domain root.

The site auto-detects its base path from the script location, so no configuration is needed for the subpath case.

> **Custom domain?** `llms.txt` and the registry URLs are derived automatically from the repo name. If you use a custom domain, set a repository variable named `SITE_URL` (e.g. `https://skills.example.com/`) in **Settings → Secrets and variables → Actions → Variables** and `llms.txt` will link to that instead.

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

1. Add a skill: create `skills/<topic>/<skill>.md` (see [Adding a new skill](#adding-a-new-skill)).
2. Commit and push. The Action regenerates `index.json` and the site updates automatically.
3. You can regenerate locally at any time with `python3 .github/scripts/generate_index.py`.

## License

MIT — use the skills, fork the site, share freely.