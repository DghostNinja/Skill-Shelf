---
name: Secure Code Review
slug: secure-code-review
description: Remediation-focused review patterns for Python web apps — SQLi, path traversal, RCE, XXE, and XSS with concrete fixes.
category: Security
version: 1.0.0
date: 2026-08-20
tags: [code-review, sast, remediation, python, owasp]
related: [sast-ci-scanning, web-pentesting, api-security-testing]
---
# Secure Code Review

Remediation-focused patterns for reviewing Python (and similar) web application code.
When a review finds a vulnerability, apply the matching fix below. These mirror the same
bugs attackers hunt (see the web-exploitation-reference skill).

---

## 1. SQL Injection

**Problem:** user input is concatenated into a SQL string and interpreted as code.

**Fix:** use a parameterized query or a parameterized variable so input is data, not SQL:

```python
# Bad
cur.execute("SELECT * FROM users WHERE name = '" + name + "'")

# Good
cur.execute("SELECT * FROM users WHERE name = %s", (name,))
```

Use an ORM's parameter binding (e.g. SQLAlchemy text with bound params) and never build
dynamic SQL from raw input.

---

## 2. Path Traversal

**Problem:** user-controlled path reaches file operations and `../` escapes the web root.

**Fix:** strip traversal sequences and ensure the resolved path stays inside an allowed
directory:

```python
import os

BASE_DIR = "/var/www/uploads"

def safe_path(user_input):
    filename = os.path.basename(user_input)          # strip traversal sequences
    full = os.path.realpath(os.path.join(BASE_DIR, filename))
    if os.path.commonpath([BASE_DIR, full]) != BASE_DIR:
        raise ValueError("Path escapes allowed directory")
    return full
```

- `os.path.basename` strips traversal sequences from the filename/path.
- `os.path.commonpath` (or `commonprefix`) ensures the file stays within the current
  directory scope.

---

## 3. Remote Code Execution (RCE)

**Problem:** attacker input reaches subprocess/system calls, often via command injection.

**Fix:** regex-validate the input (e.g. only accept valid hostnames and IP addresses) and
use `subprocess.check_output` with an argument list instead of a shell string:

```python
import re, subprocess

HOSTNAME_RE = re.compile(r"^[a-zA-Z0-9.-]+$")
IP_RE = re.compile(r"^(\d{1,3}\.){3}\d{1,3}$")

def run_check(host):
    if not (HOSTNAME_RE.match(host) or IP_RE.match(host)):
        raise ValueError("Invalid host")
    return subprocess.check_output(["/usr/bin/ping", "-c", "1", host])
```

- Never pass user input through a shell string (`subprocess.call(cmd, shell=True)`).
- Pass arguments as a list so the OS never interprets them as shell syntax.

---

## 4. XML External Entity (XXE)

**Problem:** the parser resolves external entities, letting an attacker read local files or
hit internal URLs via crafted XML.

**Fix:** use a secure parser and disable entity resolution:

```python
import defusedxml.ElementTree as ET

# defusedxml.ElementTree safely parses XML
tree = ET.parse("input.xml")
```

- Check which modules are used (e.g. `lxml`, `xml.etree.ElementTree`).
- Validate user-supplied entities.
- Use `defusedxml.ElementTree` to pass XML data safely.
- If you must use another parser, set `resolve_entities=False` (e.g. `lxml`:
  `parser = etree.XMLParser(resolve_entities=False)`).

---

## 5. XSS

**Problem:** unescaped user input is rendered back into HTML and executed.

**Fix:** sanitize/escape all user input at the point of output. In Flask/Jinja2 this is
automatic, but for manual string building use the `markupsafe` library:

```python
from markupsafe import escape

output = "<p>" + escape(user_input) + "</p>"
```

- Escape at output time (context-aware: HTML, attribute, JS).
- Never trust sanitization on input alone; output-encoding is the reliable control.

---

## 6. Secrets & Hardcoded Credentials

**Problem:** API keys, tokens, and passwords committed in source.

**Fix:** move secrets to environment variables or a secret store and inject via
configuration:

```python
import os
API_KEY = os.environ["API_KEY"]
```

- If a secret is already committed, rotate it and remove it from history (see the
  sast-ci-scanning skill for automated detection with Gitleaks).

---

## 7. Review Workflow

1. Trace every input from **entry point to sink** (DB, filesystem, shell, HTTP fetch, HTML).
2. For each sink, identify the class of bug and apply the matching pattern above.
3. Confirm the fix with the same input that triggered the bug.
4. Report as **root cause -> impact -> exploit -> fix** with a repro.

Automate the first pass with the semgrep rules in the **sast-ci-scanning** skill so human
review focuses on logic bugs and business logic.