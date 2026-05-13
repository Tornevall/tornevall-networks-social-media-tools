# Changelog

## Unreleased

### Added
- A new build-time packaging script now creates browser-specific release archives for Chrome, Edge, Opera, and Firefox from the same `socialgpt-chrome` source tree.
- Toolbox now has a hard-selectable panel mode (`Auto near field`, `Attached right`, `Attached left`, `Bottom right`, `Bottom left`) so it can behave more like a companion panel and stay out of the way.
- Content scripts can now request lightweight related-site hints from Tools RSS (`/api/rss`) in the background, and the Toolbox anchor note now surfaces when the current URL matches a known RSS source host.
- Facebook group `participant_requests` pages can now show a first participant-request helper that detects visible request cards and adds **Analyze in Toolbox** plus **Verify facts** actions per card.
- The floating Facebook participant scanner can now also list the currently detected request cards, jump to the correct card, and open **Analyze in Toolbox** / **Verify facts** directly from that fallback panel.
- Facebook participant-request review now also has an inline **Rules / group info** config box directly in the browser helper/result flow, so operators can update the extra group-specific user-verifier context without leaving the participant-request page.

### Changed
- Facebook participant-request **Rules / group info** is now scoped per Facebook group path (`/groups/<id>`) instead of reusing one shared rule text for every group. The per-group rules map is now also saved through Tools extension settings for sync between installs, and on actual participant-request pages only the exact current group's saved rules are shown/used there.
- `projects/socialgpt.sh` no longer zips the raw source tree directly; it now calls the multi-browser builder and writes artifacts to `projects/socialgpt-chrome/dist/`.
- The root `manifest.json` remains the Chrome-first source manifest used for development and first-pass testing.
- Firefox packages now receive their `browser_specific_settings.gecko` metadata only at build time, so the source manifest can stay Chrome-oriented in the repository.
- SocialGPT client metadata is now browser-aware and reports `chrome_extension`, `edge_extension`, `opera_extension`, or `firefox_extension` depending on the current build/runtime.
- The popup/config sync now also mirrors the Tools-side **Facebook admin activity tools** on/off setting, so a remote Tools save can push the same feature state back into the local extension checkbox on the next settings refresh.
- The new Facebook participant-request helper is intentionally controlled from Tools-side extension settings rather than from a separate local SocialGPT popup toggle.
- Facebook participant-request **Analyze user** now includes the visible card text as structured primary context from the start, watches for newly opened preview/comment/post context plus relevant Facebook Graph/XHR snippets after the operator clicks inside a card, and exposes an **Update analysis** action when more context appears.
- The first floating **Analyzing user… / Verifying facts…** state is now visually cleaner: the pending box keeps the same step-by-step progress but shows a styled preview card instead of one flat wall of text, and participant/user-analysis context now keeps its original line structure instead of being collapsed into one blob.
- Participant-request **Analyze user** now keeps the candidate profile URL as the verification source when Facebook exposes it, preserves extra verification metadata across **Refresh** / **Update analysis** / **Dig deeper**, and keeps the operator-supplied group rules in sync when they are edited from the new inline config box.

### Fixed
- The Facebook participant-request helper now detects root-mounted preview dialogs more reliably by also matching dialog `aria-label`/label metadata inside Facebook's separate `mount_*` roots, so **Analyze current preview** no longer misses the active comment-preview dialog as easily when the visible request cards have re-rendered away.
- The floating participant helper now also exposes a dedicated **Find preview element** action that scrolls to and highlights the currently matched preview dialog, making it easier to confirm which Facebook preview surface the helper is actually using.
- The Facebook participant-request helper now guards its floating-panel DOM creation more defensively, so odd page/DOM races can no longer crash the content script with `Cannot set properties of undefined (setting 'position')` while the helper panel or rules box is initializing.
- SocialGPT now prefers the backend's friendlier timeout/error `user_message` instead of exposing the raw OpenAI transport failure text directly to the extension UI when Tools reports a temporary upstream timeout.
- Verify/source-check flows can now keep the preliminary answer when only the last OpenAI refinement step times out, and the background worker now records the backend `notice` so that slower-than-expected OpenAI runs are easier to understand in debug output.
- Facebook participant-request **Analyze user** now keeps listening to Facebook Graph/XHR preview traffic even when the separate admin-activity collector is off, so `/groups/*/participant_requests` can still capture the preview-dialog GraphQL data needed for user analysis.
- The participant-request helper now parses `GroupsCometForumParticipantRequestPreviewDialogQuery` more selectively: participant-specific comment/post preview clues are extracted into compact analysis context, while noisy raw response blobs are avoided and some compact base64-like graph ids are decoded into readable moderation hints when useful.
- The participant-request preview parser now also prefers richer GraphQL text/message fields and source metadata (`preferred_body.text`, `body_renderer.text`, original-post message text, author names, timestamps, comment/post ids, and Facebook URLs) before it falls back to visible DOM-only clues.
- When Facebook rerenders the participant-request list behind an open **Preview comment** dialog, the helper now keeps treating that dialog as the active participant surface instead of falling back to a misleading “No visible participant-request cards matched yet” state while the matching GraphQL preview data is still arriving.
- The floating participant helper now also shows a listbox-style **Detected context** view with the current participant name/profile ids, visible group/friend/profile signals, preview-comment clues, and original-post links when they are available, and it can run **Analyze current preview** from that fallback context even when Facebook has rerendered away the visible request cards.
- The verify-style **Analyzing user…** loading box now shows a more active progress display with step count, elapsed time, and a live progress bar instead of relying mostly on the old static `Checking now…` spinner.
- The popup's **Use dev / beta server** checkbox is now explicitly off by default and no longer flips on accidentally when older saved settings contain string-like values such as `"false"`.
- Older popup installs now also rewrite legacy string-valued `devMode` settings to a real boolean once, so users who accidentally carried `"false"`/similar sync-storage leftovers no longer stay on the dev host by mistake.
- Floating SocialGPT UI elements now mount more defensively when a page is still in an early/transient DOM state, so `appendChild` crashes are less likely on pages such as forum threads.
- Fact-check and user-analysis markdown rendering is now more tolerant of slightly messy AI output, including indented headings, numbered lists, and text that arrives mixed with simple HTML line breaks.
- The participant-request helper now exposes **Rules / group info** more visibly from both the floating helper card list and each inline card helper, and the same entry now remains available in user-analysis result boxes even when the original card element has moved or re-rendered.
- The verify/analyze result-box loading spinner now uses a dedicated inline animation path instead of a missing CSS keyframe, so the purple loading indicator no longer looks frozen in one position.
- Long fact-check and user-analysis answers now stay readable in the floating result box: the answer/citation area scrolls internally while the title and action buttons remain accessible, and verify requests now ask Tools for a larger completion budget so source-backed answers are less likely to stop mid-sentence.
- Fact-check and participant user-analysis result boxes now render safe markdown links from Tools as clickable links and show structured citation links when the backend provides them, instead of exposing source links as raw markdown text.
- Fact-check and participant user-analysis answers now render the first returned markdown response as safe HTML instead of showing headings, bold text, and lists as raw markdown source in the floating result box.
- The Facebook participant-request helper is now gated more strictly to top-level Facebook `/groups/*/participant_requests` pages, so its scanner state no longer initializes on unrelated all-url pages such as Threads activity views and cannot raise participant-scanner `ReferenceError` noise there.
- The Facebook `participant_requests` helper is now much lighter on slow moderation pages: visible-card scanning is more conservative, card scoring is cached more aggressively, and the floating scanner now reports scan timing so it is clearer that the helper is still running when Facebook itself is lagging.
- Participant-request helper buttons now prefer stable left-column moderation rows such as comment/preview or unanswered-question lines before they fall back to the top-right `...` area, which makes the attachment point more consistent on cards like the current Magnus Jönsson / Börje Svenningsson layouts.
- The unclear `SG` participant-request wording has now been replaced by clearer participant-helper / user-analysis labels, and the primary action now explicitly focuses on **Analyze user** instead of the vaguer **Analyze in Toolbox** wording.
- Participant-request helper actions now prefer a smaller placement near the card's existing action / `...` area when that anchor is available, instead of always inserting a larger helper block deeper inside every card.
- Participant-request DOM observers now stay scoped to the relevant Facebook main/request container instead of the whole page body, which reduces unnecessary rescans on heavier moderation pages.
- The floating Facebook participant scanner popup can now be dragged around and remembers its last position instead of snapping back to the default lower-right corner every time.
- Participant-request Toolbox imports now structure visible group/friend clues, visible questions, unanswered-question state, and profile/background hints before the raw card lines, so early user analysis is less dependent on manually scanning the entire imported card dump.
- The popup no longer duplicates the Facebook **Send queued** / **Release stuck** controls because those actions already exist on the ingest page, and participant-request rescans now also happen automatically after scroll/load-more settle plus a light timer fallback.
- The participant helper is now simpler in the actual Facebook card UI: it keeps only **Show card** and **Analyze user**, defaults to a docked top-right panel instead of dropping low on the screen, and `Analyze user` now opens a verify-style analysis box rather than the full Toolbox composer.
- Participant-side verification no longer hard-stops just because OpenAI web search fails: verify-mode requests now retry once without web search and degrade to an explicit independent-verification-missing result instead of dying on the first web-search tool failure.
- Verify-fact flows no longer pretend a result was independently verified when the backend marked real web search as required but OpenAI did not actually use the web-search tool; those results now come back as an explicit independent-verification-missing outcome instead.
- Background logging and Tools-side Facebook runtime-setting refreshes now write much less aggressively to Chrome extension storage, which reduces `MAX_WRITE_OPERATIONS_PER_MINUTE` quota failures in the background worker.
- The Facebook `participant_requests` helper now searches a much wider DOM range, skips the bulk-action toolbar more reliably, and therefore attaches its per-card **Analyze in Toolbox** / **Verify facts** controls more consistently on the current Facebook participant-request layout.
- Participant-request **Analyze in Toolbox** / **Verify facts** actions now also anchor themselves to the detected request card, so the Toolbox/fact box opens beside the correct Facebook card instead of drifting back to a generic page corner.
- The saved Tools-side checkbox state for the Facebook admin activity / participant-request switches is now normalized again when the Facebook Admin Tools page loads, so a remotely enabled switch no longer appears visually unchecked just because the page markup drifted.
- The Facebook admin-activity and participant-request helpers now re-read the authoritative Tools-side master switches on init, route changes, and settings sync instead of staying stuck on stale local cache values, so `/groups/*/participant_requests` can actually light up when the Tools-side scanner is enabled and the admin helper stays quiet when the Tools master switch is off.
- Facebook admin activity **Send queue now** no longer depends only on a fragile background-runtime handoff. If the extension runtime is temporarily unavailable or times out, the page queue now retries the same bulk send directly against Tools with the saved bearer token instead of leaving the batch stuck in pending retry.
- Facebook admin queue controls now expose clearer remote-send progress/stuck state and use hard timeouts in the popup, content script, and background worker instead of leaving the operator-facing buttons hanging indefinitely while one runtime hop is waiting forever.
- Participant-request user-analysis loading is more interactive: the result box cycles through visible-card/question/preview/Graph/AI steps instead of only showing a static “Checking now…” line.

## 1.2.16 - 2026-04-15

### Added
- SocialGPT AI requests now send additive client metadata (`client_name`, `client_version`, `client_platform`) so the Tools backend can identify which extension build generated each request.

### Changed
- The extension now ships as version `1.2.16`.
- Tools-side SocialGPT replies are now allowed to disclose the currently used AI model identifier and the client version when a user explicitly asks for version/model information.

### Fixed
- Popup **Open Toolbox in active tab** is now frame-aware again: instead of relying on whichever content-script frame answered first, the background worker now inspects all injected frames and routes the request to the most relevant one (existing Toolbox frame, selected-text frame, focused editable frame, otherwise top frame).
- Right-click **Open Toolbox** and **Verify fact** actions now use the same frame-aware routing, which makes them much more reliable on iframe-heavy or app-like pages where the useful editor/selection is not in the top document.

### Security
- Tools-side guardrails now explicitly block attempts to extract Tools internals such as source code, hidden prompts, `.env` values, tokens, passwords, or similar secrets from SocialGPT replies.
- When a SocialGPT request matches those secret-exfiltration patterns, Tools can report the incident to the configured support email address for follow-up.

## 1.2.15 - 2026-04-05

### Fixed
- Reply language selection now works independently from the popup/config UI language again, so choosing English, Danish, Norwegian, German, French, or Spanish no longer gets silently pulled back toward Swedish just because the browser UI is Swedish.
- Runtime UI translations no longer rewrite editable responder-profile or test-question textareas with localized defaults, which had started contaminating stored AI prompt content for some users.
- Existing users who were affected by the accidental Swedish default responder-profile text now get an automatic client-side repair path when the extension loads their settings.

### Changed
- The built-in default responder profile and test question are now kept as stable canonical English defaults, while the surrounding popup/config labels can still be localized normally.
- Popup and config page now expose a separate **Extension language** selector (`Auto` / `English` / `Swedish`) so UI translation is explicitly independent from **Answer language** and **Verify-fact language**.
- The SocialGPT on-page UI now follows that same extension-language setting too, including Toolbox chrome, floating action buttons, fact-check result actions, and the background context-menu labels.

## 1.2.14 - 2026-04-05

### Changed
- The extension options/config page now mirrors the same editable settings as the popup instead of staying a scaffold with placeholder notes.
- The three main cards on the config page now expose the same token, environment, responder defaults, test question, reset flow, and dev debug console behavior as the popup.
- The stale companion-module wording about `sc4a-insights` was removed from the config page so the page no longer suggests a removed settings direction.
- Popup and config page UI copy now localize dynamically at runtime, with Swedish automatically used when the browser UI language is Swedish and English kept as fallback.
- Bearer-token fields in both popup and config page now show an inline validation spinner and a clear accepted/rejected confirmation while the token is checked against Tools.
- The popup now also includes an **Open Toolbox in active tab** shortcut so Toolbox can be opened even on pages where the normal right-click/context-menu flow is unreliable.
- If the page already has a live text selection when the popup shortcut is used, the extension now imports that selection directly into Toolbox instead of opening an empty panel.
- Toolbox mark mode can now stay in the old compact `[1]`, `[2]` format by default while the config page exposes a new advanced section for richer mark labels and broader DOM extraction.
- Advanced mark-mode users can now add generated mark ids (for example `tn-mark-2`), richer element descriptors, and optional `one parent up` / `one parent up + direct child scan` context expansion without changing the default workflow for everyone else.
- Advanced mark-mode extraction now also supports pulling in the **whole current frame/document text**, which is especially useful on iframe-backed/app-like pages when one small DOM block is too thin.
- When a richer mark-label mode is enabled, marked elements now also show a visible on-page badge while they are active, which makes it easier to map a selected DOM block back to the context shown in the Toolbox.
- The Toolbox panel itself is now draggable from its header instead of always snapping back to the composer edge.
- Text-selection actions were hardened for double-click and timing-sensitive pages so `Open Toolbox` / `Verify fact` appear more reliably after short direct text selections.
- Content scripts now run in nested frames too (including matching `about:blank` child frames), improving iframe-heavy page support where Chrome allows injection.

### Fixed
- Mark mode no longer depends on a late page `click` alone; it now captures the target earlier, which reduces the accidental one-click shutdown/blur behavior seen on pages like WhatsApp.
- The Toolbox close `×` control now works again after the draggable-header change, instead of being swallowed by the header interaction.

### Added
- New lightweight endpoint: `GET /api/social-media-tools/extension/validate-token` for fast bearer-token verification without running an OpenAI smoke test.

## 1.2.13 - 2026-04-05

### Changed

### Notes
- This entry is backfilled to keep the release history chronological between `1.2.14` and `1.2.12`.

## 1.2.12 - 2026-04-03

### ⭐ MAJOR: Chrome Web Store Compliance Update

**This version clarifies the extension's browser-wide scope and justifies the `<all_urls>` permission for Chrome Web Store submission.**

### Fixed
- **Selected-text overlay once again shows two actions** — `Open Toolbox` is now rendered next to `Verify fact` for plain text selections, instead of only showing the verify button.
- **Selected text can be imported directly into the Toolbox again** — clicking the restored `Open Toolbox` selection button opens the panel and preloads the selected text as context.
- **Verification result popup once again includes `Open Toolbox`** — after a fact-check finishes, the result box now exposes the same follow-up handoff into Toolbox instead of only showing `Refresh` and `Dig deeper`.
- **Background message handling cleaned up after reset/recovery edits** — duplicate `chrome.runtime.onMessage` wiring was collapsed back to one active handler while keeping the SoundCloud message endpoints intact.
- **Temporary false "missing token" states reduced** — content-script token checks now fall back to the background runtime settings reader before showing bearer-token-missing messaging, which helps after reload/sync drift.
- **Reply-output flow no longer crashes with `resetReplyTransientFieldsButKeepContext is not defined`** — transient reset helpers now live in top-level scope and the panel's `Context clear` handler is properly wired again.

### Changed
- **Manifest description updated**: Now clearly states "Browser-wide AI assistant" instead of narrow platform description
- **`host_permissions` set to `["<all_urls>"]`**: Required for content script injection on all sites
- **`content_scripts.matches` set to `["<all_urls>"]`**: Core feature requires browser-wide injection
- **Documentation complete**: Added `CHROME_WEB_STORE_COMPLIANCE.md` with full CWS submission guidance
- **Submission guide added**: `CHROME_WEB_STORE_SUBMISSION.md` now documents zip packaging, reviewer notes, and upload checklist for the current build
- **README updated**: Explains why `<all_urls>` is required and not restrictable
- **README + compliance docs synchronized with the current build**: browser-wide access is static via manifest in this revision (no separate popup global-mode toggle in the current reset state)
- **This is NOT a breaking change** — the extension already worked on all sites; this just documents it honestly

### Context
The extension is a browser-wide AI assistant (like Grammarly or 1Password). It provides:
- Text selection overlays for fact-checking and Open Toolbox on ANY website
- Right-click context menus available on all pages
- AI-assisted replies across the web

This **cannot** be restricted to specific domains without breaking the product.

Chrome Web Store accepts broad `<all_urls>` permissions when:
1. ✅ The extension's purpose clearly requires browser-wide access (ours does)
2. ✅ Documentation is transparent and honest (provided)
3. ✅ API calls are scoped to specific hosts (only tools.tornevall.net/com)
4. ✅ No remote code execution (all local)

### Related Documentation
- **Before CWS submission**: Read `CHROME_WEB_STORE_COMPLIANCE.md`
- **CWS submission templates**: Ready-to-use text in `CHROME_WEB_STORE_COMPLIANCE.md`
- **Compliance checklist**: Full verification steps in `CHROME_WEB_STORE_COMPLIANCE.md`

---

## 1.2.11 - 2026-04 (historical gap marker)

### Changed
- Historical version gap backfilled: `1.2.11` appears to have existed during the browser-wide / Chrome Web Store preparation cycle, but no preserved standalone release snapshot or trustworthy full note set remains after the later reset/recovery work.
- User-visible work from that lost checkpoint is only documented here when it could be re-verified in surviving code or reintroduced explicitly in `1.2.12`.

## 1.2.10 - 2026-04 (historical gap marker)

### Changed
- Historical version gap backfilled: `1.2.10` is currently treated as an unrecoverable repository-history gap.
- No standalone changelog-grade release record survived for this tag/version in the current workspace state, so features are intentionally **not** guessed or reconstructed here without code evidence.

## 1.2.9 - 2026-03/04 (historical gap marker)

### Changed
- Historical version gap backfilled: `1.2.9` appears to have been part of the same missing sequence between the preserved `1.2.8` state and the later `1.2.12` recovery/compliance work.
- Missing pieces from that period should be treated as "unknown unless re-verified in code" rather than assumed released.

## 1.2.8 - 2026-03-18

### Changed
- SoundCloud-specific capture work is now being moved toward the dedicated `sc4a-insights` companion module so the main Social Media Tools extension can stay less explicit about SoundCloud scraping-oriented internals
- Main extension copy now points more clearly toward companion/module-based expansion instead of promising that larger SoundCloud dataset controls will live directly inside this extension

## 1.2.7 - 2026-03-18

### Added
- A dedicated extension options page now exists as a larger future configuration surface, with centralized links to the Tools dashboard and forum/community entry points
- SoundCloud capture forwarding now keeps a small in-page buffer of recent payloads so the extension can recover more useful capture context even when message timing is noisy

### Changed
- Popup/status flow was trimmed again so short-form everyday controls stay in the popup while larger configuration/help content moves toward the options page
- Background/content-script coordination around SoundCloud capture state, pending deliveries, and page bridge communication was expanded for the newer multi-frame/main-world hook setup

### Fixed
- SoundCloud insights capture got another reliability pass so GraphQL payloads from the newer injected/main-world monitor are less likely to disappear between the page bridge and the extension runtime

## 1.2.6 - 2026-03-16

### Added
- Popup settings now autosave locally as you type/change values, and Tools-backed responder settings autosync automatically when a personal bearer token is present
- A dedicated shared SoundCloud page bridge now owns SoundCloud status/capture forwarding, reducing some SoundCloud-specific weight inside the main content script

### Changed
- SoundCloud auto-ingest is now opt-in by default and must be enabled explicitly from the popup before supported insights captures are pushed into Tools
- Several internal extension file names now use a more consistent kebab-case convention for shared helpers, the injected monitor, and the main content script entry

## 1.2.5 - 2026-03-15

### Added
- The reply/composer panel now includes explicit `Paste into field` and `Paste + Send` actions so generated text can be pushed back into the currently selected editor
- The public/admin Tools services page now includes a compact Social Media Tools card alongside the existing navbar/dashboard entry points

### Changed
- The floating composer CTA now uses a more generic `Fill in with Tools` label instead of reply-specific wording
- The floating composer CTA can now be dragged away from the active field and double-clicked to snap back to its anchored position
- Generated output now tries to auto-fill the active composer on supported platforms, while Facebook stays on a safer paste-first/manual-submit flow
- Generic nearby parent/sibling thread context is now gathered for non-Facebook editors to give the AI more visible discussion context when available

## 1.2.4 - 2026-03-12

### Changed
- README and popup/dashboard copy were refreshed again to better reflect the broader Social Media Tools scope rather than a Facebook-only responder

## 1.2.3 - 2026-03-12

### Changed
- User-facing work from that checkpoint was consolidated into the subsequent `1.2.4` stabilization cut

## 1.2.2 - 2026-03-12

### Added
- Facebook reply fields now get a cleaner thread-aware context, with cached XHR/GraphQL comment hints used when available

### Changed
- The reply panel now remembers the latest reply prompt and uses a better default prompt for repeated reply workflows

### Fixed

## 1.2.1 - 2026-03-11

### Added

### Fixed
- Popup settings/test errors are now rendered as real validation or API messages instead of `[object Object]`
- Empty Tools-backed behavior/system-prompt values no longer wipe the extension prompt field
- Content script now fails quietly when an old page instance survives an extension reload and hits `Extension context invalidated`

### Changed
- The personal `tools_ai_bearer` token is surfaced from the Social Media Tools dashboard as well as My API Keys
- The Tools dashboard now includes an editor for responder name, behavior/personality, auto-detect, and default mood values used by the extension
- The popup Test button is now a real end-to-end Tools → OpenAI smoke test instead of a token-only readiness check
- Tools personalization now supports a responder profile plus a larger custom-instruction block, and the interactive test uses a user-entered question
- README was rewritten as a standalone Chrome extension guide and no longer mixes in Laravel/backend repo instructions

## 1.2.0 - 2026-03-11

### Added
- Dev/beta environment toggle for `tools.tornevall.com`
- Popup test endpoint flow for validating bearer token + global `provider_openai`
- Dev-only popup debug console backed by service-worker logs
- Schema-aware backend settings store for extension user settings

### Changed
- Rebranded extension UI to **Tornevall Networks Social Media Tools**
- Moved responder name and behavior/personality persistence to Tools backend
- Improved popup messaging around personal bearer tokens and Tools-host selection
- Updated manifest description and README to reflect the broader Tools scope

### Fixed
- Prevented extension settings API from failing with HTTP 500 when the expanded settings columns are not yet present
- Made AI settings lookup compatible with both the legacy and expanded social-media-settings schema

