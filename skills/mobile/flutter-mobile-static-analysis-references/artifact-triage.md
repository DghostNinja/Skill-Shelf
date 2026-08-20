# Artifact Triage

Blutter (the Dart AOT decompiler this skill assumes) typically produces:

- **`libapp.so`** — the raw ARM64/ARMv7 binary containing the Dart AOT snapshot. Rarely analyzed directly; usually you work from Blutter's decompiled output instead. If you do need to touch it directly, `objdump`/`readelf`/`nm` are commonly available in a sandboxed environment; there's no guarantee a full disassembler like radare2/IDA is present — check before planning work around it.
- **`pp.txt`** — a dump of the object pool: every constant, string, materialized object, and static-field reference the snapshot contains, each with its pool offset.
- **`objs.txt`** — a dump of heap-allocated Dart objects.
- **`asm/`** — a directory tree of per-class pseudocode files, mirroring the original app's `lib/` folder structure via `package:<app>/...` paths in each file's header comment. This is where actual function bodies and control flow live.
- Occasionally: `ida_script.py`, `frida_script.js`, or a functions/metadata JSON.

## What each artifact can and can't tell you

**`pp.txt` and `objs.txt` are excellent for cataloguing, poor for control flow.** Grepping these gives you every string, every class name, every materialized constant in the snapshot — but they don't show you which function reads which constant, or under what condition. A string sitting near other Remote-Config-looking parameter names is a strong *hint* it's part of a Remote Config defaults map — but only the `asm/` file for that class will show the actual code that builds and uses that map. Don't finalize a severity based on pool-dump proximity alone; use it to decide where to look next in `asm/`.

**`asm/` is where you confirm what pool evidence only suggests.** A class named `FakeXService` existing in the pool/heap dump proves the code shipped in the release binary. It does not by itself prove the fake version is ever selected at runtime — that requires finding and reading the actual dependency-injection/service-locator registration code in `asm/`.

## Building the initial map

Before chasing any single finding, produce:

1. **Package/feature inventory** — top-level folders under `asm/` mirroring the app's `lib/` structure, with file counts. This tells you the app's shape (how many features, what's named what) before you've read a single function body.

2. **A keyword sweep across security-relevant categories**, recording file path + one-line description of what each match appears to do (from naming alone, not yet from reading the body):
   - Authentication & session (auth, login, signin, signup, session, token)
   - Biometric & device security (biometric, local_auth, fingerprint, faceid)
   - Device integrity / root / jailbreak / emulator detection
   - Encryption & storage (encrypt, decrypt, crypto, cipher, secure_storage, shared_preferences, storage)
   - Networking & TLS (http, dio, interceptor, certificate, ssl, tls, override, socket)
   - Remote config & feature flags (remote_config, feature_flag, flavor, environment)
   - Platform channels / native bridges (method_channel, platform_channel)
   - WebView
   - Third-party fraud/risk SDKs
   - Dependency injection / service locator (locator, injector, get_it, service_locator, `registerLazySingleton`, `registerFor`)
   - App entrypoint / bootstrap (main, main_<flavor>, bootstrap, runApp)

3. **Direct grep sweeps for concrete artifacts** across `pp.txt`/`objs.txt`: `https?://` URLs, PEM headers (`-----BEGIN`), long base64-looking blobs, common secret-key-name patterns (`api_key`, `secret`, `password`, `token`), and — critically — the *context* immediately surrounding any hit (the lines before/after), since a scary-looking string's real meaning almost always depends on what's next to it (see `false-positive-patterns.md`).

## Primary mode: direct filesystem access (CLI)

This skill assumes you have direct shell access (`grep`, `find`, `read`/`cat`) to the tester's output_dir — this is the normal path. Do all of the above yourself; don't make the tester do work you can do directly, and don't write prompts for a separate agent when you can just read the files. Be liberal with exploratory greps here — cheap, fast, and you can always narrow further.

## Fallback mode: no direct file access

If you're working through an interface without direct access to the output_dir (e.g. the tester is working in their own separate IDE and can't practically paste the whole thing to you), write them prompts for their IDE's coding agent instead — see `references/ide-agent-prompts.md`. Keep these prompts narrow and specific, since each round-trip costs the tester time, unlike your own exploratory greps.
