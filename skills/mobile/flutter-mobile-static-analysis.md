---
name: Flutter Mobile Static Analysis
slug: flutter-mobile-static-analysis
description: Authorized, evidence-first static analysis of Flutter/Dart mobile apps using Blutter decompilation or a raw libapp.so.
category: Security
version: 1.0.0
date: 2026-08-15
tags: [flutter, dart, mobile, static-analysis, reverse-engineering]
related: [mobile-hacking, android-pentesting]
---
# Flutter Mobile Static Analysis

A methodology for reverse-engineering Flutter/Dart mobile applications from their compiled Dart AOT (Ahead-Of-Time) snapshot, for the purpose of authorized security testing, run from a CLI environment with direct filesystem access. This skill assumes no access to the app's original source code — only what a real attacker would also have: the compiled artifact, or a decompilation of it.

## MANDATORY: Authorization gate — do this before touching any artifact

Reverse-engineering a compiled app to identify hardcoded secrets, authentication bypasses, or exploitable weaknesses is the kind of assistance that should only proceed when the target is the user's own application, or the user has documented authorization to test it (an engagement letter, a bug bounty program's scope, an internal pentest mandate, etc.).

Before doing any analysis:
1. **Ask directly** whether this is the user's own app, or authorized testing of a third party's app under a specific program/engagement.
2. If the answer is unclear, evasive, or indicates the target is someone else's app with no stated authorization, **do not proceed** with extraction-oriented analysis. Offer general secure-Flutter-development guidance instead.
3. Once authorization is established, it carries for the rest of the engagement — but stay alert for scope drift (e.g., artifacts that turn out to be from a different app than the one authorized).
4. When findings include real secrets/keys/credentials belonging to the user's own app or their own test account, it's appropriate to state them plainly in the report — this is the user's own material, for their own remediation. Never generalize this into producing standalone "how to extract secrets from any app" material detached from the specific authorized engagement.

If this context already exists earlier in the conversation, don't re-ask.

## Step 0: Intake checklist — run this before anything else

Ask the tester directly: **"Do you already have a Blutter decompilation of this app — an output directory containing `pp.txt`, `objs.txt`, and an `asm/` folder?"**

- **If no** → walk them through producing one. See `flutter-mobile-static-analysis-references/getting-blutter-output.md`. Don't proceed to review until an output_dir exists and you've verified its contents.
- **If yes** → ask for the path to the output_dir. Verify it directly (`ls`, check for `pp.txt`/`objs.txt`/`asm/`) before proceeding — don't assume the path is correct or complete.

Once you have a verified output_dir, **you have direct filesystem access to it** — this is the primary mode of operation for this skill. Use your own shell tools (`grep`, `find`, `read`/`cat`) directly against the files. You do not need to write prompts for a separate agent; that pattern (`flutter-mobile-static-analysis-references/ide-agent-prompts.md`) is a fallback only, for the rare case where you're working through a chat interface without direct file access to what the tester has locally — not the normal CLI path.

Also capture at intake, if known: the app's name/package ID, and whether the tester already knows which build/flavor this decompilation came from (production, staging, dev, etc.) — if not yet known, this gets confirmed as part of the review itself (see the checklist).

## Step 1: Build the map

Package/feature inventory, then a keyword sweep across the review categories in `flutter-mobile-static-analysis-references/universal-review-checklist.md`. Resist the urge to chase the first scary-looking string before you have this map — several of the best findings in a real engagement surface from *patterns* across the map (e.g. a class that mirrors a real service but is named `Fake*`), not from any single string. See `flutter-mobile-static-analysis-references/artifact-triage.md` for what `pp.txt`/`objs.txt` can and can't tell you versus the `asm/` directory, and how to build this map efficiently with direct shell access.

## Step 2: Confirm the build/flavor early

Staging/dev/pilot-specific behavior is expected and not a finding, but only if you've confirmed that's genuinely the flavor in front of you (via an `appFlavor`-style static field, a `flavors.dart`-equivalent, or — if the tester can provide it — the app's own network `Host` header from a capture). Getting this wrong inflates or deflates every other finding's severity. If it isn't obvious from the code, ask the tester.

## Step 3: Work the universal review checklist — systematically, to completion

`flutter-mobile-static-analysis-references/universal-review-checklist.md` is the core of this skill: an app-agnostic, MASVS-aligned checklist covering storage, cryptography, authentication, networking, platform/IPC, code quality, and anti-tampering/resilience. It's written in terms of search-pattern *families* and what confirmed-good/confirmed-bad looks like for each — not specific class names — because every app's naming conventions differ.

**Do not stop after finding a handful of issues.** The goal of this phase is a *confirmed static analysis* — meaning every category in the checklist has an explicit disposition: **Confirmed vulnerable**, **Confirmed safe / ruled out** (with the evidence that ruled it out), **Reported but unconfirmed** (needs a specific artifact or dynamic test to close), or **Not applicable** to this app. "I found three good findings" is not the finish line; a fully dispositioned checklist is. If you have task-tracking available in this environment, use it to hold the full checklist so nothing gets dropped over a long session — this kind of review runs long, and losing track of an unchecked category is the most common way a static analysis ends up incomplete without anyone noticing.

## Step 4: Trace with real rigor, not paraphrase

This is the core discipline of this skill — see `flutter-mobile-static-analysis-references/asm-tracing-technique.md`. Any finding whose severity depends on *exactly* what a function does (not just that it exists) needs literal, addressed ASM, traced register-by-register — not an English reconstruction, including your own first-pass read. Reconstructed pseudocode is a hypothesis to verify, not evidence to cite. Getting this wrong once can flip a finding's entire conclusion (a genuinely observed case: a first-pass reconstruction reported a 2-argument call where the raw ASM showed 1, with the argument *order* itself reversed from what would have actually worked).

## Step 5: Filter false positives before writing anything up

See `flutter-mobile-static-analysis-references/false-positive-patterns.md`. Long hex blobs, legacy-crypto-algorithm strings, and enum member names get mistaken for vulnerabilities constantly in this kind of analysis. Ruling something out and saying so explicitly is as valuable as finding something real — it's what separates a credible report from an alarmist keyword-grep dump.

## Step 6: Checkpoint with the tester as you go — don't guess, and don't go silent

Some things a compiled binary genuinely cannot answer on its own: which build this actually is, what a developer says about a design decision, whether a given endpoint is internet-reachable, whether dynamic testing already confirmed or contradicted something. When you hit one of these, **stop and ask a specific, scoped question** — not a vague "let me know if you have questions" at the very end. Good checkpoint questions name the exact artifact or fact needed (a specific file, a specific yes/no about the build, a specific thing to ask the developer) rather than asking the tester to re-explain context you could pin down yourself with one more grep.

Equally, don't let checkpointing become an excuse to pause the whole review — keep working the parts of the checklist that don't depend on the open question while you wait for an answer.

## Step 7: Use confidence levels, and update them as evidence changes

Every finding gets one of: **Definite** (you've seen the actual code logic that does this), **Probable** (strong evidence, needs one more artifact or a quick dynamic test to close), or **Speculative** (a name or pattern that could mean something, no strong evidence either way). Confidence should move in both directions as evidence accumulates — a finding that looks Critical from a string match alone can turn out to be closed and unreachable once the full call chain is traced, and a finding that looks like a minor "needs check" can turn out to be Confirmed and serious once traced end to end. Report both directions plainly.

## Step 8: Reconcile, don't just aggregate, when multiple analysis passes exist

If the tester brings findings from other tools/models/reviewers, deduplicate, correct anything your own evidence contradicts (explain why), and clearly mark what's independently confirmed vs. only reported elsewhere. Don't launder an unverified claim into your report just because someone else said it first.

## Step 9: Write the report — only once the checklist is actually done

See `flutter-mobile-static-analysis-references/report-template.md`: a findings summary table, a Mermaid architecture diagram built from what was actually traced (not a generic template diagram), and per-finding sections in a plain-language-but-technically-precise style — readable by a non-technical stakeholder, but naming exact functions/classes so a developer can locate them immediately.

## Core principles

- **The goal is a confirmed static analysis, not a first pass.** Keep working the checklist until every category has a real disposition. This is the single instruction most worth re-reading if a session starts to wrap up early.
- **Raw evidence beats paraphrase, always.** Treat any reconstructed pseudocode — yours included — as a hypothesis to verify, not a fact to cite.
- **A build's flavor changes everything.** Confirm which build you're looking at before finalizing severity, not after.
- **Honesty about corrections builds credibility.** A report that shows what was investigated and ruled out, with why, reads as more rigorous than one that only lists alarming findings.
- **Ask specific, scoped questions when the binary genuinely can't answer something** — don't guess, and don't stall the whole review waiting on one answer.
- **Don't reproduce exploit material for third parties.** Findings, derived keys, and extracted constants belonging to the tester's own authorized target are fine to state plainly for their own remediation. This skill is not a general-purpose "how to extract secrets from any app" reference.

## Reference files

- `flutter-mobile-static-analysis-references/getting-blutter-output.md` — What to do at intake if the tester doesn't yet have a Blutter output_dir.
- `flutter-mobile-static-analysis-references/artifact-triage.md` — What Blutter output looks like, how to inventory it, and the difference between what `pp.txt`/`objs.txt` can and can't tell you versus the `asm/` directory.
- `flutter-mobile-static-analysis-references/universal-review-checklist.md` — The app-agnostic, MASVS-aligned review checklist. The core of this skill.
- `flutter-mobile-static-analysis-references/asm-tracing-technique.md` — ARM64 Dart AOT calling-convention and object-layout cheat sheet, with a worked register-tracing example.
- `flutter-mobile-static-analysis-references/false-positive-patterns.md` — The recurring things that look like findings in this kind of analysis but usually aren't, and how to actually rule them out.
- `flutter-mobile-static-analysis-references/ide-agent-prompts.md` — Fallback prompts for when you're working through a chat interface without direct file access, and the tester's own IDE agent has to extract things for you instead.
- `flutter-mobile-static-analysis-references/report-template.md` — The findings-report structure, the Mermaid diagram convention, and severity-calibration guidance.
