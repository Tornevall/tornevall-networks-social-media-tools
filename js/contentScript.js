let markedElements = [], isClickMarkingActive = false, panel, activeComposer = null, composerActionButton = null, adminActivitiesControl = null;
let frontResponserName = '';

const EDITABLE_SELECTOR = 'textarea,input[type="text"],input:not([type]),[contenteditable=""],[contenteditable="true"],[role="textbox"]';
const TOOLS_PROD_BASE_URL = 'https://tools.tornevall.net';
const TOOLS_DEV_BASE_URL = 'https://tools.tornevall.com';
const FACEBOOK_INGEST_PATH = '/api/social-media-tools/facebook/ingest';
const ADMIN_ACTIVITY_KEYWORDS = ['admin', 'activity', 'log', 'godk', 'approved', 'approve', 'avvis', 'rejected', 'reject', 'declined', 'request', 'participate', 'förfrågan', 'removed', 'tagit bort', 'deleted', 'delete', 'revoked', 'återkall', 'blocked', 'block', 'banned', 'ban', 'spam', 'member', 'pending post', 'comment', 'automatiskt', 'automatically', 'published', 'group'];
const IGNORED_LINK_TEXTS = ['gilla', 'svara', 'svara som', 'kommentera', 'dela', 'visa alla', 'visa fler svar', 'like', 'reply', 'share', 'comment', 'send', 'gif'];
const MAX_RECENT_NETWORK_EVENTS = 8;
const MAX_ADMIN_BATCH_SIZE = 50;
const ADMIN_PANEL_POSITION_STORAGE_KEY = 'tn_social_tools_admin_panel_position';
const MAX_RECENT_FACEBOOK_COMMENT_ENTRIES = 200;
const DEFAULT_REPLY_PROMPT = 'Write a concise reply that fits the thread and handles the recipient appropriately.';
const FACEBOOK_REPLY_NOISE_LINES = ['most relevant', 'mest relevant', 'like', 'reply', 'share', 'comment', 'send', 'gif', 'gilla', 'svara', 'dela', 'kommentera', 'skicka'];

let extensionContextAvailable = true;
let locationWatchIntervalId = null;

function isContextInvalidatedError(error) {
    const message = error && error.message ? String(error.message) : String(error || '');
    return message.toLowerCase().indexOf('extension context invalidated') !== -1;
}

function handleExtensionContextInvalidated(error) {
    if (!extensionContextAvailable) {
        return;
    }

    extensionContextAvailable = false;
    adminDebugEnabled = false;

    if (locationWatchIntervalId) {
        window.clearInterval(locationWatchIntervalId);
        locationWatchIntervalId = null;
    }

    if (typeof console !== 'undefined' && console.warn) {
        console.warn('[TN Social Tools] Extension context invalidated. Reload the page after reloading the extension.', {
            error: error && error.message ? error.message : String(error || 'Unknown error'),
            url: location.href,
        });
    }
}

function safeChromeCall(action, fallback) {
    if (!extensionContextAvailable) {
        return fallback;
    }

    try {
        return action();
    } catch (error) {
        if (isContextInvalidatedError(error)) {
            handleExtensionContextInvalidated(error);
            return fallback;
        }

        throw error;
    }
}

function getExtensionVersion() {
    return safeChromeCall(function () {
        return chrome.runtime.getManifest().version;
    }, 'unknown');
}

function safeRuntimeGetURL(path) {
    return safeChromeCall(function () {
        return chrome.runtime.getURL(path);
    }, '');
}

function safeSendRuntimeMessage(message) {
    return safeChromeCall(function () {
        chrome.runtime.sendMessage(message);
        return true;
    }, false);
}

function safeSendRuntimeMessageWithResponse(message) {
    return new Promise(function (resolve) {
        const sent = safeChromeCall(function () {
            chrome.runtime.sendMessage(message, function (response) {
                if (chrome.runtime && chrome.runtime.lastError) {
                    if (isContextInvalidatedError(chrome.runtime.lastError)) {
                        handleExtensionContextInvalidated(chrome.runtime.lastError);
                    }
                    resolve({ok: false, error: chrome.runtime.lastError.message});
                    return;
                }

                resolve(response || {ok: false, error: 'No response from extension runtime.'});
            });
            return true;
        }, false);

        if (!sent) {
            resolve({ok: false, error: 'Extension runtime unavailable.'});
        }
    });
}

function safeStorageSyncGet(keys, callback) {
    const result = safeChromeCall(function () {
        chrome.storage.sync.get(keys, function (data) {
            if (chrome.runtime && chrome.runtime.lastError && isContextInvalidatedError(chrome.runtime.lastError)) {
                handleExtensionContextInvalidated(chrome.runtime.lastError);
                callback({});
                return;
            }

            callback(data || {});
        });
        return true;
    }, false);

    if (!result) {
        callback({});
    }
}

function safeStorageSyncSet(values, callback) {
    return safeChromeCall(function () {
        chrome.storage.sync.set(values, function () {
            if (chrome.runtime && chrome.runtime.lastError && isContextInvalidatedError(chrome.runtime.lastError)) {
                handleExtensionContextInvalidated(chrome.runtime.lastError);
            }
            if (typeof callback === 'function') {
                callback();
            }
        });
        return true;
    }, false);
}

function safeAddRuntimeMessageListener(handler) {
    return safeChromeCall(function () {
        chrome.runtime.onMessage.addListener(handler);
        return true;
    }, false);
}

function safeAddStorageChangeListener(handler) {
    return safeChromeCall(function () {
        chrome.storage.onChanged.addListener(handler);
        return true;
    }, false);
}

const EXTENSION_VERSION = getExtensionVersion();

let adminIngestEnabled = false;
let adminDebugEnabled = false;
let adminActivitiesScanScheduled = false;
let networkMonitorInjected = false;
let adminLastStatusText = 'Passive activity detection is ready. Statistics are off.';
let adminSubmittedCount = 0;
let adminNetworkEventsSeen = 0;
let adminInterestingNetworkEventsSeen = 0;
let adminDetectedEntryCount = 0;
let adminLastNetworkEventAt = 0;
let adminNetworkDebugAnnounced = false;
let lastObservedLocationHref = location.href;
let adminActivitiesControlDragState = null;
let adminActivitiesDragListenersBound = false;
let activeReplyContextMeta = null;
const discoveredAdminEntryKeys = new Set();
const pendingAdminEntries = new Map();
const submittedAdminEntryKeys = new Set();
const recentAdminNetworkEvents = [];
const facebookCommentEntryKeys = new Set();
const recentFacebookCommentEntries = [];

function debugLog(entry) {
    safeSendRuntimeMessage({
        type: 'DEBUG_LOG',
        entry: Object.assign({
            source: 'content-script',
        }, entry || {}),
    });
}

function adminDebugConsoleInfo(message, meta) {
    if (!adminDebugEnabled || typeof console === 'undefined' || !console.info) {
        return;
    }

    console.info(message, meta || {});
}

function syncAdminDebugPreference() {
    safeStorageSyncGet(['facebookAdminDebugEnabled'], function (data) {
        adminDebugEnabled = !!(data && data.facebookAdminDebugEnabled);
        updateAdminActivitiesControl();
    });
}

function normalizeWhitespace(value) {
    return String(value || '').replace(/\s+/g, ' ').trim();
}

function isFacebookPage() {
    return location.hostname.indexOf('facebook.com') !== -1;
}

function clipText(value, limit) {
    const text = String(value || '');
    if (text.length <= limit) {
        return text;
    }

    return text.slice(0, Math.max(0, limit - 1)) + '…';
}

function escapeHtml(value) {
    return String(value == null ? '' : value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function buildFacebookCommentSignature(authorName, bodyText) {
    return [normalizeWhitespace(authorName).toLowerCase(), normalizeWhitespace(bodyText).toLowerCase()].join('|');
}

function normalizeDetectedFacebookCommentEntry(entry) {
    if (!entry) {
        return null;
    }

    const authorName = normalizeWhitespace(entry.author_name || '');
    const bodyText = normalizeWhitespace(entry.body_text || '');
    if (!authorName || !bodyText) {
        return null;
    }

    return {
        key: entry.key || [entry.batch_id || '', entry.comment_id || '', authorName, bodyText].join('|'),
        batch_id: entry.batch_id || '',
        comment_id: entry.comment_id || null,
        parent_comment_id: entry.parent_comment_id || null,
        author_name: authorName,
        body_text: bodyText,
        signature: buildFacebookCommentSignature(authorName, bodyText),
        source_url: entry.source_url || location.href,
    };
}

function rememberFacebookCommentEntries(entries) {
    if (!Array.isArray(entries) || !entries.length) {
        return 0;
    }

    let added = 0;
    entries.forEach(function (entry) {
        const normalized = normalizeDetectedFacebookCommentEntry(entry);
        if (!normalized || facebookCommentEntryKeys.has(normalized.key)) {
            return;
        }

        facebookCommentEntryKeys.add(normalized.key);
        recentFacebookCommentEntries.unshift(normalized);
        added += 1;
    });

    if (recentFacebookCommentEntries.length > MAX_RECENT_FACEBOOK_COMMENT_ENTRIES) {
        const removed = recentFacebookCommentEntries.splice(MAX_RECENT_FACEBOOK_COMMENT_ENTRIES);
        removed.forEach(function (entry) {
            facebookCommentEntryKeys.delete(entry.key);
        });
    }

    return added;
}

function isInterestingAdminNetworkEvent(payload) {
    if (!payload) {
        return false;
    }

    const haystack = [
        payload.url,
        payload.pathname,
        payload.friendly_name,
        payload.operation_name,
        payload.doc_id,
        payload.request_preview,
        payload.response_preview,
        payload.variables_preview,
        payload.content_type,
    ].join(' ').toLowerCase();

    return !!payload.is_graphql
        || !!payload.mentions_activity_log
        || haystack.indexOf('admin_activities') !== -1
        || haystack.indexOf('management_activities') !== -1
        || haystack.indexOf('management_activity_log_target') !== -1
        || haystack.indexOf('groupadminactivity') !== -1
        || haystack.indexOf('activity log') !== -1
        || haystack.indexOf('moderation') !== -1;
}

function summarizeAdminNetworkEvent(entry) {
    const parts = [String((entry.transport || '?')).toUpperCase()];
    if (typeof entry.status !== 'undefined' && entry.status !== null) {
        parts.push(String(entry.status));
    }
    if (entry.is_graphql) {
        parts.push('GraphQL');
    }
    if (entry.friendly_name) {
        parts.push(entry.friendly_name);
    } else if (entry.doc_id) {
        parts.push('doc_id=' + entry.doc_id);
    } else if (entry.pathname) {
        parts.push(entry.pathname);
    }
    if (entry.duration_ms) {
        parts.push(entry.duration_ms + ' ms');
    }

    return parts.join(' · ');
}

function mirrorAdminNetworkEventToConsole(entry) {
    if (!entry || !adminDebugEnabled || typeof console === 'undefined' || !console.info) {
        return;
    }

    console.info('[TN Social Tools][admin-activities]', {
        summary: entry.summary,
        interesting: entry.interesting,
        transport: entry.transport,
        method: entry.method,
        status: entry.status,
        duration_ms: entry.duration_ms,
        pathname: entry.pathname,
        url: entry.url,
        doc_id: entry.doc_id,
        friendly_name: entry.friendly_name,
        request_preview: entry.request_preview,
        response_preview: entry.response_preview,
    });
}

function rememberAdminNetworkEvent(payload) {
    const detectedEntries = payload && Array.isArray(payload.detected_entries) ? payload.detected_entries : [];
    const entry = {
        ts: new Date().toISOString(),
        transport: payload && payload.transport ? payload.transport : 'unknown',
        method: payload && payload.method ? String(payload.method).toUpperCase() : 'GET',
        status: payload && typeof payload.status !== 'undefined' ? payload.status : 0,
        duration_ms: payload && payload.duration_ms ? payload.duration_ms : null,
        pathname: payload && payload.pathname ? payload.pathname : '',
        url: payload && payload.url ? payload.url : '',
        doc_id: payload && payload.doc_id ? payload.doc_id : '',
        friendly_name: payload && (payload.friendly_name || payload.operation_name) ? (payload.friendly_name || payload.operation_name) : '',
        is_graphql: !!(payload && payload.is_graphql),
        mentions_activity_log: !!(payload && payload.mentions_activity_log),
        request_preview: clipText(payload && payload.request_preview ? payload.request_preview : '', 240),
        response_preview: clipText(payload && payload.response_preview ? payload.response_preview : '', 240),
        detected_count: payload && typeof payload.detected_count === 'number' ? payload.detected_count : detectedEntries.length,
        detected_entries: detectedEntries,
        detected_preview: detectedEntries.slice(0, 3).map(function (detectedEntry) {
            return clipText(detectedEntry && detectedEntry.action_text ? detectedEntry.action_text : '', 120);
        }),
    };

    entry.interesting = isInterestingAdminNetworkEvent(payload);
    entry.summary = summarizeAdminNetworkEvent(entry);

    adminNetworkEventsSeen += 1;
    adminLastNetworkEventAt = Date.now();
    if (entry.interesting) {
        adminInterestingNetworkEventsSeen += 1;
    }

    recentAdminNetworkEvents.unshift(entry);
    if (recentAdminNetworkEvents.length > MAX_RECENT_NETWORK_EVENTS) {
        recentAdminNetworkEvents.length = MAX_RECENT_NETWORK_EVENTS;
    }

    return entry;
}

function getToolsBaseUrl(devMode) {
    return devMode ? TOOLS_DEV_BASE_URL : TOOLS_PROD_BASE_URL;
}

function loadAdminPanelPosition(control) {
    if (!control || typeof window.localStorage === 'undefined') {
        return;
    }

    try {
        const raw = window.localStorage.getItem(ADMIN_PANEL_POSITION_STORAGE_KEY);
        if (!raw) {
            return;
        }

        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed.top === 'number' && typeof parsed.left === 'number') {
            control.style.top = parsed.top + 'px';
            control.style.left = parsed.left + 'px';
            control.style.right = 'auto';
        }
    } catch (error) {
    }
}

function saveAdminPanelPosition(control) {
    if (!control || typeof window.localStorage === 'undefined') {
        return;
    }

    try {
        const rect = control.getBoundingClientRect();
        window.localStorage.setItem(ADMIN_PANEL_POSITION_STORAGE_KEY, JSON.stringify({
            top: Math.max(8, Math.round(rect.top)),
            left: Math.max(8, Math.round(rect.left)),
        }));
    } catch (error) {
    }
}

function clampAdminPanelPosition(control) {
    if (!control) {
        return;
    }

    const rect = control.getBoundingClientRect();
    const maxLeft = Math.max(8, window.innerWidth - rect.width - 8);
    const maxTop = Math.max(8, window.innerHeight - rect.height - 8);
    const nextLeft = Math.min(Math.max(8, rect.left), maxLeft);
    const nextTop = Math.min(Math.max(8, rect.top), maxTop);

    control.style.left = nextLeft + 'px';
    control.style.top = nextTop + 'px';
    control.style.right = 'auto';
}

function enableAdminActivitiesControlDragging(control) {
    if (!control || control.dataset.dragReady === 'true') {
        return;
    }

    const handle = control.querySelector('[data-role="drag-handle"]');
    if (!handle) {
        return;
    }

    control.dataset.dragReady = 'true';
    loadAdminPanelPosition(control);
    clampAdminPanelPosition(control);

    handle.addEventListener('mousedown', function (event) {
        if (event.button !== 0 || event.target.closest('button')) {
            return;
        }

        const rect = control.getBoundingClientRect();
        adminActivitiesControlDragState = {
            offsetX: event.clientX - rect.left,
            offsetY: event.clientY - rect.top,
        };

        event.preventDefault();
    });

    if (adminActivitiesDragListenersBound) {
        return;
    }

    adminActivitiesDragListenersBound = true;

    window.addEventListener('mousemove', function (event) {
        if (!adminActivitiesControlDragState || !adminActivitiesControl) {
            return;
        }

        adminActivitiesControl.style.left = Math.max(8, event.clientX - adminActivitiesControlDragState.offsetX) + 'px';
        adminActivitiesControl.style.top = Math.max(8, event.clientY - adminActivitiesControlDragState.offsetY) + 'px';
        adminActivitiesControl.style.right = 'auto';
        clampAdminPanelPosition(adminActivitiesControl);
    });

    window.addEventListener('mouseup', function () {
        if (!adminActivitiesControlDragState || !adminActivitiesControl) {
            adminActivitiesControlDragState = null;
            return;
        }

        clampAdminPanelPosition(adminActivitiesControl);
        saveAdminPanelPosition(adminActivitiesControl);
        adminActivitiesControlDragState = null;
    });

    window.addEventListener('resize', function () {
        if (!adminActivitiesControl) {
            return;
        }

        clampAdminPanelPosition(adminActivitiesControl);
        saveAdminPanelPosition(adminActivitiesControl);
    });
}

function mirrorAdminDetectionsToConsole(entries, networkEntry) {
    if (!adminDebugEnabled || typeof console === 'undefined' || !console.info || !entries || !entries.length) {
        return;
    }

    console.info('[TN Social Tools][admin-activities][detections]', {
        count: entries.length,
        summary: networkEntry && networkEntry.summary ? networkEntry.summary : '',
        entries: entries.slice(0, 10).map(function (entry) {
            return {
                actor_name: entry.actor_name,
                target_name: entry.target_name,
                handled_outcome: entry.handled_outcome,
                action_text: entry.action_text,
            };
        }),
    });
}

function getToolsRuntimeSettings() {
    return new Promise(function (resolve) {
        safeStorageSyncGet(['toolsApiToken', 'devMode'], function (data) {
            resolve(data || {});
        });
    });
}

function isFacebookAdminActivitiesPage() {
    return location.hostname.indexOf('facebook.com') !== -1
        && /\/groups\/[^/]+\/admin_activities/.test(location.pathname || '');
}

// ---------------------------------------------
// LOADER HANDLING
// ---------------------------------------------
function injectLoader() {
    if (!document.getElementById("socialgpt-loader")) {
        const loader = document.createElement("div");
        loader.id = "socialgpt-loader";
        loader.style.position = "fixed";
        loader.style.bottom = "10px";
        loader.style.left = "10px";
        loader.style.width = "30px";
        loader.style.height = "30px";
        loader.style.border = "4px solid transparent";
        loader.style.borderTop = "4px solid #008CBA";
        loader.style.borderRadius = "50%";
        loader.style.animation = "spin 1s linear infinite";
        loader.style.display = "none";
        loader.style.zIndex = "999999";
        document.body.appendChild(loader);

        const style = document.createElement("style");
        style.textContent = `
        #socialgpt-loader {
            position: fixed;
            bottom: 10px;
            left: 10px;
            width: 30px;
            height: 30px;
            border: 4px solid transparent;
            border-top: 4px solid #008CBA;
            border-radius: 50%;
            animation: spin 1s linear infinite;
            display: none;
            z-index: 9999;
        }
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }`;
        document.head.appendChild(style);
    }
}

function showFactResultBox(content) {
    const existing = document.getElementById('sgpt-factbox');
    if (existing) existing.remove();

    const box = document.createElement('div');
    box.id = 'sgpt-factbox';
    box.style.position = 'fixed';
    box.style.bottom = '20px';
    box.style.right = '20px';
    box.style.width = '400px';
    box.style.maxHeight = '60vh';
    box.style.overflow = 'auto';
    box.style.background = '#fff';
    box.style.border = '1px solid #ccc';
    box.style.borderRadius = '8px';
    box.style.boxShadow = '0 4px 14px rgba(0,0,0,0.2)';
    box.style.padding = '12px';
    box.style.zIndex = 2147483647;
    box.style.fontFamily = 'system-ui, sans-serif';
    box.style.fontSize = '14px';
    box.style.whiteSpace = 'pre-wrap';
    box.style.lineHeight = '1.4';

    const closeBtn = document.createElement('button');
    closeBtn.textContent = '×';
    closeBtn.style.position = 'absolute';
    closeBtn.style.top = '6px';
    closeBtn.style.right = '8px';
    closeBtn.style.border = 'none';
    closeBtn.style.background = 'transparent';
    closeBtn.style.fontSize = '18px';
    closeBtn.style.cursor = 'pointer';
    closeBtn.addEventListener('click', () => box.remove());

    const title = document.createElement('div');
    title.textContent = '✅ Fact checking via OpenAI';
    title.style.fontWeight = 'bold';
    title.style.marginBottom = '8px';
    title.style.color = '#008CBA';

    const text = document.createElement('div');
    text.textContent = content;

    box.appendChild(closeBtn);
    box.appendChild(title);
    box.appendChild(text);
    document.body.appendChild(box);
}

function showLoader() {
    const loader = document.getElementById("socialgpt-loader");
    if (loader) loader.style.display = "block";
}

function hideLoader() {
    const loader = document.getElementById("socialgpt-loader");
    if (loader) loader.style.display = "none";
}

injectLoader();

// ---------------------------------------------
// FACEBOOK NAME DETECTION
// ---------------------------------------------
function detectFacebookUserNameViaObserver(callback) {
    if (!location.hostname.includes("facebook.com")) return;
    const observer = new MutationObserver(() => {
        const name = extractFacebookUserName();
        if (name) {
            frontResponserName = name;
            observer.disconnect();
            callback(name);
        }
    });
    observer.observe(document.body, {childList: true, subtree: true});

    const name = extractFacebookUserName();
    if (name) {
        frontResponserName = name;
        observer.disconnect();
        callback(name);
    }
}

function getNestedValue(root, path) {
    return path.reduce((acc, key) => {
        if (acc === null || typeof acc === 'undefined') {
            return undefined;
        }

        return typeof acc[key] === 'undefined' ? undefined : acc[key];
    }, root);
}

function extractFacebookUserName() {
    const scripts = document.querySelectorAll('script[type="application/json"]');
    for (const script of scripts) {
        try {
            const json = JSON.parse(script.textContent);
            const name = getNestedValue(json, ['require', 0, 3, 0, '__bbox', 'require', 0, 3, 1, '__bbox', 'result', 'data', 'viewer', 'actor', 'name']);
            if (name) return name;
        } catch (e) {
        }
    }

    const img = document.querySelector('img[alt][src*="scontent"]');
    if (img && img.alt && img.alt.length > 1) return img.alt.trim();

    const spans = [].slice.call(document.querySelectorAll('span'));
    for (const span of spans) {
        const txt = span.textContent && typeof span.textContent.trim === 'function' ? span.textContent.trim() : '';
        if (txt && txt.length >= 4 && /^[A-ZÅÄÖ][a-zåäö]+(?: [A-ZÅÄÖ][a-zåäö]+)?$/.test(txt)) return txt;
    }

    return null;
}


// ---------------------------------------------
// FIND CONTEXT NODE
// ---------------------------------------------
function findFullContextNode(n) {
    return (n.closest('[data-ad-preview="message"],[data-ad-comet-preview="message"],[role="article"],article,[data-pagelet],.userContentWrapper') || n.closest('form,div') || n.parentElement);
}

function isEditableTarget(node) {
    return !!(node && typeof node.matches === 'function' && node.matches(EDITABLE_SELECTOR) && !node.closest('#sgpt-panel'));
}

function findEditableTarget(node) {
    if (!node || node.closest && node.closest('#sgpt-panel')) {
        return null;
    }

    if (isEditableTarget(node)) {
        return node;
    }

    return node.closest ? node.closest(EDITABLE_SELECTOR) : null;
}

function setActiveComposer(node) {
    activeComposer = node && document.contains(node) ? node : null;
    if (panel) {
        if (!markedElements.length) {
            const contextField = panel.querySelector('#sgpt-context');
            if (contextField) {
                contextField.value = getCurrentPanelContextValue();
            }
        }
        positionPanelNearComposer();
        updatePanelAnchorNote();
    }
    positionComposerActionButton();
}

function findContextNodeForComposer(node) {
    if (!node) {
        return null;
    }

    const direct = node.closest('[data-ad-preview="message"],[data-ad-comet-preview="message"],[role="article"],article,[role="listitem"]');
    if (direct) {
        return direct;
    }

    let current = node.parentElement;
    while (current) {
        let sibling = current.previousElementSibling;
        while (sibling) {
            const article = sibling.matches && sibling.matches('[role="article"],article,[role="listitem"]')
                ? sibling
                : (sibling.querySelector ? sibling.querySelector('[role="article"],article,[role="listitem"]') : null);
            if (article) {
                return article;
            }
            sibling = sibling.previousElementSibling;
        }
        current = current.parentElement;
    }

    return findFullContextNode(node);
}

function getActiveComposerContext() {
    if (!activeComposer || !document.contains(activeComposer)) {
        activeReplyContextMeta = null;
        return '(Focus a text field or mark elements to build context)';
    }

    const contextNode = findContextNodeForComposer(activeComposer);
    activeReplyContextMeta = {source: 'composer'};
    return contextNode ? getReadableContext(contextNode) : '(Focus a text field or mark elements to build context)';
}

function updatePanelAnchorNote() {
    if (!panel) {
        return;
    }

    const note = panel.querySelector('#sgpt-anchor-note');
    if (!note) {
        return;
    }

    if (markedElements.length) {
        note.textContent = 'Using ' + markedElements.length + ' marked block' + (markedElements.length === 1 ? '' : 's') + ' as context.';
        return;
    }

    if (activeReplyContextMeta && activeReplyContextMeta.replyTarget) {
        note.textContent = 'Anchored to the current reply field. Reply target detected: ' + activeReplyContextMeta.replyTarget + '.';
        return;
    }

    note.textContent = activeComposer && document.contains(activeComposer)
        ? 'Anchored to the currently focused text field.'
        : 'Focus a text field or mark elements to build context.';
}

function ensureComposerActionButton() {
    if (composerActionButton) {
        return composerActionButton;
    }

    composerActionButton = document.createElement('button');
    composerActionButton.id = 'sgpt-composer-action';
    composerActionButton.type = 'button';
    composerActionButton.textContent = 'Reply with Tools';
    composerActionButton.style.position = 'fixed';
    composerActionButton.style.zIndex = '2147483646';
    composerActionButton.style.padding = '6px 10px';
    composerActionButton.style.border = 'none';
    composerActionButton.style.borderRadius = '999px';
    composerActionButton.style.background = '#008CBA';
    composerActionButton.style.color = '#fff';
    composerActionButton.style.fontSize = '12px';
    composerActionButton.style.cursor = 'pointer';
    composerActionButton.style.boxShadow = '0 2px 10px rgba(0,0,0,0.18)';
    composerActionButton.style.display = 'none';
    composerActionButton.addEventListener('click', function () {
        openReplyPanel();
    });
    document.body.appendChild(composerActionButton);

    return composerActionButton;
}

function positionComposerActionButton() {
    const button = ensureComposerActionButton();
    if (!activeComposer || !document.contains(activeComposer)) {
        button.style.display = 'none';
        return;
    }

    const rect = activeComposer.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) {
        button.style.display = 'none';
        return;
    }

    button.style.display = 'block';
    const left = Math.max(12, Math.min(rect.right - 140, window.innerWidth - 160));
    const top = Math.max(12, rect.top - 34);
    button.style.left = Math.round(left) + 'px';
    button.style.top = Math.round(top) + 'px';
}

function positionPanelNearComposer() {
    if (!panel) return;

    if (!activeComposer || !document.contains(activeComposer)) {
        activeComposer = findEditableTarget(document.activeElement);
    }

    if (!activeComposer) {
        panel.style.width = '360px';
        panel.style.left = 'auto';
        panel.style.top = 'auto';
        panel.style.right = '16px';
        panel.style.bottom = '16px';
        return;
    }

    const rect = activeComposer.getBoundingClientRect();
    const spacing = 12;
    const minMargin = 12;
    const panelWidth = Math.min(380, Math.max(300, window.innerWidth - (minMargin * 2)));
    panel.style.width = panelWidth + 'px';

    const measuredHeight = Math.min(panel.offsetHeight || 420, Math.max(220, window.innerHeight - (minMargin * 2)));
    let left = rect.right + spacing;
    if (left + panelWidth > window.innerWidth - minMargin) {
        left = rect.left - panelWidth - spacing;
    }
    if (left < minMargin) {
        left = Math.max(minMargin, Math.min(rect.left, window.innerWidth - panelWidth - minMargin));
    }

    let top = rect.top;
    const maxTop = Math.max(minMargin, window.innerHeight - measuredHeight - minMargin);
    if (top > maxTop) {
        top = maxTop;
    }
    if (top < minMargin) {
        top = minMargin;
    }

    panel.style.left = Math.round(left) + 'px';
    panel.style.top = Math.round(top) + 'px';
    panel.style.right = 'auto';
    panel.style.bottom = 'auto';
    positionComposerActionButton();
}

function isFacebookUiNoiseLine(line) {
    const lowered = normalizeWhitespace(line).toLowerCase();
    if (!lowered) {
        return true;
    }

    if (FACEBOOK_REPLY_NOISE_LINES.indexOf(lowered) !== -1) {
        return true;
    }

    if (lowered.indexOf('reply as ') === 0 || lowered.indexOf('svara som ') === 0 || lowered.indexOf('answer as ') === 0) {
        return true;
    }

    if (lowered.indexOf('facebook.com') !== -1 || lowered.indexOf('_cft_') !== -1 || lowered.indexOf('/?') !== -1) {
        return true;
    }

    if (/^\d+\s*(s|min|m|h|d|w|v)$/.test(lowered) || /^\d+\s*(likes?|replies?)$/.test(lowered)) {
        return true;
    }

    return false;
}

function extractFacebookMeaningfulLines(node) {
    if (!node) {
        return [];
    }

    const clone = node.cloneNode(true);
    Array.from(clone.querySelectorAll('script,style,form,input,textarea,button,svg,img,video,iframe,[aria-hidden="true"]')).forEach(function (el) {
        el.remove();
    });

    Array.from(clone.querySelectorAll('a')).forEach(function (anchor) {
        anchor.textContent = normalizeWhitespace(anchor.textContent || '');
        anchor.removeAttribute('href');
    });

    return String(clone.innerText || '')
        .split(/\n+/)
        .map(function (line) {
            return normalizeWhitespace(line);
        })
        .filter(function (line) {
            return !!line && !isFacebookUiNoiseLine(line);
        });
}

function extractFacebookAuthorFromNode(node) {
    if (!node || !node.querySelectorAll) {
        return '';
    }

    const candidates = node.querySelectorAll('h2, h3, strong, a[role="link"], span[dir="auto"]');
    for (let i = 0; i < candidates.length; i += 1) {
        const text = normalizeWhitespace(candidates[i].textContent || '');
        if (!text || text.length < 2 || text.length > 80 || isFacebookUiNoiseLine(text)) {
            continue;
        }

        return text;
    }

    return '';
}

function extractFacebookCommentRecordFromNode(node) {
    if (!node) {
        return null;
    }

    const lines = extractFacebookMeaningfulLines(node);
    if (!lines.length) {
        return null;
    }

    const authorName = extractFacebookAuthorFromNode(node) || lines[0] || '';
    const bodyLines = lines.filter(function (line, index) {
        return !(index === 0 && line === authorName);
    });
    const bodyText = normalizeWhitespace(bodyLines.join('\n'));

    if (!authorName || !bodyText) {
        return null;
    }

    return {
        author_name: authorName,
        body_text: bodyText,
        signature: buildFacebookCommentSignature(authorName, bodyText),
    };
}

function findFacebookCommentNodeForComposer(node) {
    if (!node) {
        return null;
    }

    const direct = findContextNodeForComposer(node);
    if (direct && extractFacebookCommentRecordFromNode(direct)) {
        return direct;
    }

    let current = node.parentElement;
    while (current) {
        let sibling = current.previousElementSibling;
        while (sibling) {
            const article = sibling.matches && sibling.matches('[role="article"],article,[role="listitem"]')
                ? sibling
                : (sibling.querySelector ? sibling.querySelector('[role="article"],article,[role="listitem"]') : null);
            if (article && extractFacebookCommentRecordFromNode(article)) {
                return article;
            }
            sibling = sibling.previousElementSibling;
        }
        current = current.parentElement;
    }

    return direct;
}

function collectFacebookVisibleThreadRecords(targetNode) {
    if (!targetNode || !targetNode.parentElement) {
        return [];
    }

    const records = [];
    const seen = new Set();
    const children = Array.from(targetNode.parentElement.children);

    for (let i = 0; i < children.length; i += 1) {
        const child = children[i];
        const article = child === targetNode
            ? child
            : (child.matches && child.matches('[role="article"],article,[role="listitem"]') ? child : (child.querySelector ? child.querySelector('[role="article"],article,[role="listitem"]') : null));

        if (!article) {
            continue;
        }

        const record = extractFacebookCommentRecordFromNode(article);
        if (!record || seen.has(record.signature)) {
            continue;
        }

        seen.add(record.signature);
        records.push(record);

        if (article === targetNode) {
            break;
        }
    }

    return records.slice(-6);
}

function findCachedFacebookThreadRecords(targetRecord) {
    if (!targetRecord) {
        return [];
    }

    const matched = recentFacebookCommentEntries.find(function (entry) {
        return entry.signature === targetRecord.signature;
    });

    if (!matched || !matched.batch_id) {
        return [];
    }

    const seen = new Set();
    return recentFacebookCommentEntries
        .filter(function (entry) {
            return entry.batch_id === matched.batch_id;
        })
        .reverse()
        .filter(function (entry) {
            if (seen.has(entry.signature)) {
                return false;
            }
            seen.add(entry.signature);
            return true;
        })
        .slice(0, 8)
        .map(function (entry) {
            return {
                author_name: entry.author_name,
                body_text: entry.body_text,
                signature: entry.signature,
            };
        });
}

function buildFacebookReplyContextFromComposer(node) {
    const targetNode = findFacebookCommentNodeForComposer(node);
    const targetRecord = extractFacebookCommentRecordFromNode(targetNode);
    if (!targetRecord) {
        return null;
    }

    const visibleRecords = collectFacebookVisibleThreadRecords(targetNode);
    const cachedRecords = findCachedFacebookThreadRecords(targetRecord);
    const merged = [];
    const seen = new Set();

    visibleRecords.concat(cachedRecords).forEach(function (record) {
        if (!record || seen.has(record.signature)) {
            return;
        }

        seen.add(record.signature);
        merged.push(record);
    });

    const lines = [];
    lines.push('Reply target: ' + targetRecord.author_name);
    lines.push('Target comment: ' + targetRecord.author_name + ': ' + targetRecord.body_text);
    if (merged.length) {
        lines.push('Thread context:');
        merged.forEach(function (record) {
            lines.push('- ' + record.author_name + ': ' + record.body_text);
        });
    }

    return {
        source: 'facebook-thread',
        replyTarget: targetRecord.author_name,
        threadSize: merged.length,
        text: lines.join('\n'),
    };
}

function getCurrentPanelContextValue() {
    if (markedElements.length) {
        activeReplyContextMeta = {source: 'marked', markedCount: markedElements.length};
        return markedElements.map((el, i) => `[${i + 1}]\n${getReadableContext(el)}`).join('\n\n---\n\n');
    }

    if (isFacebookPage() && activeComposer && document.contains(activeComposer)) {
        const facebookReplyContext = buildFacebookReplyContextFromComposer(activeComposer);
        if (facebookReplyContext && facebookReplyContext.text) {
            activeReplyContextMeta = facebookReplyContext;
            return facebookReplyContext.text;
        }
    }

    return getActiveComposerContext();
}


// ---------------------------------------------
// EXTRACT READABLE CONTEXT (GENERIC, WITH MEDIA)
// ---------------------------------------------
function getReadableContext(el) {
    const parts = [];

    // 1. Include the selected element
    parts.push(convertNodeToReadableText(el.cloneNode(true)));

    // 2. Look for outer container used by Facebook
    const fbContainer = el.closest('[data-ad-preview="message"]');
    if (fbContainer && fbContainer.parentElement) {
        const siblings = Array.from(fbContainer.parentElement.children);
        let found = false;
        for (const sib of siblings) {
            if (sib === fbContainer) {
                found = true;
                continue;
            }
            if (!found) continue;
            if (containsMedia(sib)) {
                parts.push('[Attached media]');
                parts.push(convertNodeToReadableText(sib.cloneNode(true)));
            }
        }
    }

    // 3. Background-image elements
    const bgImages = extractBackgroundImagesAround(el);
    if (bgImages.length > 0) {
        parts.push('[Background images]');
        parts.push(...bgImages);
    }

    return parts.join('\n\n');
}

function containsMedia(node) {
    return node.querySelector('img, video, iframe, picture, svg, audio, embed, object, a[href]') !== null;
}

function convertNodeToReadableText(node) {
    // Handle images
    const imgs = node.querySelectorAll('img');
    for (const img of imgs) {
        const isEmoji = img.src.includes('emoji.php');
        const altText = img.alt && typeof img.alt.trim === 'function' ? img.alt.trim() : '';
        const label = isEmoji
            ? img.alt || '🖼️'
            : `[IMG: ${altText || img.src || 'image'}]`;
        const span = document.createElement('span');
        span.textContent = label;
        img.replaceWith(span);
    }

    // Handle videos/embeds
    const videos = node.querySelectorAll('video, iframe, embed, object');
    for (const vid of videos) {
        const label = `[VIDEO: ${vid.src || 'embedded video'}]`;
        const span = document.createElement('span');
        span.textContent = label;
        vid.replaceWith(span);
    }

    // Handle links
    const links = node.querySelectorAll('a[href]');
    for (const a of links) {
        const rawText = a.textContent && typeof a.textContent.trim === 'function' ? a.textContent.trim() : '';
        const text = rawText ? rawText.replace(/\s+/g, ' ') : 'link';
        const url = a.href;
        const label = /facebook\.com/i.test(url || '') && text && text !== 'link'
            ? text
            : `[LINK: ${text} (${url})]`;
        const span = document.createElement('span');
        span.textContent = label;
        a.replaceWith(span);
    }

    return node.innerText.trim();
}

function extractBackgroundImagesAround(el) {
    const found = [];
    const closestMessage = el.closest('[data-ad-preview="message"]');
    const scope = (closestMessage ? closestMessage.parentElement : null) || el.parentElement;
    if (!scope) return found;

    const nodes = scope.querySelectorAll('*');
    for (const node of nodes) {
        const bg = window.getComputedStyle(node).getPropertyValue('background-image');
        const match = bg ? bg.match(/url\(["']?(.*?)["']?\)/) : null;
        if (match && match[1] && !match[1].includes('emoji.php')) {
            found.push(`[IMG: ${match[1]}]`);
        }
    }

    return found;
}

function updateAdminActivitiesControl() {
    if (!adminActivitiesControl) {
        return;
    }

    const toggle = adminActivitiesControl.querySelector('[data-role="toggle"]');
    const state = adminActivitiesControl.querySelector('[data-role="state"]');
    const counters = adminActivitiesControl.querySelector('[data-role="counters"]');
    const monitor = adminActivitiesControl.querySelector('[data-role="monitor"]');
    const recent = adminActivitiesControl.querySelector('[data-role="recent"]');
    const debugWrap = adminActivitiesControl.querySelector('[data-role="debug-wrap"]');
    const detected = adminActivitiesControl.querySelector('[data-role="detected"]');

    if (toggle) {
        toggle.textContent = adminIngestEnabled ? 'Disable activity statistics' : 'Enable activity statistics';
        toggle.style.background = adminIngestEnabled ? '#dc2626' : '#059669';
    }

    if (state) {
        state.textContent = adminLastStatusText;
    }

    if (counters) {
        counters.textContent = 'Detected: ' + adminDetectedEntryCount + ' · Pending: ' + pendingAdminEntries.size + ' · Submitted: ' + adminSubmittedCount;
        counters.style.display = adminDebugEnabled ? 'block' : 'none';
    }

    if (debugWrap) {
        debugWrap.style.display = adminDebugEnabled ? 'block' : 'none';
    }

    if (monitor) {
        if (!adminLastNetworkEventAt) {
            monitor.textContent = networkMonitorInjected
                ? 'Monitor injected. Waiting for Facebook XHR/fetch activity...'
                : 'Monitor not injected yet.';
            monitor.style.color = '#92400e';
        } else {
            const ageSeconds = Math.max(0, Math.round((Date.now() - adminLastNetworkEventAt) / 1000));
            monitor.textContent = 'Monitor active · ' + adminNetworkEventsSeen + ' events seen · ' + adminInterestingNetworkEventsSeen + ' interesting · last seen ' + (ageSeconds <= 1 ? 'just now' : (ageSeconds + 's ago'));
            monitor.style.color = '#065f46';
        }
    }

    if (detected) {
        const latestDetected = Array.from(pendingAdminEntries.values()).slice(-5).reverse();
        if (!latestDetected.length) {
            detected.innerHTML = '<div style="color:#64748b;">No reportable admin-log entries detected yet.</div>';
        } else {
            detected.innerHTML = latestDetected.map(function (entry) {
                const labelParts = [entry.actor_name || 'Unknown actor'];
                if (entry.handled_outcome) {
                    labelParts.push('→ ' + entry.handled_outcome);
                }
                if (entry.target_name) {
                    labelParts.push('(' + entry.target_name + ')');
                }

                return '<div style="padding:6px 0; border-top:1px solid rgba(148,163,184,0.2);">'
                    + '<div style="font-weight:600; color:#0f766e;">' + escapeHtml(labelParts.join(' ')) + '</div>'
                    + '<div style="margin-top:3px; color:#475569;">' + escapeHtml(clipText(entry.action_text || '', 150)) + '</div>'
                    + '</div>';
            }).join('');
        }
    }

    if (recent) {
        if (!recentAdminNetworkEvents.length) {
            recent.innerHTML = '<div style="color:#64748b;">No captured XHR/fetch events yet.</div>';
        } else {
            recent.innerHTML = recentAdminNetworkEvents.map(function (entry) {
                const preview = entry.response_preview || entry.request_preview;
                return '<div style="padding:6px 0; border-top:1px solid rgba(148,163,184,0.25);">'
                    + '<div style="font-weight:600; color:' + (entry.interesting ? '#0f766e' : '#334155') + ';">' + escapeHtml(entry.summary) + '</div>'
                    + '<div style="color:#64748b; margin-top:2px;">' + escapeHtml(entry.pathname || entry.url || '(unknown url)') + '</div>'
                    + (entry.detected_count ? '<div style="margin-top:3px; color:#0f766e; font-weight:600;">Detections: ' + escapeHtml(String(entry.detected_count)) + '</div>' : '')
                    + (entry.detected_preview && entry.detected_preview.length ? '<div style="margin-top:3px; color:#475569;">' + escapeHtml(entry.detected_preview.join(' · ')) + '</div>' : '')
                    + (preview ? '<div style="margin-top:3px; color:#475569;">' + escapeHtml(preview) + '</div>' : '')
                    + '</div>';
            }).join('');
        }
    }
}

function ensureAdminActivitiesControl() {
    if (!isFacebookAdminActivitiesPage()) {
        if (adminActivitiesControl) {
            adminDebugConsoleInfo('[TN Social Tools] Removing admin_activities overlay because the current route no longer matches.', {
                version: EXTENSION_VERSION,
                url: location.href,
            });
            adminActivitiesControl.remove();
            adminActivitiesControl = null;
        }
        return null;
    }

    if (adminActivitiesControl) {
        return adminActivitiesControl;
    }

    const control = document.createElement('div');
    control.id = 'sgpt-admin-activities-control';
    control.style.position = 'fixed';
    control.style.top = '16px';
    control.style.right = '16px';
    control.style.zIndex = '2147483645';
    control.style.width = '320px';
    control.style.padding = '10px';
    control.style.borderRadius = '10px';
    control.style.border = '1px solid rgba(0,0,0,0.12)';
    control.style.background = 'rgba(255,255,255,0.96)';
    control.style.boxShadow = '0 6px 18px rgba(0,0,0,0.15)';
    control.style.fontFamily = 'system-ui,sans-serif';
    control.style.fontSize = '12px';
    control.innerHTML = [
        '<div data-role="drag-handle" style="display:flex; justify-content:space-between; gap:8px; align-items:center; margin-bottom:6px; cursor:move; user-select:none;">',
        '<div style="font-weight:700;">Facebook admin activity statistics</div>',
        '<div style="font-size:11px; color:#64748b;">drag</div>',
        '</div>',
        '<div data-role="state" style="margin-bottom:8px; color:#334155; font-weight:600;">Passive activity detection is ready. Statistics are off.</div>',
        '<div style="display:flex; gap:8px; flex-wrap:wrap;">',
        '<button type="button" data-role="toggle" style="border:none; border-radius:999px; padding:6px 10px; color:#fff; cursor:pointer;">Enable activity statistics</button>',
        '</div>',
        '<div style="margin-top:10px; font-weight:600; color:#334155;">Reportable if enabled</div>',
        '<div data-role="detected" style="margin-top:4px; font-size:11px; line-height:1.35; color:#475569; max-height:150px; overflow:auto;">No reportable admin-log entries detected yet.</div>',
        '<div data-role="debug-wrap" style="display:none; margin-top:10px;">',
        '<div data-role="counters" style="margin-bottom:8px; color:#64748b;">Detected: 0 · Pending: 0 · Submitted: 0</div>',
        '<div data-role="monitor" style="margin-bottom:8px; padding:8px; border-radius:8px; border:1px solid rgba(59,130,246,0.25); background:#eff6ff; color:#1d4ed8; font-weight:600;">Monitor injected. Waiting for Facebook XHR/fetch activity...</div>',
        '<div style="margin-top:10px; font-weight:600; color:#334155;">Recent XHR/fetch (dev mode only)</div>',
        '<div data-role="recent" style="margin-top:4px; font-size:11px; line-height:1.35; color:#475569; max-height:180px; overflow:auto;">No captured XHR/fetch events yet.</div>',
        '</div>'
    ].join('');

    control.querySelector('[data-role="toggle"]').addEventListener('click', async function () {
        const settings = await getToolsRuntimeSettings();
        if (!settings.toolsApiToken) {
            adminLastStatusText = 'Missing Tools bearer token. Save it in the popup first.';
            updateAdminActivitiesControl();
            return;
        }

        adminIngestEnabled = !adminIngestEnabled;
        adminLastStatusText = adminIngestEnabled
            ? 'Activity statistics enabled. Detected admin activities will now be batched and sent to Tools.'
            : 'Activity statistics disabled. Passive detection is still running.';
        updateAdminActivitiesControl();
        debugLog({level: 'info', category: 'facebook-admin-ingest', message: 'Facebook admin ingest toggled.', meta: {enabled: adminIngestEnabled, url: location.href}});
        if (adminIngestEnabled) {
            scheduleAdminActivitiesScan('manual-enable');
        }
    });

    document.body.appendChild(control);
    adminActivitiesControl = control;
    enableAdminActivitiesControlDragging(control);
    updateAdminActivitiesControl();

    adminDebugConsoleInfo('[TN Social Tools] admin_activities overlay mounted.', {
        version: EXTENSION_VERSION,
        url: location.href,
    });

    return control;
}

function injectNetworkMonitor() {
    if (networkMonitorInjected || !window.TNNetworksPlatformRegistry) {
        return;
    }

    const platform = window.TNNetworksPlatformRegistry.getActive(location.hostname);
    if (!platform || !platform.enableNetworkCapture) {
        return;
    }

    const script = document.createElement('script');
    script.src = safeRuntimeGetURL('js/injected/networkMonitor.js');
    if (!script.src) {
        return;
    }
    script.onload = function () { this.remove(); };
    (document.head || document.documentElement).appendChild(script);
    networkMonitorInjected = true;

    adminDebugConsoleInfo('[TN Social Tools] In-page fetch/XHR monitor injected.', {
        version: EXTENSION_VERSION,
        url: location.href,
    });

    if (isFacebookAdminActivitiesPage()) {
        adminLastStatusText = adminIngestEnabled
            ? 'Network monitor injected. Waiting for admin-log traffic...'
            : 'Passive activity detection is ready. Statistics are off.';
        updateAdminActivitiesControl();
    }

    if (adminDebugEnabled) {
        debugLog({
            level: 'info',
            category: 'facebook-network-status',
            message: 'Injected in-page fetch/XHR monitor.',
            meta: {
                url: location.href,
                hostname: location.hostname,
            }
        });
    }
}

function handleLocationChange(reason) {
    const changed = lastObservedLocationHref !== location.href;
    if (!changed && reason !== 'init') {
        return;
    }

    lastObservedLocationHref = location.href;
    ensureAdminActivitiesControl();

    if (!isFacebookAdminActivitiesPage()) {
        adminDebugConsoleInfo('[TN Social Tools] Route changed, but this is not a Facebook admin_activities page.', {
            version: EXTENSION_VERSION,
            reason: reason,
            url: location.href,
        });
        return;
    }

    injectNetworkMonitor();
    adminLastStatusText = networkMonitorInjected
        ? 'Admin activities page detected. Waiting for Facebook XHR/fetch activity...'
        : 'Admin activities page detected, but monitor injection has not completed yet.';
    updateAdminActivitiesControl();
    scheduleAdminActivitiesScan('location-change');
    adminDebugConsoleInfo('[TN Social Tools] Facebook admin_activities route detected.', {
        version: EXTENSION_VERSION,
        reason: reason,
        url: location.href,
    });
    if (adminDebugEnabled) {
        debugLog({
            level: 'info',
            category: 'facebook-network-status',
            message: 'Facebook admin_activities route detected.',
            meta: {
                reason: reason,
                url: location.href,
            }
        });
    }
}

function shouldConsiderAdminActivityText(text) {
    const lowered = String(text || '').toLowerCase();
    if (lowered.length < 20) {
        return false;
    }

    return ADMIN_ACTIVITY_KEYWORDS.some(function (keyword) {
        return lowered.indexOf(keyword) !== -1;
    });
}

function extractMeaningfulLinkTexts(container) {
    const found = [];
    const anchors = container.querySelectorAll('a, strong');

    for (let i = 0; i < anchors.length; i += 1) {
        const text = normalizeWhitespace(anchors[i].textContent || '');
        if (!text || text.length < 2 || text.length > 80) {
            continue;
        }

        if (IGNORED_LINK_TEXTS.indexOf(text.toLowerCase()) !== -1) {
            continue;
        }

        if (found.indexOf(text) === -1) {
            found.push(text);
        }
    }

    return found;
}

function detectHandledOutcomeFromText(text) {
    const lowered = String(text || '').toLowerCase();
    if (lowered.indexOf('godk') !== -1 || lowered.indexOf('approved') !== -1 || lowered.indexOf('approve') !== -1 || lowered.indexOf('published') !== -1 || lowered.indexOf('allowed') !== -1) return 'approved';
    if (lowered.indexOf('avvis') !== -1 || lowered.indexOf('rejected') !== -1 || lowered.indexOf('declined') !== -1) return 'rejected';
    if (lowered.indexOf('tagit bort') !== -1 || lowered.indexOf('removed') !== -1 || lowered.indexOf('delete') !== -1) return 'removed';
    if (lowered.indexOf('rediger') !== -1 || lowered.indexOf('edit') !== -1 || lowered.indexOf('changed') !== -1) return 'edited';
    if (lowered.indexOf('lagt till') !== -1 || lowered.indexOf('added') !== -1) return 'added';
    if (lowered.indexOf('återkall') !== -1 || lowered.indexOf('revoked') !== -1) return 'revoked';
    if (lowered.indexOf('block') !== -1 || lowered.indexOf('banned') !== -1) return 'blocked';
    return null;
}

function detectHandledStatusFromText(text) {
    const lowered = String(text || '').toLowerCase();
    const outcome = detectHandledOutcomeFromText(text);
    if (lowered.indexOf('automatiskt') !== -1 || lowered.indexOf('automatically') !== -1) {
        return outcome ? outcome + '_automatically' : 'automatic';
    }

    return outcome;
}

function normalizeAdminActivityEntry(entry) {
    if (!entry) {
        return null;
    }

    const actionText = normalizeWhitespace(entry.action_text || entry.raw_blue_segment || '');
    if (!shouldConsiderAdminActivityText(actionText)) {
        return null;
    }

    const actorName = normalizeWhitespace(entry.actor_name || '');
    const handledOutcome = entry.handled_outcome || detectHandledOutcomeFromText(actionText);
    const handledStatusText = entry.handled_status_text || detectHandledStatusFromText(actionText);
    const targetName = normalizeWhitespace(entry.target_name || '');
    const sourceUrl = normalizeWhitespace(entry.source_url || location.origin + location.pathname);
    const activityUrl = normalizeWhitespace(entry.activity_url || location.href);
    const occurredAt = entry.occurred_at || null;
    const fallbackActorName = (handledStatusText && handledStatusText.indexOf('automatic') !== -1) ? 'Automatic moderation' : actorName;
    const finalActorName = actorName || fallbackActorName;

    if (!finalActorName || !actionText) {
        return null;
    }

    return {
        key: entry.key || [sourceUrl, occurredAt || '', finalActorName, targetName || '', actionText].join('|'),
        source_url: sourceUrl,
        activity_url: activityUrl,
        occurred_at: occurredAt,
        actor_name: finalActorName,
        action_text: actionText,
        target_name: targetName || null,
        handled_outcome: handledOutcome,
        handled_status_text: handledStatusText,
        raw_blue_segment: entry.raw_blue_segment || actionText,
        plugin_version: 'tornevall-networks-social-media-tools/' + EXTENSION_VERSION,
    };
}

function rememberDetectedAdminEntries(entries, reason) {
    if (!entries || !entries.length) {
        return 0;
    }

    let added = 0;
    entries.forEach(function (entry) {
        const normalized = normalizeAdminActivityEntry(entry);
        if (!normalized || discoveredAdminEntryKeys.has(normalized.key)) {
            return;
        }

        discoveredAdminEntryKeys.add(normalized.key);
        pendingAdminEntries.set(normalized.key, normalized);
        adminDetectedEntryCount += 1;
        added += 1;
    });

    if (added && adminDebugEnabled) {
        debugLog({
            level: 'info',
            category: 'facebook-admin-detection',
            message: 'Detected Facebook admin activity entries.',
            meta: {
                reason: reason,
                added: added,
                detected_total: adminDetectedEntryCount,
                pending_total: pendingAdminEntries.size,
            }
        });
    }

    return added;
}

function parseAdminActivityEntry(container) {
    const actionText = normalizeWhitespace(container.innerText || '');
    if (!shouldConsiderAdminActivityText(actionText)) {
        return null;
    }

    const names = extractMeaningfulLinkTexts(container);
    const actorName = names[0] || null;
    if (!actorName) {
        return null;
    }

    const targetName = names.length > 1 ? names[1] : null;
    const key = [location.href, actorName, targetName || '', actionText].join('|');

    return normalizeAdminActivityEntry({
        key: key,
        source_url: location.href,
        activity_url: location.href,
        actor_name: actorName,
        action_text: actionText,
        target_name: targetName,
        handled_outcome: detectHandledOutcomeFromText(actionText),
        handled_status_text: detectHandledStatusFromText(actionText),
        raw_blue_segment: actionText,
    });
}

function collectVisibleAdminActivityEntries() {
    const selectors = ['[role="article"]', '[role="listitem"]', 'div[data-pagelet]', 'li'];
    const results = [];
    const seenKeys = new Set();

    selectors.forEach(function (selector) {
        const nodes = document.querySelectorAll(selector);
        for (let i = 0; i < nodes.length; i += 1) {
            const node = nodes[i];
            if (!node || !node.offsetParent) {
                continue;
            }

            const parsed = parseAdminActivityEntry(node);
            if (parsed && !seenKeys.has(parsed.key)) {
                seenKeys.add(parsed.key);
                results.push(parsed);
            }
        }
    });

    return results;
}

function chunkAdminEntries(entries, size) {
    const chunks = [];
    for (let index = 0; index < entries.length; index += size) {
        chunks.push(entries.slice(index, index + size));
    }
    return chunks;
}

async function submitAdminActivityEntriesBatch(entries) {
    const response = await safeSendRuntimeMessageWithResponse({
        type: 'FACEBOOK_ADMIN_INGEST',
        entries: entries,
    });

    if (!response.ok) {
        throw new Error(response.error || response.message || 'Could not submit admin activity batch.');
    }

    return response;
}

async function flushAdminActivitiesToTools(reason) {
    if (!pendingAdminEntries.size) {
        rememberDetectedAdminEntries(collectVisibleAdminActivityEntries(), reason || 'visible-scan');
    }

    updateAdminActivitiesControl();
    if (!adminIngestEnabled) {
        return;
    }

    const unsentEntries = Array.from(pendingAdminEntries.values()).filter(function (entry) {
        return !submittedAdminEntryKeys.has(entry.key);
    });

    if (!unsentEntries.length) {
        adminLastStatusText = 'Listening for admin-log changes. No new detected entries are waiting.';
        updateAdminActivitiesControl();
        return;
    }

    let submittedThisRun = 0;
    let createdThisRun = 0;
    let updatedThisRun = 0;
    const chunks = chunkAdminEntries(unsentEntries, MAX_ADMIN_BATCH_SIZE);

    for (let index = 0; index < chunks.length; index += 1) {
        const batch = chunks[index];

        try {
            const response = await submitAdminActivityEntriesBatch(batch);
            const data = response.data || {};
            submittedThisRun += batch.length;
            createdThisRun += typeof data.created === 'number' ? data.created : 0;
            updatedThisRun += typeof data.updated === 'number' ? data.updated : 0;
            batch.forEach(function (entry) {
                submittedAdminEntryKeys.add(entry.key);
                pendingAdminEntries.delete(entry.key);
            });
        } catch (error) {
            adminLastStatusText = error && error.message ? error.message : 'Could not submit admin-log batch.';
            updateAdminActivitiesControl();
            debugLog({level: 'error', category: 'facebook-admin-ingest', message: adminLastStatusText, meta: {reason: reason, batch_size: batch.length}});
            return;
        }
    }

    adminSubmittedCount += submittedThisRun;
    adminLastStatusText = submittedThisRun > 0
        ? 'Submitted ' + submittedThisRun + ' detected entr' + (submittedThisRun === 1 ? 'y' : 'ies') + ' to Tools in bulk.' + (createdThisRun || updatedThisRun ? ' Created: ' + createdThisRun + ' · Updated/duplicate-safe: ' + updatedThisRun : '')
        : 'Listening for admin-log changes. No new detected entries to submit right now.';
    updateAdminActivitiesControl();
}

function scheduleAdminActivitiesScan(reason) {
    if (adminActivitiesScanScheduled || !isFacebookAdminActivitiesPage()) {
        return;
    }

    adminActivitiesScanScheduled = true;
    setTimeout(function () {
        adminActivitiesScanScheduled = false;
        flushAdminActivitiesToTools(reason);
    }, 450);
}

// ---------------------------------------------
// PANEL HTML
// ---------------------------------------------
function panelHTML() {
    return `
    <style id="sgpt-style">
      #sgpt-panel{position:fixed;bottom:16px;right:16px;width:360px;max-height:70vh;background:#fff;border:1px solid #ccc;border-radius:6px;box-shadow:0 4px 14px rgba(0,0,0,0.15);z-index:2147483647;display:flex;flex-direction:column;font-family:system-ui,sans-serif;font-size:14px}
      #sgpt-panel[data-collapsed="true"]{transform:translateX(calc(100% - 42px));transition:transform .3s}
      #sgpt-head{display:flex;align-items:center;background:#008CBA;color:#fff;padding:4px 8px;border-top-left-radius:6px;border-top-right-radius:6px}
      #sgpt-close{margin-left:auto;background:transparent;border:none;color:#fff;font-size:18px;cursor:pointer}
      #sgpt-body{flex:1;display:flex;flex-direction:column;padding:8px;overflow:hidden}
      #sgpt-body input[type=text],#sgpt-body textarea,#sgpt-body select{width:100%;margin-bottom:6px;border:1px solid #aaa;border-radius:4px;padding:4px;font-family:monospace}
      #sgpt-body textarea{resize:vertical;min-height:60px;max-height:160px}
      #sgpt-send,#sgpt-mod{margin-right:4px;padding:4px 10px;border:none;border-radius:4px;background:#008CBA;color:#fff;cursor:pointer}
      #sgpt-foot{display:flex;justify-content:flex-end}
      #sgpt-responder-label{font-size:12px;color:#666;margin-bottom:6px;text-align:right}
      #sgpt-anchor-note{font-size:11px;color:#666;margin-bottom:8px}
      .sgpt-quick-settings{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin-bottom:8px}
      .sgpt-quick-settings label{display:flex;flex-direction:column;font-size:12px;font-weight:600;color:#334155}
      .sgpt-quick-settings select,.sgpt-quick-settings input{margin-bottom:0}
    </style>
    <div id="sgpt-head">Tornevall Networks Social Media Tools ↔ <button id="sgpt-close">×</button></div>
    <div id="sgpt-body">
      <div id="sgpt-responder-label">Responder: <span id="sgpt-responder-name" data-name="${frontResponserName || ''}">${frontResponserName || '(loading...)'}</span></div>
      <div id="sgpt-anchor-note">Anchored to the currently focused text field.</div>
      <label>Prompt<input type="text" id="sgpt-prompt" placeholder="How should the recipient be handled?"></label>
      <div class="sgpt-quick-settings">
        <label>Mood<select id="sgpt-mood">
            <optgroup label="Objective & Informative">
              <option value="Neutral and formal">Neutral and formal</option>
              <option value="Fact-based and concise">Fact-based and concise</option>
              <option value="Academic and precise">Academic and precise</option>
              <option value="Analytical and critical">Analytical and critical</option>
            </optgroup>
            <optgroup label="Confrontational & Direct">
              <option value="Critical and direct">Critical and direct</option>
              <option value="Cynical and sharp">Cynical and sharp</option>
              <option value="Aggressive and unapologetic">Aggressive and unapologetic</option>
              <option value="Brutally honest">Brutally honest</option>
            </optgroup>
            <optgroup label="Satirical & Sarcastic">
              <option value="Sarcastic and dry">Sarcastic and dry</option>
              <option value="Snarky and dismissive">Snarky and dismissive</option>
              <option value="Satirical and ironic">Satirical and ironic</option>
              <option value="Witty and clever">Witty and clever</option>
            </optgroup>
            <optgroup label="Approachable & Light">
              <option value="Friendly and casual">Friendly and casual</option>
              <option value="Conversational and soft">Conversational and soft</option>
            </optgroup>
          </select></label>
        <label>Model<select id="sgpt-model">
          <option value="gpt-4o">gpt-4o</option>
          <option value="gpt-4">gpt-4</option>
          <option value="o3-mini">o3-mini</option>
        </select></label>
        <label>Length<select id="sgpt-length">
            <option value="auto">Let GPT decide</option>
            <option value="as-short-as-possible">As short as possible</option>
            <option value="shortest-possible">At maxmium one sentence. Possibly a oneliner.</option>
            <option value="very-short">2–3 sentences (very short)</option>
            <option value="short">4–6 sentences (short)</option>
            <option value="medium">6–10 sentences (medium)</option>
            <option value="extreme">Extreme. You want your own book.</option>
            <option value="long">Extended (whatever is needed)</option>
          </select></label>
      </div>
      <div class="sgpt-quick-settings" style="grid-template-columns:repeat(2,minmax(0,1fr));">
        <label>Custom mood<input type="text" id="sgpt-custom"></label>
        <label>Modifier<input type="text" id="sgpt-modifier"></label>
      </div>
      <label>Context<textarea id="sgpt-context" readonly></textarea></label>
      <label>Output<textarea id="sgpt-out"></textarea></label>
      <div id="sgpt-foot"><button id="sgpt-send">Send</button><button id="sgpt-mod">Modify</button></div>
    </div>`;
}

// ---------------------------------------------
// CREATE PANEL
// ---------------------------------------------
function createPanel() {
    if (panel) return panel;

    panel = document.createElement('div');
    panel.id = 'sgpt-panel';
    panel.innerHTML = panelHTML();
    document.body.appendChild(panel);

    panel.querySelector('#sgpt-head').addEventListener('dblclick', () => {
        panel.dataset.collapsed = panel.dataset.collapsed === 'true' ? 'false' : 'true';
    });

    panel.querySelector('#sgpt-close').addEventListener('click', () => {
        panel.remove();
        panel = null;
    });

    panel.querySelector('#sgpt-send').addEventListener('click', () => sendGPT(false));
    panel.querySelector('#sgpt-mod').addEventListener('click', () => sendGPT(true));

    positionPanelNearComposer();

    return panel;
}

function openReplyPanel() {
    const p = createPanel();

    p.dataset.collapsed = 'false';
    p.querySelector('#sgpt-context').value = getCurrentPanelContextValue();
    positionPanelNearComposer();
    updatePanelAnchorNote();
    p.querySelector('#sgpt-prompt').focus();

    isClickMarkingActive = false;
    safeSendRuntimeMessage({type: 'TOGGLE_MARK_MODE', enabled: false});

    safeStorageSyncGet(['responderName', 'autoDetectResponder', 'defaultMood', 'defaultCustomMood', 'lastReplyPrompt', 'lastResponseLength'], (data) => {
        const label = p.querySelector('#sgpt-responder-name');
        const moodField = p.querySelector('#sgpt-mood');
        const customMoodField = p.querySelector('#sgpt-custom');
        const promptField = p.querySelector('#sgpt-prompt');
        const lengthField = p.querySelector('#sgpt-length');

        if (moodField && data.defaultMood) {
            moodField.value = data.defaultMood;
        }

        if (lengthField && data.lastResponseLength) {
            lengthField.value = data.lastResponseLength;
        }

        if (customMoodField) {
            customMoodField.value = data.defaultCustomMood || '';
        }

        if (promptField) {
            promptField.value = data.lastReplyPrompt || DEFAULT_REPLY_PROMPT;
        }

        if (data.autoDetectResponder) {
            detectFacebookUserNameViaObserver((name) => {
                frontResponserName = name;
                if (label) {
                    label.textContent = name;
                    label.dataset.name = name;
                }
            });
        } else {
            frontResponserName = data.responderName || 'Anonymous';
            if (label) {
                label.textContent = frontResponserName;
                label.dataset.name = frontResponserName;
            }
        }
    });
}

// ---------------------------------------------
// SEND TO GPT
// ---------------------------------------------
function sendGPT(mod, mode) {
    const ctx = panel.querySelector('#sgpt-context').value;
    const prompt = panel.querySelector('#sgpt-prompt').value.trim();
    const modifierField = panel.querySelector('#sgpt-modifier');
    const modifier = mod && modifierField ? modifierField.value.trim() : '';
    const modelField = panel.querySelector('#sgpt-model');
    const model = modelField ? modelField.value : '';
    if (!prompt && !mod) return alert('Enter prompt');
    showLoader();

    const selectedLength = panel.querySelector('#sgpt-length').value;
    safeStorageSyncSet({ lastResponseLength: selectedLength, lastReplyPrompt: prompt || DEFAULT_REPLY_PROMPT });

    const moodField = panel.querySelector('#sgpt-mood');
    const customMoodField = panel.querySelector('#sgpt-custom');
    const outputField = panel.querySelector('#sgpt-out');
    const responderField = panel.querySelector('#sgpt-responder-name');
    const responderName = responderField && responderField.dataset
        ? ((responderField.dataset.name || '').trim() || frontResponserName || 'Anonymous')
        : (frontResponserName || 'Anonymous');

    safeSendRuntimeMessage({
        type: 'GPT_REQUEST',
        context: ctx,
        userPrompt: prompt,
        modifier,
        mood: moodField ? moodField.value : '',
        responseLength: selectedLength,
        customMood: customMoodField ? customMoodField.value.trim() : '',
        previousReply: outputField ? outputField.value : '',
        model,
        responderName,
        requestMode: mode || 'reply'
    });
}

// ---------------------------------------------
// MARK-MODE CLICK HANDLER
// ---------------------------------------------
document.addEventListener('click', e => {
    if (!isClickMarkingActive) return;
    if (e.target.closest('#sgpt-panel')) return;
    const t = findFullContextNode(e.target);
    if (!t) return;
    const already = markedElements.includes(t);
    if (already) {
        t.classList.remove('socialgpt-marked');
        markedElements = markedElements.filter(el => el !== t);
    } else {
        t.classList.add('socialgpt-marked');
        markedElements.push(t);
    }
    if (panel) {
        panel.querySelector('#sgpt-context').value = getCurrentPanelContextValue();
        updatePanelAnchorNote();
    }
    e.preventDefault();
}, true);

document.addEventListener('focusin', e => {
    const editable = findEditableTarget(e.target);
    if (editable) {
        setActiveComposer(editable);
    }
}, true);

window.addEventListener('resize', () => {
    positionPanelNearComposer();
    positionComposerActionButton();
}, true);

window.addEventListener('scroll', () => {
    positionPanelNearComposer();
    positionComposerActionButton();
}, true);

function resetMarksAndContext() {
    markedElements.forEach(el => el.classList.remove('socialgpt-marked'));
    markedElements = [];

    if (panel) {
        safeSendRuntimeMessage({type: 'RESET_MARK_MODE'});

        const fields = [['#sgpt-modifier', '']
            /*
                        ['#sgpt-context', ''],
                        ['#sgpt-prompt', ''],
                        ['#sgpt-out', ''],
                        ['#sgpt-custom', ''],
                        ['#sgpt-mood', 'Friendly'],
                        ['#sgpt-model', 'gpt-4o']
            */];

        for (const [selector, value] of fields) {
            const el = panel.querySelector(selector);
            if (el) el.value = value;
        }

        updatePanelAnchorNote();
    }
}

// ---------------------------------------------
// MAIN LISTENER
// ---------------------------------------------
safeAddRuntimeMessageListener(req => {
    if (req.type === 'SHOW_LOADER') return showLoader();
    if (req.type === 'HIDE_LOADER') return hideLoader();

    if (req.type === 'TOGGLE_MARK_MODE') {
        isClickMarkingActive = req.enabled;
    } else if (req.type === 'OPEN_REPLY_PANEL') {
        openReplyPanel();
    } else if (req.type === 'GPT_RESPONSE') {
        hideLoader();
        if (panel) {
            const outputElement = panel.querySelector('#sgpt-out');
            if (outputElement) {
                outputElement.value = req.payload;
                resetMarksAndContext();
                return;
            }
        }

        showFactResultBox(req.payload);

    } else if (req.type === 'START_FACT_VERIFICATION') {
        if (!markedElements.length) return alert('No elements marked for verification.');

        const context = markedElements.map((el, i) => `[${i + 1}]\n${el.innerHTML.trim()}`).join('\n\n---\n\n');
        showLoader();

        safeSendRuntimeMessage({
            type: 'GPT_REQUEST',
            context,
            userPrompt: 'Search facts and verify the following statements. If you find any false or misleading information, provide a detailed explanation of why it is incorrect. Use plain text, no format and no markdown.',
            requestMode: 'verify',
            responderName: frontResponserName || 'VerifierBot'
        });

        resetMarksAndContext();
    }
});

window.addEventListener('message', function (event) {
    if (event.source !== window || !event.data || event.data.source !== 'tn-networks-social-media-tools' || event.data.type !== 'NETWORK_EVENT') {
        return;
    }

    const payload = event.data.payload || {};

    if (isFacebookPage() && Array.isArray(payload.detected_comment_entries) && payload.detected_comment_entries.length) {
        rememberFacebookCommentEntries(payload.detected_comment_entries);
        if (panel && activeComposer && document.contains(activeComposer) && !markedElements.length) {
            const contextField = panel.querySelector('#sgpt-context');
            if (contextField) {
                contextField.value = getCurrentPanelContextValue();
            }
            updatePanelAnchorNote();
        }
    }

    if (!isFacebookAdminActivitiesPage()) {
        return;
    }

    ensureAdminActivitiesControl();
    const networkEntry = rememberAdminNetworkEvent(payload);
    mirrorAdminNetworkEventToConsole(networkEntry);
    if (networkEntry.detected_entries && networkEntry.detected_entries.length) {
        rememberDetectedAdminEntries(networkEntry.detected_entries, 'network-event');
        mirrorAdminDetectionsToConsole(networkEntry.detected_entries, networkEntry);
    }

    if (!adminNetworkDebugAnnounced) {
        adminNetworkDebugAnnounced = true;
        if (adminDebugEnabled) {
            debugLog({
                level: 'info',
                category: 'facebook-network-status',
                message: 'Facebook in-page monitor is receiving network events.',
                meta: {
                    url: location.href,
                    first_event: networkEntry.summary,
                }
            });
        }
    }

    if (networkEntry.interesting && adminDebugEnabled) {
        debugLog({
            level: 'info',
            category: 'facebook-network',
            message: 'Interesting Facebook XHR/fetch event captured.',
            meta: {
                url: location.href,
                transport: networkEntry.transport,
                method: networkEntry.method,
                status: networkEntry.status,
                duration_ms: networkEntry.duration_ms,
                pathname: networkEntry.pathname,
                doc_id: networkEntry.doc_id,
                friendly_name: networkEntry.friendly_name,
                request_preview: networkEntry.request_preview,
                response_preview: networkEntry.response_preview,
            }
        });
    }

    adminLastStatusText = adminIngestEnabled
        ? (networkEntry.detected_count
            ? 'Detected ' + networkEntry.detected_count + ' admin activity entr' + (networkEntry.detected_count === 1 ? 'y' : 'ies') + '. Bulk upload to Tools is queued.'
            : (networkEntry.interesting
                ? 'Activity statistics are enabled. Waiting for matching admin-log traffic.'
                : 'Activity statistics are enabled. Waiting for matching admin-log traffic.'))
        : (networkEntry.detected_count
            ? 'Detected ' + networkEntry.detected_count + ' admin activity entr' + (networkEntry.detected_count === 1 ? 'y' : 'ies') + '. Enable activity statistics to send batches to Tools.'
            : (networkEntry.interesting
                ? 'Interesting activity detected. Enable activity statistics to send batches to Tools.'
                : 'Passive activity detection is active. Enable activity statistics when you want to start sending entries.'));
    updateAdminActivitiesControl();
    if (networkEntry.interesting) {
        scheduleAdminActivitiesScan('network-event');
    }
}, true);

injectNetworkMonitor();
ensureComposerActionButton();
ensureAdminActivitiesControl();
syncAdminDebugPreference();
safeAddStorageChangeListener(function (changes, areaName) {
    if (areaName === 'sync' && changes.facebookAdminDebugEnabled) {
        syncAdminDebugPreference();
    }
});
handleLocationChange('init');
locationWatchIntervalId = window.setInterval(function () {
    handleLocationChange('interval');
}, 1000);

adminDebugConsoleInfo('[TN Social Tools] content script ready.', {
    version: EXTENSION_VERSION,
    url: location.href,
    admin_activities_match: isFacebookAdminActivitiesPage(),
});
