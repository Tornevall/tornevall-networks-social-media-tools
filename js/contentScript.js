let markedElements = [], isClickMarkingActive = false, panel, activeComposer = null, composerActionButton = null, adminActivitiesControl = null;
let panelAttachedComposer = null;
let panelContextDirty = false;
let composerActionButtonDragState = null;
let composerActionButtonDragOffset = null;
let composerActionButtonDragListenersBound = false;
let frontResponserName = '';

const EDITABLE_SELECTOR = 'textarea,input[type="text"],input:not([type]),[contenteditable=""],[contenteditable="true"],[role="textbox"]';
const TOOLS_PROD_BASE_URL = 'https://tools.tornevall.net';
const TOOLS_DEV_BASE_URL = 'https://tools.tornevall.com';
const FACEBOOK_INGEST_PATH = '/api/social-media-tools/facebook/ingest';
const ADMIN_ACTIVITY_KEYWORDS = ['admin', 'activity', 'log', 'godk', 'approved', 'approve', 'avvis', 'rejected', 'reject', 'declined', 'request', 'participate', 'förfrågan', 'removed', 'tagit bort', 'deleted', 'delete', 'revoked', 'återkall', 'blocked', 'block', 'banned', 'ban', 'spam', 'member', 'reported', 'report', 'member-reported', 'anmält', 'anmälda', 'anmäld', 'rapporterad', 'pending post', 'comment', 'kommentar', 'automatiskt', 'automatically', 'published', 'group'];
const IGNORED_LINK_TEXTS = ['gilla', 'svara', 'svara som', 'kommentera', 'dela', 'visa alla', 'visa fler svar', 'like', 'reply', 'share', 'comment', 'send', 'gif'];
const MAX_RECENT_NETWORK_EVENTS = 8;
const MAX_ADMIN_BATCH_SIZE = 50;
const ADMIN_PANEL_POSITION_STORAGE_KEY = 'tn_social_tools_admin_panel_position';
const MAX_RECENT_FACEBOOK_COMMENT_ENTRIES = 200;
const DEFAULT_REPLY_PROMPT = 'Write text that fits the visible context and can be pasted into the selected field.';
const FACEBOOK_REPLY_NOISE_LINES = ['most relevant', 'mest relevant', 'like', 'reply', 'share', 'comment', 'send', 'gif', 'gilla', 'svara', 'dela', 'kommentera', 'skicka'];
const FACEBOOK_ADMIN_MONTH_INDEX = {
    jan: 0,
    january: 0,
    januari: 0,
    feb: 1,
    february: 1,
    februari: 1,
    mar: 2,
    march: 2,
    mars: 2,
    apr: 3,
    april: 3,
    may: 4,
    maj: 4,
    jun: 5,
    june: 5,
    juni: 5,
    jul: 6,
    july: 6,
    juli: 6,
    aug: 7,
    august: 7,
    augusti: 7,
    sep: 8,
    sept: 8,
    september: 8,
    okt: 9,
    october: 9,
    oktober: 9,
    nov: 10,
    november: 10,
    dec: 11,
    december: 11,
};

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

    const invalidationMessage = 'Extension was reloaded or updated. Uploads are paused in this tab until you reload the page.';

    extensionContextAvailable = false;
    adminDebugEnabled = false;
    adminActivitiesScanScheduled = false;
    adminFlushRequestedWhileBusy = false;
    adminFlushInProgress = false;

    if (adminActiveSendBatch && adminActiveSendBatch.length) {
        adminActivityReporter.markBatchFailed(adminActiveSendBatch, invalidationMessage, {
            reason: 'extension-context-invalidated',
        });
        adminActiveSendBatch = null;
    }

    adminLastStatusText = invalidationMessage;

    if (locationWatchIntervalId) {
        window.clearInterval(locationWatchIntervalId);
        locationWatchIntervalId = null;
    }

    if (adminActivitiesControl) {
        updateAdminActivitiesControl();
    }

    if (typeof console !== 'undefined' && console.info) {
        console.info('[TN Social Tools] Extension context invalidated. Reload the page to reattach the updated extension in this tab.', {
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
let adminFlushInProgress = false;
let adminFlushRequestedWhileBusy = false;
let adminActiveSendBatch = null;
let networkMonitorInjected = false;
let adminLastStatusText = 'Passive activity detection is ready. Statistics are off.';
let adminNetworkEventsSeen = 0;
let adminInterestingNetworkEventsSeen = 0;
let adminLastNetworkEventAt = 0;
let adminNetworkDebugAnnounced = false;
let lastObservedLocationHref = location.href;
let adminActivitiesControlDragState = null;
let adminActivitiesDragListenersBound = false;
let activeReplyContextMeta = null;
let latestBootstrapAdminScanDebug = null;
let latestInjectedBootstrapAdminScanDebug = null;
const recentAdminNetworkEvents = [];
const facebookCommentEntryKeys = new Set();
const recentFacebookCommentEntries = [];

function clearAdminActivityRuntimeDebugState() {
    adminNetworkEventsSeen = 0;
    adminInterestingNetworkEventsSeen = 0;
    adminLastNetworkEventAt = 0;
    adminNetworkDebugAnnounced = false;
    latestBootstrapAdminScanDebug = null;
    latestInjectedBootstrapAdminScanDebug = null;
    recentAdminNetworkEvents.length = 0;
}

function disableAdminActivityCollection(message, meta) {
    const snapshot = getAdminReporterSnapshot();
    const hadPendingEntries = !!(snapshot && snapshot.totals && snapshot.totals.pending);

    adminIngestEnabled = false;
    adminActivitiesScanScheduled = false;
    adminFlushRequestedWhileBusy = false;
    adminFlushInProgress = false;
    adminActiveSendBatch = null;
    adminActivityReporter.reset();
    clearAdminActivityRuntimeDebugState();
    adminLastStatusText = message || 'Activity statistics are disabled for this tab.';

    if (adminActivitiesControl) {
        updateAdminActivitiesControl();
    }

    if (meta) {
        debugLog({
            level: 'info',
            category: 'facebook-admin-ingest',
            message: 'Facebook admin activity collection disabled.',
            meta: Object.assign({
                url: location.href,
                cleared_pending_entries: hadPendingEntries,
            }, meta),
        });
    }
}

function debugLog(entry) {
    safeSendRuntimeMessage({
        type: 'DEBUG_LOG',
        entry: Object.assign({
            source: 'content-script',
        }, entry || {}),
    });
}

const adminActivityReporter = typeof TNFacebookAdminReporter !== 'undefined' && TNFacebookAdminReporter && typeof TNFacebookAdminReporter.createReporter === 'function'
    ? TNFacebookAdminReporter.createReporter({
        storageKey: 'tn_social_tools_facebook_admin_reporter_v1',
        ttlMs: 24 * 60 * 60 * 1000,
        log: function (category, message, meta) {
            debugLog({
                level: 'info',
                category: category,
                message: message,
                meta: meta || {},
            });
        },
        debugEnabled: function () {
            return adminDebugEnabled;
        },
    })
    : {
        normalizeEntry: function (entry) { return entry || null; },
        discoverEntries: function () { return {added: 0, duplicates: 0, entries: []}; },
        startNextBatch: function () { return []; },
        markBatchSent: function () {},
        markBatchFailed: function () {},
        getQueueSize: function () { return 0; },
        reset: function () {},
        getSnapshot: function () {
            return {
                totals: {
                    detected: 0,
                    duplicates_ignored: 0,
                    queued: 0,
                    sending: 0,
                    failed: 0,
                    pending: 0,
                    sent: 0,
                    batches_started: 0,
                    batches_succeeded: 0,
                    batches_failed: 0,
                },
                reportable_entries: [],
                recent_sent_entries: [],
                last_submission: null,
                has_reportable_entries: false,
            };
        },
    };

function getAdminReporterSnapshot() {
    return adminActivityReporter.getSnapshot();
}

function buildAdminLastSubmissionSummary(lastSubmission) {
    if (!lastSubmission || typeof lastSubmission !== 'object') {
        return '';
    }

    if (lastSubmission.status === 'sending') {
        return 'Bulk send in progress. Attempting ' + (lastSubmission.attempted || 0) + ' entr' + ((lastSubmission.attempted || 0) === 1 ? 'y' : 'ies') + '.';
    }

    if (lastSubmission.status === 'success') {
        return 'Bulk sent: attempted ' + (lastSubmission.attempted || 0)
            + ' · received ' + (lastSubmission.received || 0)
            + ' · created ' + (lastSubmission.created || 0)
            + ' · updated/duplicate-safe ' + (lastSubmission.updated || 0)
            + ' · queue remaining ' + (lastSubmission.queue_remaining || 0);
    }

    if (lastSubmission.status === 'failed') {
        return 'Bulk send failed: attempted ' + (lastSubmission.attempted || 0)
            + ' · failed ' + (lastSubmission.failed || 0)
            + ' · queue remaining ' + (lastSubmission.queue_remaining || 0)
            + (lastSubmission.error ? ' · ' + lastSubmission.error : '');
    }

    return '';
}

function buildAdminReporterStatusPayload() {
    const snapshot = getAdminReporterSnapshot();
    const reportableEntries = sortAdminEntriesByRecency(snapshot.reportable_entries || []).slice(0, 5);
    const counters = snapshot.totals || {};

    return {
        ok: true,
        page_url: location.href,
        is_facebook_page: isFacebookPage(),
        is_admin_page: isFacebookAdminActivitiesPage(),
        ingest_enabled: adminIngestEnabled,
        debug_enabled: adminDebugEnabled,
        state_text: adminLastStatusText,
        reportable_heading: 'Reportable if enabled',
        reportable_empty_text: 'No reportable admin-log entries detected yet.',
        reportable_entries: reportableEntries.map(function (entry) {
            return {
                actor_name: entry.actor_name || 'Unknown actor',
                action_text: entry.action_text || entry.description || '',
                action: entry.action || entry.handled_outcome || '',
                target_name: entry.target_name || '',
                state: entry.state || 'queued',
                occurred_at: entry.occurred_at || entry.facebook_activity_time || null,
                key: entry.key || entry.dedupe_key || '',
            };
        }),
        counters: {
            detected: counters.detected || 0,
            duplicates_ignored: counters.duplicates_ignored || 0,
            queued: counters.queued || 0,
            sending: counters.sending || 0,
            failed: counters.failed || 0,
            pending: counters.pending || 0,
            sent: counters.sent || 0,
        },
        last_submission: snapshot.last_submission || null,
        last_submission_text: buildAdminLastSubmissionSummary(snapshot.last_submission),
    };
}

function adminDebugConsoleInfo(message, meta) {
    if (!adminDebugEnabled || typeof console === 'undefined' || !console.info) {
        return;
    }

    console.info(message, meta || {});
}

function buildBootstrapAdminScanDebug(reason) {
    return {
        reason: reason || 'bootstrap-scan',
        started_at: new Date().toISOString(),
        body_available: !!document.body,
        body_application_json_count: 0,
        xpath_hits: {},
        matched_script_count: 0,
        fallback_used: false,
        scripts_considered: 0,
        scripts_with_entries: 0,
        entries_detected: 0,
        pending_added: 0,
        parse_failures: 0,
        skipped_short: 0,
        skipped_matcher: 0,
        top_scripts: [],
        parsed_scripts: [],
        detected_entry_preview: [],
        outcome: 'pending',
    };
}

function getAdminEntryTimestamp(entry) {
    if (!entry) {
        return 0;
    }

    const occurred = entry.occurred_at ? Date.parse(entry.occurred_at) : 0;
    if (occurred) {
        return occurred;
    }

    const detected = entry.detected_at ? Date.parse(entry.detected_at) : 0;
    return detected || 0;
}

function sortAdminEntriesByRecency(entries) {
    return (entries || []).slice().sort(function (left, right) {
        const timeDiff = getAdminEntryTimestamp(right) - getAdminEntryTimestamp(left);
        if (timeDiff !== 0) {
            return timeDiff;
        }

        return String(right && right.key || '').localeCompare(String(left && left.key || ''));
    });
}

function summarizeBootstrapAdminScriptNode(node, raw, score) {
    const text = String(raw || '');
    return {
        type: normalizeWhitespace(node && node.getAttribute ? node.getAttribute('type') : '') || '(none)',
        has_data_sjs: !!(node && node.hasAttribute && node.hasAttribute('data-sjs')),
        score: typeof score === 'number' ? score : scoreBootstrapAdminActivityScriptNode(node, text),
        length: text.length,
        preview: clipText(normalizeWhitespace(text), 220),
        has_preloader: /adp_CometGroupAdminActivitiesActivityLogContentQueryRelayPreloader|CometGroupAdminActivitiesActivityLogContentQueryRelayPreloader/.test(text),
        has_admin_typename: /"__typename"\s*:\s*"GroupAdminActivity"|"__typename"\s*:\s*"GroupsCometAdminActivity"/.test(text),
    };
}

function renderBootstrapAdminScanDebug(scan, title, emptyText) {
    if (!adminDebugEnabled) {
        return '';
    }

    if (!scan) {
        return '<div style="color:#64748b;">' + escapeHtml(emptyText || 'No bootstrap scan has run yet.') + '</div>';
    }

    const xpathBits = Object.keys(scan.xpath_hits || {}).map(function (xpath) {
        return escapeHtml(xpath.replace(/^\.\/\/script/, '//script') + ': ' + scan.xpath_hits[xpath]);
    });
    const topScripts = Array.isArray(scan.top_scripts) ? scan.top_scripts.slice(0, 3) : [];
    const parsedScripts = Array.isArray(scan.parsed_scripts) ? scan.parsed_scripts.slice(0, 3) : [];

    return [
        '<div style="padding:8px; border-radius:8px; border:1px solid rgba(14,165,233,0.22); background:#f8fafc; color:#334155;">',
        '<div style="font-weight:700; color:#0f172a;">' + escapeHtml(title || 'Bootstrap debug') + '</div>',
        '<div style="margin-top:4px; color:#475569;">reason=' + escapeHtml(scan.reason || 'bootstrap-scan') + ' · outcome=' + escapeHtml(scan.outcome || 'pending') + '</div>',
        '<div style="margin-top:4px; color:#475569;">body=' + escapeHtml(scan.body_available ? 'yes' : 'no') + ' · application/json scripts=' + escapeHtml(String(scan.body_application_json_count || 0)) + ' · matched=' + escapeHtml(String(scan.matched_script_count || 0)) + ' · entries=' + escapeHtml(String(scan.entries_detected || 0)) + '</div>',
        '<div style="margin-top:4px; color:#475569;">considered=' + escapeHtml(String(scan.scripts_considered || 0)) + ' · scripts_with_entries=' + escapeHtml(String(scan.scripts_with_entries || 0)) + ' · pending_added=' + escapeHtml(String(scan.pending_added || 0)) + ' · parse_failures=' + escapeHtml(String(scan.parse_failures || 0)) + ' · fallback=' + escapeHtml(scan.fallback_used ? 'yes' : 'no') + '</div>',
        xpathBits.length ? '<div style="margin-top:6px; color:#475569;">XPath hits:<br>' + xpathBits.join('<br>') + '</div>' : '<div style="margin-top:6px; color:#64748b;">XPath hits: none</div>',
        (Array.isArray(scan.detected_entry_preview) && scan.detected_entry_preview.length)
            ? '<div style="margin-top:6px; font-weight:600; color:#0f172a;">Body entries parsed</div>' + scan.detected_entry_preview.map(function (text) {
                return '<div style="margin-top:3px; color:#475569;">' + escapeHtml(text) + '</div>';
            }).join('')
            : '<div style="margin-top:6px; color:#64748b;">Body entries parsed: none</div>',
        topScripts.length ? '<div style="margin-top:6px; font-weight:600; color:#0f172a;">Top body scripts</div>' + topScripts.map(function (item, index) {
            return '<div style="margin-top:4px; color:#475569;">#' + (index + 1) + ' score=' + escapeHtml(String(item.score || 0)) + ' len=' + escapeHtml(String(item.length || 0)) + ' preloader=' + escapeHtml(item.has_preloader ? 'yes' : 'no') + ' typename=' + escapeHtml(item.has_admin_typename ? 'yes' : 'no') + '<br>' + escapeHtml(item.preview || '') + '</div>';
        }).join('') : '<div style="margin-top:6px; color:#64748b;">No matching body scripts.</div>',
        parsedScripts.length ? '<div style="margin-top:6px; font-weight:600; color:#0f172a;">Parsed scripts</div>' + parsedScripts.map(function (item, index) {
            return '<div style="margin-top:4px; color:#475569;">#' + (index + 1) + ' entries=' + escapeHtml(String(item.entry_count || 0)) + ' chunks=' + escapeHtml(String(item.chunk_count || 0)) + ' single=' + escapeHtml(item.used_single_parse ? 'yes' : 'no') + '<br>' + escapeHtml(item.preview || '') + (item.entry_preview ? '<br>→ ' + escapeHtml(item.entry_preview) : '') + '</div>';
        }).join('') : '',
        '</div>'
    ].join('');
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

function normalizeAdminActivityTimeValue(value) {
    if (value === null || typeof value === 'undefined' || value === '') {
        return null;
    }

    if (typeof value === 'number' && isFinite(value)) {
        const numericDate = new Date(value > 9999999999 ? value : value * 1000);
        return isNaN(numericDate.getTime()) ? null : numericDate.toISOString();
    }

    const raw = normalizeWhitespace(value);
    if (!raw) {
        return null;
    }

    if (/^\d{10,13}$/.test(raw)) {
        const numericValue = Number(raw);
        if (isFinite(numericValue)) {
            const unixDate = new Date(raw.length >= 13 ? numericValue : numericValue * 1000);
            if (!isNaN(unixDate.getTime())) {
                return unixDate.toISOString();
            }
        }
    }

    const parsed = Date.parse(raw);
    if (!isNaN(parsed)) {
        return new Date(parsed).toISOString();
    }

    return null;
}

function isGenericAdminTargetLabel(value) {
    const normalized = normalizeWhitespace(value).toLowerCase();
    if (!normalized) {
        return false;
    }

    return [
        'inlägg',
        'post',
        'kommentar',
        'comment',
        'medlem',
        'member',
        'förfrågan',
        'request',
        'reported content',
        'content',
        'reply',
        'svar'
    ].indexOf(normalized) !== -1;
}

function normalizeAdminTargetInfo(targetName, targetType) {
    const normalizedTargetName = normalizeWhitespace(targetName || '');
    const normalizedTargetType = normalizeWhitespace(targetType || '');

    if (!normalizedTargetName) {
        return {
            target_name: null,
            target_type: normalizedTargetType || null,
        };
    }

    if (normalizedTargetType) {
        return {
            target_name: normalizedTargetName,
            target_type: normalizedTargetType,
        };
    }

    if (isGenericAdminTargetLabel(normalizedTargetName)) {
        return {
            target_name: null,
            target_type: normalizedTargetName,
        };
    }

    return {
        target_name: normalizedTargetName,
        target_type: null,
    };
}

function buildLocalIsoTimestamp(year, monthIndex, day, hour, minute) {
    const parsedYear = Number(year);
    const parsedMonthIndex = Number(monthIndex);
    const parsedDay = Number(day);
    const parsedHour = Number(hour);
    const parsedMinute = Number(minute);
    if (!isFinite(parsedYear) || !isFinite(parsedMonthIndex) || !isFinite(parsedDay) || !isFinite(parsedHour) || !isFinite(parsedMinute)) {
        return null;
    }

    const date = new Date(parsedYear, parsedMonthIndex, parsedDay, parsedHour, parsedMinute, 0, 0);
    return isNaN(date.getTime()) ? null : date.toISOString();
}

function parseFacebookAdminDateLine(text) {
    const normalized = normalizeWhitespace(text)
        .replace(/\s+kl\.?\s+/i, ' ')
        .replace(/,/g, '');
    if (!normalized) {
        return null;
    }

    const lower = normalized.toLowerCase();
    const todayMatch = lower.match(/^(idag|today)\s+(\d{1,2}):(\d{2})$/i);
    if (todayMatch) {
        const now = new Date();
        return buildLocalIsoTimestamp(now.getFullYear(), now.getMonth(), now.getDate(), todayMatch[2], todayMatch[3]);
    }

    const yesterdayMatch = lower.match(/^(igår|yesterday)\s+(\d{1,2}):(\d{2})$/i);
    if (yesterdayMatch) {
        const now = new Date();
        now.setDate(now.getDate() - 1);
        return buildLocalIsoTimestamp(now.getFullYear(), now.getMonth(), now.getDate(), yesterdayMatch[2], yesterdayMatch[3]);
    }

    const namedMonthMatch = lower.match(/^(\d{1,2})\s+([a-zåäö]+)\s+(\d{4})(?:\s+|\s*at\s*)(\d{1,2}):(\d{2})$/i)
        || lower.match(/^(\d{1,2})\s+([a-zåäö]+)(?:\s+|\s*at\s*)(\d{1,2}):(\d{2})$/i);
    if (namedMonthMatch) {
        const hasExplicitYear = namedMonthMatch.length === 6;
        const day = namedMonthMatch[1];
        const monthLabel = namedMonthMatch[2];
        const monthIndex = FACEBOOK_ADMIN_MONTH_INDEX[monthLabel];
        if (typeof monthIndex === 'number') {
            const year = hasExplicitYear ? namedMonthMatch[3] : String(new Date().getFullYear());
            const hour = hasExplicitYear ? namedMonthMatch[4] : namedMonthMatch[3];
            const minute = hasExplicitYear ? namedMonthMatch[5] : namedMonthMatch[4];
            return buildLocalIsoTimestamp(year, monthIndex, day, hour, minute);
        }
    }

    const directParsed = Date.parse(normalized);
    if (!isNaN(directParsed)) {
        return new Date(directParsed).toISOString();
    }

    return null;
}

function extractOccurredAtFromVisibleAdminContainer(container) {
    if (!container) {
        return null;
    }

    const directTimeNodes = container.querySelectorAll('time, abbr[data-utime], span[title], a[title]');
    for (let index = 0; index < directTimeNodes.length; index += 1) {
        const node = directTimeNodes[index];
        const unixValue = node && node.getAttribute ? (node.getAttribute('data-utime') || node.getAttribute('data-store') || '') : '';
        const normalizedUnix = normalizeAdminActivityTimeValue(unixValue);
        if (normalizedUnix) {
            return normalizedUnix;
        }

        const titledValue = node && node.getAttribute ? node.getAttribute('title') : '';
        const titledTime = parseFacebookAdminDateLine(titledValue || '');
        if (titledTime) {
            return titledTime;
        }

        const nodeTextTime = parseFacebookAdminDateLine(node && node.textContent ? node.textContent : '');
        if (nodeTextTime) {
            return nodeTextTime;
        }
    }

    const lines = String(container.innerText || '')
        .split(/\n+/)
        .map(function (line) {
            return normalizeWhitespace(line);
        })
        .filter(Boolean)
        .reverse();

    for (let index = 0; index < lines.length; index += 1) {
        const parsed = parseFacebookAdminDateLine(lines[index]);
        if (parsed) {
            return parsed;
        }
    }

    return null;
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

function getActivePlatformDefinition() {
    if (!window.TNNetworksPlatformRegistry || typeof window.TNNetworksPlatformRegistry.getActive !== 'function') {
        return null;
    }

    try {
        return window.TNNetworksPlatformRegistry.getActive(location.hostname);
    } catch (error) {
        return null;
    }
}

function getComposerActionButtonAnchorPosition() {
    if (!activeComposer || !document.contains(activeComposer)) {
        return null;
    }

    const rect = activeComposer.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) {
        return null;
    }

    return {
        left: Math.max(12, Math.min(rect.right - 124, window.innerWidth - 160)),
        top: Math.max(12, rect.top - 12),
    };
}

function clampFixedPosition(left, top, element, minMargin) {
    const margin = typeof minMargin === 'number' ? minMargin : 12;
    const rect = element && element.getBoundingClientRect ? element.getBoundingClientRect() : {width: 150, height: 34};
    const width = Math.max(1, Math.round(rect.width || 150));
    const height = Math.max(1, Math.round(rect.height || 34));

    return {
        left: Math.min(Math.max(margin, left), Math.max(margin, window.innerWidth - width - margin)),
        top: Math.min(Math.max(margin, top), Math.max(margin, window.innerHeight - height - margin)),
    };
}

function setComposerActionButtonCoordinates(button, left, top) {
    const clamped = clampFixedPosition(left, top, button, 12);
    button.style.left = Math.round(clamped.left) + 'px';
    button.style.top = Math.round(clamped.top) + 'px';
}

function enableComposerActionButtonDragging(button) {
    if (!button || button.dataset.dragReady === 'true') {
        return;
    }

    button.dataset.dragReady = 'true';

    button.addEventListener('pointerdown', function (event) {
        if (event.button !== 0 || !button.isConnected) {
            return;
        }

        const rect = button.getBoundingClientRect();
        composerActionButtonDragState = {
            pointerId: event.pointerId,
            startX: event.clientX,
            startY: event.clientY,
            offsetX: event.clientX - rect.left,
            offsetY: event.clientY - rect.top,
            dragging: false,
            anchorPosition: getComposerActionButtonAnchorPosition() || {left: rect.left, top: rect.top},
        };

        if (typeof button.setPointerCapture === 'function') {
            try {
                button.setPointerCapture(event.pointerId);
            } catch (error) {
            }
        }
    });

    button.addEventListener('dblclick', function (event) {
        composerActionButtonDragOffset = null;
        button.dataset.dragSuppressClick = 'true';
        window.setTimeout(function () {
            if (button) {
                button.dataset.dragSuppressClick = 'false';
            }
        }, 120);
        positionComposerActionButton();
        event.preventDefault();
    });

    button.addEventListener('keydown', function (event) {
        if (event.key !== 'Escape') {
            return;
        }

        composerActionButtonDragOffset = null;
        button.dataset.dragSuppressClick = 'true';
        window.setTimeout(function () {
            if (button) {
                button.dataset.dragSuppressClick = 'false';
            }
        }, 120);
        positionComposerActionButton();
        event.preventDefault();
    });

    button.addEventListener('pointermove', function (event) {
        if (!composerActionButtonDragState || !composerActionButton || composerActionButtonDragState.pointerId !== event.pointerId) {
            return;
        }

        const distance = Math.max(Math.abs(event.clientX - composerActionButtonDragState.startX), Math.abs(event.clientY - composerActionButtonDragState.startY));
        if (!composerActionButtonDragState.dragging && distance < 4) {
            return;
        }

        composerActionButtonDragState.dragging = true;
        composerActionButton.style.cursor = 'grabbing';
        setComposerActionButtonCoordinates(
            composerActionButton,
            event.clientX - composerActionButtonDragState.offsetX,
            event.clientY - composerActionButtonDragState.offsetY
        );
    });

    function finishComposerActionButtonDrag(event) {
        if (!composerActionButtonDragState || !composerActionButton) {
            composerActionButtonDragState = null;
            return;
        }

        if (event && composerActionButtonDragState.pointerId != null && composerActionButtonDragState.pointerId !== event.pointerId) {
            return;
        }

        if (composerActionButtonDragState.dragging) {
            const rect = composerActionButton.getBoundingClientRect();
            const anchorPosition = getComposerActionButtonAnchorPosition() || composerActionButtonDragState.anchorPosition || {left: rect.left, top: rect.top};
            composerActionButtonDragOffset = {
                left: Math.round(rect.left - anchorPosition.left),
                top: Math.round(rect.top - anchorPosition.top),
            };
            composerActionButton.dataset.dragSuppressClick = 'true';
            window.setTimeout(function () {
                if (composerActionButton) {
                    composerActionButton.dataset.dragSuppressClick = 'false';
                }
            }, 120);
        }

        if (event && typeof composerActionButton.releasePointerCapture === 'function') {
            try {
                if (composerActionButton.hasPointerCapture && composerActionButton.hasPointerCapture(event.pointerId)) {
                    composerActionButton.releasePointerCapture(event.pointerId);
                }
            } catch (error) {
            }
        }

        composerActionButton.style.cursor = 'grab';
        composerActionButtonDragState = null;
        positionComposerActionButton();
    }

    button.addEventListener('pointerup', finishComposerActionButtonDrag);
    button.addEventListener('pointercancel', finishComposerActionButtonDrag);
}

function isComposerContentEditable(node) {
    return !!(node && (node.isContentEditable || (node.getAttribute && /^(|true)$/i.test(node.getAttribute('contenteditable') || ''))));
}

function dispatchComposerInputEvents(node, insertedText) {
    if (!node || !node.dispatchEvent) {
        return;
    }

    try {
        if (typeof InputEvent === 'function') {
            node.dispatchEvent(new InputEvent('input', {
                bubbles: true,
                cancelable: true,
                data: insertedText,
                inputType: 'insertText',
            }));
        } else {
            node.dispatchEvent(new Event('input', {bubbles: true, cancelable: true}));
        }
    } catch (error) {
        node.dispatchEvent(new Event('input', {bubbles: true, cancelable: true}));
    }

    node.dispatchEvent(new Event('change', {bubbles: true}));
}

function setNativeTextInputValue(node, value) {
    const prototype = node instanceof HTMLTextAreaElement
        ? HTMLTextAreaElement.prototype
        : HTMLInputElement.prototype;
    const descriptor = Object.getOwnPropertyDescriptor(prototype, 'value');

    if (descriptor && typeof descriptor.set === 'function') {
        descriptor.set.call(node, value);
    } else {
        node.value = value;
    }
}

function replaceComposerText(node, text) {
    if (!node || !document.contains(node)) {
        return {ok: false, error: 'No selected field is available anymore.'};
    }

    const value = String(text || '');

    try {
        node.focus();
    } catch (error) {
    }

    if (node instanceof HTMLTextAreaElement || node instanceof HTMLInputElement) {
        setNativeTextInputValue(node, value);
        if (typeof node.setSelectionRange === 'function') {
            node.setSelectionRange(value.length, value.length);
        }
        dispatchComposerInputEvents(node, value);
        return {ok: true};
    }

    if (isComposerContentEditable(node)) {
        let inserted = false;

        try {
            const selection = window.getSelection();
            if (selection) {
                const range = document.createRange();
                range.selectNodeContents(node);
                selection.removeAllRanges();
                selection.addRange(range);
            }

            if (typeof document.execCommand === 'function') {
                inserted = document.execCommand('insertText', false, value);
            }
        } catch (error) {
        }

        if (!inserted) {
            node.textContent = value;
        }

        dispatchComposerInputEvents(node, value);
        return {ok: true};
    }

    return {ok: false, error: 'The selected field could not be filled automatically.'};
}

function isVisibleElement(node) {
    if (!node || !node.getBoundingClientRect) {
        return false;
    }

    const rect = node.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
}

function isDisabledSubmitButton(node) {
    return !!(node && (
        node.disabled
        || node.getAttribute('aria-disabled') === 'true'
        || node.getAttribute('data-disabled') === 'true'
    ));
}

function findSendButtonForComposer(node, platform, options) {
    if (!node || !document.contains(node)) {
        return null;
    }

    const includeDisabled = !!(options && options.includeDisabled);
    const selectors = [];
    if (platform && Array.isArray(platform.sendButtonSelectors)) {
        selectors.push.apply(selectors, platform.sendButtonSelectors);
    }

    selectors.push('button[type="submit"]', '[role="button"]', 'button');

    const scopes = [
        node.closest('form'),
        node.closest('[role="dialog"]'),
        node.closest('[role="article"]'),
        node.closest('[data-testid="cellInnerDiv"]'),
        node.parentElement,
        document,
    ].filter(Boolean);

    const seen = new Set();
    const labelPattern = /(send|reply|post|tweet|comment|publish|share|submit|skicka|svara|posta|publicera|kommentera)/i;

    for (let scopeIndex = 0; scopeIndex < scopes.length; scopeIndex += 1) {
        const scope = scopes[scopeIndex];
        for (let selectorIndex = 0; selectorIndex < selectors.length; selectorIndex += 1) {
            const selector = selectors[selectorIndex];
            const matches = scope.querySelectorAll ? scope.querySelectorAll(selector) : [];

            for (let i = 0; i < matches.length; i += 1) {
                const button = matches[i];
                if (!button || seen.has(button) || button.closest('#sgpt-panel') || button.id === 'sgpt-composer-action') {
                    continue;
                }

                seen.add(button);

                if (!isVisibleElement(button) || (!includeDisabled && isDisabledSubmitButton(button))) {
                    continue;
                }

                const label = [
                    button.textContent || '',
                    button.getAttribute ? (button.getAttribute('aria-label') || '') : '',
                    button.getAttribute ? (button.getAttribute('title') || '') : '',
                    button.getAttribute ? (button.getAttribute('data-testid') || '') : '',
                ].join(' ');

                if (selector === 'button[type="submit"]' || labelPattern.test(label)) {
                    return button;
                }
            }
        }
    }

    return null;
}

function clickComposerSendButton(button) {
    if (!button || typeof button.click !== 'function') {
        return false;
    }

    try {
        button.focus();
    } catch (error) {
    }

    button.click();
    return true;
}

function getComposerFillCapabilities() {
    const platform = getActivePlatformDefinition();
    const hasComposer = !!(activeComposer && document.contains(activeComposer));
    const prefersManualPaste = !!(platform && platform.preferManualPaste);
    const sendButton = hasComposer && !prefersManualPaste
        ? findSendButtonForComposer(activeComposer, platform, {includeDisabled: true})
        : null;

    return {
        platform: platform,
        hasComposer: hasComposer,
        canPaste: hasComposer,
        canSubmit: !!sendButton,
        prefersManualPaste: prefersManualPaste,
        sendButton: sendButton,
    };
}

function buildComposeStatusMessage(outputText, capabilities) {
    if (!capabilities.hasComposer) {
        return 'Select a text field to enable paste/fill actions.';
    }

    if (!outputText) {
        return capabilities.prefersManualPaste
            ? 'Generate text, then paste it into the selected field. Submit manually after reviewing it.'
            : 'Generate text, then paste it into the selected field or paste and send it.';
    }

    if (capabilities.prefersManualPaste) {
        return 'Output is ready. Paste it into the selected field and send manually after reviewing it.';
    }

    return capabilities.canSubmit
        ? 'Output is ready. Paste it into the selected field, or use Paste + Send.'
        : 'Output is ready. Paste is available, but no send button was detected nearby yet.';
}

function updatePanelComposerActions(statusOverride, tone) {
    if (!panel) {
        return;
    }

    const contextField = panel.querySelector('#sgpt-context');
    const outputField = panel.querySelector('#sgpt-out');
    const verifyButton = panel.querySelector('#sgpt-verify');
    const pasteButton = panel.querySelector('#sgpt-paste');
    const pasteSendButton = panel.querySelector('#sgpt-paste-send');
    const status = panel.querySelector('#sgpt-compose-status');
    const capabilities = getComposerFillCapabilities();
    const contextText = contextField ? contextField.value.trim() : '';
    const outputText = outputField ? outputField.value.trim() : '';

    if (verifyButton) {
        verifyButton.disabled = !contextText;
    }

    if (pasteButton) {
        pasteButton.disabled = !outputText || !capabilities.canPaste;
    }

    if (pasteSendButton) {
        pasteSendButton.disabled = !outputText || !capabilities.canPaste || !capabilities.canSubmit;
        pasteSendButton.style.display = capabilities.prefersManualPaste ? 'none' : 'inline-block';
    }

    if (status) {
        status.textContent = statusOverride || buildComposeStatusMessage(outputText, capabilities);
        status.style.color = tone === 'error'
            ? '#b91c1c'
            : (tone === 'success' ? '#047857' : '#64748b');
    }
}

function pasteTextIntoActiveComposer(text, options) {
    const output = String(text || '').trim();
    if (!output) {
        return {ok: false, error: 'There is no generated text to paste yet.'};
    }

    const capabilities = getComposerFillCapabilities();
    if (!capabilities.hasComposer) {
        return {ok: false, error: 'Select a text field first.'};
    }

    const fillResult = replaceComposerText(activeComposer, output);
    if (!fillResult.ok) {
        return fillResult;
    }

    if (options && options.submit) {
        if (capabilities.prefersManualPaste) {
            return {
                ok: true,
                submitted: false,
                message: 'Text pasted into the selected field. Submit it manually after reviewing it.',
            };
        }

        const sendButton = findSendButtonForComposer(activeComposer, capabilities.platform) || (capabilities.sendButton && !isDisabledSubmitButton(capabilities.sendButton) ? capabilities.sendButton : null);
        if (!sendButton) {
            return {
                ok: true,
                submitted: false,
                message: 'Text pasted into the selected field, but no send button was detected nearby.',
            };
        }

        clickComposerSendButton(sendButton);
        return {
            ok: true,
            submitted: true,
            message: 'Text pasted into the selected field and the nearby send button was triggered.',
        };
    }

    return {
        ok: true,
        submitted: false,
        message: capabilities.prefersManualPaste
            ? 'Text pasted into the selected field. Submit it manually after reviewing it.'
            : 'Text pasted into the selected field.',
    };
}

function clearMarkedContextSelection() {
    markedElements.forEach(function (el) {
        el.classList.remove('socialgpt-marked');
    });
    markedElements = [];
    isClickMarkingActive = false;
    safeSendRuntimeMessage({type: 'RESET_MARK_MODE'});
    safeSendRuntimeMessage({type: 'TOGGLE_MARK_MODE', enabled: false});
}

function setPanelContextValue(value, options) {
    if (!panel) {
        return;
    }

    const contextField = panel.querySelector('#sgpt-context');
    if (!contextField) {
        return;
    }

    contextField.value = value || '';
    panelContextDirty = !!(options && options.dirty);
}

function updatePanelMarkModeButton(enabled) {
    if (!panel) {
        return;
    }

    const button = panel.querySelector('#sgpt-context-mark');
    if (!button) {
        return;
    }

    button.textContent = enabled ? 'Stop marking' : 'Mark context';
    button.dataset.active = enabled ? 'true' : 'false';
    button.setAttribute('aria-pressed', enabled ? 'true' : 'false');
}

function syncPanelMarkModeState() {
    if (!panel) {
        return Promise.resolve(isClickMarkingActive);
    }

    return safeSendRuntimeMessageWithResponse({type: 'GET_MARK_MODE'}).then(function (response) {
        const enabled = !!(response && response.ok && response.enabled);
        isClickMarkingActive = enabled;
        updatePanelMarkModeButton(enabled);
        updatePanelAnchorNote();
        return enabled;
    });
}

function setPanelMarkMode(enabled) {
    return safeSendRuntimeMessageWithResponse({type: 'SET_MARK_MODE', enabled: !!enabled}).then(function (response) {
        const nextEnabled = !!(response && response.ok && response.enabled);
        isClickMarkingActive = nextEnabled;
        updatePanelMarkModeButton(nextEnabled);
        updatePanelAnchorNote();
        return response || {ok: false, enabled: false};
    });
}

function refreshPanelContextFromCurrentTarget() {
    if (!panel) {
        return;
    }

    setPanelContextValue(getCurrentPanelContextValue());

    updatePanelAnchorNote();
    updatePanelComposerActions();
}

function resetReplyPanelTransientFields(options) {
    if (!panel) {
        return;
    }

    const settings = options || {};
    const promptField = panel.querySelector('#sgpt-prompt');
    const outputField = panel.querySelector('#sgpt-out');
    const modifierField = panel.querySelector('#sgpt-modifier');

    if (settings.clearMarks) {
        clearMarkedContextSelection();
    }

    if (promptField) {
        promptField.value = '';
    }

    if (outputField) {
        outputField.value = '';
    }

    if (modifierField) {
        modifierField.value = '';
    }

    if (settings.clearContext) {
        activeReplyContextMeta = null;
        setPanelContextValue('');
    } else {
        setPanelContextValue(getCurrentPanelContextValue());
    }

    updatePanelAnchorNote();
    updatePanelComposerActions(settings.statusMessage, settings.statusTone);
}

function getReadablePanelText(value, depth) {
    const level = typeof depth === 'number' ? depth : 0;
    if (level > 5) {
        try {
            return JSON.stringify(value, null, 2);
        } catch (error) {
            return '';
        }
    }

    if (value == null) {
        return '';
    }

    if (typeof value === 'string') {
        return value;
    }

    if (typeof value === 'number' || typeof value === 'boolean') {
        return String(value);
    }

    if (Array.isArray(value)) {
        return value.map(function (item) {
            return getReadablePanelText(item, level + 1);
        }).filter(function (item) {
            return typeof item === 'string' && item.trim();
        }).join('\n\n');
    }

    if (typeof value === 'object') {
        const priorityKeys = ['output', 'text', 'result', 'message', 'content', 'reply', 'response', 'error'];
        for (let i = 0; i < priorityKeys.length; i += 1) {
            const candidate = value[priorityKeys[i]];
            const text = getReadablePanelText(candidate, level + 1);
            if (typeof text === 'string' && text.trim()) {
                return text;
            }
        }

        if (Array.isArray(value.choices)) {
            const choiceText = getReadablePanelText(value.choices, level + 1);
            if (choiceText && choiceText.trim()) {
                return choiceText;
            }
        }

        if (Array.isArray(value.data)) {
            const dataText = getReadablePanelText(value.data, level + 1);
            if (dataText && dataText.trim()) {
                return dataText;
            }
        }

        try {
            return JSON.stringify(value, null, 2);
        } catch (error) {
            return '';
        }
    }

    return String(value);
}

function getReadablePanelErrorText(value) {
    const text = getReadablePanelText(value);
    return text && text.trim() ? text : 'Unknown error';
}

function setActiveComposer(node) {
    const nextComposer = node && document.contains(node) ? node : null;
    const composerChanged = nextComposer !== activeComposer;

    activeComposer = nextComposer;
    if (panel) {
        if (composerChanged && panelAttachedComposer !== activeComposer) {
            panelAttachedComposer = activeComposer;
            resetReplyPanelTransientFields({clearMarks: true});
        } else if (!markedElements.length && !panelContextDirty) {
            refreshPanelContextFromCurrentTarget();
        }
        positionPanelNearComposer();
        updatePanelAnchorNote();
        updatePanelComposerActions();
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

    if (isClickMarkingActive) {
        note.textContent = 'Mark mode is active. Click page elements to add or remove context blocks.';
        return;
    }

    if (activeReplyContextMeta && activeReplyContextMeta.replyTarget) {
        note.textContent = 'Anchored to the current reply field. Reply target detected: ' + activeReplyContextMeta.replyTarget + '.';
        return;
    }

    if (activeReplyContextMeta && activeReplyContextMeta.source === 'generic-thread' && activeReplyContextMeta.threadSize > 1) {
        note.textContent = 'Anchored to the current field with nearby conversation context from visible parent/sibling blocks.';
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
    composerActionButton.textContent = 'Fill in with Tools';
    composerActionButton.style.position = 'fixed';
    composerActionButton.style.zIndex = '2147483646';
    composerActionButton.style.padding = '6px 10px';
    composerActionButton.style.border = 'none';
    composerActionButton.style.borderRadius = '999px';
    composerActionButton.style.background = '#008CBA';
    composerActionButton.style.color = '#fff';
    composerActionButton.style.fontSize = '12px';
    composerActionButton.style.cursor = 'grab';
    composerActionButton.style.userSelect = 'none';
    composerActionButton.style.touchAction = 'none';
    composerActionButton.style.boxShadow = '0 2px 10px rgba(0,0,0,0.18)';
    composerActionButton.style.display = 'none';
    composerActionButton.title = 'Open Tools for the selected field. Drag to move it away. Double-click to reset its position.';
    composerActionButton.addEventListener('click', function () {
        if (composerActionButton.dataset.dragSuppressClick === 'true') {
            return;
        }
        openReplyPanel();
    });
    document.body.appendChild(composerActionButton);
    enableComposerActionButtonDragging(composerActionButton);

    return composerActionButton;
}

function positionComposerActionButton() {
    const button = ensureComposerActionButton();
    if (composerActionButtonDragState && composerActionButtonDragState.dragging) {
        return;
    }

    if (!activeComposer || !document.contains(activeComposer)) {
        button.style.display = 'none';
        return;
    }

    const anchor = getComposerActionButtonAnchorPosition();
    if (!anchor) {
        button.style.display = 'none';
        return;
    }

    button.style.display = 'block';
    const left = anchor.left + (composerActionButtonDragOffset ? composerActionButtonDragOffset.left : 0);
    const top = anchor.top + (composerActionButtonDragOffset ? composerActionButtonDragOffset.top : 0);
    setComposerActionButtonCoordinates(button, left, top);
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

function buildGenericContextSnippet(node) {
    if (!node) {
        return '';
    }

    return normalizeWhitespace(getReadableContext(node));
}

function collectGenericVisibleThreadBlocks(targetNode) {
    if (!targetNode || !targetNode.parentElement) {
        return [];
    }

    const siblings = Array.from(targetNode.parentElement.children);
    const targetIndex = siblings.indexOf(targetNode);
    if (targetIndex === -1) {
        return [];
    }

    const records = [];
    const seen = new Set();

    for (let index = Math.max(0, targetIndex - 6); index <= targetIndex; index += 1) {
        const sibling = siblings[index];
        const block = sibling === targetNode
            ? targetNode
            : (sibling.matches && sibling.matches('[role="article"],article,[role="listitem"]')
                ? sibling
                : (sibling.querySelector ? sibling.querySelector('[role="article"],article,[role="listitem"]') : sibling));
        const text = buildGenericContextSnippet(block);

        if (!text || text.length < 20 || seen.has(text)) {
            continue;
        }

        seen.add(text);
        records.push(clipText(text, 500));
    }

    return records;
}

function buildGenericReplyContextFromComposer(node) {
    const targetNode = findContextNodeForComposer(node) || findFullContextNode(node);
    if (!targetNode) {
        return null;
    }

    const threadBlocks = collectGenericVisibleThreadBlocks(targetNode);
    const currentBlock = buildGenericContextSnippet(targetNode);
    if (!threadBlocks.length && !currentBlock) {
        return null;
    }

    const lines = [];
    const previousBlocks = threadBlocks.slice(0, Math.max(0, threadBlocks.length - 1));

    if (previousBlocks.length) {
        lines.push('Earlier visible context:');
        previousBlocks.forEach(function (entry) {
            lines.push('- ' + entry);
        });
    }

    lines.push('Current target block:');
    lines.push(threadBlocks.length ? threadBlocks[threadBlocks.length - 1] : clipText(currentBlock, 500));

    return {
        source: 'generic-thread',
        threadSize: previousBlocks.length + 1,
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

    if (activeComposer && document.contains(activeComposer)) {
        const genericReplyContext = buildGenericReplyContextFromComposer(activeComposer);
        if (genericReplyContext && genericReplyContext.text) {
            activeReplyContextMeta = genericReplyContext;
            return genericReplyContext.text;
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

    const snapshot = getAdminReporterSnapshot();
    const countersSnapshot = snapshot.totals || {};

    const toggle = adminActivitiesControl.querySelector('[data-role="toggle"]');
    const state = adminActivitiesControl.querySelector('[data-role="state"]');
    const counters = adminActivitiesControl.querySelector('[data-role="counters"]');
    const monitor = adminActivitiesControl.querySelector('[data-role="monitor"]');
    const recent = adminActivitiesControl.querySelector('[data-role="recent"]');
    const debugWrap = adminActivitiesControl.querySelector('[data-role="debug-wrap"]');
    const detected = adminActivitiesControl.querySelector('[data-role="detected"]');
    const bootstrap = adminActivitiesControl.querySelector('[data-role="bootstrap"]');
    const bootstrapMonitor = adminActivitiesControl.querySelector('[data-role="bootstrap-monitor"]');

    if (toggle) {
        toggle.textContent = adminIngestEnabled ? 'Disable activity statistics' : 'Enable activity statistics';
        toggle.style.background = adminIngestEnabled ? '#dc2626' : '#059669';
    }

    if (state) {
        state.textContent = adminLastStatusText;
    }

    if (counters) {
        counters.textContent = 'Detected: ' + (countersSnapshot.detected || 0)
            + ' · Pending: ' + (countersSnapshot.pending || 0)
            + ' · Sending: ' + (countersSnapshot.sending || 0)
            + ' · Failed: ' + (countersSnapshot.failed || 0)
            + ' · Submitted: ' + (countersSnapshot.sent || 0)
            + ' · Duplicates ignored: ' + (countersSnapshot.duplicates_ignored || 0);
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
        const latestDetected = sortAdminEntriesByRecency(snapshot.reportable_entries || []).slice(0, 5);
        if (!latestDetected.length) {
            detected.innerHTML = '<div style="color:#64748b;">No reportable admin-log entries detected yet.</div>';
        } else {
            detected.innerHTML = latestDetected.map(function (entry) {
                const labelParts = [entry.actor_name || 'Unknown actor'];
                if (entry.action) {
                    labelParts.push('→ ' + entry.action);
                } else if (entry.handled_outcome) {
                    labelParts.push('→ ' + entry.handled_outcome);
                }
                if (entry.target_name) {
                    labelParts.push('(' + entry.target_name + ')');
                }

                return '<div style="padding:6px 0; border-top:1px solid rgba(148,163,184,0.2);">'
                    + '<div style="font-weight:600; color:#0f766e;">' + escapeHtml(labelParts.join(' ')) + '</div>'
                    + '<div style="margin-top:2px; color:#64748b;">state=' + escapeHtml(entry.state || 'queued') + (entry.occurred_at ? ' · fb_time=' + escapeHtml(entry.occurred_at) : '') + '</div>'
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

    if (bootstrap) {
        bootstrap.innerHTML = renderBootstrapAdminScanDebug(latestBootstrapAdminScanDebug, 'Bootstrap body-read debug (content script)', 'No bootstrap body-read scan has run yet.');
    }

    if (bootstrapMonitor) {
        bootstrapMonitor.innerHTML = renderBootstrapAdminScanDebug(latestInjectedBootstrapAdminScanDebug, 'Bootstrap body-read debug (injected monitor)', 'No injected monitor bootstrap scan has run yet.');
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
        '<div style="margin-top:10px; font-weight:600; color:#334155;">Bootstrap body-read via content script</div>',
        '<div data-role="bootstrap" style="margin-top:4px; font-size:11px; line-height:1.35; color:#475569; max-height:220px; overflow:auto;">No bootstrap body-read scan has run yet.</div>',
        '<div style="margin-top:10px; font-weight:600; color:#334155;">Bootstrap body-read via injected monitor</div>',
        '<div data-role="bootstrap-monitor" style="margin-top:4px; font-size:11px; line-height:1.35; color:#475569; max-height:220px; overflow:auto;">No injected monitor bootstrap scan has run yet.</div>',
        '<div style="margin-top:10px; font-weight:600; color:#334155;">Recent monitor events (XHR/fetch/bootstrap)</div>',
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

        if (adminIngestEnabled) {
            disableAdminActivityCollection('Activity statistics disabled. This tab queue was cleared.', {
                reason: 'manual-disable',
                auto_disabled: false,
            });
            return;
        }

        adminIngestEnabled = true;
        adminLastStatusText = 'Activity statistics enabled for this exact Facebook URI. Changing Facebook location will auto-disable and clear the queue.';
        updateAdminActivitiesControl();
        debugLog({level: 'info', category: 'facebook-admin-ingest', message: 'Facebook admin ingest toggled.', meta: {enabled: adminIngestEnabled, url: location.href}});
        scheduleAdminActivitiesScan('manual-enable');
        scheduleAdminActivitiesBootstrapWarmup('manual-enable');
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
            : 'Admin activities page detected. Statistics are disabled until you enable them for this exact Facebook URI.';
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
    const previousHref = lastObservedLocationHref;
    if (!changed && reason !== 'init') {
        return;
    }

    if (changed && isFacebookPage()) {
        disableAdminActivityCollection(
            'Facebook URI changed. Activity statistics were auto-disabled and any queued entries were cleared for this tab.',
            {
                reason: reason || 'location-change',
                previous_url: previousHref,
                next_url: location.href,
                auto_disabled: true,
            }
        );
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
        ? (adminIngestEnabled
            ? 'Admin activities page detected. Waiting for Facebook XHR/fetch activity...'
            : 'Admin activities page detected. Statistics are disabled until you enable them for this exact Facebook URI.')
        : (adminIngestEnabled
            ? 'Admin activities page detected, but monitor injection has not completed yet.'
            : 'Admin activities page detected. Statistics are disabled until you enable them for this exact Facebook URI.');
    updateAdminActivitiesControl();
    if (adminIngestEnabled) {
        scheduleAdminActivitiesScan('location-change');
        scheduleAdminActivitiesBootstrapWarmup('location-change');
    }
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
    const normalizedTarget = normalizeAdminTargetInfo(entry.target_name || '', entry.target_type || '');
    const targetName = normalizedTarget.target_name ? normalizeWhitespace(normalizedTarget.target_name) : '';
    const targetType = normalizedTarget.target_type ? normalizeWhitespace(normalizedTarget.target_type) : '';
    const sourceUrl = normalizeWhitespace(entry.source_url || location.origin + location.pathname);
    const activityUrl = normalizeWhitespace(entry.activity_url || location.href);
    const occurredAt = normalizeAdminActivityTimeValue(entry.occurred_at || entry.facebook_activity_time || entry.activity_time || null);
    const groupId = typeof TNFacebookAdminReporter !== 'undefined' && TNFacebookAdminReporter
        ? TNFacebookAdminReporter.extractGroupIdFromUrl(sourceUrl || activityUrl)
        : '';
    const action = normalizeWhitespace(entry.action || handledStatusText || handledOutcome || actionText);
    const fallbackActorName = (handledStatusText && handledStatusText.indexOf('automatic') !== -1) ? 'Automatic moderation' : actorName;
    const finalActorName = actorName || fallbackActorName;

    if (!finalActorName || !actionText) {
        return null;
    }

    return {
        key: entry.key || [groupId || sourceUrl, occurredAt || '', finalActorName, actionText, action].join('|'),
        dedupe_key: entry.dedupe_key || null,
        group_id: entry.group_id || groupId || null,
        facebook_activity_time: occurredAt,
        source_url: sourceUrl,
        activity_url: activityUrl,
        occurred_at: occurredAt,
        detected_at: entry.detected_at || new Date().toISOString(),
        actor_name: finalActorName,
        description: actionText,
        action_text: actionText,
        action: action,
        target_name: targetName || null,
        target_type: targetType || null,
        handled_outcome: handledOutcome,
        handled_status_text: handledStatusText,
        raw_blue_segment: entry.raw_blue_segment || actionText,
        source_external_id: entry.source_external_id || null,
        source_external_slug: entry.source_external_slug || null,
        source_label: entry.source_label || entry.source_name || null,
        network_activity_id: entry.network_activity_id || null,
        client_event_key: entry.client_event_key || entry.dedupe_key || entry.key || null,
        plugin_version: 'tornevall-networks-social-media-tools/' + EXTENSION_VERSION,
    };
}

function rememberDetectedAdminEntries(entries, reason) {
    if (!entries || !entries.length) {
        return 0;
    }

    const normalizedEntries = entries.map(function (entry) {
        return normalizeAdminActivityEntry(entry);
    }).filter(Boolean);
    const discovery = adminActivityReporter.discoverEntries(normalizedEntries, {reason: reason || 'scan'});
    const added = discovery && typeof discovery.added === 'number' ? discovery.added : 0;

    if ((added || (discovery && discovery.duplicates)) && adminDebugEnabled) {
        const snapshot = getAdminReporterSnapshot();
        debugLog({
            level: 'info',
            category: 'facebook-admin-detection',
            message: 'Processed Facebook admin activity entries through the shared reporter queue.',
            meta: {
                reason: reason,
                added: added,
                duplicates_ignored: discovery && discovery.duplicates ? discovery.duplicates : 0,
                detected_total: snapshot.totals.detected,
                pending_total: snapshot.totals.pending,
            }
        });
    }

    return added;
}

function bootstrapSafeJsonParse(value) {
    try {
        return JSON.parse(value);
    } catch (error) {
        return null;
    }
}

function getBootstrapAdminScriptTextMatcher() {
    return /GroupAdminActivity|GroupsCometAdminActivity|management_activities|management_activity_log_target|admin_activities|RelayPrefetchedStreamCache|ScheduledServerJS|CometGroupAdminActivitiesActivityLogContentQueryRelayPreloader|adp_CometGroupAdminActivitiesActivityLogContentQueryRelayPreloader|activity_time|activity_title/i;
}

function isStrongBootstrapAdminScriptText(raw) {
    const text = String(raw || '');
    return /adp_CometGroupAdminActivitiesActivityLogContentQueryRelayPreloader|CometGroupAdminActivitiesActivityLogContentQueryRelayPreloader/.test(text)
        || /"__typename"\s*:\s*"GroupAdminActivity"|"__typename"\s*:\s*"GroupsCometAdminActivity"/.test(text)
        || (/management_activity_log_target/.test(text) && /management_activities/.test(text) && /activity_title/.test(text));
}

function scoreBootstrapAdminActivityScriptNode(node, raw) {
    const text = String(raw || '');
    const type = normalizeWhitespace(node && node.getAttribute ? node.getAttribute('type') : '').toLowerCase();
    let score = 0;

    if (node && document.body && document.body.contains(node)) score += 20;
    if (node && node.matches && node.matches('script[type="application/json"][data-sjs]')) {
        score += 140;
    } else if (node && node.hasAttribute && node.hasAttribute('data-sjs')) {
        score += 90;
    } else if (type === 'application/json') {
        score += 60;
    }

    if (/adp_CometGroupAdminActivitiesActivityLogContentQueryRelayPreloader|CometGroupAdminActivitiesActivityLogContentQueryRelayPreloader/.test(text)) score += 120;
    if (/"__typename"\s*:\s*"GroupAdminActivity"|"__typename"\s*:\s*"GroupsCometAdminActivity"/.test(text)) score += 110;
    if (/RelayPrefetchedStreamCache/.test(text)) score += 60;
    if (/management_activity_log_target/.test(text)) score += 40;
    if (/management_activities/.test(text)) score += 35;
    if (/GroupAdminActivity|GroupsCometAdminActivity/.test(text)) score += 30;
    if (/activity_title/.test(text)) score += 15;

    return score;
}

function collectBootstrapAdminActivityScriptNodes(debugState) {
    const bodyRoot = document.body || null;
    const root = bodyRoot || document.documentElement;
    const results = [];
    const seenNodes = new Set();
    const matcher = getBootstrapAdminScriptTextMatcher();
    const targetedXpathQueries = [
        ".//script[@type='application/json' and contains(., 'adp_CometGroupAdminActivitiesActivityLogContentQueryRelayPreloader')]",
        ".//script[@type='application/json' and contains(., 'CometGroupAdminActivitiesActivityLogContentQueryRelayPreloader')]",
        ".//script[@type='application/json' and contains(., 'GroupAdminActivity')]",
        ".//script[@type='application/json' and contains(., 'management_activity_log_target')]",
    ];

    function appendNode(node) {
        if (!node || seenNodes.has(node)) {
            return;
        }
        seenNodes.add(node);
        results.push(node);
    }

    function appendXPathMatches(scope, xpath) {
        if (!scope || typeof document.evaluate !== 'function' || typeof XPathResult === 'undefined') {
            return;
        }

        try {
            const snapshot = document.evaluate(xpath, scope, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
            if (debugState) {
                debugState.xpath_hits[xpath] = snapshot.snapshotLength;
            }
            for (let index = 0; index < snapshot.snapshotLength; index += 1) {
                appendNode(snapshot.snapshotItem(index));
            }
        } catch (error) {
            if (debugState) {
                debugState.xpath_hits[xpath] = 'error';
            }
            // Fall back to selector scanning below.
        }
    }

    if (bodyRoot) {
        targetedXpathQueries.forEach(function (xpath) {
            appendXPathMatches(bodyRoot, xpath);
        });
    }

    const primaryScripts = bodyRoot ? bodyRoot.querySelectorAll('script[type="application/json"]') : [];
    if (debugState) {
        debugState.body_available = !!bodyRoot;
        debugState.body_application_json_count = primaryScripts.length;
    }
    for (let i = 0; i < primaryScripts.length; i += 1) {
        const node = primaryScripts[i];
        const raw = node && typeof node.textContent === 'string' ? node.textContent : '';
        if (raw && raw.length >= 40 && (isStrongBootstrapAdminScriptText(raw) || matcher.test(raw))) {
            appendNode(node);
        }
    }

    if (!results.length && root) {
        if (debugState) {
            debugState.fallback_used = true;
        }
        const fallbackScripts = root.querySelectorAll('script[type="application/json"], script[data-sjs], script:not([src])');
        for (let i = 0; i < fallbackScripts.length; i += 1) {
            const node = fallbackScripts[i];
            const raw = node && typeof node.textContent === 'string' ? node.textContent : '';
            if (raw && raw.length >= 40 && matcher.test(raw)) {
                appendNode(node);
            }
        }
    }

    results.sort(function (left, right) {
        return scoreBootstrapAdminActivityScriptNode(right, right && right.textContent) - scoreBootstrapAdminActivityScriptNode(left, left && left.textContent);
    });

    if (debugState) {
        debugState.matched_script_count = results.length;
        debugState.top_scripts = results.slice(0, 5).map(function (node) {
            return summarizeBootstrapAdminScriptNode(node, node && node.textContent);
        });
    }

    return results;
}

function extractAdminActivityNamesFromTitle(title) {
    const titleText = normalizeWhitespace(title && title.text ? title.text : '');
    const ranges = title && Array.isArray(title.ranges) ? title.ranges.slice() : [];
    const names = [];

    ranges.sort(function (a, b) {
        return (a && typeof a.offset === 'number' ? a.offset : 0) - (b && typeof b.offset === 'number' ? b.offset : 0);
    });

    ranges.forEach(function (range) {
        if (!range) {
            return;
        }

        const entityName = normalizeWhitespace(range.entity && (range.entity.name || range.entity.text) ? (range.entity.name || range.entity.text) : '');
        const shortName = normalizeWhitespace(range.entity && range.entity.short_name ? range.entity.short_name : '');
        let slicedName = '';

        if (!entityName && titleText && typeof range.offset === 'number' && typeof range.length === 'number') {
            slicedName = normalizeWhitespace(titleText.slice(range.offset, range.offset + range.length));
        }

        const name = entityName || slicedName || shortName;
        if (name && names.indexOf(name) === -1) {
            names.push(name);
        }
    });

    return names;
}

function isBootstrapAdminActivityTypename(typename) {
    const value = normalizeWhitespace(typename);
    return value === 'GroupAdminActivity' || value === 'GroupsCometAdminActivity';
}

function parseBootstrapAdminActivityNode(node) {
    if (!node || !isBootstrapAdminActivityTypename(node.__typename)) {
        return null;
    }

    const actionText = normalizeWhitespace(node.activity_title && node.activity_title.text ? node.activity_title.text : '');
    if (!actionText || !shouldConsiderAdminActivityText(actionText)) {
        return null;
    }

    const names = extractAdminActivityNamesFromTitle(node.activity_title);
    const lowered = actionText.toLowerCase();
    const isAutomatic = !!node.is_automatic_action || lowered.indexOf('automatiskt') !== -1 || lowered.indexOf('automatically') !== -1;
    let actorName = isAutomatic ? 'Automatic moderation' : (names[0] || '');
    const targetName = isAutomatic ? (names[0] || names[1] || '') : (names[1] || '');

    if (!actorName && names[0]) {
        actorName = names[0];
    }
    if (!actorName) {
        actorName = isAutomatic ? 'Automatic moderation' : 'Unknown actor';
    }

    return normalizeAdminActivityEntry({
        key: [location.href, String(node.id || ''), actorName, targetName || '', actionText].join('|'),
        source_url: location.href,
        activity_url: location.href,
        occurred_at: node.activity_time ? new Date(node.activity_time * 1000).toISOString() : null,
        facebook_activity_time: node.activity_time ? new Date(node.activity_time * 1000).toISOString() : null,
        actor_name: actorName,
        action_text: actionText,
        target_name: targetName || null,
        handled_outcome: detectHandledOutcomeFromText(actionText),
        handled_status_text: detectHandledStatusFromText(actionText),
        raw_blue_segment: actionText,
        network_activity_id: node.id || null,
        is_automatic_action: isAutomatic,
    });
}

function getBootstrapAdminActivityEdgeLists(value) {
    return [
        value.data && value.data.node && value.data.node.management_activities && value.data.node.management_activities.edges,
        value.data && value.data.management_activity_log_target && value.data.management_activity_log_target.management_activities && value.data.management_activity_log_target.management_activities.edges,
        value.result && value.result.data && value.result.data.management_activity_log_target && value.result.data.management_activity_log_target.management_activities && value.result.data.management_activity_log_target.management_activities.edges,
        value.__bbox && value.__bbox.result && value.__bbox.result.data && value.__bbox.result.data.management_activity_log_target && value.__bbox.result.data.management_activity_log_target.management_activities && value.__bbox.result.data.management_activity_log_target.management_activities.edges,
        value.payload && value.payload.__bbox && value.payload.__bbox.result && value.payload.__bbox.result.data && value.payload.__bbox.result.data.management_activity_log_target && value.payload.__bbox.result.data.management_activity_log_target.management_activities && value.payload.__bbox.result.data.management_activity_log_target.management_activities.edges,
        value.next && value.next.result && value.next.result.data && value.next.result.data.management_activity_log_target && value.next.result.data.management_activity_log_target.management_activities && value.next.result.data.management_activity_log_target.management_activities.edges,
        value.next && value.next.payload && value.next.payload.__bbox && value.next.payload.__bbox.result && value.next.payload.__bbox.result.data && value.next.payload.__bbox.result.data.management_activity_log_target && value.next.payload.__bbox.result.data.management_activity_log_target.management_activities && value.next.payload.__bbox.result.data.management_activity_log_target.management_activities.edges,
    ];
}

function walkBootstrapAdminActivities(value, results, seenKeys) {
    if (!value) {
        return;
    }

    if (Array.isArray(value)) {
        value.forEach(function (item) {
            walkBootstrapAdminActivities(item, results, seenKeys);
        });
        return;
    }

    if (typeof value !== 'object') {
        return;
    }

    if (isBootstrapAdminActivityTypename(value.__typename)) {
        const parsedNode = parseBootstrapAdminActivityNode(value);
        if (parsedNode && !seenKeys[parsedNode.key]) {
            seenKeys[parsedNode.key] = true;
            results.push(parsedNode);
        }
    }

    getBootstrapAdminActivityEdgeLists(value).forEach(function (edgeList) {
        if (!Array.isArray(edgeList)) {
            return;
        }

        edgeList.forEach(function (edge) {
            const parsedNode = parseBootstrapAdminActivityNode(edge && edge.node ? edge.node : null);
            if (parsedNode && !seenKeys[parsedNode.key]) {
                seenKeys[parsedNode.key] = true;
                results.push(parsedNode);
            }
        });
    });

    Object.keys(value).forEach(function (key) {
        if (key === 'data' || key === 'result' || key === 'payload' || key === 'extensions' || key === '__bbox' || key === 'require' || key === 'handle' || key === 'next') {
            walkBootstrapAdminActivities(value[key], results, seenKeys);
        }
    });
}

function parseAdminActivityEntriesFromBootstrapText(text, debugState) {
    const raw = String(text || '');
    const lowered = raw.toLowerCase();
    const results = [];
    const seenKeys = {};
    const parsedChunks = [];
    const scriptDebug = debugState ? {
        preview: clipText(normalizeWhitespace(raw), 180),
        raw_length: raw.length,
        chunk_count: 0,
        used_single_parse: false,
        entry_count: 0,
        entry_preview: '',
    } : null;

    if (!raw || (lowered.indexOf('groupadminactivity') === -1 && lowered.indexOf('groupscometadminactivity') === -1 && lowered.indexOf('management_activities') === -1 && lowered.indexOf('management_activity_log_target') === -1 && lowered.indexOf('admin_activities') === -1 && lowered.indexOf('relayprefetchedstreamcache') === -1 && lowered.indexOf('scheduledserverjs') === -1 && lowered.indexOf('cometgroupadminactivitiesactivitylogcontentqueryrelaypreloader') === -1 && lowered.indexOf('adp_cometgroupadminactivitiesactivitylogcontentqueryrelaypreloader') === -1 && lowered.indexOf('activity_title') === -1)) {
        if (debugState) {
            debugState.skipped_matcher += 1;
        }
        return results;
    }

    raw.split(/\n+(?=\{)/g).forEach(function (part) {
        const parsed = bootstrapSafeJsonParse(part);
        if (parsed) {
            parsedChunks.push(parsed);
        }
    });

    if (scriptDebug) {
        scriptDebug.chunk_count = parsedChunks.length;
    }

    if (!parsedChunks.length) {
        const singleParsed = bootstrapSafeJsonParse(raw);
        if (singleParsed) {
            parsedChunks.push(singleParsed);
            if (scriptDebug) {
                scriptDebug.used_single_parse = true;
            }
        } else if (debugState) {
            debugState.parse_failures += 1;
        }
    }

    parsedChunks.forEach(function (parsed) {
        walkBootstrapAdminActivities(parsed, results, seenKeys);
    });

    if (scriptDebug) {
        scriptDebug.entry_count = results.length;
        scriptDebug.entry_preview = results.length ? clipText(results.slice(0, 2).map(function (entry) {
            return entry.action_text || '';
        }).join(' · '), 180) : '';
        debugState.parsed_scripts.push(scriptDebug);
    }

    return results;
}

function collectBootstrapAdminActivityEntries(reason) {
    if (!isFacebookAdminActivitiesPage()) {
        return [];
    }

    const debugState = buildBootstrapAdminScanDebug(reason);
    const scripts = collectBootstrapAdminActivityScriptNodes(debugState);
    const results = [];
    const seenKeys = new Set();
    const matcher = getBootstrapAdminScriptTextMatcher();

    for (let i = 0; i < scripts.length; i += 1) {
        const raw = scripts[i] && typeof scripts[i].textContent === 'string' ? scripts[i].textContent : '';
        if (!raw || raw.length < 40) {
            debugState.skipped_short += 1;
            continue;
        }
        if (!matcher.test(raw)) {
            debugState.skipped_matcher += 1;
            continue;
        }

        debugState.scripts_considered += 1;

        const parsedEntries = parseAdminActivityEntriesFromBootstrapText(raw, debugState);
        if (parsedEntries.length) {
            debugState.scripts_with_entries += 1;
        }

        parsedEntries.forEach(function (entry) {
            if (entry && !seenKeys.has(entry.key)) {
                seenKeys.add(entry.key);
                results.push(entry);
            }
        });
    }

    debugState.entries_detected = results.length;
    debugState.detected_entry_preview = results.slice(0, 5).map(function (entry) {
        return clipText(entry && entry.action_text ? entry.action_text : '', 180);
    });
    debugState.outcome = results.length
        ? 'entries-detected'
        : (debugState.matched_script_count
            ? 'matched-scripts-but-no-entries'
            : (debugState.body_application_json_count ? 'body-json-found-no-matches' : 'no-body-json-scripts'));
    latestBootstrapAdminScanDebug = debugState;

    if (adminDebugEnabled) {
        debugLog({
            level: 'info',
            category: 'facebook-admin-bootstrap',
            message: 'Bootstrap body-read scan completed.',
            meta: {
                reason: debugState.reason,
                outcome: debugState.outcome,
                body_available: debugState.body_available,
                body_application_json_count: debugState.body_application_json_count,
                matched_script_count: debugState.matched_script_count,
                scripts_considered: debugState.scripts_considered,
                scripts_with_entries: debugState.scripts_with_entries,
                entries_detected: debugState.entries_detected,
                pending_added: debugState.pending_added,
                fallback_used: debugState.fallback_used,
                xpath_hits: debugState.xpath_hits,
                top_scripts: debugState.top_scripts,
                parsed_scripts: debugState.parsed_scripts.slice(0, 5),
                detected_entry_preview: debugState.detected_entry_preview,
            }
        });
    }

    return results;
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

    const targetCandidate = names.length > 1 ? names[1] : null;
    const normalizedTarget = normalizeAdminTargetInfo(targetCandidate, null);
    const targetName = normalizedTarget.target_name;
    const targetType = normalizedTarget.target_type;
    const occurredAt = extractOccurredAtFromVisibleAdminContainer(container);
    const key = [location.href, actorName, occurredAt || '', actionText].join('|');

    return normalizeAdminActivityEntry({
        key: key,
        source_url: location.href,
        activity_url: location.href,
        occurred_at: occurredAt,
        facebook_activity_time: occurredAt,
        actor_name: actorName,
        action_text: actionText,
        target_name: targetName,
        target_type: targetType,
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
    if (adminFlushInProgress) {
        adminFlushRequestedWhileBusy = true;
        return;
    }

    adminFlushInProgress = true;

    try {
        if (!isFacebookAdminActivitiesPage()) {
            return;
        }

        if (!adminIngestEnabled) {
            adminLastStatusText = 'Admin activities page detected. Statistics are disabled until you enable them for this exact Facebook URI.';
            updateAdminActivitiesControl();
            return;
        }

        const bootstrapEntries = collectBootstrapAdminActivityEntries(reason || 'bootstrap-scan');
        const bootstrapAdded = rememberDetectedAdminEntries(bootstrapEntries, reason || 'bootstrap-scan');
        if (latestBootstrapAdminScanDebug) {
            latestBootstrapAdminScanDebug.pending_added = bootstrapAdded;
        }
        rememberDetectedAdminEntries(collectVisibleAdminActivityEntries(), reason || 'visible-scan');

        updateAdminActivitiesControl();

        const initialSnapshot = getAdminReporterSnapshot();

        if (!initialSnapshot.totals.pending) {
            adminLastStatusText = 'Listening for admin-log changes. No new detected entries are waiting.';
            updateAdminActivitiesControl();
            return;
        }

        let submittedThisRun = 0;
        let receivedThisRun = 0;
        let createdThisRun = 0;
        let updatedThisRun = 0;
        let batch = adminActivityReporter.startNextBatch(MAX_ADMIN_BATCH_SIZE, {reason: reason || 'scheduled-scan'});

        while (batch.length) {
            adminActiveSendBatch = batch.slice();
            adminLastStatusText = 'Sending Facebook admin bulk: ' + batch.length + ' entr' + (batch.length === 1 ? 'y' : 'ies') + ' in this batch.';
            updateAdminActivitiesControl();

            try {
                const response = await submitAdminActivityEntriesBatch(batch);
                const data = response.data || {};
                adminActivityReporter.markBatchSent(batch, data, {reason: reason || 'scheduled-scan'});
                adminActiveSendBatch = null;
                submittedThisRun += batch.length;
                receivedThisRun += typeof data.received === 'number' ? data.received : batch.length;
                createdThisRun += typeof data.created === 'number' ? data.created : 0;
                updatedThisRun += typeof data.updated === 'number' ? data.updated : 0;
            } catch (error) {
                if (adminActiveSendBatch && adminActiveSendBatch.length) {
                    adminActivityReporter.markBatchFailed(adminActiveSendBatch, error, {reason: reason || 'scheduled-scan'});
                }
                adminActiveSendBatch = null;
                const failedSnapshot = getAdminReporterSnapshot();
                adminLastStatusText = 'Bulk send failed after ' + submittedThisRun + ' submitted entr' + (submittedThisRun === 1 ? 'y' : 'ies') + '. '
                    + (error && error.message ? error.message : 'Could not submit admin-log batch.')
                    + ' Pending retry: ' + (failedSnapshot.totals.pending || 0) + '.';
                updateAdminActivitiesControl();
                debugLog({level: 'error', category: 'facebook-admin-ingest', message: adminLastStatusText, meta: {reason: reason, batch_size: batch.length}});
                return;
            }

            batch = adminActivityReporter.startNextBatch(MAX_ADMIN_BATCH_SIZE, {reason: reason || 'scheduled-scan'});
        }

        const finalSnapshot = getAdminReporterSnapshot();
        adminLastStatusText = submittedThisRun > 0
            ? 'Facebook admin bulk complete. Attempted: ' + submittedThisRun
                + ' · Received: ' + receivedThisRun
                + ' · Created: ' + createdThisRun
                + ' · Updated/duplicate-safe: ' + updatedThisRun
                + ' · Queue remaining: ' + (finalSnapshot.totals.pending || 0)
            : 'Listening for admin-log changes. No new detected entries to submit right now.';
        updateAdminActivitiesControl();
    } finally {
        adminActiveSendBatch = null;
        adminFlushInProgress = false;
        if (adminFlushRequestedWhileBusy) {
            adminFlushRequestedWhileBusy = false;
            scheduleAdminActivitiesScan((reason || 'scheduled-scan') + '-followup');
        }
    }
}

function scheduleAdminActivitiesScan(reason) {
    if (adminActivitiesScanScheduled || !adminIngestEnabled || !isFacebookAdminActivitiesPage()) {
        return;
    }

    adminActivitiesScanScheduled = true;
    setTimeout(function () {
        adminActivitiesScanScheduled = false;
        flushAdminActivitiesToTools(reason);
    }, 450);
}

function requestInjectedBootstrapAdminScan(reason) {
    if (!isFacebookAdminActivitiesPage()) {
        return;
    }

    try {
        window.postMessage({
            source: 'tn-networks-social-media-tools-content',
            type: 'REQUEST_BOOTSTRAP_SCAN',
            reason: reason || 'content-script-request',
        }, '*');
    } catch (error) {
    }
}

function scheduleAdminActivitiesBootstrapWarmup(reason) {
    if (!adminIngestEnabled || !isFacebookAdminActivitiesPage()) {
        return;
    }

    const expectedHref = location.href;
    [0, 900, 2200].forEach(function (delay, index) {
        setTimeout(function () {
            if (location.href !== expectedHref || !isFacebookAdminActivitiesPage()) {
                return;
            }
            const warmupReason = (reason || 'bootstrap') + '-warmup-' + index;
            requestInjectedBootstrapAdminScan(warmupReason);
            scheduleAdminActivitiesScan(warmupReason);
        }, delay);
    });
}

// ---------------------------------------------
// PANEL HTML
// ---------------------------------------------
function panelHTML() {
    return `
    <style id="sgpt-style">
      #sgpt-panel{position:fixed;bottom:16px;right:16px;width:360px;max-height:70vh;background:#fff !important;border:1px solid #ccc;border-radius:6px;box-shadow:0 4px 14px rgba(0,0,0,0.15);z-index:2147483647;display:flex;flex-direction:column;font-family:system-ui,sans-serif !important;font-size:14px;color:#0f172a !important;color-scheme:light;isolation:isolate}
      #sgpt-panel,#sgpt-panel *{box-sizing:border-box}
      #sgpt-panel[data-collapsed="true"]{transform:translateX(calc(100% - 42px));transition:transform .3s}
      #sgpt-head{display:flex;align-items:center;background:#008CBA;color:#fff;padding:4px 8px;border-top-left-radius:6px;border-top-right-radius:6px}
      #sgpt-close{margin-left:auto;background:transparent;border:none;color:#fff;font-size:18px;cursor:pointer}
      #sgpt-body{flex:1;display:flex;flex-direction:column;padding:8px;overflow:hidden}
      #sgpt-body label{display:flex;flex-direction:column;gap:4px;font-size:12px;font-weight:600;color:#334155 !important}
      #sgpt-body input[type=text],#sgpt-body textarea,#sgpt-body select{width:100%;margin-bottom:6px;border:1px solid #bfc7d1 !important;border-radius:4px;padding:6px 8px;background:#fff !important;color:#111827 !important;-webkit-text-fill-color:#111827 !important;caret-color:#111827 !important;opacity:1 !important;font:13px/1.4 Arial,sans-serif !important;appearance:none}
      #sgpt-body input[type=text]::placeholder,#sgpt-body textarea::placeholder{color:#6b7280 !important;-webkit-text-fill-color:#6b7280 !important;opacity:1 !important}
      #sgpt-body input[type=text]:focus,#sgpt-body textarea:focus,#sgpt-body select:focus{outline:none;border-color:#1999c6 !important;box-shadow:0 0 0 2px rgba(25,153,198,.15)}
      #sgpt-body textarea{resize:vertical;min-height:60px;max-height:160px}
      #sgpt-context{background:#f8fafc !important}
      #sgpt-send,#sgpt-mod,#sgpt-verify,#sgpt-paste,#sgpt-paste-send{margin-right:4px;padding:4px 10px;border:none;border-radius:4px;background:#008CBA;color:#fff;cursor:pointer;font:13px/1.35 Arial,sans-serif !important}
      #sgpt-verify{background:#7c3aed}
      #sgpt-paste,#sgpt-paste-send{background:#0f766e}
      #sgpt-send[disabled],#sgpt-mod[disabled],#sgpt-verify[disabled],#sgpt-paste[disabled],#sgpt-paste-send[disabled]{opacity:.55;cursor:not-allowed}
      #sgpt-foot{display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap}
      #sgpt-responder-label{font-size:12px;color:#666;margin-bottom:6px;text-align:right}
      #sgpt-anchor-note{font-size:11px;color:#666;margin-bottom:8px}
      #sgpt-compose-status{font-size:11px;color:#64748b;flex:1 1 180px}
      .sgpt-quick-settings{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin-bottom:8px}
      .sgpt-quick-settings select,.sgpt-quick-settings input{margin-bottom:0}
      .sgpt-inline-tools{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:4px}
      .sgpt-inline-tools > span{font-size:12px;font-weight:600;color:#334155 !important}
      .sgpt-inline-actions{display:flex;gap:6px;flex-wrap:wrap;justify-content:flex-end}
      .sgpt-inline-actions button{padding:3px 8px;border:1px solid #94a3b8;border-radius:999px;background:#fff;color:#0f172a;cursor:pointer;font:12px/1.2 Arial,sans-serif !important}
      .sgpt-inline-actions button[data-active="true"]{background:#0ea5e9;color:#fff;border-color:#0284c7}
    </style>
    <div id="sgpt-head">Tornevall Networks Social Media Tools ↔ <button id="sgpt-close">×</button></div>
    <div id="sgpt-body">
      <div id="sgpt-responder-label">Responder: <span id="sgpt-responder-name" data-name="${frontResponserName || ''}">${frontResponserName || '(loading...)'}</span></div>
      <div id="sgpt-anchor-note">Anchored to the currently focused text field.</div>
      <label>Prompt<input type="text" id="sgpt-prompt" placeholder="Leave blank to use the default reply instruction."></label>
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
      <div class="sgpt-inline-tools"><span>Context</span><div class="sgpt-inline-actions"><button type="button" id="sgpt-context-mark" aria-pressed="false">Mark context</button><button type="button" id="sgpt-context-import">Import</button><button type="button" id="sgpt-context-clear">Clear</button></div></div>
      <textarea id="sgpt-context" placeholder="Import visible page context or write your own context here."></textarea>
      <label>Output<textarea id="sgpt-out"></textarea></label>
      <div id="sgpt-foot"><div id="sgpt-compose-status">Select a text field to enable paste/fill actions.</div><div><button id="sgpt-send">Generate</button><button id="sgpt-mod">Modify</button><button id="sgpt-verify">Verify fact</button><button id="sgpt-paste">Paste into field</button><button id="sgpt-paste-send">Paste + Send</button></div></div>
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
        clearMarkedContextSelection();
        panel.remove();
        panel = null;
        panelAttachedComposer = null;
        panelContextDirty = false;
    });

    panel.querySelector('#sgpt-send').addEventListener('click', () => sendGPT(false));
    panel.querySelector('#sgpt-mod').addEventListener('click', () => sendGPT(true));
    panel.querySelector('#sgpt-verify').addEventListener('click', () => startFactVerification());
    panel.querySelector('#sgpt-paste').addEventListener('click', () => {
        const result = pasteTextIntoActiveComposer(panel.querySelector('#sgpt-out').value, {submit: false});
        updatePanelComposerActions(result.ok ? result.message : result.error, result.ok ? 'success' : 'error');
    });
    panel.querySelector('#sgpt-paste-send').addEventListener('click', () => {
        const result = pasteTextIntoActiveComposer(panel.querySelector('#sgpt-out').value, {submit: true});
        if (result.ok && result.submitted) {
            resetReplyPanelTransientFields({clearContext: true, clearMarks: true, statusMessage: result.message, statusTone: 'success'});
            return;
        }
        updatePanelComposerActions(result.ok ? result.message : result.error, result.ok ? 'success' : 'error');
    });
    panel.querySelector('#sgpt-context').addEventListener('input', () => {
        panelContextDirty = true;
        updatePanelAnchorNote();
        updatePanelComposerActions();
    });
    panel.querySelector('#sgpt-context-import').addEventListener('click', () => {
        refreshPanelContextFromCurrentTarget();
    });
    panel.querySelector('#sgpt-context-clear').addEventListener('click', () => {

function stopMarkModeKeepingCurrentContext() {
    isClickMarkingActive = false;
    safeSendRuntimeMessage({type: 'SET_MARK_MODE', enabled: false});
    updatePanelMarkModeButton(false);
    updatePanelAnchorNote();
}

function resetReplyTransientFieldsButKeepContext() {
    if (!panel) {
        return;
    }

    const modifierField = panel.querySelector('#sgpt-modifier');
    if (modifierField) {
        modifierField.value = '';
    }

    stopMarkModeKeepingCurrentContext();
    updatePanelComposerActions();
}
        clearMarkedContextSelection();
        activeReplyContextMeta = null;
        setPanelContextValue('');
        updatePanelAnchorNote();
        updatePanelComposerActions('Context cleared. You can import fresh context or write your own.', 'success');
    });
    panel.querySelector('#sgpt-context-mark').addEventListener('click', async () => {
        const response = await setPanelMarkMode(!isClickMarkingActive);
        if (response && response.ok) {
            updatePanelComposerActions(response.enabled ? 'Mark mode is active. Click page elements to add/remove context blocks.' : 'Mark mode stopped. Current marked context remains in the box.', response.enabled ? 'success' : undefined);
        } else {
            updatePanelComposerActions('Could not toggle mark mode in this tab.', 'error');
        }
    });
    panel.querySelector('#sgpt-out').addEventListener('input', () => updatePanelComposerActions());

    positionPanelNearComposer();
    updatePanelComposerActions();
    syncPanelMarkModeState();

    return panel;
}

function openReplyPanel() {
    const p = createPanel();

    p.dataset.collapsed = 'false';
    panelAttachedComposer = activeComposer && document.contains(activeComposer) ? activeComposer : null;
    resetReplyPanelTransientFields();
    positionPanelNearComposer();
    updatePanelAnchorNote();
    updatePanelComposerActions();
    syncPanelMarkModeState();
    p.querySelector('#sgpt-prompt').focus();

    isClickMarkingActive = false;
    safeSendRuntimeMessage({type: 'TOGGLE_MARK_MODE', enabled: false});

    safeStorageSyncGet(['responderName', 'autoDetectResponder', 'defaultMood', 'defaultCustomMood', 'lastResponseLength'], (data) => {
        const label = p.querySelector('#sgpt-responder-name');
        const moodField = p.querySelector('#sgpt-mood');
        const customMoodField = p.querySelector('#sgpt-custom');
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
    const promptField = panel.querySelector('#sgpt-prompt');
    const prompt = promptField ? promptField.value.trim() : '';
    const effectivePrompt = prompt || DEFAULT_REPLY_PROMPT;
    const modifierField = panel.querySelector('#sgpt-modifier');
    const modifier = mod && modifierField ? modifierField.value.trim() : '';
    const modelField = panel.querySelector('#sgpt-model');
    const model = modelField ? modelField.value : '';
    showLoader();

    const selectedLength = panel.querySelector('#sgpt-length').value;
    safeStorageSyncSet({ lastResponseLength: selectedLength });

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
        userPrompt: effectivePrompt,
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
        setPanelContextValue(getCurrentPanelContextValue());
        updatePanelAnchorNote();
        updatePanelComposerActions();
        syncPanelMarkModeState();
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
    clearMarkedContextSelection();

    if (panel) {
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

        refreshPanelContextFromCurrentTarget();
    }
}

function startFactVerification() {
    const contextField = panel ? panel.querySelector('#sgpt-context') : null;
    const context = contextField ? contextField.value.trim() : '';

    if (!context) {
        alert('There is no context to verify yet. Import, mark, or write context first.');
        return;
    }

    showLoader();
    updatePanelComposerActions('Verifying the current context…', 'success');

    safeSendRuntimeMessage({
        type: 'GPT_REQUEST',
        context,
        userPrompt: 'Search facts and verify the following statements. If you find any false or misleading information, provide a detailed explanation of why it is incorrect. Use plain text, no format and no markdown.',
        requestMode: 'verify',
        responderName: frontResponserName || 'VerifierBot'
    });

    if (markedElements.length) {
        clearMarkedContextSelection();
    }
}

// ---------------------------------------------
// MAIN LISTENER
// ---------------------------------------------
safeAddRuntimeMessageListener(function (req, sender, sendResponse) {
    if (req.type === 'GET_FACEBOOK_ADMIN_REPORTER_STATUS') {
        sendResponse(buildAdminReporterStatusPayload());
        return true;
    }

    if (req.type === 'SHOW_LOADER') return showLoader();
    if (req.type === 'HIDE_LOADER') return hideLoader();

    if (req.type === 'TOGGLE_MARK_MODE') {
        isClickMarkingActive = req.enabled;
        updatePanelMarkModeButton(!!req.enabled);
        updatePanelAnchorNote();
    } else if (req.type === 'OPEN_REPLY_PANEL') {
        openReplyPanel();
    } else if (req.type === 'GPT_RESPONSE') {
        hideLoader();
        if (panel) {
            const outputElement = panel.querySelector('#sgpt-out');
            if (outputElement) {
                outputElement.value = req.ok
                    ? getReadablePanelText(req.payload)
                    : getReadablePanelErrorText(req.error || req.payload);
                resetReplyTransientFieldsButKeepContext();
                if (req.ok) {
                    updatePanelComposerActions();
                } else {
                    updatePanelComposerActions('Tools request failed. Review the output above before pasting anything.', 'error');
                }
                return;
            }
        }

        showFactResultBox(req.ok ? getReadablePanelText(req.payload) : getReadablePanelErrorText(req.error || req.payload));

    } else if (req.type === 'START_FACT_VERIFICATION') {
        startFactVerification();
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
    let addedFromPayload = 0;
    if (adminIngestEnabled && networkEntry.detected_entries && networkEntry.detected_entries.length) {
        addedFromPayload = rememberDetectedAdminEntries(networkEntry.detected_entries, payload && payload.bootstrap_debug ? 'injected-bootstrap-scan' : 'network-event');
    }

    if (networkEntry.detected_entries && networkEntry.detected_entries.length) {
        mirrorAdminDetectionsToConsole(networkEntry.detected_entries, networkEntry);
    }

    if (payload && payload.bootstrap_debug) {
        latestInjectedBootstrapAdminScanDebug = Object.assign({}, payload.bootstrap_debug, {
            pending_added: addedFromPayload,
        });

        if (adminDebugEnabled) {
            debugLog({
                level: 'info',
                category: 'facebook-admin-bootstrap-monitor',
                message: 'Injected monitor bootstrap scan completed.',
                meta: latestInjectedBootstrapAdminScanDebug,
            });
        }
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
            ? 'Observed ' + networkEntry.detected_count + ' admin activity entr' + (networkEntry.detected_count === 1 ? 'y' : 'ies') + '. Statistics are disabled, so nothing was queued.'
            : (networkEntry.interesting
                ? 'Interesting activity detected, but statistics are disabled for this URI.'
                : 'Statistics are disabled for this exact Facebook URI. Enable them only when you want to collect from this page.'));
    updateAdminActivitiesControl();
    if (adminIngestEnabled && networkEntry.interesting) {
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
