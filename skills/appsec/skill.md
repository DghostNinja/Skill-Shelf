---
name: Application Security Review
slug: appsec
description: Structured review of web applications for security flaws.
category: Security
version: 1.1.0
date: 2026-07-18
tags: [appsec, owasp, review, web]
related: [web-pentesting, android-pentesting]
---

# Application Security Review

A structured, repeatable process for security-reviewing a web application before launch. Output is a prioritized list of findings with evidence and remediation guidance.

## Phase 1 — Threat Modeling

1. **Inventory the surface** — every URL, API endpoint, and data flow.
2. **Identify assets** — PII, payment data, credentials, secrets.
3. **Define trust boundaries** — user → edge → app → db, and third parties.
4. **Enumerate threat scenarios** using STRIDE per component.

```yaml
component: checkout-service
threats:
  - spoofing:    forged order webhook
  - tampering:   price modified in request body
  - repudiation: no audit log on refund
  - information_disclosure: verbose stack traces in /errors
  - dos: unauthenticated coupon endpoint
  - elevation: admin role assigned via client-supplied value
```

## Phase 2 — OWASP Top 10 Checklist

Review the application against the current Top 10. The highest-value checks:

| # | Area | Typical finding | How to test |
| - | ---- | --------------- | ----------- |
| 1 | Broken access control | Missing `authorization` check on object IDs | Change IDs in requests to other users' resources |
| 2 | Cryptographic failures | Data in transit over HTTP | Scan for mixed content and weak TLS |
| 3 | Injection | SQL / NoSQL / command injection | Submit `' OR 1=1 --` and observe errors |
| 4 | Insecure design | Trusting client-supplied role/price | Inspect server-side validation |
| 5 | Security misconfiguration | Debug mode, default creds, exposed metadata | Enumerate headers and error pages |
| 6 | Vulnerable components | Outdated libraries | Run dependency scanners (`npm audit`, `osv-scanner`) |
| 7 | Identification failures | No rate limiting on login | Attempt rapid failed logins |
| 8 | Integrity failures | Unsigned JWTs accepted | Forge a token with altered claims |
| 9 | Logging failures | No audit trail for sensitive ops | Trigger a payment, check logs |
| 10 | SSRF | Server fetches user-supplied URLs | Point fetcher at `http://169.254.169.254/` |

## Phase 3 — Manual Verification

Automated scanners miss logic flaws. For each suspicious finding:

1. Confirm the issue by hand with a minimal reproduction request.
2. Check whether it is reachable without authentication (higher risk).
3. Assess blast radius — what can an attacker actually do?

```bash
# Example: check for open redirect
curl -sI "https://app.example.com/login?next=https://evil.example"
```

## Phase 4 — Remediation Guidance

Each finding must ship with a fix:

- **Input**: validate on the server, whitelist-first.
- **Output**: context-aware encoding (HTML, JS, JSON, SQL).
- **Access**: enforce authorization server-side on every object.
- **Secrets**: move to a secret manager; rotate any exposed value now.

```javascript
// Before (unsafe)
const sql = `SELECT * FROM users WHERE email = '${email}'`;

// After (parameterized)
const rows = await db.query("SELECT * FROM users WHERE email = $1", [email]);
```

## Phase 5 — Report

Deliver findings ordered by **risk = likelihood × impact**:

> Every finding includes a title, severity, location, proof of concept, and a recommended fix. No finding is reported without evidence.

---

*Metadata lives in `/index.json`. Raw file: `skills/appsec/skill.md`.*