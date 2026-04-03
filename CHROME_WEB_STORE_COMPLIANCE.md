# Chrome Web Store Compliance Documentation

**Extension:** Tornevall Networks Social Media Tools  
**Version:** 1.2.12  
**Manifest Version:** MV3

---

## SUMMARY: What Chrome Requires & What We Have

### What We Claim (in manifest & description)
- ✅ **Browser-wide extension** — works on ALL websites (`<all_urls>`)
- ✅ **Clear single purpose** — AI replies, fact-checking, selected-text overlays
- ✅ **Limited API communication** — only `tools.tornevall.net` and `tools.tornevall.com`
- ✅ **No remote code** — all JavaScript bundled locally
- ✅ **User-activated** — requires personal bearer token to use

### What Chrome Web Store Accepts
✅ **YES, Chrome ACCEPTS broad `<all_urls>` permissions when:**

1. **Extension's purpose clearly requires browser-wide access**
   - ✅ Ours does: "Text selection overlays, fact-checking, and AI replies on any website"

2. **Documentation is transparent and honest**
   - ✅ We describe EXACTLY what we do and WHY we need broad access
   - ✅ We don't pretend to be narrowly-scoped when we're not

3. **API calls are scoped to specific hosts**
   - ✅ All calls go ONLY to `tools.tornevall.net` (production) or `tools.tornevall.com` (dev)
   - ✅ No calls to arbitrary external services

4. **No remote code execution**
   - ✅ All JavaScript is bundled locally
   - ✅ No `eval()`, no dynamic script loading from the web
   - ✅ No hidden network calls

5. **Users must opt-in**
   - ✅ Requires a valid personal bearer token to activate AI features
   - ✅ If no token, the overlay/fact-check UI is present but inactive

---

## Chrome Web Store Text Template

### For "Single Purpose Statement" (required in CWS submission form)

```
Tornevall Networks Social Media Tools is a browser-wide AI assistant 
and fact-checking companion. It provides:

- Text selection overlays for "Verify fact" and "Open Toolbox" on any webpage
- Right-click context menu items available on all sites
- AI-assisted replies powered by the Tornevall Networks Tools platform
- Optional platform-specific features for Facebook (admin activity capture) 
  and SoundCloud (insights capture)

All AI processing is server-side via the Tornevall Networks Tools backend.
The extension requires a personal bearer token to activate AI features.
```

### For "Permissions Justification" (required in CWS submission form)

```
HOST PERMISSIONS — <all_urls>
Why: The extension's core purpose is to provide text selection overlays, 
context menu items, and AI reply controls on ANY website the user visits. 
This requires content script injection and DOM access across all sites.

PERMISSIONS — activeTab
Why: Allows the extension to temporarily access the active tab for 
context menu interactions.

PERMISSIONS — contextMenus
Why: Provides right-click context menu entries ("Open Toolbox", 
"Verify fact") available on any page.

PERMISSIONS — scripting
Why: Allows dynamic content script injection when needed for context 
menu fallback scenarios.

PERMISSIONS — storage
Why: Stores user settings (token, preferences, model selection) locally 
in extension storage.
```

### For "Privacy & Security" (required in CWS submission form)

```
DATA HANDLING:
- The extension stores user's personal bearer token locally in extension storage
- No user data is transmitted except API requests to tools.tornevall.net
- All local settings (responder name, language prefs, etc.) are stored locally
- No data is sold, shared, or used for advertising

REMOTE CODE:
This extension does NOT execute remote code. All JavaScript files are 
bundled locally in the extension package.

API COMMUNICATION:
The extension communicates ONLY with:
- https://tools.tornevall.net (production Tornevall Tools platform)
- https://tools.tornevall.com (development/beta Tornevall Tools platform)

All communication requires the user's personal bearer token (authentication).
The extension never makes unauthenticated requests or calls to third-party APIs.
```

---

## Specific Answers to CWS Reviewer Questions

### Q: "Why does your extension need to run on ALL websites?"

**Answer:**
The extension's core feature is an AI-powered fact-checking and reply assistant 
that activates on selected text. Users should be able to:
- Select text on ANY website
- Right-click anywhere and choose "Open Toolbox" or "Verify fact"
- Get AI replies in any text field

This requires the content script to be injected on all pages. We cannot predict 
which websites a user will visit or want to fact-check, so we must inject on `<all_urls>`.

### Q: "How do you justify broad site access when most extensions are narrower?"

**Answer:**
Our extension is a browser-wide AI assistant, similar to:
- Grammarly (content editing on all sites)
- 1Password (password manager on all sites)
- uBlock Origin (ad-blocking on all sites)

These extensions legitimately require `<all_urls>` because their purpose is 
cross-site. Ours is the same: browser-wide AI assistance.

We do NOT restrict access to specific sites because that would break the product.

### Q: "How can users trust you with such broad access?"

**Answer:**
1. **Transparency**: We're explicit that we work on all sites
2. **Limited API surface**: All network calls go to TWO specific hosts (tools.tornevall.net, tools.tornevall.com)
3. **User control**: The extension requires a personal bearer token — it does nothing without user setup
4. **No hidden activity**: All activity is visible in the overlay and context menus
5. **Open source ready**: The code is auditable (can be provided upon request)

---

## What NOT to Do (Common Mistakes That Get Extensions Rejected)

❌ **DON'T:**
- Restrict `content_scripts.matches` to a fake narrow allowlist if your product actually needs broad access
- Claim narrow scope in CWS but use broad scope in the code
- Make hidden API calls to services not disclosed in documentation
- Store user data without permission or disclose where it goes
- Use misleading language ("works on selected sites" when it works on all sites)

✅ **DO:**
- Be honest about what the extension does
- Explain WHY broad access is necessary
- Document ALL external services you call
- Be transparent about data storage
- Let the code match the description

---

## Our Compliance Checklist

- ✅ Manifest description is HONEST (says "browser-wide")
- ✅ `content_scripts.matches` is `["<all_urls>"]` (matches our actual scope)
- ✅ `host_permissions` is LIMITED to Tools APIs only
- ✅ No `eval()`, no dynamic script loading
- ✅ All JavaScript is local/bundled
- ✅ No hidden network calls
- ✅ User must provide bearer token (requires setup)
- ✅ Clear documentation provided

---

## Submission Checklist for Chrome Web Store

When submitting to CWS, ensure you:

1. **Fill out the "Single Purpose Statement" form field**
   - Copy the template above into the CWS form

2. **Fill out the "Permissions Justification" form field**
   - Copy the template above into the CWS form

3. **Fill out the "Privacy & Security" form field**
   - Copy the template above into the CWS form

4. **Provide this document** if the reviewer asks "why do you need `<all_urls>`?"
   - Reference this file: "See CHROME_WEB_STORE_COMPLIANCE.md in the extension repo"

5. **Screenshot examples** (optional but helpful):
   - A screenshot showing the extension on a random website (like example.com)
   - A screenshot showing text selection and the floating "Verify fact" button
   - A screenshot showing the context menu

---

## Expected Timeline

- ✅ **Submission ready**: Yes (all documentation complete)
- ⏳ **CWS review time**: 1-7 days typically (can be longer if clarifications needed)
- ✅ **Risk of rejection**: LOW (we're transparent and legitimate)
- ✅ **Risk of getting approved**: HIGH (honest description + limited API surface)

---

## Questions? Contact CWS Support

If CWS reviewers ask for clarification, respond with:

> "The extension is a browser-wide AI assistant (like Grammarly or 1Password). 
> It requires `<all_urls>` to inject content scripts for text selection overlays 
> and context menus on any website. All API communication is scoped to 
> tools.tornevall.net and tools.tornevall.com only. See CHROME_WEB_STORE_COMPLIANCE.md 
> for detailed documentation."

---

## Final Word

**Your extension is CWS-compliant BECAUSE you're honest about scope.**

Many rejections happen when extensions claim narrow scope but actually need broad access. 
You're doing the opposite: being transparent from the start. That's why CWS will accept you.

✅ **Submit with confidence.**

