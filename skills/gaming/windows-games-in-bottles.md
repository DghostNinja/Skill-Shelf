---
name: Windows Games in Bottles
slug: windows-games-in-bottles
description: Noob-proof process for installing and running old Windows games (retail discs/ISOs) in Flatpak Bottles on Linux, with a worked GTA San Andreas v1.0 example.
category: Gaming
version: 1.0.0
date: 2026-08-24
tags: [linux, bottles, wine, flatpak, gaming, iso]
---

# Windows Games in Bottles

A repeatable, noob-proof process for installing old Windows games from retail discs or ISO images into [Bottles](https://usebottles.com) (Flatpak) on Linux. Uses GTA San Andreas retail DVD v1.0 as the worked example — every step generalizes to other games of that era.

## The Setup

| Component | What was used |
|---|---|
| OS | Linux |
| Bottles | Flatpak (`com.usebottles.bottles`) |
| Runner | `soda-11.0-5` (Wine-based runner shipped with Bottles) |
| Game source | Retail DVD v1.0 ISO, loop-mounted by the OS |

## 1. The Three Problems You Will Hit

Every old-disc game in Flatpak Bottles hits some combination of these:

### Problem A — Installer invisible in Bottles
Flatpak apps are sandboxed. Bottles only sees its own data dirs — **not** `/media` where mounted ISOs land.

**Fix:** grant read-only access to the mount, then fully restart Bottles:
```bash
flatpak override --user --filesystem=/media/ipsalmy/GTA_SAN_ANDREAS:ro com.usebottles.bottles
flatpak kill com.usebottles.bottles   # permissions apply on next launch
```
Find your mount path with `findmnt`. Generic form:
```bash
flatpak override --user --filesystem=/media:ro com.usebottles.bottles
```

### Problem B — "Run EXE inside prefix" does nothing
Bottles' GUI launcher shows "Launching..." then dies silently for many legacy installers (InstallShield-era).

**Fix:** skip the button entirely. Launch installers/executables through the bottle's Wine from a terminal (see section 3). This is the reliable path for this class of game.

### Problem C — "Please insert CD/DVD"
Retail executables carry disc-check DRM (SafeDisc era). The check reads raw disc-level data (volume serials, sector tricks) that a loop-mounted ISO **cannot fake**, even when mapped as drive D:/E:. No configuration fixes this.

**Fix:** replace the game executable with a patched/no-CD version of your own choosing (keep a backup of the original), or buy the digital re-release which has none of these problems.

## 2. Create the Bottle

1. Open Bottles → **+**
2. Name it after the game (e.g. `GTASA`)
3. Environment: **Gaming**
4. Wait — this auto-installs DXVK, d3dx9, core fonts, etc.

One bottle per game keeps runners/DLL overrides isolated so fixing one title never breaks another.

Config lives at:
```text
~/.var/app/com.usebottles.bottles/data/bottles/bottles/<NAME>/bottle.yml
```

## 3. Install via Terminal (the reliable way)

Template — fill in YOURUSER, BOTTLE_NAME, RUNNER_NAME, paths:

```bash
nohup flatpak run --command=sh com.usebottles.bottles -c '
export WINEPREFIX="/home/YOURUSER/.var/app/com.usebottles.bottles/data/bottles/bottles/BOTTLE_NAME";
cd /path/to/mounted/disc;
"/home/YOURUSER/.var/app/com.usebottles.bottles/data/bottles/runners/RUNNER_NAME/bin/wine" setup.exe
' > /tmp/install.log 2>&1 &
```

Notes:

- `nohup ... &` backgrounds it; closing the terminal won't kill the installer
- Errors land in `/tmp/install.log` instead of vanishing
- List available runners: `ls ~/.var/app/com.usebottles.bottles/data/bottles/runners/`
- If the installer offers bundled DirectX/C++ redists → **cancel/skip** (old versions hang under Wine; DXVK already covers graphics)
- Prefer short install paths like `C:\Games\GTASA`; avoid `Program Files` where the installer allows it

## 4. Map Disc Images as Drive Letters (optional)

Wine usually auto-maps mounted media (ours appeared as E:). To force one as D::
```bash
ln -sfn /path/to/mounted/iso \
  ~/.var/app/com.usebottles.bottles/data/bottles/bottles/BOTTLE_NAME/dosdevices/d:
```
Useful for games referencing CD paths at runtime. Does **not** bypass disc-check DRM.

## 5. Swap Patched Executables Safely

Install folder pattern:
```text
.../data/bottles/bottles/<NAME>/drive_c/<install path inside Windows>/
```

Backup once, then swap:
```bash
cd "<install folder>"
cp -n game.exe game.exe.orig          # backup, never overwrites
cp /path/to/patched/GAME.EXE game.exe
chmod +x game.exe
```

Verify sizes before/after with `ls -la game*` — e.g. SA retail v1.0 US exe is 8,712,192 bytes vs the known patched unpacked exe at 14,383,616 bytes.

## 6. Launch the Game

Same terminal pattern as installing, but target the installed exe and `cd` into the game folder first:

```bash
nohup flatpak run --command=sh com.usebottles.bottles -c '
export WINEPREFIX="/home/YOURUSER/.var/app/com.usebottles.bottles/data/bottles/bottles/GTASA";
cd "/home/YOURUSER/.var/app/com.usebottles.bottles/data/bottles/bottles/GTASA/drive_c/Program Files (x86)/Rockstar Games/GTA San Andreas";
"/home/YOURUSER/.var/app/com.usebottles.bottles/data/bottles/runners/soda-11.0-5/bin/wine" gta_sa.exe
' > /tmp/gtasa.log 2>&1 &
```

Kill a stuck instance by **process name only**:
```bash
pkill -9 gta_sa.exe
```

> **Footgun:** never use `pkill -f <partial string>` here — `-f` matches your own terminal command line and kills your shell session mid-command.

## 7. Troubleshooting Cheatsheet

| Symptom | Fix |
|---|---|
| Can't see files in Bottles picker | flatpak override (section 1A), restart Bottles fully |
| "Launching..." then nothing | Terminal launch + read the log (sections 1B, 3) |
| Silent hang, zero output | Wait 60+ sec; check `ps aux \| grep wine`; old InstallShield is slow |
| Disc check dialog | Unfixable via config — patched exe or digital copy (section 1C) |
| Where was it installed? | `drive_c/` inside the bottle folder (section 5) |
| Black screen / glitches | SilentPatch + Widescreen Fix into the game folder |

## Path Reference

```text
Bottles app data:   ~/.var/app/com.usebottles.bottles/data/bottles/
Your bottles:       .../data/bottles/bottles/<NAME>/
Virtual C: drive:   .../data/bottles/bottles/<NAME>/drive_c/
Drive letter maps:  .../data/bottles/bottles/<NAME>/dosdevices/
Wine runners:       .../data/bottles/runners/<runner>/bin/wine
Per-bottle config:  .../data/bottles/bottles/<NAME>/bottle.yml
```

## Quick Checklist for Any New Game

1. Mount ISO / insert disc → note mount path (`findmnt`)
2. `flatpak override --user --filesystem=<mount>:ro com.usebottles.bottles`
3. Create bottle with Gaming preset
4. Install via the section 3 terminal command
5. Skip bundled DirectX/redist prompts
6. Launch via section 6 command, log to a file
7. Only reach for exe patches if DRM or crashes block you

## Related

- `git-release-workflow` — same philosophy: repeatable checklist beats ad-hoc guessing
