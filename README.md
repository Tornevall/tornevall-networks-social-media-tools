# Tornevall Networks Social Media Tools

Tornevall Networks Social Media Tools is the Chrome extension companion for the Tools platform.

The extension is no longer just a local "SocialGPT" popup. It now targets the Tools backend for:

- personal bearer-token authentication
- environment switching between production and dev/beta
- server-side storage of responder name and behavior/personality
- server-side personalization with responder profile + custom instructions
- server-side OpenAI execution
- future admin/statistics ingestion workflows

## Environments

The popup can switch between these backends:

- Production: `https://tools.tornevall.net`
- Dev / beta: `https://tools.tornevall.com`

The AI gateway currently uses the legacy endpoint path:

- `POST /api/ai/socialgpt/respond`

That path is still intentional for compatibility, even though the extension branding has been updated.

## Current popup flow

1. Register at `tools.tornevall.net`
2. Generate a **personal bearer token** in Tools
3. Paste the token into the extension popup
4. Optionally enable **Use dev / beta server** to target `tools.tornevall.com`
5. Click **Test Tools → OpenAI** to verify:
   - that the bearer token resolves to a Tools user
   - that the token is personal / user-bound
   - that Tools can load your saved responder profile and custom instructions
   - that a live OpenAI response comes back through the Tools backend
6. Enter or adjust:
   - responder name
   - custom instructions
   - auto-detect responder name
7. Click **Save Settings** to persist those values in Tools

The same personal Tools AI bearer token is also surfaced from the Social Media Tools dashboard inside Tools, so users do not have to visit only the My Keys page to rotate it.
The Tools dashboard also exposes the full extension personalization model: responder name, responder profile, custom instructions, and default mood/custom mood used to prefill the reply panel.
The same personal Tools bearer token can also be used for Facebook admin-log ingest; the dedicated Facebook ingest token is optional.

## Facebook admin activities

On Facebook group `admin_activities` pages, the extension can:

- passively watch page/network activity
- show an inline control for `scrape → submit`
- submit currently visible entries to Tools when explicitly enabled

This keeps the page-side ingest workflow visible without requiring the popup for every action.

## Storage model

The extension keeps a lightweight local cache for convenience, but Tools is the primary source of truth.

Stored in Tools:

- `responder_name`
- `persona_profile`
- `custom_instruction`
- `system_prompt`
- `auto_detect_responder`
- generic JSON settings payload for the extension feature

Stored locally in Chrome:

- bearer token
- current environment flag (`devMode`)
- last synced responder/system prompt values for UI fallback

## Dev/debug support

When dev mode is enabled, the popup exposes a small debug console backed by the extension service worker logs.

This is useful for checking:

- token/authentication failures
- Tools API failures
- AI request/response lifecycle
- which environment the extension is currently using

On Facebook `admin_activities` pages, the extension also shows a small inline monitor status with recent XHR/fetch summaries and mirrors interesting events into Chrome DevTools console so it is easier to confirm that page-side capture is alive before enabling submit. Startup diagnostics use the `TN Social Tools` console prefix and include the loaded extension version plus whether the current route matched `admin_activities`.

## Backend expectations

- The bearer token must be personal and tied to a user account.
- OpenAI execution happens from Tools, not directly in the browser.
- The active OpenAI key is resolved from Tools using `provider_openai` with `global=true`.
- Extension user settings must work against both the original settings schema and the expanded generic platform/feature schema.

## Quick verification

From the extension project directory:

```bash
node --check js/background.js
node --check js/popup.js
node --check js/contentScript.js
```

From the Laravel project root:

```bash
php artisan migrate:status --no-ansi
php -l app/Http/Controllers/Api/SocialMediaExtensionApiController.php
php -l app/Http/Controllers/AiGatewayController.php
php -l app/Services/SocialMedia/SocialMediaToolSettingsStore.php
```
