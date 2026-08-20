---
name: Bug Bounty Recon Playbook
slug: bug-bounty-recon
description: Automated recon workflow for bug bounty targets — subdomain discovery, live probing, and historic URL harvesting.
category: Security
version: 1.0.0
date: 2026-08-20
tags: [recon, bug-bounty, subdomains, osint, enumeration]
related: [web-pentesting, api-security-testing, web-exploitation-reference]
---
# Bug Bounty Recon Playbook

A repeatable, tool-based recon workflow for expanding a bug bounty target's attack surface.
Run this before deeper testing. **Authorized targets only.**

---

## 1. The Pipeline

```
1. SUBDOMAIN ENUMERATION  -> subs.txt
2. LIVE PROBING            -> live-sub.txt (titles, status codes, tech)
3. HISTORIC URL HARVESTING -> way.txt (Wayback + GAU)
4. HISTORIC LIVE PROBING   -> live-history.txt
5. PARAMETER DISCOVERY     -> params.txt (ParamSpider)
6. THIRD-PARTY EXTRACTION  -> from harvested URLs/JS
```

---

## 2. Automated Script

Reference workflow (tools: `subfinder`, `httpx`, `waybackurls`, `gau`, `paramspider`):

```bash
read -p "Enter the target domain (e.g., example.com): " domain

# Validate: only domain or URL starting with http(s)
if ! [[ "$domain" =~ ^(https?://)?[a-zA-Z0-9.-]+\.[a-z]{2,}$ ]]; then
    echo "[!] Invalid domain format."
    exit 1
fi

# Strip protocol, keep bare domain
clean_domain=$(echo "$domain" | sed -E 's~https?://~~' | cut -d/ -f1)

mkdir -p recon && cd recon || exit

echo "[*] Running Subfinder..."
subfinder -d "$clean_domain" -silent | sort -u > subs.txt

echo "$clean_domain" >> subs.txt
sort -u subs.txt -o subs.txt
echo "[+] Total domains to probe: $(wc -l < subs.txt)"

echo "[*] Probing with httpx..."
cat subs.txt | httpx -silent -title -status-code -tech-detect > live-sub.txt

echo "[*] Running Waybackurls..."
cat subs.txt | waybackurls | sort -u > wayback.tmp

echo "[*] Running GAU..."
cat subs.txt | gau | sort -u > gau.tmp

cat wayback.tmp gau.tmp | sort -u > way.txt
rm wayback.tmp gau.tmp

echo "[*] Probing historic URLs with httpx..."
cat way.txt | httpx -silent -title -status-code -tech-detect > live-history.txt

echo "[*] Running ParamSpider..."
paramspider -d "$clean_domain" > params.txt
```

---

## 3. What Each Stage Buys You

- **Subfinder** — enumerates subdomains from passive sources (certificate transparency,
  DNS, search engines).
- **httpx (`-title -status-code -tech-detect`)** — filters to live hosts and fingerprints
  tech, so you never test dead domains.
- **waybackurls + gau** — harvest every historic URL ever crawled for the scope. This is
  where old endpoints, leaked params, and forgotten functionality hide.
- **httpx on historic URLs** — finds which old paths still resolve live.
- **ParamSpider** — mines those URLs for parameters worth fuzzing later.

---

## 4. Post-Processing Gems

After harvesting `way.txt`, extract:

- **URLs containing parameters** — feed them to ParamSpider or fuzz them directly:

```bash
cat way.txt | grep -E "\?.*=" | sort -u > urls-with-params.txt
```

- **Interesting file types** — `php`, `asp`, `aspx`, `json`, `js`, `xml`, `zip`, `.bak`:

```bash
cat way.txt | grep -E "\.(php|asp|aspx|jsp|json|js|xml|zip|bak|sql|env)$" | sort -u
```

- **JS files** — mine them for endpoints, API keys, and third-party domains:

```bash
cat way.txt | grep -E "\.js(\?|$)" | sort -u > js-files.txt
```

- **Third-party / internal domains** — pull domains mentioned in harvested content:

```bash
cat way.txt | grep -oE "https?://[a-zA-Z0-9.-]+" | sort -u
```

- **Admin/panel hints** — look for `admin`, `portal`, `api`, `staging`, `dev`, `internal`
  subdomains and paths; these are prime targets.

---

## 5. Prioritize Before You Exploit

- Sort live hosts by tech and by what's *least expected* (old stacks, staging boxes,
  internal-looking hosts) — they usually have the weakest controls.
- Keep every output file; later skills (`web-exploitation-reference`,
  `api-security-testing`) consume `live-sub.txt`, `way.txt`, and `params.txt` directly.
- Document scope boundaries before touching anything in-scope.