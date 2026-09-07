# Clipboard History — GNOME Shell Extension

Top-bar clipboard history for Ubuntu 26.04 (GNOME Shell 45-50, Wayland). Captures copied text + links, with a searchable popup to copy back, open links, delete, pause capture, and clear all. Built by Moss AI Studio.

## Features
- **Clipboard capture** on Wayland via `Meta.Selection` `owner-changed` (the only clean passive way — `St.Clipboard` has no signals in GNOME 50)
- **Top-bar icon** (paste icon) → popup list, newest first
- **Search** box filters history as you type
- **Click an entry** → copies it back + green ✓ flash → paste with Ctrl+V
- **Links** get an extra Open button (default browser)
- **250-entry cap** (oldest dropped), **dedupe move-to-top** (re-copying bumps to top, no duplicates)
- **OTP skip**: 6-digit codes (2FA) are auto-ignored
- **Pause capture** toggle (icon changes), **Clear all**, **per-item delete**
- **`Super+Shift+V`** shortcut toggles the popup
- History persists across reboots (local JSON only, never syncs)

## Install (another Ubuntu desktop)
1. Copy THIS whole folder to `~/.local/share/gnome-shell/extensions/` (keep the folder name exact).
2. Log out and back in (or restart the computer).
3. Verify: `gnome-extensions info clipboard-history@mossaistudio.com` → `State: ACTIVE`.
4. Toggle on in Extension Manager if needed.

Remove: `gnome-extensions disable clipboard-history@mossaistudio.com` (or delete the folder).

## Data
`~/.local/share/clipboard-history/history.json` — plain JSON, atomic writes, human-readable.

## Dev loop
- Repo: `~/dev/clipboard-history@mossaistudio.com`; install: `~/.local/share/gnome-shell/extensions/clipboard-history@mossaistudio.com/`
- Sync: `cp extension.js popup.js historyStore.js stylesheet.css metadata.json ~/.local/share/gnome-shell/extensions/clipboard-history@mossaistudio.com/` (+ `schemas/`)
- **Reload requires logout/login** (no hot-reload on Wayland; ERROR state sticks for the session)
- Tests (pure logic, no shell): `gjs -m tests/run-tests.js`
- Debug clipboard signals live: enable the `tests/clipboard-debug-extension.js` as a scratch extension, copy text, read `journalctl --user -b -o cat | grep CLIPDBG`
- Errors: `journalctl --user -b -o cat | grep -i clipboard-history`

## Known GNOME 50 pitfalls (all fixed in this code)
See the `gnome-shell-extension-dev` skill for the full list: `St.Clipboard` has no signals (use `Meta.Selection.owner-changed`, arg order `(sel, selType, newOwner)`), keybinding name must match a schema key (mismatch = SIGABRT + shell crash + all extensions disabled), crash-proof `enable()` wrapper, ScrollView needs explicit height, `Clutter.TextEllipsizeMode` not introspected (use numeric 3).

## Roadmap
- **v1.1: images** — capture + store + thumbnail in list + copy-back + delete (files in the same data dir)
- Decide on extensions.gnome.org publishing after daily use (currently local-only)

## Screenshot
(TODO: add screenshot.png when capturing one)
