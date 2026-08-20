# Getting a Blutter Output Directory

If the tester doesn't already have a Blutter decompilation, walk them through producing one. Blutter (https://github.com/worawit/blutter) is an open-source Dart AOT snapshot decompiler purpose-built for this — it's the standard tool this skill assumes, and its output shape (`pp.txt`, `objs.txt`, an `asm/` directory) is what the rest of this skill expects.

**Before giving exact commands, check whether you have live internet/search access in this session.** Blutter's exact setup steps, dependencies, and supported Dart/Flutter SDK version matrix change over time and are version-sensitive — a Dart AOT snapshot decompiles correctly only when Blutter's bundled type/field information matches the Dart SDK version the target app was built with. If you can search or fetch the project's current README, do that first and follow what it actually says rather than relying purely on the general steps below, which may drift out of date.

## General shape of the process (verify specifics against the tool's current docs)

1. **Prerequisites:** Python 3, `git`, and enough disk space for the target app's assets. Blutter itself typically vendors or fetches Dart SDK build artifacts matching common Flutter versions — the setup step usually needs to know (or detect) which Flutter/Dart version built the target app, since the decompiler's accuracy depends on matching internal type layouts to the right SDK version.

2. **Get the target app's raw materials.** For Android: extract the APK (a renamed `.zip`) and locate `lib/<abi>/libapp.so` (pick the ABI matching the test device, e.g. `arm64-v8a`) plus the Flutter assets bundle (`assets/flutter_assets/`, which can help Blutter identify the Flutter/Dart version). For iOS: the equivalent is inside the `.ipa`'s embedded `Frameworks/App.framework/App` binary alongside `flutter_assets`.

3. **Clone and set up Blutter** per its own README (`git clone` the repository, then follow its setup script/instructions — this typically involves fetching or building matching Dart SDK snapshot metadata for the target's Flutter version).

4. **Run Blutter against the extracted binary**, pointing it at the `libapp.so` (or iOS equivalent) and the Flutter assets, with an output directory as the destination.

5. **Verify the output.** A successful run should produce, inside the output directory:
   - `pp.txt` — object pool dump
   - `objs.txt` — heap object dump
   - `asm/` — a directory tree of per-class pseudocode files, mirroring the app's `lib/` structure
   - Possibly `ida_script.py`, `frida_script.js`, or similar companion scripts

   If any of these are missing or the `asm/` tree looks mostly empty, the SDK-version match was likely wrong — check Blutter's own troubleshooting guidance for version mismatches before proceeding.

## Once the output_dir exists

Go back to Step 0 in `SKILL.md` — verify the directory's contents directly (`ls`, spot-check that `pp.txt`/`objs.txt`/`asm/` are non-trivial in size), confirm authorization if not already established, and proceed into the review.

## If the tester hits errors getting Blutter running

This is normal — SDK-version mismatches and dependency issues are the most common snag. Help debug based on the actual error message rather than guessing; if you have search access, look up the specific error against Blutter's issue tracker/README rather than assuming a fix.
