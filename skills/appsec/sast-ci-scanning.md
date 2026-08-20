---
name: SAST & CI Security Scanning
slug: sast-ci-scanning
description: Build a CI security pipeline — Semgrep (incl. custom taint rules), Gitleaks, Trivy, and Checkov, with severity mapping and reports.
category: Security
version: 1.0.0
date: 2026-08-20
tags: [ci, sast, semgrep, gitleaks, trivy, checkov, devsecops]
related: [secure-code-review, bug-bounty-recon]
---
# SAST & CI Security Scanning

A reference for wiring automated security scanning into CI so vulnerabilities and secrets
are caught before merge. Built from a real `security-scan.yml` pipeline plus custom Semgrep
rules. Apply to your own repos and projects.

---

## 1. The Pipeline

Layered checks run in CI on every push/PR:

```
1. SEMGREP    -> static analysis + custom taint rules (SAST)
2. GITLEAKS   -> secrets/API-key detection
3. TRIVY      -> container image + IaC vulnerability scan
4. CHECKOV    -> Terraform/cloud misconfiguration scan
5. REPORT     -> aggregate findings, map severity, write artifact
6. SYNC       -> open issues / comment on PR from findings
```

---

## 2. Tool Roles

| Tool | Catches | Blocking policy |
|------|---------|-----------------|
| **Semgrep** | Injection, path traversal, SSRF, weak crypto, hardcoded secrets, unsafe sinks | High/Critical errors fail the build |
| **Gitleaks** | Committed API keys, tokens, passwords, private keys | Any secret fails the build |
| **Trivy** | Known CVEs in container images and dependencies | Critical/high in production images |
| **Checkov** | Terraform/cloud misconfigs (public buckets, weak IAM, open ports) | High/critical findings |

---

## 3. Semgrep Base Rules

Keep an allowlist-free baseline enabled for the whole repo:

- **Injection sinks:** command execution, SQL, template/format-string injection.
- **Path traversal:** request-controlled data reaching file read/write/delete.
- **SSRF:** request-controlled data reaching outbound HTTP.
- **Weak crypto:** `MD5`/`SHA1` on passwords or pins.
- **Hardcoded secrets:** string literals that look like keys/tokens assigned to
  `password`/`secret`/`apiKey`-style variables.

---

## 4. Custom Semgrep Rules (taint analysis)

Custom rules use `mode: taint` to trace **sources** (request data) to **sinks**
(dangerous operations), with **sanitizers** that legitimately clean the data.

### 4.1 Weak password hashing (C#)

Flag `MD5`/`SHA1` hashing of password- or pin-named data; recommend PBKDF2 / BCrypt /
Argon2 with a per-user salt:

```yaml
rules:
  - id: custom-csharp-insecure-crypto-password
    languages: [csharp]
    severity: ERROR
    message: >-
      A weak hash algorithm (MD5 or SHA1) is used on likely password data. Use a
      dedicated password hashing scheme (PBKDF2 / Rfc2898DeriveBytes, BCrypt, or
      Argon2) with a per-user salt. SHA256 alone is not suitable for password storage.
    pattern-either:
      - patterns:
          - pattern-inside: |
              using (MD5 $H = MD5.Create())
              { ... }
          - pattern: $H.ComputeHash($DATA)
          - metavariable-regex:
              metavariable: $DATA
              regex: (?i).*password.*
      - patterns:
          - pattern-inside: |
              using (SHA1 $H = SHA1.Create())
              { ... }
          - pattern: $H.ComputeHash($DATA)
          - metavariable-regex:
              metavariable: $DATA
              regex: (?i).*password.*
```

### 4.2 Hardcoded secret (C#)

Flag string literals of 16+ chars assigned to secret-named variables, ignoring SQL:

```yaml
rules:
  - id: custom-csharp-hardcoded-secret
    languages: [csharp]
    severity: ERROR
    message: >-
      A hardcoded secret or credential string literal is used. Move secrets to
      environment variables / a secret store.
    patterns:
      - pattern-either:
          - pattern: |
              var $X = "$SECRET";
          - pattern: |
              string $X = "$SECRET";
      - metavariable-regex:
          metavariable: $X
          regex: (?i).*(api[_-]?key|secret|password|passwd|token|credential).*
      - metavariable-regex:
          metavariable: $SECRET
          regex: (?i).*[a-z0-9]{16,}.*
      - pattern-not-regex: (?is).*(sp_|SELECT |INSERT |UPDATE |DELETE FROM|CREATE |ALTER ).*
```

### 4.3 Path traversal taint (C#)

Sources: request data (`[FromBody]`, `[FromQuery]`, `[FromRoute]`, `[FromForm]`,
`Request.Query/Form/Headers/RouteValues`). Sanitizers: `Path.GetFileName`,
`Path.GetFullPath`, `.StartsWith(dir)`. Sinks: `File.WriteAllText(Async)`, `File.Create`,
`File.ReadAllText`, `File.Delete`, `FileInfo.Delete`.

### 4.4 SSRF taint (C#)

Same sources; sinks: `HttpClient().GetAsync/PostAsync/Send`, `WebRequest.Create`,
`RestClient`, `new Uri(base + url)`. Sanitizers: validated `Uri.TryCreate`, `new Uri`,
`.StartsWith("https://")`. Message should demand a host allowlist and rejection of IP
literals and non-HTTPS schemes.

### 4.5 Command injection taint (C#)

Sources: request data. Sinks: `Process.Start`, `Process.StartInfo.Arguments`,
`new Process().StartInfo.Arguments`. Sanitizer: `Path.GetFileName`. Message should demand
separate argument lists (never string-interpolated shell) plus a strict allowlist.

---

## 5. Severity Mapping & Build Policy

- `CRITICAL` / `HIGH` -> fail the build (or merge-blocking check).
- `MEDIUM` -> surface as PR comments / warnings; track in an issue.
- `LOW` / informational -> dedupe and aggregate into the periodic report.

Policy decision table:

| Severity | SAST finding | Secret | Container vuln | IaC misconfig |
|----------|-------------|--------|----------------|---------------|
| Critical | block | block | block (prod) | block |
| High     | block | block | block (prod) | block |
| Medium   | warn | block | warn | warn |
| Low      | report | block | report | report |

---

## 6. Secrets Baseline (Gitleaks)

- **Block on any finding** — one leaked key can be catastrophic.
- Scan full git history, not just the working tree, so old commits are covered.
- Extend the default regex list with your own service patterns.
- On any hit: **rotate the secret**, remove it from history, then add it to the allowlist
  only if it is a known test fixture.

---

## 7. Report & Action

- Emit a single machine-readable report artifact (JSON/SARIF) per run for audits.
- Open issues or comment on the PR with **file, line, rule, and a suggested fix**.
- Track findings-to-close so the same bug cannot silently reappear.

---

## 8. Running Locally

```bash
# Semgrep with base + custom rules
semgrep scan --config security.yml --config .semgrep/custom/ ./src

# Secrets
gitleaks detect --source . --report-path gitleaks-report.json

# Container / IaC
trivy fs --exit-code 1 --severity CRITICAL,HIGH .
checkov -d ./terraform --download-external-modules false
```

Wire the same commands into CI and treat the outputs as merge gates.