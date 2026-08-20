---
name: Git Release Workflow
slug: git-release-workflow
description: Dependable release process for git projects.
category: Workflow
version: 1.0.0
tags: [git, release, ci, automation]
---

# Git Release Workflow

A predictable, repeatable release process for git-based projects. Works for libraries, apps, and documentation — adapt the checklist to your scale.

## 1. Branching Model

Use a lightweight trunk-based flow with short-lived branches:

```text
main  ──●──●────────────●──────────────●──  releases
        \              /              /
feature ──●──●─────────┘              /
fix ──────────────────────────────●──┘
```

1. Work happens on `feature/*` or `fix/*` branches.
2. Changes merge to `main` via pull request (reviewed).
3. Releases are tagged from `main` — no long-lived release branches unless a hotfix process demands it.

## 2. Conventional Commits

Keep history readable and machine-parsable:

```text
feat(auth): add passwordless magic-link login
fix(api): return 409 when email already exists
docs(readme): clarify install steps
chore(deps): bump lodash to 4.17.21
```

This lets tools derive changelogs and version bumps automatically.

## 3. Version Bumping

Use [SemVer](https://semver.org):

- **MAJOR** — breaking changes (`2.0.0`)
- **MINOR** — new, backward-compatible features (`1.5.0`)
- **PATCH** — backward-compatible bug fixes (`1.5.1`)

Pre-release suffixes (`-rc.1`, `-beta.2`) are fine before GA.

## 4. Release Checklist

1. Merge all intended changes into `main`.
2. Run the full test suite and linters.
3. Update the changelog (derived from commits since the last tag).
4. Bump the version (package manifest / `version` file).
5. Tag the release.
6. Push tag and build/publish artifacts.
7. Verify the published artifact installs cleanly.

```bash
VERSION=1.5.0
git checkout main && git pull --ff-only
npm run test && npm run lint
npm version $VERSION -m "release: %s"
git push --follow-tags origin main
```

## 5. Tagging & Changelog

Tags are the contract. Sign them when your project requires provenance:

```bash
git tag -s -m "Release $VERSION" v$VERSION
git push origin v$VERSION
```

A changelog should contain, per release: date, version, and grouped changes (Added / Changed / Fixed / Removed).

## 6. Hotfix Process

For production issues:

1. Branch `hotfix/*` from the tag of the broken release.
2. Apply the minimal fix and bump the **PATCH** version.
3. Merge to `main` and back to any supported branches.
4. Tag and release immediately — do not bundle unrelated work.

```text
v1.5.0 ──●── hotfix: crash on empty config
           └── v1.5.1
```

## 7. Automation (Optional)

If CI is available, gate every release on:

- Tests + lint on every PR.
- A build job on `main` after merge.
- A release job triggered only by the `v*` tag.

```yaml
on:
  push:
    tags: ["v*"]
jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm ci && npm run build
      - run: npm publish
```

---

*Metadata lives in `/index.json`. Raw file: `skills/git-release-workflow/skill.md`.*