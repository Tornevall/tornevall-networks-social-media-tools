# Changelog

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

