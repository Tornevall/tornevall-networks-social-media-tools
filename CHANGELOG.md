# Changelog

## 1.2.5 - 2026-03-15

### Added
- The reply/composer panel now includes explicit `Paste into field` and `Paste + Send` actions so generated text can be pushed back into the currently selected editor
- The public/admin Tools services page now includes a compact Social Media Tools card alongside the existing navbar/dashboard entry points

### Changed
- The floating composer CTA now uses a more generic `Fill in with Tools` label instead of reply-specific wording
- The floating composer CTA can now be dragged away from the active field and double-clicked to snap back to its anchored position
- Generated output now tries to auto-fill the active composer on supported platforms, while Facebook stays on a safer paste-first/manual-submit flow
- Generic nearby parent/sibling thread context is now gathered for non-Facebook editors to give the AI more visible discussion context when available

## 1.2.2 - 2026-03-12

### Added
- Facebook admin-activity network capture now extracts detected activity rows from the GraphQL/XHR payload and can mirror those detections to DevTools when debug diagnostics are enabled
- Facebook admin-activity pages now show passive reportable-entry previews even before statistics submission is enabled
- Facebook reply fields now get a cleaner thread-aware context, with cached XHR/GraphQL comment hints used when available

### Changed
- Facebook admin-activity submission now queues entries locally and uploads them to Tools in bulk instead of one HTTP request per detected row
- The inline Facebook statistics overlay is now draggable so it can be moved away from Facebook controls on the right side of the page
- Facebook activity interpretation now has clearer Swedish + English fallback matching for approval, rejection, removal, blocking, revocation, edit, and publish-style actions
- The reply panel now remembers the latest reply prompt and uses a better default prompt for repeated reply workflows

### Fixed
- Re-enabled practical Facebook admin-activity submission by basing the upload flow on detected XHR/GraphQL batches instead of relying only on visible DOM rows
- Automatic moderation entries without a human actor name can now still be stored safely in Tools using an automatic-moderation fallback actor
- The injected XHR monitor no longer throws `InvalidStateError` when Facebook uses binary `XMLHttpRequest.responseType` values such as `arraybuffer`

## 1.2.1 - 2026-03-11

### Added
- Inline diagnostics on Facebook `admin_activities` pages showing monitor state plus recent XHR/fetch summaries for admin-log capture
- Interesting Facebook admin-log network events are now mirrored into Chrome DevTools console with a clear `TN Social Tools` prefix
- Startup diagnostics now log the loaded extension version and whether the current Facebook route matched `admin_activities`

### Fixed
- Popup settings/test errors are now rendered as real validation or API messages instead of `[object Object]`
- Empty Tools-backed behavior/system-prompt values no longer wipe the extension prompt field
- Content script now fails quietly when an old page instance survives an extension reload and hits `Extension context invalidated`
- Facebook activity submission no longer crashes the Tools backend on missing `Illuminate\Support\Str` import during outcome normalization
- Facebook activity submission now runs through the extension service worker instead of direct page fetch, avoiding Facebook-origin CORS failures

### Changed
- Social Media Tools now opens directly into the Facebook dashboard while Facebook is the only active module
- The personal `tools_ai_bearer` token is surfaced from the Social Media Tools dashboard as well as My API Keys
- Facebook dashboard copy now clearly separates the Tools AI token from the Facebook-only ingest token
- The Tools dashboard now includes an editor for responder name, behavior/personality, auto-detect, and default mood values used by the extension
- The popup Test button is now a real end-to-end Tools → OpenAI smoke test instead of a token-only readiness check
- Tools personalization now supports a responder profile plus a larger custom-instruction block, and the interactive test uses a user-entered question
- Facebook ingest can now use the personal `tools_ai_bearer` token, making the dedicated ingest token optional
- Facebook admin dashboard defaults are easier to spot, and the popup dashboard reference is now shorter and less repetitive
- Facebook `admin_activities` detection is now rechecked during SPA-style URL changes so the page overlay appears more reliably
- Facebook `admin_activities` overlay now uses one `Enable activity statistics` control, and the noisy fetch/XHR diagnostics are hidden unless dev / beta mode is enabled
- README was rewritten as a standalone Chrome extension guide and no longer mixes in Laravel/backend repo instructions
- Facebook admin debug diagnostics now use a separate explicit popup opt-in instead of piggybacking on dev / beta server mode

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

