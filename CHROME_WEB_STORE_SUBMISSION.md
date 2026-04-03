# Chrome Web Store Submission Pack

This file is the short, reviewer-facing companion to `CHROME_WEB_STORE_COMPLIANCE.md`.

Use it for:
- release packaging
- Chrome Web Store upload prep
- reviewer notes / support replies

---

## 1. What to upload to Chrome Web Store

Upload a single `.zip` file where `manifest.json` is in the **root** of the zip.

The zip should include:

- `manifest.json`
- `html/`
- `js/`
- `css/`
- `icons/`

Do **not** include unnecessary local/project files such as:

- `.git/`
- editor settings
- local caches
- screenshots not used by the extension
- unrelated docs unless you explicitly want them in the package

---

## 2. Recommended release package contents

Minimal Chrome Web Store package:

```text
manifest.json
html/
js/
css/
icons/
```

Current extension runtime files are loaded from these folders, so this is the core package.

---

## 3. How to build the zip package

### Option A — manual packaging

Create a zip from the contents of the `socialgpt-chrome` folder, with `manifest.json` at zip root.

### Option B — terminal command from the project folder

```bash
cd /mnt/k/Apps/wamp64/www/tornevall.com/tools.tornevall.com/projects/socialgpt-chrome
rm -f socialgpt-chrome-cws-1.2.12.zip
zip -r socialgpt-chrome-cws-1.2.12.zip manifest.json html js css icons
```

If `zip` is unavailable, use Windows Explorer:
1. open the folder
2. select `manifest.json`, `html`, `js`, `css`, `icons`
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

This current build uses browser-wide access directly in the manifest:

- `host_permissions: ["<all_urls>"]`
- `content_scripts.matches: ["<all_urls>"]`

There is **no separate optional browser-wide mode toggle** in the current reset state.
That means the Chrome Web Store documentation must describe the extension honestly as a browser-wide tool.

