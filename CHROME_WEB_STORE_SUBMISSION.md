# Chrome Web Store Submission Pack

This file is the short, reviewer-facing companion to `CHROME_WEB_STORE_COMPLIANCE.md`.

Use it for:
- release packaging
- Chrome Web Store upload prep
- reviewer notes / support replies

---

## 1. What to upload to Chrome Web Store

Upload a single `.zip` file where `manifest.json` is in the **root** of the zip.

### Core runtime files (required)

- `manifest.json`
- `html/`
- `js/`
- `css/`
- `icons/`

### Documentation files (optional but recommended)

- `README.md` — helps reviewers understand the extension's purpose and features
- `CHANGELOG.md` — documents version history and changes (useful for reviewers to assess security/compliance updates)

### Files to exclude

Do **not** include unnecessary local/project files such as:

- `.git/`
- `.gitignore`
- editor settings (`.vscode`, etc.)
- local caches
- screenshots not used by the extension
- `CHROME_WEB_STORE_COMPLIANCE.md` (internal reference; use `CHROME_WEB_STORE_SUBMISSION.md` instead if you want to include review guidance)

---

## 2. Recommended release package contents

**Minimal package** (runtime only):

```text
manifest.json
html/
js/
css/
icons/
```

**Recommended package** (with documentation for reviewers):

```text
manifest.json
html/
js/
css/
icons/
README.md
CHANGELOG.md
```

The recommended package helps Chrome Web Store reviewers understand your extension's purpose, features, and recent changes (especially for security/compliance reviews).

---

## 3. How to build the zip package

### Option A — manual packaging

Create a zip from the contents of the `socialgpt-chrome` folder, with `manifest.json` at zip root.

Include:
- Core runtime files: `manifest.json`, `html/`, `js/`, `css/`, `icons/`
- Documentation: `README.md`, `CHANGELOG.md` (optional but recommended)

### Option B — terminal command from the project folder

**Recommended** (with documentation):

```bash
cd /mnt/k/Apps/wamp64/www/tornevall.com/tools.tornevall.com/projects/socialgpt-chrome
rm -f tornevall-networks-socialgpt-chrome.zip
zip -r tornevall-networks-socialgpt-chrome.zip manifest.json html js css icons README.md CHANGELOG.md; exit
```

**Minimal** (runtime only):

```bash
cd /mnt/k/Apps/wamp64/www/tornevall.com/tools.tornevall.com/projects/socialgpt-chrome
rm -f tornevall-networks-socialgpt-chrome.zip
zip -r tornevall-networks-socialgpt-chrome.zip manifest.json html js css icons; exit
```

If `zip` is unavailable, use Windows Explorer:
1. open the folder
2. select `manifest.json`, `html`, `js`, `css`, `icons` (and optionally `README.md`, `CHANGELOG.md`)
3. right-click
4. Send to → Compressed (zipped) folder

---

## 4. What the reviewer needs to know

### Single purpose

This extension is a browser-wide AI assistant and fact-checking companion.

It provides:
- selected-text overlay buttons (`Verify fact`, `Open Toolbox`) on any website
- right-click context menu actions on any website
- Tools-backed AI replies and verification flows
- platform-specific helpers for Facebook, SoundCloud, and X/Twitter

### Why `<all_urls>` is required

The extension needs to run on arbitrary sites because the selected-text overlay and context-menu features are the product itself.

Restricting `content_scripts.matches` or `host_permissions` to a small allowlist would break:
- selected-text `Verify fact`
- selected-text `Open Toolbox`
- right-click context menu actions
- general browser-wide AI usage

### Remote communication

The extension communicates only with:
- `https://tools.tornevall.net`
- `https://tools.tornevall.com`

### Remote code statement

No remote code is executed.
All JavaScript is bundled in the extension package.

---

## 5. Suggested Chrome Web Store reviewer note

You can paste this into reviewer notes if needed:

```text
This extension is a browser-wide AI assistant and fact-checking companion.
It requires <all_urls> because its core functionality is selected-text overlays
and context-menu actions on arbitrary websites, not just on a single domain.

The extension communicates only with:
- https://tools.tornevall.net
- https://tools.tornevall.com

No remote code is executed. All JavaScript is bundled locally in the package.
A personal Tornevall Networks Tools bearer token is required before Tools-backed
AI requests can be used.
```

---

## 6. Suggested store listing checklist

Before upload:

- [ ] `manifest.json` version is correct
- [ ] extension reloads cleanly in `chrome://extensions`
- [ ] selected text shows both `Open Toolbox` and `Verify fact`
- [ ] fact-result popup shows `Refresh`, `Dig deeper`, and `Open Toolbox`
- [ ] popup can save bearer token and test Tools connection
- [ ] background service worker has no blocking runtime errors
- [ ] zip contains `manifest.json` at root

---

## 7. Relationship to other docs

- `CHROME_WEB_STORE_COMPLIANCE.md` = full policy/compliance explanation
- `CHROME_WEB_STORE_SUBMISSION.md` = short practical submit/release guide
- `README.md` = general project/user-facing overview

---

## 8. Important current-state note

**Manifest configuration (after 2026-04-03 compliance update):**

The current build now includes a **global browser-wide AI mode toggle** in the popup:

- Default manifest: `host_permissions: ["https://tools.tornevall.net", "https://tools.tornevall.com"]` + `content_scripts.matches` narrowed to Facebook, SoundCloud, X/Twitter
- Optional global mode: Requests `optional_host_permissions: ["<all_urls>"]` when user enables the toggle, then registers content scripts via `chrome.scripting.registerContentScripts`
- Users can revoke the global mode permission via popup toggle (disables the extension on all sites except the default platforms)

This balanced approach:
- Respects Chrome Web Store default permission limits (no `<all_urls>` in default manifest)
- Allows advanced users to opt-in to browser-wide mode explicitly
- Makes Chrome Web Store reviewers happy with a clear, user-initiated permission model

