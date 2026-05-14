# Tornevall Networks Social Media Tools

**A browser-wide AI assistant and fact-checking companion with a Chrome-first source manifest and release packaging for Chrome, Edge, Opera, and Firefox.**

This extension provides text selection overlays, fact-checking controls, and AI-assisted replies on ANY website you visit. It's powered by the Tornevall Networks Tools platform.

### 🔗 Quick Links

- **GitHub Project**: https://github.com/Tornevall/tornevall-networks-social-media-tools
- **Tools Platform**: https://tools.tornevall.net
- **Chrome Web Store**: live release track since `1.2.12` *(latest fixes shipping in `1.2.16`)*
- **Browser package builds**: generated locally via `../socialgpt.sh`

---

## 🎯 What It Does

**Everywhere on the web:**
- ✅ Select any text and see floating "Verify fact" and "Open Toolbox" buttons
- ✅ Right-click anywhere to access "Open Toolbox" or "Verify fact" context menus
- ✅ Open Toolbox directly from the popup when right-click/context-menu flow is unreliable on a site
- ✅ Get AI-powered replies and fact-checking via Tornevall Networks Tools
- ✅ After a fact-check result appears, continue with the same context using the result-box `Open Toolbox` action

Verify-fact note: when the backend decides that a check requires independent verification, Tools now treats the normal AI answer and the web-search verification lookup as separate steps. The preliminary answer can still be shown if web search fails or adds no useful evidence, but the metadata clearly marks the result as not independently verified. Fact/user-analysis result boxes now render the first markdown answer as safe HTML (headings, bold text, lists, and links), can show structured citation links returned by Tools, and use an internal scroll area so longer source-backed answers remain readable without hiding the action buttons. The first pending **Analyzing user…** / **Verifying facts…** state is also styled more cleanly with a compact preview card instead of a flattened text dump.

Timeout note: if Tools temporarily hits a slow OpenAI upstream call, the API can now return a friendlier `user_message` plus additive retry metadata instead of only exposing a raw transport error. Verify/source-check flows can also keep the preliminary answer visible when only the last OpenAI refinement step times out, together with a small backend `notice` telling the client that the answer is still the preliminary version.

**On specific platforms:**
- 📘 **Facebook admin activities**: per-tab activity reporting with manual queue controls that can now retry directly to Tools if the extension runtime handoff stalls
- 👥 **Facebook participant requests**: a lighter moderation helper on `/groups/*/participant_requests` that now prefers compact actions near the card's existing action/`...` area instead of injecting a larger helper block into every card, plus a floating fallback scanner panel that can list visible request cards, jump to the right card, and open **Analyze user** directly from that panel when Facebook's DOM makes inline attachment awkward
- 🎵 **SoundCloud**: Insights capture and analytics (with permission)
- 𝕏 **X/Twitter**: Platform-specific tooling

When the popup refreshes settings from Tools, the local Facebook admin activity checkbox can now also mirror the stored Tools-side on/off state from the Facebook Admin Tools dashboard. The same stricter state mirroring now also applies to the participant-request helper toggle, and the Tools dashboard checkbox should no longer drift visually from the saved remote state.

The participant-request helper now also scans more conservatively on heavy Facebook moderation pages: it uses a narrower visible-area scan, caches card scoring more aggressively, and reports scan timing in the floating scanner panel so it is easier to see that the helper is still alive even when Facebook's own page is sluggish.

Participant-request **Analyze user** now treats the visible request card as first-class context from the start: profile rows, group/friend clues, membership questions, visible answers/rule acknowledgements, and preview/comment markers are structured before the AI request is sent. When you click inside a request card, the helper also watches for newly opened Facebook comment/post preview UI and relevant Graph/XHR snippets; if more context appears after the analysis starts, the result box shows an update notice and offers **Update analysis** so the refreshed context can be included without manually copying text.

The participant-request helper now also reads Facebook's dedicated preview GraphQL response (`GroupsCometForumParticipantRequestPreviewDialogQuery`) more selectively: instead of dragging along large raw response blobs, it extracts participant-specific preview/comment/post clues from richer fields such as `preferred_body.text`, `body_renderer.text`, `message.text`, original-post message text, author names, timestamps, comment/post ids, and Facebook URLs before it falls back to visible DOM text only.

When Facebook temporarily rerenders the request list behind an open **Preview comment** dialog, the helper now also treats that dialog as an active participant surface. This lets the in-page analysis keep following the same person/comment context on the fly even when the original list card is no longer visible long enough to be re-bound immediately. The dialog matcher now also uses dialog-label metadata from Facebook's separate root-mounted `mount_*` preview roots, and the floating helper exposes **Find preview element** so the currently matched preview dialog can be scrolled into view and highlighted directly.

Once a preview surface has been matched, the helper now keeps rescanning that same dialog as Facebook swaps in more context inside it — including when the operator clicks through to **View original post** from the preview. Preview text selection is now also more name-aware: lines tied to the analyzed participant and the surrounding comment/post context are prioritized, while generic UI noise is filtered harder. The first visible-card-only participant analysis now races two backend requests in parallel — one without web search and one with web search — so the fastest useful answer can be shown first, while later preview/original-post follow-up reruns can still do the same again when richer comment context appears. Those follow-up reruns also give the participant's own visible comment extra weight against the saved group rules/context, and the waiting notice now backs off more gracefully when Facebook has already stopped changing. If the helper still looks stale after the full thread is visible, **Find preview element** now also forces one more preview/comment rescan instead of only scrolling to the dialog.

If you use **Analyze current preview**, the helper now runs in a preview-first mode when a real preview dialog is matched: the opened preview text is treated as the primary source, card-only answer/comment text is no longer assumed to belong to that preview automatically, and the floating analysis/result box anchors itself to the actual preview dialog instead of drifting toward a broader surrounding DOM container.

The participant helper now also exposes a small detected-context list inside the floating panel, showing the current name/profile id/profile URL plus any visible group/friend/profile signals, preview-comment clues, original-post links, and whether the current context comes from cards, preview dialog fallback, or captured GraphQL preview data. The verify-style **Analyzing user…** box now shows a more visibly moving progress line with step count, elapsed time, and a live bar instead of a mostly static `Checking now…` spinner, and the helper can launch **Analyze current preview** even when Facebook has temporarily rerendered all visible request cards away.

The participant-request helper now also exposes **Rules / group info** from the floating helper list, from each inline request-card helper, and from the user-analysis result box so the group-specific moderation context can be edited from whichever participant view you are already using. That rule text is now keyed per Facebook group path (`/groups/<id>`) instead of being one shared text for every group, and the same per-group map is now saved through Tools extension settings so it can sync back into other extension installs for the same user/token. On actual `/groups/<id>/participant_requests` pages, only the exact current group's saved rules are shown/used there; the older Tools-side setting is no longer allowed to fill the box with another group's text.

The popup's **Use dev / beta server** checkbox is opt-in and stays unchecked by default. The extension should keep using `tools.tornevall.net` unless you explicitly enable the dev/beta host.

Older synced popup installs now also normalize legacy string-based `devMode` leftovers once, so users do not stay on the dev/beta host accidentally just because an old storage value looked truthy.

The popup no longer duplicates the Facebook **Send queued** / **Release stuck** actions because those controls already exist on the ingest page itself.

The background worker now also batches debug-log persistence and avoids unnecessary sync writes when the Tools-side Facebook runtime flags have not actually changed, which reduces Chrome `MAX_WRITE_OPERATIONS_PER_MINUTE` quota errors.

---

## 🔧 Architecture: Why `<all_urls>` Permission?

**This extension REQUIRES `<all_urls>` in BOTH places:**

```json
{
  "host_permissions": ["<all_urls>"],
  "content_scripts": [
    {
      "matches": ["<all_urls>"]
    }
  ]
}
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

The root `manifest.json` in this folder is intentionally the **Chrome-first** source manifest. Day-to-day development and first-pass testing continue to use that file directly in Chrome.

### Build browser packages

Use the packaging entrypoint in `projects/socialgpt.sh` when you want browser-specific release archives:

```bash
cd /mnt/k/Apps/wamp64/www/tornevall.com/tools.tornevall.com/projects
./socialgpt.sh
```

This creates separate archives in `projects/socialgpt-chrome/dist/`:

- `tornevall-networks-social-media-tools.zip` *(legacy Chrome alias)*
- `tornevall-networks-social-media-tools-chrome.zip`
- `tornevall-networks-social-media-tools-edge.zip`
- `tornevall-networks-social-media-tools-opera.zip`
- `tornevall-networks-social-media-tools-firefox.zip`

Packaging behavior:

- **Chrome / Edge / Opera** reuse the Chrome-first manifest as-is.
- **Firefox** uses the same source tree but gets a build-time manifest patch that adds `browser_specific_settings.gecko` without changing the source `manifest.json` in the repo.
- The packaging flow does **not** increment the extension version.

### Get a Bearer Token

1. Visit **https://tools.tornevall.net**
2. Create an account
3. Generate a **personal bearer token**
4. Paste it into the extension popup or the full config page

---

## 🛡️ Privacy & Security

- ✅ All JavaScript is bundled locally (no remote code execution)
- ✅ API calls go ONLY to `tools.tornevall.net` and `tools.tornevall.com`
- ✅ Extension requires bearer token activation
- ✅ All settings stored locally in extension storage
- ✅ No hidden network requests
- ✅ AI requests now include the extension version/build metadata so Tools can identify which SocialGPT client revision generated a request
- ✅ Browser-targeted builds now also report a matching `client_platform` (`chrome_extension`, `edge_extension`, `opera_extension`, `firefox_extension`) when talking to Tools
- ✅ Tools-side SocialGPT guardrails explicitly allow disclosure of the current AI model/client version when asked, while blocking attempts to extract source code, `.env` data, passwords, tokens, or hidden prompts

---

## 📚 Documentation

| File | Purpose |
|------|---------|
| **CHROME_WEB_STORE_COMPLIANCE.md** | ⭐ READ THIS before CWS submission |
| CHANGELOG.md | Version history |
| manifest.json | Extension configuration |
| build_packages.py | Multi-browser archive generator used by `../socialgpt.sh` |

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

For packaging and upload steps, use `../socialgpt.sh`, which now stages browser-specific manifests and creates separate archives from the same source tree.

---

## ⚙️ Manifest Overview

```json
{
  "description": "Browser-wide AI assistant and social media toolkit...",
  "host_permissions": ["<all_urls>"],
  "content_scripts": [
    {
      "matches": ["<all_urls>"],
      "js": ["js/content-script.js"],
      "css": ["css/styles.css"]
    }
  ]
}
```

Both `<all_urls>` entries are REQUIRED and intentional, even though the real manifest contains additional fields beyond this shortened example.

---

## 🔑 Features

- **AI Replies**: Compose AI-powered responses on any page
- **Fact-Checking**: Select text to instantly verify
- **Settings Sync**: Preferences sync with Tools platform
- **Platform Integrations**: SoundCloud insights
- **Dev Mode**: Debug console and connection testing

## Configuration surfaces

The extension now has two equivalent settings surfaces:

- **Popup** — the compact quick editor for day-to-day changes
- **Config page / options page** — a larger, clearer layout that mirrors the same settings and autosave behavior

Both surfaces read/write the same extension storage keys and trigger the same Tools-backed autosave logic when a personal bearer token is configured.
Both surfaces also localize dynamically at runtime, with Swedish selected automatically when the browser UI prefers Swedish and English used as fallback.
There is now also an explicit **Extension language** setting (`Auto`, `English`, `Swedish`) so the extension UI can be controlled separately from the actual AI reply language.
That UI localization is kept separate from the actual AI reply language choice, so **Answer language** / **Verify-fact language** still control generated output independently.

The same extension-language setting now also reaches the on-page SocialGPT UI itself:

- Toolbox labels and buttons
- floating `Open Toolbox` / `Verify fact` action buttons
- fact-check result actions and subtitles
- background context-menu labels

When you paste or edit the bearer token, the UI now performs a lightweight API validation call and shows an inline spinner plus a success/error confirmation before you run the full **Test Tools → OpenAI** smoke test.

As of `1.2.15`, localized UI defaults no longer overwrite your responder profile or test-question content. This specifically fixes the regression where some Swedish-browser users could end up with Swedish-biased prompt defaults even after choosing another answer language.

The popup now also includes an **Open Toolbox in active tab** shortcut. If the current page already has a live text selection, the extension imports that selection into Toolbox automatically, which gives you a fallback on pages where the normal context-menu flow is flaky.

As of `1.2.16`, the popup shortcut plus the right-click **Open Toolbox** / **Verify fact** actions are also routed frame-aware through the background worker. That means the extension now tries to target the most relevant injected frame (existing Toolbox frame, selected-text frame, focused editable frame, otherwise the top frame) instead of depending on whichever frame answers first on iframe-heavy pages.

The larger **config / options page** now also includes an **Advanced mark-mode context** section for the Toolbox:

- keep the current compact `[1]`, `[2]` style as the default
- optionally add a generated mark id such as `tn-mark-2`
- optionally include richer element details in the marked-context headers
- optionally expand marked context extraction to **one parent up**
- optionally expand further to **one parent up + direct child scan** when the default marked block is too thin
- optionally switch to **whole current frame/document text** when the useful text lives inside an iframe or other app-like surface

These advanced mark-mode settings are local to the extension and intentionally do not change the default compact behavior unless you enable them.

The Toolbox panel itself is now draggable from its header, and the text-selection overlay was hardened so short/double-click selections trigger **Open Toolbox** / **Verify fact** more reliably.
The Toolbox header close button (`×`) now also works again alongside the draggable header behavior.
Toolbox now also has a **Panel mode** selector so you can keep it in auto mode near the active field or hard-dock it (`Attached right`, `Attached left`, `Bottom right`, `Bottom left`) like a companion panel.

---

## 📞 Support

- **Register & token**: https://tools.tornevall.net
- **Forum**: https://forum.tornevall.net
- **Compliance questions**: See CHROME_WEB_STORE_COMPLIANCE.md

---

✅ **Ready for CWS submission? Check CHROME_WEB_STORE_COMPLIANCE.md first.**

## Facebook reply context

On Facebook comment/reply fields, the reply panel tries to build a cleaner thread-aware context by:

- anchoring to the active reply composer
- detecting the likely reply target from the surrounding comment thread
- reusing recent comment/thread hints captured from Facebook XHR / GraphQL responses when available
- remembering the last reply prompt so repetitive moderation/reply workflows are faster

Reply generation and reply-assistance features are user-initiated.
The extension does not post or submit replies automatically.

## Facebook participant request helper

On Facebook group pages that match `/groups/<group>/participant_requests`, the extension can now attach a small per-card helper when the feature is enabled from **Tools**.

Current v1 behavior:

- the helper is enabled from the Tools-side Facebook admin settings, not from a separate local popup checkbox
- the same Tools-side master switch is authoritative, so the helper should appear only after that setting is enabled in Tools and synced into the extension/tab
- visible participant-request cards are detected from the live Facebook DOM
- each matched card now keeps only compact **Show card** and **Analyze user** actions
- the helper now prefers to attach beside stable moderation-detail rows inside the left request body (for example comment/preview or unanswered-question lines) before it falls back to the top-right `...` action area
- the participant-analysis import is now explicitly user-focused: it calls out visible group/friend clues, visible membership questions, question-answer state, and other profile/background hints before the full card text is appended as raw context
- the imported Toolbox/fact-check context contains the visible participant card text, profile link when available, and a moderation-focused instruction block
- when active, the page now shows one small floating participant-helper box docked in the top-right corner by default so it is obvious that the helper is awake even before any card is matched
- DOM rescans now stay scoped to the relevant Facebook participant-request content root instead of watching the whole page body, which keeps the helper lighter on heavier moderation queues
- the floating participant helper can now be dragged around, re-docked to the top-right corner, and remembers its last free-moved position for later visits
- rescanning no longer depends on a manual scan button: the helper now rescans after scroll/load-more settle and through a light timer fallback when Facebook's own DOM mutations are not enough
- **Analyze user** now opens a verify-style result box instead of the full Toolbox composer so the participant review stays focused on user analysis first

Important guardrails:

- the helper is advisory-only and does **not** click approve/reject buttons automatically
- the imported participant card context is treated as visible UI context, not as independently verified fact
- preview/GraphQL enrichment can be added later, but the first version already works from the visible card data alone

## Advanced mark mode context

When you use **Mark context** inside the Toolbox, the extension still defaults to compact numbered sections such as `[1]` and `[2]`.
If you need more traceability on visually noisy pages, open the **config / options page** and expand **Advanced mark-mode context**.

Available advanced behaviors:

- **Compact numbering only** — current default, keeps the existing minimal headers
- **Numbering + generated mark id** — adds a stable local marker such as `tn-mark-1`
- **Numbering + mark id + element details** — also shows a short CSS-like element descriptor and a name/text hint when available
- **Current marked block only** — current extraction behavior
- **Go one parent up** — extracts one DOM level above the marked block
- **Go one parent up + scan direct child blocks** — keeps the broader parent context and also summarizes nearby direct child blocks
- **Use the whole current frame/document text** — captures the visible text from the current page/frame document, which is useful when the real content sits inside an iframe or larger app shell

When a richer label mode is enabled, marked elements also get a visible local badge on the page while they are active, which makes it easier to map the marked DOM node back to the context text shown in the Toolbox.

The extension now also runs its content scripts in nested frames (including matching `about:blank` child frames) where Chrome allows it, so mark mode and selection overlays can work inside more iframe-backed surfaces.


## Local storage

The extension keeps a small local cache for convenience.

Stored locally in Chrome:

- bearer token
- current environment flag (`devMode`)
- last synced responder values for UI fallback
- temporary local UI state for active extension features

When Toolbox is open, the extension can also ask Tools in the background whether the current hostname matches known RSS source hosts from `/api/rss`, and then show a compact related-site hint inline in the Toolbox anchor note.

## Troubleshooting

If **dev / beta mode** is enabled:

- the popup shows a debug console


If you change extension files locally, reload the extension in `chrome://extensions` before testing again.

If you see `Uncaught ReferenceError: resetReplyTransientFieldsButKeepContext is not defined`, reload both the extension and the active page tab so the latest `content-script.js` is injected.

