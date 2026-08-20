# Findings Report Structure

This skill produces reports readable by both a non-technical stakeholder and a developer who needs to locate and fix the exact code. Prefer this over either extreme (a jargon-dense report only an engineer can parse, or a dumbed-down summary that strips out the function/class names a developer actually needs).

## Overall structure

1. **Title/metadata block** — app name, exact build/flavor analyzed, assessment type, report status (interim vs. final).
2. **Executive summary** — plain language, 2-4 short paragraphs, no function names. What was tested, what the single most important finding means in real terms, and what happens next.
3. **Scope & methodology** — brief. State explicitly what artifacts were analyzed (static/decompiled vs. any dynamic testing used to confirm), and **explicitly flag which build/flavor was examined** and what that does and doesn't tell you about production.
4. **Architecture & data-flow diagram** (Mermaid) — see below. This is a deliberate section, not decoration: it demonstrates to the development team that the analysis traced the *real* app flow, not a generic template, and it visually anchors every finding to where it actually sits in the flow.
5. **Findings summary table** — columns: #, finding title, severity, status (Confirmed / Open-needs verification / Reported-unconfirmed / Closed-ruled out).
6. **Detailed findings**, ordered by severity, each following the pattern below.
7. **Positive controls observed** — always include this. A report that's only bad news reads as less credible, not more; showing what's working demonstrates the assessment was balanced, not just hunting for problems.
8. **Findings investigated and ruled out** — a short, explicit section listing anything that looked concerning initially but was traced and closed, with a one-line reason. This prevents the same false alarm from being re-raised later by someone reading the code fresh, and demonstrates rigor.
9. **Outstanding items for final sign-off** — a short numbered list of exactly what's still needed (a specific file, a specific dynamic test) before any remaining "Open" items can close.

## Mermaid diagram convention

Build the diagram from what was actually traced this engagement — not a generic Flutter-app-architecture template. Include:
- The real entrypoint sequence (startup, flavor/environment resolution, DI wiring, device-integrity check).
- Both/all real user-facing paths that matter to the findings (e.g. manual login vs. biometric quick-login, if both were traced).
- The actual function/service names, in plain-language framing (e.g. "App reads the SAVED password from the phone's storage" rather than a bare function name, but keep the function name available in the accompanying walkthrough paragraph or as a hover/label).

Use a consistent color convention, defined once at the bottom of the diagram:
```
classDef vuln fill:#ffd6d6,stroke:#c0392b,stroke-width:2px,color:#000
classDef weak fill:#fff3cd,stroke:#b7950b,stroke-width:2px,color:#000
classDef ok   fill:#d4efdf,stroke:#1e8449,stroke-width:2px,color:#000
```
Red = confirmed vulnerability sits here. Amber = open/needs verification. Green = confirmed positive control. Follow the diagram with a short plain-language walkthrough paragraph — the diagram supports the narrative, it doesn't replace it.

## Per-finding format

Match this shape (adapt the exact headers to the user's own office template if they have one, but keep the substance):

```
### N. <Finding Title> — <Severity>

**Description**
[Plain-language opening: what was found, in one or two sentences a
non-technical reader can follow.]

[Technical detail: the exact functions/classes involved, named explicitly,
with what each one does explained inline — not assuming the reader already
knows Dart or this codebase. Include the attacker-exploitation narrative here:
what would someone actually do with this, and what do they need (device
access? a rooted phone? nothing at all?) to do it.]

**Remediation**
[Concrete, specific fix — not "improve security." Name the actual mechanism
that should be used instead (e.g. "Android Keystore / iOS Secure Enclave" not
just "use secure storage").]

[image]  <- placeholder for the user to insert their own evidence
             (screenshots, terminal captures, code excerpts)
```

## Severity calibration

- **Don't finalize a severity until impact is traced to what it actually gates.** A boolean-authentication-bypass concern, for instance, is a very different severity depending on whether it gates a login convenience feature versus a money-transfer approval — hold it at "mechanism confirmed, impact pending" until you've traced the consumer, rather than guessing based on what would be scariest.
- **A finding whose only path to exploitation requires an already-compromised/rooted device is real but bounded** — say so explicitly ("this does not affect ordinary customers on unmodified phones") rather than either overstating it as remotely exploitable or omitting the caveat.
- **A finding that's exploitable purely offline (no live app, no device compromise beyond file access) is generally more severe than one requiring live runtime instrumentation** — reflect this in relative severity ranking when both exist in the same report, and call out explicitly which is which.
- **When a finding is specific to a non-production build flavor, say so and downgrade accordingly**, with a clear note on what would need to be confirmed in production for it to matter for real customers.
