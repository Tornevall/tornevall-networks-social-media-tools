const PROD_BASE_URL = 'https://tools.tornevall.net';
const DEV_BASE_URL = 'https://tools.tornevall.com';
const SOCIALGPT_PATH = '/api/ai/socialgpt/respond';
const FACEBOOK_INGEST_PATH = '/api/social-media-tools/facebook/ingest';
const DEBUG_LOG_KEY = 'tn_networks_debug_logs';
const MAX_DEBUG_LOGS = 200;

function getToolsBaseUrl(devMode) {
    return devMode ? DEV_BASE_URL : PROD_BASE_URL;
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

function normalizeToolsApiError(status, data) {
    if (status === 401) {
        return 'Authentication failed. Check your personal Tools bearer token.';
    }

    if (status === 403) {
        return 'Authenticated, but this account is not allowed to use the requested Tools feature.';
    }

    if (status === 503) {
        return 'Tools is reachable, but the global provider_openai key is not configured.';
    }

    return (data && (data.error || data.message)) || 'Tools API request failed (' + status + ')';
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

    try {
        var res = await fetch(baseUrl + SOCIALGPT_PATH, {
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

        if (!res.ok || !data.ok) {
            var errorMessage = normalizeToolsApiError(res.status, data);
            await appendDebugLog({
                level: 'error',
                category: 'ai-request',
                message: errorMessage,
                meta: {
                    baseUrl: baseUrl,
                    status: res.status,
                    data: data,
                }
            });

            if (res.status === 401 || res.status === 403) {
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
                baseUrl: baseUrl,
                model: data.model || payload.model,
                usage: data.usage || null,
            }
        });

        return {
            ok: true,
            response: (data && data.response ? String(data.response).trim() : '') || 'No response from Tools API.',
        };
    } catch (e) {
        await appendDebugLog({
            level: 'error',
            category: 'ai-request',
            message: 'Network or runtime failure while calling Tools API.',
            meta: {
                baseUrl: baseUrl,
                error: e && e.message ? e.message : String(e),
            }
        });
        return {ok: false, error: 'Error calling Tools API.'};
    }
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

            if (res.status === 401 || res.status === 403) {
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
        chrome.tabs.sendMessage(setTabId, {type: 'TOGGLE_MARK_MODE', enabled: enabled}, function () {
            appendDebugLog({level: 'info', category: 'ui', message: 'Mark mode toggled from panel.', meta: {enabled: enabled, tabId: setTabId}}).then(function () {
                sendResponse({ok: true, enabled: enabled});
            });
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

    if (req.type === 'GPT_REQUEST') {
        var requestTabId = sender.tab.id;
        chrome.storage.sync.get(['toolsApiToken', 'devMode'], async function (data) {
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
                model: req.model || 'gpt-4o',
                responder_name_override: req.responderName || '',
                request_mode: req.requestMode || 'reply',
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
