# Tornevall Networks Social Media Tools

**A browser-wide AI assistant and fact-checking companion for Chrome.**

This extension provides text selection overlays, fact-checking controls, and AI-assisted replies on ANY website you visit. It's powered by the Tornevall Networks Tools platform.

### 🔗 Quick Links

- **GitHub Project**: https://github.com/Tornevall/tornevall-networks-social-media-tools
- **Tools Platform**: https://tools.tornevall.net
- **Chrome Web Store**: *(coming soon after compliance review)*

---

## 🎯 What It Does

**Everywhere on the web:**
- ✅ Select any text and see floating "Verify fact" and "Open Toolbox" buttons
- ✅ Right-click anywhere to access "Open Toolbox" or "Verify fact" context menus
- ✅ Get AI-powered replies and fact-checking via Tornevall Networks Tools
- ✅ After a fact-check result appears, continue with the same context using the result-box `Open Toolbox` action

**On specific platforms:**
- 📘 **Facebook**: Admin activity reporting (with permission)
- 🎵 **SoundCloud**: Insights capture and analytics (with permission)
- 𝕏 **X/Twitter**: Platform-specific tooling

---

## 🔧 Architecture: Why `<all_urls>` Permission?

**This extension REQUIRES `<all_urls>` in BOTH places:**

```json
"host_permissions": ["<all_urls>"],
"content_scripts": [{
  "matches": ["<all_urls>"],
  ...
}]
```

**Why?** The extension's core feature is a browser-wide AI assistant. Users need to:
1. Select text on ANY website and fact-check it
2. Use context menus on ANY page
3. Get AI replies in text fields anywhere

**Can we restrict this?** NO. Restricting it breaks the product.

**Current build note:** after the recent reset/recovery cycle, the browser-wide scope is provided directly by the static manifest configuration (`host_permissions` + `content_scripts.matches` both set to `<all_urls>`). There is currently **no separate popup toggle** for browser-wide mode in this build.

This is identical to:
- **Grammarly**: Grammar checking on all sites
- **1Password**: Password manager on all sites
- **uBlock Origin**: Ad-blocking on all sites

---

## 📥 Installation & Setup

### Load from Source

1. Clone or download this repository
2. Open `chrome://extensions/`
3. Enable "Developer mode" (top right)
4. Click "Load unpacked" and select this folder

### Get a Bearer Token

1. Visit **https://tools.tornevall.net**
2. Create an account
3. Generate a **personal bearer token**
4. Paste it into the extension popup

---

## 🛡️ Privacy & Security

- ✅ All JavaScript is bundled locally (no remote code execution)
- ✅ API calls go ONLY to `tools.tornevall.net` and `tools.tornevall.com`
- ✅ Extension requires bearer token activation
- ✅ All settings stored locally in extension storage
- ✅ No hidden network requests

---

## 📚 Documentation

| File | Purpose |
|------|---------|
| **CHROME_WEB_STORE_SUBMISSION.md** | ⭐ Short release + submit guide for Chrome Web Store |
| **CHROME_WEB_STORE_COMPLIANCE.md** | ⭐ READ THIS before CWS submission |
| CHANGELOG.md | Version history |
| manifest.json | Extension configuration |

---

## 🚀 For Chrome Web Store Submission

**This extension is CWS-compliant** because:
- ✅ Honest description (says "browser-wide")
- ✅ Justified permissions (explains why `<all_urls>` is needed)
- ✅ Limited API surface (only Tools servers)
- ✅ No remote code (all local)
- ✅ User authentication required

**Before submitting to CWS:** Read `CHROME_WEB_STORE_COMPLIANCE.md` for:
- Ready-to-use submission text templates
- Answers to common reviewer questions
- Full compliance checklist

For packaging and upload steps, use `CHROME_WEB_STORE_SUBMISSION.md`.

---

## ⚙️ Manifest Overview

```json
{
  "description": "Browser-wide AI assistant and social media toolkit...",
  "host_permissions": ["<all_urls>"],          // ← Required for injection
  "content_scripts": [{
    "matches": ["<all_urls>"],                 // ← Required for overlay
    "js": [...],
    "css": [...]
  }]
}
```

Both `<all_urls>` entries are REQUIRED and intentional.

---

## 🔑 Features

- **AI Replies**: Compose AI-powered responses on any page
- **Fact-Checking**: Select text to instantly verify
- **Settings Sync**: Preferences sync with Tools platform
- **Platform Integrations**: Facebook admin stats, SoundCloud insights
- **Dev Mode**: Debug console and connection testing

---

## 📞 Support

- **Register & token**: https://tools.tornevall.net
- **Forum**: https://forum.tornevall.net
- **Compliance questions**: See CHROME_WEB_STORE_COMPLIANCE.md

---

✅ **Ready for CWS submission? Check CHROME_WEB_STORE_COMPLIANCE.md first.**

## Facebook admin activities

On Facebook group `admin_activities` pages, the extension can:

- observe relevant page activity in the current tab
- show a single inline control for enabling activity statistics
- extract detected activity rows directly from Facebook XHR / GraphQL responses
- queue detected rows locally and submit them to Tools in bulk instead of one request per row
- keep the page overlay draggable so it does not block Facebook UI elements
- show a local preview of reportable admin-log entries before statistics submission is enabled

The Facebook-side monitor starts when the page is loaded so the extension can detect relevant `admin_activities` data in the open tab.
Detected rows may be collected locally for the current page session, but no statistics are submitted to Tools unless the user explicitly enables statistics submission from the inline page control.

Statistics submission is disabled by default on each page load.
If the Facebook page is reloaded or reopened, submission must be explicitly enabled again.

The point is to keep the Facebook-side workflow simple and page-local.
The actual Tools submit is performed by the extension runtime, not directly by the Facebook page context, to avoid browser CORS issues.

## Facebook reply context

On Facebook comment/reply fields, the reply panel tries to build a cleaner thread-aware context by:

- anchoring to the active reply composer
- detecting the likely reply target from the surrounding comment thread
- reusing recent comment/thread hints captured from Facebook XHR / GraphQL responses when available
- remembering the last reply prompt so repetitive moderation/reply workflows are faster

Reply generation and reply-assistance features are user-initiated.
The extension does not post or submit replies automatically.

## Local storage

The extension keeps a small local cache for convenience.

Stored locally in Chrome:

- bearer token
- current environment flag (`devMode`)
- last synced responder values for UI fallback
- temporary in-session admin activity data pending optional submission

## Troubleshooting

If **dev / beta mode** is enabled:

- the popup shows a debug console

If **Enable Facebook admin debug diagnostics** is enabled in the popup:

- Facebook `admin_activities` pages can show extra diagnostics
- interesting page events can be mirrored to Chrome DevTools console with the `TN Social Tools` prefix
- detected admin-log entries can also be mirrored to the console before a bulk upload is sent

The injected network monitor skips unsafe direct `responseText` reads for binary XHR response types such as `arraybuffer` and `blob`, so Facebook background traffic should no longer crash the page monitor while text/JSON admin-log payloads remain readable.

If Facebook activity submission returns a server-side 500 error, make sure the Tools server is updated to the matching backend version for the extension workflow.

If you change extension files locally, reload the extension in `chrome://extensions` before testing again.
