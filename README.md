# Tornevall Networks Social Media Tools

`Tornevall Networks Social Media Tools` is a standalone Chrome extension for Tools-backed reply assistance and Facebook admin activity workflows.

## What it does

The extension currently focuses on three things:

- Tools-authenticated AI replies from the browser
- per-user responder settings loaded from Tools
- optional Facebook group `admin_activities` statistics submission

## Server targets

The popup can target either of these servers:

- Production: `https://tools.tornevall.net`
- Dev / beta: `https://tools.tornevall.com`

## Install / load the extension

1. Open `chrome://extensions`
2. Enable **Developer mode**
3. Click **Load unpacked**
4. Select the `socialgpt-chrome` folder

## First-time setup

1. Open the extension popup
2. Generate a personal bearer token in Tools
3. Paste the token into the popup
4. Optionally enable **Use dev / beta server**
5. Click **Test Tools → OpenAI**
6. Save your responder settings

## Popup usage

The popup is used for:

- bearer token setup
- responder name
- auto-detecting your Facebook name
- quick responder profile editing
- testing the Tools → OpenAI connection

The reply panel model selector is fetched automatically from Tools.
It does **not** call OpenAI directly from the extension.
Instead, Tools queries the provider model catalog server-side, filters it to chat-usable models, and returns the effective list for the current bearer token/config.

For more advanced settings, use the dashboard link in the popup.

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
