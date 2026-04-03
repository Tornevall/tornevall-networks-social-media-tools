# Chrome Web Store compliance documentation

**Extension:** Tornevall Networks Social Media Tools
**Version:** 1.2.12
**Manifest version:** MV3

---

## Purpose of this document

This file is included as package documentation for the extension.
It explains the extension's browser-wide scope, manifest choices, permissions, storage, and remote communication model so that the implementation, README, and Chrome Web Store submission material stay aligned.

---

## Product scope

Tornevall Networks Social Media Tools is a browser-wide AI assistant and fact-checking companion for Chrome.

The extension is intended to work across many websites. That is a deliberate product decision.
It is not a narrowly site-limited extension in product scope.

Core browser-wide capabilities include:

* text-selection overlays such as "Verify fact" and "Open Toolbox"
* context menu actions available on arbitrary websites
* AI-assisted reply and page-context workflows tied to page content and editable fields
* platform-specific features for Facebook, SoundCloud, X, and similar supported modules where relevant

Because those browser-wide overlay and fact-checking features must remain available on arbitrary sites, the extension architecture depends on broad content script coverage.

---

## Manifest and permission model

### Browser-wide content script coverage

The extension currently relies on browser-wide content script availability.
That means `content_scripts.matches` must remain on `"<all_urls>"` for the current architecture.

Reason:
Restricting content script matches to a narrow allowlist would remove the browser-wide overlay, selected-text actions, and related UI from non-listed sites, which would break the core product behavior.

### Host access

The extension may use a mix of:

* API-specific host permissions for Tornevall Networks Tools endpoints
* browser-wide content script matching where required by the UI architecture
* optional or activation-tied broader access where supported by the implementation

The important rule is that the manifest, runtime behavior, and documentation must describe the same real product.

### Core extension permissions

The extension uses these core permissions:

* `activeTab` - temporary access to the active tab for user-triggered interactions
* `contextMenus` - right-click actions such as "Open Toolbox" and "Verify fact"
* `scripting` - runtime injection and related script operations where needed
* `storage` - local extension settings and runtime preferences

If the current implementation keeps `content_scripts.matches` on `"<all_urls>"`, that must be documented honestly instead of being hidden behind a fake narrow description.

---

## Why browser-wide access is needed

The extension is designed to let the user work with arbitrary page content.
Typical browser-wide use cases include:

* selecting text on any website and verifying the claim
* opening Toolbox actions from selected text on any page
* using AI assistance in editable text fields across many sites
* attaching lightweight on-page UI tied to current page context

The extension cannot predict in advance which sites a user will want to inspect, verify, respond on, or analyze.
For that reason, broad site coverage is part of the actual product design.

This is not meant to describe passive surveillance.
It describes browser-wide user-facing functionality that depends on content script presence on arbitrary sites.

---

## Remote code statement

This extension does not download and execute remote hosted code.

All executable JavaScript used by the extension is bundled in the extension package.
Remote communication is limited to HTTPS API requests used for account-linked functionality and server-side processing.

This distinction matters:

* remote API communication is used
* remote executable extension code is not used

---

## API communication

The extension is designed to communicate only with the Tornevall Networks Tools endpoints used by the product.
These include:

* `https://tools.tornevall.net`
* `https://tools.tornevall.com`

These requests are used for functionality such as:

* server-side AI processing
* bearer token validation or account-linked setup
* settings-related extension workflows
* optional statistics or reporting flows where implemented

This document should be kept in sync with the actual implementation.
If additional external services are introduced later, they must also be documented.

---

## User activation model

The extension is user-facing and account-linked.
AI-related functionality depends on the user's own Tornevall Networks Tools bearer token.

That means:

* the extension requires user setup before AI-backed features can be used
* browser-wide UI may be visible according to the current architecture
* AI processing itself is tied to explicit user interaction and token-backed activation

If token-dependent or checkbox-dependent activation exists in the popup, that must be reflected consistently in both public documentation and Chrome Web Store submission text.

---

## Storage

The extension uses Chrome extension storage for settings and runtime preferences.
Depending on implementation, this may include:

* `chrome.storage.sync`
* `chrome.storage.local`
* `chrome.storage.session`

Typical stored values can include:

* bearer token
* environment flag such as dev or production mode
* responder and language preferences
* model preferences
* temporary session-specific runtime state
* platform-specific pending or optional statistics data when relevant

Storage descriptions must always match the actual code.
If the implementation changes, this document must be updated accordingly.

---

## Platform-specific features

In addition to browser-wide AI assistance, the extension may include platform-specific modules.
Examples already present in the product direction include:

* Facebook admin activity workflows
* SoundCloud insights capture
* X or Twitter-specific tooling

These features should be described as platform-specific additions on top of the browser-wide core, not as the whole product.

---

## Documentation rules

This document is intended to support package-level documentation and Chrome Web Store preparation.
It should therefore remain:

* technically honest
* consistent with the manifest
* consistent with runtime behavior
* consistent with README and submission text
* free from claims of guaranteed approval or speculative review outcomes

Do not write things like:

* "Chrome will accept this"
* "risk of rejection is low"
* "submit with confidence"

Those are not implementation facts and do not belong in package documentation.

---

## What this document is for

This file can be used as a source for:

* internal package documentation
* README alignment
* Chrome Web Store privacy and permission explanations
* reviewer clarification if questions arise about browser-wide scope

It is not a guarantee of approval.
It is a technical explanation of why the extension is structured the way it is.

---

## Maintenance note

If any of the following change, this file must be updated at the same time:

* `manifest.json`
* `content_scripts.matches`
* `host_permissions`
* `optional_host_permissions`
* external API endpoints
* storage usage
* popup activation logic
* browser-wide overlay behavior

The goal is simple: code, manifest, README, and package documentation must all describe the same real extension.
