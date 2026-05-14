let markedElements = [], isClickMarkingActive = false, panel, activeComposer = null, composerActionButton = null, quickResponseActionButton = null, adminActivitiesControl = null, soundCloudInsightsControl = null, participantRequestsControl = null;
let panelAttachedComposer = null;
let panelContextDirty = false;
let panelDragState = null;
let panelManualPosition = null;
let panelDockMode = 'auto';
let verifyActionButton = null;
let verifyActionContext = '';
let verifyActionAnchor = null;
let selectionToolboxActionButton = null;
let selectionToolboxContext = '';
let selectionToolboxAnchor = null;
let verifyHoverButton = null;
let verifyHoverContext = '';
let verifyHoverAnchor = null;
let verifyHoverTarget = null;
let verifyHoverShowTimer = null;
let verifyHoverHideTimer = null;
let verifyHoverButtonDragState = null;
let verifyHoverButtonDragOffset = null;
let factResultBox = null;
let factResultAnchor = null;
let factResultBoxDragState = null;
let factResultBoxManualPosition = null;
let composerActionButtonDragState = null;
let composerActionButtonDragOffset = null;
let quickResponseActionButtonDragState = null;
let quickResponseActionButtonDragOffset = null;
let composerActionButtonDragListenersBound = false;
let frontResponserName = '';
let extensionUiLanguage = 'auto';
let defaultResponseLanguage = 'auto';
let defaultVerifyFactLanguage = 'auto';
let preferredFactCheckModel = 'gpt-4o';
let defaultQuickReplyPreset = 'default';
let defaultQuickReplyCustomInstruction = '';
let markedContextLabelMode = 'compact';
let markedContextExpansionMode = 'current';
let pendingAiRequestMode = null;
let lastVerificationRequest = null;
let availableToolsModels = [
    {id: 'gpt-4o-mini', label: 'gpt-4o-mini'},
    {id: 'gpt-4o', label: 'gpt-4o'},
    {id: 'gpt-4.1-mini', label: 'gpt-4.1-mini'},
    {id: 'gpt-4.1', label: 'gpt-4.1'},
    {id: 'o4-mini', label: 'o4-mini'},
    {id: 'o3-mini', label: 'o3-mini'},
];
let defaultToolsModel = 'gpt-4o-mini';
let preferredToolsModel = '';
let modelsCatalogLoading = false;
let selectionActionButtonTimer = null;
let participantRequestsScanScheduled = false;
let participantRequestsScanTimerId = null;
let participantRequestsDomObserver = null;
let participantRequestsObservedRoot = null;
let participantRequestsScanInProgress = false;
let participantRequestsAutoScanIntervalId = null;
let participantRequestsScrollListenerBound = false;
let participantRequestsScrollHandler = null;
let participantRequestsScrollTimerId = null;
let participantRequestsLastScanAt = 0;
let participantRequestsEnhancedCardCount = 0;
let participantRequestsLastSummary = '';
let participantRequestsLastScanDurationMs = 0;
let participantRequestsVisibleCards = [];
let participantRequestsLastSelectedCard = null;
let participantRequestsLastSelectedSummary = null;
let participantRequestsLastSelectedReason = '';
let activeParticipantUserAnalysis = null;
let participantAnalysisMutationTimerId = null;
let participantAnalysisAutoSupplementTimerId = null;
let participantAnalysisAutoSupplementStatusTimerId = null;
let participantScannerGroupContext = '';
let participantScannerConfigBox = null;
let participantHistoryLookupTimerId = null;
let participantHistoryLookupInFlight = false;
let participantHistoryLookupQueued = false;
let participantHistoryLookupLastSignature = '';
let participantHistoryLookupLastFetchedAt = 0;
let participantHistoryLookupError = '';
let participantHistoryLookupGroupReference = '';
let participantHistoryByCandidateKey = {};

const EDITABLE_SELECTOR = 'textarea,input[type="text"],input:not([type]),[contenteditable=""],[contenteditable="true"],[role="textbox"]';
const TOOLS_PROD_BASE_URL = 'https://tools.tornevall.net';
const TOOLS_DEV_BASE_URL = 'https://tools.tornevall.com';
const FACEBOOK_INGEST_PATH = '/api/social-media-tools/facebook/ingest';
const ADMIN_ACTIVITY_KEYWORDS = ['admin', 'activity', 'log', 'godk', 'approved', 'approve', 'avvis', 'rejected', 'reject', 'declined', 'request', 'participate', 'förfrågan', 'removed', 'tagit bort', 'deleted', 'delete', 'revoked', 'återkall', 'blocked', 'block', 'banned', 'ban', 'spam', 'member', 'reported', 'report', 'member-reported', 'anmält', 'anmälda', 'anmäld', 'rapporterad', 'pending post', 'comment', 'kommentar', 'automatiskt', 'automatically', 'published', 'group'];
const IGNORED_LINK_TEXTS = ['gilla', 'svara', 'svara som', 'kommentera', 'dela', 'visa alla', 'visa fler svar', 'like', 'reply', 'share', 'comment', 'send', 'gif'];
const MAX_RECENT_NETWORK_EVENTS = 8;
const MAX_ADMIN_BATCH_SIZE = 50;
const ADMIN_PANEL_POSITION_STORAGE_KEY = 'tn_social_tools_admin_panel_position';
const SOUND_CLOUD_PANEL_POSITION_STORAGE_KEY = 'tn_social_tools_soundcloud_panel_position';
const PARTICIPANT_SCANNER_PANEL_POSITION_STORAGE_KEY = 'tn_social_tools_participant_scanner_panel_position';
const PARTICIPANT_SCANNER_PANEL_DOCKED_STORAGE_KEY = 'tn_social_tools_participant_scanner_panel_docked';
const NETWORK_MONITOR_STATE_ATTRIBUTE = 'data-tn-network-monitor-active';
const SOUNDCLOUD_BUFFER_ELEMENT_ID = 'tn-networks-soundcloud-buffer';
const SOUND_CLOUD_DIRECT_HOOK_READY_ATTRIBUTE = 'data-tn-soundcloud-hook-ready';
const SOUND_CLOUD_DIRECT_BUFFER_ELEMENT_ID = 'tn-soundcloud-direct-capture-buffer';
const SOUND_CLOUD_INSIGHTS_CAPTURE_ENABLED = false;
const MAX_RECENT_FACEBOOK_COMMENT_ENTRIES = 200;
const PARTICIPANT_HISTORY_LOOKUP_DEBOUNCE_MS = 650;
const PARTICIPANT_HISTORY_LOOKUP_TTL_MS = 2 * 60 * 1000;
const DEFAULT_REPLY_PROMPT = 'Write text that fits the visible context and can be pasted into the selected field.';
const MARKED_CONTEXT_LABEL_MODES = ['compact', 'mark-id', 'detailed'];
const MARKED_CONTEXT_EXPANSION_MODES = ['current', 'parent', 'parent-children', 'document'];
const PANEL_DOCK_MODES = ['auto', 'right', 'left', 'bottom-right', 'bottom-left'];
const MIN_SELECTION_ACTION_LENGTH = 2;
const EXTENSION_RUNTIME_RESPONSE_TIMEOUT_MS = 15000;
const TOOLS_FETCH_TIMEOUT_MS = 15000;
const extensionI18n = globalThis.TNNetworksExtensionI18n || {
    locale: 'en',
    t: function (key, params, fallback) {
        return typeof fallback !== 'undefined' ? fallback : key;
    },
    setLocale: function () {
        return 'en';
    }
};
const ct = function (key, params, fallback) {
    return extensionI18n.t(key, params, fallback);
};
const QUICK_REPLY_PRESETS = {
    default: {
        label: 'Balanced default',
        instruction: 'Write the best possible short public reply to the current message or comment. Sound natural, relevant, and ready to paste.',
    },
    empathetic: {
        label: 'Empathetic and human',
        instruction: 'Write a warm, human quick reply that shows understanding, avoids sounding robotic, and still stays concise.',
    },
    factual: {
        label: 'Calm and factual',
        instruction: 'Write a calm, factual quick reply that keeps emotions low, stays concrete, and avoids unnecessary filler.',
    },
    deescalate: {
        label: 'De-escalate tension',
        instruction: 'Write a short reply that lowers tension, stays respectful, and keeps the conversation constructive.',
    },
};
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

    if (typeof chrome === 'undefined' || !chrome) {
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
        if (!chrome.runtime || typeof chrome.runtime.getManifest !== 'function') {
            return 'unknown';
        }
        return chrome.runtime.getManifest().version;
    }, 'unknown');
}

function safeRuntimeGetURL(path) {
    return safeChromeCall(function () {
        if (!chrome.runtime || typeof chrome.runtime.getURL !== 'function') {
            return '';
        }
        return chrome.runtime.getURL(path);
    }, '');
}

function safeSendRuntimeMessage(message) {
    return safeChromeCall(function () {
        if (!chrome.runtime || typeof chrome.runtime.sendMessage !== 'function') {
            return false;
        }
        chrome.runtime.sendMessage(message);
        return true;
    }, false);
}

function safeSendRuntimeMessageWithResponse(message) {
    return new Promise(function (resolve) {
        let settled = false;
        const timeoutId = window.setTimeout(function () {
            if (settled) {
                return;
            }

            settled = true;
            resolve({
                ok: false,
                error: 'The extension runtime timed out before it returned a response.',
            });
        }, EXTENSION_RUNTIME_RESPONSE_TIMEOUT_MS);

        const sent = safeChromeCall(function () {
            if (!chrome.runtime || typeof chrome.runtime.sendMessage !== 'function') {
                return false;
            }
            chrome.runtime.sendMessage(message, function (response) {
                if (settled) {
                    return;
                }

                settled = true;
                window.clearTimeout(timeoutId);

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
            if (settled) {
                return;
            }

            settled = true;
            window.clearTimeout(timeoutId);
            resolve({ok: false, error: 'Extension runtime unavailable.'});
        }
    });
}

function safeStorageSyncGet(keys, callback) {
    const result = safeChromeCall(function () {
        if (!chrome.storage || !chrome.storage.sync || typeof chrome.storage.sync.get !== 'function') {
            return false;
        }
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
        if (!chrome.storage || !chrome.storage.sync || typeof chrome.storage.sync.set !== 'function') {
            if (typeof callback === 'function') {
                callback();
            }
            return false;
        }
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
        if (!chrome.runtime || !chrome.runtime.onMessage || typeof chrome.runtime.onMessage.addListener !== 'function') {
            return false;
        }
        chrome.runtime.onMessage.addListener(handler);
        return true;
    }, false);
}

function safeAddStorageChangeListener(handler) {
    return safeChromeCall(function () {
        if (!chrome.storage || !chrome.storage.onChanged || typeof chrome.storage.onChanged.addListener !== 'function') {
            return false;
        }
        chrome.storage.onChanged.addListener(handler);
        return true;
    }, false);
}

function getRetryToolsBaseUrls(baseUrl) {
    const normalized = String(baseUrl || '').trim();
    const candidates = normalized ? [normalized] : [];

    if (normalized === TOOLS_PROD_BASE_URL && candidates.indexOf(TOOLS_DEV_BASE_URL) === -1) {
        candidates.push(TOOLS_DEV_BASE_URL);
    }

    return candidates;
}

function extractToolsApiMessage(data) {
    if (data && typeof data.user_message === 'string' && data.user_message.trim()) {
        return data.user_message.trim();
    }

    if (data && typeof data.error === 'string' && data.error.trim()) {
        return data.error.trim();
    }

    if (data && typeof data.message === 'string' && data.message.trim()) {
        return data.message.trim();
    }

    return '';
}

function isAuthFailureStatus(status, data) {
    if (status === 401) {
        return true;
    }

    if (status !== 403) {
        return false;
    }

    const message = extractToolsApiMessage(data).toLowerCase();

    return message.indexOf('authentication') !== -1
        || message.indexOf('unauthenticated') !== -1
        || message.indexOf('unauthorized') !== -1
        || message.indexOf('bearer token') !== -1
        || message.indexOf('forbidden') !== -1
        || message.indexOf('missing permission') !== -1
        || message.indexOf('not allowed to use the requested tools feature') !== -1;
}

function normalizeToolsApiError(status, data) {
    const apiMessage = extractToolsApiMessage(data);

    if (status === 401) {
        return apiMessage || 'Authentication failed. Check your personal Tools bearer token.';
    }

    if (status === 403) {
        return apiMessage || 'Access denied for this Tools request.';
    }

    if (status === 503) {
        return apiMessage || 'Tools is reachable, but the backend could not complete the request right now.';
    }

    if (status === 504) {
        return apiMessage || 'OpenAI is taking longer than expected right now. Please try again in a moment.';
    }

    return apiMessage || 'Tools API request failed (' + status + ')';
}

async function fetchWithTimeout(url, options, timeoutMs) {
    const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
    let timeoutId = null;

    if (controller) {
        timeoutId = window.setTimeout(function () {
            controller.abort();
        }, timeoutMs || TOOLS_FETCH_TIMEOUT_MS);
    }

    try {
        return await fetch(url, Object.assign({}, options || {}, controller ? {signal: controller.signal} : {}));
    } finally {
        if (timeoutId) {
            window.clearTimeout(timeoutId);
        }
    }
}

function shouldFallbackFacebookIngestToDirectFetch(message) {
    const normalized = String(message || '').trim().toLowerCase();
    if (!normalized) {
        return true;
    }

    return normalized.indexOf('extension runtime unavailable') !== -1
        || normalized.indexOf('no response from extension runtime') !== -1
        || normalized.indexOf('receiving end does not exist') !== -1
        || normalized.indexOf('could not establish connection') !== -1
        || normalized.indexOf('message port closed') !== -1;
}

async function callFacebookAdminIngestDirect(apiToken, baseUrl, payload) {
    const baseUrls = getRetryToolsBaseUrls(baseUrl);
    let lastFailure = null;

    for (let index = 0; index < baseUrls.length; index += 1) {
        const currentBaseUrl = baseUrls[index];

        try {
            const response = await fetchWithTimeout(currentBaseUrl + FACEBOOK_INGEST_PATH, {
                method: 'POST',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + apiToken,
                },
                body: JSON.stringify(payload || {}),
            }, TOOLS_FETCH_TIMEOUT_MS);
            const data = await response.json().catch(function () {
                return {};
            });

            if ((!response.ok || !data.ok) && response.status >= 300 && response.status < 400 && index < baseUrls.length - 1) {
                lastFailure = {
                    status: response.status,
                    data: data,
                };
                continue;
            }

            if (!response.ok || !data.ok) {
                const errorMessage = normalizeToolsApiError(response.status, data);
                if (isAuthFailureStatus(response.status, data)) {
                    debugLog({
                        level: 'error',
                        category: 'facebook-admin-ingest',
                        message: 'Direct Facebook admin batch fallback hit an auth failure.',
                        meta: {
                            baseUrl: currentBaseUrl,
                            status: response.status,
                            error: errorMessage,
                        },
                    });
                }

                return {ok: false, error: errorMessage, status: response.status, data: data};
            }

            return {ok: true, status: response.status, data: data};
        } catch (error) {
            lastFailure = {
                status: 0,
                data: {
                    message: error && error.name === 'AbortError'
                        ? 'Facebook admin activity ingest timed out before Tools answered.'
                        : (error && error.message ? error.message : 'Error calling Tools API.'),
                },
            };
        }
    }

    return {
        ok: false,
        status: lastFailure && typeof lastFailure.status === 'number' ? lastFailure.status : 0,
        error: normalizeToolsApiError(lastFailure && typeof lastFailure.status === 'number' ? lastFailure.status : 0, lastFailure ? lastFailure.data : {}),
        data: lastFailure ? lastFailure.data : {},
    };
}

function normalizeResponseLanguageChoice(value) {
    const normalized = String(value || '').trim().toLowerCase();
    return ['auto', 'sv', 'en', 'da', 'no', 'de', 'fr', 'es'].indexOf(normalized) !== -1
        ? normalized
        : 'auto';
}

function normalizeExtensionUiLanguage(value) {
    const normalized = String(value || '').trim().toLowerCase();
    return ['auto', 'en', 'sv'].indexOf(normalized) !== -1
        ? normalized
        : 'auto';
}

function applyExtensionUiLanguage(value) {
    extensionUiLanguage = normalizeExtensionUiLanguage(value);
    if (typeof extensionI18n.setLocale === 'function') {
        extensionI18n.setLocale(extensionUiLanguage);
    }
    refreshLocalizedExtensionUi();
}

function getEmptyContextPrompt() {
    return '(' + ct('contentScript.anchorFocusOrMark', {}, 'Focus a text field or mark elements to build context.') + ')';
}

function normalizeQuickReplyPresetChoice(value) {
    const normalized = String(value || '').trim().toLowerCase();
    return Object.prototype.hasOwnProperty.call(QUICK_REPLY_PRESETS, normalized)
        ? normalized
        : 'default';
}

function normalizeMarkedContextLabelMode(value) {
    const normalized = String(value || '').trim().toLowerCase();
    return MARKED_CONTEXT_LABEL_MODES.indexOf(normalized) !== -1
        ? normalized
        : 'compact';
}

function normalizeMarkedContextExpansionMode(value) {
    const normalized = String(value || '').trim().toLowerCase();
    return MARKED_CONTEXT_EXPANSION_MODES.indexOf(normalized) !== -1
        ? normalized
        : 'current';
}

function normalizePanelDockMode(value) {
    const normalized = String(value || '').trim().toLowerCase();
    return PANEL_DOCK_MODES.indexOf(normalized) !== -1
        ? normalized
        : 'auto';
}

function normalizeModelOption(option) {
    const id = option && option.id ? normalizeWhitespace(option.id) : '';
    if (!id) {
        return null;
    }

    return {
        id: id,
        label: option && option.label ? normalizeWhitespace(option.label) : id,
    };
}

function normalizeAvailableToolsModels(models) {
    const seen = new Set();
    const normalized = [];

    (Array.isArray(models) ? models : []).forEach(function (option) {
        const normalizedOption = normalizeModelOption(option);
        if (!normalizedOption || seen.has(normalizedOption.id)) {
            return;
        }

        seen.add(normalizedOption.id);
        normalized.push(normalizedOption);
    });

    return normalized.length ? normalized : [
        {id: 'gpt-4o-mini', label: 'gpt-4o-mini'},
        {id: 'gpt-4o', label: 'gpt-4o'},
        {id: 'gpt-4.1-mini', label: 'gpt-4.1-mini'},
        {id: 'gpt-4.1', label: 'gpt-4.1'},
        {id: 'o4-mini', label: 'o4-mini'},
        {id: 'o3-mini', label: 'o3-mini'},
    ];
}

function resolveDefaultToolsModel(models, candidate) {
    const normalizedCandidate = normalizeWhitespace(candidate || '');
    const available = normalizeAvailableToolsModels(models);

    if (normalizedCandidate && available.some(function (option) {
        return option.id === normalizedCandidate;
    })) {
        return normalizedCandidate;
    }

    return available[0] ? available[0].id : 'gpt-4o-mini';
}

function getAvailableModelIds() {
    return normalizeAvailableToolsModels(availableToolsModels).map(function (option) {
        return option.id;
    });
}

function populatePanelModelOptions(selectedModel) {
    if (!panel) {
        return;
    }

    const modelField = panel.querySelector('#sgpt-model');
    if (!modelField) {
        return;
    }

    const available = normalizeAvailableToolsModels(availableToolsModels);
    defaultToolsModel = resolveDefaultToolsModel(available, defaultToolsModel);
    const resolvedSelection = resolveDefaultToolsModel(available, selectedModel || preferredToolsModel || defaultToolsModel);

    modelField.innerHTML = '';
    available.forEach(function (option) {
        const optionElement = document.createElement('option');
        optionElement.value = option.id;
        optionElement.textContent = option.label || option.id;
        modelField.appendChild(optionElement);
    });
    modelField.value = resolvedSelection;
}

function getPreferredDeepVerificationModel(currentModel) {
    const availableIds = getAvailableModelIds();
    const normalizedCurrentModel = normalizeWhitespace(currentModel || '');

    const preferredThinkingModels = ['o3', 'o4-mini', 'o3-mini', 'o1', 'o1-mini'];
    for (let index = 0; index < preferredThinkingModels.length; index += 1) {
        if (availableIds.indexOf(preferredThinkingModels[index]) !== -1) {
            return preferredThinkingModels[index];
        }
    }
    if (availableIds.indexOf('o3-mini') !== -1) {
        return 'o3-mini';
    }
    if (availableIds.indexOf('o4-mini') !== -1) {
        return 'o4-mini';
    }
    if (normalizedCurrentModel && availableIds.indexOf(normalizedCurrentModel) !== -1) {
        return normalizedCurrentModel;
    }

    return resolveDefaultToolsModel(availableToolsModels, defaultToolsModel);
}

function resolvePreferredFactCheckModel(value) {
    const candidate = normalizeWhitespace(value || '');
    const availableIds = getAvailableModelIds();

    if (candidate && availableIds.indexOf(candidate) !== -1) {
        return candidate;
    }
    if (availableIds.indexOf('gpt-4o') !== -1) {
        return 'gpt-4o';
    }

    return resolveDefaultToolsModel(availableToolsModels, preferredToolsModel || defaultToolsModel || 'gpt-4o');
}

async function refreshAvailableModelsForPanel(forceRefresh) {
    if (modelsCatalogLoading) {
        return false;
    }

    modelsCatalogLoading = true;

    try {
        const response = await safeSendRuntimeMessageWithResponse({
            type: 'GET_AVAILABLE_MODELS',
            forceRefresh: !!forceRefresh,
        });

        if (response && Array.isArray(response.models) && response.models.length) {
            availableToolsModels = normalizeAvailableToolsModels(response.models);
            defaultToolsModel = resolveDefaultToolsModel(availableToolsModels, response.defaultModel || defaultToolsModel);
            populatePanelModelOptions(preferredToolsModel || defaultToolsModel);
            safeStorageSyncSet({
                availableToolsModels: availableToolsModels,
                defaultToolsModel: defaultToolsModel,
            });
            return true;
        }

        populatePanelModelOptions(preferredToolsModel || defaultToolsModel);
        return false;
    } finally {
        modelsCatalogLoading = false;
    }
}

safeStorageSyncGet(['extensionUiLanguage', 'defaultResponseLanguage', 'defaultVerifyFactLanguage', 'preferredFactCheckModel', 'defaultQuickReplyPreset', 'defaultQuickReplyCustomInstruction', 'availableToolsModels', 'defaultToolsModel', 'preferredToolsModel', 'markedContextLabelMode', 'markedContextExpansionMode', 'panelDockMode'], function (data) {
    applyExtensionUiLanguage(data.extensionUiLanguage || extensionUiLanguage);
    defaultResponseLanguage = normalizeResponseLanguageChoice(data.defaultResponseLanguage || 'auto');
    defaultVerifyFactLanguage = normalizeResponseLanguageChoice(data.defaultVerifyFactLanguage || defaultResponseLanguage || 'auto');
    preferredFactCheckModel = resolvePreferredFactCheckModel(data.preferredFactCheckModel || 'gpt-4o');
    defaultQuickReplyPreset = normalizeQuickReplyPresetChoice(data.defaultQuickReplyPreset || 'default');
    defaultQuickReplyCustomInstruction = normalizeWhitespace(data.defaultQuickReplyCustomInstruction || '');
    availableToolsModels = normalizeAvailableToolsModels(data.availableToolsModels || availableToolsModels);
    defaultToolsModel = resolveDefaultToolsModel(availableToolsModels, data.defaultToolsModel || defaultToolsModel);
    preferredToolsModel = resolveDefaultToolsModel(availableToolsModels, data.preferredToolsModel || defaultToolsModel);
    preferredFactCheckModel = resolvePreferredFactCheckModel(data.preferredFactCheckModel || preferredFactCheckModel);
    markedContextLabelMode = normalizeMarkedContextLabelMode(data.markedContextLabelMode || markedContextLabelMode);
    markedContextExpansionMode = normalizeMarkedContextExpansionMode(data.markedContextExpansionMode || markedContextExpansionMode);
    panelDockMode = normalizePanelDockMode(data.panelDockMode || panelDockMode);
    refreshMarkedElementPresentation();
});

safeAddStorageChangeListener(function (changes, areaName) {
    if (areaName !== 'sync') {
        return;
    }

    if (changes.extensionUiLanguage) {
        applyExtensionUiLanguage(changes.extensionUiLanguage.newValue || extensionUiLanguage);
    }
    if (changes.defaultResponseLanguage) {
        defaultResponseLanguage = normalizeResponseLanguageChoice(changes.defaultResponseLanguage.newValue || 'auto');
    }
    if (changes.defaultVerifyFactLanguage) {
        defaultVerifyFactLanguage = normalizeResponseLanguageChoice(changes.defaultVerifyFactLanguage.newValue || defaultResponseLanguage || 'auto');
    }
    if (changes.preferredFactCheckModel) {
        preferredFactCheckModel = resolvePreferredFactCheckModel(changes.preferredFactCheckModel.newValue || 'gpt-4o');
    }
    if (changes.defaultQuickReplyPreset) {
        defaultQuickReplyPreset = normalizeQuickReplyPresetChoice(changes.defaultQuickReplyPreset.newValue || 'default');
    }
    if (changes.defaultQuickReplyCustomInstruction) {
        defaultQuickReplyCustomInstruction = normalizeWhitespace(changes.defaultQuickReplyCustomInstruction.newValue || '');
    }
    if (changes.markedContextLabelMode) {
        markedContextLabelMode = normalizeMarkedContextLabelMode(changes.markedContextLabelMode.newValue || 'compact');
    }
    if (changes.markedContextExpansionMode) {
        markedContextExpansionMode = normalizeMarkedContextExpansionMode(changes.markedContextExpansionMode.newValue || 'current');
    }
    if (changes.panelDockMode) {
        panelDockMode = normalizePanelDockMode(changes.panelDockMode.newValue || panelDockMode);
        panelManualPosition = null;
        positionPanelNearComposer();
    }
    if (changes.availableToolsModels) {
        availableToolsModels = normalizeAvailableToolsModels(changes.availableToolsModels.newValue || availableToolsModels);
        preferredFactCheckModel = resolvePreferredFactCheckModel(preferredFactCheckModel);
        populatePanelModelOptions(preferredToolsModel || defaultToolsModel);
    }
    if (changes.defaultToolsModel) {
        defaultToolsModel = resolveDefaultToolsModel(availableToolsModels, changes.defaultToolsModel.newValue || defaultToolsModel);
        preferredFactCheckModel = resolvePreferredFactCheckModel(preferredFactCheckModel);
        populatePanelModelOptions(preferredToolsModel || defaultToolsModel);
    }
    if (changes.preferredToolsModel) {
        preferredToolsModel = resolveDefaultToolsModel(availableToolsModels, changes.preferredToolsModel.newValue || preferredToolsModel || defaultToolsModel);
        populatePanelModelOptions(preferredToolsModel);
    }

    if (changes.markedContextLabelMode || changes.markedContextExpansionMode || changes.extensionUiLanguage) {
        handleMarkedContextSettingsChanged();
    }
});

const EXTENSION_VERSION = getExtensionVersion();

let adminIngestEnabled = false;
let adminDebugEnabled = false;
let adminFeatureEnabled = false;
let participantScannerFeatureEnabled = false;
let adminActivitiesScanScheduled = false;
let adminFlushInProgress = false;
let adminFlushRequestedWhileBusy = false;
let adminActiveSendBatch = null;
let networkMonitorInjected = false;
let adminLastStatusText = 'Passive activity detection is ready. Statistics are off.';
let soundCloudPageBridge = null;
let adminNetworkEventsSeen = 0;
let adminInterestingNetworkEventsSeen = 0;
let adminLastNetworkEventAt = 0;
let adminNetworkDebugAnnounced = false;
let lastObservedLocationHref = location.href;
let adminActivitiesControlDragState = null;
let adminActivitiesDragListenersBound = false;
let soundCloudInsightsControlDragState = null;
let soundCloudInsightsDragListenersBound = false;
let participantRequestsControlDragState = null;
let participantRequestsDragListenersBound = false;
let soundCloudAutoIngestEnabled = false;
let soundCloudAutoIngestTouchedThisVisit = false;
let soundCloudToolsTokenConfigured = false;
let soundCloudDirectHookReady = false;
let soundCloudDirectHookMeta = null;
let soundCloudBackgroundPendingCaptureCount = 0;
let soundCloudBackgroundDuplicateCaptureCount = 0;
let soundCloudBackgroundLastFlush = null;
let activeReplyContextMeta = null;
let latestBootstrapAdminScanDebug = null;
let latestInjectedBootstrapAdminScanDebug = null;
let latestRssSiteMatches = [];
const recentAdminNetworkEvents = [];
const facebookCommentEntryKeys = new Set();
const recentFacebookCommentEntries = [];
const PARTICIPANT_REQUEST_SCAN_DEBOUNCE_MS = 650;
const PARTICIPANT_REQUEST_SCROLL_SETTLE_MS = 850;
const PARTICIPANT_REQUEST_AUTO_SCAN_INTERVAL_MS = 5000;
const PARTICIPANT_REQUEST_ACTION_VIEWPORT_MARGIN = 260;
const PARTICIPANT_REQUEST_MAX_ACTION_CANDIDATES = 140;
const PARTICIPANT_REQUEST_MIN_CARD_SCORE = 120;
const PARTICIPANT_REQUEST_CARD_PARENT_DEPTH = 30;

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
        releaseSendingEntries: function () { return 0; },
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

function buildAdminLastSubmissionSummary(lastSubmission, sendingState) {
    if ((!lastSubmission || typeof lastSubmission !== 'object') && !(sendingState && sendingState.active)) {
        return '';
    }

    if (sendingState && sendingState.active && lastSubmission && lastSubmission.status === 'sending') {
        return 'Bulk send in progress. Attempting ' + (sendingState.attempted || lastSubmission.attempted || 0)
            + ' entr' + ((sendingState.attempted || lastSubmission.attempted || 0) === 1 ? 'y' : 'ies')
            + ' · elapsed ' + (sendingState.elapsed_seconds || 0) + 's'
            + (sendingState.is_stale ? ' · response looks stuck' : '') + '.';
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

    if (lastSubmission.status === 'released') {
        return 'Manual release moved ' + (lastSubmission.released || 0)
            + ' entr' + ((lastSubmission.released || 0) === 1 ? 'y' : 'ies')
            + ' back to retry state. Queue remaining: ' + (lastSubmission.queue_remaining || 0) + '.';
    }

    return '';
}

function buildAdminReporterStatusPayload() {
    const snapshot = getAdminReporterSnapshot();
    const reportableEntries = sortAdminEntriesByRecency(snapshot.reportable_entries || []).slice(0, 5);
    const counters = snapshot.totals || {};
    const sendingState = snapshot.sending_state || null;

    return {
        ok: true,
        page_url: location.href,
        is_facebook_page: isFacebookPage(),
        is_admin_page: isFacebookAdminActivitiesPage(),
        feature_enabled: adminFeatureEnabled,
        ingest_enabled: adminIngestEnabled,
        debug_enabled: adminDebugEnabled,
        state_text: adminFeatureEnabled
            ? adminLastStatusText
            : 'Facebook admin activity statistics are disabled in the config page. Enable the feature there before using this page.',
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
        sending_state: sendingState,
        last_submission: snapshot.last_submission || null,
        last_submission_text: buildAdminLastSubmissionSummary(snapshot.last_submission, sendingState),
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

function syncAdminRuntimePreferences() {
    getToolsRuntimeSettings().then(function (data) {
        const nextDebugEnabled = !!(data && data.facebookAdminDebugEnabled);
        const nextFeatureEnabled = !!(data && data.facebookAdminStatsEnabled);
        const featureWasEnabled = adminFeatureEnabled;

        adminDebugEnabled = nextDebugEnabled;
        adminFeatureEnabled = nextFeatureEnabled;

        if (!adminFeatureEnabled) {
            if (adminIngestEnabled) {
                disableAdminActivityCollection('Facebook admin activity statistics were disabled in the config page. This tab queue was cleared.', {
                    reason: 'popup-feature-disabled',
                    auto_disabled: false,
                });
            } else {
                adminLastStatusText = 'Facebook admin activity statistics are disabled in the config page.';
            }
            ensureAdminActivitiesControl();
            return;
        }

        if (!featureWasEnabled && isFacebookAdminActivitiesPage()) {
            adminLastStatusText = 'Admin activities page detected. Statistics are disabled until you enable them for this exact Facebook URI.';
            injectNetworkMonitor();
            ensureAdminActivitiesControl();
        }

        updateAdminActivitiesControl();
    });
}

function normalizeWhitespace(value) {
    return String(value || '').replace(/\s+/g, ' ').trim();
}

function getResponseLanguageLabel(value) {
    const normalized = normalizeResponseLanguageChoice(value || defaultResponseLanguage);
    return {
        auto: ct('option.language.autoContext', {}, 'Same as the selected content/context'),
        sv: ct('option.language.sv', {}, 'Swedish'),
        en: ct('option.language.en', {}, 'English'),
        da: ct('option.language.da', {}, 'Danish'),
        no: ct('option.language.no', {}, 'Norwegian'),
        de: ct('option.language.de', {}, 'German'),
        fr: ct('option.language.fr', {}, 'French'),
        es: ct('option.language.es', {}, 'Spanish'),
    }[normalized] || ct('option.language.autoContext', {}, 'Same as the selected content/context');
}

function setLabelText(label, text) {
    if (!label) {
        return;
    }

    const textNode = Array.from(label.childNodes).find(function (node) {
        return node && node.nodeType === Node.TEXT_NODE;
    });

    if (textNode) {
        textNode.textContent = text;
    }
}

function refreshLocalizedPanelUi() {
    if (!panel) {
        return;
    }

    const head = panel.querySelector('#sgpt-head');
    if (head && head.firstChild) {
        head.firstChild.textContent = ct('contentScript.panelTitle', {}, 'Tornevall Networks Social Media Tools ↔') + ' ';
    }

    const closeButton = panel.querySelector('#sgpt-close');
    if (closeButton) {
        closeButton.setAttribute('aria-label', ct('contentScript.closeToolbox', {}, 'Close Toolbox'));
        closeButton.title = ct('contentScript.closeToolbox', {}, 'Close Toolbox');
    }

    const responderLabel = panel.querySelector('#sgpt-responder-label');
    if (responderLabel && responderLabel.firstChild) {
        responderLabel.firstChild.textContent = ct('contentScript.responder', {}, 'Responder') + ': ';
    }

    const promptField = panel.querySelector('#sgpt-prompt');
    if (promptField) {
        setLabelText(promptField.parentElement, ct('contentScript.promptLabel', {}, 'Prompt'));
        promptField.placeholder = ct('contentScript.promptPlaceholder', {}, 'Leave blank to use the default reply instruction.');
    }

    const modelField = panel.querySelector('#sgpt-model');
    if (modelField) {
        setLabelText(modelField.parentElement, ct('contentScript.modelLabel', {}, 'Model'));
    }

    const lengthField = panel.querySelector('#sgpt-length');
    if (lengthField) {
        setLabelText(lengthField.parentElement, ct('contentScript.lengthLabel', {}, 'Length'));
        const lengthLabels = [
            ct('contentScript.lengthAuto', {}, 'Let GPT decide'),
            ct('contentScript.lengthAsShort', {}, 'As short as possible'),
            ct('contentScript.lengthShortest', {}, 'At maximum one sentence. Possibly a one-liner.'),
            ct('contentScript.lengthVeryShort', {}, '2–3 sentences (very short)'),
            ct('contentScript.lengthShort', {}, '4–6 sentences (short)'),
            ct('contentScript.lengthMedium', {}, '6–10 sentences (medium)'),
            ct('contentScript.lengthExtreme', {}, 'Extreme. You want your own book.'),
            ct('contentScript.lengthLong', {}, 'Extended (whatever is needed)')
        ];
        Array.from(lengthField.options).forEach(function (option, index) {
            if (typeof lengthLabels[index] !== 'undefined') {
                option.textContent = lengthLabels[index];
            }
        });
    }

    const customMoodField = panel.querySelector('#sgpt-custom');
    if (customMoodField) {
        setLabelText(customMoodField.parentElement, ct('contentScript.customMoodLabel', {}, 'Custom mood'));
    }

    const modifierField = panel.querySelector('#sgpt-modifier');
    if (modifierField) {
        setLabelText(modifierField.parentElement, ct('contentScript.changeRequestLabel', {}, 'Change request'));
        modifierField.placeholder = ct('contentScript.changeRequestPlaceholder', {}, 'Optional: what should change?');
    }

    const languageField = panel.querySelector('#sgpt-language');
    if (languageField) {
        setLabelText(languageField.parentElement, ct('contentScript.languageLabel', {}, 'Language'));
        const languageLabels = [
            ct('option.language.autoContext', {}, 'Same as the selected content/context'),
            ct('option.language.sv', {}, 'Swedish'),
            ct('option.language.en', {}, 'English'),
            ct('option.language.da', {}, 'Danish'),
            ct('option.language.no', {}, 'Norwegian'),
            ct('option.language.de', {}, 'German'),
            ct('option.language.fr', {}, 'French'),
            ct('option.language.es', {}, 'Spanish')
        ];
        Array.from(languageField.options).forEach(function (option, index) {
            if (typeof languageLabels[index] !== 'undefined') {
                option.textContent = languageLabels[index];
            }
        });
    }

    const dockModeField = panel.querySelector('#sgpt-dock-mode');
    if (dockModeField) {
        setLabelText(dockModeField.parentElement, ct('contentScript.dockModeLabel', {}, 'Panel mode'));
        const dockLabels = [
            ct('contentScript.dockModeAuto', {}, 'Auto near field'),
            ct('contentScript.dockModeRight', {}, 'Attached right'),
            ct('contentScript.dockModeLeft', {}, 'Attached left'),
            ct('contentScript.dockModeBottomRight', {}, 'Bottom right'),
            ct('contentScript.dockModeBottomLeft', {}, 'Bottom left')
        ];
        Array.from(dockModeField.options).forEach(function (option, index) {
            if (typeof dockLabels[index] !== 'undefined') {
                option.textContent = dockLabels[index];
            }
        });
    }

    const inlineContextLabel = panel.querySelector('.sgpt-inline-tools > span');
    if (inlineContextLabel) {
        inlineContextLabel.textContent = ct('contentScript.contextLabel', {}, 'Context');
    }

    const markButton = panel.querySelector('#sgpt-context-mark');
    if (markButton) {
        markButton.textContent = isClickMarkingActive
            ? ct('contentScript.stopMarking', {}, 'Stop marking')
            : ct('contentScript.markContext', {}, 'Mark context');
    }

    const importButton = panel.querySelector('#sgpt-context-import');
    if (importButton) {
        importButton.textContent = ct('contentScript.import', {}, 'Import');
    }

    const clearButton = panel.querySelector('#sgpt-context-clear');
    if (clearButton) {
        clearButton.textContent = ct('contentScript.clear', {}, 'Clear');
    }

    const contextField = panel.querySelector('#sgpt-context');
    if (contextField) {
        contextField.placeholder = ct('contentScript.contextPlaceholder', {}, 'Optional context: import visible page context or write your own notes here.');
    }

    const outputField = panel.querySelector('#sgpt-out');
    if (outputField) {
        setLabelText(outputField.parentElement, ct('contentScript.outputLabel', {}, 'Output'));
    }

    const sendButton = panel.querySelector('#sgpt-send');
    if (sendButton) {
        sendButton.textContent = ct('contentScript.generate', {}, 'Generate');
    }

    const refreshButton = panel.querySelector('#sgpt-mod');
    if (refreshButton) {
        refreshButton.textContent = ct('contentScript.refresh', {}, 'Refresh');
    }

    const verifyButton = panel.querySelector('#sgpt-verify');
    if (verifyButton) {
        verifyButton.textContent = ct('contentScript.verifyFact', {}, 'Verify fact');
    }

    const pasteButton = panel.querySelector('#sgpt-paste');
    if (pasteButton) {
        pasteButton.textContent = ct('contentScript.pasteIntoField', {}, 'Paste into field');
    }

    const loaderLabel = panel.querySelector('#sgpt-inline-loader-label');
    if (loaderLabel && (!loaderLabel.textContent || loaderLabel.textContent === 'Generating…' || loaderLabel.textContent === 'Genererar…')) {
        loaderLabel.textContent = ct('contentScript.generating', {}, 'Generating…');
    }

    updatePanelAnchorNote();
}

function refreshLocalizedExtensionUi() {
    if (composerActionButton) {
        composerActionButton.textContent = ct('contentScript.openToolbox', {}, 'Open Toolbox');
        composerActionButton.title = ct('contentScript.composerActionTitle', {}, 'Open Toolbox for the selected field. Drag to move it away. Double-click to reset its position.');
    }

    if (quickResponseActionButton) {
        quickResponseActionButton.textContent = ct('contentScript.quickResponse', {}, 'Quick response');
        quickResponseActionButton.title = ct('contentScript.quickResponseTitle', {}, 'Generate a quick reply using the preset saved in the extension popup.');
    }

    if (verifyActionButton) {
        verifyActionButton.textContent = ct('contentScript.verifyFact', {}, 'Verify fact');
        verifyActionButton.title = ct('contentScript.verifySelectionTitle', {}, 'Fact-check the selected text.');
    }

    if (selectionToolboxActionButton) {
        selectionToolboxActionButton.textContent = ct('contentScript.openToolbox', {}, 'Open Toolbox');
        selectionToolboxActionButton.title = ct('contentScript.openToolboxSelectionTitle', {}, 'Open Toolbox with the selected text imported as context.');
    }

    if (verifyHoverButton) {
        verifyHoverButton.textContent = ct('contentScript.verifyShort', {}, 'Verify');
        verifyHoverButton.title = ct('contentScript.verifyHoverTitle', {}, 'Verify the hovered image or link. Drag to move it away and double-click to reset.');
    }

    refreshLocalizedPanelUi();
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

function isFacebookParticipantRequestsPath(pathname) {
    const path = String(pathname || '').toLowerCase();
    return /^\/groups\/[^/]+\/participant_requests(?:\/|$)/.test(path);
}

function getFacebookGroupIdFromPathname(pathname) {
    const match = String(pathname || '').match(/^\/groups\/([^/?#]+)/i);
    return match && match[1] ? String(match[1]).trim() : '';
}

function getCurrentFacebookGroupId() {
    return getFacebookGroupIdFromPathname(location.pathname || '');
}

function normalizeParticipantGroupContextValue(value) {
    return String(value || '')
        .replace(/\r\n?/g, '\n')
        .trim()
        .slice(0, 4000);
}

function normalizeParticipantGroupContextMap(input) {
    const source = input && typeof input === 'object' && !Array.isArray(input) ? input : {};
    const normalized = {};

    Object.keys(source).forEach(function (key) {
        const groupId = String(key || '').trim();
        if (!groupId) {
            return;
        }

        const contextValue = normalizeParticipantGroupContextValue(source[key]);
        if (!contextValue) {
            return;
        }

        normalized[groupId] = contextValue;
    });

    return normalized;
}

function isStylableDomElement(node) {
    return !!(node && node.nodeType === Node.ELEMENT_NODE && node.style);
}

function resolveParticipantGroupContextForCurrentPage(settings) {
    const source = settings && typeof settings === 'object' ? settings : {};
    const groupId = getCurrentFacebookGroupId();
    const contextsByGroupId = normalizeParticipantGroupContextMap(source.facebookParticipantGroupContextsByGroupId);
    const groupSpecific = groupId && contextsByGroupId[groupId]
        ? normalizeParticipantGroupContextValue(contextsByGroupId[groupId])
        : '';
    const globalFallback = normalizeParticipantGroupContextValue(source.facebookParticipantGroupContext || '');

    if (groupId) {
        return {
            groupId: groupId,
            contextsByGroupId: contextsByGroupId,
            value: groupSpecific,
            source: groupSpecific ? 'group' : 'empty'
        };
    }

    return {
        groupId: groupId,
        contextsByGroupId: contextsByGroupId,
        value: groupSpecific || globalFallback,
        source: groupSpecific ? 'group' : (globalFallback ? 'global' : 'empty')
    };
}

function isSoundCloudPage() {
    return location.hostname.indexOf('soundcloud.com') !== -1;
}

function getSoundCloudPlatformDefinition() {
    const platform = getActivePlatformDefinition();
    return platform && platform.id === 'soundcloud' ? platform : null;
}

function isSupportedSoundCloudInsightsPage() {
    if (!SOUND_CLOUD_INSIGHTS_CAPTURE_ENABLED) {
        return false;
    }

    const platform = getSoundCloudPlatformDefinition();
    return !!(platform && typeof platform.isSupportedPage === 'function' && platform.isSupportedPage(location));
}

function getSoundCloudPageBridge() {
    if (!SOUND_CLOUD_INSIGHTS_CAPTURE_ENABLED) {
        return null;
    }

    if (!soundCloudPageBridge
        && window.TNNetworksSoundCloudPageBridge
        && typeof window.TNNetworksSoundCloudPageBridge.create === 'function') {
        soundCloudPageBridge = window.TNNetworksSoundCloudPageBridge.create({
            isSoundCloudPage: isSoundCloudPage,
            isSupportedInsightsPage: isSupportedSoundCloudInsightsPage,
            getLocationHref: function () {
                return location.href;
            },
            getDocumentTitle: function () {
                return document.title || '';
            },
            getNetworkMonitorInjected: function () {
                return !!((isSoundCloudPage() ? soundCloudDirectHookReady : isNetworkMonitorActive()) && isSupportedSoundCloudInsightsPage());
            },
            getHookReady: function () {
                return !!soundCloudDirectHookReady;
            },
            getLastHookMeta: function () {
                return soundCloudDirectHookMeta;
            },
            sendRuntimeMessage: safeSendRuntimeMessage,
            sendRuntimeMessageWithResponse: safeSendRuntimeMessageWithResponse,
        });
    }

    return soundCloudPageBridge;
}

function setSoundCloudStatusText(text) {
    const bridge = getSoundCloudPageBridge();
    if (!bridge) {
        return 'SoundCloud insights capture is unavailable.';
    }

    return bridge.setStatusText(text);
}

function buildSoundCloudPageStatusPayload() {
    const bridge = getSoundCloudPageBridge();
    const payload = bridge ? bridge.buildPageStatusPayload() : {
        ok: true,
        status: {
            pageUrl: location.href,
            title: document.title || '',
            isSoundCloudPage: isSoundCloudPage(),
            isRelevantInsightsPage: isSupportedSoundCloudInsightsPage(),
            networkMonitorInjected: !!((isSoundCloudPage() ? soundCloudDirectHookReady : isNetworkMonitorActive()) && isSupportedSoundCloudInsightsPage()),
            hookReady: !!soundCloudDirectHookReady,
            stateText: 'SoundCloud insights capture is unavailable.',
            captureCount: 0,
            lastCapture: null,
            pendingCaptureCount: soundCloudBackgroundPendingCaptureCount || 0,
            lastFlush: soundCloudBackgroundLastFlush || null,
            lastHookMeta: soundCloudDirectHookMeta,
        }
    };

    if (payload && payload.status) {
        payload.status.pendingCaptureCount = soundCloudBackgroundPendingCaptureCount || payload.status.pendingCaptureCount || 0;
        payload.status.duplicateCaptureCount = soundCloudBackgroundDuplicateCaptureCount || payload.status.duplicateCaptureCount || 0;
        payload.status.lastFlush = soundCloudBackgroundLastFlush || payload.status.lastFlush || null;
    }

    return payload;
}

function isNetworkMonitorActive() {
    if (networkMonitorInjected) {
        return true;
    }

    try {
        return !!(document.documentElement && document.documentElement.getAttribute(NETWORK_MONITOR_STATE_ATTRIBUTE) === '1');
    } catch (error) {
        return false;
    }
}

function syncSoundCloudDirectHookStateFromDom() {
    if (!isSoundCloudPage()) {
        return;
    }

    try {
        if (document.documentElement && document.documentElement.getAttribute(SOUND_CLOUD_DIRECT_HOOK_READY_ATTRIBUTE) === '1') {
            soundCloudDirectHookReady = true;
        }
    } catch (error) {
    }
}

function handleIncomingNetworkPayload(payload) {
    if (SOUND_CLOUD_INSIGHTS_CAPTURE_ENABLED && isSoundCloudPage() && payload.soundcloud_capture) {
        if (payload.soundcloud_capture.meta && typeof payload.soundcloud_capture.meta === 'object') {
            soundCloudDirectHookReady = true;
            soundCloudDirectHookMeta = payload.soundcloud_capture.meta;
        }
        const bridge = getSoundCloudPageBridge();
        if (bridge) {
            bridge.handleNetworkEventPayload(payload);
        }
    }

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

    if (isFacebookParticipantRequestsPage() && participantScannerFeatureEnabled) {
        rememberParticipantUserAnalysisNetworkEvent(payload);
    }

    if (!isFacebookAdminActivitiesPage()) {
        return;
    }

    if (!adminFeatureEnabled) {
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
}

function handleSoundCloudDirectCapture(detail) {
    if (!detail || typeof detail !== 'object' || !detail.opName) {
        return;
    }

    soundCloudDirectHookMeta = detail.meta && typeof detail.meta === 'object' ? detail.meta : null;
    handleIncomingNetworkPayload({
        soundcloud_capture: {
            opName: detail.opName,
            variables: detail.variables && typeof detail.variables === 'object' ? detail.variables : {},
            data: detail.data && typeof detail.data === 'object' ? detail.data : {},
            meta: detail.meta && typeof detail.meta === 'object' ? detail.meta : {},
        }
    });
}

function drainBufferedSoundCloudDirectCaptures() {
    if (!isSoundCloudPage()) {
        return;
    }

    const bufferNode = document.getElementById(SOUND_CLOUD_DIRECT_BUFFER_ELEMENT_ID);
    if (!bufferNode) {
        return;
    }

    let queuedCaptures = [];
    try {
        const parsed = JSON.parse(bufferNode.textContent || '[]');
        queuedCaptures = Array.isArray(parsed) ? parsed : [];
    } catch (error) {
        queuedCaptures = [];
    }

    bufferNode.textContent = '[]';

    queuedCaptures.forEach(function (detail) {
        handleSoundCloudDirectCapture(detail);
    });
}

function drainBufferedSoundCloudNetworkEvents() {
    if (!isSoundCloudPage()) {
        return;
    }

    const bufferNode = document.getElementById(SOUNDCLOUD_BUFFER_ELEMENT_ID);
    if (!bufferNode) {
        return;
    }

    let bufferedPayloads = [];
    try {
        const parsed = JSON.parse(bufferNode.textContent || '[]');
        bufferedPayloads = Array.isArray(parsed) ? parsed : [];
    } catch (error) {
        bufferedPayloads = [];
    }

    bufferNode.textContent = '[]';

    bufferedPayloads.forEach(function (payload) {
        if (payload && typeof payload === 'object') {
            handleIncomingNetworkPayload(payload);
        }
    });
}

function reportSoundCloudPageStatus() {
    const bridge = getSoundCloudPageBridge();
    if (bridge) {
        bridge.reportPageStatus();
    }

    updateSoundCloudInsightsControl();
}

function formatSoundCloudIngestResult(ingest) {
    if (!ingest) {
        return 'No ingest attempt recorded yet.';
    }
    if (typeof ingest.flushed_count === 'number') {
        return 'Buffered flush '
            + (ingest.ok ? 'OK' : 'partial')
            + ' · Flushed: ' + ingest.flushed_count
            + ' · Duplicates: ' + (ingest.duplicate_count || 0)
            + ' · Remaining: ' + (ingest.remaining_count || 0)
            + (ingest.failed_count ? ' · Failed: ' + ingest.failed_count : '');
    }
    if (ingest.attempted === false) {
        if (ingest.reason === 'empty_normalized_rows') {
            return 'Ingest not attempted: the captured SoundCloud dataset did not contain any normalized insight rows yet.';
        }
        if (ingest.reason === 'unsupported_operation') {
            return 'Ingest not attempted: this SoundCloud GraphQL operation is not one of the supported insights datasets yet.';
        }
        if (ingest.reason === 'already_buffered') {
            return 'Capture already buffered. Waiting for auto-ingest to flush it.';
        }
        if (ingest.reason === 'already_ingested') {
            return 'Duplicate capture ignored because this snapshot was already ingested.';
        }
        if (ingest.reason === 'auto_ingest_disabled') {
            return 'Ingest not attempted: auto-ingest starts disabled on each SoundCloud insights visit until you enable it manually.';
        }
        if (ingest.reason === 'missing_tools_token') {
            return 'Ingest not attempted: configure a Tools bearer token first.';
        }
        return 'Ingest not attempted: ' + (ingest.reason || 'unknown reason') + '.';
    }
    if (ingest.ok) {
        return 'Ingest OK' + (ingest.status ? ' · HTTP ' + ingest.status : '') + (ingest.event_id ? ' · event #' + ingest.event_id : '');
    }

    return 'Ingest failed' + (ingest.status ? ' · HTTP ' + ingest.status : '') + (ingest.message ? ' · ' + ingest.message : '');
}

function syncSoundCloudRuntimePreference() {
    safeStorageSyncGet(['toolsApiToken', 'soundcloudAutoIngestEnabled'], function (data) {
        soundCloudToolsTokenConfigured = !!(data && data.toolsApiToken && String(data.toolsApiToken).trim());
        soundCloudAutoIngestEnabled = !!(data && data.soundcloudAutoIngestEnabled === true && (!isSupportedSoundCloudInsightsPage() || soundCloudAutoIngestTouchedThisVisit));
        updateSoundCloudInsightsControl();
    });
}

function isSupportedSoundCloudInsightsUrl(value) {
    if (!value) {
        return false;
    }

    const platform = getSoundCloudPlatformDefinition();
    if (!platform || typeof platform.isSupportedPage !== 'function') {
        return false;
    }

    try {
        return !!platform.isSupportedPage(new URL(String(value), location.origin));
    } catch (error) {
        return false;
    }
}

function resetSoundCloudAutoIngestOnInsightsEntry(previousHref, reason) {
    if (!isSoundCloudPage() || !isSupportedSoundCloudInsightsPage()) {
        return;
    }

    const enteringSupportedInsights = reason === 'init' || !isSupportedSoundCloudInsightsUrl(previousHref);
    if (!enteringSupportedInsights) {
        return;
    }

    soundCloudAutoIngestTouchedThisVisit = false;
    soundCloudAutoIngestEnabled = false;
    safeStorageSyncGet(['soundcloudAutoIngestEnabled'], function (data) {
        if (data && data.soundcloudAutoIngestEnabled === true) {
            safeStorageSyncSet({soundcloudAutoIngestEnabled: false}, function () {
                updateSoundCloudInsightsControl();
                reportSoundCloudPageStatus();
            });
            return;
        }

        updateSoundCloudInsightsControl();
        reportSoundCloudPageStatus();
    });
}

function setSoundCloudAutoIngestEnabled(nextValue) {
    const enabled = !!nextValue;
    soundCloudAutoIngestTouchedThisVisit = true;
    soundCloudAutoIngestEnabled = enabled;
    safeStorageSyncSet({soundcloudAutoIngestEnabled: enabled}, function () {
        updateSoundCloudInsightsControl();
        reportSoundCloudPageStatus();
    });
}

function loadSoundCloudPanelPosition(control) {
    if (!control || typeof window.localStorage === 'undefined') {
        return;
    }

    try {
        const raw = window.localStorage.getItem(SOUND_CLOUD_PANEL_POSITION_STORAGE_KEY);
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

function saveSoundCloudPanelPosition(control) {
    if (!control || typeof window.localStorage === 'undefined') {
        return;
    }

    try {
        const rect = control.getBoundingClientRect();
        window.localStorage.setItem(SOUND_CLOUD_PANEL_POSITION_STORAGE_KEY, JSON.stringify({
            top: Math.max(8, Math.round(rect.top)),
            left: Math.max(8, Math.round(rect.left)),
        }));
    } catch (error) {
    }
}

function clampSoundCloudPanelPosition(control) {
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

function enableSoundCloudInsightsControlDragging(control) {
    if (!control || control.dataset.dragReady === 'true') {
        return;
    }

    const handle = control.querySelector('[data-role="drag-handle"]');
    if (!handle) {
        return;
    }

    control.dataset.dragReady = 'true';
    loadSoundCloudPanelPosition(control);
    clampSoundCloudPanelPosition(control);

    handle.addEventListener('mousedown', function (event) {
        if (event.button !== 0 || event.target.closest('button')) {
            return;
        }

        const rect = control.getBoundingClientRect();
        soundCloudInsightsControlDragState = {
            offsetX: event.clientX - rect.left,
            offsetY: event.clientY - rect.top,
        };

        event.preventDefault();
    });

    if (soundCloudInsightsDragListenersBound) {
        return;
    }

    soundCloudInsightsDragListenersBound = true;

    window.addEventListener('mousemove', function (event) {
        if (!soundCloudInsightsControlDragState || !soundCloudInsightsControl) {
            return;
        }

        soundCloudInsightsControl.style.left = Math.max(8, event.clientX - soundCloudInsightsControlDragState.offsetX) + 'px';
        soundCloudInsightsControl.style.top = Math.max(8, event.clientY - soundCloudInsightsControlDragState.offsetY) + 'px';
        soundCloudInsightsControl.style.right = 'auto';
        clampSoundCloudPanelPosition(soundCloudInsightsControl);
    });

    window.addEventListener('mouseup', function () {
        if (!soundCloudInsightsControlDragState || !soundCloudInsightsControl) {
            soundCloudInsightsControlDragState = null;
            return;
        }

        clampSoundCloudPanelPosition(soundCloudInsightsControl);
        saveSoundCloudPanelPosition(soundCloudInsightsControl);
        soundCloudInsightsControlDragState = null;
    });

    window.addEventListener('resize', function () {
        if (!soundCloudInsightsControl) {
            return;
        }

        clampSoundCloudPanelPosition(soundCloudInsightsControl);
        saveSoundCloudPanelPosition(soundCloudInsightsControl);
    });
}

function updateSoundCloudInsightsControl() {
    if (!SOUND_CLOUD_INSIGHTS_CAPTURE_ENABLED) {
        if (soundCloudInsightsControl) {
            soundCloudInsightsControl.remove();
            soundCloudInsightsControl = null;
        }
        return;
    }

    if (!soundCloudInsightsControl) {
        return;
    }

    const statusPayload = buildSoundCloudPageStatusPayload().status || {};
    const state = soundCloudInsightsControl.querySelector('[data-role="state"]');
    const counters = soundCloudInsightsControl.querySelector('[data-role="counters"]');
    const capture = soundCloudInsightsControl.querySelector('[data-role="capture"]');
    const ingest = soundCloudInsightsControl.querySelector('[data-role="ingest"]');
    const helper = soundCloudInsightsControl.querySelector('[data-role="helper"]');
    const debug = soundCloudInsightsControl.querySelector('[data-role="debug"]');
    const toggleButton = soundCloudInsightsControl.querySelector('[data-role="toggle-auto-ingest"]');
    const monitorActive = !!statusPayload.networkMonitorInjected;
    const lastCapture = statusPayload.lastCapture || null;
    const lastHookMeta = statusPayload.lastHookMeta || soundCloudDirectHookMeta || null;
    const latestSendState = statusPayload.lastFlush || statusPayload.lastIngest || null;

    if (state) {
        state.textContent = statusPayload.stateText || 'SoundCloud insights capture is idle.';
        state.style.color = monitorActive ? '#065f46' : '#92400e';
    }

    if (counters) {
        counters.textContent = 'Monitor: ' + (monitorActive ? 'injected' : 'waiting')
            + ' · Captures: ' + (statusPayload.captureCount || 0)
            + ' · Buffered: ' + (statusPayload.pendingCaptureCount || 0)
            + ' · Auto-ingest: ' + (soundCloudAutoIngestEnabled ? 'enabled' : 'disabled')
            + ' · Token: ' + (soundCloudToolsTokenConfigured ? 'configured' : 'missing');
    }

    if (capture) {
        capture.innerHTML = lastCapture
            ? ('<div style="font-weight:600; color:#0f172a;">'
                + escapeHtml((lastCapture.datasetKey || 'raw') + ' · ' + (lastCapture.opName || 'Unknown operation'))
                + '</div>'
                + '<div style="margin-top:4px; color:#475569;">Rows: ' + escapeHtml(String(lastCapture.rowCount || 0))
                + (lastCapture.totalMetric !== null && typeof lastCapture.totalMetric !== 'undefined' ? ' · Total metric: ' + escapeHtml(String(lastCapture.totalMetric)) : '')
                + '</div>'
                + '<div style="margin-top:4px; color:#64748b;">Captured: ' + escapeHtml(lastCapture.capturedAt || 'Unknown time') + '</div>')
            : '<div style="color:#64748b;">No supported SoundCloud captures detected yet. Open insights panels that trigger GraphQL requests.</div>';
    }

    if (ingest) {
        ingest.textContent = formatSoundCloudIngestResult(latestSendState);
        ingest.style.color = latestSendState && latestSendState.ok
            ? '#065f46'
            : (latestSendState && latestSendState.attempted ? '#b91c1c' : '#475569');
    }

    if (helper) {
        helper.textContent = soundCloudAutoIngestEnabled
            ? ((statusPayload.pendingCaptureCount || 0)
                ? 'Auto-ingest is on. Buffered captures will flush into Tools as soon as the extension can send them.'
                : 'New supported captures from this browser are pushed to Tools automatically.')
            : ((statusPayload.pendingCaptureCount || 0)
                ? 'Auto-ingest is off, but supported captures are being buffered here and can be flushed later without losing them.'
                : 'Auto-ingest is off. Turn it on here when you want supported captures from this browser sent to Tools.');
    }

    if (debug) {
        debug.innerHTML = '<div><strong>Hook:</strong> ' + escapeHtml(statusPayload.hookReady ? 'ready' : 'waiting') + '</div>'
            + '<div><strong>Page:</strong> ' + escapeHtml(isSupportedSoundCloudInsightsPage() ? 'supported' : 'unsupported') + '</div>'
            + '<div><strong>Buffered:</strong> ' + escapeHtml(String(statusPayload.pendingCaptureCount || 0)) + '</div>'
            + '<div><strong>Last op:</strong> ' + escapeHtml(lastCapture && lastCapture.opName ? lastCapture.opName : 'none yet') + '</div>'
            + '<div><strong>Via:</strong> ' + escapeHtml(lastHookMeta && lastHookMeta.via ? lastHookMeta.via : 'n/a') + '</div>'
            + '<div><strong>Host:</strong> ' + escapeHtml(lastHookMeta && lastHookMeta.host ? lastHookMeta.host : location.hostname) + '</div>'
            + '<div><strong>Request:</strong> ' + escapeHtml(lastHookMeta && lastHookMeta.request_url ? lastHookMeta.request_url : 'n/a') + '</div>';
    }

    if (toggleButton) {
        toggleButton.textContent = soundCloudAutoIngestEnabled ? 'Disable auto-ingest' : 'Enable auto-ingest';
        toggleButton.style.background = soundCloudAutoIngestEnabled ? '#b91c1c' : '#0f766e';
    }
}

function ensureSoundCloudInsightsControl() {
    if (!SOUND_CLOUD_INSIGHTS_CAPTURE_ENABLED) {
        if (soundCloudInsightsControl) {
            soundCloudInsightsControl.remove();
            soundCloudInsightsControl = null;
        }
        return null;
    }

    if (!isSupportedSoundCloudInsightsPage()) {
        if (soundCloudInsightsControl) {
            soundCloudInsightsControl.remove();
            soundCloudInsightsControl = null;
        }
        return null;
    }

    if (soundCloudInsightsControl) {
        updateSoundCloudInsightsControl();
        return soundCloudInsightsControl;
    }

    const control = document.createElement('div');
    control.id = 'sgpt-soundcloud-insights-control';
    control.style.position = 'fixed';
    control.style.top = '96px';
    control.style.right = '16px';
    control.style.zIndex = '2147483645';
    control.style.width = '340px';
    control.style.padding = '10px';
    control.style.borderRadius = '10px';
    control.style.border = '1px solid rgba(0,0,0,0.12)';
    control.style.background = 'rgba(255,255,255,0.96)';
    control.style.boxShadow = '0 6px 18px rgba(0,0,0,0.15)';
    control.style.fontFamily = 'system-ui,sans-serif';
    control.style.fontSize = '12px';
    control.style.color = '#0f172a';
    control.innerHTML = [
        '<div data-role="drag-handle" style="display:flex; justify-content:space-between; gap:8px; align-items:center; margin-bottom:6px; cursor:move; user-select:none;">',
        '<div style="font-weight:700;">SoundCloud insights capture</div>',
        '<div style="font-size:11px; color:#64748b;">drag</div>',
        '</div>',
        '<div data-role="state" style="margin-bottom:8px; color:#334155; font-weight:600;">Supported SoundCloud insights page detected. Waiting for GraphQL traffic...</div>',
        '<div data-role="counters" style="margin-bottom:8px; color:#475569;">Monitor: waiting · Captures: 0 · Auto-ingest: disabled · Token: missing</div>',
        '<div style="margin-bottom:8px;">',
        '<button type="button" data-role="toggle-auto-ingest" style="appearance:none; border:none; border-radius:999px; background:#0f766e; color:#fff; padding:7px 12px; font-size:11px; font-weight:700; cursor:pointer;">Enable auto-ingest</button>',
        '</div>',
        '<div style="margin-top:8px; font-weight:600; color:#334155;">Debug</div>',
        '<div data-role="debug" style="margin-top:4px; font-size:11px; line-height:1.35; color:#475569; max-height:110px; overflow:auto;">Hook: waiting</div>',
        '<div style="margin-top:10px; font-weight:600; color:#334155;">Latest capture</div>',
        '<div data-role="capture" style="margin-top:4px; font-size:11px; line-height:1.35; color:#475569; max-height:120px; overflow:auto;">No supported SoundCloud captures detected yet.</div>',
        '<div style="margin-top:10px; font-weight:600; color:#334155;">Latest ingest result</div>',
        '<div data-role="ingest" style="margin-top:4px; font-size:11px; line-height:1.35; color:#475569;">No ingest attempt recorded yet.</div>',
        '<div data-role="helper" style="margin-top:10px; font-size:11px; line-height:1.35; color:#64748b;">Auto-ingest is off. Turn it on here when you want supported captures from this browser sent to Tools.</div>'
    ].join('');

    if (!appendToDocumentBody(control)) {
        return null;
    }
    soundCloudInsightsControl = control;
    const toggleButton = control.querySelector('[data-role="toggle-auto-ingest"]');
    if (toggleButton) {
        toggleButton.addEventListener('click', function () {
            setSoundCloudAutoIngestEnabled(!soundCloudAutoIngestEnabled);
        });
    }
    enableSoundCloudInsightsControlDragging(control);
    updateSoundCloudInsightsControl();

    return control;
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

function loadParticipantScannerPanelPosition(control) {
    if (!control || typeof window.localStorage === 'undefined') {
        return;
    }

    try {
        const raw = window.localStorage.getItem(PARTICIPANT_SCANNER_PANEL_POSITION_STORAGE_KEY);
        if (!raw) {
            return;
        }

        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed.top === 'number' && typeof parsed.left === 'number') {
            control.style.top = parsed.top + 'px';
            control.style.left = parsed.left + 'px';
            control.style.right = 'auto';
            control.style.bottom = 'auto';
        }
    } catch (error) {
    }
}

function isParticipantScannerDocked() {
    if (typeof window.localStorage === 'undefined') {
        return true;
    }

    try {
        const raw = String(window.localStorage.getItem(PARTICIPANT_SCANNER_PANEL_DOCKED_STORAGE_KEY) || '').trim().toLowerCase();
        if (raw === '') {
            return true;
        }

        return raw !== 'false' && raw !== '0' && raw !== 'no';
    } catch (error) {
        return true;
    }
}

function saveParticipantScannerDockedState(isDocked) {
    if (typeof window.localStorage === 'undefined') {
        return;
    }

    try {
        window.localStorage.setItem(PARTICIPANT_SCANNER_PANEL_DOCKED_STORAGE_KEY, isDocked ? 'true' : 'false');
    } catch (error) {
    }
}

function applyParticipantScannerDockedPosition(control) {
    if (!control) {
        return;
    }

    control.style.top = '16px';
    control.style.right = '16px';
    control.style.left = 'auto';
    control.style.bottom = 'auto';
}

function updateParticipantScannerDockButton(control) {
    if (!control) {
        return;
    }

    const button = control.querySelector('[data-role="dock-toggle"]');
    if (!button) {
        return;
    }

    const docked = isParticipantScannerDocked();
    button.textContent = docked ? '↗' : '⤢';
    button.setAttribute('aria-pressed', docked ? 'true' : 'false');
    button.title = docked
        ? ct('contentScript.participantScannerUndock', {}, 'Undock participant helper so you can move it freely.')
        : ct('contentScript.participantScannerDock', {}, 'Dock participant helper back to the top-right corner.');
}

function saveParticipantScannerPanelPosition(control) {
    if (!control || typeof window.localStorage === 'undefined') {
        return;
    }

    if (isParticipantScannerDocked()) {
        return;
    }

    try {
        const rect = control.getBoundingClientRect();
        window.localStorage.setItem(PARTICIPANT_SCANNER_PANEL_POSITION_STORAGE_KEY, JSON.stringify({
            top: Math.max(8, Math.round(rect.top)),
            left: Math.max(8, Math.round(rect.left)),
        }));
    } catch (error) {
    }
}

function clampParticipantScannerPanelPosition(control) {
    if (!control) {
        return;
    }

    if (isParticipantScannerDocked()) {
        applyParticipantScannerDockedPosition(control);
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
    control.style.bottom = 'auto';
}

function enableParticipantScannerControlDragging(control) {
    if (!control || control.dataset.participantDragReady === 'true') {
        return;
    }

    const handle = control.querySelector('[data-role="drag-handle"]');
    if (!handle) {
        return;
    }

    control.dataset.participantDragReady = 'true';
    if (isParticipantScannerDocked()) {
        applyParticipantScannerDockedPosition(control);
    } else {
        loadParticipantScannerPanelPosition(control);
        clampParticipantScannerPanelPosition(control);
    }
    updateParticipantScannerDockButton(control);

    handle.addEventListener('mousedown', function (event) {
        if (event.button !== 0 || event.target.closest('button')) {
            return;
        }

        if (isParticipantScannerDocked()) {
            saveParticipantScannerDockedState(false);
            updateParticipantScannerDockButton(control);
        }

        const rect = control.getBoundingClientRect();
        participantRequestsControlDragState = {
            offsetX: event.clientX - rect.left,
            offsetY: event.clientY - rect.top,
        };

        event.preventDefault();
    });

    if (participantRequestsDragListenersBound) {
        return;
    }

    participantRequestsDragListenersBound = true;

    window.addEventListener('mousemove', function (event) {
        if (!participantRequestsControlDragState || !participantRequestsControl) {
            return;
        }

        participantRequestsControl.style.left = Math.max(8, event.clientX - participantRequestsControlDragState.offsetX) + 'px';
        participantRequestsControl.style.top = Math.max(8, event.clientY - participantRequestsControlDragState.offsetY) + 'px';
        participantRequestsControl.style.right = 'auto';
        participantRequestsControl.style.bottom = 'auto';
        clampParticipantScannerPanelPosition(participantRequestsControl);
    });

    window.addEventListener('mouseup', function () {
        if (!participantRequestsControlDragState || !participantRequestsControl) {
            participantRequestsControlDragState = null;
            return;
        }

        clampParticipantScannerPanelPosition(participantRequestsControl);
        saveParticipantScannerPanelPosition(participantRequestsControl);
        participantRequestsControlDragState = null;
    });

    window.addEventListener('resize', function () {
        if (!participantRequestsControl) {
            return;
        }

        if (isParticipantScannerDocked()) {
            applyParticipantScannerDockedPosition(participantRequestsControl);
            updateParticipantScannerDockButton(participantRequestsControl);
            return;
        }

        clampParticipantScannerPanelPosition(participantRequestsControl);
        saveParticipantScannerPanelPosition(participantRequestsControl);
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
        safeStorageSyncGet(['toolsApiToken', 'devMode', 'soundcloudAutoIngestEnabled', 'facebookAdminStatsEnabled', 'facebookParticipantScannerEnabled', 'facebookParticipantGroupContext', 'facebookParticipantGroupContextsByGroupId'], function (data) {
            const localSettings = Object.assign({}, data || {});
            const localResolvedContext = resolveParticipantGroupContextForCurrentPage(localSettings);
            localSettings.facebookParticipantGroupContextsByGroupId = localResolvedContext.contextsByGroupId;
            localSettings.facebookParticipantGroupContextDefault = normalizeParticipantGroupContextValue(localSettings.facebookParticipantGroupContext || '');
            localSettings.facebookParticipantActiveGroupId = localResolvedContext.groupId;
            localSettings.facebookParticipantGroupContextSource = localResolvedContext.source;
            localSettings.facebookParticipantGroupContext = localResolvedContext.value;
            const hasLocalToken = !!(localSettings && localSettings.toolsApiToken);
            const hasParticipantScannerFlag = Object.prototype.hasOwnProperty.call(localSettings, 'facebookParticipantScannerEnabled');
            const hasAdminStatsFlag = Object.prototype.hasOwnProperty.call(localSettings, 'facebookAdminStatsEnabled');

            if (!hasLocalToken) {
                resolve(localSettings);
                return;
            }

            safeSendRuntimeMessageWithResponse({
                type: 'GET_TOOLS_RUNTIME_SETTINGS',
                pageUrl: location.href,
                groupId: getCurrentFacebookGroupId(),
            }).then(function (response) {
                if (response && response.ok && response.settings) {
                    resolve(Object.assign({}, localSettings, response.settings || {}));
                    return;
                }

                if (hasParticipantScannerFlag || hasAdminStatsFlag) {
                    resolve(localSettings);
                    return;
                }

                resolve(localSettings);
            });
        });
    });
}

function saveParticipantGroupContext(value) {
    return safeSendRuntimeMessageWithResponse({
        type: 'SAVE_FACEBOOK_PARTICIPANT_GROUP_CONTEXT',
        value: String(value || ''),
        pageUrl: location.href,
        groupId: getCurrentFacebookGroupId(),
    });
}

function resetParticipantHistoryLookupState() {
    if (participantHistoryLookupTimerId) {
        window.clearTimeout(participantHistoryLookupTimerId);
        participantHistoryLookupTimerId = null;
    }

    participantHistoryLookupInFlight = false;
    participantHistoryLookupQueued = false;
    participantHistoryLookupLastSignature = '';
    participantHistoryLookupLastFetchedAt = 0;
    participantHistoryLookupError = '';
    participantHistoryLookupGroupReference = '';
    participantHistoryByCandidateKey = {};
}

function buildParticipantHistoryStableKey(seed) {
    const source = String(seed || '');
    if (!source) {
        return '';
    }

    function hashWithSalt(salt) {
        let hash = 2166136261;
        const input = salt + '|' + source;
        for (let index = 0; index < input.length; index += 1) {
            hash ^= input.charCodeAt(index);
            hash = Math.imul(hash, 16777619);
        }
        return (hash >>> 0).toString(16).padStart(8, '0');
    }

    return [
        hashWithSalt('a'),
        hashWithSalt('b'),
        hashWithSalt('c'),
        hashWithSalt('d'),
    ].join('');
}

function buildParticipantHistoryCandidate(summary) {
    const activeSummary = summary || null;
    const fallbackName = getParticipantSummaryLines(activeSummary).find(function (line) {
        return normalizeWhitespace(line).length >= 2;
    }) || '';
    const name = normalizeWhitespace(activeSummary && activeSummary.name ? activeSummary.name : fallbackName);
    const normalizedName = normalizeParticipantIdentityText(name);
    if (!normalizedName) {
        return null;
    }

    const facebookUserId = normalizeWhitespace(activeSummary && activeSummary.profileUserId ? activeSummary.profileUserId : '');
    const profileUrl = normalizeWhitespace(activeSummary && activeSummary.profileUrl ? activeSummary.profileUrl : '');
    const candidateKey = buildParticipantHistoryStableKey([
        normalizedName,
        facebookUserId,
        profileUrl,
    ].join('|'));

    if (!candidateKey) {
        return null;
    }

    return {
        candidate_key: candidateKey,
        name: name,
        profile_url: profileUrl,
        facebook_user_id: facebookUserId,
    };
}

function getParticipantHistoryForSummary(summary) {
    const candidate = buildParticipantHistoryCandidate(summary || null);
    if (!candidate || !candidate.candidate_key) {
        return null;
    }

    const historyMap = participantHistoryByCandidateKey && typeof participantHistoryByCandidateKey === 'object'
        ? participantHistoryByCandidateKey
        : {};

    return historyMap[candidate.candidate_key] || null;
}

function buildParticipantHistoryBadgeMarkup(entry) {
    if (participantHistoryLookupInFlight) {
        return '<span title="Looking up earlier moderation history from Tools." style="display:inline-flex; align-items:center; border-radius:999px; padding:4px 8px; background:#ede9fe; color:#6d28d9; font-weight:700;">History…</span>';
    }

    if (participantHistoryLookupError) {
        return '<span title="' + escapeHtml(participantHistoryLookupError) + '" style="display:inline-flex; align-items:center; border-radius:999px; padding:4px 8px; background:#fef2f2; color:#b91c1c; font-weight:700;">History unavailable</span>';
    }

    if (!entry || !entry.matched) {
        if (participantHistoryLookupLastFetchedAt > 0) {
            return '<span title="Tools found no earlier moderation decisions for this participant in the current linked group set." style="display:inline-flex; align-items:center; border-radius:999px; padding:4px 8px; background:#ecfdf5; color:#047857; font-weight:700;">No earlier history</span>';
        }
        return '';
    }

    const decisionCount = Number(entry.decision_count || 0);
    const approvedCount = Number(entry.approved_count || 0);
    const rejectedCount = Number(entry.rejected_count || 0);
    const label = decisionCount > 0
        ? 'History: ' + String(decisionCount)
        : 'Earlier moderation history';
    const parts = [];
    if (approvedCount > 0) {
        parts.push('approved: ' + String(approvedCount));
    }
    if (rejectedCount > 0) {
        parts.push('rejected: ' + String(rejectedCount));
    }
    const titleText = normalizeWhitespace(entry.summary_text || parts.join(' · ') || 'Earlier moderation history found in Tools.');

    return '<span title="' + escapeHtml(titleText) + '" style="display:inline-flex; align-items:center; border-radius:999px; padding:4px 8px; background:#fff7ed; color:#c2410c; font-weight:700;">' + escapeHtml(label + (parts.length ? ' (' + parts.join(' / ') + ')' : '')) + '</span>';
}

function buildParticipantHistoryLookupCandidates() {
    const cards = Array.isArray(participantRequestsVisibleCards) ? participantRequestsVisibleCards : [];
    const summaries = cards.map(function (card) {
        return buildParticipantRequestSummary(card);
    });

    if (participantRequestsLastSelectedSummary) {
        summaries.push(participantRequestsLastSelectedSummary);
    }
    if (activeParticipantUserAnalysis && activeParticipantUserAnalysis.summary) {
        summaries.push(activeParticipantUserAnalysis.summary);
    }

    const uniqueCandidates = {};
    summaries.forEach(function (summary) {
        const candidate = buildParticipantHistoryCandidate(summary);
        if (!candidate || !candidate.candidate_key || uniqueCandidates[candidate.candidate_key]) {
            return;
        }
        uniqueCandidates[candidate.candidate_key] = candidate;
    });

    return Object.keys(uniqueCandidates).map(function (key) {
        return uniqueCandidates[key];
    });
}

function buildParticipantHistoryLookupSignature(candidates) {
    const rows = Array.isArray(candidates) ? candidates : [];
    return [
        location.href,
        getCurrentFacebookGroupId(),
        rows.map(function (candidate) {
            return candidate && candidate.candidate_key ? candidate.candidate_key : '';
        }).filter(Boolean).sort().join('|'),
    ].join('||');
}

function rerenderParticipantHistoryTargets() {
    participantRequestsVisibleCards.forEach(function (card) {
        renderParticipantRequestHelper(card);
    });
    updateParticipantRequestsControl();
}

async function runParticipantHistoryLookup(reason) {
    if (!participantScannerFeatureEnabled || !isFacebookParticipantRequestsPage()) {
        resetParticipantHistoryLookupState();
        rerenderParticipantHistoryTargets();
        return;
    }

    if (participantHistoryLookupInFlight) {
        participantHistoryLookupQueued = true;
        return;
    }

    const candidates = buildParticipantHistoryLookupCandidates();
    if (!candidates.length) {
        participantHistoryLookupError = '';
        participantHistoryLookupGroupReference = '';
        participantHistoryByCandidateKey = {};
        participantHistoryLookupLastSignature = '';
        participantHistoryLookupLastFetchedAt = 0;
        rerenderParticipantHistoryTargets();
        return;
    }

    const signature = buildParticipantHistoryLookupSignature(candidates);
    if (signature && signature === participantHistoryLookupLastSignature && participantHistoryLookupLastFetchedAt > 0 && (Date.now() - participantHistoryLookupLastFetchedAt) < PARTICIPANT_HISTORY_LOOKUP_TTL_MS) {
        return;
    }

    participantHistoryLookupInFlight = true;
    participantHistoryLookupQueued = false;
    participantHistoryLookupError = '';
    rerenderParticipantHistoryTargets();

    const response = await safeSendRuntimeMessageWithResponse({
        type: 'GET_FACEBOOK_PARTICIPANT_HISTORY',
        pageUrl: location.href,
        groupId: getCurrentFacebookGroupId(),
        periodDays: 40,
        candidates: candidates,
        reason: reason || 'scheduled',
    });

    if (response && response.ok) {
        const nextMap = {};
        (Array.isArray(response.participants) ? response.participants : []).forEach(function (participant) {
            const candidateKey = normalizeWhitespace(participant && participant.candidate_key ? participant.candidate_key : '');
            if (!candidateKey) {
                return;
            }
            nextMap[candidateKey] = participant;
        });
        participantHistoryByCandidateKey = nextMap;
        participantHistoryLookupGroupReference = normalizeWhitespace(response.groupReference || '');
        participantHistoryLookupLastSignature = signature;
        participantHistoryLookupLastFetchedAt = Date.now();
        participantHistoryLookupError = '';
    } else {
        participantHistoryLookupError = normalizeWhitespace(response && response.error ? response.error : 'Could not load participant moderation history from Tools.');
        participantHistoryLookupGroupReference = '';
        participantHistoryLookupLastSignature = signature;
        participantHistoryLookupLastFetchedAt = 0;
        participantHistoryByCandidateKey = {};
    }

    participantHistoryLookupInFlight = false;
    rerenderParticipantHistoryTargets();

    if (participantHistoryLookupQueued) {
        participantHistoryLookupQueued = false;
        scheduleParticipantHistoryLookup((reason || 'scheduled') + '-queued');
    }
}

function scheduleParticipantHistoryLookup(reason) {
    if (!participantScannerFeatureEnabled || !isFacebookParticipantRequestsPage()) {
        return;
    }

    if (participantHistoryLookupTimerId) {
        window.clearTimeout(participantHistoryLookupTimerId);
    }

    participantHistoryLookupTimerId = window.setTimeout(function () {
        participantHistoryLookupTimerId = null;
        runParticipantHistoryLookup(reason || 'scheduled');
    }, PARTICIPANT_HISTORY_LOOKUP_DEBOUNCE_MS);
}

function closeParticipantScannerConfigBox() {
    if (participantScannerConfigBox && document.contains(participantScannerConfigBox)) {
        participantScannerConfigBox.remove();
    }
    participantScannerConfigBox = null;
}

function openParticipantScannerConfigBox() {
    if (participantScannerConfigBox && document.contains(participantScannerConfigBox)) {
        participantScannerConfigBox.remove();
        participantScannerConfigBox = null;
    }

    const box = document.createElement('div');
    if (!isStylableDomElement(box)) {
        return;
    }
    box.id = 'sgpt-participant-config-box';
    box.style.position = 'fixed';
    box.style.top = '28px';
    box.style.right = '28px';
    box.style.width = 'min(460px, calc(100vw - 32px))';
    box.style.maxHeight = 'min(76vh, calc(100vh - 40px))';
    box.style.display = 'flex';
    box.style.flexDirection = 'column';
    box.style.padding = '14px';
    box.style.borderRadius = '14px';
    box.style.border = '1px solid rgba(124,58,237,0.24)';
    box.style.background = 'rgba(255,255,255,0.98)';
    box.style.boxShadow = '0 18px 48px rgba(15,23,42,0.22)';
    box.style.zIndex = '2147483646';
    box.style.fontFamily = 'system-ui,sans-serif';
    box.style.color = '#0f172a';

    const closeButton = document.createElement('button');
    if (!isStylableDomElement(closeButton)) {
        return;
    }
    closeButton.type = 'button';
    closeButton.textContent = '×';
    closeButton.style.position = 'absolute';
    closeButton.style.top = '8px';
    closeButton.style.right = '10px';
    closeButton.style.border = 'none';
    closeButton.style.background = 'transparent';
    closeButton.style.fontSize = '18px';
    closeButton.style.cursor = 'pointer';
    closeButton.addEventListener('click', function () {
        closeParticipantScannerConfigBox();
    });

    const title = document.createElement('div');
    if (!isStylableDomElement(title)) {
        return;
    }
    title.textContent = ct('contentScript.participantScannerConfigTitle', {}, 'Participant user-verifier rules');
    title.style.fontSize = '16px';
    title.style.fontWeight = '800';
    title.style.color = '#5b21b6';
    title.style.paddingRight = '24px';

    const subtitle = document.createElement('div');
    if (!isStylableDomElement(subtitle)) {
        return;
    }
    subtitle.textContent = ct('contentScript.participantScannerConfigSubtitle', {}, 'Add group-specific background, approval rules, and risk signals that should be included whenever Analyze user runs on a Facebook participant request.');
    subtitle.style.marginTop = '6px';
    subtitle.style.fontSize = '12px';
    subtitle.style.lineHeight = '1.5';
    subtitle.style.color = '#475569';

    const groupId = getCurrentFacebookGroupId();
    const scopeNote = document.createElement('div');
    if (!isStylableDomElement(scopeNote)) {
        return;
    }
    scopeNote.textContent = groupId
        ? ('Scope: this Facebook group (/groups/' + groupId + ') · only exact rules saved for this group are shown here')
        : 'Scope: current participant-request page';
    scopeNote.style.marginTop = '8px';
    scopeNote.style.fontSize = '12px';
    scopeNote.style.lineHeight = '1.45';
    scopeNote.style.fontWeight = '700';
    scopeNote.style.color = '#7c3aed';

    const textarea = document.createElement('textarea');
    if (!isStylableDomElement(textarea)) {
        return;
    }
    textarea.value = participantScannerGroupContext || '';
    textarea.rows = 8;
    textarea.maxLength = 4000;
    textarea.placeholder = ct('contentScript.participantScannerConfigPlaceholder', {}, 'Example: This group is for local members only. Treat unanswered membership questions, missing local connection, obvious spam patterns, and brand-new profiles as risk signals. Positive signs include established profile history, relevant answers, and a clear relation to the group topic.');
    textarea.style.width = '100%';
    textarea.style.marginTop = '12px';
    textarea.style.padding = '10px 12px';
    textarea.style.borderRadius = '12px';
    textarea.style.border = '1px solid rgba(148,163,184,0.55)';
    textarea.style.background = '#f8fafc';
    textarea.style.color = '#0f172a';
    textarea.style.fontSize = '13px';
    textarea.style.lineHeight = '1.55';
    textarea.style.resize = 'vertical';
    textarea.style.minHeight = '160px';
    textarea.style.boxSizing = 'border-box';

    const note = document.createElement('div');
    if (!isStylableDomElement(note)) {
        return;
    }
    note.textContent = groupId
        ? ct('contentScript.participantScannerConfigNoteScoped', {}, 'Do not put secrets here. This text is sent as operator-supplied verification context when Analyze user runs on this Facebook group. Other groups keep their own separate rules.')
        : ct('contentScript.participantScannerConfigNote', {}, 'Do not put secrets here. This text is sent as operator-supplied verification context when Analyze user runs.');
    note.style.marginTop = '8px';
    note.style.fontSize = '12px';
    note.style.lineHeight = '1.45';
    note.style.color = '#64748b';

    const status = document.createElement('div');
    if (!isStylableDomElement(status)) {
        return;
    }
    status.style.display = 'none';
    status.style.marginTop = '10px';
    status.style.padding = '9px 10px';
    status.style.borderRadius = '10px';
    status.style.fontSize = '12px';
    status.style.lineHeight = '1.45';

    const actions = document.createElement('div');
    if (!isStylableDomElement(actions)) {
        return;
    }
    actions.style.display = 'flex';
    actions.style.flexWrap = 'wrap';
    actions.style.gap = '8px';
    actions.style.marginTop = '12px';

    const saveButton = document.createElement('button');
    if (!isStylableDomElement(saveButton)) {
        return;
    }
    saveButton.type = 'button';
    saveButton.textContent = ct('contentScript.participantScannerConfigSave', {}, 'Save rules');
    saveButton.style.border = 'none';
    saveButton.style.borderRadius = '999px';
    saveButton.style.padding = '8px 12px';
    saveButton.style.cursor = 'pointer';
    saveButton.style.background = '#7c3aed';
    saveButton.style.color = '#ffffff';
    saveButton.style.fontWeight = '700';

    const toolsButton = document.createElement('button');
    if (!isStylableDomElement(toolsButton)) {
        return;
    }
    toolsButton.type = 'button';
    toolsButton.textContent = ct('contentScript.participantScannerConfigOpenTools', {}, 'Open Tools page');
    toolsButton.style.border = 'none';
    toolsButton.style.borderRadius = '999px';
    toolsButton.style.padding = '8px 12px';
    toolsButton.style.cursor = 'pointer';
    toolsButton.style.background = '#e2e8f0';
    toolsButton.style.color = '#0f172a';
    toolsButton.addEventListener('click', function () {
        getToolsRuntimeSettings().then(function (settings) {
            const targetUrl = getToolsBaseUrl(!!(settings && settings.devMode)) + '/admin/social-media-tools/facebook';
            window.open(targetUrl, '_blank', 'noopener');
        });
    });

    const closeFooterButton = document.createElement('button');
    if (!isStylableDomElement(closeFooterButton)) {
        return;
    }
    closeFooterButton.type = 'button';
    closeFooterButton.textContent = ct('contentScript.participantScannerConfigClose', {}, 'Close');
    closeFooterButton.style.border = 'none';
    closeFooterButton.style.borderRadius = '999px';
    closeFooterButton.style.padding = '8px 12px';
    closeFooterButton.style.cursor = 'pointer';
    closeFooterButton.style.background = '#f1f5f9';
    closeFooterButton.style.color = '#334155';
    closeFooterButton.addEventListener('click', function () {
        closeParticipantScannerConfigBox();
    });

    saveButton.addEventListener('click', function () {
        const nextValue = normalizeParticipantGroupContextValue(textarea.value || '');
        saveButton.disabled = true;
        saveButton.textContent = ct('contentScript.participantScannerConfigSaving', {}, 'Saving…');
        status.style.display = 'block';
        status.style.background = 'rgba(224,231,255,0.7)';
        status.style.border = '1px solid rgba(129,140,248,0.45)';
        status.style.color = '#4338ca';
        status.textContent = ct('contentScript.participantScannerConfigSavingStatus', {}, 'Saving participant user-verifier rules…');

        saveParticipantGroupContext(nextValue).then(function (response) {
            participantScannerGroupContext = nextValue;
            if (lastVerificationRequest && lastVerificationRequest.extraData && typeof lastVerificationRequest.extraData === 'object') {
                lastVerificationRequest.extraData.facebook_group_context = nextValue;
            }
            if (activeParticipantUserAnalysis) {
                markParticipantUserAnalysisContextChanged('group-context');
            }
            updateParticipantRequestsControl();

            const localOnly = !!(response && response.localOnly);
            const scoped = !!(response && response.scoped);
            status.style.background = localOnly ? 'rgba(255,247,237,0.88)' : 'rgba(236,253,245,0.92)';
            status.style.border = localOnly ? '1px solid rgba(251,146,60,0.45)' : '1px solid rgba(74,222,128,0.5)';
            status.style.color = localOnly ? '#9a3412' : '#166534';
            status.textContent = response && response.message
                ? String(response.message)
                : (localOnly
                    ? (scoped
                        ? ct('contentScript.participantScannerConfigSavedScopedLocal', {}, 'Saved for this Facebook group in the extension/profile. This group-specific rule is not synced to the global Tools setting.')
                        : ct('contentScript.participantScannerConfigSavedLocal', {}, 'Saved locally in the extension. Add your Tools bearer token if you also want to sync it to Tools.'))
                    : ct('contentScript.participantScannerConfigSaved', {}, 'Participant user-verifier rules saved. Future analyses will include the updated group context.'));
        }).catch(function (error) {
            status.style.background = 'rgba(254,242,242,0.96)';
            status.style.border = '1px solid rgba(248,113,113,0.42)';
            status.style.color = '#b91c1c';
            status.textContent = error && error.message
                ? error.message
                : ct('contentScript.participantScannerConfigSaveFailed', {}, 'Could not save participant user-verifier rules right now.');
        }).finally(function () {
            saveButton.disabled = false;
            saveButton.textContent = ct('contentScript.participantScannerConfigSave', {}, 'Save rules');
        });
    });

    actions.appendChild(saveButton);
    actions.appendChild(toolsButton);
    actions.appendChild(closeFooterButton);

    box.appendChild(closeButton);
    box.appendChild(title);
    box.appendChild(subtitle);
    box.appendChild(scopeNote);
    box.appendChild(textarea);
    box.appendChild(note);
    box.appendChild(status);
    box.appendChild(actions);

    if (!appendToDocumentBody(box)) {
        return;
    }
    participantScannerConfigBox = box;
    textarea.focus();
    textarea.selectionStart = textarea.value.length;
    textarea.selectionEnd = textarea.value.length;
}

function isFacebookAdminActivitiesPage() {
    return location.hostname.indexOf('facebook.com') !== -1
        && /\/groups\/[^/]+\/admin_activities/.test(location.pathname || '');
}

function isFacebookParticipantRequestsPage() {
    return window.top === window
        && location.hostname.indexOf('facebook.com') !== -1
        && isFacebookParticipantRequestsPath(location.pathname || '');
}

function countParticipantActionMatches(container, regex) {
    if (!container || !regex) {
        return 0;
    }

    let count = 0;
    const actions = container.querySelectorAll('button, [role="button"]');
    for (let index = 0; index < actions.length; index += 1) {
        const text = normalizeWhitespace(
            actions[index].textContent
            || actions[index].innerText
            || (actions[index].getAttribute ? (actions[index].getAttribute('aria-label') || actions[index].getAttribute('title') || '') : '')
        );
        if (!text || text.length > 80) {
            continue;
        }
        if (regex.test(text)) {
            count += 1;
        }
    }

    return count;
}

function extractDistinctParticipantRequestAnchorUrls(container, pattern) {
    if (!container || !container.querySelectorAll) {
        return [];
    }

    const matcher = pattern instanceof RegExp ? pattern : null;
    const seen = new Set();
    const urls = [];
    const anchors = container.querySelectorAll('a[href]');

    for (let index = 0; index < anchors.length; index += 1) {
        const rawHref = String(anchors[index].href || (anchors[index].getAttribute ? anchors[index].getAttribute('href') || '' : '') || '').trim();
        if (!rawHref) {
            continue;
        }

        const normalizedHref = normalizeFacebookUrlForPrompt(rawHref);
        if (!normalizedHref || (matcher && !matcher.test(normalizedHref))) {
            continue;
        }

        if (seen.has(normalizedHref)) {
            continue;
        }
        seen.add(normalizedHref);
        urls.push(normalizedHref);
    }

    return urls;
}

function isParticipantBulkActionLabel(label) {
    const normalized = normalizeWhitespace(label || '').toLowerCase();
    if (!normalized) {
        return false;
    }

    return normalized === 'godkänn alla'
        || normalized === 'approve all'
        || normalized === 'avvisa alla'
        || normalized === 'reject all'
        || normalized === 'decline all';
}

function countParticipantRequestSignals(text) {
    const normalized = normalizeWhitespace(text || '');
    if (!normalized) {
        return 0;
    }

    const signals = [
        /(besökare|visitor|förfrågan inkom|request came in)/i,
        /(\d+\s+vänner|\d+\s+friends?)/i,
        /(gemensam grupp|common group|andra grupper|other groups)/i,
        /(gick med i facebook|joined facebook)/i,
        /(bor i|lives in)/i,
        /(har studerat|studied at|jobbar på|works at)/i,
        /(har skickat en kommentar|sent a comment|förhandsgranska|preview)/i,
        /(har inte besvarat frågorna ännu|has not answered|hasn't answered|väntar på svar|waiting for answer)/i,
        /(godkänner du gruppreglerna|group rules|registration date on facebook|registreringsdatum på facebook)/i,
    ];

    let count = 0;
    for (let index = 0; index < signals.length; index += 1) {
        if (signals[index].test(normalized)) {
            count += 1;
        }
    }

    return count;
}

function scoreParticipantRequestCardCandidate(container) {
    if (!container || !container.querySelectorAll || !container.getBoundingClientRect) {
        return -1;
    }

    if (!container.offsetParent || container.closest('[aria-hidden="true"]')) {
        return -1;
    }

    const text = normalizeWhitespace(container.innerText || container.textContent || '');
    if (!text || text.length < 80 || text.length > 5000) {
        return -1;
    }

    const approveRegex = /(godkänn|approve)/i;
    const rejectRegex = /(avvisa|reject|decline)/i;
    const approveCount = countParticipantActionMatches(container, approveRegex);
    const rejectCount = countParticipantActionMatches(container, rejectRegex);
    if (approveCount < 1 || rejectCount < 1 || approveCount > 4 || rejectCount > 4) {
        return -1;
    }

    const signalCount = countParticipantRequestSignals(text);
    const distinctProfileUrls = extractDistinctParticipantRequestAnchorUrls(container, /\/groups\/[^/]+\/user\/(?:\d+|[^/?#]+)/i);
    const distinctProfileUrlCount = distinctProfileUrls.length;
    if (signalCount < 2) {
        return -1;
    }

    const rect = container.getBoundingClientRect();
    if (rect.width < 220 || rect.height < 140) {
        return -1;
    }

    let score = signalCount * 120;
    if (distinctProfileUrlCount === 1) {
        score += 180;
    } else if (distinctProfileUrlCount > 1) {
        score -= 220 * (distinctProfileUrlCount - 1);
    } else {
        score -= 140;
    }
    score -= Math.abs(approveCount - 1) * 35;
    score -= Math.abs(rejectCount - 1) * 35;
    score -= Math.round(text.length / 35);
    score -= Math.round(rect.height / 18);
    score -= Math.round(rect.width / 45);

    if (/(godkänn alla|approve all|avvisa alla|reject all|senaste först|newest first|återställ filter|reset filters|fler filter|more filters)/i.test(text)) {
        score -= 320;
    }

    if (extractParticipantRequestName(container)) {
        score += 45;
    }

    if (/(förhandsgranska|preview)/i.test(text)) {
        score += 20;
    }

    if (extractParticipantRequestOverflowButton(container)) {
        score += 26;
    }

    return score;
}

function getParticipantRequestCardCandidateScore(node, cache) {
    if (!node) {
        return -1;
    }

    if (cache && cache.has(node)) {
        return cache.get(node);
    }

    const score = scoreParticipantRequestCardCandidate(node);
    if (cache) {
        cache.set(node, score);
    }

    return score;
}

function isElementNearViewport(element, margin) {
    if (!element || !element.getBoundingClientRect) {
        return false;
    }

    const rect = element.getBoundingClientRect();
    const viewportWidth = window.innerWidth || document.documentElement.clientWidth || 0;
    const viewportHeight = window.innerHeight || document.documentElement.clientHeight || 0;
    const safeMargin = typeof margin === 'number' ? margin : 0;

    return rect.width > 0
        && rect.height > 0
        && rect.bottom >= -safeMargin
        && rect.right >= -safeMargin
        && rect.top <= viewportHeight + safeMargin
        && rect.left <= viewportWidth + safeMargin;
}

function isInsideParticipantPreviewDialogSurface(element) {
    if (!element || !element.closest) {
        return false;
    }

    const dialog = element.closest('[role="dialog"], [aria-modal="true"]');
    if (!dialog) {
        return false;
    }

    const text = normalizeWhitespace(dialog.innerText || dialog.textContent || '');
    return !text
        || isParticipantPreviewDialogText(text)
        || /(förhandsgranska|preview|kommentar|comment|original post|ursprungligt inlägg)/i.test(text);
}

function resolveParticipantRequestSearchRoots() {
    const roots = [];
    const seen = new Set();
    const candidates = document.querySelectorAll('[role="main"], [data-pagelet="root"], [data-pagelet="GroupsCometFeedRoot"], [aria-label*="Deltagar"], [aria-label*="Participant"]');

    candidates.forEach(function (node) {
        if (!node || seen.has(node) || !node.querySelectorAll) {
            return;
        }
        seen.add(node);
        roots.push(node);
    });

    if (!roots.length && document.body) {
        roots.push(document.body);
    }

    return roots;
}

function findBestParticipantRequestCardForAction(action, cache, options) {
    if (!action) {
        return null;
    }

    const settings = options || {};
    const maxDepth = Number.isFinite(settings.maxDepth) && settings.maxDepth > 0
        ? settings.maxDepth
        : PARTICIPANT_REQUEST_CARD_PARENT_DEPTH;
    let current = action;
    let bestNode = null;
    let bestScore = -1;

    for (let depth = 0; depth < maxDepth && current; depth += 1) {
        current = current.parentElement;
        if (!current) {
            continue;
        }

        if (isInsideParticipantPreviewDialogSurface(current)) {
            continue;
        }

        const candidateScore = getParticipantRequestCardCandidateScore(current, cache);
        if (candidateScore > bestScore) {
            bestNode = current;
            bestScore = candidateScore;
        }
    }

    return bestScore >= PARTICIPANT_REQUEST_MIN_CARD_SCORE ? bestNode : null;
}

function collectParticipantRequestCardsFromProfileAnchors(anchors, options) {
    const settings = options || {};
    const seen = settings.seen || new Set();
    const roots = settings.roots || [];
    const scoreCache = settings.scoreCache || new WeakMap();
    const requireViewport = settings.requireViewport !== false;
    const maxDepth = Number.isFinite(settings.maxDepth) && settings.maxDepth > 0
        ? settings.maxDepth
        : PARTICIPANT_REQUEST_CARD_PARENT_DEPTH;

    for (let index = 0; index < anchors.length; index += 1) {
        const anchor = anchors[index];
        if (!anchor || !anchor.isConnected || isInsideParticipantPreviewDialogSurface(anchor)) {
            continue;
        }

        if (requireViewport && !isElementNearViewport(anchor, PARTICIPANT_REQUEST_ACTION_VIEWPORT_MARGIN)) {
            continue;
        }

        const href = String(anchor.href || (anchor.getAttribute ? anchor.getAttribute('href') || '' : '') || '').trim();
        if (!href || !/\/groups\/[^/]+\/user\/(?:\d+|[^/?#]+)/i.test(href)) {
            continue;
        }

        const candidate = findBestParticipantRequestCardForAction(anchor, scoreCache, {maxDepth: maxDepth});
        if (!candidate || seen.has(candidate) || isInsideParticipantPreviewDialogSurface(candidate)) {
            continue;
        }

        const distinctProfileUrls = extractDistinctParticipantRequestAnchorUrls(candidate, /\/groups\/[^/]+\/user\/(?:\d+|[^/?#]+)/i);
        if (!distinctProfileUrls.length) {
            continue;
        }

        seen.add(candidate);
        roots.push(candidate);
        if (roots.length >= PARTICIPANT_REQUEST_MAX_ACTION_CANDIDATES) {
            break;
        }
    }

    return roots;
}

function collectParticipantRequestCardsFromActions(actions, options) {
    const settings = options || {};
    const seen = settings.seen || new Set();
    const roots = settings.roots || [];
    const scoreCache = settings.scoreCache || new WeakMap();
    const approveRegex = /(godkänn|approve)/i;
    const requireViewport = settings.requireViewport !== false;
    const maxDepth = Number.isFinite(settings.maxDepth) && settings.maxDepth > 0
        ? settings.maxDepth
        : PARTICIPANT_REQUEST_CARD_PARENT_DEPTH;

    for (let index = 0; index < actions.length; index += 1) {
        const action = actions[index];
        if (!action || !action.isConnected || isInsideParticipantPreviewDialogSurface(action)) {
            continue;
        }

        if (requireViewport && !isElementNearViewport(action, PARTICIPANT_REQUEST_ACTION_VIEWPORT_MARGIN)) {
            continue;
        }

        const label = normalizeWhitespace(
            action.textContent
            || action.innerText
            || (action.getAttribute ? (action.getAttribute('aria-label') || action.getAttribute('title') || '') : '')
        );
        if (!label || !approveRegex.test(label) || isParticipantBulkActionLabel(label)) {
            continue;
        }

        const candidate = findBestParticipantRequestCardForAction(action, scoreCache, {maxDepth: maxDepth});
        if (!candidate || seen.has(candidate) || isInsideParticipantPreviewDialogSurface(candidate)) {
            continue;
        }

        seen.add(candidate);
        roots.push(candidate);
        if (roots.length >= PARTICIPANT_REQUEST_MAX_ACTION_CANDIDATES) {
            break;
        }
    }

    return roots;
}

function findParticipantRequestCards() {
    const roots = [];
    const seen = new Set();
    const scoreCache = new WeakMap();
    const searchRoots = resolveParticipantRequestSearchRoots();
    const actionSelector = 'button, [role="button"], a';

    for (let rootIndex = 0; rootIndex < searchRoots.length; rootIndex += 1) {
        const root = searchRoots[rootIndex];
        if (!root || !root.querySelectorAll || isInsideParticipantPreviewDialogSurface(root)) {
            continue;
        }

        collectParticipantRequestCardsFromActions(root.querySelectorAll(actionSelector), {
            roots: roots,
            seen: seen,
            scoreCache: scoreCache,
            requireViewport: true,
            maxDepth: PARTICIPANT_REQUEST_CARD_PARENT_DEPTH,
        });
        if (roots.length >= PARTICIPANT_REQUEST_MAX_ACTION_CANDIDATES) {
            return roots;
        }
    }

    if (roots.length < 2) {
        collectParticipantRequestCardsFromActions(document.querySelectorAll(actionSelector), {
            roots: roots,
            seen: seen,
            scoreCache: scoreCache,
            requireViewport: false,
            maxDepth: PARTICIPANT_REQUEST_CARD_PARENT_DEPTH,
        });
    }

    if (roots.length < 2) {
        collectParticipantRequestCardsFromProfileAnchors(document.querySelectorAll('a[href*="/groups/"][href*="/user/"]'), {
            roots: roots,
            seen: seen,
            scoreCache: scoreCache,
            requireViewport: false,
            maxDepth: PARTICIPANT_REQUEST_CARD_PARENT_DEPTH,
        });
    }

    return roots;
}

function isParticipantOverflowActionLabel(label) {
    const normalized = normalizeWhitespace(label || '').toLowerCase();
    if (!normalized) {
        return false;
    }

    return normalized === '...'
        || normalized === '…'
        || normalized === 'more'
        || normalized === 'mer'
        || normalized === 'see options'
        || normalized === 'visa alternativ'
        || normalized === 'alternativ'
        || normalized === 'fler alternativ'
        || normalized === 'more options';
}

function extractParticipantRequestOverflowButton(card) {
    if (!card || !card.querySelectorAll || !card.getBoundingClientRect) {
        return null;
    }

    const cardRect = card.getBoundingClientRect();
    const actions = card.querySelectorAll('button, [role="button"], a');
    let fallback = null;

    for (let index = 0; index < actions.length; index += 1) {
        const action = actions[index];
        const label = normalizeWhitespace(
            action.textContent
            || action.innerText
            || (action.getAttribute ? (action.getAttribute('aria-label') || action.getAttribute('title') || '') : '')
        );

        if (isParticipantOverflowActionLabel(label)) {
            return action;
        }

        if (label) {
            continue;
        }

        if (!action.getBoundingClientRect) {
            continue;
        }

        const rect = action.getBoundingClientRect();
        const nearTopRight = rect.width > 0
            && rect.height > 0
            && rect.top <= cardRect.top + Math.max(76, cardRect.height * 0.32)
            && rect.left >= cardRect.left + Math.max(120, cardRect.width * 0.58);

        if (nearTopRight) {
            fallback = action;
        }
    }

    return fallback;
}

function isParticipantRequestAttachmentLabel(text) {
    const normalized = normalizeWhitespace(text || '');
    if (!normalized) {
        return false;
    }

    return /(har skickat en kommentar|sent a comment|förhandsgranska|preview|har inte besvarat frågorna ännu|has not answered|hasn't answered|väntar på svar|waiting for answer|godkänner du gruppreglerna|group rules|inget svar|no answer|bor i|lives in|har gått på|studied at|har jobbat på|jobbar på|works at|gick med i facebook|joined facebook|\d+\s+grupper|\d+\s+groups|\d+\s+vänner|\d+\s+friends)/i.test(normalized);
}

function scoreParticipantRequestAttachmentAnchor(node, card, summary) {
    if (!node || !card || !node.getBoundingClientRect) {
        return -1;
    }

    if (node.closest && node.closest('[data-sgpt-participant-badge="true"]')) {
        return -1;
    }

    const text = normalizeWhitespace(node.textContent || node.innerText || '');
    if (!text || text.length < 3 || text.length > 220 || !isParticipantRequestAttachmentLabel(text)) {
        return -1;
    }

    if (/(godkänn|approve|avvisa|reject|decline|analyze in toolbox|verify facts|open toolbox|scan visible cards now|show card)/i.test(text)) {
        return -1;
    }

    const rect = node.getBoundingClientRect();
    const cardRect = card.getBoundingClientRect();
    if (rect.width < 32 || rect.height < 12) {
        return -1;
    }

    let score = 100;
    if (/(har skickat en kommentar|sent a comment|förhandsgranska|preview)/i.test(text)) {
        score += 150;
    }
    if (/(har inte besvarat frågorna ännu|has not answered|hasn't answered|väntar på svar|waiting for answer)/i.test(text)) {
        score += 125;
    }
    if (/(godkänner du gruppreglerna|group rules|inget svar|no answer)/i.test(text)) {
        score += 95;
    }
    if (/(bor i|lives in|har gått på|studied at|har jobbat på|jobbar på|works at|gick med i facebook|joined facebook|\d+\s+grupper|\d+\s+groups|\d+\s+vänner|\d+\s+friends)/i.test(text)) {
        score += 55;
    }

    if (summary && summary.name && text === summary.name) {
        score -= 120;
    }

    if (rect.left >= cardRect.left + Math.max(180, cardRect.width * 0.55)) {
        score -= 180;
    }

    if (rect.top <= cardRect.top + 20) {
        score -= 40;
    }

    score -= Math.round(text.length / 4);
    score -= Math.round(Math.max(0, rect.width - 320) / 12);

    return score;
}

function resolveParticipantRequestAttachmentContainer(node, card) {
    if (!node || !card) {
        return null;
    }

    let current = node;
    let currentText = normalizeWhitespace(current.textContent || current.innerText || '');

    for (let depth = 0; depth < 5 && current && current.parentElement && current.parentElement !== card; depth += 1) {
        const parent = current.parentElement;
        if (!parent || !card.contains(parent)) {
            break;
        }

        if (parent.querySelector && parent.querySelector('button, [role="button"]')) {
            break;
        }

        const parentText = normalizeWhitespace(parent.textContent || parent.innerText || '');
        if (!parentText || parentText.length > currentText.length + 90) {
            break;
        }

        current = parent;
        currentText = parentText;
    }

    return current;
}

function findParticipantRequestAttachmentAnchor(card, summary) {
    if (!card || !card.querySelectorAll) {
        return null;
    }

    const candidates = card.querySelectorAll('div, span, a, strong');
    let bestNode = null;
    let bestScore = -1;

    for (let index = 0; index < candidates.length; index += 1) {
        const candidate = candidates[index];
        const score = scoreParticipantRequestAttachmentAnchor(candidate, card, summary || null);
        if (score > bestScore) {
            bestScore = score;
            bestNode = candidate;
        }
    }

    if (!bestNode || bestScore < 120) {
        return null;
    }

    return resolveParticipantRequestAttachmentContainer(bestNode, card);
}

function resolveParticipantRequestsObserverRoot() {
    const roots = resolveParticipantRequestSearchRoots();
    for (let index = 0; index < roots.length; index += 1) {
        const root = roots[index];
        if (root && root.querySelectorAll) {
            return root;
        }
    }

    return document.body || null;
}

function normalizeParticipantIdentityText(value) {
    const normalized = normalizeWhitespace(value || '');
    if (!normalized) {
        return '';
    }

    return normalized
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9\u00c0-\u024f\s]/gi, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

function getParticipantSummaryLines(summary) {
    return Array.isArray(summary && summary.lines) ? summary.lines.filter(Boolean) : [];
}

function doesTextMatchParticipantSummary(text, summary) {
    const normalizedText = normalizeParticipantIdentityText(text || '');
    if (!normalizedText || !summary) {
        return false;
    }

    const normalizedName = normalizeParticipantIdentityText(summary.name || '');
    if (normalizedName && normalizedText.indexOf(normalizedName) !== -1) {
        return true;
    }

    const normalizedProfileId = normalizeWhitespace(summary.profileUserId || '');
    if (normalizedProfileId && normalizedText.indexOf(normalizedProfileId) !== -1) {
        return true;
    }

    return getParticipantSummaryLines(summary).some(function (line) {
        const normalizedLine = normalizeParticipantIdentityText(line || '');
        if (!normalizedLine || normalizedLine.length < 10) {
            return false;
        }
        return normalizedText.indexOf(normalizedLine) !== -1 || normalizedLine.indexOf(normalizedText) !== -1;
    });
}

function normalizeParticipantPreviewHintText(value) {
    return normalizeWhitespace(value || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/\s+/g, ' ')
        .trim();
}

function isParticipantPreviewDialogText(text) {
    const normalized = normalizeParticipantPreviewHintText(text || '');
    if (!normalized) {
        return false;
    }

    return /(forhandsgranska kommentar|forhandsgranska kommentarer|frhandsgranska kommentar|frhandsgranska kommentarer|preview comment|preview comments|comment preview|comments preview|har skickat en kommentar|sent a comment)/i.test(normalized);
}

function isParticipantPreviewNoiseLine(text) {
    const normalized = normalizeWhitespace(text || '');
    if (!normalized) {
        return true;
    }

    return /^(godkänn|approve|avvisa|reject|decline|analyze user|show card|rules \/ group info|find preview element|analyze current preview|see translation|visa översättning|översättning|translation)$/i.test(normalized)
        || /^(kommentarerna publiceras inte|comments are not published)$/i.test(normalized)
        || /^(för \d+ minuter sedan|\d+ minutes ago|för \d+ timmar sedan|\d+ hours ago)$/i.test(normalized);
}

function lineLooksLikeParticipantPreviewContent(text) {
    const normalized = normalizeWhitespace(text || '');
    if (!normalized) {
        return false;
    }

    return /(kommentar|comment|svar|reply|replied|answered|inlägg|post|original post|ursprungligt inlägg|skickat|sent|skrev|wrote|fråga|question|regler|rules)/i.test(normalized)
        || /^(idag|today|igår|yesterday)\b/i.test(normalized)
        || /\b\d{1,2}:\d{2}\b/.test(normalized);
}

function addParticipantPreviewLineWindow(indices, pivotIndex, startOffset, endOffset, maxIndex) {
    if (!isFinite(pivotIndex)) {
        return;
    }

    const lowerBound = Math.max(0, pivotIndex + startOffset);
    const upperBound = Math.min(maxIndex, pivotIndex + endOffset);
    for (let index = lowerBound; index <= upperBound; index += 1) {
        indices.add(index);
    }
}

function collectRelevantParticipantPreviewLines(lines, summary, limit) {
    const sourceLines = Array.isArray(lines) ? lines : [];
    const maxItems = typeof limit === 'number' && limit > 0 ? limit : 14;
    const normalizedName = normalizeParticipantIdentityText(summary && summary.name ? summary.name : '');
    const normalizedProfileId = normalizeWhitespace(summary && summary.profileUserId ? summary.profileUserId : '');
    const meaningfulLines = [];

    sourceLines.forEach(function (line) {
        const normalized = normalizeWhitespace(line || '');
        if (!normalized || isParticipantPreviewNoiseLine(normalized)) {
            return;
        }
        meaningfulLines.push(normalized);
    });

    if (!meaningfulLines.length) {
        return [];
    }

    const selectedIndices = new Set();
    meaningfulLines.forEach(function (line, index) {
        const normalizedLine = normalizeParticipantIdentityText(line);
        const matchesIdentity = !!(
            (normalizedName && normalizedLine.indexOf(normalizedName) !== -1)
            || (normalizedProfileId && line.indexOf(normalizedProfileId) !== -1)
            || doesTextMatchParticipantSummary(line, summary)
        );
        const contentHint = lineLooksLikeParticipantPreviewContent(line);

        if (matchesIdentity) {
            addParticipantPreviewLineWindow(selectedIndices, index, -1, 3, meaningfulLines.length - 1);
        }

        if (contentHint) {
            addParticipantPreviewLineWindow(selectedIndices, index, -1, 2, meaningfulLines.length - 1);
        }
    });

    const tailStart = Math.max(0, meaningfulLines.length - Math.min(8, meaningfulLines.length));
    for (let index = tailStart; index < meaningfulLines.length; index += 1) {
        if (lineLooksLikeParticipantPreviewContent(meaningfulLines[index]) || index >= meaningfulLines.length - 4) {
            selectedIndices.add(index);
        }
    }

    if (!selectedIndices.size) {
        meaningfulLines.forEach(function (_line, index) {
            if (index < maxItems) {
                selectedIndices.add(index);
            }
        });
    }

    const selectedLines = [];
    const seen = new Set();
    Array.from(selectedIndices).sort(function (left, right) {
        return left - right;
    }).forEach(function (index) {
        const line = meaningfulLines[index];
        if (!line || seen.has(line)) {
            return;
        }
        seen.add(line);
        selectedLines.push(line);
    });

    return selectedLines.slice(0, maxItems);
}

function splitParticipantContextTextIntoLines(text) {
    const normalizedText = String(text || '');
    if (!normalizedText) {
        return [];
    }

    let workingText = normalizedText;
    if ((workingText.match(/\n/g) || []).length < 2 && workingText.length > 220) {
        workingText = workingText.replace(/([.!?])\s+(?=[A-ZÅÄÖ0-9])/g, '$1\n');
    }

    return workingText.split(/\n+/).map(function (line) {
        return normalizeWhitespace(line);
    }).filter(Boolean);
}

function lineMatchesParticipantIdentity(text, summary) {
    const normalized = normalizeWhitespace(text || '');
    if (!normalized) {
        return false;
    }

    const normalizedLine = normalizeParticipantIdentityText(normalized);
    const normalizedName = normalizeParticipantIdentityText(summary && summary.name ? summary.name : '');
    const profileId = normalizeWhitespace(summary && summary.profileUserId ? summary.profileUserId : '');

    return !!(
        (normalizedName && normalizedLine.indexOf(normalizedName) !== -1)
        || (profileId && normalized.indexOf(profileId) !== -1)
        || doesTextMatchParticipantSummary(normalized, summary)
    );
}

function collectParticipantContextNeighborhoodLines(lines, summary, limit) {
    const sourceLines = Array.isArray(lines) ? lines : [];
    const maxItems = typeof limit === 'number' && limit > 0 ? limit : 10;
    const meaningfulLines = [];

    sourceLines.forEach(function (line) {
        const normalized = normalizeWhitespace(line || '');
        if (!normalized || isParticipantPreviewNoiseLine(normalized)) {
            return;
        }
        meaningfulLines.push(normalized);
    });

    if (!meaningfulLines.length) {
        return [];
    }

    const selectedIndices = new Set();
    meaningfulLines.forEach(function (line, index) {
        const identityMatch = lineMatchesParticipantIdentity(line, summary || null);
        const contentMatch = lineLooksLikeParticipantPreviewContent(line);
        if (identityMatch) {
            addParticipantPreviewLineWindow(selectedIndices, index, -2, 3, meaningfulLines.length - 1);
            return;
        }
        if (contentMatch) {
            addParticipantPreviewLineWindow(selectedIndices, index, -1, 1, meaningfulLines.length - 1);
        }
    });

    if (!selectedIndices.size) {
        meaningfulLines.forEach(function (_line, index) {
            if (index < maxItems) {
                selectedIndices.add(index);
            }
        });
    }

    const selectedLines = [];
    const seen = new Set();
    Array.from(selectedIndices).sort(function (left, right) {
        return left - right;
    }).forEach(function (index) {
        const line = meaningfulLines[index];
        if (!line || seen.has(line)) {
            return;
        }
        seen.add(line);
        selectedLines.push(line);
    });

    return selectedLines.slice(0, maxItems);
}

function collectParticipantCommentFocusLines(summary, dialogContext, previewEntries, openedContextLines) {
    const combinedLines = [];
    const pushLines = function (lines) {
        (Array.isArray(lines) ? lines : []).forEach(function (line) {
            const normalized = normalizeWhitespace(line || '');
            if (!normalized || isParticipantPreviewNoiseLine(normalized)) {
                return;
            }
            combinedLines.push(normalized);
        });
    };

    if (dialogContext && Array.isArray(dialogContext.commentLines)) {
        pushLines(dialogContext.commentLines);
    }

    (Array.isArray(previewEntries) ? previewEntries : []).slice(-4).forEach(function (entry) {
        pushLines(entry && entry.comment_lines);
        pushLines(entry && entry.post_lines);
        pushLines(entry && entry.normalized_text_lines);
        if (Array.isArray(entry && entry.author_names) && entry.author_names.length) {
            pushLines([entry.author_names.join(' / ')]);
        }
    });

    pushLines(openedContextLines);

    const focusedLines = collectRelevantParticipantPreviewLines(combinedLines, summary || null, 14);
    const identityLines = focusedLines.filter(function (line) {
        return lineMatchesParticipantIdentity(line, summary || null);
    });
    const commentHintLines = focusedLines.filter(function (line) {
        return lineLooksLikeParticipantPreviewContent(line);
    });
    const prioritized = [];
    const seen = new Set();
    [identityLines, commentHintLines, focusedLines].forEach(function (bucket) {
        bucket.forEach(function (line) {
            if (!line || seen.has(line)) {
                return;
            }
            seen.add(line);
            prioritized.push(line);
        });
    });

    return prioritized.slice(0, 10);
}

function extractParticipantPreviewDialogSignalLines(dialog) {
    if (!dialog || !dialog.getAttribute) {
        return [];
    }

    const lines = [];
    const seen = new Set();
    const addLine = function (value) {
        const normalized = normalizeWhitespace(value || '');
        if (!normalized || seen.has(normalized)) {
            return;
        }
        seen.add(normalized);
        lines.push(normalized);
    };

    addLine(dialog.getAttribute('aria-label') || '');
    addLine(dialog.getAttribute('title') || '');

    const labelledBy = String(dialog.getAttribute('aria-labelledby') || '').trim();
    if (labelledBy) {
        labelledBy.split(/\s+/).forEach(function (id) {
            if (!id) {
                return;
            }
            const node = document.getElementById(id);
            addLine(node ? (node.innerText || node.textContent || '') : '');
        });
    }

    return lines;
}

function getParticipantPreviewDialogMountRoot(dialog) {
    if (!dialog || !dialog.parentElement || !document.documentElement) {
        return null;
    }

    let current = dialog;
    while (current && current.parentElement && current.parentElement !== document.documentElement) {
        current = current.parentElement;
    }

    if (current && current.parentElement === document.documentElement && current.tagName === 'DIV') {
        return current;
    }

    return null;
}

function collectParticipantPreviewDialogCandidates() {
    const candidates = [];
    const seen = new Set();
    const pushCandidate = function (node) {
        if (!node || seen.has(node) || !node.getBoundingClientRect) {
            return;
        }
        seen.add(node);
        candidates.push(node);
    };

    document.querySelectorAll('[role="dialog"], [aria-modal="true"]').forEach(pushCandidate);
    document.querySelectorAll('html > div[id^="mount_"] [aria-label], html > div[id^="mount_"] [role="dialog"], html > div[id^="mount_"] [aria-modal="true"]').forEach(pushCandidate);

    return candidates;
}

function getTrackedParticipantPreviewDialogState() {
    if (!activeParticipantUserAnalysis || !activeParticipantUserAnalysis.previewDialogState) {
        return null;
    }

    const state = activeParticipantUserAnalysis.previewDialogState;
    if (!state.element || !document.contains(state.element)) {
        return null;
    }

    return state;
}

function rememberTrackedParticipantPreviewDialog(match) {
    if (!activeParticipantUserAnalysis || !match || !match.element || !document.contains(match.element)) {
        return;
    }

    activeParticipantUserAnalysis.previewDialogState = {
        element: match.element,
        mountRootId: match.mountRootId || '',
        signalText: match.signalText || '',
        lastMatchedAt: Date.now(),
    };
}

function shouldReuseTrackedParticipantPreviewState(nextSummary) {
    if (!activeParticipantUserAnalysis || !activeParticipantUserAnalysis.summary) {
        return false;
    }

    const previousSummary = activeParticipantUserAnalysis.summary;
    const nextProfileId = normalizeWhitespace(nextSummary && nextSummary.profileUserId ? nextSummary.profileUserId : '');
    const previousProfileId = normalizeWhitespace(previousSummary && previousSummary.profileUserId ? previousSummary.profileUserId : '');
    if (nextProfileId && previousProfileId && nextProfileId === previousProfileId) {
        return true;
    }

    const nextProfileUrl = normalizeFacebookUrlForPrompt(nextSummary && nextSummary.profileUrl ? nextSummary.profileUrl : '');
    const previousProfileUrl = normalizeFacebookUrlForPrompt(previousSummary && previousSummary.profileUrl ? previousSummary.profileUrl : '');
    if (nextProfileUrl && previousProfileUrl && (nextProfileUrl === previousProfileUrl || nextProfileUrl.indexOf(previousProfileUrl) !== -1 || previousProfileUrl.indexOf(nextProfileUrl) !== -1)) {
        return true;
    }

    const nextName = normalizeParticipantIdentityText(nextSummary && nextSummary.name ? nextSummary.name : '');
    const previousName = normalizeParticipantIdentityText(previousSummary && previousSummary.name ? previousSummary.name : '');
    return !!(nextName && previousName && nextName === previousName);
}

function extractParticipantPreviewDialogLines(dialog) {
    if (!dialog) {
        return [];
    }

    const clone = dialog.cloneNode(true);
    clone.querySelectorAll('#sgpt-factbox, #sgpt-participant-requests-control, [data-sgpt-participant-badge="true"]').forEach(function (node) {
        node.remove();
    });

    const rawLines = extractParticipantPreviewDialogSignalLines(dialog).concat(String(clone.innerText || clone.textContent || '').split(/\n+/));
    const seen = new Set();
    const lines = [];

    rawLines.forEach(function (line) {
        const normalized = normalizeWhitespace(line);
        if (!normalized || normalized.length > 260 || seen.has(normalized)) {
            return;
        }
        if (isParticipantPreviewNoiseLine(normalized)) {
            return;
        }
        seen.add(normalized);
        lines.push(normalized);
    });

    return lines.slice(0, 48);
}

function findParticipantPreviewDialog(summary) {
    const dialogs = collectParticipantPreviewDialogCandidates();
    const trackedState = getTrackedParticipantPreviewDialogState();
    let best = null;
    let bestScore = -1;

    if (trackedState && dialogs.indexOf(trackedState.element) === -1) {
        dialogs.unshift(trackedState.element);
    }

    dialogs.forEach(function (dialog) {
        if (!dialog || !isElementNearViewport(dialog, 160)) {
            return;
        }

        const lines = extractParticipantPreviewDialogLines(dialog);
        if (!lines.length) {
            return;
        }

        const signalText = normalizeWhitespace(extractParticipantPreviewDialogSignalLines(dialog).join(' | '));
        const text = normalizeWhitespace(lines.join(' | '));
        const combinedText = normalizeWhitespace([signalText, text].filter(Boolean).join(' | '));
        const mountRoot = getParticipantPreviewDialogMountRoot(dialog);
        let score = 0;
        if (isParticipantPreviewDialogText(signalText)) {
            score += 420;
        }
        if (isParticipantPreviewDialogText(text)) {
            score += 220;
        }
        if (isParticipantPreviewDialogText(combinedText)) {
            score += 120;
        }
        if (doesTextMatchParticipantSummary(combinedText, summary)) {
            score += 280;
        }
        if (summary && summary.profileUserId && combinedText.indexOf(String(summary.profileUserId)) !== -1) {
            score += 120;
        }
        if (mountRoot && mountRoot.id && /^mount_/i.test(mountRoot.id)) {
            score += 40;
        }
        if (trackedState && trackedState.element === dialog) {
            score += 260;
        }
        if (trackedState && trackedState.mountRootId && mountRoot && mountRoot.id === trackedState.mountRootId) {
            score += 120;
        }

        if (score > bestScore) {
            bestScore = score;
            best = {
                element: dialog,
                lines: lines,
                text: text,
                signalText: signalText,
                score: score,
                mountRootId: mountRoot && mountRoot.id ? mountRoot.id : '',
            };
        }
    });

    if (best && (bestScore >= 220 || (best && isParticipantPreviewDialogText(best.signalText || '')) || (trackedState && best.element === trackedState.element && bestScore >= 120))) {
        rememberTrackedParticipantPreviewDialog(best);
        return best;
    }

    return null;
}

function getActiveParticipantUserAnalysisSurface() {
    if (!activeParticipantUserAnalysis || !activeParticipantUserAnalysis.summary) {
        return null;
    }

    const dialogMatch = findParticipantPreviewDialog(activeParticipantUserAnalysis.summary);
    if (dialogMatch) {
        return {
            type: 'dialog',
            element: dialogMatch.element,
            lines: dialogMatch.lines,
            text: dialogMatch.text,
            signalText: dialogMatch.signalText || '',
            score: dialogMatch.score,
            mountRootId: dialogMatch.mountRootId || '',
        };
    }

    const liveCard = activeParticipantUserAnalysis.card && document.contains(activeParticipantUserAnalysis.card)
        ? activeParticipantUserAnalysis.card
        : null;
    if (liveCard) {
        return {
            type: 'card',
            element: liveCard,
            lines: extractParticipantRequestVisibleLines(liveCard),
            text: normalizeWhitespace(liveCard.innerText || liveCard.textContent || ''),
            score: 0,
        };
    }

    const summaryLines = getParticipantSummaryLines(activeParticipantUserAnalysis.summary);
    if (!summaryLines.length && !activeParticipantUserAnalysis.summary.name) {
        return null;
    }

    return {
        type: 'snapshot',
        element: null,
        lines: summaryLines,
        text: normalizeWhitespace([
            activeParticipantUserAnalysis.summary.name || '',
            summaryLines.join(' | '),
        ].join(' | ')),
        score: 0,
    };
}

function buildParticipantAnalysisReferenceText(summary, card) {
    const parts = [];
    const surface = getActiveParticipantUserAnalysisSurface();
    const liveCard = card && document.contains(card) ? card : null;
    const preferPreviewSurfaceOnly = !!(activeParticipantUserAnalysis && activeParticipantUserAnalysis.previewOnly && surface && surface.type === 'dialog');

    if (surface && surface.text) {
        parts.push(surface.text);
    }
    if (liveCard && !preferPreviewSurfaceOnly) {
        parts.push(normalizeWhitespace(liveCard.innerText || liveCard.textContent || ''));
    }
    if (summary) {
        parts.push(summary.name || '');
        parts.push(summary.profileUserId || '');
        parts.push(summary.profileUrl || '');
        if (!preferPreviewSurfaceOnly) {
            parts.push(getParticipantSummaryLines(summary).join(' | '));
        }
    }

    return normalizeWhitespace(parts.join(' | ')).toLowerCase();
}

function describeActiveParticipantPreviewSurface() {
    const surface = getActiveParticipantUserAnalysisSurface();
    if (!surface || surface.type !== 'dialog') {
        return '';
    }

    const name = normalizeWhitespace(activeParticipantUserAnalysis && activeParticipantUserAnalysis.summary && activeParticipantUserAnalysis.summary.name ? activeParticipantUserAnalysis.summary.name : '');
    const mountSuffix = surface.mountRootId ? ' · ' + surface.mountRootId : '';
    return name
        ? 'Preview dialog matched: ' + name + mountSuffix
        : 'Active participant preview dialog matched.' + mountSuffix;
}

function rememberParticipantRequestSelection(card, reason) {
    const liveCard = card && document.contains(card) ? card : null;
    const summary = liveCard ? buildParticipantRequestSummary(liveCard) : null;
    if (!liveCard || !summary) {
        return null;
    }

    participantRequestsLastSelectedCard = liveCard;
    participantRequestsLastSelectedSummary = summary;
    participantRequestsLastSelectedReason = String(reason || 'selection');
    return summary;
}

function getParticipantReferenceSummary() {
    if (activeParticipantUserAnalysis && activeParticipantUserAnalysis.summary) {
        return activeParticipantUserAnalysis.summary;
    }
    if (participantRequestsLastSelectedSummary) {
        return participantRequestsLastSelectedSummary;
    }
    if (participantRequestsVisibleCards.length) {
        return buildParticipantRequestSummary(participantRequestsVisibleCards[0]);
    }
    return buildParticipantSummaryFromDialogContext(extractParticipantPreviewDialogContext(null));
}

function extractParticipantPreviewDialogContext(summary) {
    const dialogMatch = findParticipantPreviewDialog(summary || null);
    if (!dialogMatch) {
        return null;
    }

    const relevantCommentLines = collectRelevantParticipantPreviewLines(dialogMatch.lines, summary || null, 14);

    const originalPostLinks = Array.from(dialogMatch.element.querySelectorAll('a[href]')).map(function (anchor) {
        const text = normalizeWhitespace(anchor.textContent || anchor.innerText || '');
        if (!text || !/(visa ursprungligt inlägg|view original post|original post)/i.test(text)) {
            return null;
        }
        return normalizeFacebookUrlForPrompt(anchor.href || '');
    }).filter(Boolean);

    return {
        element: dialogMatch.element,
        lines: dialogMatch.lines.slice(),
        text: dialogMatch.text,
        signalText: dialogMatch.signalText || '',
        mountRootId: dialogMatch.mountRootId || '',
        originalPostLinks: originalPostLinks.slice(0, 4),
        commentLines: relevantCommentLines,
    };
}

function buildParticipantSummaryFromDialogContext(dialogContext) {
    if (!dialogContext || !Array.isArray(dialogContext.lines) || !dialogContext.lines.length) {
        return null;
    }

    const candidateName = dialogContext.commentLines.concat(dialogContext.lines).find(function (line) {
        return !isParticipantPreviewDialogText(line)
            && !isParticipantPreviewNoiseLine(line)
            && line.length >= 4
            && line.length <= 90
            && line.split(/\s+/).length <= 6;
    }) || '';

    return {
        name: candidateName,
        profileUrl: '',
        profileUserId: '',
        lines: dialogContext.lines.slice(0, 18),
        questionCount: extractParticipantRequestQuestionLines(dialogContext.lines).length,
        groupCount: extractParticipantRequestGroupLines(dialogContext.lines).length,
        hasPreviewLink: dialogContext.originalPostLinks.length > 0,
        hasOverflowButton: false,
    };
}

function buildParticipantPreviewDebugState() {
    if (!isParticipantAnalysisRequestActive()) {
        return null;
    }

    const requestState = getParticipantAnalysisRequestState();
    const summary = requestState && requestState.summary ? requestState.summary : getParticipantReferenceSummary();
    const card = requestState && requestState.card ? requestState.card : participantRequestsLastSelectedCard;
    const dialogContext = extractParticipantPreviewDialogContext(summary);
    const previewEntries = activeParticipantUserAnalysis && Array.isArray(activeParticipantUserAnalysis.previewEntries)
        ? activeParticipantUserAnalysis.previewEntries
        : [];
    const openedContextLines = collectParticipantRequestOpenedContextLines(card, summary);
    const participantCommentFocusLines = collectParticipantCommentFocusLines(summary, dialogContext, previewEntries, openedContextLines);
    const sections = [];

    function normalizeLines(lines, limit) {
        const seen = new Set();
        return (Array.isArray(lines) ? lines : []).map(function (line) {
            return clipText(normalizeWhitespace(line), 500);
        }).filter(function (line) {
            if (!line || seen.has(line)) {
                return false;
            }
            seen.add(line);
            return true;
        }).slice(0, typeof limit === 'number' ? limit : 8);
    }

    if (participantCommentFocusLines.length) {
        sections.push({
            title: 'Participant-focused comment clues',
            subtitle: summary && summary.name ? 'focused on ' + summary.name : 'focused preview/comment context',
            lines: normalizeLines(participantCommentFocusLines, 8),
        });
    }

    if (dialogContext) {
        const dialogLines = normalizeLines(dialogContext.commentLines, 8);
        sections.push({
            title: 'Preview dialog DOM',
            subtitle: dialogContext.mountRootId ? 'mount=' + dialogContext.mountRootId : 'matched live dialog',
            lines: dialogLines,
        });
    }

    previewEntries.slice(-4).forEach(function (entry, index) {
        const lines = normalizeLines(
            (Array.isArray(entry.comment_lines) ? entry.comment_lines : []).concat(
                Array.isArray(entry.post_lines) ? entry.post_lines : [],
                Array.isArray(entry.normalized_text_lines) ? entry.normalized_text_lines : []
            ),
            8
        );
        sections.push({
            title: 'GraphQL preview #' + String(index + 1),
            subtitle: normalizeWhitespace([
                entry.candidate_name || entry.request_name || '',
                entry.preview_type ? '(' + entry.preview_type + ')' : '',
                entry.profile_user_id ? 'id=' + entry.profile_user_id : '',
            ].join(' ')),
            lines: lines,
        });
    });

    if (openedContextLines.length) {
        sections.push({
            title: 'Fallback opened-preview context',
            subtitle: 'DOM scan',
            lines: normalizeLines(openedContextLines, 8),
        });
    }

    const capturedLineCount = sections.reduce(function (sum, section) {
        return sum + ((section && Array.isArray(section.lines)) ? section.lines.length : 0);
    }, 0);

    return {
        sections: sections,
        capturedLineCount: capturedLineCount,
        hasCapturedLines: capturedLineCount > 0,
        participantCommentFocusCount: participantCommentFocusLines.length,
        dialogMatched: !!dialogContext,
        previewEntryCount: previewEntries.length,
    };
}

function buildParticipantPreviewDebugHtml(debugState) {
    const state = debugState || buildParticipantPreviewDebugState();
    if (!state) {
        return '';
    }

    const summaryText = [
        'Captured lines: ' + String(state.capturedLineCount || 0),
        'Participant-focused: ' + String(state.participantCommentFocusCount || 0),
        'Preview dialog: ' + (state.dialogMatched ? 'yes' : 'no'),
        'GraphQL entries: ' + String(state.previewEntryCount || 0),
    ].join(' · ');

    const sectionsHtml = (state.sections || []).map(function (section) {
        const subtitle = section && section.subtitle ? '<div style="margin-top:2px; font-size:11px; color:#64748b;">' + escapeHtml(section.subtitle) + '</div>' : '';
        const lines = (section && Array.isArray(section.lines) ? section.lines : []).map(function (line) {
            return '<li style="margin:0 0 4px 0;">' + escapeHtml(line) + '</li>';
        }).join('');
        return [
            '<div style="margin-top:8px; padding-top:8px; border-top:1px dashed rgba(148,163,184,0.35);">',
            '<div style="font-weight:700; color:#312e81;">' + escapeHtml(section && section.title ? section.title : 'Preview source') + '</div>',
            subtitle,
            lines
                ? '<ul style="margin:6px 0 0 18px; padding:0; color:#334155;">' + lines + '</ul>'
                : '<div style="margin-top:6px; color:#94a3b8; font-style:italic;">No comment lines captured from this source yet.</div>',
            '</div>'
        ].join('');
    }).join('');

    return [
        '<details open style="margin-top:10px; border:1px solid rgba(191,219,254,0.85); border-radius:12px; background:rgba(239,246,255,0.75); padding:10px;">',
        '<summary style="cursor:pointer; font-weight:800; color:#075985;">Preview capture debug</summary>',
        '<div style="margin-top:8px; font-size:12px; color:#0f172a;">' + escapeHtml(summaryText) + '</div>',
        sectionsHtml || '<div style="margin-top:8px; color:#64748b;">No preview comments captured yet. Open the preview dialog and wait for the comment extraction.</div>',
        '</details>'
    ].join('');
}

function updateParticipantPreviewDebugView() {
    if (!factResultBox || !document.contains(factResultBox)) {
        return;
    }

    const existing = factResultBox.querySelector('[data-role="participant-preview-debug"]');
    if (!isParticipantAnalysisRequestActive()) {
        if (existing) {
            existing.remove();
        }
        return;
    }

    const debugState = buildParticipantPreviewDebugState();
    if (!debugState) {
        if (existing) {
            existing.remove();
        }
        return;
    }

    const debugBox = existing || document.createElement('div');
    debugBox.setAttribute('data-role', 'participant-preview-debug');
    debugBox.innerHTML = buildParticipantPreviewDebugHtml(debugState);

    if (!existing) {
        const contentScroll = factResultBox.querySelector('[data-role="fact-content-scroll"]');
        const actionsRow = factResultBox.querySelector('[data-role="fact-actions"]');
        if (contentScroll) {
            contentScroll.appendChild(debugBox);
        } else if (actionsRow && actionsRow.parentElement === factResultBox) {
            factResultBox.insertBefore(debugBox, actionsRow);
        } else {
            factResultBox.appendChild(debugBox);
        }
    }
}

function setParticipantAutoSupplementStatus(message, active) {
    if (!factResultBox || !document.contains(factResultBox)) {
        return;
    }

    const existing = factResultBox.querySelector('[data-role="participant-auto-supplement-status"]');
    if (!active) {
        if (existing) {
            existing.remove();
        }
        return;
    }

    const statusBox = existing || document.createElement('div');
    statusBox.setAttribute('data-role', 'participant-auto-supplement-status');
    statusBox.style.marginTop = '10px';
    statusBox.style.padding = '8px 10px';
    statusBox.style.borderRadius = '10px';
    statusBox.style.border = '1px solid rgba(196,181,253,0.9)';
    statusBox.style.background = 'rgba(245,243,255,0.92)';
    statusBox.style.display = 'flex';
    statusBox.style.alignItems = 'center';
    statusBox.style.gap = '8px';
    statusBox.style.color = '#6d28d9';
    statusBox.style.fontSize = '12px';
    statusBox.style.fontWeight = '700';

    statusBox.innerHTML = [
        '<span style="width:14px; height:14px; border-radius:50%; border:2px solid rgba(124,58,237,0.22); border-top-color:#7c3aed; animation:sgpt-inline-spin .8s linear infinite; flex:0 0 auto;"></span>',
        '<span style="flex:1 1 auto;">' + escapeHtml(message || 'Preview comments captured. Wait a few more seconds while the comment part is analyzed too…') + '</span>'
    ].join('');

    if (!existing) {
        const actionsRow = factResultBox.querySelector('[data-role="fact-actions"]');
        if (actionsRow && actionsRow.parentElement === factResultBox) {
            factResultBox.insertBefore(statusBox, actionsRow);
        } else {
            factResultBox.appendChild(statusBox);
        }
    }
}

function clearParticipantAnalysisAutoSupplementTimer() {
    if (participantAnalysisAutoSupplementTimerId) {
        window.clearTimeout(participantAnalysisAutoSupplementTimerId);
        participantAnalysisAutoSupplementTimerId = null;
    }
}

function clearParticipantAnalysisAutoSupplementStatusTimer() {
    if (participantAnalysisAutoSupplementStatusTimerId) {
        window.clearTimeout(participantAnalysisAutoSupplementStatusTimerId);
        participantAnalysisAutoSupplementStatusTimerId = null;
    }
}

function buildParticipantAutoSupplementStatusMessage() {
    if (!activeParticipantUserAnalysis) {
        return '';
    }

    const debugState = buildParticipantPreviewDebugState();
    if (!debugState || !debugState.hasCapturedLines) {
        return '';
    }

    const summary = activeParticipantUserAnalysis.summary || getParticipantReferenceSummary();
    const participantName = normalizeWhitespace(summary && summary.name ? summary.name : '');
    const participantLabel = participantName || 'den här deltagaren';

    if (activeParticipantUserAnalysis.autoSupplementInFlight) {
        return 'Analysen uppdateras nu med ' + participantLabel + 's kommentar-/förhandsgranskningsledtrådar och vägs mot gruppinfo/regler…';
    }

    if (activeParticipantUserAnalysis.autoSupplementQueued) {
        return 'Nya kommentar-/förhandsgranskningsledtrådar hittades för ' + participantLabel + '. Väntar lite till ifall fler kommentarer eller hela originalinlägget hinner laddas innan analysen uppdateras…';
    }

    const lastChangeAt = Number(activeParticipantUserAnalysis.lastContextChangeAt || 0);
    if (lastChangeAt > 0 && Date.now() - lastChangeAt < 7000) {
        return 'Mer Facebook-kontext hittades för ' + participantLabel + '. Om inget mer händer strax vägs kommentaren tydligare mot gruppinfo/regler i nästa analysuppdatering.';
    }

    return '';
}

function refreshParticipantAutoSupplementStatus() {
    clearParticipantAnalysisAutoSupplementStatusTimer();
    const message = buildParticipantAutoSupplementStatusMessage();
    if (!message) {
        setParticipantAutoSupplementStatus('', false);
        return;
    }

    setParticipantAutoSupplementStatus(message, true);
    if (activeParticipantUserAnalysis && !activeParticipantUserAnalysis.autoSupplementInFlight && !activeParticipantUserAnalysis.autoSupplementQueued) {
        participantAnalysisAutoSupplementStatusTimerId = window.setTimeout(function () {
            refreshParticipantAutoSupplementStatus();
        }, 2800);
    }
}

function getParticipantAutoSupplementRequestState() {
    if (!activeParticipantUserAnalysis || !lastVerificationRequest || lastVerificationRequest.requestMode !== 'user-analysis') {
        return null;
    }

    const debugState = buildParticipantPreviewDebugState();
    if (!debugState || !debugState.hasCapturedLines) {
        return null;
    }

    const requestState = getParticipantAnalysisRequestState();
    if (!requestState || !requestState.context) {
        return null;
    }

    const contextSignature = normalizeWhitespace(requestState.context).slice(0, 6000);
    const currentRequestSignature = normalizeWhitespace(lastVerificationRequest.context || '').slice(0, 6000);
    if (!contextSignature || contextSignature === currentRequestSignature) {
        return null;
    }

    if (activeParticipantUserAnalysis.autoSupplementContextSignature === contextSignature) {
        return null;
    }

    return {
        requestState: requestState,
        contextSignature: contextSignature,
        debugState: debugState,
    };
}

function runParticipantAnalysisAutoSupplement(reason) {
    clearParticipantAnalysisAutoSupplementTimer();
    const supplementState = getParticipantAutoSupplementRequestState();
    if (!supplementState) {
        refreshParticipantAutoSupplementStatus();
        return;
    }

    if (pendingAiRequestMode === 'verify') {
        activeParticipantUserAnalysis.autoSupplementQueued = true;
        return;
    }

    activeParticipantUserAnalysis.autoSupplementQueued = false;
    activeParticipantUserAnalysis.autoSupplementInFlight = true;
    activeParticipantUserAnalysis.lastAutoSupplementStartedAt = Date.now();
    activeParticipantUserAnalysis.autoSupplementContextSignature = supplementState.contextSignature;
    refreshParticipantAutoSupplementStatus();
    updateParticipantPreviewDebugView();

    startFactVerification(supplementState.requestState.context, {
        anchor: createFactAnchorForNode(supplementState.requestState.anchorElement),
        model: lastVerificationRequest.model,
        responseLanguage: lastVerificationRequest.responseLanguage,
        sourceLabel: lastVerificationRequest.sourceLabel || 'Participant user analysis',
        pendingTitle: lastVerificationRequest.pendingTitle,
        pendingSubtitle: lastVerificationRequest.pendingSubtitle,
        resultTitle: lastVerificationRequest.resultTitle,
        failedTitle: lastVerificationRequest.failedTitle,
        modeLabel: lastVerificationRequest.modeLabel,
        showOpenToolboxAction: lastVerificationRequest.showOpenToolboxAction,
        participantAnalysisCard: supplementState.requestState.card,
        participantAnalysisSummary: supplementState.requestState.summary,
        verificationInstruction: ((lastVerificationRequest.verificationInstruction || '')
            + '\n\nIMPORTANT FOLLOW-UP: New preview/original-post comment context was captured after the first pass. Re-evaluate the participant with extra weight on the participant\'s own visible comment(s) and how those comments align or conflict with the group info/rules/context. If the expanded preview now exposes more of the original post, use that broader thread context to interpret the participant\'s comment more accurately without losing the earlier group-rule framing.').trim(),
        requestMode: lastVerificationRequest.requestMode,
        sourceUrl: lastVerificationRequest.sourceUrl,
        extraData: Object.assign({}, lastVerificationRequest.extraData || {}, {
            participant_analysis_phase: 'followup_preview',
            socialgpt_latency_mode: 'fast_followup',
            facebook_preview_focus_name: supplementState.requestState.summary && supplementState.requestState.summary.name ? supplementState.requestState.summary.name : '',
        }),
        loadingSteps: lastVerificationRequest.loadingSteps,
        previewLimit: lastVerificationRequest.previewLimit,
        keepMarks: true,
        keepPosition: true,
        preserveExistingResultDuringLoading: true,
        participantAutoSupplement: true,
    });
}

function scheduleParticipantAnalysisAutoSupplement(reason) {
    if (!activeParticipantUserAnalysis || !lastVerificationRequest || lastVerificationRequest.requestMode !== 'user-analysis') {
        return;
    }

    const supplementState = getParticipantAutoSupplementRequestState();
    if (!supplementState) {
        refreshParticipantAutoSupplementStatus();
        return;
    }

    activeParticipantUserAnalysis.autoSupplementQueued = true;
    activeParticipantUserAnalysis.lastAutoSupplementQueuedAt = Date.now();
    updateParticipantPreviewDebugView();
    refreshParticipantAutoSupplementStatus();

    if (pendingAiRequestMode === 'verify') {
        return;
    }

    clearParticipantAnalysisAutoSupplementTimer();
    participantAnalysisAutoSupplementTimerId = window.setTimeout(function () {
        runParticipantAnalysisAutoSupplement(reason || 'preview-auto-supplement');
    }, 1600);
}

function buildParticipantContextListRows(summary) {
    const activeSummary = summary || getParticipantReferenceSummary();
    const activeCard = activeParticipantUserAnalysis && activeParticipantUserAnalysis.card
        ? activeParticipantUserAnalysis.card
        : participantRequestsLastSelectedCard;
    const rows = [];
    const dialogContext = extractParticipantPreviewDialogContext(activeSummary);
    const previewEntries = activeParticipantUserAnalysis && Array.isArray(activeParticipantUserAnalysis.previewEntries)
        ? activeParticipantUserAnalysis.previewEntries
        : [];
    const historyEntry = getParticipantHistoryForSummary(activeSummary);
    const questionPairs = extractParticipantRequestQuestionAnswerPairs(getParticipantSummaryLines(activeSummary));

    if (!activeSummary && !dialogContext && !previewEntries.length) {
        return rows;
    }

    rows.push(['Context source', dialogContext ? 'dialog fallback' : (previewEntries.length ? 'graphql/card' : 'card snapshot')]);
    if (activeSummary && activeSummary.name) {
        rows.push(['Name', activeSummary.name]);
    }
    if (activeSummary && activeSummary.profileUserId) {
        rows.push(['Facebook user id', activeSummary.profileUserId]);
    }
    if (activeSummary && activeSummary.profileUrl) {
        rows.push(['Profile URL', activeSummary.profileUrl]);
    }
    if (historyEntry && historyEntry.summary_text) {
        rows.push(['Earlier moderation history', historyEntry.summary_text]);
    }

    extractParticipantRequestGroupLines(getParticipantSummaryLines(activeSummary)).slice(0, 4).forEach(function (line) {
        rows.push(['Groups / friends', line]);
    });
    extractParticipantRequestProfileSignalLines(getParticipantSummaryLines(activeSummary)).slice(0, 6).forEach(function (line) {
        rows.push(['Profile signal', line]);
    });
    collectParticipantCommentFocusLines(activeSummary, dialogContext, previewEntries, collectParticipantRequestOpenedContextLines(activeCard, activeSummary)).slice(0, 6).forEach(function (line) {
        rows.push(['Kommentar-/förhandsgranskningsledtrådar', line]);
    });
    questionPairs.slice(0, 4).forEach(function (pair) {
        rows.push(['Question', pair.question]);
        rows.push(['Answer', pair.answers && pair.answers.length ? pair.answers.join(' / ') : 'No visible answer']);
    });

    if (dialogContext) {
        rows.push(['Preview dialog', 'matched']);
        if (dialogContext.mountRootId) {
            rows.push(['Preview mount', dialogContext.mountRootId]);
        }
        dialogContext.commentLines.slice(0, 4).forEach(function (line) {
            rows.push(['Preview text', line]);
        });
        dialogContext.originalPostLinks.slice(0, 2).forEach(function (link) {
            rows.push(['Original post', link]);
        });
    }

    if (previewEntries.length) {
        rows.push(['GraphQL preview', String(previewEntries.length)]);
        previewEntries.slice(-2).forEach(function (entry) {
            const previewLine = Array.isArray(entry.comment_lines) && entry.comment_lines.length
                ? entry.comment_lines[0]
                : (Array.isArray(entry.post_lines) && entry.post_lines.length ? entry.post_lines[0] : entry.summary_text || 'Captured preview context');
            rows.push(['GraphQL detail', previewLine]);
            if (Array.isArray(entry.author_names) && entry.author_names.length) {
                rows.push(['Preview actor', entry.author_names.join(' / ')]);
            }
            if (Array.isArray(entry.created_times) && entry.created_times.length) {
                rows.push(['Preview timestamp', entry.created_times.join(' / ')]);
            }
            if (Array.isArray(entry.comment_urls) && entry.comment_urls.length) {
                entry.comment_urls.slice(0, 2).forEach(function (link) {
                    rows.push(['Comment URL', link]);
                });
            }
            if (Array.isArray(entry.feedback_urls) && entry.feedback_urls.length) {
                entry.feedback_urls.slice(0, 2).forEach(function (link) {
                    rows.push(['Feedback URL', link]);
                });
            }
            if (Array.isArray(entry.original_post_links) && entry.original_post_links.length) {
                entry.original_post_links.slice(0, 2).forEach(function (link) {
                    rows.push(['Original post', link]);
                });
            }
        });
    }

    const seen = new Set();
    return rows.filter(function (pair) {
        const label = normalizeWhitespace(pair && pair[0] ? pair[0] : '');
        const value = normalizeWhitespace(pair && pair[1] ? pair[1] : '');
        if (!label || !value) {
            return false;
        }
        const signature = label + '|' + value;
        if (seen.has(signature)) {
            return false;
        }
        seen.add(signature);
        return true;
    });
}

function extractParticipantRequestVisibleLines(card) {
    if (!card) {
        return [];
    }

    const clone = card.cloneNode(true);
    clone.querySelectorAll('[data-sgpt-participant-badge="true"]').forEach(function (node) {
        node.remove();
    });

    const rawLines = String(clone.innerText || clone.textContent || '').split(/\n+/);
    const cleaned = [];
    let previous = '';

    rawLines.forEach(function (line) {
        const normalized = normalizeWhitespace(line);
        if (!normalized || normalized === previous) {
            return;
        }
        previous = normalized;
        cleaned.push(normalized);
    });

    return cleaned;
}

function extractParticipantRequestName(card) {
    const ignored = /^(godkänn|approve|avvisa|reject|decline|förhandsgranska|preview|medlem|member|inget svar|no answer)$/i;
    const candidates = card.querySelectorAll('a, strong, h1, h2, h3, h4, span');

    for (let index = 0; index < candidates.length; index += 1) {
        const text = normalizeWhitespace(candidates[index].textContent || candidates[index].innerText || '');
        if (!text || text.length < 3 || text.length > 80 || ignored.test(text)) {
            continue;
        }
        if (/^(95 andra grupper|11 grupper gemensamt|gick med i facebook|bor i|har gått på|har skickat)/i.test(text)) {
            continue;
        }
        return text;
    }

    const lines = extractParticipantRequestVisibleLines(card);
    return lines.length ? lines[0] : '';
}

function extractParticipantRequestProfileUrl(card) {
    const anchors = card.querySelectorAll('a[href]');
    for (let index = 0; index < anchors.length; index += 1) {
        const href = String(anchors[index].href || '').trim();
        if (!href) {
            continue;
        }
        if (/\/groups\/[^/]+\/user\//i.test(href)) {
            return href;
        }
    }

    for (let index = 0; index < anchors.length; index += 1) {
        const href = String(anchors[index].href || '').trim();
        if (href && href.indexOf('facebook.com') !== -1) {
            return href;
        }
    }

    return '';
}

function normalizeFacebookUrlForPrompt(value) {
    try {
        const parsed = new URL(String(value || ''), location.href);
        parsed.hash = '';
        ['__cft__', '__tn__', 'ref', 'refid', 'comment_id', 'notif_id'].forEach(function (key) {
            parsed.searchParams.delete(key);
        });
        return parsed.toString();
    } catch (error) {
        return String(value || '').trim();
    }
}

function extractFacebookUserIdFromUrl(value) {
    const url = String(value || '').trim();
    if (!url) {
        return '';
    }

    try {
        const parsed = new URL(url, location.href);
        const profileId = parsed.searchParams.get('id');
        if (profileId && /^\d{3,}$/.test(profileId)) {
            return profileId;
        }
        const path = parsed.pathname || '';
        const groupUserMatch = path.match(/\/groups\/[^/]+\/user\/(\d{3,})/i);
        if (groupUserMatch) {
            return groupUserMatch[1];
        }
        const peopleMatch = path.match(/\/people\/[^/]+\/(\d{3,})/i);
        if (peopleMatch) {
            return peopleMatch[1];
        }
    } catch (error) {
    }

    const fallbackMatch = url.match(/(?:user\/|profile\.php\?id=|\/people\/[^/]+\/)(\d{3,})/i);
    return fallbackMatch ? fallbackMatch[1] : '';
}

function buildParticipantRequestSummary(card) {
    const lines = extractParticipantRequestVisibleLines(card);
    const questionLines = lines.filter(function (line) {
        return /\?$/.test(line) || /frågan är|godkänner du|är du /i.test(line);
    });
    const groupLines = lines.filter(function (line) {
        return /(gemensam grupp|gemensamma grupper|andra grupper|grupper|common group|common groups|other groups|friends?|vänner)/i.test(line);
    });
    const hasPreviewLink = !!Array.from(card.querySelectorAll('a, button')).find(function (node) {
        return /(förhandsgranska|preview)/i.test(normalizeWhitespace(node.textContent || node.innerText || ''));
    });

    return {
        name: extractParticipantRequestName(card),
        profileUrl: normalizeFacebookUrlForPrompt(extractParticipantRequestProfileUrl(card)),
        profileUserId: extractFacebookUserIdFromUrl(extractParticipantRequestProfileUrl(card)),
        lines: lines,
        questionCount: questionLines.length,
        groupCount: groupLines.length,
        hasPreviewLink: hasPreviewLink,
        hasOverflowButton: !!extractParticipantRequestOverflowButton(card),
    };
}

function extractParticipantRequestQuestionLines(lines) {
    return (lines || []).filter(function (line) {
        return /\?$/.test(line) || /frågan är|godkänner du|är du /i.test(line);
    });
}

function extractParticipantRequestQuestionStateLines(lines) {
    return (lines || []).filter(function (line) {
        return /(har inte besvarat frågorna ännu|has not answered|hasn't answered|väntar på svar|waiting for answer|inget svar|no answer)/i.test(line);
    });
}

function extractParticipantRequestGroupLines(lines) {
    return (lines || []).filter(function (line) {
        return /(gemensam grupp|gemensamma grupper|andra grupper|\d+\s+grupper|\d+\s+groups|\d+\s+vänner|\d+\s+friends)/i.test(line);
    });
}

function extractParticipantRequestProfileSignalLines(lines) {
    return (lines || []).filter(function (line) {
        return /(gick med i facebook|joined facebook|bor i|lives in|har gått på|studied at|har jobbat på|jobbar på|works at|besökare|visitor|medlem|member|förfrågan inkom|request came in)/i.test(line);
    });
}

function extractParticipantRequestCommentLines(lines) {
    return (lines || []).filter(function (line) {
        return /(har skickat en kommentar|sent a comment|förhandsgranska|preview)/i.test(line);
    });
}

function extractParticipantRequestQuestionAnswerPairs(lines) {
    const pairs = [];
    let current = null;
    (lines || []).forEach(function (line) {
        const normalized = normalizeWhitespace(line);
        if (!normalized) {
            return;
        }
        const looksLikeQuestion = /\?$/.test(normalized) || /frågan är|godkänner du|är du |question|group rules/i.test(normalized);
        const looksLikeProfileMeta = /(gick med i facebook|joined facebook|bor i|lives in|har gått på|studied at|jobbar på|works at|grupper gemensamt|common groups|andra grupper|other groups|har skickat en kommentar|sent a comment|förhandsgranska|preview)/i.test(normalized);
        if (looksLikeQuestion) {
            current = {question: normalized, answers: []};
            pairs.push(current);
            return;
        }
        if (current && !looksLikeProfileMeta && !/^(godkänn|approve|avvisa|reject|decline|user|analyze user)$/i.test(normalized)) {
            current.answers.push(normalized);
        }
    });

    return pairs.filter(function (pair) {
        return pair.question || pair.answers.length;
    });
}

function collectParticipantRequestOpenedContextLines(card, summary) {
    const sourceNodes = Array.from(document.querySelectorAll('[role="dialog"], [aria-modal="true"], [role="article"], div'));
    const activeSummary = summary || (card && document.contains(card) ? buildParticipantRequestSummary(card) : (activeParticipantUserAnalysis ? activeParticipantUserAnalysis.summary : null));
    const matchedDialog = findParticipantPreviewDialog(activeSummary);
    const cardText = normalizeWhitespace(card && document.contains(card)
        ? (card.innerText || card.textContent || '')
        : getParticipantSummaryLines(activeSummary).join(' | '));
    const found = [];
    const seen = new Set();

    if (matchedDialog && matchedDialog.lines.length) {
        matchedDialog.lines.slice(0, 10).forEach(function (line, index) {
            const decoratedLine = index === 0 && !isParticipantPreviewDialogText(line)
                ? 'Matched preview dialog: ' + line
                : line;
            const normalized = normalizeWhitespace(decoratedLine);
            if (!normalized || seen.has(normalized)) {
                return;
            }
            seen.add(normalized);
            found.push(clipText(normalized, 900));
        });
    }

    sourceNodes.forEach(function (node) {
        if (!node || !node.getBoundingClientRect || (card && card.contains(node)) || (node.closest && node.closest('#sgpt-factbox, #sgpt-participant-requests-control, [data-sgpt-participant-badge="true"]'))) {
            return;
        }
        if (matchedDialog && (node === matchedDialog.element || (matchedDialog.element.contains && matchedDialog.element.contains(node)))) {
            return;
        }
        const rect = node.getBoundingClientRect();
        if (rect.width < 80 || rect.height < 24 || rect.bottom < 0 || rect.top > window.innerHeight + 80) {
            return;
        }
        const text = normalizeWhitespace(node.innerText || node.textContent || '');
        if (text.length < 24 || text.length > 2400 || seen.has(text)) {
            return;
        }
        if (cardText && cardText.indexOf(text) !== -1) {
            return;
        }
        if (!/(kommentar|comment|inlägg|post|preview|förhandsgranska|svarade|answered|reply|medlemsfråga|membership question|godkänner du|group rules)/i.test(text)) {
            return;
        }
        const splitLines = splitParticipantContextTextIntoLines(text);
        const focusedLines = collectRelevantParticipantPreviewLines(splitLines, activeSummary, 6);
        const neighborhoodLines = collectParticipantContextNeighborhoodLines(splitLines, activeSummary, 6);
        const mergedLines = focusedLines.concat(neighborhoodLines.filter(function (line) {
            return focusedLines.indexOf(line) === -1;
        }));
        if (!mergedLines.length) {
            return;
        }
        mergedLines.forEach(function (line, index) {
            const decoratedLine = index === 0 && lineMatchesParticipantIdentity(line, activeSummary)
                ? 'Expanded preview/post: ' + line
                : line;
            const normalizedLine = normalizeWhitespace(decoratedLine);
            if (!normalizedLine || seen.has(normalizedLine)) {
                return;
            }
            seen.add(normalizedLine);
            found.push(clipText(normalizedLine, 900));
        });
    });

    return found.slice(0, 12);
}

function normalizeParticipantNetworkEventSnippet(payload) {
    if (!payload || typeof payload !== 'object') {
        return '';
    }

    const parts = [];
    if (Array.isArray(payload.participant_preview_entries) && payload.participant_preview_entries.length) {
        payload.participant_preview_entries.slice(0, 3).forEach(function (entry, index) {
            const summary = normalizeWhitespace((entry && (entry.summary_text || entry.candidate_name || entry.request_name)) || '');
            if (summary) {
                parts.push('participant_preview_' + String(index + 1) + ': ' + clipText(summary, 420));
            }
            if (Array.isArray(entry && entry.normalized_text_lines) && entry.normalized_text_lines.length) {
                parts.push('participant_preview_text_' + String(index + 1) + ': ' + clipText(entry.normalized_text_lines[0], 420));
            }
            if (Array.isArray(entry && entry.author_names) && entry.author_names.length) {
                parts.push('participant_preview_author_' + String(index + 1) + ': ' + clipText(entry.author_names.join(' | '), 220));
            }
        });
    }
    ['friendly_name', 'doc_id', 'pathname', 'request_preview', 'response_preview'].forEach(function (key) {
        const value = normalizeWhitespace(payload[key] || '');
        if (value) {
            parts.push(key + ': ' + clipText(value, key === 'response_preview' ? 700 : 260));
        }
    });
    if (Array.isArray(payload.detected_comment_entries) && payload.detected_comment_entries.length) {
        payload.detected_comment_entries.slice(0, 4).forEach(function (entry, index) {
            const text = normalizeWhitespace((entry && (entry.text || entry.message || entry.comment_text || entry.body || entry.summary)) || '');
            if (text) {
                parts.push('detected_comment_' + String(index + 1) + ': ' + clipText(text, 500));
            }
        });
    }

    const snippet = normalizeWhitespace(parts.join(' | '));
    if (!snippet || !/(participant|member|membership|comment|kommentar|post|inlägg|group|groups|profile|user|question|preview|förhandsgranska)/i.test(snippet)) {
        return '';
    }

    return snippet;
}

function buildParticipantPreviewEntrySignature(entry) {
    if (!entry || typeof entry !== 'object') {
        return '';
    }

    return normalizeWhitespace([
        entry.candidate_name || '',
        entry.request_name || '',
        entry.profile_user_id || '',
        entry.profile_url || '',
        entry.preview_type || '',
        entry.group_id || '',
        entry.summary_text || '',
        Array.isArray(entry.comment_lines) ? entry.comment_lines.join(' | ') : '',
        Array.isArray(entry.post_lines) ? entry.post_lines.join(' | ') : '',
        Array.isArray(entry.normalized_text_lines) ? entry.normalized_text_lines.join(' | ') : '',
        Array.isArray(entry.author_names) ? entry.author_names.join(' | ') : '',
    ].join(' | '));
}

function participantPreviewEntryMatchesActiveCard(entry, summary, card, payload) {
    if (!entry || typeof entry !== 'object') {
        return false;
    }

    const activeSummary = summary || {};
    const activeCard = card || null;
    const activeName = normalizeWhitespace(activeSummary.name || '').toLowerCase();
    const normalizedActiveName = normalizeParticipantIdentityText(activeSummary.name || '');
    const activeProfileUrl = normalizeFacebookUrlForPrompt(activeSummary.profileUrl || '');
    const activeProfileId = normalizeWhitespace(activeSummary.profileUserId || '');
    const requestName = normalizeWhitespace(entry.request_name || '').toLowerCase();
    const candidateName = normalizeWhitespace(entry.candidate_name || '').toLowerCase();
    const normalizedRequestName = normalizeParticipantIdentityText(entry.request_name || '');
    const normalizedCandidateName = normalizeParticipantIdentityText(entry.candidate_name || '');
    const entryProfileUrl = normalizeFacebookUrlForPrompt(entry.profile_url || '');
    const entryProfileId = normalizeWhitespace(entry.profile_user_id || '');
    const summaryText = normalizeWhitespace(entry.summary_text || '').toLowerCase();
    const requestPreview = normalizeWhitespace(payload && payload.request_preview ? payload.request_preview : '').toLowerCase();
    const cardText = normalizeWhitespace(activeCard ? (activeCard.innerText || activeCard.textContent || '') : '').toLowerCase();
    const dialogMatch = findParticipantPreviewDialog(activeSummary);
    const dialogText = normalizeWhitespace(dialogMatch && dialogMatch.text ? dialogMatch.text : '').toLowerCase();
    const normalizedDialogText = normalizeParticipantIdentityText(dialogText);
    const referenceText = buildParticipantAnalysisReferenceText(activeSummary, activeCard);
    const normalizedReferenceText = normalizeParticipantIdentityText(referenceText);

    if (activeProfileId && entryProfileId && activeProfileId === entryProfileId) {
        return true;
    }

    if (activeProfileUrl && entryProfileUrl && (activeProfileUrl === entryProfileUrl || activeProfileUrl.indexOf(entryProfileUrl) !== -1 || entryProfileUrl.indexOf(activeProfileUrl) !== -1)) {
        return true;
    }

    if (activeName && (candidateName === activeName || requestName === activeName)) {
        return true;
    }

    if (normalizedActiveName && (normalizedCandidateName === normalizedActiveName || normalizedRequestName === normalizedActiveName)) {
        return true;
    }

    if (activeName && (summaryText.indexOf(activeName) !== -1 || requestPreview.indexOf(activeName) !== -1 || cardText.indexOf(candidateName || requestName) !== -1)) {
        return true;
    }

    if (normalizedActiveName && (normalizedDialogText.indexOf(normalizedActiveName) !== -1 || normalizedReferenceText.indexOf(normalizedActiveName) !== -1)) {
        return true;
    }

    const normalizedEntryLead = normalizedCandidateName || normalizedRequestName;
    if (normalizedEntryLead && (normalizedDialogText.indexOf(normalizedEntryLead) !== -1 || normalizedReferenceText.indexOf(normalizedEntryLead) !== -1)) {
        return true;
    }

    if (!activeName && !activeProfileId && !activeProfileUrl && (!Array.isArray(payload && payload.participant_preview_entries) || payload.participant_preview_entries.length === 1)) {
        return true;
    }

    return false;
}

function rememberParticipantUserAnalysisPreviewEntries(payload) {
    const activeSurface = getActiveParticipantUserAnalysisSurface();
    if (!activeParticipantUserAnalysis || !activeSurface) {
        return false;
    }

    const entries = Array.isArray(payload && payload.participant_preview_entries) ? payload.participant_preview_entries : [];
    if (!entries.length) {
        return false;
    }

    if (!activeParticipantUserAnalysis.previewEntries) {
        activeParticipantUserAnalysis.previewEntries = [];
    }

    const relevantEntries = entries.filter(function (entry) {
        return participantPreviewEntryMatchesActiveCard(entry, activeParticipantUserAnalysis.summary, activeParticipantUserAnalysis.card, payload);
    });
    let changed = false;

    relevantEntries.forEach(function (entry) {
        const signature = buildParticipantPreviewEntrySignature(entry);
        if (!signature) {
            return;
        }
        const alreadyExists = activeParticipantUserAnalysis.previewEntries.some(function (existing) {
            return existing && existing.signature === signature;
        });
        if (alreadyExists) {
            return;
        }
        activeParticipantUserAnalysis.previewEntries.push(Object.assign({
            signature: signature,
        }, entry));
        changed = true;
    });

    if (changed) {
        activeParticipantUserAnalysis.previewEntries = activeParticipantUserAnalysis.previewEntries.slice(-4);
        updateFactResultLoadingProgress(3, 'Facebook preview GraphQL captured…');
        markParticipantUserAnalysisContextChanged('graphql-preview');
    }

    return changed;
}

function rememberParticipantUserAnalysisNetworkEvent(payload) {
    const activeSurface = getActiveParticipantUserAnalysisSurface();
    if (!activeParticipantUserAnalysis || !activeSurface) {
        return;
    }

    rememberParticipantUserAnalysisPreviewEntries(payload);

    const snippet = normalizeParticipantNetworkEventSnippet(payload);
    if (!snippet) {
        return;
    }

    const candidateName = normalizeWhitespace((activeParticipantUserAnalysis.summary && activeParticipantUserAnalysis.summary.name) || '');
    const currentText = buildParticipantAnalysisReferenceText(activeParticipantUserAnalysis.summary || null, activeParticipantUserAnalysis.card || null);
    if (candidateName && snippet.toLowerCase().indexOf(candidateName.toLowerCase()) === -1 && currentText && !currentText.split(' ').slice(0, 8).some(function (token) {
        return token.length > 4 && snippet.toLowerCase().indexOf(token.toLowerCase()) !== -1;
    })) {
        // Keep generic comment/post events, but avoid unrelated heavy Facebook traffic when it clearly does not mention this card.
        if (!/(comment|kommentar|post|inlägg|preview|förhandsgranska|membership|question)/i.test(snippet)) {
            return;
        }
    }

    if (!activeParticipantUserAnalysis.networkEvents) {
        activeParticipantUserAnalysis.networkEvents = [];
    }
    if (activeParticipantUserAnalysis.networkEvents.indexOf(snippet) === -1) {
        activeParticipantUserAnalysis.networkEvents.push(snippet);
        activeParticipantUserAnalysis.networkEvents = activeParticipantUserAnalysis.networkEvents.slice(-8);
        updateFactResultLoadingProgress(3, 'Including fresh Facebook preview signals…');
        markParticipantUserAnalysisContextChanged('network');
    }
}

function buildParticipantRequestContext(card, options) {
    const settings = options || {};
    const liveCard = card && document.contains(card) ? card : null;
    const summary = liveCard ? buildParticipantRequestSummary(liveCard) : (settings.summary || (activeParticipantUserAnalysis && activeParticipantUserAnalysis.summary ? activeParticipantUserAnalysis.summary : {
        name: '',
        profileUrl: '',
        profileUserId: '',
        lines: [],
        questionCount: 0,
        groupCount: 0,
        hasPreviewLink: false,
        hasOverflowButton: false,
    }));
    const questionLines = extractParticipantRequestQuestionLines(summary.lines);
    const questionStateLines = extractParticipantRequestQuestionStateLines(summary.lines);
    const groupLines = extractParticipantRequestGroupLines(summary.lines);
    const profileSignalLines = extractParticipantRequestProfileSignalLines(summary.lines);
    const commentLines = extractParticipantRequestCommentLines(summary.lines);
    const questionAnswerPairs = extractParticipantRequestQuestionAnswerPairs(summary.lines);
    const openedContextLines = settings.openedContextLines || collectParticipantRequestOpenedContextLines(liveCard, summary);
    const useActiveAnalysisState = !liveCard || (activeParticipantUserAnalysis && activeParticipantUserAnalysis.card === liveCard);
    const networkEvents = settings.networkEvents || (useActiveAnalysisState && activeParticipantUserAnalysis ? activeParticipantUserAnalysis.networkEvents || [] : []);
    const previewEntries = settings.previewEntries || (useActiveAnalysisState && activeParticipantUserAnalysis ? activeParticipantUserAnalysis.previewEntries || [] : []);
    const dialogContext = settings.dialogContext || extractParticipantPreviewDialogContext(summary);
    const previewOnly = !!settings.previewOnly && !!dialogContext;
    const participantCommentFocusLines = collectParticipantCommentFocusLines(summary, dialogContext, previewEntries, openedContextLines);
    const participantHistory = getParticipantHistoryForSummary(summary);
    const payload = [
        'Facebook participant-request user analysis context',
        'Facebook page URL: ' + location.href,
        summary.name ? 'Candidate name: ' + summary.name : '',
        summary.profileUrl ? 'Profile URL: ' + summary.profileUrl : '',
        summary.profileUserId ? 'Facebook user id: ' + summary.profileUserId : '',
        'Preview/comment link visible: ' + (summary.hasPreviewLink ? 'yes' : 'no'),
        'Visible questions detected: ' + String(questionLines.length),
        'Visible group/friend clues detected: ' + String(groupLines.length),
        '',
    ];

    if (previewOnly) {
        payload.push('IMPORTANT: This run is preview-first. Treat the opened Facebook preview dialog as the primary text source, and only use surrounding card/profile metadata as secondary context. Do not assume hidden card answers or comment text belong to the preview unless they are also visible in the opened preview or GraphQL preview payload.');
    } else {
        payload.push('IMPORTANT: The visible participant-request card text below is already included as primary analysis context. Do not ask the operator to provide the card text again unless it is missing or ambiguous.');
    }
    payload.push('');

    if (participantScannerGroupContext) {
        payload.push('Operator-provided group/user-verifier rules and background:');
        payload.push(clipText(participantScannerGroupContext, 4000));
        payload.push('');
    }

    if (participantHistory && participantHistory.summary_text) {
        payload.push('Earlier moderation history from Tools for matching participant name/profile clues:');
        payload.push('- ' + clipText(participantHistory.summary_text, 1200));
        payload.push('');
    }

    if (participantCommentFocusLines.length) {
        payload.push('Participant-focused comment/preview clues to weigh against the group info/rules/context:');
        participantCommentFocusLines.slice(0, 10).forEach(function (line) {
            payload.push('- ' + line);
        });
        payload.push('');
    }

    if (groupLines.length) {
        payload.push('Visible group/friend clues:');
        groupLines.slice(0, 12).forEach(function (line) {
            payload.push('- ' + line);
        });
        payload.push('');
    }

    if (profileSignalLines.length) {
        payload.push('Visible profile/background clues:');
        profileSignalLines.slice(0, 12).forEach(function (line) {
            payload.push('- ' + line);
        });
        payload.push('');
    }

    if (questionLines.length) {
        payload.push('Visible membership questions/prompts:');
        questionLines.slice(0, 12).forEach(function (line) {
            payload.push('- ' + line);
        });
        payload.push('');
    }

    if (questionAnswerPairs.length && !previewOnly) {
        payload.push('Visible membership question/answer pairs from the card:');
        questionAnswerPairs.slice(0, 10).forEach(function (pair) {
            payload.push('- Question: ' + pair.question);
            if (pair.answers && pair.answers.length) {
                payload.push('  Answer: ' + pair.answers.slice(0, 4).join(' / '));
            } else {
                payload.push('  Answer: not visibly answered');
            }
        });
        payload.push('');
    }

    if (questionStateLines.length) {
        payload.push('Visible question/answer status:');
        questionStateLines.slice(0, 12).forEach(function (line) {
            payload.push('- ' + line);
        });
        payload.push('');
    }

    if (commentLines.length && !previewOnly) {
        payload.push('Visible comment/preview clues:');
        commentLines.slice(0, 12).forEach(function (line) {
            payload.push('- ' + line);
        });
        payload.push('');
    }

    if (dialogContext && dialogContext.commentLines && dialogContext.commentLines.length) {
        payload.push('Opened preview dialog text:');
        dialogContext.commentLines.slice(0, 8).forEach(function (line) {
            payload.push('- ' + line);
        });
        if (dialogContext.originalPostLinks && dialogContext.originalPostLinks.length) {
            dialogContext.originalPostLinks.slice(0, 2).forEach(function (link) {
                payload.push('- Original post: ' + link);
            });
        }
        payload.push('');
    }

    if (openedContextLines.length) {
        payload.push('Opened/loaded Facebook comment or post preview context:');
        openedContextLines.slice(0, 8).forEach(function (line) {
            payload.push('- ' + line);
        });
        payload.push('');
    }

    if (previewEntries.length) {
        payload.push('Structured Facebook GraphQL participant preview data loaded after focusing this card:');
        previewEntries.slice(-4).forEach(function (entry) {
            const heading = [
                entry.candidate_name || entry.request_name || 'Participant preview',
                entry.preview_type ? '(' + entry.preview_type + ')' : '',
            ].filter(Boolean).join(' ');
            payload.push('- ' + heading);
            if (entry.group_id) {
                payload.push('  Group id: ' + entry.group_id);
            }
            if (entry.feed_location || entry.render_location) {
                payload.push('  Source metadata: ' + [entry.feed_location ? 'feed=' + entry.feed_location : '', entry.render_location ? 'render=' + entry.render_location : ''].filter(Boolean).join(' · '));
            }
            if (entry.profile_url) {
                payload.push('  Profile URL: ' + entry.profile_url);
            }
            if (entry.profile_user_id) {
                payload.push('  Facebook user id: ' + entry.profile_user_id);
            }
            if (Array.isArray(entry.author_names) && entry.author_names.length) {
                payload.push('  Authors: ' + entry.author_names.slice(0, 4).join(' | '));
            }
            if (Array.isArray(entry.created_times) && entry.created_times.length) {
                payload.push('  Created times: ' + entry.created_times.slice(0, 4).join(' | '));
            }
            if (Array.isArray(entry.comment_lines) && entry.comment_lines.length) {
                payload.push('  Comment preview: ' + entry.comment_lines.slice(0, 4).join(' | '));
            }
            if (Array.isArray(entry.post_lines) && entry.post_lines.length) {
                payload.push('  Post preview: ' + entry.post_lines.slice(0, 4).join(' | '));
            }
            if (Array.isArray(entry.normalized_text_lines) && entry.normalized_text_lines.length) {
                payload.push('  Normalized preview text: ' + entry.normalized_text_lines.slice(0, 6).join(' | '));
            }
            if (Array.isArray(entry.additional_lines) && entry.additional_lines.length) {
                payload.push('  Additional GraphQL clues: ' + entry.additional_lines.slice(0, 4).join(' | '));
            }
            if (Array.isArray(entry.comment_urls) && entry.comment_urls.length) {
                payload.push('  Comment URLs: ' + entry.comment_urls.slice(0, 3).join(' | '));
            }
            if (Array.isArray(entry.feedback_urls) && entry.feedback_urls.length) {
                payload.push('  Feedback URLs: ' + entry.feedback_urls.slice(0, 3).join(' | '));
            }
            if (Array.isArray(entry.original_post_links) && entry.original_post_links.length) {
                payload.push('  Original post links: ' + entry.original_post_links.slice(0, 3).join(' | '));
            }
            if (Array.isArray(entry.decoded_ids) && entry.decoded_ids.length) {
                payload.push('  Decoded GraphQL ids: ' + entry.decoded_ids.slice(0, 3).join(' | '));
            }
        });
        payload.push('');
    }

    if (networkEvents.length) {
        payload.push('Recent Facebook Graph/XHR snippets observed after focusing this card:');
        networkEvents.slice(-8).forEach(function (line) {
            payload.push('- ' + line);
        });
        payload.push('');
    }

    if (!previewOnly) {
        payload.push(
            'Visible card lines:',
        );

        summary.lines.slice(0, 40).forEach(function (line) {
            payload.push('- ' + line);
        });

        payload.push('');
    }
    payload.push('Instruction: Analyze this participant request as a user-analysis helper. First summarize who the user seems to be from the visible card, then list visible group/friend clues, visible question prompts, whether the questions look unanswered, and any comment/preview signal that may need follow-up. When participant-focused comment/preview clues are present, give the participant\'s own visible comment(s) extra analytical weight and explicitly compare them against the group info/rules/context before concluding. Highlight contradictions, risk signals, useful positive signals, and exactly what should still be checked before approval. When a profile URL or numeric Facebook user id is present, use it as specific lookup context for independent web-search verification where available. Treat the visible Facebook UI text as observational context, not independently verified fact.');

    return payload.filter(Boolean).join('\n');
}

function participantAnalysisContextSignature(card) {
    return normalizeWhitespace(buildParticipantRequestContext(card, {
        summary: activeParticipantUserAnalysis && activeParticipantUserAnalysis.summary ? activeParticipantUserAnalysis.summary : null,
        networkEvents: activeParticipantUserAnalysis ? activeParticipantUserAnalysis.networkEvents || [] : [],
        previewEntries: activeParticipantUserAnalysis ? activeParticipantUserAnalysis.previewEntries || [] : [],
        openedContextLines: collectParticipantRequestOpenedContextLines(card, activeParticipantUserAnalysis && activeParticipantUserAnalysis.summary ? activeParticipantUserAnalysis.summary : null),
    })).slice(0, 6000);
}

function updateParticipantUserAnalysisNotice() {
    if (!factResultBox || !document.contains(factResultBox) || !activeParticipantUserAnalysis || !activeParticipantUserAnalysis.changed) {
        refreshParticipantAutoSupplementStatus();
        updateParticipantPreviewDebugView();
        return;
    }
    let notice = factResultBox.querySelector('[data-role="participant-context-notice"]');
    if (!notice) {
        notice = document.createElement('div');
        notice.setAttribute('data-role', 'participant-context-notice');
        notice.style.marginTop = '8px';
        notice.style.padding = '7px 9px';
        notice.style.borderRadius = '9px';
        notice.style.background = '#fff7ed';
        notice.style.border = '1px solid #fdba74';
        notice.style.color = '#9a3412';
        notice.style.fontSize = '12px';
        notice.style.fontWeight = '600';
        const actionsRow = factResultBox.querySelector('[data-role="fact-actions"]');
        if (actionsRow && actionsRow.parentElement === factResultBox) {
            factResultBox.insertBefore(notice, actionsRow);
        } else {
            factResultBox.appendChild(notice);
        }
    }
    const debugState = buildParticipantPreviewDebugState();
    const participantName = normalizeWhitespace(activeParticipantUserAnalysis.summary && activeParticipantUserAnalysis.summary.name ? activeParticipantUserAnalysis.summary.name : '');
    notice.textContent = debugState && debugState.hasCapturedLines
        ? ('Nya kommentar-/förhandsgranskningsledtrådar' + (participantName ? ' för ' + participantName : '') + ' hittades. Analysen väger nu kommentaren tydligare mot gruppinfo/regler och kompletteras igen om mer preview/original-post-kontext laddas.')
        : ct('contentScript.participantScannerNewContext', {}, 'New Facebook context was loaded for this participant. Use “Update analysis” to include it.');
    refreshParticipantAutoSupplementStatus();
    updateParticipantPreviewDebugView();
}

function markParticipantUserAnalysisContextChanged(reason) {
    if (!activeParticipantUserAnalysis) {
        return;
    }
    activeParticipantUserAnalysis.changed = true;
    activeParticipantUserAnalysis.changedReason = reason || 'context';
    activeParticipantUserAnalysis.lastContextChangeAt = Date.now();
    updateParticipantUserAnalysisNotice();
    scheduleParticipantAnalysisAutoSupplement(reason || 'context');
}

function scheduleParticipantUserAnalysisContextCheck() {
    if (!activeParticipantUserAnalysis) {
        return;
    }
    if (participantAnalysisMutationTimerId) {
        window.clearTimeout(participantAnalysisMutationTimerId);
    }
    participantAnalysisMutationTimerId = window.setTimeout(function () {
        participantAnalysisMutationTimerId = null;
        if (!activeParticipantUserAnalysis) {
            return;
        }
        const nextSignature = participantAnalysisContextSignature(activeParticipantUserAnalysis.card);
        if (nextSignature && nextSignature !== activeParticipantUserAnalysis.contextSignature) {
            activeParticipantUserAnalysis.contextSignature = nextSignature;
            markParticipantUserAnalysisContextChanged('dom');
        }
    }, 500);
}

function activateParticipantUserAnalysisContextWatcher(card, reason, options) {
    const settings = options || {};
    const liveCard = card && document.contains(card) ? card : null;
    const summary = settings.summary || (liveCard ? buildParticipantRequestSummary(liveCard) : participantRequestsLastSelectedSummary);
    if (!liveCard && !summary) {
        return;
    }
    clearParticipantAnalysisAutoSupplementTimer();
    clearParticipantAnalysisAutoSupplementStatusTimer();
    setParticipantAutoSupplementStatus('', false);
    if (activeParticipantUserAnalysis && activeParticipantUserAnalysis.observer) {
        activeParticipantUserAnalysis.observer.disconnect();
    }
    activeParticipantUserAnalysis = {
        card: liveCard,
        summary: summary,
        contextSignature: '',
        networkEvents: [],
        previewEntries: [],
        previewDialogState: shouldReuseTrackedParticipantPreviewState(summary) ? getTrackedParticipantPreviewDialogState() : null,
        previewOnly: !!settings.previewOnly,
        changed: false,
        changedReason: reason || 'focus',
        lastContextChangeAt: 0,
        lastAutoSupplementQueuedAt: 0,
        lastAutoSupplementStartedAt: 0,
        lastAutoSupplementCompletedAt: 0,
        autoSupplementQueued: false,
        autoSupplementInFlight: false,
        autoSupplementContextSignature: '',
        observer: null,
    };
    activeParticipantUserAnalysis.contextSignature = participantAnalysisContextSignature(liveCard);
    if (typeof MutationObserver !== 'undefined') {
        activeParticipantUserAnalysis.observer = new MutationObserver(function () {
            scheduleParticipantUserAnalysisContextCheck();
        });
        activeParticipantUserAnalysis.observer.observe(document.body || liveCard || document.documentElement, {
            childList: true,
            subtree: true,
            characterData: true,
        });
    }
    injectNetworkMonitor();
}

function buildUpdatedParticipantUserAnalysisContext(card) {
    const context = buildParticipantRequestContext(card, {
        summary: activeParticipantUserAnalysis && activeParticipantUserAnalysis.summary ? activeParticipantUserAnalysis.summary : null,
        openedContextLines: collectParticipantRequestOpenedContextLines(card, activeParticipantUserAnalysis && activeParticipantUserAnalysis.summary ? activeParticipantUserAnalysis.summary : null),
        networkEvents: activeParticipantUserAnalysis ? activeParticipantUserAnalysis.networkEvents || [] : [],
        previewEntries: activeParticipantUserAnalysis ? activeParticipantUserAnalysis.previewEntries || [] : [],
        previewOnly: !!(activeParticipantUserAnalysis && activeParticipantUserAnalysis.previewOnly),
    });
    if (activeParticipantUserAnalysis) {
        const liveCard = card && document.contains(card)
            ? card
            : (activeParticipantUserAnalysis.card && document.contains(activeParticipantUserAnalysis.card) ? activeParticipantUserAnalysis.card : null);
        if (liveCard) {
            activeParticipantUserAnalysis.summary = buildParticipantRequestSummary(liveCard);
        }
        activeParticipantUserAnalysis.changed = false;
        activeParticipantUserAnalysis.contextSignature = normalizeWhitespace(context).slice(0, 6000);
    }
    return context;
}

function getParticipantAnalysisRequestState() {
    const summary = activeParticipantUserAnalysis && activeParticipantUserAnalysis.summary
        ? activeParticipantUserAnalysis.summary
        : (lastVerificationRequest && lastVerificationRequest.participantAnalysisSummary ? lastVerificationRequest.participantAnalysisSummary : participantRequestsLastSelectedSummary);
    const card = lastVerificationRequest && lastVerificationRequest.participantAnalysisCard
        ? lastVerificationRequest.participantAnalysisCard
        : (activeParticipantUserAnalysis && activeParticipantUserAnalysis.card ? activeParticipantUserAnalysis.card : participantRequestsLastSelectedCard);
    const surface = getActiveParticipantUserAnalysisSurface();

    return {
        card: card && document.contains(card) ? card : null,
        summary: summary,
        anchorElement: surface && surface.element ? surface.element : (card && document.contains(card) ? card : null),
        context: buildUpdatedParticipantUserAnalysisContext(card && document.contains(card) ? card : null),
        previewOnly: !!(activeParticipantUserAnalysis && activeParticipantUserAnalysis.previewOnly),
    };
}

function buildParticipantPreviewRequestExtraData() {
    const previewEntries = activeParticipantUserAnalysis && Array.isArray(activeParticipantUserAnalysis.previewEntries)
        ? activeParticipantUserAnalysis.previewEntries.slice(-3)
        : [];

    return {
        facebook_preview_count: previewEntries.length,
        facebook_preview_dialog_visible: !!extractParticipantPreviewDialogContext(getParticipantReferenceSummary()),
        facebook_preview_entries: previewEntries.map(function (entry) {
            return {
                candidate_name: entry.candidate_name || entry.request_name || '',
                preview_type: entry.preview_type || '',
                group_id: entry.group_id || '',
                profile_url: entry.profile_url || '',
                profile_user_id: entry.profile_user_id || '',
                author_names: Array.isArray(entry.author_names) ? entry.author_names.slice(0, 3) : [],
                created_times: Array.isArray(entry.created_times) ? entry.created_times.slice(0, 4) : [],
                normalized_text_lines: Array.isArray(entry.normalized_text_lines) ? entry.normalized_text_lines.slice(0, 6) : [],
                comment_urls: Array.isArray(entry.comment_urls) ? entry.comment_urls.slice(0, 2) : [],
                feedback_urls: Array.isArray(entry.feedback_urls) ? entry.feedback_urls.slice(0, 2) : [],
                original_post_links: Array.isArray(entry.original_post_links) ? entry.original_post_links.slice(0, 2) : [],
            };
        }),
    };
}

function removeParticipantRequestHelperFromCard(card) {
    if (!card) {
        return;
    }

    const helper = card.querySelector('[data-sgpt-participant-badge="true"]');
    if (helper) {
        helper.remove();
    }

    card.removeAttribute('data-sgpt-participant-card');
}

function focusParticipantRequestCard(card) {
    if (!card || !document.contains(card) || !card.getBoundingClientRect) {
        return;
    }

    rememberParticipantRequestSelection(card, 'focus-card');
    card.scrollIntoView({behavior: 'smooth', block: 'center', inline: 'nearest'});
    card.setAttribute('data-sgpt-participant-focus', '1');
    const previousBoxShadow = card.style.boxShadow || '';
    const previousOutline = card.style.outline || '';
    const previousOutlineOffset = card.style.outlineOffset || '';
    card.style.outline = '3px solid rgba(124,58,237,0.92)';
    card.style.outlineOffset = '6px';
    card.style.boxShadow = '0 0 0 6px rgba(124,58,237,0.16), 0 16px 34px rgba(15,23,42,0.18)';
    window.setTimeout(function () {
        if (!card || !document.contains(card)) {
            return;
        }
        card.removeAttribute('data-sgpt-participant-focus');
        card.style.boxShadow = previousBoxShadow;
        card.style.outline = previousOutline;
        card.style.outlineOffset = previousOutlineOffset;
    }, 2400);
}

function openParticipantRequestToolbox(card, options) {
    const settings = options || {};
    const liveCard = card && document.contains(card) ? card : null;
    const summary = liveCard
        ? rememberParticipantRequestSelection(liveCard, settings.reason || 'toolbox-open')
        : (settings.summary || participantRequestsLastSelectedSummary || getParticipantReferenceSummary());
    if (!liveCard && !summary) {
        return;
    }

    if (liveCard) {
        focusParticipantRequestCard(liveCard);
    }

    activateParticipantUserAnalysisContextWatcher(liveCard, settings.reason || 'toolbox-open', {
        summary: summary,
        previewOnly: !!settings.previewOnly,
    });
    const requestState = getParticipantAnalysisRequestState();
    openReplyPanelWithImportedContext(requestState.context, {
        message: ct('contentScript.participantScannerContextImported', {}, 'User analysis imported into Toolbox.'),
        anchorNode: requestState.anchorElement || liveCard,
    });
}

function verifyParticipantRequestCard(card, options) {
    const settings = options || {};
    const liveCard = card && document.contains(card) ? card : null;
    const summary = liveCard
        ? rememberParticipantRequestSelection(liveCard, settings.reason || 'verify-card')
        : (settings.summary || participantRequestsLastSelectedSummary || getParticipantReferenceSummary());
    if (!liveCard && !summary) {
        return;
    }

    if (liveCard) {
        focusParticipantRequestCard(liveCard);
    }

    activateParticipantUserAnalysisContextWatcher(liveCard, settings.reason || 'verify-card', {
        summary: summary,
        previewOnly: !!settings.previewOnly,
    });
    const requestState = getParticipantAnalysisRequestState();
    startFactVerification(requestState.context, {
        preferPanel: false,
        anchor: createFactAnchorForNode(requestState.anchorElement || liveCard),
        sourceLabel: ct('contentScript.participantScannerVerifySource', {}, 'Participant request verify'),
        sourceUrl: summary.profileUrl || location.href,
        requestMode: 'verify',
        extraData: {
            page_url: location.href,
            page_title: document.title || '',
            source_label: 'Facebook participant request verify',
            facebook_profile_url: summary.profileUrl || '',
            facebook_user_id: summary.profileUserId || '',
            facebook_group_url: location.href,
            facebook_group_context: participantScannerGroupContext || '',
            facebook_preview_reference_name: summary.name || '',
            facebook_preview_reference_lines: getParticipantSummaryLines(summary).slice(0, 12),
            ...buildParticipantPreviewRequestExtraData(),
        },
    });
}

function focusParticipantPreviewElement(summary) {
    const dialogMatch = findParticipantPreviewDialog(summary || getParticipantReferenceSummary());
    if (!dialogMatch || !dialogMatch.element || !document.contains(dialogMatch.element)) {
        return false;
    }

    const element = dialogMatch.element;
    if (element.scrollIntoView) {
        element.scrollIntoView({behavior: 'smooth', block: 'center', inline: 'nearest'});
    }

    const previousBoxShadow = element.style.boxShadow || '';
    const previousOutline = element.style.outline || '';
    const previousOutlineOffset = element.style.outlineOffset || '';
    element.style.outline = '3px solid rgba(2,132,199,0.96)';
    element.style.outlineOffset = '6px';
    element.style.boxShadow = '0 0 0 6px rgba(2,132,199,0.14), 0 18px 38px rgba(15,23,42,0.22)';
    window.setTimeout(function () {
        if (!element || !document.contains(element)) {
            return;
        }
        element.style.boxShadow = previousBoxShadow;
        element.style.outline = previousOutline;
        element.style.outlineOffset = previousOutlineOffset;
    }, 2400);

    if (activeParticipantUserAnalysis) {
        window.setTimeout(function () {
            forceParticipantPreviewContextRefresh('locate-preview-context');
        }, 180);
        window.setTimeout(function () {
            forceParticipantPreviewContextRefresh('locate-preview-context-late');
        }, 900);
    }

    return true;
}

function isDialogLikeAnchorNode(node) {
    if (!node || !node.getBoundingClientRect) {
        return false;
    }

    if (node.getAttribute && (node.getAttribute('role') === 'dialog' || node.getAttribute('aria-modal') === 'true')) {
        return true;
    }

    return !!(node.closest && node.closest('[role="dialog"], [aria-modal="true"]'));
}

function startParticipantUserAnalysis(card, options) {
    const settings = options || {};
    const liveCard = card && document.contains(card) ? card : null;
    const summary = liveCard
        ? rememberParticipantRequestSelection(liveCard, settings.reason || 'analysis-start')
        : (settings.summary || participantRequestsLastSelectedSummary || getParticipantReferenceSummary());
    if (!liveCard && !summary) {
        return;
    }

    if (liveCard) {
        focusParticipantRequestCard(liveCard);
    }
    activateParticipantUserAnalysisContextWatcher(liveCard, settings.reason || 'analysis-start', {
        summary: summary,
        previewOnly: !!settings.previewOnly,
    });
    const requestState = getParticipantAnalysisRequestState();
    const initialContext = requestState.context;
    const anchorElement = settings.anchorElement || requestState.anchorElement || liveCard;
    startFactVerification(initialContext, {
        preferPanel: false,
        anchor: createFactAnchorForNode(anchorElement),
        sourceLabel: ct('contentScript.participantScannerAnalyzeSource', {}, 'Participant user analysis'),
        sourceUrl: summary.profileUrl || location.href,
        verificationInstruction: 'Analyze this Facebook participant request as a user-analysis and moderation helper. The visible card text, membership questions, visible answers, rules acknowledgement, comment/preview clues, the candidate profile URL/user id when present, the operator group context, and any newly opened Facebook preview/comment/post context are already included in the request context. Summarize who the user appears to be from those visible signals, which groups or friend clues are visible, which membership questions are shown, whether they look answered or unanswered, and what comment or preview clues exist. Give the participant\'s own visible comment(s) extra analytical weight, and explicitly compare those comments against the group info/rules/context before concluding. Then list positive signs, risk signs, contradictions, and exactly what should still be checked before approval. Use web search for the specific profile URL/user id/name when available, but treat the visible Facebook UI as observational context, not independently verified fact.',
        requestMode: 'user-analysis',
        extraData: {
            page_url: location.href,
            page_title: document.title || '',
            source_label: 'Facebook participant user analysis',
            facebook_profile_url: summary.profileUrl || '',
            facebook_user_id: summary.profileUserId || '',
            facebook_group_url: location.href,
            facebook_group_context: participantScannerGroupContext || '',
            facebook_preview_source: 'merged_dom_graphql',
            facebook_preview_selection_reason: participantRequestsLastSelectedReason || '',
            facebook_preview_reference_name: summary.name || '',
            participant_analysis_phase: 'initial',
            facebook_preview_reference_lines: getParticipantSummaryLines(summary).slice(0, 12),
            ...buildParticipantPreviewRequestExtraData(),
        },
        pendingTitle: ct('contentScript.participantScannerAnalyzePendingTitle', {}, '⏳ Analyzing user…'),
        pendingSubtitle: ct('contentScript.participantScannerAnalyzePendingSubtitle', {}, 'Result appears here automatically · Mode: user analysis · visible card included'),
        resultTitle: ct('contentScript.participantScannerAnalyzeResultTitle', {}, '👤 User analysis via OpenAI'),
        failedTitle: ct('contentScript.participantScannerAnalyzeFailedTitle', {}, '⚠️ User analysis failed'),
        modeLabel: ct('contentScript.participantScannerAnalyzeMode', {}, 'User analysis'),
        showOpenToolboxAction: false,
        participantAnalysisCard: liveCard,
        participantAnalysisSummary: summary,
        previewLimit: 1200,
        loadingSteps: [
            ct('contentScript.participantScannerStepCard', {}, 'Reading visible request card text…'),
            ct('contentScript.participantScannerStepQuestions', {}, 'Collecting membership questions and visible answers…'),
            ct('contentScript.participantScannerStepPreview', {}, 'Watching for opened comment/post preview context…'),
            ct('contentScript.participantScannerStepGraph', {}, 'Including recent Facebook Graph/XHR snippets when relevant…'),
            ct('contentScript.participantScannerStepAi', {}, 'Asking Tools for user analysis…'),
        ],
    });
}

function updateParticipantRequestsControl() {
    if (!participantRequestsControl) {
        return;
    }

    const state = participantRequestsControl.querySelector('[data-role="state"]');
    const meta = participantRequestsControl.querySelector('[data-role="meta"]');
    const detail = participantRequestsControl.querySelector('[data-role="detail"]');
    const contextList = participantRequestsControl.querySelector('[data-role="context-listbox"]');
    const locatePreviewButton = participantRequestsControl.querySelector('[data-role="locate-preview-context"]');
    const analyzeCurrentButton = participantRequestsControl.querySelector('[data-role="analyze-current-context"]');
    const referenceSummary = getParticipantReferenceSummary();
    const dialogContext = extractParticipantPreviewDialogContext(referenceSummary);
    const previewEntries = activeParticipantUserAnalysis && Array.isArray(activeParticipantUserAnalysis.previewEntries)
        ? activeParticipantUserAnalysis.previewEntries
        : [];
    const contextRows = buildParticipantContextListRows(referenceSummary);
    if (state) {
        state.textContent = participantRequestsLastSummary || (participantScannerFeatureEnabled
            ? ct('contentScript.participantScannerWaiting', {}, 'Participant scanner is active and waiting for visible request cards.')
            : ct('contentScript.participantScannerDisabled', {}, 'Participant scanner is disabled in Tools.'));
    }
    if (meta) {
        meta.textContent = ct('contentScript.participantScannerMeta', {count: participantRequestsEnhancedCardCount}, 'Cards enhanced: {count}').replace('{count}', String(participantRequestsEnhancedCardCount || 0));
    }
    if (detail) {
        const matchedHistoryCount = Object.keys(participantHistoryByCandidateKey || {}).map(function (key) {
            return participantHistoryByCandidateKey[key];
        }).filter(function (entry) {
            return !!(entry && entry.matched);
        }).length;
        const detailParts = [
            'Preview dialog: ' + (dialogContext ? 'yes' : 'no'),
            'GraphQL preview: ' + (previewEntries.length ? 'yes' : 'no'),
        ];
        if (participantHistoryLookupInFlight) {
            detailParts.push('History: looking up…');
        } else if (participantHistoryLookupError) {
            detailParts.push('History: lookup failed');
        } else if (participantHistoryLookupLastFetchedAt > 0) {
            detailParts.push('History matches: ' + String(matchedHistoryCount));
        }
        if (participantHistoryLookupGroupReference) {
            detailParts.push('History group set: ' + participantHistoryLookupGroupReference);
        }
        if (dialogContext && dialogContext.mountRootId) {
            detailParts.push('Preview mount: ' + dialogContext.mountRootId);
        }
        if (referenceSummary && referenceSummary.name) {
            detailParts.push('Current participant: ' + referenceSummary.name);
        }
        detail.textContent = detailParts.join(' · ');
    }
    if (contextList) {
        contextList.innerHTML = contextRows.length
            ? contextRows.map(function (pair) {
                return '<option>' + escapeHtml(pair[0] + ': ' + pair[1]) + '</option>';
            }).join('')
            : '<option>' + escapeHtml(ct('contentScript.participantScannerContextWaiting', {}, 'Detected context will appear here when cards, dialog, or GraphQL preview clues are found.')) + '</option>';
    }
    if (locatePreviewButton) {
        locatePreviewButton.disabled = !dialogContext;
        locatePreviewButton.style.opacity = locatePreviewButton.disabled ? '0.55' : '1';
        locatePreviewButton.style.cursor = locatePreviewButton.disabled ? 'default' : 'pointer';
    }
    if (analyzeCurrentButton) {
        analyzeCurrentButton.disabled = !(referenceSummary || dialogContext || previewEntries.length);
        analyzeCurrentButton.style.opacity = analyzeCurrentButton.disabled ? '0.55' : '1';
        analyzeCurrentButton.style.cursor = analyzeCurrentButton.disabled ? 'default' : 'pointer';
    }

    const cardList = participantRequestsControl.querySelector('[data-role="card-list"]');
    if (cardList) {
        const visibleCards = participantRequestsVisibleCards.slice(0, 5);
        if (!visibleCards.length) {
            const activePreviewSurface = describeActiveParticipantPreviewSurface();
            cardList.innerHTML = '<div style="margin-top:8px; color:#64748b; line-height:1.45;">'
                + escapeHtml(activePreviewSurface || ct('contentScript.participantScannerNoCards', {}, 'No visible participant-request cards matched yet.'))
                + '</div>';
        } else {
            cardList.innerHTML = visibleCards.map(function (card, index) {
                const summary = buildParticipantRequestSummary(card);
                const title = summary.name || ct('contentScript.participantScannerUnknownCandidate', {}, 'Visible candidate detected');
                const description = ct('contentScript.participantScannerCardMeta', {index: index + 1, questions: summary.questionCount || 0, groups: summary.groupCount || 0}, 'Card {index} · Questions: {questions} · Groups: {groups}')
                    .replace('{index}', String(index + 1))
                    .replace('{questions}', String(summary.questionCount || 0))
                    .replace('{groups}', String(summary.groupCount || 0));

                return [
                    '<div style="margin-top:8px; padding:8px; border-radius:10px; border:1px solid rgba(124,58,237,0.16); background:rgba(248,250,252,0.92);">',
                    '<div style="font-weight:600; color:#312e81;">' + escapeHtml(title) + '</div>',
                    '<div style="margin-top:2px; color:#64748b; line-height:1.4;">' + escapeHtml(description) + '</div>',
                    '<div style="margin-top:8px; display:flex; gap:6px; flex-wrap:wrap;">',
                    '<button type="button" data-role="locate-card" data-card-index="' + String(index) + '" style="border:none; border-radius:999px; padding:5px 9px; background:#475569; color:#fff; cursor:pointer;">' + escapeHtml(ct('contentScript.participantScannerLocate', {}, 'Show card')) + '</button>',
                    '<button type="button" data-role="analyze-card" data-card-index="' + String(index) + '" style="border:none; border-radius:999px; padding:5px 9px; background:#0284c7; color:#fff; cursor:pointer;">' + escapeHtml(ct('contentScript.participantScannerAnalyze', {}, 'Analyze user')) + '</button>',
                    '<button type="button" data-role="open-card-toolbox" data-card-index="' + String(index) + '" style="border:none; border-radius:999px; padding:5px 9px; background:#0f766e; color:#fff; cursor:pointer;">' + escapeHtml(ct('contentScript.openToolbox', {}, 'Open Toolbox')) + '</button>',
                    '<button type="button" data-role="verify-card" data-card-index="' + String(index) + '" style="border:none; border-radius:999px; padding:5px 9px; background:#7c3aed; color:#fff; cursor:pointer;">' + escapeHtml(ct('contentScript.verifyFact', {}, 'Verify fact')) + '</button>',
                    '</div>',
                    '</div>'
                ].join('');
            }).join('');
        }
    }
}

function ensureParticipantRequestsControl() {
    if (!isFacebookParticipantRequestsPage() || !participantScannerFeatureEnabled) {
        if (participantRequestsControl) {
            participantRequestsControl.remove();
            participantRequestsControl = null;
        }
        return null;
    }

    if (participantRequestsControl) {
        updateParticipantRequestsControl();
        return participantRequestsControl;
    }

    const control = document.createElement('div');
    if (!isStylableDomElement(control)) {
        return null;
    }
    control.id = 'sgpt-participant-requests-control';
    control.style.position = 'fixed';
    control.style.top = '16px';
    control.style.right = '16px';
    control.style.bottom = 'auto';
    control.style.zIndex = '2147483645';
    control.style.width = '280px';
    control.style.padding = '10px';
    control.style.borderRadius = '10px';
    control.style.border = '1px solid rgba(124,58,237,0.22)';
    control.style.background = 'rgba(255,255,255,0.97)';
    control.style.boxShadow = '0 8px 24px rgba(15,23,42,0.16)';
    control.style.fontFamily = 'system-ui,sans-serif';
    control.style.fontSize = '12px';
    control.innerHTML = [
        '<div data-role="drag-handle" style="display:flex; align-items:center; justify-content:space-between; gap:8px; font-weight:700; color:#5b21b6; cursor:move; user-select:none;">'
            + '<span>' + escapeHtml(ct('contentScript.participantScannerTitle', {}, 'Participant helper')) + '</span>'
            + '<span style="display:inline-flex; align-items:center; gap:6px;">'
            + '<button type="button" data-role="dock-toggle" style="border:none; background:transparent; color:#7c3aed; cursor:pointer; font-size:13px; padding:0; line-height:1;">↗</button>'
            + '<span style="font-size:11px; color:#7c3aed;">⇕</span>'
            + '</span>'
            + '</div>',
        '<div data-role="state" style="margin-top:6px; color:#334155; line-height:1.45;">' + escapeHtml(ct('contentScript.participantScannerWaiting', {}, 'Participant scanner is active and waiting for visible request cards.')) + '</div>',
        '<div data-role="meta" style="margin-top:6px; color:#64748b;">Cards enhanced: 0</div>',
        '<div data-role="detail" style="margin-top:4px; color:#64748b; line-height:1.4;">Preview dialog: no · GraphQL preview: no</div>',
        '<div style="margin-top:8px; display:flex; gap:6px; flex-wrap:wrap;">'
            + '<button type="button" data-role="open-config" style="border:none; border-radius:999px; padding:5px 9px; background:#ede9fe; color:#5b21b6; cursor:pointer; font-weight:700;">' + escapeHtml(ct('contentScript.participantScannerConfigOpenInline', {}, 'Rules / group info')) + '</button>'
            + '<button type="button" data-role="locate-preview-context" style="border:none; border-radius:999px; padding:5px 9px; background:#e0f2fe; color:#075985; cursor:pointer; font-weight:700;">' + escapeHtml(ct('contentScript.participantScannerLocatePreview', {}, 'Find preview element')) + '</button>'
            + '<button type="button" data-role="analyze-current-context" style="border:none; border-radius:999px; padding:5px 9px; background:#0284c7; color:#fff; cursor:pointer; font-weight:700;">' + escapeHtml(ct('contentScript.participantScannerAnalyzeCurrent', {}, 'Analyze current preview')) + '</button>'
            + '</div>',
        '<div style="margin-top:8px; font-weight:700; color:#312e81;">' + escapeHtml(ct('contentScript.participantScannerContextTitle', {}, 'Detected context')) + '</div>',
        '<select data-role="context-listbox" size="7" style="margin-top:6px; width:100%; border:1px solid rgba(196,181,253,0.85); border-radius:10px; background:#faf5ff; color:#312e81; padding:6px; box-sizing:border-box; font-size:12px;"><option>' + escapeHtml(ct('contentScript.participantScannerContextWaiting', {}, 'Detected context will appear here when cards, dialog, or GraphQL preview clues are found.')) + '</option></select>',
        '<div data-role="card-list"></div>'
    ].join('');

    control.addEventListener('click', function (event) {
        const dockToggle = event.target && event.target.closest ? event.target.closest('[data-role="dock-toggle"]') : null;
        if (dockToggle) {
            event.preventDefault();
            event.stopPropagation();
            const nextDocked = !isParticipantScannerDocked();
            saveParticipantScannerDockedState(nextDocked);
            if (nextDocked) {
                applyParticipantScannerDockedPosition(control);
            } else {
                loadParticipantScannerPanelPosition(control);
                clampParticipantScannerPanelPosition(control);
            }
            updateParticipantScannerDockButton(control);
            return;
        }

        const configButton = event.target && event.target.closest ? event.target.closest('[data-role="open-config"]') : null;
        if (configButton) {
            event.preventDefault();
            event.stopPropagation();
            openParticipantScannerConfigBox();
            return;
        }

        const locatePreviewButton = event.target && event.target.closest ? event.target.closest('[data-role="locate-preview-context"]') : null;
        if (locatePreviewButton) {
            event.preventDefault();
            event.stopPropagation();
            if (locatePreviewButton.disabled) {
                return;
            }
            focusParticipantPreviewElement(getParticipantReferenceSummary());
            return;
        }

        const analyzeCurrentButton = event.target && event.target.closest ? event.target.closest('[data-role="analyze-current-context"]') : null;
        if (analyzeCurrentButton) {
            event.preventDefault();
            event.stopPropagation();
            if (analyzeCurrentButton.disabled) {
                return;
            }
            const referenceSummary = getParticipantReferenceSummary();
            const dialogContext = extractParticipantPreviewDialogContext(referenceSummary);
            startParticipantUserAnalysis(participantRequestsLastSelectedCard, {
                summary: referenceSummary,
                anchorElement: dialogContext && dialogContext.element ? dialogContext.element : participantRequestsLastSelectedCard,
                previewOnly: !!dialogContext,
                reason: 'helper-analyze-current',
            });
            return;
        }

        const button = event.target && event.target.closest ? event.target.closest('[data-card-index]') : null;
        if (!button) {
            return;
        }

        const cardIndex = parseInt(String(button.getAttribute('data-card-index') || ''), 10);
        const card = participantRequestsVisibleCards[cardIndex] || null;
        if (!card) {
            return;
        }

        event.preventDefault();
        event.stopPropagation();

        const role = String(button.getAttribute('data-role') || '');
        if (role === 'locate-card') {
            focusParticipantRequestCard(card);
            return;
        }
        if (role === 'analyze-card') {
            startParticipantUserAnalysis(card, {reason: 'helper-card-list-analyze'});
            return;
        }
        if (role === 'open-card-toolbox') {
            openParticipantRequestToolbox(card, {reason: 'helper-card-list-toolbox'});
            return;
        }
        if (role === 'verify-card') {
            verifyParticipantRequestCard(card, {reason: 'helper-card-list-verify'});
        }
    });

    if (!appendToDocumentBody(control)) {
        return null;
    }
    participantRequestsControl = control;
    enableParticipantScannerControlDragging(control);
    updateParticipantScannerDockButton(control);
    updateParticipantRequestsControl();
    return participantRequestsControl;
}

function renderParticipantRequestHelper(card) {
    if (!card) {
        return;
    }

    const summary = buildParticipantRequestSummary(card);
    const historyBadgeMarkup = buildParticipantHistoryBadgeMarkup(getParticipantHistoryForSummary(summary));
    let helper = card.querySelector('[data-sgpt-participant-badge="true"]');
    const attachmentAnchor = findParticipantRequestAttachmentAnchor(card, summary);
    const overflowButton = extractParticipantRequestOverflowButton(card);
    if (!helper) {
        helper = document.createElement('div');
        helper.setAttribute('data-sgpt-participant-badge', 'true');
        helper.style.display = 'inline-flex';
        helper.style.alignItems = 'center';
        helper.style.gap = '6px';
        helper.style.flexWrap = 'wrap';
        helper.style.fontFamily = 'system-ui,sans-serif';
        helper.style.fontSize = '12px';
        helper.style.lineHeight = '1.2';
        helper.style.position = 'relative';
        helper.style.zIndex = '1';
    }

    if (attachmentAnchor && attachmentAnchor.parentElement) {
        helper.style.marginTop = '8px';
        helper.style.padding = '0';
        helper.style.border = 'none';
        helper.style.borderRadius = '0';
        helper.style.background = 'transparent';
        helper.style.boxShadow = 'none';
        helper.style.color = '#312e81';
        helper.style.justifyContent = 'flex-start';
        helper.style.maxWidth = '100%';
        attachmentAnchor.insertAdjacentElement('afterend', helper);
    } else if (overflowButton && overflowButton.parentElement) {
        helper.style.margin = '0 0 0 8px';
        helper.style.padding = '0';
        helper.style.border = 'none';
        helper.style.borderRadius = '0';
        helper.style.background = 'transparent';
        helper.style.boxShadow = 'none';
        helper.style.color = '#312e81';
        helper.style.justifyContent = 'flex-start';
        helper.style.maxWidth = '100%';
        overflowButton.insertAdjacentElement('afterend', helper);
    } else {
        helper.style.marginTop = '10px';
        helper.style.padding = '8px';
        helper.style.border = '1px solid rgba(124,58,237,0.20)';
        helper.style.borderRadius = '10px';
        helper.style.background = 'rgba(245,243,255,0.90)';
        helper.style.boxShadow = '0 4px 14px rgba(91,33,182,0.08)';
        card.appendChild(helper);
    }

    helper.innerHTML = [
        '<span style="font-weight:700; color:#5b21b6;">User</span>',
        historyBadgeMarkup,
        '<button type="button" data-role="analyze" title="' + escapeHtml(ct('contentScript.participantScannerSummary', {}, 'Questions: {questions} · Groups: {groups} · Preview link: {preview}').replace('{questions}', String(summary.questionCount || 0)).replace('{groups}', String(summary.groupCount || 0)).replace('{preview}', summary.hasPreviewLink ? ct('status.yes', {}, 'yes') : ct('status.no', {}, 'no'))) + '" style="border:none; border-radius:999px; padding:5px 9px; background:#0284c7; color:#fff; cursor:pointer;">' + escapeHtml(ct('contentScript.participantScannerAnalyze', {}, 'Analyze user')) + '</button>',
        '<button type="button" data-role="toolbox" style="border:none; border-radius:999px; padding:5px 9px; background:#0f766e; color:#fff; cursor:pointer;">' + escapeHtml(ct('contentScript.openToolbox', {}, 'Open Toolbox')) + '</button>',
        '<button type="button" data-role="verify" style="border:none; border-radius:999px; padding:5px 9px; background:#7c3aed; color:#fff; cursor:pointer;">' + escapeHtml(ct('contentScript.verifyFact', {}, 'Verify fact')) + '</button>',
        '<button type="button" data-role="open-config" style="border:none; border-radius:999px; padding:5px 9px; background:#ede9fe; color:#5b21b6; cursor:pointer; font-weight:700;">' + escapeHtml(ct('contentScript.participantScannerConfigOpenInline', {}, 'Rules / group info')) + '</button>'
    ].filter(Boolean).join('');

    helper.querySelector('[data-role="analyze"]').addEventListener('click', function (event) {
        event.preventDefault();
        event.stopPropagation();
        rememberParticipantRequestSelection(card, 'inline-analyze');
        startParticipantUserAnalysis(card);
    });

    const helperToolboxButton = helper.querySelector('[data-role="toolbox"]');
    if (helperToolboxButton) {
        helperToolboxButton.addEventListener('click', function (event) {
            event.preventDefault();
            event.stopPropagation();
            rememberParticipantRequestSelection(card, 'inline-toolbox');
            openParticipantRequestToolbox(card, {reason: 'inline-toolbox'});
        });
    }

    const helperVerifyButton = helper.querySelector('[data-role="verify"]');
    if (helperVerifyButton) {
        helperVerifyButton.addEventListener('click', function (event) {
            event.preventDefault();
            event.stopPropagation();
            rememberParticipantRequestSelection(card, 'inline-verify');
            verifyParticipantRequestCard(card, {reason: 'inline-verify'});
        });
    }

    const helperConfigButton = helper.querySelector('[data-role="open-config"]');
    if (helperConfigButton) {
        helperConfigButton.addEventListener('click', function (event) {
            event.preventDefault();
            event.stopPropagation();
            openParticipantScannerConfigBox();
        });
    }

    if (card.dataset.sgptParticipantWatcherReady !== 'true') {
        card.dataset.sgptParticipantWatcherReady = 'true';
        card.addEventListener('click', function (event) {
            if (event.target && event.target.closest && event.target.closest('[data-sgpt-participant-badge="true"]')) {
                return;
            }
            const target = event.target && event.target.closest ? event.target.closest('a, button, [role="button"]') : null;
            const targetLabel = normalizeWhitespace(target ? (target.textContent || target.innerText || target.getAttribute('aria-label') || '') : '');
            rememberParticipantRequestSelection(card, /förhandsgranska|preview/i.test(targetLabel) ? 'preview-click' : 'card-click');
            activateParticipantUserAnalysisContextWatcher(card, /förhandsgranska|preview/i.test(targetLabel) ? 'preview-click' : 'card-click', {
                summary: participantRequestsLastSelectedSummary || buildParticipantRequestSummary(card),
            });
            scheduleParticipantUserAnalysisContextCheck();
            if (/förhandsgranska|preview/i.test(targetLabel)) {
                updateFactResultLoadingProgress(2, 'Looking for the opened preview dialog…');
                scheduleParticipantRequestsScan('preview-click');
            }
        }, true);
    }

    card.setAttribute('data-sgpt-participant-card', 'true');
}

function disconnectParticipantRequestsObserver() {
    if (participantRequestsDomObserver) {
        participantRequestsDomObserver.disconnect();
        participantRequestsDomObserver = null;
    }
}

function clearParticipantRequestEnhancements() {
    clearParticipantAnalysisAutoSupplementTimer();
    clearParticipantAnalysisAutoSupplementStatusTimer();

    if (participantRequestsScanTimerId) {
        window.clearTimeout(participantRequestsScanTimerId);
        participantRequestsScanTimerId = null;
    }

    if (participantRequestsScrollTimerId) {
        window.clearTimeout(participantRequestsScrollTimerId);
        participantRequestsScrollTimerId = null;
    }

    if (participantRequestsAutoScanIntervalId) {
        window.clearInterval(participantRequestsAutoScanIntervalId);
        participantRequestsAutoScanIntervalId = null;
    }

    if (participantRequestsScrollHandler) {
        window.removeEventListener('scroll', participantRequestsScrollHandler, {passive: true});
        participantRequestsScrollHandler = null;
    }

    disconnectParticipantRequestsObserver();
    participantRequestsObservedRoot = null;
    participantRequestsScanScheduled = false;
    participantRequestsScanInProgress = false;
    participantRequestsScrollListenerBound = false;
    participantRequestsLastScanAt = 0;
    participantRequestsEnhancedCardCount = 0;
    participantRequestsLastSummary = '';
    participantRequestsLastScanDurationMs = 0;
    participantRequestsVisibleCards = [];
    participantRequestsLastSelectedCard = null;
    participantRequestsLastSelectedSummary = null;
    participantRequestsLastSelectedReason = '';
    setParticipantAutoSupplementStatus('', false);
    resetParticipantHistoryLookupState();

    document.querySelectorAll('[data-sgpt-participant-card="true"]').forEach(function (card) {
        removeParticipantRequestHelperFromCard(card);
    });

    if (participantRequestsControl) {
        participantRequestsControl.remove();
        participantRequestsControl = null;
    }

    closeParticipantScannerConfigBox();
}

function shouldAutoScanParticipantRequests(reason) {
    if (!participantScannerFeatureEnabled || !isFacebookParticipantRequestsPage()) {
        return false;
    }

    if (document.hidden) {
        return false;
    }

    if (participantRequestsScanInProgress || participantRequestsScanTimerId) {
        return false;
    }

    if (reason === 'interval' && participantRequestsLastScanAt > 0 && (Date.now() - participantRequestsLastScanAt) < Math.max(1800, PARTICIPANT_REQUEST_AUTO_SCAN_INTERVAL_MS - 600)) {
        return false;
    }

    return true;
}

function ensureParticipantRequestsAutomation() {
    if (!participantScannerFeatureEnabled || !isFacebookParticipantRequestsPage()) {
        return;
    }

    if (!participantRequestsScrollListenerBound) {
        participantRequestsScrollListenerBound = true;
        participantRequestsScrollHandler = function () {
            if (!participantScannerFeatureEnabled || !isFacebookParticipantRequestsPage()) {
                return;
            }

            if (participantRequestsScrollTimerId) {
                window.clearTimeout(participantRequestsScrollTimerId);
            }

            participantRequestsScrollTimerId = window.setTimeout(function () {
                participantRequestsScrollTimerId = null;
                if (shouldAutoScanParticipantRequests('scroll')) {
                    scheduleParticipantRequestsScan('scroll-settle');
                }
            }, PARTICIPANT_REQUEST_SCROLL_SETTLE_MS);
        };
        window.addEventListener('scroll', participantRequestsScrollHandler, {passive: true});
    }

    if (!participantRequestsAutoScanIntervalId) {
        participantRequestsAutoScanIntervalId = window.setInterval(function () {
            if (shouldAutoScanParticipantRequests('interval')) {
                scheduleParticipantRequestsScan('interval');
            }
        }, PARTICIPANT_REQUEST_AUTO_SCAN_INTERVAL_MS);
    }
}

function ensureParticipantRequestsObserver() {
    if (!participantScannerFeatureEnabled || !isFacebookParticipantRequestsPage() || participantRequestsDomObserver) {
        return;
    }

    const observerRoot = resolveParticipantRequestsObserverRoot();
    if (!observerRoot) {
        return;
    }

    participantRequestsDomObserver = new MutationObserver(function (mutations) {
        const shouldScan = (mutations || []).some(function (mutation) {
            const nodes = [];
            if (mutation.addedNodes && mutation.addedNodes.length) {
                nodes.push.apply(nodes, Array.from(mutation.addedNodes));
            }
            if (mutation.removedNodes && mutation.removedNodes.length) {
                nodes.push.apply(nodes, Array.from(mutation.removedNodes));
            }

            return nodes.some(function (node) {
                if (!node || !node.nodeType) {
                    return false;
                }
                if (node.nodeType !== Node.ELEMENT_NODE) {
                    return false;
                }
                const element = node;
                if (element.closest && element.closest('#sgpt-participant-requests-control, [data-sgpt-participant-badge="true"]')) {
                    return false;
                }
                if (observerRoot !== document.body && observerRoot.contains && !observerRoot.contains(element)) {
                    return false;
                }
                return !!(element.matches && element.matches('button, [role="button"], a, [role="main"]'))
                    || !!(element.querySelector && element.querySelector('button, [role="button"], a'));
            });
        });
        if (shouldScan) {
            scheduleParticipantRequestsScan('dom-mutation');
        }
    });

    participantRequestsObservedRoot = observerRoot;
    participantRequestsDomObserver.observe(observerRoot, {
        childList: true,
        subtree: true,
    });
}

function runParticipantRequestsScan(reason) {
    if (!participantScannerFeatureEnabled || !isFacebookParticipantRequestsPage()) {
        clearParticipantRequestEnhancements();
        return;
    }

    if (participantRequestsScanInProgress) {
        scheduleParticipantRequestsScan('scan-already-running');
        return;
    }

    participantRequestsScanInProgress = true;
    participantRequestsLastScanAt = Date.now();
    const startedAt = typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now();

    const previousObserver = participantRequestsDomObserver;
    const previousObservedRoot = participantRequestsObservedRoot;
    if (previousObserver) {
        previousObserver.disconnect();
    }

    try {
        const cards = findParticipantRequestCards();
        participantRequestsVisibleCards = cards.slice();
        const activeCards = new Set(cards);
        document.querySelectorAll('[data-sgpt-participant-card="true"]').forEach(function (card) {
            if (!activeCards.has(card)) {
                removeParticipantRequestHelperFromCard(card);
            }
        });

        cards.forEach(function (card) {
            renderParticipantRequestHelper(card);
        });

        participantRequestsEnhancedCardCount = cards.length;
        participantRequestsLastScanDurationMs = Math.max(0, Math.round((typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now()) - startedAt));
        const activePreviewSurface = describeActiveParticipantPreviewSurface();
        if (activePreviewSurface) {
            updateFactResultLoadingProgress(2, activePreviewSurface);
        }
        participantRequestsLastSummary = cards.length
            ? ct('contentScript.participantScannerFoundCards', {count: cards.length}, 'Enhanced {count} visible participant request cards.').replace('{count}', String(cards.length)) + ' · ' + participantRequestsLastScanDurationMs + ' ms'
            : (activePreviewSurface || ct('contentScript.participantScannerNoCards', {}, 'No visible participant-request cards matched yet.')) + ' · ' + participantRequestsLastScanDurationMs + ' ms';
        updateParticipantRequestsControl();
        scheduleParticipantHistoryLookup(reason || 'scan');

        if (adminDebugEnabled) {
            debugLog({
                level: 'info',
                category: 'facebook-participant-requests',
                message: 'Participant request scan completed.',
                meta: {
                    reason: reason || 'scheduled',
                    cards: cards.length,
                    duration_ms: participantRequestsLastScanDurationMs,
                    url: location.href,
                }
            });
        }
    } finally {
        participantRequestsScanInProgress = false;
        if (previousObserver && previousObservedRoot) {
            previousObserver.observe(previousObservedRoot, {childList: true, subtree: true});
            participantRequestsDomObserver = previousObserver;
            participantRequestsObservedRoot = previousObservedRoot;
        } else {
            ensureParticipantRequestsObserver();
        }
    }
}

function scheduleParticipantRequestsScan(reason) {
    if (!participantScannerFeatureEnabled || !isFacebookParticipantRequestsPage()) {
        return;
    }

    participantRequestsLastSummary = ct('contentScript.participantScannerScanning', {}, 'Scanning visible participant request cards...');
    ensureParticipantRequestsControl();
    updateParticipantRequestsControl();

    if (participantRequestsScanTimerId) {
        window.clearTimeout(participantRequestsScanTimerId);
    }

    participantRequestsScanTimerId = window.setTimeout(function () {
        participantRequestsScanTimerId = null;
        runParticipantRequestsScan(reason || 'scheduled');
    }, PARTICIPANT_REQUEST_SCAN_DEBOUNCE_MS);
}

function syncParticipantRequestRuntimePreference() {
    if (!isFacebookParticipantRequestsPage()) {
        if (participantRequestsControl || participantRequestsDomObserver || participantRequestsScanTimerId || participantRequestsAutoScanIntervalId || participantRequestsScrollTimerId) {
            clearParticipantRequestEnhancements();
        }
        return;
    }

    getToolsRuntimeSettings().then(function (data) {
        participantScannerFeatureEnabled = !!(data && data.facebookParticipantScannerEnabled);
        participantScannerGroupContext = normalizeParticipantGroupContextValue(data && data.facebookParticipantGroupContext ? data.facebookParticipantGroupContext : '');

        if (!participantScannerFeatureEnabled || !isFacebookParticipantRequestsPage()) {
            clearParticipantRequestEnhancements();
            return;
        }

        ensureParticipantRequestsControl();
        ensureParticipantRequestsObserver();
        ensureParticipantRequestsAutomation();
        scheduleParticipantRequestsScan('settings-sync');
    });
}

// ---------------------------------------------
// LOADER HANDLING
// ---------------------------------------------
function injectLoader() {
    if (!document.getElementById("socialgpt-loader")) {
        const loader = document.createElement("div");
        loader.id = "socialgpt-loader";
        loader.style.position = "fixed";
        loader.style.bottom = "24px";
        loader.style.right = "24px";
        loader.style.left = "auto";
        loader.style.width = "36px";
        loader.style.height = "36px";
        loader.style.border = "4px solid rgba(148, 163, 184, 0.28)";
        loader.style.borderTop = "4px solid #008CBA";
        loader.style.borderRadius = "50%";
        loader.style.animation = "spin 1s linear infinite";
        loader.style.display = "none";
        loader.style.zIndex = "999999";
        loader.style.background = "rgba(255,255,255,0.96)";
        loader.style.boxShadow = "0 8px 24px rgba(15,23,42,0.18)";
        if (!appendToDocumentBody(loader)) {
            return;
        }

        const style = document.createElement("style");
        style.textContent = `
        #socialgpt-loader {
            position: fixed;
            bottom: 24px;
            right: 24px;
            left: auto;
            width: 36px;
            height: 36px;
            border: 4px solid rgba(148, 163, 184, 0.28);
            border-top: 4px solid #008CBA;
            border-radius: 50%;
            animation: spin 1s linear infinite;
            display: none;
            z-index: 9999;
            background: rgba(255,255,255,0.96);
            box-shadow: 0 8px 24px rgba(15,23,42,0.18);
        }
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }`;
        appendToDocumentHead(style);
    }
}

function cloneAnchorRect(rect) {
    if (!rect) {
        return null;
    }

    return {
        left: Math.round(rect.left),
        top: Math.round(rect.top),
        right: Math.round(rect.right),
        bottom: Math.round(rect.bottom),
        width: Math.round(rect.width),
        height: Math.round(rect.height),
    };
}

function resolveFactAnchorRect(anchor) {
    if (!anchor) {
        return null;
    }

    if (anchor.targetNode && document.contains(anchor.targetNode) && anchor.targetNode.getBoundingClientRect) {
        const liveRect = anchor.targetNode.getBoundingClientRect();
        if (liveRect && liveRect.width >= 0 && liveRect.height >= 0) {
            return cloneAnchorRect(liveRect);
        }
    }

    return anchor.rect ? cloneAnchorRect(anchor.rect) : null;
}

function positionFactResultBox() {
    if (!factResultBox || !document.contains(factResultBox)) {
        factResultBox = null;
        factResultAnchor = null;
        return;
    }

    const rect = resolveFactAnchorRect(factResultAnchor);
    const minMargin = 12;
    const boxWidth = Math.min(420, Math.max(320, Math.round(window.innerWidth * 0.32)));
    factResultBox.style.width = boxWidth + 'px';
    factResultBox.style.maxWidth = 'min(420px, calc(100vw - 24px))';
    factResultBox.style.maxHeight = 'min(78vh, calc(100vh - 24px))';

    if (factResultBoxManualPosition) {
        const clamped = clampFixedPosition(factResultBoxManualPosition.left, factResultBoxManualPosition.top, factResultBox, 12);
        factResultBox.style.left = Math.round(clamped.left) + 'px';
        factResultBox.style.top = Math.round(clamped.top) + 'px';
        factResultBox.style.right = 'auto';
        factResultBox.style.bottom = 'auto';
        factResultBoxManualPosition = {
            left: Math.round(clamped.left),
            top: Math.round(clamped.top),
        };
        return;
    }

    if (!rect) {
        factResultBox.style.right = '20px';
        factResultBox.style.bottom = '20px';
        factResultBox.style.left = 'auto';
        factResultBox.style.top = 'auto';
        return;
    }

    const measuredHeight = Math.min(factResultBox.offsetHeight || 280, Math.max(180, window.innerHeight - (minMargin * 2)));
    let left = rect.right + 12;
    if (left + boxWidth > window.innerWidth - minMargin) {
        left = rect.left - boxWidth - 12;
    }
    if (left < minMargin) {
        left = Math.max(minMargin, Math.min(rect.left, window.innerWidth - boxWidth - minMargin));
    }

    let top = rect.top;
    const maxTop = Math.max(minMargin, window.innerHeight - measuredHeight - minMargin);
    if (top > maxTop) {
        top = maxTop;
    }
    if (top < minMargin) {
        top = minMargin;
    }

    factResultBox.style.left = Math.round(left) + 'px';
    factResultBox.style.top = Math.round(top) + 'px';
    factResultBox.style.right = 'auto';
    factResultBox.style.bottom = 'auto';
}

function clearCurrentSelection() {
    const selection = window.getSelection ? window.getSelection() : null;
    if (!selection) {
        return;
    }

    try {
        selection.removeAllRanges();
    } catch (error) {
    }
}

function buildFactBoxSubtitle(anchor, responseLanguage, isError, modeLabel) {
    const parts = [anchor
        ? ct('contentScript.factAnchoredSelected', {}, 'Anchored to the selected content.')
        : ct('contentScript.factVerificationResult', {}, 'Verification result')];
    if (modeLabel) {
        parts.push(modeLabel);
    }
    if (responseLanguage) {
        parts.push(ct('contentScript.factLanguage', {}, 'Language') + ': ' + getResponseLanguageLabel(responseLanguage));
    }
    if (isError) {
        parts.push(ct('contentScript.factRetry', {}, 'You can retry below.'));
    }
    return parts.join(' · ');
}

function buildFactVerificationRequestToken() {
    return 'sgpt-fact-' + String(Date.now()) + '-' + Math.random().toString(36).slice(2, 10);
}

function shouldHandleIncomingFactResponse(req) {
    if (!req || req.type !== 'GPT_RESPONSE' || !lastVerificationRequest) {
        return false;
    }

    const requestToken = normalizeWhitespace(req.requestToken || '');
    const activeRequestToken = normalizeWhitespace(lastVerificationRequest.requestToken || '');
    if (requestToken && activeRequestToken && requestToken !== activeRequestToken) {
        return false;
    }

    if (pendingAiRequestMode === 'verify') {
        return true;
    }

    return !!(req.replaceExistingFactResult
        && lastVerificationRequest.requestMode === 'user-analysis'
        && factResultBox
        && document.contains(factResultBox));
}

function forceParticipantPreviewContextRefresh(reason) {
    if (!activeParticipantUserAnalysis) {
        return false;
    }

    const requestState = getParticipantAnalysisRequestState();
    if (!requestState || !requestState.context) {
        return false;
    }

    const nextSignature = normalizeWhitespace(requestState.context).slice(0, 6000);
    const currentDisplayedSignature = normalizeWhitespace(lastVerificationRequest && lastVerificationRequest.context ? lastVerificationRequest.context : '').slice(0, 6000);
    if (nextSignature && nextSignature !== activeParticipantUserAnalysis.contextSignature) {
        activeParticipantUserAnalysis.contextSignature = nextSignature;
    }

    if (nextSignature && nextSignature !== currentDisplayedSignature) {
        markParticipantUserAnalysisContextChanged(reason || 'forced-preview-refresh');
        return true;
    }

    const debugState = buildParticipantPreviewDebugState();
    if (debugState && debugState.hasCapturedLines) {
        activeParticipantUserAnalysis.changed = true;
        activeParticipantUserAnalysis.changedReason = reason || 'forced-preview-refresh';
        activeParticipantUserAnalysis.lastContextChangeAt = Date.now();
        updateParticipantUserAnalysisNotice();
        scheduleParticipantAnalysisAutoSupplement(reason || 'forced-preview-refresh');
        return true;
    }

    return false;
}

function isParticipantAnalysisRequestActive() {
    if (!lastVerificationRequest) {
        return false;
    }

    return lastVerificationRequest.requestMode === 'user-analysis'
        || !!lastVerificationRequest.participantAnalysisCard
        || !!lastVerificationRequest.participantAnalysisSummary
        || !!(lastVerificationRequest.extraData && (lastVerificationRequest.extraData.facebook_group_context || lastVerificationRequest.extraData.facebook_profile_url || lastVerificationRequest.extraData.facebook_user_id));
}

function buildFactBoxActions() {
    if (!lastVerificationRequest || !lastVerificationRequest.context) {
        return [];
    }

    const actions = [
    ];

    if (isParticipantAnalysisRequestActive()) {
        actions.push({
            label: ct('contentScript.participantScannerConfigOpenInline', {}, 'Rules / group info'),
            title: ct('contentScript.participantScannerConfigOpenInlineTitle', {}, 'Open the participant user-verifier rule box and update the extra group context used by Analyze user.'),
            background: '#ede9fe',
            color: '#5b21b6',
            onClick: function () {
                openParticipantScannerConfigBox();
            },
        });

        actions.push({
            label: activeParticipantUserAnalysis && activeParticipantUserAnalysis.changed
                ? ct('contentScript.participantScannerUpdateAnalysisNew', {}, 'Update analysis (new context)')
                : ct('contentScript.participantScannerUpdateAnalysis', {}, 'Update analysis'),
            title: ct('contentScript.participantScannerUpdateAnalysisTitle', {}, 'Re-run user analysis with the current visible card, opened preview/comment context, and recent Facebook Graph snippets.'),
            background: activeParticipantUserAnalysis && activeParticipantUserAnalysis.changed ? '#f97316' : '#0f766e',
            color: '#ffffff',
            onClick: function () {
                const requestState = getParticipantAnalysisRequestState();
                startFactVerification(requestState.context, {
                    anchor: createFactAnchorForNode(requestState.anchorElement),
                    model: lastVerificationRequest.model,
                    responseLanguage: lastVerificationRequest.responseLanguage,
                    sourceLabel: lastVerificationRequest.sourceLabel || 'Participant user analysis',
                    pendingTitle: lastVerificationRequest.pendingTitle,
                    pendingSubtitle: lastVerificationRequest.pendingSubtitle,
                    resultTitle: lastVerificationRequest.resultTitle,
                    failedTitle: lastVerificationRequest.failedTitle,
                    modeLabel: lastVerificationRequest.modeLabel,
                    showOpenToolboxAction: lastVerificationRequest.showOpenToolboxAction,
                    participantAnalysisCard: requestState.card,
                    participantAnalysisSummary: requestState.summary,
                    verificationInstruction: lastVerificationRequest.verificationInstruction,
                    sourceUrl: lastVerificationRequest.sourceUrl,
                    extraData: lastVerificationRequest.extraData,
                    loadingSteps: lastVerificationRequest.loadingSteps,
                    previewLimit: lastVerificationRequest.previewLimit,
                    keepMarks: true,
                    keepPosition: true,
                });
            },
        });
    }

    actions.push(
        {
            label: ct('contentScript.factRefresh', {}, 'Refresh'),
            title: ct('contentScript.factRefreshTitle', {}, 'Run the same fact-check again.'),
            background: '#e2e8f0',
            color: '#0f172a',
            onClick: function () {
                const requestState = isParticipantAnalysisRequestActive() ? getParticipantAnalysisRequestState() : null;
                startFactVerification(requestState ? requestState.context : lastVerificationRequest.context, {
                    anchor: requestState ? createFactAnchorForNode(requestState.anchorElement) : lastVerificationRequest.anchor,
                    model: lastVerificationRequest.model,
                    responseLanguage: lastVerificationRequest.responseLanguage,
                    sourceLabel: lastVerificationRequest.sourceLabel || 'Fact verification',
                    pendingTitle: lastVerificationRequest.pendingTitle,
                    pendingSubtitle: lastVerificationRequest.pendingSubtitle,
                    resultTitle: lastVerificationRequest.resultTitle,
                    failedTitle: lastVerificationRequest.failedTitle,
                    modeLabel: lastVerificationRequest.modeLabel,
                    showOpenToolboxAction: lastVerificationRequest.showOpenToolboxAction,
                    participantAnalysisCard: requestState ? requestState.card : lastVerificationRequest.participantAnalysisCard,
                    participantAnalysisSummary: requestState ? requestState.summary : lastVerificationRequest.participantAnalysisSummary,
                    verificationInstruction: lastVerificationRequest.verificationInstruction,
                    sourceUrl: lastVerificationRequest.sourceUrl,
                    extraData: lastVerificationRequest.extraData,
                    loadingSteps: lastVerificationRequest.loadingSteps,
                    previewLimit: lastVerificationRequest.previewLimit,
                    keepMarks: true,
                    keepPosition: true,
                });
            },
        },
        {
            label: ct('contentScript.factDigDeeper', {}, 'Dig deeper'),
            title: ct('contentScript.factDigDeeperTitle', {}, 'Retry with a deeper pass that looks for broader context and stricter verification.'),
            background: '#7c3aed',
            color: '#ffffff',
            onClick: function () {
                const requestState = isParticipantAnalysisRequestActive() ? getParticipantAnalysisRequestState() : null;
                startFactVerification(requestState ? requestState.context : lastVerificationRequest.context, {
                    anchor: requestState ? createFactAnchorForNode(requestState.anchorElement) : lastVerificationRequest.anchor,
                    model: getPreferredDeepVerificationModel(lastVerificationRequest.model),
                    responseLanguage: lastVerificationRequest.responseLanguage,
                    sourceLabel: 'Dig deeper',
                    pendingTitle: lastVerificationRequest.pendingTitle,
                    pendingSubtitle: lastVerificationRequest.pendingSubtitle,
                    resultTitle: lastVerificationRequest.resultTitle,
                    failedTitle: lastVerificationRequest.failedTitle,
                    modeLabel: lastVerificationRequest.modeLabel,
                    showOpenToolboxAction: lastVerificationRequest.showOpenToolboxAction,
                    participantAnalysisCard: requestState ? requestState.card : lastVerificationRequest.participantAnalysisCard,
                    participantAnalysisSummary: requestState ? requestState.summary : lastVerificationRequest.participantAnalysisSummary,
                    sourceUrl: lastVerificationRequest.sourceUrl,
                    extraData: lastVerificationRequest.extraData,
                    loadingSteps: lastVerificationRequest.loadingSteps,
                    previewLimit: lastVerificationRequest.previewLimit,
                    keepMarks: true,
                    keepPosition: true,
                    verificationInstruction: 'Dig deeper before answering. Look for broader context, more relevant source angles, chronology, counts, names, places, and whether there are related facts or caveats that materially change the interpretation. Be extra strict and say clearly when evidence is incomplete or uncertain.',
                });
            },
        }
    );

    if (lastVerificationRequest.showOpenToolboxAction !== false) {
        actions.push({
            label: ct('contentScript.factOpenToolbox', {}, 'Open Toolbox'),
            title: ct('contentScript.factOpenToolboxTitle', {}, 'Open Toolbox with the same verification context so you can continue working from the selected material.'),
            background: '#0284c7',
            color: '#ffffff',
            onClick: function () {
                openReplyPanelWithImportedContext(lastVerificationRequest.context, {
                    message: ct('contentScript.verificationContextImported', {}, 'Verification context imported into Toolbox.'),
                });
            },
        });
    }

    return actions;
}

function enableFactResultBoxDragging(handle, box) {
    if (!handle || !box || handle.dataset.dragReady === 'true') {
        return;
    }

    handle.dataset.dragReady = 'true';

    handle.addEventListener('pointerdown', function (event) {
        if (event.button !== 0 || !box.isConnected || (event.target && event.target.closest && event.target.closest('#sgpt-close'))) {
            return;
        }
        if (panelDockMode !== 'auto') {
            return;
        }

        const rect = box.getBoundingClientRect();
        factResultBoxDragState = {
            pointerId: event.pointerId,
            startX: event.clientX,
            startY: event.clientY,
            offsetX: event.clientX - rect.left,
            offsetY: event.clientY - rect.top,
            dragging: false,
        };

        if (typeof handle.setPointerCapture === 'function') {
            try {
                handle.setPointerCapture(event.pointerId);
            } catch (error) {
            }
        }
    });

    handle.addEventListener('dblclick', function (event) {
        factResultBoxManualPosition = null;
        positionFactResultBox();
        event.preventDefault();
    });

    handle.addEventListener('keydown', function (event) {
        if (event.key !== 'Escape') {
            return;
        }

        factResultBoxManualPosition = null;
        positionFactResultBox();
        event.preventDefault();
    });

    handle.addEventListener('pointermove', function (event) {
        if (!factResultBoxDragState || factResultBoxDragState.pointerId !== event.pointerId || !factResultBox || !factResultBox.isConnected) {
            return;
        }

        const distance = Math.max(Math.abs(event.clientX - factResultBoxDragState.startX), Math.abs(event.clientY - factResultBoxDragState.startY));
        if (!factResultBoxDragState.dragging && distance < 4) {
            return;
        }

        factResultBoxDragState.dragging = true;
        handle.style.cursor = 'grabbing';
        const clamped = clampFixedPosition(
            event.clientX - factResultBoxDragState.offsetX,
            event.clientY - factResultBoxDragState.offsetY,
            factResultBox,
            12
        );
        factResultBox.style.left = Math.round(clamped.left) + 'px';
        factResultBox.style.top = Math.round(clamped.top) + 'px';
        factResultBox.style.right = 'auto';
        factResultBox.style.bottom = 'auto';
    });

    function finishFactResultBoxDrag(event) {
        if (!factResultBoxDragState) {
            return;
        }

        if (event && factResultBoxDragState.pointerId != null && factResultBoxDragState.pointerId !== event.pointerId) {
            return;
        }

        if (factResultBoxDragState.dragging && factResultBox && factResultBox.isConnected) {
            const rect = factResultBox.getBoundingClientRect();
            factResultBoxManualPosition = {
                left: Math.round(rect.left),
                top: Math.round(rect.top),
            };
        }

        if (event && typeof handle.releasePointerCapture === 'function') {
            try {
                if (handle.hasPointerCapture && handle.hasPointerCapture(event.pointerId)) {
                    handle.releasePointerCapture(event.pointerId);
                }
            } catch (error) {
            }
        }

        handle.style.cursor = 'grab';
        factResultBoxDragState = null;
        positionFactResultBox();
    }

    handle.addEventListener('pointerup', finishFactResultBoxDrag);
    handle.addEventListener('pointercancel', finishFactResultBoxDrag);
}

function isSafeHttpUrl(value) {
    try {
        const url = new URL(String(value || ''), location.href);
        return url.protocol === 'http:' || url.protocol === 'https:';
    } catch (error) {
        return false;
    }
}

function getDocumentBodyHost() {
    return document.body || document.documentElement || null;
}

function getDocumentHeadHost() {
    return document.head || document.documentElement || null;
}

function appendToDocumentBody(element) {
    const host = getDocumentBodyHost();
    if (!host || !element) {
        return false;
    }
    host.appendChild(element);
    return true;
}

function appendToDocumentHead(element) {
    const host = getDocumentHeadHost();
    if (!host || !element) {
        return false;
    }
    host.appendChild(element);
    return true;
}

function stopFactResultLoadingAnimation(box) {
    if (!box) {
        return;
    }

    if (box._sgptLoadingTimer) {
        window.clearInterval(box._sgptLoadingTimer);
        box._sgptLoadingTimer = null;
    }

    if (box._sgptLoadingAnimation && typeof box._sgptLoadingAnimation.cancel === 'function') {
        try {
            box._sgptLoadingAnimation.cancel();
        } catch (error) {
        }
        box._sgptLoadingAnimation = null;
    }

    box._sgptLoadingState = null;
}

function ensureFactResultSpinnerStyle() {
    if (document.getElementById('sgpt-inline-spinner-style')) {
        return;
    }

    const style = document.createElement('style');
    style.id = 'sgpt-inline-spinner-style';
    style.textContent = '@keyframes sgpt-inline-spin{from{transform:rotate(0deg);}to{transform:rotate(360deg);}}';
    appendToDocumentHead(style);
}

function startFactResultLoadingAnimation(box, spinner, loadingText, steps) {
    if (!box || !spinner) {
        return;
    }

    stopFactResultLoadingAnimation(box);
    ensureFactResultSpinnerStyle();

    spinner.style.animation = 'sgpt-inline-spin .8s linear infinite';
    if (typeof spinner.animate === 'function') {
        try {
            box._sgptLoadingAnimation = spinner.animate([
                { transform: 'rotate(0deg)' },
                { transform: 'rotate(360deg)' }
            ], {
                duration: 800,
                iterations: Infinity,
                easing: 'linear'
            });
        } catch (error) {
            box._sgptLoadingAnimation = null;
        }
    }

    const normalizedSteps = Array.isArray(steps)
        ? steps.map(function (step) {
            return String(step || '').trim();
        }).filter(Boolean)
        : [];

    const baseLabel = loadingText ? String(loadingText.textContent || '').trim() : 'Checking now…';
    const cycle = normalizedSteps.length ? normalizedSteps : [baseLabel, baseLabel + ' .', baseLabel + ' ..', baseLabel + ' ...'];
    const totalSteps = Math.max(1, cycle.length);
    const progressText = box.querySelector('[data-role="loading-progress"]');
    const progressBar = box.querySelector('[data-role="loading-progress-bar"]');
    const startAt = Date.now();
    let index = 0;
    let overrideLabel = '';

    function render() {
        const elapsedSeconds = Math.max(0, Math.round((Date.now() - startAt) / 1000));
        const stepNumber = Math.min(index + 1, totalSteps);
        if (loadingText) {
            loadingText.textContent = overrideLabel || cycle[index] || baseLabel;
        }
        if (progressText) {
            progressText.textContent = 'Step ' + String(stepNumber) + '/' + String(totalSteps) + ' · ' + String(elapsedSeconds) + ' s';
        }
        if (progressBar) {
            const ratio = totalSteps <= 1
                ? 0.2 + Math.min(0.7, elapsedSeconds * 0.04)
                : Math.min(0.96, Math.max(0.18, stepNumber / totalSteps));
            progressBar.style.width = String(Math.round(ratio * 100)) + '%';
        }
    }

    box._sgptLoadingState = {
        cycle: cycle.slice(),
        startedAt: startAt,
        setStep: function (nextIndex) {
            index = Math.max(0, Math.min(totalSteps - 1, nextIndex));
            overrideLabel = '';
            render();
        },
        setLabel: function (label) {
            overrideLabel = label ? String(label) : '';
            render();
        },
    };

    render();
    if (loadingText) {
        loadingText.textContent = cycle[0];
    }

    box._sgptLoadingTimer = window.setInterval(function () {
        if (!document.contains(box)) {
            stopFactResultLoadingAnimation(box);
            return;
        }
        if (cycle.length > 1 && index < cycle.length - 1) {
            index += 1;
        }
        render();
    }, 1200);
}

function updateFactResultLoadingProgress(nextIndex, label) {
    if (!factResultBox || !document.contains(factResultBox) || !factResultBox._sgptLoadingState) {
        return;
    }

    if (typeof nextIndex === 'number' && typeof factResultBox._sgptLoadingState.setStep === 'function') {
        factResultBox._sgptLoadingState.setStep(nextIndex);
    }
    if (label && typeof factResultBox._sgptLoadingState.setLabel === 'function') {
        factResultBox._sgptLoadingState.setLabel(label);
    }
}

function normalizeMarkdownSource(value) {
    return String(value == null ? '' : value)
        .replace(/\r\n?/g, '\n')
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<\/(p|div|li|blockquote|h[1-6]|ul|ol)>/gi, '\n')
        .replace(/<[^>]+>/g, '')
        .replace(/&nbsp;|&#160;/gi, ' ')
        .replace(/&lt;/gi, '<')
        .replace(/&gt;/gi, '>')
        .replace(/&amp;/gi, '&')
        .replace(/[\u200B-\u200D\uFEFF]/g, '');
}

function renderSafeMarkdownInline(value) {
    let text = normalizeMarkdownSource(value);
    const placeholders = [];
    const linkPattern = /\[([^\n\]]{1,180})\]\((https?:\/\/[^\s)<>"]{1,1200})\)/g;

    text = text.replace(linkPattern, function (match, label, url) {
        if (!isSafeHttpUrl(url)) {
            return match;
        }

        const token = '@@SGPT_LINK_' + String(placeholders.length) + '@@';
        placeholders.push({
            token: token,
            html: '<a href="' + escapeHtml(url) + '" target="_blank" rel="noopener noreferrer" style="color:#2563eb; text-decoration:underline;">' + escapeHtml(label) + '</a>'
        });
        return token;
    });

    let html = escapeHtml(text);
    placeholders.forEach(function (entry) {
        html = html.replace(entry.token, entry.html);
    });

    html = html.replace(/`([^`\n]{1,400})`/g, '<code style="background:rgba(148,163,184,0.16); border-radius:6px; padding:1px 5px; font-family:ui-monospace,SFMono-Regular,Menlo,monospace; font-size:0.95em;">$1</code>');
    html = html.replace(/\*\*([^*\n][\s\S]*?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/__([^_\n][\s\S]*?)__/g, '<strong>$1</strong>');

    return html;
}

function renderSafeMarkdown(value) {
    const lines = normalizeMarkdownSource(value).split('\n');
    const blocks = [];
    let paragraph = [];
    let listItems = [];
    let quoteLines = [];

    function flushParagraph() {
        if (!paragraph.length) {
            return;
        }
        blocks.push('<p style="margin:0 0 12px 0;">' + paragraph.map(renderSafeMarkdownInline).join('<br>') + '</p>');
        paragraph = [];
    }

    function flushList() {
        if (!listItems.length) {
            return;
        }
        blocks.push('<ul style="margin:0 0 12px 18px; padding:0;">' + listItems.map(function (item) {
            return '<li style="margin:0 0 6px 0;">' + renderSafeMarkdownInline(item) + '</li>';
        }).join('') + '</ul>');
        listItems = [];
    }

    function flushQuote() {
        if (!quoteLines.length) {
            return;
        }
        blocks.push('<blockquote style="margin:0 0 12px 0; padding:8px 12px; border-left:3px solid rgba(124,58,237,0.35); background:rgba(248,250,252,0.92); color:#334155;">' + quoteLines.map(renderSafeMarkdownInline).join('<br>') + '</blockquote>');
        quoteLines = [];
    }

    lines.forEach(function (line) {
        const rawLine = String(line || '');
        const trimmed = rawLine.trim();
        const headingMatch = trimmed.match(/^(#{1,6})\s*(.+)$/);
        const listMatch = rawLine.match(/^\s*(?:[-*]|\d+\.)\s+(.*)$/);
        const quoteMatch = rawLine.match(/^>\s?(.*)$/);

        if (!trimmed) {
            flushParagraph();
            flushList();
            flushQuote();
            return;
        }

        if (headingMatch) {
            flushParagraph();
            flushList();
            flushQuote();
            const level = Math.min(6, Math.max(1, headingMatch[1].length));
            const fontSize = ({1: '20px', 2: '18px', 3: '16px', 4: '15px', 5: '14px', 6: '13px'})[level] || '16px';
            blocks.push('<h' + level + ' style="margin:0 0 10px 0; font-size:' + fontSize + '; line-height:1.35;">' + renderSafeMarkdownInline(headingMatch[2]) + '</h' + level + '>');
            return;
        }

        if (listMatch) {
            flushParagraph();
            flushQuote();
            listItems.push(listMatch[1]);
            return;
        }

        if (quoteMatch) {
            flushParagraph();
            flushList();
            quoteLines.push(quoteMatch[1]);
            return;
        }

        flushList();
        flushQuote();
        paragraph.push(rawLine);
    });

    flushParagraph();
    flushList();
    flushQuote();

    return blocks.join('') || '<p style="margin:0;">' + renderSafeMarkdownInline(normalizeMarkdownSource(value)) + '</p>';
}

function buildFactVerificationPendingHtml(context, sourceLabel, responseLanguage, options) {
    const config = options || {};
    const preparedContext = sanitizeContextForAi(context || '');
    const previewLimit = Math.max(160, parseInt(config.previewLimit || 280, 10) || 280);
    const preview = preparedContext ? clipText(preparedContext, previewLimit) : ct('contentScript.previewPreparing', {}, 'Preparing verification context…');
    const badges = [
        sourceLabel || ct('contentScript.factVerificationResult', {}, 'Verification result'),
        ct('contentScript.factLanguage', {}, 'Language') + ': ' + getResponseLanguageLabel(responseLanguage || defaultResponseLanguage)
    ];

    return [
        '<div style="display:flex; flex-wrap:wrap; gap:6px; margin-bottom:10px;">',
        badges.map(function (badge) {
            return '<span style="display:inline-flex; align-items:center; padding:4px 8px; border-radius:999px; background:rgba(109,40,217,0.08); color:#6d28d9; font-size:11px; font-weight:700;">' + escapeHtml(badge) + '</span>';
        }).join(''),
        '</div>',
        '<div style="border:1px solid rgba(196,181,253,0.9); border-radius:12px; background:rgba(255,255,255,0.78); padding:12px; box-shadow:inset 0 1px 0 rgba(255,255,255,0.55);">',
        '<div style="font-size:11px; font-weight:800; letter-spacing:0.06em; text-transform:uppercase; color:#7c3aed; margin-bottom:8px;">' + escapeHtml(ct('contentScript.previewLabel', {}, 'Preview')) + '</div>',
        '<div style="color:#334155;">' + renderSafeMarkdown(preview) + '</div>',
        '</div>'
    ].join('');
}

function extractSafeCitationLinks(payload) {
    const citations = payload && payload.web_search && Array.isArray(payload.web_search.citations)
        ? payload.web_search.citations
        : [];
    const seen = new Set();

    return citations.map(function (citation) {
        const url = citation && citation.url ? String(citation.url).trim() : '';
        if (!url || !isSafeHttpUrl(url) || seen.has(url)) {
            return null;
        }
        seen.add(url);
        return {
            url: url,
            title: citation && citation.title ? String(citation.title).trim() : url,
        };
    }).filter(Boolean).slice(0, 8);
}

function showFactResultBox(content, anchor, options) {
    const config = options || {};
    if (factResultBox && document.contains(factResultBox)) {
        stopFactResultLoadingAnimation(factResultBox);
        factResultBox.remove();
    }

    factResultAnchor = anchor || null;

    const box = document.createElement('div');
    box.id = 'sgpt-factbox';
    box.style.position = 'fixed';
    box.style.width = '400px';
    box.style.maxHeight = 'min(78vh, calc(100vh - 24px))';
    box.style.overflow = 'hidden';
    box.style.display = 'flex';
    box.style.flexDirection = 'column';
    box.style.boxSizing = 'border-box';
    box.style.background = config.background || '#fff';
    box.style.border = '1px solid ' + (config.borderColor || '#d8b4fe');
    box.style.borderRadius = '10px';
    box.style.boxShadow = '0 10px 28px rgba(0,0,0,0.18)';
    box.style.padding = '12px';
    box.style.zIndex = 2147483647;
    box.style.fontFamily = 'system-ui, sans-serif';
    box.style.fontSize = '14px';
    box.style.lineHeight = '1.45';
    box.style.color = config.textColor || '#0f172a';

    const closeBtn = document.createElement('button');
    closeBtn.textContent = '×';
    closeBtn.setAttribute('aria-label', ct('contentScript.closeToolbox', {}, 'Close Toolbox'));
    closeBtn.title = ct('contentScript.closeToolbox', {}, 'Close Toolbox');
    closeBtn.style.position = 'absolute';
    closeBtn.style.top = '6px';
    closeBtn.style.right = '8px';
    closeBtn.style.border = 'none';
    closeBtn.style.background = 'transparent';
    closeBtn.style.fontSize = '18px';
    closeBtn.style.cursor = 'pointer';
    closeBtn.addEventListener('click', () => {
        stopFactResultLoadingAnimation(box);
        box.remove();
        if (factResultBox === box) {
            factResultBox = null;
            factResultAnchor = null;
            factResultBoxManualPosition = null;
            factResultBoxDragState = null;
        }
    });

    const header = document.createElement('div');
    header.style.display = 'flex';
    header.style.flexDirection = 'column';
    header.style.gap = '4px';
    header.style.paddingRight = '24px';
    header.style.marginBottom = '6px';
    header.style.cursor = 'grab';
    header.style.userSelect = 'none';
    header.style.flex = '0 0 auto';
    header.tabIndex = 0;
    header.title = ct('contentScript.dragFactTitle', {}, 'Drag to move. Double-click or press Escape to reset position.');

    const title = document.createElement('div');
    title.textContent = config.title || ct('contentScript.factVerificationTitle', {}, '✅ Fact checking via OpenAI');
    title.style.fontWeight = '700';
    title.style.color = config.titleColor || '#0284c7';

    const subtitle = document.createElement('div');
    subtitle.textContent = config.subtitle || (anchor
        ? ct('contentScript.factAnchoredSelected', {}, 'Anchored to the selected content.')
        : ct('contentScript.factVerificationResult', {}, 'Verification result'));
    subtitle.style.color = config.subtitleColor || '#7c3aed';
    subtitle.style.fontSize = '12px';
    subtitle.style.fontWeight = '600';

    header.appendChild(title);
    header.appendChild(subtitle);

    const loadingRow = document.createElement('div');
    loadingRow.style.display = config.isLoading ? 'flex' : 'none';
    loadingRow.style.alignItems = 'center';
    loadingRow.style.gap = '8px';
    loadingRow.style.marginBottom = '10px';
    loadingRow.style.color = '#6d28d9';
    loadingRow.style.fontSize = '12px';
    loadingRow.style.fontWeight = '600';
    loadingRow.style.flex = '0 0 auto';

    const loadingSpinner = document.createElement('span');
    loadingSpinner.style.width = '14px';
    loadingSpinner.style.height = '14px';
    loadingSpinner.style.borderRadius = '50%';
    loadingSpinner.style.border = '2px solid rgba(124,58,237,0.22)';
    loadingSpinner.style.borderTopColor = '#7c3aed';
    loadingSpinner.style.animation = 'sgpt-inline-spin .8s linear infinite';

    const loadingText = document.createElement('span');
    loadingText.textContent = ct('contentScript.checkingNow', {}, 'Checking now…');

    const loadingProgress = document.createElement('div');
    loadingProgress.setAttribute('data-role', 'loading-progress');
    loadingProgress.style.marginLeft = 'auto';
    loadingProgress.style.color = '#7c3aed';
    loadingProgress.style.fontSize = '11px';
    loadingProgress.style.fontWeight = '700';
    loadingProgress.textContent = 'Step 1/1 · 0 s';

    const loadingTrack = document.createElement('div');
    loadingTrack.style.width = '100%';
    loadingTrack.style.height = '6px';
    loadingTrack.style.borderRadius = '999px';
    loadingTrack.style.background = 'rgba(124,58,237,0.14)';
    loadingTrack.style.marginTop = '8px';
    loadingTrack.style.overflow = 'hidden';
    loadingTrack.style.display = config.isLoading ? 'block' : 'none';

    const loadingProgressBar = document.createElement('div');
    loadingProgressBar.setAttribute('data-role', 'loading-progress-bar');
    loadingProgressBar.style.height = '100%';
    loadingProgressBar.style.width = '18%';
    loadingProgressBar.style.borderRadius = '999px';
    loadingProgressBar.style.background = 'linear-gradient(90deg, #8b5cf6, #06b6d4)';
    loadingProgressBar.style.transition = 'width .35s ease';

    loadingTrack.appendChild(loadingProgressBar);

    loadingRow.appendChild(loadingSpinner);
    loadingRow.appendChild(loadingText);
    loadingRow.appendChild(loadingProgress);

    const text = document.createElement('div');
    text.innerHTML = config.contentIsHtml ? String(content || '') : renderSafeMarkdown(content);
    text.style.whiteSpace = 'normal';
    text.style.overflowWrap = 'anywhere';
    text.style.wordBreak = 'break-word';
    if (config.isLoading) {
        text.style.color = '#475569';
    }

    const contentScroll = document.createElement('div');
    contentScroll.setAttribute('data-role', 'fact-content-scroll');
    contentScroll.style.flex = '1 1 auto';
    contentScroll.style.minHeight = '0';
    contentScroll.style.overflowY = 'auto';
    contentScroll.style.paddingRight = '4px';
    contentScroll.style.scrollbarGutter = 'stable';
    contentScroll.style.webkitOverflowScrolling = 'touch';

    const links = Array.isArray(config.links) ? config.links.filter(Boolean) : [];
    const linksBox = document.createElement('div');
    linksBox.style.display = links.length ? 'block' : 'none';
    linksBox.style.marginTop = '10px';
    linksBox.style.paddingTop = '8px';
    linksBox.style.borderTop = '1px solid rgba(148,163,184,0.35)';
    linksBox.style.fontSize = '12px';
    linksBox.style.whiteSpace = 'normal';
    if (links.length) {
        const linksTitle = document.createElement('div');
        linksTitle.textContent = ct('contentScript.factSources', {}, 'Sources');
        linksTitle.style.fontWeight = '700';
        linksTitle.style.marginBottom = '4px';
        linksBox.appendChild(linksTitle);
        links.forEach(function (link) {
            const anchorEl = document.createElement('a');
            anchorEl.href = link.url;
            anchorEl.target = '_blank';
            anchorEl.rel = 'noopener noreferrer';
            anchorEl.textContent = link.title || link.url;
            anchorEl.style.display = 'block';
            anchorEl.style.color = '#2563eb';
            anchorEl.style.textDecoration = 'underline';
            anchorEl.style.marginTop = '3px';
            linksBox.appendChild(anchorEl);
        });
    }

    const actions = Array.isArray(config.actions) ? config.actions.filter(Boolean) : [];
    const actionsRow = document.createElement('div');
    actionsRow.setAttribute('data-role', 'fact-actions');
    actionsRow.style.display = actions.length ? 'flex' : 'none';
    actionsRow.style.gap = '8px';
    actionsRow.style.flexWrap = 'wrap';
    actionsRow.style.marginTop = '12px';
    actionsRow.style.flex = '0 0 auto';
    actions.forEach(function (action) {
        const button = document.createElement('button');
        button.type = 'button';
        button.textContent = action.label || 'Action';
        button.title = action.title || '';
        button.style.border = 'none';
        button.style.borderRadius = '999px';
        button.style.padding = '6px 10px';
        button.style.cursor = 'pointer';
        button.style.background = action.background || '#e2e8f0';
        button.style.color = action.color || '#0f172a';
        button.style.fontSize = '12px';
        button.addEventListener('click', function (event) {
            event.preventDefault();
            if (typeof action.onClick === 'function') {
                action.onClick();
            }
        });
        actionsRow.appendChild(button);
    });

    box.appendChild(closeBtn);
    box.appendChild(header);
    box.appendChild(loadingRow);
    box.appendChild(loadingTrack);
    contentScroll.appendChild(text);
    contentScroll.appendChild(linksBox);
    box.appendChild(contentScroll);
    box.appendChild(actionsRow);
    if (!appendToDocumentBody(box)) {
        return;
    }
    factResultBox = box;
    enableFactResultBoxDragging(header, box);
    positionFactResultBox();
    if (config.isLoading) {
        startFactResultLoadingAnimation(box, loadingSpinner, loadingText, config.loadingSteps || []);
    } else {
        stopFactResultLoadingAnimation(box);
    }
    updateParticipantPreviewDebugView();
}

function showFactVerificationPending(context, anchor, sourceLabel, options) {
    const config = options || {};

    showFactResultBox(
        buildFactVerificationPendingHtml(context, sourceLabel, lastVerificationRequest ? lastVerificationRequest.responseLanguage : defaultResponseLanguage, config),
        anchor,
        {
            title: config.pendingTitle || ct('contentScript.verifyingFacts', {}, '⏳ Verifying facts…'),
            titleColor: '#7c3aed',
            subtitle: config.pendingSubtitle || (ct('contentScript.resultAppears', {}, 'Result appears here automatically') + ' · ' + (sourceLabel || ct('contentScript.factVerificationResult', {}, 'Verification result')) + ' · ' + ct('contentScript.factLanguage', {}, 'Language') + ': ' + getResponseLanguageLabel(lastVerificationRequest ? lastVerificationRequest.responseLanguage : defaultResponseLanguage)),
            subtitleColor: '#6d28d9',
            borderColor: '#c4b5fd',
            background: '#faf5ff',
            isLoading: true,
            loadingSteps: config.loadingSteps || [],
            contentIsHtml: true,
            actions: buildFactBoxActions(),
        }
    );
}

function updatePanelBusyState(isBusy, label) {
    if (!panel) {
        return;
    }

    const loader = panel.querySelector('#sgpt-inline-loader');
    const loaderLabel = panel.querySelector('#sgpt-inline-loader-label');
    const buttons = ['#sgpt-send', '#sgpt-mod', '#sgpt-verify', '#sgpt-paste']
        .map(function (selector) {
            return panel.querySelector(selector);
        })
        .filter(Boolean);

    buttons.forEach(function (button) {
        button.disabled = !!isBusy;
        button.setAttribute('aria-busy', isBusy ? 'true' : 'false');
    });

    if (!loader) {
        return;
    }

    loader.dataset.visible = isBusy ? 'true' : 'false';
    loader.setAttribute('aria-hidden', isBusy ? 'false' : 'true');
    if (loaderLabel) {
        loaderLabel.textContent = label || ct('contentScript.working', {}, 'Working…');
    }
}

function showLoader(label, options) {
    const settings = options || {};
    updatePanelBusyState(true, label || ct('contentScript.working', {}, 'Working…'));

    const loader = document.getElementById("socialgpt-loader");
    if (loader) {
        loader.style.display = (panel || settings.skipFloating) ? "none" : "block";
    }
}

function hideLoader() {
    updatePanelBusyState(false);

    const loader = document.getElementById("socialgpt-loader");
    if (loader) {
        loader.style.display = "none";
    }
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

function getEventTargetElement(target) {
    if (!target) {
        return null;
    }

    return target.nodeType === Node.ELEMENT_NODE
        ? target
        : (target.parentElement || null);
}

function isSocialToolsUiElement(target) {
    const element = getEventTargetElement(target);
    return !!(element && element.closest && element.closest('#sgpt-panel, #sgpt-factbox, #sgpt-verify-action, #sgpt-selection-toolbox-action, #sgpt-verify-hover, #sgpt-composer-action, #sgpt-quick-response-action, #tn-social-tools-admin-activities, #tn-networks-soundcloud-buffer, #tn-soundcloud-direct-capture-buffer'));
}

function isEditableTarget(node) {
    return !!(node && typeof node.matches === 'function' && node.matches(EDITABLE_SELECTOR) && !node.closest('#sgpt-panel'));
}

function findEditableTarget(node) {
    if (!node || node.closest && node.closest('#sgpt-panel')) {
        return null;
    }

    const candidate = isEditableTarget(node)
        ? node
        : (node.closest ? node.closest(EDITABLE_SELECTOR) : null);

    if (!candidate) {
        return null;
    }

    const platform = getActivePlatformDefinition();
    if (!platform || typeof platform.supportsComposerTarget !== 'function') {
        return null;
    }

    return platform.supportsComposerTarget(candidate, location) ? candidate : null;
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

function getComposerActionButtonAnchorPosition(button, preferredPlacement) {
    if (!activeComposer || !document.contains(activeComposer)) {
        return null;
    }

    const rect = activeComposer.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) {
        return null;
    }

    const gap = 8;
    const buttonRect = getButtonRectForPlacement(button, 124, 32);
    const preferred = String(preferredPlacement || 'above').toLowerCase();
    const alignedRightLeft = Math.max(12, Math.min(rect.right - buttonRect.width, window.innerWidth - buttonRect.width - 12));
    const alignedLeftLeft = Math.max(12, Math.min(rect.left, window.innerWidth - buttonRect.width - 12));
    const aboveTop = rect.top - buttonRect.height - gap;
    const belowTop = rect.bottom + gap;

    const candidates = [];
    if (preferred === 'below') {
        candidates.push({ left: alignedRightLeft, top: belowTop });
        candidates.push({ left: alignedLeftLeft, top: belowTop });
        candidates.push({ left: alignedRightLeft, top: aboveTop });
        candidates.push({ left: alignedLeftLeft, top: aboveTop });
    } else {
        candidates.push({ left: alignedRightLeft, top: aboveTop });
        candidates.push({ left: alignedLeftLeft, top: aboveTop });
        candidates.push({ left: alignedRightLeft, top: belowTop });
        candidates.push({ left: alignedLeftLeft, top: belowTop });
    }

    for (let index = 0; index < candidates.length; index += 1) {
        const candidate = clampFixedPosition(candidates[index].left, candidates[index].top, button, 12);
        const avoidsVerticalOverlap = candidate.top + buttonRect.height <= rect.top - gap || candidate.top >= rect.bottom + gap;
        const avoidsHorizontalOverlap = candidate.left + buttonRect.width <= rect.left - gap || candidate.left >= rect.right + gap;
        if (avoidsVerticalOverlap || avoidsHorizontalOverlap) {
            return candidate;
        }
    }

    return {
        left: alignedRightLeft,
        top: Math.max(12, aboveTop),
    };
}

function getQuickResponseActionButtonAnchorPosition() {
    const composerButton = ensureComposerActionButton();
    const quickButton = ensureQuickResponseActionButton();
    const primaryAnchor = getComposerActionButtonAnchorPosition(composerButton, 'above');
    if (!primaryAnchor) {
        return null;
    }

    const composerRect = activeComposer && activeComposer.getBoundingClientRect ? activeComposer.getBoundingClientRect() : null;
    const primaryRect = getButtonRectForPlacement(composerButton, 124, 32);
    const quickRect = getButtonRectForPlacement(quickButton, 116, 32);
    const gap = 8;
    const candidates = [
        { left: primaryAnchor.left - quickRect.width - gap, top: primaryAnchor.top },
        { left: primaryAnchor.left + primaryRect.width + gap, top: primaryAnchor.top },
        { left: primaryAnchor.left, top: primaryAnchor.top + primaryRect.height + gap },
        { left: primaryAnchor.left, top: primaryAnchor.top - quickRect.height - gap },
        getComposerActionButtonAnchorPosition(quickButton, 'below'),
    ].filter(Boolean);

    for (let index = 0; index < candidates.length; index += 1) {
        const candidate = clampFixedPosition(candidates[index].left, candidates[index].top, quickButton, 12);
        if (!composerRect) {
            return candidate;
        }

        const avoidsVerticalOverlap = candidate.top + quickRect.height <= composerRect.top - gap || candidate.top >= composerRect.bottom + gap;
        const avoidsHorizontalOverlap = candidate.left + quickRect.width <= composerRect.left - gap || candidate.left >= composerRect.right + gap;
        const avoidsPrimaryOverlap = candidate.left + quickRect.width <= primaryAnchor.left - gap
            || candidate.left >= primaryAnchor.left + primaryRect.width + gap
            || candidate.top + quickRect.height <= primaryAnchor.top - gap
            || candidate.top >= primaryAnchor.top + primaryRect.height + gap;

        if ((avoidsVerticalOverlap || avoidsHorizontalOverlap) && avoidsPrimaryOverlap) {
            return candidate;
        }
    }

    return clampFixedPosition(primaryAnchor.left + primaryRect.width + gap, primaryAnchor.top, quickButton, 12);
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

function getButtonRectForPlacement(button, fallbackWidth, fallbackHeight) {
    const rect = button && button.getBoundingClientRect ? button.getBoundingClientRect() : null;
    return {
        width: Math.max(1, Math.round((rect && rect.width) || fallbackWidth || 72)),
        height: Math.max(1, Math.round((rect && rect.height) || fallbackHeight || 30)),
    };
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
            anchorPosition: getComposerActionButtonAnchorPosition(button, 'above') || {left: rect.left, top: rect.top},
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
        positionQuickResponseActionButton();
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
        positionQuickResponseActionButton();
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
            const anchorPosition = getComposerActionButtonAnchorPosition(composerActionButton, 'above') || composerActionButtonDragState.anchorPosition || {left: rect.left, top: rect.top};
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

function enableQuickResponseActionButtonDragging(button) {
    if (!button || button.dataset.dragReady === 'true') {
        return;
    }

    button.dataset.dragReady = 'true';

    button.addEventListener('pointerdown', function (event) {
        if (event.button !== 0 || !button.isConnected) {
            return;
        }

        const rect = button.getBoundingClientRect();
        quickResponseActionButtonDragState = {
            pointerId: event.pointerId,
            startX: event.clientX,
            startY: event.clientY,
            offsetX: event.clientX - rect.left,
            offsetY: event.clientY - rect.top,
            dragging: false,
            anchorPosition: getQuickResponseActionButtonAnchorPosition() || {left: rect.left, top: rect.top},
        };

        if (typeof button.setPointerCapture === 'function') {
            try {
                button.setPointerCapture(event.pointerId);
            } catch (error) {
            }
        }
    });

    button.addEventListener('dblclick', function (event) {
        quickResponseActionButtonDragOffset = null;
        button.dataset.dragSuppressClick = 'true';
        window.setTimeout(function () {
            if (button) {
                button.dataset.dragSuppressClick = 'false';
            }
        }, 120);
        positionQuickResponseActionButton();
        event.preventDefault();
    });

    button.addEventListener('keydown', function (event) {
        if (event.key !== 'Escape') {
            return;
        }

        quickResponseActionButtonDragOffset = null;
        button.dataset.dragSuppressClick = 'true';
        window.setTimeout(function () {
            if (button) {
                button.dataset.dragSuppressClick = 'false';
            }
        }, 120);
        positionQuickResponseActionButton();
        event.preventDefault();
    });

    button.addEventListener('pointermove', function (event) {
        if (!quickResponseActionButtonDragState || !quickResponseActionButton || quickResponseActionButtonDragState.pointerId !== event.pointerId) {
            return;
        }

        const distance = Math.max(Math.abs(event.clientX - quickResponseActionButtonDragState.startX), Math.abs(event.clientY - quickResponseActionButtonDragState.startY));
        if (!quickResponseActionButtonDragState.dragging && distance < 4) {
            return;
        }

        quickResponseActionButtonDragState.dragging = true;
        quickResponseActionButton.style.cursor = 'grabbing';
        setComposerActionButtonCoordinates(
            quickResponseActionButton,
            event.clientX - quickResponseActionButtonDragState.offsetX,
            event.clientY - quickResponseActionButtonDragState.offsetY
        );
    });

    function finishQuickResponseActionButtonDrag(event) {
        if (!quickResponseActionButtonDragState || !quickResponseActionButton) {
            quickResponseActionButtonDragState = null;
            return;
        }

        if (event && quickResponseActionButtonDragState.pointerId != null && quickResponseActionButtonDragState.pointerId !== event.pointerId) {
            return;
        }

        if (quickResponseActionButtonDragState.dragging) {
            const rect = quickResponseActionButton.getBoundingClientRect();
            const anchorPosition = getQuickResponseActionButtonAnchorPosition() || quickResponseActionButtonDragState.anchorPosition || {left: rect.left, top: rect.top};
            quickResponseActionButtonDragOffset = {
                left: Math.round(rect.left - anchorPosition.left),
                top: Math.round(rect.top - anchorPosition.top),
            };
            quickResponseActionButton.dataset.dragSuppressClick = 'true';
            window.setTimeout(function () {
                if (quickResponseActionButton) {
                    quickResponseActionButton.dataset.dragSuppressClick = 'false';
                }
            }, 120);
        }

        if (event && typeof quickResponseActionButton.releasePointerCapture === 'function') {
            try {
                if (quickResponseActionButton.hasPointerCapture && quickResponseActionButton.hasPointerCapture(event.pointerId)) {
                    quickResponseActionButton.releasePointerCapture(event.pointerId);
                }
            } catch (error) {
            }
        }

        quickResponseActionButton.style.cursor = 'grab';
        quickResponseActionButtonDragState = null;
        positionQuickResponseActionButton();
    }

    button.addEventListener('pointerup', finishQuickResponseActionButtonDrag);
    button.addEventListener('pointercancel', finishQuickResponseActionButtonDrag);
}

function getVerifyHoverButtonAnchorPosition(target, button) {
    if (!target || !target.getBoundingClientRect) {
        return null;
    }

    const rect = target.getBoundingClientRect();
    const gap = 8;
    const buttonRect = getButtonRectForPlacement(button, 64, 28);
    const centeredTop = rect.top + Math.max(0, Math.round((rect.height - buttonRect.height) / 2));
    const candidates = [
        {left: rect.right + gap, top: centeredTop},
        {left: rect.right - buttonRect.width, top: rect.bottom + gap},
        {left: rect.left, top: rect.bottom + gap},
        {left: rect.left - buttonRect.width - gap, top: centeredTop},
        {left: rect.right - buttonRect.width, top: rect.top - buttonRect.height - gap},
    ];

    for (let i = 0; i < candidates.length; i += 1) {
        const candidate = candidates[i];
        if (candidate.left >= 12
            && candidate.top >= 12
            && candidate.left + buttonRect.width <= window.innerWidth - 12
            && candidate.top + buttonRect.height <= window.innerHeight - 12) {
            return candidate;
        }
    }

    return {
        left: Math.max(12, Math.min(rect.right - buttonRect.width, window.innerWidth - buttonRect.width - 12)),
        top: Math.max(12, Math.min(rect.top - buttonRect.height - gap, window.innerHeight - buttonRect.height - 12)),
    };
}

function positionVerifyHoverButton() {
    if (!verifyHoverButton || !verifyHoverTarget || !document.contains(verifyHoverTarget)) {
        return;
    }

    if (verifyHoverButtonDragState && verifyHoverButtonDragState.dragging) {
        return;
    }

    const anchor = getVerifyHoverButtonAnchorPosition(verifyHoverTarget, verifyHoverButton);
    if (!anchor) {
        return;
    }

    const left = anchor.left + (verifyHoverButtonDragOffset ? verifyHoverButtonDragOffset.left : 0);
    const top = anchor.top + (verifyHoverButtonDragOffset ? verifyHoverButtonDragOffset.top : 0);
    setComposerActionButtonCoordinates(verifyHoverButton, left, top);
}

function enableVerifyHoverButtonDragging(button) {
    if (!button || button.dataset.dragReady === 'true') {
        return;
    }

    button.dataset.dragReady = 'true';

    button.addEventListener('pointerdown', function (event) {
        if (event.button !== 0 || !button.isConnected) {
            return;
        }

        const rect = button.getBoundingClientRect();
        verifyHoverButtonDragState = {
            pointerId: event.pointerId,
            startX: event.clientX,
            startY: event.clientY,
            offsetX: event.clientX - rect.left,
            offsetY: event.clientY - rect.top,
            dragging: false,
            anchorPosition: getVerifyHoverButtonAnchorPosition(verifyHoverTarget, button) || {left: rect.left, top: rect.top},
        };

        if (typeof button.setPointerCapture === 'function') {
            try {
                button.setPointerCapture(event.pointerId);
            } catch (error) {
            }
        }
    });

    button.addEventListener('dblclick', function (event) {
        verifyHoverButtonDragOffset = null;
        button.dataset.dragSuppressClick = 'true';
        window.setTimeout(function () {
            if (button) {
                button.dataset.dragSuppressClick = 'false';
            }
        }, 120);
        positionVerifyHoverButton();
        event.preventDefault();
    });

    button.addEventListener('keydown', function (event) {
        if (event.key !== 'Escape') {
            return;
        }

        verifyHoverButtonDragOffset = null;
        button.dataset.dragSuppressClick = 'true';
        window.setTimeout(function () {
            if (button) {
                button.dataset.dragSuppressClick = 'false';
            }
        }, 120);
        positionVerifyHoverButton();
        event.preventDefault();
    });

    button.addEventListener('pointermove', function (event) {
        if (!verifyHoverButtonDragState || !verifyHoverButton || verifyHoverButtonDragState.pointerId !== event.pointerId) {
            return;
        }

        const distance = Math.max(Math.abs(event.clientX - verifyHoverButtonDragState.startX), Math.abs(event.clientY - verifyHoverButtonDragState.startY));
        if (!verifyHoverButtonDragState.dragging && distance < 4) {
            return;
        }

        verifyHoverButtonDragState.dragging = true;
        verifyHoverButton.style.cursor = 'grabbing';
        setComposerActionButtonCoordinates(
            verifyHoverButton,
            event.clientX - verifyHoverButtonDragState.offsetX,
            event.clientY - verifyHoverButtonDragState.offsetY
        );
    });

    function finishVerifyHoverButtonDrag(event) {
        if (!verifyHoverButtonDragState || !verifyHoverButton) {
            verifyHoverButtonDragState = null;
            return;
        }

        if (event && verifyHoverButtonDragState.pointerId != null && verifyHoverButtonDragState.pointerId !== event.pointerId) {
            return;
        }

        if (verifyHoverButtonDragState.dragging) {
            const rect = verifyHoverButton.getBoundingClientRect();
            const anchorPosition = getVerifyHoverButtonAnchorPosition(verifyHoverTarget, verifyHoverButton) || verifyHoverButtonDragState.anchorPosition || {left: rect.left, top: rect.top};
            verifyHoverButtonDragOffset = {
                left: Math.round(rect.left - anchorPosition.left),
                top: Math.round(rect.top - anchorPosition.top),
            };
            verifyHoverButton.dataset.dragSuppressClick = 'true';
            window.setTimeout(function () {
                if (verifyHoverButton) {
                    verifyHoverButton.dataset.dragSuppressClick = 'false';
                }
            }, 120);
        }

        if (event && typeof verifyHoverButton.releasePointerCapture === 'function') {
            try {
                if (verifyHoverButton.hasPointerCapture && verifyHoverButton.hasPointerCapture(event.pointerId)) {
                    verifyHoverButton.releasePointerCapture(event.pointerId);
                }
            } catch (error) {
            }
        }

        verifyHoverButton.style.cursor = 'grab';
        verifyHoverButtonDragState = null;
        positionVerifyHoverButton();
    }

    button.addEventListener('pointerup', finishVerifyHoverButtonDrag);
    button.addEventListener('pointercancel', finishVerifyHoverButtonDrag);
}

function isComposerContentEditable(node) {
    return !!(node && (node.isContentEditable || (node.getAttribute && /^(|true)$/i.test(node.getAttribute('contenteditable') || ''))));
}

function dispatchComposerInputEvents(node, insertedText, inputType, options) {
    if (!node || !node.dispatchEvent) {
        return;
    }

    const settings = options || {};
    const eventInputType = inputType || 'insertText';

    if (settings.emitBeforeInput) {
        try {
            if (typeof InputEvent === 'function') {
                node.dispatchEvent(new InputEvent('beforeinput', {
                    bubbles: true,
                    cancelable: true,
                    data: insertedText,
                    inputType: eventInputType,
                }));
            }
        } catch (error) {
        }
    }

    try {
        if (typeof InputEvent === 'function') {
            node.dispatchEvent(new InputEvent('input', {
                bubbles: true,
                cancelable: true,
                data: insertedText,
                inputType: eventInputType,
            }));
        } else {
            node.dispatchEvent(new Event('input', {bubbles: true, cancelable: true}));
        }
    } catch (error) {
        node.dispatchEvent(new Event('input', {bubbles: true, cancelable: true}));
    }

    if (settings.emitChange) {
        node.dispatchEvent(new Event('change', {bubbles: true}));
    }
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

function resolveComposerEditingHost(node) {
    if (!node || !document.contains(node)) {
        return null;
    }

    if (node instanceof HTMLTextAreaElement || node instanceof HTMLInputElement || isComposerContentEditable(node)) {
        return node;
    }

    if (!node.querySelector) {
        return node;
    }

    const preferred = node.querySelector('textarea,input[type="text"],input:not([type]),[contenteditable=""],[contenteditable="true"],[contenteditable]:not([contenteditable="false"])');
    return preferred || node;
}

function moveComposerCaretToEnd(node) {
    if (!node || !document.contains(node)) {
        return;
    }

    if (node instanceof HTMLTextAreaElement || node instanceof HTMLInputElement) {
        if (typeof node.setSelectionRange === 'function') {
            node.setSelectionRange(node.value.length, node.value.length);
        }
        return;
    }

    if (!isComposerContentEditable(node)) {
        return;
    }

    try {
        const selection = window.getSelection();
        if (!selection) {
            return;
        }

        const range = document.createRange();
        range.selectNodeContents(node);
        range.collapse(false);
        selection.removeAllRanges();
        selection.addRange(range);
    } catch (error) {
    }
}

function buildContentEditableFragment(value) {
    const fragment = document.createDocumentFragment();
    const lines = String(value || '').split('\n');
    lines.forEach(function (line, index) {
        if (index > 0) {
            fragment.appendChild(document.createElement('br'));
        }
        fragment.appendChild(document.createTextNode(line));
    });
    return fragment;
}

function replaceContentEditableText(node, value) {
    let inserted = false;

    try {
        node.focus();
    } catch (error) {
    }

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
        try {
            const selection = window.getSelection();
            const range = document.createRange();
            range.selectNodeContents(node);
            range.deleteContents();
            range.insertNode(buildContentEditableFragment(value));
            if (selection) {
                selection.removeAllRanges();
            }
        } catch (error) {
            node.textContent = value;
        }
    }

    moveComposerCaretToEnd(node);
    if (!inserted) {
        dispatchComposerInputEvents(node, value, 'insertFromPaste');
    }
    return {ok: true};
}

function replaceComposerText(node, text) {
    const editorHost = resolveComposerEditingHost(node);
    if (!editorHost || !document.contains(editorHost)) {
        return {ok: false, error: 'No selected field is available anymore.'};
    }

    const value = String(text || '');

    try {
        editorHost.focus();
    } catch (error) {
    }

    if (editorHost instanceof HTMLTextAreaElement || editorHost instanceof HTMLInputElement) {
        setNativeTextInputValue(editorHost, value);
        moveComposerCaretToEnd(editorHost);
        dispatchComposerInputEvents(editorHost, value, 'insertFromPaste');
        return {ok: true};
    }

    if (isComposerContentEditable(editorHost)) {
        return replaceContentEditableText(editorHost, value);
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
        return 'Generate text, then paste it into the selected field.';
    }

    return capabilities.canPaste
        ? 'Output is ready. Paste it into the selected field and review it before sending.'
        : 'Output is ready, but no selected field is available for paste right now.';
}

function updatePanelComposerActions(statusOverride, tone) {
    if (!panel) {
        return;
    }

    const contextField = panel.querySelector('#sgpt-context');
    const outputField = panel.querySelector('#sgpt-out');
    const verifyButton = panel.querySelector('#sgpt-verify');
    const refreshButton = panel.querySelector('#sgpt-mod');
    const quickButton = panel.querySelector('#sgpt-quick');
    const pasteButton = panel.querySelector('#sgpt-paste');
    const status = panel.querySelector('#sgpt-compose-status');
    const modifierField = panel.querySelector('#sgpt-modifier');
    const capabilities = getComposerFillCapabilities();
    const contextText = contextField ? contextField.value.trim() : '';
    const outputText = outputField ? outputField.value.trim() : '';
    const modifierText = modifierField ? modifierField.value.trim() : '';

    if (verifyButton) {
        verifyButton.disabled = !contextText;
    }

    if (pasteButton) {
        pasteButton.disabled = !outputText || !capabilities.canPaste;
    }

    if (refreshButton) {
        const isRevision = !!outputText && !!modifierText;
        refreshButton.textContent = isRevision ? 'Apply change' : 'Refresh';
        refreshButton.title = isRevision
            ? 'Revise the current output using the change request.'
            : 'Generate a fresh answer from the same prompt and context.';
        refreshButton.disabled = !outputText;
    }

    if (quickButton) {
        quickButton.disabled = !capabilities.hasComposer && !contextText;
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

    return {
        ok: true,
        submitted: false,
        message: 'Text pasted into the selected field. Review it before sending.',
    };
}

function clearMarkedContextSelection() {
    markedElements.forEach(function (el) {
        clearMarkedElementPresentation(el);
    });
    markedElements = [];
    isClickMarkingActive = false;
    safeSendRuntimeMessage({type: 'RESET_MARK_MODE'});
}

function getMarkedElementPublicId(index) {
    return 'tn-mark-' + (index + 1);
}

function clearMarkedElementPresentation(el) {
    if (!el || !el.classList) {
        return;
    }

    el.classList.remove('socialgpt-marked');
    el.removeAttribute('data-tn-social-mark-id');
    el.removeAttribute('data-tn-social-mark-badge');
    el.removeAttribute('data-tn-social-mark-mode');
}

function pruneMarkedElements() {
    markedElements = markedElements.filter(function (el) {
        return !!(el && document.contains(el));
    });
    return markedElements;
}

function buildElementCssDescriptor(el) {
    if (!el || !el.tagName) {
        return '';
    }

    const tag = String(el.tagName || '').toLowerCase();
    const idPart = el.id ? ('#' + normalizeWhitespace(el.id).replace(/\s+/g, '-')) : '';
    const classPart = Array.from(el.classList || [])
        .map(function (className) {
            return normalizeWhitespace(className || '').replace(/\s+/g, '-');
        })
        .filter(Boolean)
        .slice(0, 3)
        .map(function (className) {
            return '.' + className;
        })
        .join('');
    const role = normalizeWhitespace(el.getAttribute && el.getAttribute('role'));
    return tag + idPart + classPart + (role ? ('[role=' + role + ']') : '');
}

function findMarkedElementIdentityText(el) {
    if (!el || !el.querySelectorAll) {
        return '';
    }

    const ownCandidates = [
        el.getAttribute && el.getAttribute('aria-label'),
        el.getAttribute && el.getAttribute('title'),
        el.getAttribute && el.getAttribute('name'),
        el.getAttribute && el.getAttribute('data-testid'),
        el.getAttribute && el.getAttribute('data-pagelet'),
        el.getAttribute && el.getAttribute('alt'),
    ];

    for (let index = 0; index < ownCandidates.length; index += 1) {
        const candidate = normalizeWhitespace(ownCandidates[index] || '');
        if (candidate && candidate.length >= 3) {
            return clipText(candidate, 80);
        }
    }

    const nodes = el.querySelectorAll('h1,h2,h3,h4,h5,h6,strong,b,[aria-label],[title],[alt],a,button,span,div,p');
    for (let index = 0; index < nodes.length; index += 1) {
        const node = nodes[index];
        const candidate = normalizeWhitespace(node.innerText || node.textContent || node.getAttribute && node.getAttribute('aria-label') || '');
        if (candidate && candidate.length >= 4) {
            return clipText(candidate, 80);
        }
    }

    const fallback = normalizeWhitespace(el.innerText || el.textContent || '');
    return fallback ? clipText(fallback, 80) : '';
}

function buildMarkedElementBadge(el, index) {
    const parts = ['#' + (index + 1)];
    if (markedContextLabelMode !== 'compact') {
        parts.push(getMarkedElementPublicId(index));
    }
    if (markedContextLabelMode === 'detailed') {
        const identity = findMarkedElementIdentityText(el);
        if (identity) {
            parts.push(clipText(identity, 32));
        }
    }
    return parts.join(' · ');
}

function buildMarkedContextHeader(el, index) {
    const parts = [String(index + 1)];
    if (markedContextLabelMode === 'compact') {
        return '[' + parts[0] + ']';
    }

    parts.push(getMarkedElementPublicId(index));
    if (markedContextLabelMode === 'detailed') {
        const descriptor = buildElementCssDescriptor(el);
        const identity = findMarkedElementIdentityText(el);
        if (descriptor) {
            parts.push(descriptor);
        }
        if (identity) {
            parts.push(identity);
        }
    }

    return '[' + parts.join(' · ') + ']';
}

function refreshMarkedElementPresentation() {
    pruneMarkedElements();
    markedElements.forEach(function (el, index) {
        if (!el || !el.classList) {
            return;
        }

        el.classList.add('socialgpt-marked');
        el.setAttribute('data-tn-social-mark-id', getMarkedElementPublicId(index));
        el.setAttribute('data-tn-social-mark-mode', markedContextLabelMode);
        if (markedContextLabelMode === 'compact') {
            el.removeAttribute('data-tn-social-mark-badge');
        } else {
            el.setAttribute('data-tn-social-mark-badge', buildMarkedElementBadge(el, index));
        }
    });
}

function getMarkedContextExpansionLabel() {
    return {
        current: ct('contentScript.extractionCurrent', {}, 'current marked block only'),
        parent: ct('contentScript.extractionParent', {}, 'one parent up'),
        'parent-children': ct('contentScript.extractionParentChildren', {}, 'one parent up + direct child scan'),
        document: window.top === window
            ? ct('contentScript.extractionDocument', {}, 'current page/document text')
            : ct('contentScript.extractionFrameDocument', {}, 'current iframe/frame document text'),
    }[markedContextExpansionMode] || ct('contentScript.extractionCurrent', {}, 'current marked block only');
}

function handleMarkedContextSettingsChanged() {
    refreshMarkedElementPresentation();

    if (!panel) {
        return;
    }

    if (markedElements.length) {
        setPanelContextValue(getCurrentPanelContextValue());
    }
    updatePanelAnchorNote();
    updatePanelComposerActions();
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

    button.textContent = enabled
        ? ct('contentScript.stopMarking', {}, 'Stop marking')
        : ct('contentScript.markContext', {}, 'Mark context');
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
        if (!response || !response.ok) {
            const fallbackEnabled = !!enabled;
            isClickMarkingActive = fallbackEnabled;
            updatePanelMarkModeButton(fallbackEnabled);
            updatePanelAnchorNote();
            return {
                ok: true,
                enabled: fallbackEnabled,
                localOnly: true,
                warning: response && response.error ? response.error : 'Background mark-mode sync was unavailable.',
            };
        }

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

function getRefreshRequestMeta() {
    if (!panel) {
        return {
            modifier: '',
            previousReply: '',
            requestMode: 'refresh',
            loaderLabel: 'Refreshing…',
        };
    }

    const outputField = panel.querySelector('#sgpt-out');
    const modifierField = panel.querySelector('#sgpt-modifier');
    const previousReply = outputField ? outputField.value.trim() : '';
    const modifier = modifierField ? modifierField.value.trim() : '';
    const isRevision = previousReply !== '' && modifier !== '';

    return {
        modifier: isRevision ? modifier : '',
        previousReply: isRevision ? previousReply : '',
        requestMode: isRevision ? 'revise' : 'refresh',
        loaderLabel: isRevision ? 'Applying change…' : 'Refreshing…',
    };
}

function setActiveComposer(node) {
    const nextComposer = node && document.contains(node) ? node : null;
    const composerChanged = nextComposer !== activeComposer;

    activeComposer = nextComposer;
    if (panel) {
        if (isClickMarkingActive) {
            if (composerChanged) {
                panelAttachedComposer = activeComposer;
            }
            if (!markedElements.length && !panelContextDirty) {
                refreshPanelContextFromCurrentTarget();
            } else {
                positionPanelNearComposer();
                updatePanelAnchorNote();
                updatePanelComposerActions();
            }
            positionComposerActionButton();
            return;
        }

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
        return getEmptyContextPrompt();
    }

    const contextNode = findContextNodeForComposer(activeComposer);
    activeReplyContextMeta = {source: 'composer'};
    return contextNode ? getReadableContext(contextNode) : getEmptyContextPrompt();
}

async function refreshToolsRssSiteMatches() {
    const response = await safeSendRuntimeMessageWithResponse({
        type: 'GET_TOOLS_RSS_MATCHES_FOR_PAGE',
        pageUrl: location.href,
    });

    latestRssSiteMatches = response && response.ok && Array.isArray(response.matches)
        ? response.matches.slice(0, 3)
        : [];
    updatePanelAnchorNote();
}

function buildRssMatchHintText() {
    if (!Array.isArray(latestRssSiteMatches) || !latestRssSiteMatches.length) {
        return '';
    }

    const labels = latestRssSiteMatches.map(function (match) {
        if (!match || typeof match !== 'object') {
            return '';
        }

        return normalizeWhitespace(match.title || match.host || match.url || '');
    }).filter(Boolean);

    if (!labels.length) {
        return '';
    }

    if (labels.length === 1) {
        return ' ' + ct('contentScript.rssSiteHintSingle', {
            site: labels[0]
        }, 'Tools RSS knows this site as ' + labels[0] + '.');
    }

    return ' ' + ct('contentScript.rssSiteHintMultiple', {
        count: labels.length,
        sites: labels.join(', ')
    }, 'Tools RSS knows this host via ' + labels.join(', ') + '.');
}

function updatePanelAnchorNote() {
    if (!panel) {
        return;
    }

    const note = panel.querySelector('#sgpt-anchor-note');
    if (!note) {
        return;
    }

    const activeMarks = pruneMarkedElements();
    const rssHintSuffix = buildRssMatchHintText();

    if (activeMarks.length) {
        let message = ct('contentScript.anchorMarkedBlocks', {
            count: activeMarks.length,
            plural: activeMarks.length === 1 ? '' : 's'
        }, 'Using ' + activeMarks.length + ' marked block' + (activeMarks.length === 1 ? '' : 's') + ' as context.');
        if (markedContextLabelMode !== 'compact') {
            message += ct('contentScript.anchorMarkedIds', {
                ids: activeMarks.map(function (_, index) {
                    return getMarkedElementPublicId(index);
                }).join(', ')
            }, ' IDs: ' + activeMarks.map(function (_, index) {
                return getMarkedElementPublicId(index);
            }).join(', ') + '.');
        }
        if (markedContextExpansionMode !== 'current') {
            message += ct('contentScript.anchorExtraction', {
                label: getMarkedContextExpansionLabel()
            }, ' Extraction: ' + getMarkedContextExpansionLabel() + '.');
        }
        note.textContent = message;
        return;
    }

    if (isClickMarkingActive) {
        note.textContent = ct('contentScript.anchorMarkModeActive', {}, 'Mark mode is active. Click page elements to add or remove context blocks.');
        return;
    }

    if (activeReplyContextMeta && activeReplyContextMeta.replyTarget) {
        note.textContent = ct('contentScript.anchorReplyTarget', {
            target: activeReplyContextMeta.replyTarget
        }, 'Anchored to the current reply field. Reply target detected: ' + activeReplyContextMeta.replyTarget + '.') + rssHintSuffix;
        return;
    }

    if (activeReplyContextMeta && activeReplyContextMeta.source === 'generic-thread' && activeReplyContextMeta.threadSize > 1) {
        note.textContent = ct('contentScript.anchorGenericThread', {}, 'Anchored to the current field with nearby conversation context from visible parent/sibling blocks.') + rssHintSuffix;
        return;
    }

    note.textContent = activeComposer && document.contains(activeComposer)
        ? ct('contentScript.anchorFocused', {}, 'Anchored to the currently focused text field.') + rssHintSuffix
        : ct('contentScript.anchorFocusOrMark', {}, 'Focus a text field or mark elements to build context.') + rssHintSuffix;
}

function ensureComposerActionButton() {
    if (composerActionButton) {
        return composerActionButton;
    }

    composerActionButton = document.createElement('button');
    composerActionButton.id = 'sgpt-composer-action';
    composerActionButton.type = 'button';
    composerActionButton.textContent = ct('contentScript.openToolbox', {}, 'Open Toolbox');
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
    composerActionButton.title = ct('contentScript.composerActionTitle', {}, 'Open Toolbox for the selected field. Drag to move it away. Double-click to reset its position.');
    composerActionButton.addEventListener('click', function () {
        if (composerActionButton.dataset.dragSuppressClick === 'true') {
            return;
        }
        openReplyPanel();
    });
    if (!appendToDocumentBody(composerActionButton)) {
        composerActionButton = null;
        return null;
    }
    enableComposerActionButtonDragging(composerActionButton);

    return composerActionButton;
}

function ensureQuickResponseActionButton() {
    if (quickResponseActionButton) {
        return quickResponseActionButton;
    }

    quickResponseActionButton = document.createElement('button');
    quickResponseActionButton.id = 'sgpt-quick-response-action';
    quickResponseActionButton.type = 'button';
    quickResponseActionButton.textContent = ct('contentScript.quickResponse', {}, 'Quick response');
    quickResponseActionButton.style.position = 'fixed';
    quickResponseActionButton.style.zIndex = '2147483645';
    quickResponseActionButton.style.padding = '6px 10px';
    quickResponseActionButton.style.border = 'none';
    quickResponseActionButton.style.borderRadius = '999px';
    quickResponseActionButton.style.background = '#ea580c';
    quickResponseActionButton.style.color = '#fff';
    quickResponseActionButton.style.fontSize = '12px';
    quickResponseActionButton.style.cursor = 'pointer';
    quickResponseActionButton.style.userSelect = 'none';
    quickResponseActionButton.style.boxShadow = '0 2px 10px rgba(0,0,0,0.16)';
    quickResponseActionButton.style.display = 'none';
    quickResponseActionButton.title = ct('contentScript.quickResponseTitle', {}, 'Generate a quick reply using the preset saved in the extension popup.');
    quickResponseActionButton.addEventListener('mousedown', function (event) {
        event.preventDefault();
    });
    quickResponseActionButton.addEventListener('click', function () {
        if (quickResponseActionButton.dataset.dragSuppressClick === 'true') {
            return;
        }
        sendQuickReply();
    });
    if (!appendToDocumentBody(quickResponseActionButton)) {
        quickResponseActionButton = null;
        return null;
    }
    enableQuickResponseActionButtonDragging(quickResponseActionButton);

    return quickResponseActionButton;
}

function ensureVerifyActionButton() {
    if (verifyActionButton) {
        return verifyActionButton;
    }

    verifyActionButton = document.createElement('button');
    verifyActionButton.id = 'sgpt-verify-action';
    verifyActionButton.type = 'button';
    verifyActionButton.textContent = ct('contentScript.verifyFact', {}, 'Verify fact');
    verifyActionButton.style.position = 'fixed';
    verifyActionButton.style.zIndex = '2147483646';
    verifyActionButton.style.padding = '5px 10px';
    verifyActionButton.style.border = 'none';
    verifyActionButton.style.borderRadius = '999px';
    verifyActionButton.style.background = '#7c3aed';
    verifyActionButton.style.color = '#fff';
    verifyActionButton.style.fontSize = '12px';
    verifyActionButton.style.cursor = 'pointer';
    verifyActionButton.style.userSelect = 'none';
    verifyActionButton.style.boxShadow = '0 2px 10px rgba(0,0,0,0.18)';
    verifyActionButton.style.display = 'none';
    verifyActionButton.title = ct('contentScript.verifySelectionTitle', {}, 'Fact-check the selected text.');
    verifyActionButton.addEventListener('mousedown', function (event) {
        event.preventDefault();
    });
    verifyActionButton.addEventListener('click', function () {
        if (!verifyActionContext) {
            return;
        }
        const context = verifyActionContext;
        const anchor = verifyActionAnchor;
        verifyActionContext = '';
        verifyActionAnchor = null;
        verifyActionButton.style.display = 'none';
        startFactVerification(context, {preferPanel: false, anchor: anchor});
    });
    if (!appendToDocumentBody(verifyActionButton)) {
        verifyActionButton = null;
        return null;
    }

    return verifyActionButton;
}

function ensureSelectionToolboxActionButton() {
    if (selectionToolboxActionButton) {
        return selectionToolboxActionButton;
    }

    selectionToolboxActionButton = document.createElement('button');
    selectionToolboxActionButton.id = 'sgpt-selection-toolbox-action';
    selectionToolboxActionButton.type = 'button';
    selectionToolboxActionButton.textContent = ct('contentScript.openToolbox', {}, 'Open Toolbox');
    selectionToolboxActionButton.style.position = 'fixed';
    selectionToolboxActionButton.style.zIndex = '2147483646';
    selectionToolboxActionButton.style.padding = '5px 10px';
    selectionToolboxActionButton.style.border = 'none';
    selectionToolboxActionButton.style.borderRadius = '999px';
    selectionToolboxActionButton.style.background = '#0284c7';
    selectionToolboxActionButton.style.color = '#fff';
    selectionToolboxActionButton.style.fontSize = '12px';
    selectionToolboxActionButton.style.cursor = 'pointer';
    selectionToolboxActionButton.style.userSelect = 'none';
    selectionToolboxActionButton.style.boxShadow = '0 2px 10px rgba(0,0,0,0.18)';
    selectionToolboxActionButton.style.display = 'none';
    selectionToolboxActionButton.title = ct('contentScript.openToolboxSelectionTitle', {}, 'Open Toolbox with the selected text imported as context.');
    selectionToolboxActionButton.addEventListener('mousedown', function (event) {
        event.preventDefault();
    });
    selectionToolboxActionButton.addEventListener('click', function () {
        if (!selectionToolboxContext) {
            return;
        }
        const context = selectionToolboxContext;
        selectionToolboxContext = '';
        selectionToolboxAnchor = null;
        selectionToolboxActionButton.style.display = 'none';
        if (verifyActionButton) {
            verifyActionButton.style.display = 'none';
        }
        verifyActionContext = '';
        verifyActionAnchor = null;
        openReplyPanelWithImportedContext(context, {
            message: ct('contentScript.contextImportedFromSelection', {}, 'Selected text imported into Toolbox.'),
        });
    });
    if (!appendToDocumentBody(selectionToolboxActionButton)) {
        selectionToolboxActionButton = null;
        return null;
    }

    return selectionToolboxActionButton;
}

function ensureVerifyHoverButton() {
    if (verifyHoverButton) {
        return verifyHoverButton;
    }

    verifyHoverButton = document.createElement('button');
    verifyHoverButton.id = 'sgpt-verify-hover';
    verifyHoverButton.type = 'button';
    verifyHoverButton.textContent = ct('contentScript.verifyShort', {}, 'Verify');
    verifyHoverButton.style.position = 'fixed';
    verifyHoverButton.style.zIndex = '2147483646';
    verifyHoverButton.style.padding = '4px 9px';
    verifyHoverButton.style.border = '1px solid #c4b5fd';
    verifyHoverButton.style.borderRadius = '999px';
    verifyHoverButton.style.background = 'rgba(124,58,237,0.96)';
    verifyHoverButton.style.color = '#fff';
    verifyHoverButton.style.fontSize = '11px';
    verifyHoverButton.style.cursor = 'grab';
    verifyHoverButton.style.userSelect = 'none';
    verifyHoverButton.style.touchAction = 'none';
    verifyHoverButton.style.boxShadow = '0 2px 10px rgba(0,0,0,0.14)';
    verifyHoverButton.style.display = 'none';
    verifyHoverButton.title = ct('contentScript.verifyHoverTitle', {}, 'Verify the hovered image or link. Drag to move it away and double-click to reset.');
    verifyHoverButton.addEventListener('mousedown', function (event) {
        event.preventDefault();
    });
    verifyHoverButton.addEventListener('click', function () {
        if (verifyHoverButton.dataset.dragSuppressClick === 'true') {
            return;
        }
        if (!verifyHoverContext) {
            return;
        }

        const context = verifyHoverContext;
        const anchor = verifyHoverAnchor;
        hideVerifyHoverButton(true);
        startFactVerification(context, {
            preferPanel: false,
            anchor: anchor,
            sourceLabel: 'Hover verify',
        });
    });
    if (!appendToDocumentBody(verifyHoverButton)) {
        verifyHoverButton = null;
        return null;
    }
    enableVerifyHoverButtonDragging(verifyHoverButton);

    return verifyHoverButton;
}

function createFactAnchorForNode(node) {
    const targetNode = node ? (findFullContextNode(node) || node) : null;
    const rect = targetNode && targetNode.getBoundingClientRect ? targetNode.getBoundingClientRect() : null;

    return {
        targetNode: targetNode,
        rect: rect ? cloneAnchorRect(rect) : null,
    };
}

function buildSelectionVerificationContext(selectedText, node) {
    const claim = normalizeWhitespace(selectedText || '');
    if (!claim) {
        return '';
    }

    const contextNode = node ? findFullContextNode(node) : null;
    const nearbyContext = contextNode ? normalizeWhitespace(getReadableContext(contextNode)) : '';
    const lines = ['Selected claim:', claim];

    if (nearbyContext) {
        const normalizedClaim = claim.toLowerCase();
        const normalizedContext = nearbyContext.toLowerCase();
        if (normalizedContext !== normalizedClaim && normalizedContext.indexOf(normalizedClaim) === -1) {
            lines.push('Nearby page context (including visible links/media references when available):', clipText(nearbyContext, 2200));
        } else if (/\[(IMG|LINK|VIDEO):/i.test(nearbyContext)) {
            lines.push('Nearby page context (including visible links/media references when available):', clipText(nearbyContext, 2200));
        }
    }

    return lines.join('\n\n');
}

function buildHoverVerificationContext(target) {
    if (!target) {
        return '';
    }

    const snapshot = convertNodeToReadableText(target.cloneNode(true));
    const contextNode = findFullContextNode(target) || target;
    const nearbyContext = normalizeWhitespace(getReadableContext(contextNode));
    const isImage = target.tagName === 'IMG';
    const lines = [isImage ? 'Image or visual to verify:' : 'Link or URL to verify:', snapshot || (isImage ? '[IMG]' : '[LINK]')];

    if (nearbyContext) {
        const normalizedSnapshot = normalizeWhitespace(snapshot).toLowerCase();
        const normalizedContext = nearbyContext.toLowerCase();
        if (!normalizedSnapshot || normalizedContext !== normalizedSnapshot) {
            lines.push('Nearby page context (including visible links/media references when available):', clipText(nearbyContext, 2200));
        }
    }

    return lines.join('\n\n');
}

function findVerifiableHoverTarget(node) {
    if (!node || !node.closest) {
        return null;
    }

    if (node.closest('#sgpt-panel, #sgpt-factbox, #sgpt-verify-action, #sgpt-verify-hover')) {
        return null;
    }

    const image = node.closest('img');
    if (image && image.src) {
        return image;
    }

    const link = node.closest('a[href]');
    if (link && link.href) {
        return link;
    }

    return null;
}

function hideVerifyHoverButton(clearState) {
    if (verifyHoverShowTimer) {
        window.clearTimeout(verifyHoverShowTimer);
        verifyHoverShowTimer = null;
    }
    if (verifyHoverHideTimer) {
        window.clearTimeout(verifyHoverHideTimer);
        verifyHoverHideTimer = null;
    }
    if (verifyHoverButton) {
        verifyHoverButton.style.display = 'none';
    }
    if (clearState) {
        verifyHoverContext = '';
        verifyHoverAnchor = null;
        verifyHoverTarget = null;
    }
}

function showVerifyHoverButtonForTarget(target) {
    if (!target || panel || (window.getSelection && window.getSelection() && !window.getSelection().isCollapsed)) {
        hideVerifyHoverButton(!target);
        return;
    }

    const button = ensureVerifyHoverButton();
    const rect = target.getBoundingClientRect();
    if (!rect || rect.width < 0 || rect.height < 0) {
        hideVerifyHoverButton(true);
        return;
    }

    const context = buildHoverVerificationContext(target);
    if (!context) {
        hideVerifyHoverButton(true);
        return;
    }

    verifyHoverTarget = target;
    verifyHoverContext = context;
    verifyHoverAnchor = createFactAnchorForNode(target);
    button.style.display = 'block';
    positionVerifyHoverButton();
}

function getSelectionVerificationSource() {
    const selection = window.getSelection ? window.getSelection() : null;
    if (!selection || selection.rangeCount < 1 || selection.isCollapsed) {
        return null;
    }

    const range = selection.getRangeAt(0);
    const commonNode = range.commonAncestorContainer && range.commonAncestorContainer.nodeType === Node.ELEMENT_NODE
        ? range.commonAncestorContainer
        : (range.commonAncestorContainer ? range.commonAncestorContainer.parentElement : null);
    if (!commonNode || (commonNode.closest && commonNode.closest('#sgpt-panel'))) {
        return null;
    }

    const text = normalizeWhitespace(selection.toString() || '');
    if (!text || text.replace(/[^\p{L}\p{N}]+/gu, '').length < MIN_SELECTION_ACTION_LENGTH) {
        return null;
    }

    const clientRects = range.getClientRects ? Array.from(range.getClientRects()) : [];
    let rect = clientRects.length ? clientRects[clientRects.length - 1] : range.getBoundingClientRect();
    if ((!rect || rect.width <= 0 || rect.height <= 0) && commonNode && typeof commonNode.getBoundingClientRect === 'function') {
        rect = commonNode.getBoundingClientRect();
    }
    if (!rect || rect.width <= 0 || rect.height <= 0) {
        return null;
    }

    return {
        context: buildSelectionVerificationContext(text, commonNode),
        anchor: Object.assign(createFactAnchorForNode(commonNode), {
            rect: cloneAnchorRect(rect),
        }),
        right: Math.round(rect.right),
        top: Math.round(rect.top - 36),
    };
}

function schedulePositionVerifyActionButton(delayMs) {
    if (selectionActionButtonTimer) {
        window.clearTimeout(selectionActionButtonTimer);
    }

    selectionActionButtonTimer = window.setTimeout(function () {
        selectionActionButtonTimer = null;
        positionVerifyActionButton();
    }, typeof delayMs === 'number' ? delayMs : 30);
}

function positionVerifyActionButton() {
    const button = ensureVerifyActionButton();
    const toolboxButton = ensureSelectionToolboxActionButton();
    if (panel) {
        button.style.display = 'none';
        verifyActionContext = '';
        toolboxButton.style.display = 'none';
        selectionToolboxContext = '';
        return;
    }

    const source = getSelectionVerificationSource();
    if (!source) {
        button.style.display = 'none';
        verifyActionContext = '';
        toolboxButton.style.display = 'none';
        selectionToolboxContext = '';
        if (verifyHoverTarget) {
            showVerifyHoverButtonForTarget(verifyHoverTarget);
        }
        return;
    }

    hideVerifyHoverButton(false);
    verifyActionContext = source.context;
    verifyActionAnchor = source.anchor || null;
    selectionToolboxContext = source.context;
    selectionToolboxAnchor = source.anchor || null;

    toolboxButton.style.display = 'block';
    button.style.display = 'block';

    const verifyRect = getButtonRectForPlacement(button, 92, 30);
    const toolboxRect = getButtonRectForPlacement(toolboxButton, 116, 30);
    const spacing = 8;
    const verifyLeft = source.right - verifyRect.width;
    const toolboxLeft = verifyLeft - spacing - toolboxRect.width;

    setComposerActionButtonCoordinates(toolboxButton, toolboxLeft, source.top);
    setComposerActionButtonCoordinates(button, verifyLeft, source.top);
}

function positionComposerActionButton() {
    const button = ensureComposerActionButton();
    if (composerActionButtonDragState && composerActionButtonDragState.dragging) {
        return;
    }

     if (panel) {
        button.style.display = 'none';
        const quickButton = ensureQuickResponseActionButton();
        quickButton.style.display = 'none';
        return;
    }

    if (!activeComposer || !document.contains(activeComposer)) {
        button.style.display = 'none';
        const quickButton = ensureQuickResponseActionButton();
        quickButton.style.display = 'none';
        return;
    }

    const anchor = getComposerActionButtonAnchorPosition(button, 'above');
    if (!anchor) {
        button.style.display = 'none';
        return;
    }

    button.style.display = 'block';
    const left = anchor.left + (composerActionButtonDragOffset ? composerActionButtonDragOffset.left : 0);
    const top = anchor.top + (composerActionButtonDragOffset ? composerActionButtonDragOffset.top : 0);
    setComposerActionButtonCoordinates(button, left, top);
    positionQuickResponseActionButton();
}

function positionQuickResponseActionButton() {
    const button = ensureQuickResponseActionButton();
    if (quickResponseActionButtonDragState && quickResponseActionButtonDragState.dragging) {
        return;
    }

    if (panel || !activeComposer || !document.contains(activeComposer)) {
        button.style.display = 'none';
        return;
    }

    const anchor = getQuickResponseActionButtonAnchorPosition();
    if (!anchor) {
        button.style.display = 'none';
        return;
    }

    let left = anchor.left;
    let top = anchor.top;

    if (quickResponseActionButtonDragOffset) {
        left = anchor.left + quickResponseActionButtonDragOffset.left;
        top = anchor.top + quickResponseActionButtonDragOffset.top;
    }

    button.style.display = 'block';
    setComposerActionButtonCoordinates(button, left, top);
}

function setPanelCoordinates(left, top) {
    if (!panel) {
        return;
    }

    const clamped = clampFixedPosition(left, top, panel, 12);
    panel.style.left = Math.round(clamped.left) + 'px';
    panel.style.top = Math.round(clamped.top) + 'px';
    panel.style.right = 'auto';
    panel.style.bottom = 'auto';
}

function enableReplyPanelDragging(handle, box) {
    if (!handle || !box || handle.dataset.dragReady === 'true') {
        return;
    }

    handle.dataset.dragReady = 'true';

    handle.addEventListener('pointerdown', function (event) {
        if (event.button !== 0 || !box.isConnected || (event.target && event.target.closest && event.target.closest('#sgpt-close'))) {
            return;
        }

        const rect = box.getBoundingClientRect();
        panelDragState = {
            pointerId: event.pointerId,
            startX: event.clientX,
            startY: event.clientY,
            offsetX: event.clientX - rect.left,
            offsetY: event.clientY - rect.top,
            dragging: false,
        };

        if (typeof handle.setPointerCapture === 'function') {
            try {
                handle.setPointerCapture(event.pointerId);
            } catch (error) {
            }
        }
    });

    handle.addEventListener('keydown', function (event) {
        if (event.key !== 'Escape') {
            return;
        }

        panelManualPosition = null;
        positionPanelNearComposer();
        event.preventDefault();
    });

    handle.addEventListener('pointermove', function (event) {
        if (!panelDragState || panelDragState.pointerId !== event.pointerId || !panel || !panel.isConnected) {
            return;
        }

        const distance = Math.max(Math.abs(event.clientX - panelDragState.startX), Math.abs(event.clientY - panelDragState.startY));
        if (!panelDragState.dragging && distance < 4) {
            return;
        }

        panelDragState.dragging = true;
        handle.style.cursor = 'grabbing';
        setPanelCoordinates(
            event.clientX - panelDragState.offsetX,
            event.clientY - panelDragState.offsetY
        );
    });

    function finishReplyPanelDrag(event) {
        if (!panelDragState) {
            return;
        }

        if (event && panelDragState.pointerId != null && panelDragState.pointerId !== event.pointerId) {
            return;
        }

        if (panelDragState.dragging && panel && panel.isConnected) {
            const rect = panel.getBoundingClientRect();
            panelManualPosition = {
                left: Math.round(rect.left),
                top: Math.round(rect.top),
            };
        }

        if (event && typeof handle.releasePointerCapture === 'function') {
            try {
                if (handle.hasPointerCapture && handle.hasPointerCapture(event.pointerId)) {
                    handle.releasePointerCapture(event.pointerId);
                }
            } catch (error) {
            }
        }

        handle.style.cursor = 'grab';
        panelDragState = null;
        positionPanelNearComposer();
    }

    handle.addEventListener('pointerup', finishReplyPanelDrag);
    handle.addEventListener('pointercancel', finishReplyPanelDrag);
}

function positionPanelNearComposer() {
    if (!panel) return;
    if (panelDragState && panelDragState.dragging) {
        return;
    }

    if (!activeComposer || !document.contains(activeComposer)) {
        activeComposer = findEditableTarget(document.activeElement);
    }

    const minMargin = 12;
    const panelWidth = Math.min(440, Math.max(320, window.innerWidth - (minMargin * 2)));
    panel.style.width = panelWidth + 'px';

    if (panelManualPosition) {
        setPanelCoordinates(panelManualPosition.left, panelManualPosition.top);
        return;
    }

    if (!activeComposer) {
        panel.style.width = panelWidth + 'px';
        panel.style.left = 'auto';
        panel.style.top = 'auto';
        panel.style.right = '16px';
        panel.style.bottom = '16px';
        return;
    }

    const rect = activeComposer.getBoundingClientRect();
    const spacing = 12;

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

    setPanelCoordinates(left, top);
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
    const activeMarks = pruneMarkedElements();
    refreshMarkedElementPresentation();

    if (activeMarks.length) {
        activeReplyContextMeta = {
            source: 'marked',
            markedCount: activeMarks.length,
            markedLabelMode: markedContextLabelMode,
            markedExpansionMode: markedContextExpansionMode,
        };
        return activeMarks.map(function (el, i) {
            return buildMarkedContextHeader(el, i) + '\n' + getReadableContext(el);
        }).join('\n\n---\n\n');
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
    const expansionRoot = markedContextExpansionMode === 'document'
        ? (document.body || document.documentElement || el)
        : (markedContextExpansionMode === 'current'
            ? el
            : ((el && el.parentElement) ? el.parentElement : el));
    const primaryNode = expansionRoot || el;
    const primaryText = primaryNode ? convertNodeToReadableText(primaryNode.cloneNode(true)) : '';

    // 1. Include the selected element or the requested parent-expansion root
    if (markedContextExpansionMode === 'document') {
        parts.push(window.top === window ? '[Visible page/document text]' : '[Visible iframe/frame document text]');
        parts.push(clipText(primaryText, 12000));
        return parts.join('\n\n');
    }

    parts.push(primaryNode !== el ? clipText(primaryText, 2600) : primaryText);

    if (markedContextExpansionMode === 'parent-children' && primaryNode && primaryNode.children && primaryNode.children.length) {
        const siblingSummaries = [];
        const children = Array.from(primaryNode.children);
        for (let index = 0; index < children.length; index += 1) {
            const child = children[index];
            if (!child || child === el || child.closest && child.closest('#sgpt-panel, #sgpt-factbox, #sgpt-verify-action, #sgpt-verify-hover')) {
                continue;
            }

            const childText = normalizeWhitespace(convertNodeToReadableText(child.cloneNode(true)));
            if (!childText) {
                continue;
            }

            const childDescriptor = buildElementCssDescriptor(child);
            siblingSummaries.push((childDescriptor ? (childDescriptor + ': ') : '') + clipText(childText, 220));
            if (siblingSummaries.length >= 4) {
                break;
            }
        }

        if (siblingSummaries.length) {
            parts.push('[Nearby child blocks]');
            parts.push(siblingSummaries.map(function (entry) {
                return '- ' + entry;
            }).join('\n'));
        }
    }

    // 2. Look for outer container used by Facebook
    const fbContainer = primaryNode && primaryNode.closest ? primaryNode.closest('[data-ad-preview="message"]') : null;
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
    const bgImages = extractBackgroundImagesAround(primaryNode || el);
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
    const sendingState = snapshot.sending_state || {};
    const hasSendingEntries = (countersSnapshot.sending || 0) > 0;
    const hasActiveSending = !!sendingState.active && !sendingState.is_stale;
    const canForceRelease = !!adminIngestEnabled && hasSendingEntries && (!adminFlushInProgress || !!sendingState.is_stale);

    const toggle = adminActivitiesControl.querySelector('[data-role="toggle"]');
    const sendNowButton = adminActivitiesControl.querySelector('[data-role="send-now"]');
    const forceReleaseButton = adminActivitiesControl.querySelector('[data-role="force-release"]');
    const state = adminActivitiesControl.querySelector('[data-role="state"]');
    const progress = adminActivitiesControl.querySelector('[data-role="progress"]');
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

    if (sendNowButton) {
        sendNowButton.disabled = !adminIngestEnabled || hasActiveSending;
        sendNowButton.textContent = hasActiveSending
            ? ('Sending… ' + Math.max(0, Number(sendingState.elapsed_seconds) || 0) + 's')
            : 'Send queue now';
        sendNowButton.style.opacity = sendNowButton.disabled ? '0.55' : '1';
        sendNowButton.style.cursor = sendNowButton.disabled ? 'not-allowed' : 'pointer';
    }

    if (forceReleaseButton) {
        forceReleaseButton.disabled = !canForceRelease;
        forceReleaseButton.textContent = sendingState.is_stale
            ? ('Force release stuck (' + Math.max(0, Number(sendingState.elapsed_seconds) || 0) + 's)')
            : 'Force release stuck';
        forceReleaseButton.style.opacity = forceReleaseButton.disabled ? '0.55' : '1';
        forceReleaseButton.style.cursor = forceReleaseButton.disabled ? 'not-allowed' : 'pointer';
    }

    if (state) {
        state.textContent = adminLastStatusText;
    }

    if (progress) {
        if (sendingState.active) {
            progress.style.display = 'block';
            progress.textContent = sendingState.is_stale
                ? ('Waiting on remote reply for ' + (sendingState.elapsed_seconds || 0) + 's. Batch ' + (sendingState.batch_size || sendingState.attempted || 0) + ' now looks stuck and can be released.')
                : ('Remote send in progress. Batch ' + (sendingState.batch_size || sendingState.attempted || 0) + ' · elapsed ' + (sendingState.elapsed_seconds || 0) + 's · queue after batch ' + (sendingState.queue_remaining_after_batch || 0) + '.');
            progress.style.color = sendingState.is_stale ? '#9a3412' : '#0f766e';
        } else {
            progress.style.display = 'none';
            progress.textContent = '';
        }
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
    if (!isFacebookAdminActivitiesPage() || !adminFeatureEnabled) {
        if (adminActivitiesControl) {
            adminDebugConsoleInfo('[TN Social Tools] Removing admin_activities overlay because the route no longer matches or the feature is disabled.', {
                version: EXTENSION_VERSION,
                url: location.href,
                feature_enabled: adminFeatureEnabled,
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
        '<div data-role="progress" style="display:none; margin:-2px 0 8px 0; font-size:11px; line-height:1.35; color:#0f766e;"></div>',
        '<div style="display:flex; gap:8px; flex-wrap:wrap;">',
        '<button type="button" data-role="toggle" style="border:none; border-radius:999px; padding:6px 10px; color:#fff; cursor:pointer;">Enable activity statistics</button>',
        '<button type="button" data-role="send-now" style="border:none; border-radius:999px; padding:6px 10px; color:#fff; background:#0369a1; cursor:pointer;">Send queue now</button>',
        '<button type="button" data-role="force-release" style="border:none; border-radius:999px; padding:6px 10px; color:#fff; background:#7c2d12; cursor:pointer;">Force release stuck</button>',
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

    control.querySelector('[data-role="send-now"]').addEventListener('click', async function () {
        if (!adminIngestEnabled || adminFlushInProgress) {
            return;
        }

        await flushAdminActivitiesToTools('manual-send-now', {
            manualRequested: true,
            forceReleaseSending: false,
        });
    });

    control.querySelector('[data-role="force-release"]').addEventListener('click', async function () {
        if (!adminIngestEnabled || adminFlushInProgress) {
            return;
        }

        await flushAdminActivitiesToTools('manual-force-release', {
            manualRequested: true,
            forceReleaseSending: true,
        });
    });

    if (!appendToDocumentBody(control)) {
        return null;
    }
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

    if (platform.id === 'soundcloud') {
        networkMonitorInjected = !!soundCloudDirectHookReady;
        if (isSupportedSoundCloudInsightsPage()) {
            setSoundCloudStatusText(soundCloudDirectHookReady
                ? 'SoundCloud insights page detected. Dedicated GraphQL hook is ready and waiting for captures...'
                : 'SoundCloud insights page detected. Waiting for dedicated GraphQL hook...');
            reportSoundCloudPageStatus();
        }
        return;
    }

    if (platform.id === 'facebook' && !adminFeatureEnabled && !(participantScannerFeatureEnabled && isFacebookParticipantRequestsPage())) {
        return;
    }

    if (platform.id === 'soundcloud' && typeof platform.isSupportedPage === 'function' && !platform.isSupportedPage(location)) {
        setSoundCloudStatusText('Current SoundCloud page is not a supported insights / for-artists view.');
        reportSoundCloudPageStatus();
        return;
    }

    const script = document.createElement('script');
    script.src = safeRuntimeGetURL('js/injected/network-monitor.js');
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

    if (isSoundCloudPage()) {
        setSoundCloudStatusText('Supported SoundCloud insights page detected. Waiting for GraphQL traffic...');
        reportSoundCloudPageStatus();
    }

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

    if (isSoundCloudPage()) {
        resetSoundCloudAutoIngestOnInsightsEntry(previousHref, reason);
    }

    lastObservedLocationHref = location.href;
    refreshToolsRssSiteMatches();
    ensureAdminActivitiesControl();
    ensureSoundCloudInsightsControl();
    if (isFacebookParticipantRequestsPage()) {
        syncParticipantRequestRuntimePreference();
    } else {
        clearParticipantRequestEnhancements();
    }

    if (isSoundCloudPage()) {
        if (isSupportedSoundCloudInsightsPage()) {
            injectNetworkMonitor();
            ensureSoundCloudInsightsControl();
            setSoundCloudStatusText(networkMonitorInjected
                ? 'SoundCloud insights page detected. Waiting for supported GraphQL captures...'
                : 'SoundCloud insights page detected, but monitor injection has not completed yet.');
        } else {
            setSoundCloudStatusText('Current SoundCloud page is not a supported insights / for-artists view.');
        }
        reportSoundCloudPageStatus();
    }

    if (!isFacebookAdminActivitiesPage()) {
        adminDebugConsoleInfo('[TN Social Tools] Route changed, but this is not a Facebook admin_activities page.', {
            version: EXTENSION_VERSION,
            reason: reason,
            url: location.href,
        });
        return;
    }

    if (!adminFeatureEnabled) {
        adminLastStatusText = 'Facebook admin activity statistics are disabled in the config page.';
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

    if (response.ok) {
        return response;
    }

    const runtimeErrorMessage = response.error || response.message || 'Could not submit admin activity batch.';
    if (!shouldFallbackFacebookIngestToDirectFetch(runtimeErrorMessage)) {
        throw new Error(runtimeErrorMessage);
    }

    const settings = await getToolsRuntimeSettings();
    const apiToken = settings && settings.toolsApiToken ? String(settings.toolsApiToken).trim() : '';
    if (!apiToken) {
        throw new Error(runtimeErrorMessage || 'Missing Tools API token. Save it in the extension popup first.');
    }

    const baseUrl = getToolsBaseUrl(!!(settings && settings.devMode));
    debugLog({
        level: 'warning',
        category: 'facebook-admin-ingest',
        message: 'Extension runtime handoff failed. Retrying Facebook admin batch directly from the page context.',
        meta: {
            baseUrl: baseUrl,
            runtime_error: runtimeErrorMessage,
            entry_count: Array.isArray(entries) ? entries.length : 0,
        },
    });

    const directResponse = await callFacebookAdminIngestDirect(apiToken, baseUrl, {
        entries: entries,
    });

    if (!directResponse.ok) {
        throw new Error(directResponse.error || directResponse.message || runtimeErrorMessage || 'Could not submit admin activity batch.');
    }

    debugLog({
        level: 'info',
        category: 'facebook-admin-ingest',
        message: 'Facebook admin batch succeeded through direct Tools API fallback.',
        meta: {
            baseUrl: baseUrl,
            entry_count: Array.isArray(entries) ? entries.length : 0,
            received: typeof directResponse.data?.received === 'number' ? directResponse.data.received : null,
            created: typeof directResponse.data?.created === 'number' ? directResponse.data.created : null,
            updated: typeof directResponse.data?.updated === 'number' ? directResponse.data.updated : null,
        },
    });

    return directResponse;
}

async function flushAdminActivitiesToTools(reason, options) {
    const config = options || {};
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

        if (config.forceReleaseSending && typeof adminActivityReporter.releaseSendingEntries === 'function') {
            const releasedCount = adminActivityReporter.releaseSendingEntries({
                reason: reason || 'manual-force-release',
                message: 'Operator forced manual release of stuck sending entries.',
            });
            if (releasedCount > 0) {
                adminLastStatusText = 'Released ' + releasedCount + ' stuck sending entr' + (releasedCount === 1 ? 'y' : 'ies') + '. Retrying now...';
                updateAdminActivitiesControl();
            }
        }

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
        if (!batch.length && (initialSnapshot.totals.sending || 0) > 0) {
            adminLastStatusText = 'Queue has pending sending entries but no eligible retry batch. Use "Force release stuck" to re-queue them.';
            updateAdminActivitiesControl();
            return;
        }

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
            : (config.manualRequested
                ? 'Manual send completed. No eligible queued entries were waiting right now.'
                : 'Listening for admin-log changes. No new detected entries to submit right now.');
        updateAdminActivitiesControl();
    } finally {
        adminActiveSendBatch = null;
        adminFlushInProgress = false;
        updateAdminActivitiesControl();
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
      #sgpt-panel{position:fixed;bottom:16px;right:16px;width:440px;max-width:min(440px,calc(100vw - 24px));max-height:70vh;background:#fff !important;border:1px solid #ccc;border-radius:6px;box-shadow:0 4px 14px rgba(0,0,0,0.15);z-index:2147483647;display:flex;flex-direction:column;font-family:system-ui,sans-serif !important;font-size:14px;color:#0f172a !important;color-scheme:light;isolation:isolate}
      #sgpt-panel,#sgpt-panel *{box-sizing:border-box}
      #sgpt-panel[data-collapsed="true"]{transform:translateX(calc(100% - 42px));transition:transform .3s}
      #sgpt-head{display:flex;align-items:center;background:#008CBA;color:#fff;padding:4px 8px;border-top-left-radius:6px;border-top-right-radius:6px;cursor:grab;user-select:none;touch-action:none}
      #sgpt-close{margin-left:auto;background:transparent;border:none;color:#fff;font-size:18px;cursor:pointer}
      #sgpt-body{flex:1;display:flex;flex-direction:column;padding:8px;overflow:hidden}
      #sgpt-body label{display:flex;flex-direction:column;gap:4px;font-size:12px;font-weight:600;color:#334155 !important}
      #sgpt-body input[type=text],#sgpt-body textarea,#sgpt-body select{width:100%;margin-bottom:6px;border:1px solid #bfc7d1 !important;border-radius:4px;padding:6px 8px;background:#fff !important;color:#111827 !important;-webkit-text-fill-color:#111827 !important;caret-color:#111827 !important;opacity:1 !important;font:13px/1.4 Arial,sans-serif !important;appearance:none}
      #sgpt-body input[type=text]::placeholder,#sgpt-body textarea::placeholder{color:#6b7280 !important;-webkit-text-fill-color:#6b7280 !important;opacity:1 !important}
      #sgpt-body input[type=text]:focus,#sgpt-body textarea:focus,#sgpt-body select:focus{outline:none;border-color:#1999c6 !important;box-shadow:0 0 0 2px rgba(25,153,198,.15)}
      #sgpt-body textarea{resize:vertical;min-height:60px;max-height:160px}
      #sgpt-prompt{min-height:74px;max-height:140px}
      #sgpt-context{background:#f8fafc !important}
      #sgpt-send,#sgpt-mod,#sgpt-verify,#sgpt-paste{margin-right:4px;padding:4px 10px;border:none;border-radius:4px;background:#008CBA;color:#fff;cursor:pointer;font:13px/1.35 Arial,sans-serif !important}
      #sgpt-verify{background:#7c3aed}
      #sgpt-paste{background:#0f766e}
      #sgpt-send[disabled],#sgpt-mod[disabled],#sgpt-verify[disabled],#sgpt-paste[disabled]{opacity:.55;cursor:not-allowed}
      #sgpt-foot{display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap}
      #sgpt-actions{display:flex;align-items:center;gap:8px;flex-wrap:wrap;justify-content:flex-end}
      #sgpt-inline-loader{display:none;align-items:center;gap:7px;padding:4px 10px;border-radius:999px;background:#eff6ff;color:#1d4ed8;font-size:12px;font-weight:600;white-space:nowrap}
      #sgpt-inline-loader[data-visible="true"]{display:inline-flex}
      .sgpt-inline-loader-spinner{width:14px;height:14px;border-radius:50%;border:2px solid rgba(29,78,216,.22);border-top-color:#2563eb;animation:sgpt-inline-spin .8s linear infinite}
      @keyframes sgpt-inline-spin{0%{transform:rotate(0deg)}100%{transform:rotate(360deg)}}
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
      .socialgpt-marked[data-tn-social-mark-mode="mark-id"],.socialgpt-marked[data-tn-social-mark-mode="detailed"]{outline:2px solid rgba(14,165,233,.9) !important;outline-offset:2px !important;position:relative !important;box-shadow:0 0 0 3px rgba(14,165,233,.18) !important}
      .socialgpt-marked[data-tn-social-mark-badge]::after{content:attr(data-tn-social-mark-badge);position:absolute;top:0;left:0;transform:translate(6px,-70%);max-width:min(320px,calc(100% - 12px));padding:3px 8px;border-radius:999px;background:#0f172a;color:#fff;font:11px/1.2 Arial,sans-serif !important;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;box-shadow:0 6px 18px rgba(15,23,42,.24);pointer-events:none;z-index:2147483646}
      .socialgpt-marked[data-tn-social-mark-mode="compact"]::after{background:#0284c7}
    </style>
      <div id="sgpt-head">${ct('contentScript.panelTitle', {}, 'Tornevall Networks Social Media Tools ↔')} <button type="button" id="sgpt-close" aria-label="${escapeHtml(ct('contentScript.closeToolbox', {}, 'Close Toolbox'))}" title="${escapeHtml(ct('contentScript.closeToolbox', {}, 'Close Toolbox'))}">×</button></div>
    <div id="sgpt-body">
      <div id="sgpt-responder-label">${ct('contentScript.responder', {}, 'Responder')}: <span id="sgpt-responder-name" data-name="${frontResponserName || ''}">${frontResponserName || ct('contentScript.loadingResponder', {}, '(loading...)')}</span></div>
      <div id="sgpt-anchor-note">${ct('contentScript.anchorFocused', {}, 'Anchored to the currently focused text field.')}</div>
      <label>${ct('contentScript.promptLabel', {}, 'Prompt')}<textarea id="sgpt-prompt" rows="3" placeholder="${escapeHtml(ct('contentScript.promptPlaceholder', {}, 'Leave blank to use the default reply instruction.'))}"></textarea></label>
      <div class="sgpt-quick-settings">
        <label>${ct('contentScript.moodLabel', {}, 'Mood')}<select id="sgpt-mood">
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
        <label>${ct('contentScript.modelLabel', {}, 'Model')}<select id="sgpt-model"></select></label>
        <label>${ct('contentScript.lengthLabel', {}, 'Length')}<select id="sgpt-length">
            <option value="auto">${ct('contentScript.lengthAuto', {}, 'Let GPT decide')}</option>
            <option value="as-short-as-possible">${ct('contentScript.lengthAsShort', {}, 'As short as possible')}</option>
            <option value="shortest-possible">${ct('contentScript.lengthShortest', {}, 'At maximum one sentence. Possibly a one-liner.')}</option>
            <option value="very-short">${ct('contentScript.lengthVeryShort', {}, '2–3 sentences (very short)')}</option>
            <option value="short">${ct('contentScript.lengthShort', {}, '4–6 sentences (short)')}</option>
            <option value="medium">${ct('contentScript.lengthMedium', {}, '6–10 sentences (medium)')}</option>
            <option value="extreme">${ct('contentScript.lengthExtreme', {}, 'Extreme. You want your own book.')}</option>
            <option value="long">${ct('contentScript.lengthLong', {}, 'Extended (whatever is needed)')}</option>
          </select></label>
      </div>
      <div class="sgpt-quick-settings" style="grid-template-columns:repeat(4,minmax(0,1fr));">
        <label>${ct('contentScript.customMoodLabel', {}, 'Custom mood')}<input type="text" id="sgpt-custom"></label>
        <label>${ct('contentScript.changeRequestLabel', {}, 'Change request')}<input type="text" id="sgpt-modifier" placeholder="${escapeHtml(ct('contentScript.changeRequestPlaceholder', {}, 'Optional: what should change?'))}"></label>
        <label>${ct('contentScript.languageLabel', {}, 'Language')}<select id="sgpt-language">
            <option value="auto">${ct('option.language.autoContext', {}, 'Same as the selected content/context')}</option>
            <option value="sv">${ct('option.language.sv', {}, 'Swedish')}</option>
            <option value="en">${ct('option.language.en', {}, 'English')}</option>
            <option value="da">${ct('option.language.da', {}, 'Danish')}</option>
            <option value="no">${ct('option.language.no', {}, 'Norwegian')}</option>
            <option value="de">${ct('option.language.de', {}, 'German')}</option>
            <option value="fr">${ct('option.language.fr', {}, 'French')}</option>
            <option value="es">${ct('option.language.es', {}, 'Spanish')}</option>
        </select></label>
        <label>${ct('contentScript.dockModeLabel', {}, 'Panel mode')}<select id="sgpt-dock-mode">
            <option value="auto">${ct('contentScript.dockModeAuto', {}, 'Auto near field')}</option>
            <option value="right">${ct('contentScript.dockModeRight', {}, 'Attached right')}</option>
            <option value="left">${ct('contentScript.dockModeLeft', {}, 'Attached left')}</option>
            <option value="bottom-right">${ct('contentScript.dockModeBottomRight', {}, 'Bottom right')}</option>
            <option value="bottom-left">${ct('contentScript.dockModeBottomLeft', {}, 'Bottom left')}</option>
        </select></label>
      </div>
      <div class="sgpt-inline-tools"><span>${ct('contentScript.contextLabel', {}, 'Context')}</span><div class="sgpt-inline-actions"><button type="button" id="sgpt-context-mark" aria-pressed="false">${ct('contentScript.markContext', {}, 'Mark context')}</button><button type="button" id="sgpt-context-import">${ct('contentScript.import', {}, 'Import')}</button><button type="button" id="sgpt-context-clear">${ct('contentScript.clear', {}, 'Clear')}</button></div></div>
      <textarea id="sgpt-context" placeholder="${escapeHtml(ct('contentScript.contextPlaceholder', {}, 'Optional context: import visible page context or write your own notes here.'))}"></textarea>
      <label>${ct('contentScript.outputLabel', {}, 'Output')}<textarea id="sgpt-out"></textarea></label>
      <div id="sgpt-foot"><div id="sgpt-compose-status">${ct('contentScript.composeStatus', {}, 'Select a text field to enable paste/fill actions.')}</div><div id="sgpt-actions"><div id="sgpt-inline-loader" aria-live="polite" aria-hidden="true"><span class="sgpt-inline-loader-spinner"></span><span id="sgpt-inline-loader-label">${ct('contentScript.generating', {}, 'Generating…')}</span></div><button id="sgpt-send">${ct('contentScript.generate', {}, 'Generate')}</button><button id="sgpt-mod">${ct('contentScript.refresh', {}, 'Refresh')}</button><button id="sgpt-verify">${ct('contentScript.verifyFact', {}, 'Verify fact')}</button><button id="sgpt-paste">${ct('contentScript.pasteIntoField', {}, 'Paste into field')}</button></div></div>
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
    if (!appendToDocumentBody(panel)) {
        panel = null;
        return null;
    }
    refreshLocalizedPanelUi();

    const panelHeader = panel.querySelector('#sgpt-head');
    if (panelHeader) {
        panelHeader.tabIndex = 0;
        panelHeader.title = ct('contentScript.dragToolboxTitle', {}, 'Drag to move Toolbox. Press Escape to snap it back near the active field.');
        enableReplyPanelDragging(panelHeader, panel);
    }

    panel.querySelector('#sgpt-head').addEventListener('dblclick', () => {
        panel.dataset.collapsed = panel.dataset.collapsed === 'true' ? 'false' : 'true';
    });

    const closeButton = panel.querySelector('#sgpt-close');
    closeButton.addEventListener('pointerdown', function (event) {
        event.preventDefault();
        event.stopPropagation();
    });
    closeButton.addEventListener('click', function (event) {
        event.preventDefault();
        event.stopPropagation();
        closeReplyPanel();
    });

    panel.querySelector('#sgpt-send').addEventListener('click', () => sendGPT(false));
    panel.querySelector('#sgpt-mod').addEventListener('click', () => sendGPT(true));
    panel.querySelector('#sgpt-verify').addEventListener('click', () => startFactVerification());
    panel.querySelector('#sgpt-model').addEventListener('change', function () {
        preferredToolsModel = normalizeWhitespace(this.value || '');
        safeStorageSyncSet({preferredToolsModel: preferredToolsModel});
    });
    panel.querySelector('#sgpt-dock-mode').addEventListener('change', function () {
        panelDockMode = normalizePanelDockMode(this.value || panelDockMode);
        panelManualPosition = null;
        safeStorageSyncSet({panelDockMode: panelDockMode});
        positionPanelNearComposer();
    });
    panel.querySelector('#sgpt-paste').addEventListener('click', () => {
        const result = pasteTextIntoActiveComposer(panel.querySelector('#sgpt-out').value, {submit: false});
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
        clearMarkedContextSelection();
        stopMarkModeKeepingCurrentContext();
        activeReplyContextMeta = null;
        setPanelContextValue('');
        updatePanelAnchorNote();
        updatePanelComposerActions(ct('contentScript.contextCleared', {}, 'Context cleared. You can import fresh context or write your own.'), 'success');
    });
    panel.querySelector('#sgpt-context-mark').addEventListener('click', async () => {
        const response = await setPanelMarkMode(!isClickMarkingActive);
        if (response && response.ok) {
            updatePanelComposerActions(response.enabled
                ? ct('contentScript.markModeStarted', {}, 'Mark mode is active. Click page elements to add/remove context blocks.')
                : ct('contentScript.markModeStopped', {}, 'Mark mode stopped. Current marked context remains in the box.'), response.enabled ? 'success' : undefined);
        } else {
            updatePanelComposerActions(ct('contentScript.markModeUnavailable', {}, 'Could not toggle mark mode in this tab.'), 'error');
        }
    });
    panel.querySelector('#sgpt-out').addEventListener('input', () => updatePanelComposerActions());
    panel.querySelector('#sgpt-modifier').addEventListener('input', () => updatePanelComposerActions());

    positionPanelNearComposer();
    updatePanelComposerActions();
    syncPanelMarkModeState();
    positionVerifyActionButton();
    populatePanelModelOptions(preferredToolsModel || defaultToolsModel);
    panel.querySelector('#sgpt-dock-mode').value = panelDockMode;

    return panel;
}

function closeReplyPanel() {
    if (!panel) {
        return;
    }

    clearMarkedContextSelection();
    panel.remove();
    panel = null;
    panelDragState = null;
    panelManualPosition = null;
    panelAttachedComposer = null;
    panelContextDirty = false;
    positionComposerActionButton();
    positionVerifyActionButton();
    if (verifyHoverTarget) {
        showVerifyHoverButtonForTarget(verifyHoverTarget);
    }
}

function openReplyPanel() {
    const p = createPanel();

    p.dataset.collapsed = 'false';
    panelAttachedComposer = activeComposer && document.contains(activeComposer) ? activeComposer : null;
    resetReplyPanelTransientFields();
    positionPanelNearComposer();
    updatePanelAnchorNote();
    updatePanelComposerActions();
    refreshToolsRssSiteMatches();
    syncPanelMarkModeState();
    positionVerifyActionButton();
    p.querySelector('#sgpt-prompt').focus();

    hideVerifyHoverButton(true);
    isClickMarkingActive = false;
    safeSendRuntimeMessage({type: 'RESET_MARK_MODE'});

    safeStorageSyncGet(['responderName', 'autoDetectResponder', 'defaultMood', 'defaultCustomMood', 'defaultResponseLanguage', 'lastResponseLength', 'availableToolsModels', 'defaultToolsModel', 'preferredToolsModel', 'panelDockMode'], (data) => {
        const label = p.querySelector('#sgpt-responder-name');
        const moodField = p.querySelector('#sgpt-mood');
        const customMoodField = p.querySelector('#sgpt-custom');
        const languageField = p.querySelector('#sgpt-language');
        const lengthField = p.querySelector('#sgpt-length');
        const modelField = p.querySelector('#sgpt-model');
        const dockModeField = p.querySelector('#sgpt-dock-mode');

        availableToolsModels = normalizeAvailableToolsModels(data.availableToolsModels || availableToolsModels);
        defaultToolsModel = resolveDefaultToolsModel(availableToolsModels, data.defaultToolsModel || defaultToolsModel);
        preferredToolsModel = resolveDefaultToolsModel(availableToolsModels, data.preferredToolsModel || preferredToolsModel || defaultToolsModel);
        panelDockMode = normalizePanelDockMode(data.panelDockMode || panelDockMode);

        if (modelField) {
            populatePanelModelOptions(preferredToolsModel || defaultToolsModel);
        }
        if (dockModeField) {
            dockModeField.value = panelDockMode;
        }

        if (moodField && data.defaultMood) {
            moodField.value = data.defaultMood;
        }

        if (lengthField && data.lastResponseLength) {
            lengthField.value = data.lastResponseLength;
        }

        if (customMoodField) {
            customMoodField.value = data.defaultCustomMood || '';
        }

        if (languageField) {
            languageField.value = normalizeResponseLanguageChoice(data.defaultResponseLanguage || defaultResponseLanguage);
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

    refreshAvailableModelsForPanel(false);
}

function openReplyPanelWithImportedContext(importedContext, options) {
    const normalizedContext = normalizeWhitespace(importedContext || '');
    const message = options && options.message
        ? String(options.message)
        : ct('contentScript.contextImported', {}, 'Context imported into Toolbox.');

    const anchorNode = options && options.anchorNode && document.contains(options.anchorNode)
        ? options.anchorNode
        : null;
    if (anchorNode) {
        activeComposer = anchorNode;
    }

    openReplyPanel();

    if (!normalizedContext || !panel) {
        return;
    }

    setPanelContextValue(normalizedContext, {dirty: true});
    panelContextDirty = true;
    updatePanelAnchorNote();
    updatePanelComposerActions(message, 'success');
}

// ---------------------------------------------
// SEND TO GPT
// ---------------------------------------------
function sendGPT(mod, mode) {
    const ctx = getContextForAiRequest({includeCurrentTarget: false});
    const promptField = panel.querySelector('#sgpt-prompt');
    const prompt = promptField ? promptField.value.trim() : '';
    const effectivePrompt = prompt || DEFAULT_REPLY_PROMPT;
    const modelField = panel.querySelector('#sgpt-model');
    const model = modelField && modelField.value ? modelField.value : getPreferredFactCheckModel();
    const refreshMeta = mod ? getRefreshRequestMeta() : null;
    showLoader(refreshMeta ? refreshMeta.loaderLabel : ct('contentScript.generating', {}, 'Generating…'));

    const selectedLength = panel.querySelector('#sgpt-length').value;
    safeStorageSyncSet({ lastResponseLength: selectedLength });

    const moodField = panel.querySelector('#sgpt-mood');
    const customMoodField = panel.querySelector('#sgpt-custom');
    const languageField = panel.querySelector('#sgpt-language');
    const outputField = panel.querySelector('#sgpt-out');
    const responderField = panel.querySelector('#sgpt-responder-name');
    const responderName = responderField && responderField.dataset
        ? ((responderField.dataset.name || '').trim() || frontResponserName || 'Anonymous')
        : (frontResponserName || 'Anonymous');

    pendingAiRequestMode = mode || (refreshMeta ? refreshMeta.requestMode : 'reply');

    safeSendRuntimeMessage({
        type: 'GPT_REQUEST',
        context: ctx,
        userPrompt: effectivePrompt,
        modifier: refreshMeta ? refreshMeta.modifier : '',
        mood: moodField ? moodField.value : '',
        responseLength: selectedLength,
        customMood: customMoodField ? customMoodField.value.trim() : '',
        responseLanguage: languageField ? languageField.value : defaultResponseLanguage,
        previousReply: refreshMeta ? refreshMeta.previousReply : '',
        model,
        responderName,
        requestMode: mode || (refreshMeta ? refreshMeta.requestMode : 'reply')
    });
}

// ---------------------------------------------
// MARK-MODE CLICK HANDLER
// ---------------------------------------------
function toggleMarkedContextTarget(target) {
    if (!target) {
        return;
    }

    const already = markedElements.includes(target);
    if (already) {
        clearMarkedElementPresentation(target);
        markedElements = markedElements.filter(el => el !== target);
    } else {
        markedElements.push(target);
    }
    refreshMarkedElementPresentation();
    if (panel) {
        setPanelContextValue(getCurrentPanelContextValue());
        updatePanelAnchorNote();
        updatePanelComposerActions();
    }
}

function resolveMarkModeTarget(eventTarget) {
    if (isSocialToolsUiElement(eventTarget)) {
        return null;
    }

    const element = getEventTargetElement(eventTarget);
    return element ? findFullContextNode(element) : null;
}

document.addEventListener('pointerdown', e => {
    if (!isClickMarkingActive || e.button !== 0) return;
    const target = resolveMarkModeTarget(e.target);
    if (!target) return;
    toggleMarkedContextTarget(target);
    e.preventDefault();
    e.stopPropagation();
}, true);

document.addEventListener('click', e => {
    if (!isClickMarkingActive) return;
    const target = resolveMarkModeTarget(e.target);
    if (!target) return;
    e.preventDefault();
    e.stopPropagation();
}, true);

document.addEventListener('focusin', e => {
    const editable = findEditableTarget(e.target);
    if (editable) {
        setActiveComposer(editable);
    }
}, true);

document.addEventListener('selectionchange', () => {
    schedulePositionVerifyActionButton(40);
}, true);

document.addEventListener('mouseup', () => {
    schedulePositionVerifyActionButton(20);
}, true);

document.addEventListener('dblclick', () => {
    schedulePositionVerifyActionButton(24);
}, true);

document.addEventListener('keyup', () => {
    schedulePositionVerifyActionButton(24);
}, true);

document.addEventListener('mouseover', event => {
    if (panel) {
        hideVerifyHoverButton(true);
        return;
    }

    if (verifyHoverButton && verifyHoverButton.contains(event.target)) {
        if (verifyHoverHideTimer) {
            window.clearTimeout(verifyHoverHideTimer);
            verifyHoverHideTimer = null;
        }
        return;
    }

    const target = findVerifiableHoverTarget(event.target);
    if (!target) {
        if (verifyHoverButton && verifyHoverButton.style.display === 'block') {
            return;
        }
        hideVerifyHoverButton(true);
        return;
    }

    if (verifyHoverTarget === target && verifyHoverButton && verifyHoverButton.style.display === 'block') {
        return;
    }

    hideVerifyHoverButton(false);
    verifyHoverTarget = target;
    verifyHoverShowTimer = window.setTimeout(function () {
        verifyHoverShowTimer = null;
        showVerifyHoverButtonForTarget(target);
    }, 220);
}, true);

document.addEventListener('mouseout', event => {
    if (!verifyHoverTarget) {
        return;
    }

    const nextTarget = event.relatedTarget;
    if ((verifyHoverButton && nextTarget && verifyHoverButton.contains(nextTarget)) || (verifyHoverTarget && nextTarget && verifyHoverTarget.contains(nextTarget))) {
        return;
    }

    if (verifyHoverHideTimer) {
        window.clearTimeout(verifyHoverHideTimer);
    }
    verifyHoverHideTimer = window.setTimeout(function () {
        hideVerifyHoverButton(true);
    }, 120);
}, true);

window.addEventListener('resize', () => {
    positionPanelNearComposer();
    positionComposerActionButton();
    positionVerifyActionButton();
    if (verifyHoverTarget) {
        positionVerifyHoverButton();
    }
    positionFactResultBox();
}, true);

window.addEventListener('scroll', () => {
    positionPanelNearComposer();
    positionComposerActionButton();
    positionVerifyActionButton();
    if (verifyHoverTarget) {
        positionVerifyHoverButton();
    }
    positionFactResultBox();
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

function getPreferredFactCheckModel() {
    return resolvePreferredFactCheckModel(preferredFactCheckModel || 'gpt-4o');
}

function getPreferredResponseLanguage() {
    const languageField = panel ? panel.querySelector('#sgpt-language') : null;
    return normalizeResponseLanguageChoice(languageField ? languageField.value : defaultResponseLanguage);
}

function getPreferredVerificationLanguage() {
    return normalizeResponseLanguageChoice(defaultVerifyFactLanguage || defaultResponseLanguage);
}

function getSelectedQuickReplyPreset() {
    return normalizeQuickReplyPresetChoice(defaultQuickReplyPreset);
}

function sanitizeContextForAi(value) {
    const normalized = normalizeWhitespace(value || '');
    if (!normalized || normalized === normalizeWhitespace(getEmptyContextPrompt())) {
        return '';
    }

    return String(value || '').trim();
}

function getContextForAiRequest(options) {
    const settings = options || {};
    const contextField = panel ? panel.querySelector('#sgpt-context') : null;
    const manualContext = sanitizeContextForAi(contextField ? contextField.value : '');
    if (manualContext !== '') {
        return manualContext;
    }

    if (settings.includeCurrentTarget !== false) {
        return sanitizeContextForAi(getCurrentPanelContextValue());
    }

    return '';
}

function buildQuickReplyPrompt(options) {
    const settings = options || {};
    const presetKey = normalizeQuickReplyPresetChoice(settings.presetKey || defaultQuickReplyPreset);
    const preset = QUICK_REPLY_PRESETS[presetKey] || QUICK_REPLY_PRESETS.default;
    const pieces = [preset.instruction];

    if (settings.extraInstruction) {
        pieces.push('Extra quick-reply instruction: ' + settings.extraInstruction);
    }

    if (settings.promptHint) {
        pieces.push('User hint: ' + settings.promptHint);
    }

    return pieces.join('\n\n');
}

function sendQuickReply() {
    if (!panel) {
        openReplyPanel();
    }

    if (!panel) {
        return;
    }

    const moodField = panel.querySelector('#sgpt-mood');
    const customMoodField = panel.querySelector('#sgpt-custom');
    const outputField = panel.querySelector('#sgpt-out');
    const promptField = panel.querySelector('#sgpt-prompt');
    const responderField = panel.querySelector('#sgpt-responder-name');
    const modelField = panel.querySelector('#sgpt-model');
    const responderName = responderField && responderField.dataset
        ? ((responderField.dataset.name || '').trim() || frontResponserName || 'Anonymous')
        : (frontResponserName || 'Anonymous');
    const presetKey = getSelectedQuickReplyPreset();
    const promptHint = promptField ? normalizeWhitespace(promptField.value || '') : '';
    const context = getContextForAiRequest({includeCurrentTarget: true});

    showLoader(ct('contentScript.quickGenerating', {}, 'Generating quick reply…'));
    pendingAiRequestMode = 'quick-reply';
    updatePanelComposerActions(ct('contentScript.quickBuilding', {}, 'Building a quick response from the current comment context…'), 'success');

    safeSendRuntimeMessage({
        type: 'GPT_REQUEST',
        context: context,
        userPrompt: buildQuickReplyPrompt({
            presetKey: presetKey,
            extraInstruction: defaultQuickReplyCustomInstruction,
            promptHint: promptHint,
        }),
        mood: moodField ? moodField.value : '',
        customMood: customMoodField ? customMoodField.value.trim() : '',
        responseLength: 'very-short',
        responseLanguage: getPreferredResponseLanguage(),
        previousReply: outputField ? outputField.value : '',
        model: modelField ? modelField.value : '',
        responderName: responderName,
        requestMode: 'quick-reply'
    });
}

function startFactVerification(contextOverride, options) {
    const settings = options || {};
    const contextField = panel ? panel.querySelector('#sgpt-context') : null;
    const context = sanitizeContextForAi(typeof contextOverride === 'string' ? contextOverride : (contextField ? contextField.value : ''));
    const preserveExistingResultDuringLoading = !!settings.preserveExistingResultDuringLoading && factResultBox && document.contains(factResultBox);

    if (!context) {
        alert(ct('contentScript.verifyNoContext', {}, 'There is no context to verify yet. Import, mark, or write context first.'));
        return;
    }

    if (!settings.keepPosition) {
        factResultBoxManualPosition = null;
    }

    if (!settings.participantAutoSupplement) {
        clearParticipantAnalysisAutoSupplementTimer();
        clearParticipantAnalysisAutoSupplementStatusTimer();
        setParticipantAutoSupplementStatus('', false);
        if (activeParticipantUserAnalysis) {
            activeParticipantUserAnalysis.autoSupplementQueued = false;
            activeParticipantUserAnalysis.autoSupplementInFlight = false;
            activeParticipantUserAnalysis.lastAutoSupplementQueuedAt = 0;
            activeParticipantUserAnalysis.lastAutoSupplementStartedAt = 0;
            activeParticipantUserAnalysis.lastAutoSupplementCompletedAt = 0;
            activeParticipantUserAnalysis.autoSupplementContextSignature = '';
        }
    }

    showLoader(ct('contentScript.verifyingFacts', {}, 'Verifying facts…'), {skipFloating: true});
    clearCurrentSelection();
    if (panel) {
        updatePanelComposerActions(ct('contentScript.verifyStarted', {}, 'Verify started. Collecting context and checking facts now…'), 'success');
    }

    pendingAiRequestMode = 'verify';
    const pageUrl = normalizeFacebookUrlForPrompt(settings.sourceUrl || location.href || '');
    const pageHost = (function () {
        try {
            return pageUrl ? (new URL(pageUrl)).hostname : '';
        } catch (error) {
            return '';
        }
    })();
    const extraData = Object.assign({
        page_url: location.href || '',
        page_title: document.title || '',
        source_label: settings.sourceLabel || 'Fact verification',
        source_url: pageUrl,
        site_host: pageHost,
    }, settings.extraData || {});
    factResultAnchor = settings.anchor || null;
    lastVerificationRequest = {
        context: context,
        anchor: factResultAnchor,
        model: settings.model || getPreferredFactCheckModel(),
        responseLanguage: settings.responseLanguage || getPreferredVerificationLanguage(),
        sourceLabel: settings.sourceLabel || 'Fact verification',
        pendingTitle: settings.pendingTitle || '',
        pendingSubtitle: settings.pendingSubtitle || '',
        resultTitle: settings.resultTitle || '',
        failedTitle: settings.failedTitle || '',
        modeLabel: settings.modeLabel || '',
        showOpenToolboxAction: typeof settings.showOpenToolboxAction === 'boolean' ? settings.showOpenToolboxAction : true,
        participantAnalysisCard: settings.participantAnalysisCard || null,
        participantAnalysisSummary: settings.participantAnalysisSummary || null,
        verificationInstruction: settings.verificationInstruction || '',
        requestMode: settings.requestMode || 'verify',
        sourceUrl: settings.sourceUrl || pageUrl,
        extraData: extraData,
        loadingSteps: settings.loadingSteps || [],
        previewLimit: settings.previewLimit || 280,
        preserveExistingResultDuringLoading: preserveExistingResultDuringLoading,
        participantAutoSupplement: !!settings.participantAutoSupplement,
    };
    if (preserveExistingResultDuringLoading) {
        refreshParticipantAutoSupplementStatus();
        updateParticipantPreviewDebugView();
    } else {
        showFactVerificationPending(context, factResultAnchor, settings.sourceLabel || 'Fact verification', settings);
        updateFactResultLoadingProgress(lastVerificationRequest.requestMode === 'user-analysis' ? 4 : 0, lastVerificationRequest.requestMode === 'user-analysis' ? 'Sending participant context to Tools…' : 'Sending verification request to Tools…');
    }

    safeSendRuntimeMessage({
        type: 'GPT_REQUEST',
        context,
        userPrompt: (settings.verificationInstruction ? settings.verificationInstruction + '\n\n' : '') + 'Search facts and verify the following statements. Include the source/page URL from the supplied metadata in the verification when available. Also consider the site/source credibility and reputation where it materially affects the answer. If you find any false or misleading information, provide a detailed explanation of why it is incorrect. Return a complete answer in readable paragraphs, do not stop mid-sentence, and use Markdown links only for useful sources.',
        requestMode: lastVerificationRequest.requestMode,
        responderName: frontResponserName || 'VerifierBot',
        model: lastVerificationRequest.model,
        responseLanguage: lastVerificationRequest.responseLanguage,
        maxTokens: 900,
        extraData: extraData,
    });

    if (!settings.keepMarks && markedElements.length) {
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

    if (req.type === 'RUN_FACEBOOK_ADMIN_INGEST_MANUAL') {
        if (!isFacebookAdminActivitiesPage()) {
            sendResponse({
                ok: false,
                error: 'The active tab is not a supported Facebook admin activity page.',
                status: buildAdminReporterStatusPayload(),
            });
            return true;
        }

        if (!adminIngestEnabled) {
            sendResponse({
                ok: false,
                error: 'Facebook admin activity statistics are disabled in this tab. Enable them first, then retry the queue send.',
                status: buildAdminReporterStatusPayload(),
            });
            return true;
        }

        flushAdminActivitiesToTools(req.forceRelease ? 'popup-force-release' : 'popup-send-now', {
            manualRequested: true,
            forceReleaseSending: !!(req && req.forceRelease),
        }).then(function () {
            sendResponse({
                ok: true,
                status: buildAdminReporterStatusPayload(),
            });
        }).catch(function (error) {
            sendResponse({
                ok: false,
                error: error && error.message ? error.message : 'Could not run the Facebook admin queue action in this tab.',
                status: buildAdminReporterStatusPayload(),
            });
        });

        return true;
    }

    if (req.type === 'SHOW_LOADER') return showLoader();
    if (req.type === 'HIDE_LOADER') return hideLoader();

    if (req.type === 'TOGGLE_MARK_MODE') {
        isClickMarkingActive = req.enabled;
        updatePanelMarkModeButton(!!req.enabled);
        updatePanelAnchorNote();
    } else if (req.type === 'OPEN_TOOLBOX_FROM_CONTEXT_MENU') {
        const importedContext = normalizeWhitespace(req && req.contextText ? req.contextText : '');
        openReplyPanelWithImportedContext(importedContext, {
            message: ct('contentScript.contextImportedFromMenu', {}, 'Context imported from context menu.'),
        });
    } else if (req.type === 'OPEN_REPLY_PANEL_FROM_POPUP') {
        const selectionSource = getSelectionVerificationSource();
        if (selectionSource && selectionSource.context) {
            openReplyPanelWithImportedContext(selectionSource.context, {
                message: ct('contentScript.contextImportedFromPopup', {}, 'Selected text imported from popup.'),
            });
            sendResponse({ok: true, importedSelection: true});
            return true;
        }

        openReplyPanel();
        sendResponse({ok: true, importedSelection: false});
        return true;
    } else if (req.type === 'OPEN_REPLY_PANEL') {
        openReplyPanel();
    } else if (req.type === 'START_FACT_VERIFICATION_FROM_CONTEXT_MENU') {
        const menuContext = normalizeWhitespace(req && req.contextText ? req.contextText : '');
        startFactVerification(menuContext || undefined, {
            sourceLabel: req && req.sourceLabel ? String(req.sourceLabel) : 'Context menu verify',
            preferPanel: false,
        });
    } else if (req.type === 'GPT_RESPONSE') {
        hideLoader();
        if (shouldHandleIncomingFactResponse(req)) {
            if (activeParticipantUserAnalysis) {
                activeParticipantUserAnalysis.autoSupplementInFlight = false;
                activeParticipantUserAnalysis.lastAutoSupplementCompletedAt = Date.now();
            }
            const effectiveModeLabel = req.ok
                && req.raceVariant === 'with_web_search'
                && req.payload
                && req.payload.web_search
                && req.payload.web_search.used
                ? (((lastVerificationRequest && lastVerificationRequest.modeLabel) || ct('contentScript.participantScannerAnalyzeMode', {}, 'User analysis')) + ' · web search follow-up')
                : (lastVerificationRequest ? lastVerificationRequest.modeLabel : '');
            showFactResultBox(
                req.ok ? getReadablePanelText(req.payload) : getReadablePanelErrorText(req.error || req.payload),
                factResultAnchor,
                {
                    title: req.ok
                        ? ((lastVerificationRequest && lastVerificationRequest.resultTitle) || ct('contentScript.factVerificationTitle', {}, '✅ Fact checking via OpenAI'))
                        : ((lastVerificationRequest && lastVerificationRequest.failedTitle) || ct('contentScript.factVerificationFailedTitle', {}, '⚠️ Fact check failed')),
                    titleColor: req.ok ? '#0284c7' : '#b91c1c',
                    subtitle: buildFactBoxSubtitle(factResultAnchor, lastVerificationRequest ? lastVerificationRequest.responseLanguage : defaultResponseLanguage, !req.ok, effectiveModeLabel),
                    subtitleColor: req.ok ? '#7c3aed' : '#b91c1c',
                    borderColor: req.ok ? '#d8b4fe' : '#fecaca',
                    background: req.ok ? '#fff' : '#fef2f2',
                    links: req.ok ? extractSafeCitationLinks(req.payload) : [],
                    actions: buildFactBoxActions(),
                }
            );
            if (pendingAiRequestMode === 'verify') {
                pendingAiRequestMode = null;
            }
            if (panel) {
                updatePanelComposerActions(req.ok
                    ? (req.hasPendingRaceResult
                        ? ct('contentScript.factCheckComplete', {}, 'Fact check complete. Review the popup result.') + ' Deeper web search is still running…'
                        : ct('contentScript.factCheckComplete', {}, 'Fact check complete. Review the popup result.'))
                    : ct('contentScript.factCheckFailed', {}, 'Fact check failed. Try refresh or think harder.'), req.ok ? 'success' : 'error');
            }
            updateParticipantPreviewDebugView();
            if (activeParticipantUserAnalysis && activeParticipantUserAnalysis.changed) {
                refreshParticipantAutoSupplementStatus();
                scheduleParticipantAnalysisAutoSupplement('post-response');
            } else {
                refreshParticipantAutoSupplementStatus();
            }
            return;
        }

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
                    updatePanelComposerActions(ct('contentScript.toolsRequestFailed', {}, 'Tools request failed. Review the output above before pasting anything.'), 'error');
                }
                pendingAiRequestMode = null;
                return;
            }
        }

        showFactResultBox(req.ok ? getReadablePanelText(req.payload) : getReadablePanelErrorText(req.error || req.payload), factResultAnchor);
        pendingAiRequestMode = null;

    } else if (req.type === 'START_FACT_VERIFICATION') {
        startFactVerification();
    } else if (req.type === 'SOUNDCLOUD_BUFFER_STATUS') {
        const payload = req && req.payload && typeof req.payload === 'object' ? req.payload : {};
        soundCloudBackgroundPendingCaptureCount = typeof payload.pendingCaptureCount === 'number' ? payload.pendingCaptureCount : soundCloudBackgroundPendingCaptureCount;
        soundCloudBackgroundDuplicateCaptureCount = typeof payload.duplicateCaptureCount === 'number' ? payload.duplicateCaptureCount : soundCloudBackgroundDuplicateCaptureCount;
        soundCloudBackgroundLastFlush = payload.lastFlush || soundCloudBackgroundLastFlush;
        if (payload.lastIngest) {
            const bridge = getSoundCloudPageBridge();
            if (bridge && typeof bridge.setStatusText === 'function' && payload.lastFlush && typeof payload.lastFlush.remaining_count === 'number') {
                bridge.setStatusText(payload.lastFlush.remaining_count > 0
                    ? 'Buffered SoundCloud captures were flushed partially. Some captures are still pending.'
                    : 'Buffered SoundCloud captures were flushed into Tools.');
            }
        }
        updateSoundCloudInsightsControl();
        sendResponse({ok: true});
    } else if (req.type === 'GET_SOUNDCLOUD_PAGE_STATUS') {
        sendResponse(buildSoundCloudPageStatusPayload());
    }
});

window.addEventListener('scx-hook-ready', function (event) {
    if (!SOUND_CLOUD_INSIGHTS_CAPTURE_ENABLED || !isSoundCloudPage()) {
        return;
    }

    soundCloudDirectHookReady = true;
    soundCloudDirectHookMeta = event && event.detail && typeof event.detail === 'object' ? event.detail : null;
    setSoundCloudStatusText('SoundCloud insights hook is ready. Waiting for supported GraphQL captures...');
    reportSoundCloudPageStatus();
}, true);

window.addEventListener('scx-graphql-capture', function (event) {
    if (!SOUND_CLOUD_INSIGHTS_CAPTURE_ENABLED || !isSoundCloudPage()) {
        return;
    }

    handleSoundCloudDirectCapture(event && event.detail ? event.detail : null);
}, true);

window.addEventListener('message', function (event) {
    if (!event.data || event.data.source !== 'tn-networks-social-media-tools' || event.data.type !== 'NETWORK_EVENT') {
        return;
    }

    if (isSoundCloudPage() && soundCloudDirectHookReady && event.data.payload && event.data.payload.soundcloud_capture) {
        return;
    }

    handleIncomingNetworkPayload(event.data.payload || {});
}, true);

if (SOUND_CLOUD_INSIGHTS_CAPTURE_ENABLED) {
    syncSoundCloudDirectHookStateFromDom();
    drainBufferedSoundCloudDirectCaptures();
    drainBufferedSoundCloudNetworkEvents();
} else {
    soundCloudDirectHookReady = false;
    soundCloudDirectHookMeta = null;
}

injectNetworkMonitor();
ensureComposerActionButton();
ensureVerifyActionButton();
ensureAdminActivitiesControl();
ensureSoundCloudInsightsControl();
syncSoundCloudRuntimePreference();
syncAdminRuntimePreferences();
if (isFacebookParticipantRequestsPage()) {
    syncParticipantRequestRuntimePreference();
}
refreshToolsRssSiteMatches();
safeAddStorageChangeListener(function (changes, areaName) {
    if (areaName === 'sync' && (changes.facebookAdminDebugEnabled || changes.facebookAdminStatsEnabled || changes.toolsApiToken || changes.devMode)) {
        syncAdminRuntimePreferences();
    }

    if (areaName === 'sync' && (changes.facebookParticipantScannerEnabled || changes.facebookAdminDebugEnabled || changes.toolsApiToken || changes.devMode || changes.facebookParticipantGroupContext || changes.facebookParticipantGroupContextsByGroupId)) {
        if (isFacebookParticipantRequestsPage()) {
            syncParticipantRequestRuntimePreference();
        } else {
            clearParticipantRequestEnhancements();
        }
    }

    if (areaName === 'sync' && (changes.soundcloudAutoIngestEnabled || changes.toolsApiToken)) {
        syncSoundCloudRuntimePreference();
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

