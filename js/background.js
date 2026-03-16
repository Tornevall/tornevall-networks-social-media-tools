const PROD_BASE_URL = 'https://tools.tornevall.net';
const DEV_BASE_URL = 'https://tools.tornevall.com';
const SOCIALGPT_PATH = '/api/ai/socialgpt/respond';
const MODELS_PATH = '/api/social-media-tools/extension/models';
const FACEBOOK_INGEST_PATH = '/api/social-media-tools/facebook/ingest';
const DEBUG_LOG_KEY = 'tn_networks_debug_logs';
const MAX_DEBUG_LOGS = 200;
const RETRYABLE_REDIRECT_STATUSES = [301, 302, 303, 307, 308];
const FALLBACK_AVAILABLE_MODELS = [
    {id: 'gpt-4o-mini', label: 'gpt-4o-mini'},
    {id: 'gpt-4o', label: 'gpt-4o'},
    {id: 'gpt-4.1-mini', label: 'gpt-4.1-mini'},
    {id: 'gpt-4.1', label: 'gpt-4.1'},
    {id: 'o4-mini', label: 'o4-mini'},
    {id: 'o3-mini', label: 'o3-mini'},
];

function getToolsBaseUrl(devMode) {
    return devMode ? DEV_BASE_URL : PROD_BASE_URL;
}

function getRetryBaseUrls(baseUrl) {
    var normalized = String(baseUrl || '').trim();
    var candidates = normalized ? [normalized] : [];

    if (normalized === PROD_BASE_URL && candidates.indexOf(DEV_BASE_URL) === -1) {
        candidates.push(DEV_BASE_URL);
    }

    return candidates;
}

function isRetryableRedirectStatus(status) {
    return RETRYABLE_REDIRECT_STATUSES.indexOf(status) !== -1;
}

function setTabMarking(tabId, val) {
    chrome.storage.session.set({['marking_' + tabId]: val});
}

function getTabMarking(tabId) {
    return new Promise(function (resolve) {
        chrome.storage.session.get('marking_' + tabId, function (data) {
            resolve(data['marking_' + tabId] || false);
        });
    });
}

function appendDebugLog(entry) {
    return new Promise(function (resolve) {
        chrome.storage.session.get(DEBUG_LOG_KEY, function (data) {
            var logs = Array.isArray(data[DEBUG_LOG_KEY]) ? data[DEBUG_LOG_KEY] : [];
            logs.push(Object.assign({
                ts: new Date().toISOString(),
                source: 'background',
            }, entry || {}));
            logs = logs.slice(-MAX_DEBUG_LOGS);
            chrome.storage.session.set({[DEBUG_LOG_KEY]: logs}, function () {
                resolve(logs);
            });
        });
    });
}

function getDebugLogs() {
    return new Promise(function (resolve) {
        chrome.storage.session.get(DEBUG_LOG_KEY, function (data) {
            resolve(Array.isArray(data[DEBUG_LOG_KEY]) ? data[DEBUG_LOG_KEY] : []);
        });
    });
}

function clearDebugLogs() {
    return new Promise(function (resolve) {
        chrome.storage.session.set({[DEBUG_LOG_KEY]: []}, function () {
            resolve();
        });
    });
}

function setAuthFailureIndicator(message) {
    chrome.action.setBadgeBackgroundColor({color: '#b91c1c'});
    chrome.action.setBadgeText({text: 'AUTH'});
    chrome.action.setTitle({title: 'Authentication failed: ' + message});
}

function clearAuthFailureIndicator() {
    chrome.action.setBadgeText({text: ''});
    chrome.action.setTitle({title: 'Tornevall Networks Social Media Tools'});
}

function extractToolsApiMessage(data) {
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

    var message = extractToolsApiMessage(data).toLowerCase();

    return message.indexOf('authentication') !== -1
        || message.indexOf('unauthenticated') !== -1
        || message.indexOf('unauthorized') !== -1
        || message.indexOf('bearer token') !== -1
        || message.indexOf('forbidden') !== -1
        || message.indexOf('missing permission') !== -1
        || message.indexOf('not allowed to use the requested tools feature') !== -1;
}

function normalizeToolsApiError(status, data) {
    var apiMessage = extractToolsApiMessage(data);

    if (status === 401) {
        return apiMessage || 'Authentication failed. Check your personal Tools bearer token.';
    }

    if (status === 403) {
        if (apiMessage.toLowerCase() === 'model not allowed') {
            return 'Requested model is not allowed for this Tools flow.';
        }

        return apiMessage || 'Access denied for this Tools request.';
    }

    if (status === 503) {
        return apiMessage || 'Tools is reachable, but the global provider_openai key is not configured.';
    }

    return apiMessage || 'Tools API request failed (' + status + ')';
}

function normalizeModelOption(option) {
    var id = option && option.id ? String(option.id).trim() : '';
    if (!id) {
        return null;
    }

    return {
        id: id,
        label: option && option.label ? String(option.label).trim() : id,
        providerVisible: option ? option.provider_visible !== false : true,
        selectedByDefault: !!(option && option.selected_by_default),
    };
}

function normalizeModelCatalog(models, defaultModel) {
    var seen = {};
    var normalized = [];

    (Array.isArray(models) ? models : []).forEach(function (option) {
        var normalizedOption = normalizeModelOption(option);
        if (!normalizedOption || seen[normalizedOption.id]) {
            return;
        }

        seen[normalizedOption.id] = true;
        normalized.push(normalizedOption);
    });

    if (!normalized.length) {
        normalized = FALLBACK_AVAILABLE_MODELS.slice();
    }

    var resolvedDefaultModel = String(defaultModel || '').trim();
    if (!resolvedDefaultModel || !seen[resolvedDefaultModel]) {
        resolvedDefaultModel = normalized[0] ? normalized[0].id : 'gpt-4o-mini';
    }

    normalized.sort(function (left, right) {
        if (left.id === resolvedDefaultModel) {
            return -1;
        }
        if (right.id === resolvedDefaultModel) {
            return 1;
        }

        return left.id.localeCompare(right.id, undefined, {numeric: true, sensitivity: 'base'});
    });

    return {
        models: normalized,
        defaultModel: resolvedDefaultModel,
    };
}

function cacheAvailableModels(catalog) {
    return new Promise(function (resolve) {
        chrome.storage.sync.set({
            availableToolsModels: catalog.models,
            defaultToolsModel: catalog.defaultModel,
            availableToolsModelsSource: catalog.source || 'fallback',
            availableToolsModelsFetchedAt: catalog.fetchedAt || new Date().toISOString(),
            availableToolsModelsWarning: catalog.warning || '',
        }, function () {
            resolve();
        });
    });
}

function readCachedAvailableModels() {
    return new Promise(function (resolve) {
        chrome.storage.sync.get([
            'availableToolsModels',
            'defaultToolsModel',
            'availableToolsModelsSource',
            'availableToolsModelsFetchedAt',
            'availableToolsModelsWarning'
        ], function (data) {
            var normalized = normalizeModelCatalog(data.availableToolsModels || [], data.defaultToolsModel || '');
            resolve({
                models: normalized.models,
                defaultModel: normalized.defaultModel,
                source: data.availableToolsModelsSource || (Array.isArray(data.availableToolsModels) && data.availableToolsModels.length ? 'cache' : 'fallback'),
                fetchedAt: data.availableToolsModelsFetchedAt || null,
                warning: data.availableToolsModelsWarning || '',
            });
        });
    });
}

async function fetchAvailableModels(apiToken, baseUrl, forceRefresh) {
    var baseUrls = getRetryBaseUrls(baseUrl);
    var lastFailure = null;

    for (var i = 0; i < baseUrls.length; i += 1) {
        var currentBaseUrl = baseUrls[i];
        var url = currentBaseUrl + MODELS_PATH + (forceRefresh ? '?refresh=1' : '');

        try {
            var res = await fetch(url, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                    'Authorization': 'Bearer ' + apiToken,
                },
            });

            var data = await res.json().catch(function () {
                return {};
            });

            if ((!res.ok || !data.ok) && isRetryableRedirectStatus(res.status) && i < baseUrls.length - 1) {
                lastFailure = {status: res.status, data: data};
                continue;
            }

            if (!res.ok || !data.ok) {
                var cachedCatalog = await readCachedAvailableModels();
                return {
                    ok: false,
                    error: normalizeToolsApiError(res.status, data),
                    status: res.status,
                    models: cachedCatalog.models,
                    defaultModel: cachedCatalog.defaultModel,
                    source: cachedCatalog.source,
                    fetchedAt: cachedCatalog.fetchedAt,
                    warning: cachedCatalog.warning || 'Using cached/fallback model list.',
                };
            }

            var normalized = normalizeModelCatalog(data.models || [], data.default_model || '');
            var catalog = {
                ok: true,
                models: normalized.models,
                defaultModel: normalized.defaultModel,
                source: data.source || 'provider',
                fetchedAt: data.fetched_at || new Date().toISOString(),
                warning: data.warning || '',
            };

            await cacheAvailableModels(catalog);

            return catalog;
        } catch (e) {
            lastFailure = {status: 0, data: {message: e && e.message ? e.message : 'Could not fetch available models from Tools.'}};
        }
    }

    var cachedOnError = await readCachedAvailableModels();
    return {
        ok: false,
        error: normalizeToolsApiError(lastFailure && typeof lastFailure.status === 'number' ? lastFailure.status : 0, lastFailure ? lastFailure.data : {}),
        status: lastFailure && typeof lastFailure.status === 'number' ? lastFailure.status : 0,
        models: cachedOnError.models,
        defaultModel: cachedOnError.defaultModel,
        source: cachedOnError.source,
        fetchedAt: cachedOnError.fetchedAt,
        warning: cachedOnError.warning || 'Using cached/fallback model list.',
    };
}

chrome.runtime.onInstalled.addListener(function () {
    appendDebugLog({level: 'info', category: 'lifecycle', message: 'Extension installed / updated.'});
});


chrome.tabs.onUpdated.addListener(function (tabId, info) {
    if (info.status === 'loading') {
        setTabMarking(tabId, false);
    }
});

async function callToolsSocialGpt(apiToken, baseUrl, payload) {
    await appendDebugLog({
        level: 'info',
        category: 'ai-request',
        message: 'Sending Tools AI request.',
        meta: {
            baseUrl: baseUrl,
            model: payload.model,
            request_mode: payload.request_mode,
        }
    });

    var baseUrls = getRetryBaseUrls(baseUrl);
    var lastFailure = null;

    try {
        for (var i = 0; i < baseUrls.length; i += 1) {
            var currentBaseUrl = baseUrls[i];
            var res = await fetch(currentBaseUrl + SOCIALGPT_PATH, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + apiToken,
                },
                body: JSON.stringify(payload)
            });

            var data = await res.json().catch(function () {
                return {};
            });

            if ((!res.ok || !data.ok) && isRetryableRedirectStatus(res.status) && i < baseUrls.length - 1) {
                lastFailure = {status: res.status, data: data, baseUrl: currentBaseUrl};
                await appendDebugLog({
                    level: 'warning',
                    category: 'ai-request',
                    message: 'Tools AI request was redirected. Retrying on fallback host.',
                    meta: {
                        baseUrl: currentBaseUrl,
                        fallbackBaseUrl: baseUrls[i + 1],
                        status: res.status,
                    }
                });
                continue;
            }

            if (!res.ok || !data.ok) {
                var errorMessage = normalizeToolsApiError(res.status, data);
                await appendDebugLog({
                    level: 'error',
                    category: 'ai-request',
                    message: errorMessage,
                    meta: {
                        baseUrl: currentBaseUrl,
                        status: res.status,
                        data: data,
                    }
                });

                if (isAuthFailureStatus(res.status, data)) {
                    setAuthFailureIndicator(errorMessage);
                }

                return {ok: false, error: errorMessage, status: res.status};
            }

            clearAuthFailureIndicator();
            await appendDebugLog({
                level: 'info',
                category: 'ai-response',
                message: 'Tools AI request succeeded.',
                meta: {
                    baseUrl: currentBaseUrl,
                    model: data.model || payload.model,
                    usage: data.usage || null,
                }
            });

            return {
                ok: true,
                response: (data && data.response ? String(data.response).trim() : '') || 'No response from Tools API.',
            };
        }
    } catch (e) {
        lastFailure = {status: 0, data: {message: e && e.message ? e.message : 'Error calling Tools API.'}, baseUrl: baseUrl};
        await appendDebugLog({
            level: 'error',
            category: 'ai-request',
            message: 'Network or runtime failure while calling Tools API.',
            meta: {
                baseUrl: baseUrl,
                error: e && e.message ? e.message : String(e),
            }
        });
    }

    return {
        ok: false,
        error: normalizeToolsApiError(lastFailure && typeof lastFailure.status === 'number' ? lastFailure.status : 0, lastFailure ? lastFailure.data : {}),
        status: lastFailure && typeof lastFailure.status === 'number' ? lastFailure.status : 0,
    };
}

async function callFacebookAdminIngest(apiToken, baseUrl, payload) {
    var entries = payload && Array.isArray(payload.entries) ? payload.entries : [];
    await appendDebugLog({
        level: 'info',
        category: 'facebook-admin-ingest',
        message: 'Sending Facebook admin activity ingest request.',
        meta: {
            baseUrl: baseUrl,
            entry_count: entries.length || 1,
            source_url: entries.length ? (entries[0] && entries[0].source_url ? entries[0].source_url : '') : (payload && payload.source_url ? payload.source_url : ''),
            actor_name: entries.length ? (entries[0] && entries[0].actor_name ? entries[0].actor_name : '') : (payload && payload.actor_name ? payload.actor_name : ''),
        }
    });

    try {
        var res = await fetch(baseUrl + FACEBOOK_INGEST_PATH, {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + apiToken,
            },
            body: JSON.stringify(payload || {}),
        });

        var data = await res.json().catch(function () {
            return {};
        });

        if (!res.ok || !data.ok) {
            var errorMessage = normalizeToolsApiError(res.status, data);
            await appendDebugLog({
                level: 'error',
                category: 'facebook-admin-ingest',
                message: errorMessage,
                meta: {
                    baseUrl: baseUrl,
                    status: res.status,
                    data: data,
                }
            });

            if (isAuthFailureStatus(res.status, data)) {
                setAuthFailureIndicator(errorMessage);
            }

            return {ok: false, error: errorMessage, status: res.status};
        }

        clearAuthFailureIndicator();
        await appendDebugLog({
            level: 'info',
            category: 'facebook-admin-ingest',
            message: 'Facebook admin activity ingest succeeded.',
            meta: {
                baseUrl: baseUrl,
                received: typeof data.received === 'number' ? data.received : (entries.length || 1),
                created: typeof data.created === 'number' ? data.created : (!!data.created ? 1 : 0),
                updated: typeof data.updated === 'number' ? data.updated : 0,
                event_id: data.event && data.event.id ? data.event.id : null,
                source_id: data.source && data.source.id ? data.source.id : null,
            }
        });

        return {ok: true, data: data};
    } catch (e) {
        await appendDebugLog({
            level: 'error',
            category: 'facebook-admin-ingest',
            message: 'Network or runtime failure while sending Facebook admin activity ingest.',
            meta: {
                baseUrl: baseUrl,
                error: e && e.message ? e.message : String(e),
            }
        });
        return {ok: false, error: 'Error calling Tools API.'};
    }
}

chrome.runtime.onMessage.addListener(function (req, sender, sendResponse) {
    if (req.type === 'RESET_MARK_MODE') {
        var tabId = sender.tab.id;
        setTabMarking(tabId, false);
        chrome.tabs.sendMessage(tabId, {type: 'TOGGLE_MARK_MODE', enabled: false});
        return;
    }

    if (req.type === 'GET_MARK_MODE') {
        var getTabId = sender && sender.tab ? sender.tab.id : null;
        if (getTabId === null || typeof getTabId === 'undefined') {
            sendResponse({ok: true, enabled: false});
            return true;
        }

        getTabMarking(getTabId).then(function (enabled) {
            sendResponse({ok: true, enabled: !!enabled});
        });
        return true;
    }

    if (req.type === 'SET_MARK_MODE') {
        var setTabId = sender && sender.tab ? sender.tab.id : null;
        var enabled = !!req.enabled;
        if (setTabId === null || typeof setTabId === 'undefined') {
            sendResponse({ok: false, error: 'No active tab was available for mark mode.'});
            return true;
        }

        setTabMarking(setTabId, enabled);
        chrome.tabs.sendMessage(setTabId, {type: 'TOGGLE_MARK_MODE', enabled: enabled});
        appendDebugLog({level: 'info', category: 'ui', message: 'Mark mode toggled from panel.', meta: {enabled: enabled, tabId: setTabId}}).then(function () {
            sendResponse({ok: true, enabled: enabled});
        });
        return true;
    }

    if (req.type === 'DEBUG_LOG') {
        appendDebugLog(req.entry || {}).then(function () {
            sendResponse({ok: true});
        });
        return true;
    }

    if (req.type === 'GET_DEBUG_LOGS') {
        getDebugLogs().then(function (logs) {
            sendResponse({ok: true, logs: logs});
        });
        return true;
    }

    if (req.type === 'CLEAR_DEBUG_LOGS') {
        clearDebugLogs().then(function () {
            sendResponse({ok: true});
        });
        return true;
    }

    if (req.type === 'GET_AVAILABLE_MODELS') {
        chrome.storage.sync.get(['toolsApiToken', 'devMode'], async function (data) {
            if (!data.toolsApiToken) {
                var fallbackCatalog = await readCachedAvailableModels();
                sendResponse({
                    ok: false,
                    error: 'Missing Tools API token. Save it in the extension popup first.',
                    models: fallbackCatalog.models,
                    defaultModel: fallbackCatalog.defaultModel,
                    source: fallbackCatalog.source,
                    fetchedAt: fallbackCatalog.fetchedAt,
                    warning: fallbackCatalog.warning || 'Using cached/fallback model list.',
                });
                return;
            }

            var baseUrl = getToolsBaseUrl(!!data.devMode);
            var catalog = await fetchAvailableModels(data.toolsApiToken, baseUrl, !!req.forceRefresh);
            sendResponse(catalog);
        });
        return true;
    }

    if (req.type === 'GPT_REQUEST') {
        var requestTabId = sender.tab.id;
        chrome.storage.sync.get(['toolsApiToken', 'devMode', 'defaultToolsModel'], async function (data) {
            if (!data.toolsApiToken) {
                var missingTokenMessage = 'Missing Tools API token. Register at tools.tornevall.net, generate a personal bearer token there, and save it in the extension popup.';
                setAuthFailureIndicator(missingTokenMessage);
                await appendDebugLog({level: 'error', category: 'auth', message: missingTokenMessage});
                sendResponse({ok: false, error: missingTokenMessage});
                chrome.tabs.sendMessage(requestTabId, {
                    type: 'GPT_RESPONSE',
                    payload: missingTokenMessage,
                    ok: false
                });
                return;
            }

            var baseUrl = getToolsBaseUrl(!!data.devMode);
            var payload = {
                context: req.context.trim(),
                user_prompt: req.userPrompt.trim(),
                modifier: req.modifier ? req.modifier.trim() : '',
                mood: req.mood || '',
                custom_mood: req.customMood ? req.customMood.trim() : '',
                response_length: req.responseLength || 'auto',
                previous_reply: req.previousReply || '',
                model: req.model || data.defaultToolsModel || 'gpt-4o-mini',
                responder_name_override: req.responderName || '',
                request_mode: req.requestMode || 'reply',
                response_language: req.responseLanguage || 'auto',
            };

            var toolsResponse = await callToolsSocialGpt(data.toolsApiToken, baseUrl, payload);
            var output = toolsResponse.ok ? toolsResponse.response : toolsResponse.error;

            chrome.tabs.sendMessage(requestTabId, {type: 'GPT_RESPONSE', payload: output, ok: toolsResponse.ok});
            sendResponse({ok: toolsResponse.ok, error: toolsResponse.error || null});
        });
        return true;
    }

    if (req.type === 'FACEBOOK_ADMIN_INGEST') {
        chrome.storage.sync.get(['toolsApiToken', 'devMode'], async function (data) {
            if (!data.toolsApiToken) {
                var missingTokenMessage = 'Missing Tools API token. Save it in the extension popup first.';
                await appendDebugLog({level: 'error', category: 'facebook-admin-ingest', message: missingTokenMessage});
                sendResponse({ok: false, error: missingTokenMessage});
                return;
            }

            var baseUrl = getToolsBaseUrl(!!data.devMode);
            var ingestPayload = Array.isArray(req.entries) && req.entries.length
                ? {entries: req.entries}
                : (req.entry || {});
            var ingestResponse = await callFacebookAdminIngest(data.toolsApiToken, baseUrl, ingestPayload);
            sendResponse(ingestResponse);
        });
        return true;
    }
});

console.log('[Tornevall Networks Social Media Tools] Background SW ready for tools.tornevall.net / tools.tornevall.com');
