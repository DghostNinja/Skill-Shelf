# Universal Review Checklist

This is the systematic, app-agnostic checklist that drives the review. It's organized around the OWASP MASVS (Mobile Application Security Verification Standard) categories, since that's a recognized, comprehensive framework that applies regardless of what any given app happens to call its classes. For each category: what to search for (in terms of keyword *families*, not exact names — every app's naming convention differs), how to move from "found a string" to "confirmed," and what a clean disposition looks like.

**Work every category.** Don't consider the static analysis phase done until each one below has an explicit disposition: Confirmed vulnerable / Confirmed safe / Reported but unconfirmed / Not applicable.

---

## MASVS-STORAGE — Data storage & privacy

**Search for:** `shared_preferences`, `SharedPreferences`, `secure_storage`, `Keystore`, `Keychain`, `storage`, `encrypt`, `decrypt`, `cache`, `database`, `sqlite`, `hive`, `isar`, `log(`, `print(`, `debugPrint`, `clipboard`, `screenshot`, `FLAG_SECURE`.

**Trace to confirm:**
- What actually gets persisted through the plain (non-hardware-backed) storage mechanism vs. a properly secured one — trace field names/keys, not just plugin presence.
- If a custom encryption wrapper exists around local storage: trace the *full* key-derivation chain (see MASVS-CRYPTO below) — a "secure storage" wrapper is only as strong as its key source.
- Whether any device-binding value used in a storage key is itself stored in cleartext in reachable local storage (self-defeating key derivation is a recurring, high-value finding).
- Whether logging statements include tokens, credentials, PII, or full request/response bodies, and whether that logging is confirmed gated out of release builds.

**Clean disposition looks like:** sensitive values (credentials, tokens, PINs) go through OS-level hardware-backed storage (Android Keystore / iOS Keychain or Secure Enclave), not a software-only scheme reconstructible from data available on the same device.

---

## MASVS-CRYPTO — Cryptography

**Search for:** `encrypt`, `decrypt`, `cipher`, `AES`, `RSA`, `MD5`, `SHA`, `DES`, `RC4`, `ECB`, `CBC`, `IV`, `nonce`, `salt`, `Random(`, `Random.secure(`, `key`, `derive`, `hmac`, `pbkdf2`, `scrypt`, `argon2`.

**Trace to confirm:**
- Every place a key or IV originates: hardcoded literal, remote-config value, or derived — and if derived, from what inputs (trace the full chain to its root; a "device-bound" key derived from a self-generated, locally-stored UUID is not meaningfully different from a hardcoded key for an attacker with file access).
- Whether `Random()` (not cryptographically secure) is used anywhere security-relevant, vs. `Random.secure()` or an explicit CSPRNG.
- Whether IVs/nonces are generated fresh per operation or reused/hardcoded.
- Whether legacy algorithm strings (MD5/SHA-1/DES/RC4/ECB) found in a bundled crypto library are actually called by app code, or are just the library's own internal algorithm registry (see `false-positive-patterns.md` — this is one of the most common false positives in this entire checklist).
- Key-derivation work factor: a KDF with no iteration count/work factor (plain single or chained MD5/SHA hashing) offers effectively no brute-force resistance if the input is ever weak or exposed, even if the overall scheme looks superficially reasonable.

**Clean disposition looks like:** modern algorithms (AES-GCM or properly-IV'd AES-CBC, RSA-OAEP, SHA-256+), fresh CSPRNG-sourced IVs/nonces per operation, keys either hardware-backed or derived via a real KDF from inputs that aren't co-located with the data they protect.

---

## MASVS-AUTH — Authentication & session management

**Search for:** `auth`, `login`, `signin`, `signup`, `session`, `token`, `biometric`, `local_auth`, `fingerprint`, `faceid`, `LocalAuthentication`, `jwt`, `refresh_token`, `password`, `pin`.

**Trace to confirm:**
- Biometric flow: does a successful biometric check return a plain boolean that gates a code path, or does it unlock a key stored in hardware (Android `BiometricPrompt`+`CryptoObject`, iOS `LAContext` with Secure-Enclave-backed keys)? Trace what the boolean actually triggers downstream — a convenience-login shortcut vs. a settings toggle vs. a transaction-approval gate all carry very different severity, and this must be traced per call site, not assumed from one.
- Whether biometric quick-login decrypts and resubmits a real stored credential (connects directly to MASVS-STORAGE/CRYPTO findings above) — if so, the biometric boolean's real-world severity is inherited from the storage/crypto finding it unlocks.
- JWT handling (if present): is a signature actually verified, or just the payload decoded and trusted? Is `alg: none` rejected? Are sensitive claims readable in an unencrypted JWS payload?
- Session/token storage and rotation — connects to MASVS-STORAGE.
- Any client-side-only authorization logic (hardcoded role checks, an `isAdmin`-style flag trusted from local state rather than re-verified server-side).

**Clean disposition looks like:** biometric success is hardware-key-gated, not a bare boolean; tokens are properly verified and securely stored; authorization decisions are re-checked server-side regardless of what the client believes about its own state.

---

## MASVS-NETWORK — Network communication

**Search for:** `http`, `https://`, `dio`, `HttpClient`, `HttpOverrides`, `badCertificateCallback`, `SecurityContext`, `certificate`, `pinning`, `ssl`, `tls`, `interceptor`, `socket`.

**Trace to confirm:**
- Whether certificate/public-key pinning is actually implemented in application code (not just a function *named* for it — confirm the function body actually does comparison/validation work) — and if it appears absent from the Dart layer, whether native-layer pinning (Android `network_security_config.xml`, iOS ATS/TrustKit) might be the real enforcement point instead; this requires looking outside the Dart snapshot entirely, and dynamic testing (does traffic interception actually fail?) is often the fastest way to settle which is true.
- Any custom `HttpOverrides` subclass: what does it actually change about client behavior? Don't assume a name like `*StagingOverrides` implies a certificate bypass — trace the body; it may be unrelated (e.g. proxy handling for a test environment).
- Cleartext (`http://` or unencrypted `ws://`) endpoints, especially any handling sensitive data.
- Whether any endpoint is a non-production/staging/POC address — confirm against the actual build/flavor in scope (MASVS-CODE below) before treating this as a finding rather than expected behavior for a non-prod build.

**Clean disposition looks like:** all sensitive traffic over TLS, real pinning enforcement confirmed to exist and be reachable in the production build specifically (not just claimed by a function name), no stray non-production endpoints in the production build.

---

## MASVS-PLATFORM — Platform interaction

**Search for:** `MethodChannel`, `EventChannel`, `platform_channel`, `webview`, `WebView`, `javascriptMode`, `allowFileAccess`, `DynamicLibrary.open`, `Process.run`, `Process.start`, `deep link`, `intent`, `url_launcher`.

**Trace to confirm:**
- Full inventory of platform-channel names and their message schemas — for each, whether input received from the native side (or passed to it) is validated before use, especially anything reaching file I/O, process execution, or a WebView/URL loader.
- WebView configuration: JavaScript enabled, file access, mixed content — and confirm the flags found actually belong to the app's own embedded WebView, not an unrelated plugin's in-app-browser view (a common false positive — see `false-positive-patterns.md`).
- Deep link / intent handling: can an externally-supplied link influence navigation to a sensitive screen or trigger an action without proper validation?

**Clean disposition looks like:** every platform-channel boundary validates its input regardless of which side originated it; WebView configuration is locked down unless a specific feature genuinely requires otherwise; deep links are validated before acting on them.

---

## MASVS-CODE — Code quality & build configuration

**Search for:** presence/absence of obfuscated symbol names across the whole `asm/` tree, `assert(`, debug-only strings, multiple `main_*.dart`-style entrypoints, flavor/environment enum values, third-party library version strings.

**Trace to confirm:**
- Is the app obfuscated (`--obfuscate --split-debug-info`)? A fully readable class/method namespace across the app is itself a finding — it's a force multiplier for every other finding in this checklist, and worth flagging on its own regardless of what else is found.
- Which build/flavor does *this specific* decompilation represent? (Critical to establish early — see SKILL.md Step 2. Everything else in this checklist should be read through this lens.)
- Debug/test scaffolding: assertions, verbose logging, test-only endpoints or flags that shouldn't ship in a release build.
- Bundled third-party library versions, where visible in strings/paths — flag anything clearly outdated enough to have known CVEs, though confirming this generally needs a version string plus external lookup, not pure static reasoning.

**Clean disposition looks like:** obfuscation enabled, no stray debug/test code paths reachable in the build meant for real users, dependencies reasonably current.

---

## MASVS-RESILIENCE — Anti-tampering & anti-reversing

**Search for:** `root`, `jailbreak`, `emulator`, `integrity`, `frida`, `debugger`, `SafetyNet`, `PlayIntegrity`, `attestation`, `Fake` (or other mock-implementation naming conventions), `locator`, `injector`, `get_it`, `registerLazySingleton`, `registerFor`, `environment`.

**Trace to confirm:**
- Root/jailbreak/emulator detection: present or absent, and — critically — client-side-only vs. backed by a server-verified attestation (Play Integrity API / App Attest / DeviceCheck).
- Any `Fake*`/mock implementations of real services shipped in the release snapshot: find and trace the actual dependency-injection/service-locator registration logic to determine what environment-string condition (if any) gates them, and what the app's actual entrypoint(s) set that string to for each build flavor. Presence in the binary is not proof of reachability — this must be traced, not assumed either way (see `false-positive-patterns.md`).
- Whether the environment/flavor-selection logic itself is a fixed, compile-time value, or something that could be influenced at runtime (a remote flag, a hidden menu, user input) — this determines whether the mock-service question is closed for good or worth re-checking under different conditions.

**Clean disposition looks like:** device-integrity checks backed server-side; any mock/test implementations cleanly and permanently excluded from (or provably unreachable in) the build that ships to real users.

---

## Cross-cutting reminders

- Several of the highest-value findings in past engagements came from **connecting** categories, not from any single one in isolation — e.g. a MASVS-AUTH biometric-boolean finding whose real severity only becomes clear once traced into the MASVS-STORAGE/CRYPTO finding it unlocks. Don't treat categories as fully independent; note cross-references as you find them.
- Some checks in this list (obfuscation, native `HttpOverrides`/pinning config, `AndroidManifest.xml` flags like `allowBackup`, native root-detection libraries) partly or fully require looking **outside** the Dart AOT snapshot — flag these explicitly as needing a different artifact (the APK/IPA's native resources, a manifest, a separate native binary) rather than silently skipping them.
- When a category can't be fully resolved from static evidence alone, the right disposition is "Reported but unconfirmed — needs [specific artifact / specific dynamic test]," not silence and not a guess.
