const PROD_BASE_URL = 'https://tools.tornevall.net';
const DEV_BASE_URL = 'https://tools.tornevall.com';
const SETTINGS_PATH = '/api/social-media-tools/extension/settings';
const MODELS_PATH = '/api/social-media-tools/extension/models';
const FACEBOOK_OUTCOME_CONFIG_PATH = '/api/social-media-tools/facebook/outcome-config';
const TEST_PATH = '/api/social-media-tools/extension/test';
const AI_PATH = '/api/ai/socialgpt/respond';
const DEBUG_LOG_REQUEST = 'GET_DEBUG_LOGS';
const DEBUG_CLEAR_REQUEST = 'CLEAR_DEBUG_LOGS';
const RETRYABLE_REDIRECT_STATUSES = [301, 302, 303, 307, 308];
const DEFAULT_MOOD = 'Neutral and formal';
const DEFAULT_PERSONA_PROFILE = 'You are a friendly over intelligent human being, always ready to help. Respond as you are the one involved in the discussion and try to use the language used in the prompt.';
const DEFAULT_TEST_QUESTION = 'A Facebook user writes: "Hi, what does this tool help you with?" Reply in one short sentence in your configured tone and style.';
const DEFAULT_RESPONSE_LANGUAGE = 'auto';
const DEFAULT_VERIFY_FACT_LANGUAGE = 'auto';
const DEFAULT_QUICK_REPLY_PRESET = 'default';
const DEFAULT_QUICK_REPLY_CUSTOM_INSTRUCTION = '';

function getBaseUrl(devMode) {
    return devMode ? DEV_BASE_URL : PROD_BASE_URL;
}

function getRetryBaseUrls(baseUrl) {
    const normalized = String(baseUrl || '').trim();
    const candidates = normalized ? [normalized] : [];

    if (normalized === PROD_BASE_URL && candidates.indexOf(DEV_BASE_URL) === -1) {
        candidates.push(DEV_BASE_URL);
    }

    return candidates;
}

function isRetryableRedirectStatus(status) {
    return RETRYABLE_REDIRECT_STATUSES.indexOf(status) !== -1;
}

function setStatus(el, message, isError) {
    el.textContent = message;
    el.style.color = isError ? '#b91c1c' : 'green';
}

function setBusyState(isBusy, elements) {
    (elements || []).forEach(function (element) {
        if (element) {
            element.disabled = !!isBusy;
        }
    });
}

async function appendPopupDebugLog(entry) {
    return sendRuntimeMessage({
        type: 'DEBUG_LOG',
        entry: Object.assign({
            source: 'popup',
        }, entry || {}),
    });
}

function extractApiMessage(data, fallback) {
    if (!data) {
        return fallback;
    }

    if (typeof data.message === 'string' && data.message.trim()) {
        return data.message.trim();
    }

    if (typeof data.error === 'string' && data.error.trim()) {
        return data.error.trim();
    }

    if (data.errors && typeof data.errors === 'object') {
        var firstField = Object.keys(data.errors)[0];
        if (firstField) {
            var value = data.errors[firstField];
            if (Array.isArray(value) && value.length) {
                return String(value[0]);
            }
            if (typeof value === 'string' && value.trim()) {
                return value.trim();
            }
        }
    }

    if (typeof data === 'string' && data.trim()) {
        return data.trim();
    }

    return fallback;
}

function excerptText(value, maxLength) {
    if (!value) {
        return '';
    }

    var text = String(value).trim();
    if (text.length <= maxLength) {
        return text;
    }

    return text.slice(0, Math.max(0, maxLength - 1)).trim() + '…';
}

function escapeHtml(value) {
    return String(value == null ? '' : value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

async function apiRequest(baseUrl, token, path, options) {
    const config = options || {};
    const method = config.method || 'GET';
    const startedAt = performance.now();
    const baseUrls = getRetryBaseUrls(baseUrl);

    await appendPopupDebugLog({
        level: 'info',
        category: 'popup-api',
        message: 'Popup API request started.',
        meta: {
            method: method,
            url: (baseUrls[0] || baseUrl) + path,
        }
    });
    let lastFailure = null;

    for (let index = 0; index < baseUrls.length; index += 1) {
        const currentBaseUrl = baseUrls[index];
        const url = currentBaseUrl + path;
        let response;

        try {
            response = await fetch(url, {
                method: method,
                headers: Object.assign({
                    'Accept': 'application/json',
                    'Authorization': 'Bearer ' + token,
                }, config.body ? {'Content-Type': 'application/json'} : {}),
                body: config.body ? JSON.stringify(config.body) : undefined,
            });
        } catch (error) {
            lastFailure = {
                status: 0,
                data: {
                    ok: false,
                    message: error && error.message ? error.message : 'Network request failed.',
                },
                url: url,
            };
            break;
        }

        const durationMs = Math.round(performance.now() - startedAt);
        const responseText = await response.text();
        let data = {};

        if (responseText) {
            try {
                data = JSON.parse(responseText);
            } catch (error) {
                data = {
                    ok: false,
                    message: responseText,
                };
            }
        }

        if ((!response.ok || (data && data.ok === false)) && isRetryableRedirectStatus(response.status) && index < baseUrls.length - 1) {
            await appendPopupDebugLog({
                level: 'warning',
                category: 'popup-api',
                message: 'Popup API request was redirected. Retrying on fallback host.',
                meta: {
                    method: method,
                    url: url,
                    fallback_url: baseUrls[index + 1] + path,
                    status: response.status,
                    duration_ms: durationMs,
                }
            });
            lastFailure = {status: response.status, data: data, url: url};
            continue;
        }

        await appendPopupDebugLog({
            level: response.ok ? 'info' : 'error',
            category: 'popup-api',
            message: 'Popup API request completed.',
            meta: {
                method: method,
                url: url,
                status: response.status,
                ok: response.ok,
                duration_ms: durationMs,
            }
        });

        return {
            ok: response.ok && data && data.ok !== false,
            status: response.status,
            data: data,
        };
    }

    await appendPopupDebugLog({
        level: 'error',
        category: 'popup-api',
        message: 'Popup API request failed before response.',
        meta: {
            method: method,
            url: lastFailure && lastFailure.url ? lastFailure.url : ((baseUrls[0] || baseUrl) + path),
            duration_ms: Math.round(performance.now() - startedAt),
            error: extractApiMessage(lastFailure ? lastFailure.data : null, 'Network request failed.'),
        }
    });

    return {
        ok: false,
        status: lastFailure && typeof lastFailure.status === 'number' ? lastFailure.status : 0,
        data: lastFailure && lastFailure.data ? lastFailure.data : {
            ok: false,
            message: 'Network request failed.',
        },
    };
}

function sendRuntimeMessage(message) {
    return new Promise(function (resolve) {
        chrome.runtime.sendMessage(message, function (response) {
            if (chrome.runtime.lastError) {
                resolve({ok: false, error: chrome.runtime.lastError.message});
                return;
            }

            resolve(response || {ok: false});
        });
    });
}

function queryActiveTabFacebookAdminStatus() {
    return new Promise(function (resolve) {
        chrome.tabs.query({active: true, currentWindow: true}, function (tabs) {
            if (chrome.runtime.lastError) {
                resolve({ok: false, error: chrome.runtime.lastError.message});
                return;
            }

            var tab = Array.isArray(tabs) && tabs.length ? tabs[0] : null;
            if (!tab || typeof tab.id !== 'number') {
                resolve({ok: false, error: 'No active tab is available.'});
                return;
            }

            chrome.tabs.sendMessage(tab.id, {type: 'GET_FACEBOOK_ADMIN_REPORTER_STATUS'}, function (response) {
                if (chrome.runtime.lastError) {
                    resolve({
                        ok: false,
                        error: chrome.runtime.lastError.message,
                    });
                    return;
                }

                resolve(response && response.ok ? {ok: true, status: response} : {
                    ok: false,
                    error: response && response.error ? response.error : 'No Facebook admin reporting status is available for the active tab.',
                });
            });
        });
    });
}

document.addEventListener('DOMContentLoaded', function () {
    const apiKeyInput = document.getElementById('apiKey');
    const responderNameInput = document.getElementById('responderName');
    const autoDetectCheckbox = document.getElementById('autoDetectName');
    const responseLanguageSelect = document.getElementById('responseLanguage');
    const verifyFactLanguageSelect = document.getElementById('verifyFactLanguage');
    const quickReplyPresetSelect = document.getElementById('quickReplyPreset');
    const quickReplyInstructionInput = document.getElementById('quickReplyInstruction');
    const systemPromptInput = document.getElementById('systemPrompt');
    const devModeCheckbox = document.getElementById('devMode');
    const facebookAdminDebugCheckbox = document.getElementById('facebookAdminDebugEnabled');
    const pageNetworkDebugCheckbox = document.getElementById('pageNetworkDebugEnabled');
    const enableUnsupportedComposeCheckbox = document.getElementById('enableUnsupportedCompose');
    const endpointNote = document.getElementById('endpointNote');
    const openToolsDashboardLink = document.getElementById('openToolsDashboardLink');
    const openToolsDashboardLinkInline = document.getElementById('openToolsDashboardLinkInline');
    const status = document.getElementById('status');
    const saveBtn = document.getElementById('saveKeyBtn');
    const testBtn = document.getElementById('testConnectionBtn');
    const resetBtn = document.getElementById('resetPromptBtn');
    const testQuestionInput = document.getElementById('testQuestion');
    const debugConsoleWrap = document.getElementById('debugConsoleWrap');
    const debugConsole = document.getElementById('debugConsole');
    const refreshDebugBtn = document.getElementById('refreshDebugBtn');
    const copyDebugBtn = document.getElementById('copyDebugBtn');
    const clearDebugBtn = document.getElementById('clearDebugBtn');
    const facebookAdminStatusState = document.getElementById('facebookAdminStatusState');
    const facebookAdminStatusCounters = document.getElementById('facebookAdminStatusCounters');
    const facebookAdminReportableList = document.getElementById('facebookAdminReportableList');
    const facebookAdminLastSubmission = document.getElementById('facebookAdminLastSubmission');

    function renderFacebookAdminStatus(result) {
        if (!facebookAdminStatusState || !facebookAdminStatusCounters || !facebookAdminReportableList || !facebookAdminLastSubmission) {
            return;
        }

        if (!result || !result.ok || !result.status) {
            facebookAdminStatusState.textContent = (result && result.error)
                ? ('Could not read Facebook admin reporting status from the active tab: ' + result.error)
                : 'Could not read Facebook admin reporting status from the active tab.';
            facebookAdminStatusCounters.textContent = 'Open a Facebook group admin activities page to inspect reportable entries and batch totals.';
            facebookAdminReportableList.innerHTML = '<div class="status-line status-muted">No reportable admin-log entries detected yet.</div>';
            facebookAdminLastSubmission.textContent = '';
            return;
        }

        var statusPayload = result.status;
        var counters = statusPayload.counters || {};
        var entries = Array.isArray(statusPayload.reportable_entries) ? statusPayload.reportable_entries : [];
        var pageStatePrefix = statusPayload.is_admin_page
            ? 'Active tab is on a Facebook admin activities page.'
            : (statusPayload.is_facebook_page
                ? 'Active tab is on Facebook, but not on an admin activities page.'
                : 'Active tab is not on Facebook admin activities.');
        var ingestState = statusPayload.ingest_enabled
            ? ' Reporting is enabled.'
            : ' Reporting is disabled, but detections below are still reportable if enabled.';

        facebookAdminStatusState.textContent = statusPayload.state_text || (pageStatePrefix + ingestState);
        facebookAdminStatusCounters.textContent = pageStatePrefix + ingestState
            + ' Detected: ' + (counters.detected || 0)
            + ' · Pending: ' + (counters.pending || 0)
            + ' · Sending: ' + (counters.sending || 0)
            + ' · Failed: ' + (counters.failed || 0)
            + ' · Submitted: ' + (counters.sent || 0)
            + ' · Duplicates ignored: ' + (counters.duplicates_ignored || 0);

        if (!entries.length) {
            facebookAdminReportableList.innerHTML = '<div class="status-line status-muted">'
                + (statusPayload.reportable_empty_text || 'No reportable admin-log entries detected yet.')
                + '</div>';
        } else {
            facebookAdminReportableList.innerHTML = entries.map(function (entry) {
                var headline = [entry.actor_name || 'Unknown actor'];
                if (entry.action) {
                    headline.push('→ ' + entry.action);
                }
                if (entry.target_name) {
                    headline.push('(' + entry.target_name + ')');
                }

                return '<div class="status-item">'
                    + '<div><span class="status-pill">' + escapeHtml(entry.state || 'queued') + '</span>' + escapeHtml(headline.join(' ')) + '</div>'
                    + '<div class="status-muted" style="margin-top:4px;">' + escapeHtml(excerptText(entry.action_text || '', 180)) + '</div>'
                    + (entry.occurred_at ? '<div class="status-muted" style="margin-top:4px;">Facebook time: ' + escapeHtml(entry.occurred_at) + '</div>' : '')
                    + '</div>';
            }).join('');
        }

        facebookAdminLastSubmission.textContent = statusPayload.last_submission_text || '';
    }

    async function refreshFacebookAdminStatus() {
        renderFacebookAdminStatus(await queryActiveTabFacebookAdminStatus());
    }

    function renderEndpointNote() {
        const baseUrl = getBaseUrl(devModeCheckbox.checked);
        endpointNote.innerHTML = 'AI requests are sent through <code>' + baseUrl + AI_PATH + '</code> using your Tools bearer token.';
        if (openToolsDashboardLink) {
            openToolsDashboardLink.href = baseUrl + '/admin/social-media-tools/facebook';
        }
        if (openToolsDashboardLinkInline) {
            openToolsDashboardLinkInline.href = baseUrl + '/admin/social-media-tools/facebook';
        }
    }

    function renderDebugConsoleVisibility() {
        debugConsoleWrap.hidden = !devModeCheckbox.checked;
    }

    function formatFacebookNetworkMeta(meta) {
        if (!meta || typeof meta !== 'object') {
            return '';
        }

        const lines = [];
        if (meta.transport || meta.method || typeof meta.status !== 'undefined') {
            lines.push([
                meta.transport ? String(meta.transport).toUpperCase() : '',
                meta.method || '',
                typeof meta.status !== 'undefined' ? 'status=' + meta.status : '',
                meta.duration_ms ? meta.duration_ms + ' ms' : ''
            ].filter(Boolean).join(' · '));
        }
        if (meta.pathname || meta.url) {
            lines.push(meta.pathname || meta.url);
        }
        if (meta.friendly_name) {
            lines.push('friendly=' + meta.friendly_name);
        }
        if (meta.doc_id) {
            lines.push('doc_id=' + meta.doc_id);
        }
        if (meta.first_event) {
            lines.push('first_event=' + meta.first_event);
        }
        if (meta.request_preview) {
            lines.push('request: ' + meta.request_preview);
        }
        if (meta.response_preview) {
            lines.push('response: ' + meta.response_preview);
        }

        return lines.join('\n');
    }

    function formatDebugLogs(logs) {
        if (!Array.isArray(logs) || !logs.length) {
            return 'No logs yet.';
        }

        return logs.map(function (entry) {
            var prefix = [entry.ts || '-', (entry.level || 'info').toUpperCase(), entry.category || 'general']
                .join(' | ');
            var prettyMeta = (entry.category === 'facebook-network' || entry.category === 'facebook-network-status')
                ? formatFacebookNetworkMeta(entry.meta)
                : (entry.meta ? JSON.stringify(entry.meta, null, 2) : '');
            var meta = prettyMeta ? '\n' + prettyMeta : '';
            return prefix + '\n' + (entry.message || '') + meta;
        }).join('\n\n----------------\n\n');
    }

    async function refreshDebugConsole() {
        const result = await sendRuntimeMessage({type: DEBUG_LOG_REQUEST});
        if (!result.ok) {
            debugConsole.textContent = result.error || 'Could not load debug logs.';
            return;
        }

        debugConsole.textContent = formatDebugLogs(result.logs);
    }

    function syncLocalCache(values) {
        chrome.storage.sync.set({
            responderName: values.responderName,
            chatGptSystemPrompt: values.systemPrompt,
            autoDetectResponder: values.autoDetectResponder,
            defaultMood: values.defaultMood,
            defaultCustomMood: values.defaultCustomMood,
            defaultResponseLanguage: values.defaultResponseLanguage,
            defaultVerifyFactLanguage: values.defaultVerifyFactLanguage,
            defaultQuickReplyPreset: values.defaultQuickReplyPreset,
            defaultQuickReplyCustomInstruction: values.defaultQuickReplyCustomInstruction,
        });
    }

    function cacheAvailableModelCatalog(models, defaultModel, source, fetchedAt, warning) {
        const seen = {};
        const normalizedModels = (Array.isArray(models) ? models : []).map(function (model) {
            const id = model && model.id ? String(model.id).trim() : '';
            if (!id || seen[id]) {
                return null;
            }

            seen[id] = true;
            return {
                id: id,
                label: model && model.label ? String(model.label).trim() : id,
                provider_visible: model ? model.provider_visible !== false : true,
                selected_by_default: !!(model && model.selected_by_default),
            };
        }).filter(Boolean);

        chrome.storage.sync.set({
            availableToolsModels: normalizedModels,
            defaultToolsModel: String(defaultModel || '').trim() || (normalizedModels[0] ? normalizedModels[0].id : 'gpt-4o-mini'),
            availableToolsModelsSource: source || 'provider',
            availableToolsModelsFetchedAt: fetchedAt || new Date().toISOString(),
            availableToolsModelsWarning: warning || '',
        });
    }

    async function refreshAvailableModelsCache(token, baseUrl) {
        const result = await apiRequest(baseUrl, token, MODELS_PATH);
        if (!result.ok || !result.data) {
            return false;
        }

        cacheAvailableModelCatalog(
            result.data.models || [],
            result.data.default_model || '',
            result.data.source || 'provider',
            result.data.fetched_at || null,
            result.data.warning || ''
        );

        return true;
    }

    async function syncRemoteFacebookOutcomeConfig(token, baseUrl) {
        const result = await apiRequest(baseUrl, token, FACEBOOK_OUTCOME_CONFIG_PATH);
        if (!result.ok || !result.data || !result.data.outcome_detection) {
            await appendPopupDebugLog({
                level: 'warning',
                category: 'popup-api',
                message: 'Could not sync Facebook outcome config from Tools. Using local extension fallback rules.',
                meta: {
                    baseUrl: baseUrl,
                    error: extractApiMessage(result.data, 'Unknown outcome-config error.'),
                }
            });
            return false;
        }

        chrome.storage.sync.set({
            facebookAdminOutcomeConfig: result.data.outcome_detection,
            facebookAdminOutcomeConfigVersion: result.data.outcome_detection.version || null,
        });

        return true;
    }

    async function loadRemoteSettings() {
        const token = apiKeyInput.value.trim();
        if (!token) {
            return;
        }

        const baseUrl = getBaseUrl(devModeCheckbox.checked);
        const result = await apiRequest(baseUrl, token, SETTINGS_PATH);
        if (!result.ok || !result.data || !result.data.settings) {
            setStatus(status, extractApiMessage(result.data, 'Could not load settings from Tools.'), true);
            return;
        }

        const settings = result.data.settings;
        responderNameInput.value = settings.responder_name || '';
        systemPromptInput.value = settings.persona_profile || systemPromptInput.value.trim() || DEFAULT_PERSONA_PROFILE;
        autoDetectCheckbox.checked = settings.auto_detect_responder !== false;
        responseLanguageSelect.value = settings.response_language || DEFAULT_RESPONSE_LANGUAGE;
        verifyFactLanguageSelect.value = settings.verify_fact_language || DEFAULT_VERIFY_FACT_LANGUAGE;
        if (!testQuestionInput.value.trim()) {
            testQuestionInput.value = DEFAULT_TEST_QUESTION;
        }

        syncLocalCache({
            responderName: responderNameInput.value.trim(),
            systemPrompt: systemPromptInput.value.trim(),
            autoDetectResponder: autoDetectCheckbox.checked,
            defaultMood: settings.mood || DEFAULT_MOOD,
            defaultCustomMood: settings.custom_mood || '',
            defaultResponseLanguage: responseLanguageSelect.value || DEFAULT_RESPONSE_LANGUAGE,
            defaultVerifyFactLanguage: verifyFactLanguageSelect.value || DEFAULT_VERIFY_FACT_LANGUAGE,
            defaultQuickReplyPreset: quickReplyPresetSelect.value || DEFAULT_QUICK_REPLY_PRESET,
            defaultQuickReplyCustomInstruction: quickReplyInstructionInput.value.trim(),
        });
        cacheAvailableModelCatalog(
            result.data.available_models || [],
            result.data.default_model || '',
            result.data.models_source || 'provider',
            new Date().toISOString(),
            result.data.models_warning || ''
        );
        await syncRemoteFacebookOutcomeConfig(token, baseUrl);

        setStatus(status, 'Settings loaded from ' + baseUrl + '.', false);

        if (devModeCheckbox.checked) {
            await refreshDebugConsole();
        }
    }

    chrome.storage.sync.get([
        'toolsApiToken',
        'devMode',
        'facebookAdminDebugEnabled',
        'pageNetworkDebugEnabled',
        'enableUnsupportedCompose',
        'responderName',
        'chatGptSystemPrompt',
        'autoDetectResponder',
        'defaultMood',
        'defaultCustomMood',
        'defaultResponseLanguage',
        'defaultVerifyFactLanguage',
        'defaultQuickReplyPreset',
        'defaultQuickReplyCustomInstruction'
    ], async function (data) {
        if (data.toolsApiToken) apiKeyInput.value = data.toolsApiToken;
        if (data.responderName) responderNameInput.value = data.responderName;
        systemPromptInput.value = data.chatGptSystemPrompt || DEFAULT_PERSONA_PROFILE;
        testQuestionInput.value = DEFAULT_TEST_QUESTION;
        autoDetectCheckbox.checked = data.autoDetectResponder !== false;
        responseLanguageSelect.value = data.defaultResponseLanguage || DEFAULT_RESPONSE_LANGUAGE;
        verifyFactLanguageSelect.value = data.defaultVerifyFactLanguage || DEFAULT_VERIFY_FACT_LANGUAGE;
        quickReplyPresetSelect.value = data.defaultQuickReplyPreset || DEFAULT_QUICK_REPLY_PRESET;
        quickReplyInstructionInput.value = data.defaultQuickReplyCustomInstruction || DEFAULT_QUICK_REPLY_CUSTOM_INSTRUCTION;
        devModeCheckbox.checked = !!data.devMode;
        facebookAdminDebugCheckbox.checked = !!data.facebookAdminDebugEnabled;
        pageNetworkDebugCheckbox.checked = !!data.pageNetworkDebugEnabled;
        enableUnsupportedComposeCheckbox.checked = !!data.enableUnsupportedCompose;
        renderEndpointNote();
        renderDebugConsoleVisibility();

        if (data.toolsApiToken) {
            await loadRemoteSettings();
        } else if (devModeCheckbox.checked) {
            await refreshDebugConsole();
        }

        await refreshFacebookAdminStatus();
    });

    devModeCheckbox.addEventListener('change', function () {
        renderEndpointNote();
        renderDebugConsoleVisibility();
        chrome.storage.sync.set({devMode: devModeCheckbox.checked}, async function () {
            setStatus(status, 'Environment changed to ' + getBaseUrl(devModeCheckbox.checked) + '.', false);
            if (apiKeyInput.value.trim()) {
                await loadRemoteSettings();
            } else if (devModeCheckbox.checked) {
                await refreshDebugConsole();
            }
        });
    });

    facebookAdminDebugCheckbox.addEventListener('change', function () {
        chrome.storage.sync.set({facebookAdminDebugEnabled: facebookAdminDebugCheckbox.checked}, function () {
            setStatus(status, facebookAdminDebugCheckbox.checked
                ? 'Facebook admin debug diagnostics enabled.'
                : 'Facebook admin debug diagnostics disabled.', false);
        });
    });

    pageNetworkDebugCheckbox.addEventListener('change', function () {
        chrome.storage.sync.set({pageNetworkDebugEnabled: pageNetworkDebugCheckbox.checked}, function () {
            setStatus(status, pageNetworkDebugCheckbox.checked
                ? 'In-page XHR debug overlay enabled on supported pages.'
                : 'In-page XHR debug overlay disabled.', false);
        });
    });

    enableUnsupportedComposeCheckbox.addEventListener('change', function () {
        chrome.storage.sync.set({enableUnsupportedCompose: enableUnsupportedComposeCheckbox.checked}, function () {
            setStatus(status, enableUnsupportedComposeCheckbox.checked
                ? 'Experimental compose button enabled on unsupported sites.'
                : 'Compose button limited to supported sites again.', false);
        });
    });

    saveBtn.addEventListener('click', async function () {
        const token = apiKeyInput.value.trim();
        const baseUrl = getBaseUrl(devModeCheckbox.checked);

        chrome.storage.sync.set({
            toolsApiToken: token,
            devMode: devModeCheckbox.checked,
            facebookAdminDebugEnabled: facebookAdminDebugCheckbox.checked,
            pageNetworkDebugEnabled: pageNetworkDebugCheckbox.checked,
            enableUnsupportedCompose: enableUnsupportedComposeCheckbox.checked,
            defaultVerifyFactLanguage: verifyFactLanguageSelect.value || DEFAULT_VERIFY_FACT_LANGUAGE,
            defaultQuickReplyPreset: quickReplyPresetSelect.value || DEFAULT_QUICK_REPLY_PRESET,
            defaultQuickReplyCustomInstruction: quickReplyInstructionInput.value.trim(),
        });

        if (!token) {
            setStatus(status, 'Register at tools.tornevall.net and generate a personal bearer token there before saving.', true);
            return;
        }

        const result = await apiRequest(baseUrl, token, SETTINGS_PATH, {
            method: 'PUT',
            body: {
                responder_name: responderNameInput.value.trim(),
                persona_profile: systemPromptInput.value.trim(),
                auto_detect_responder: autoDetectCheckbox.checked,
                response_language: responseLanguageSelect.value || DEFAULT_RESPONSE_LANGUAGE,
                verify_fact_language: verifyFactLanguageSelect.value || DEFAULT_VERIFY_FACT_LANGUAGE,
            },
        });

        if (!result.ok) {
            setStatus(status, extractApiMessage(result.data, 'Could not save settings to Tools.'), true);
            return;
        }

        syncLocalCache({
            responderName: responderNameInput.value.trim(),
            systemPrompt: systemPromptInput.value.trim(),
            autoDetectResponder: autoDetectCheckbox.checked,
            defaultMood: DEFAULT_MOOD,
            defaultCustomMood: '',
            defaultResponseLanguage: responseLanguageSelect.value || DEFAULT_RESPONSE_LANGUAGE,
            defaultVerifyFactLanguage: verifyFactLanguageSelect.value || DEFAULT_VERIFY_FACT_LANGUAGE,
            defaultQuickReplyPreset: quickReplyPresetSelect.value || DEFAULT_QUICK_REPLY_PRESET,
            defaultQuickReplyCustomInstruction: quickReplyInstructionInput.value.trim(),
        });
        await refreshAvailableModelsCache(token, baseUrl);
        await syncRemoteFacebookOutcomeConfig(token, baseUrl);

        setStatus(status, 'Settings saved to ' + baseUrl + '.', false);

        if (devModeCheckbox.checked) {
            await refreshDebugConsole();
        }
    });

    testBtn.addEventListener('click', async function () {
        const token = apiKeyInput.value.trim();
        const baseUrl = getBaseUrl(devModeCheckbox.checked);
        const question = testQuestionInput.value.trim() || DEFAULT_TEST_QUESTION;
        const busyElements = [saveBtn, testBtn, resetBtn, apiKeyInput, responderNameInput, responseLanguageSelect, verifyFactLanguageSelect, quickReplyPresetSelect, quickReplyInstructionInput, systemPromptInput, testQuestionInput, devModeCheckbox, facebookAdminDebugCheckbox, pageNetworkDebugCheckbox, enableUnsupportedComposeCheckbox, autoDetectCheckbox];

        if (!token) {
            setStatus(status, 'Paste a personal bearer token first, then test the connection.', true);
            return;
        }

        setBusyState(true, busyElements);
        setStatus(status, '⏳ Testing via Tools → OpenAI, please wait...', false);

        chrome.storage.sync.set({
            toolsApiToken: token,
            devMode: devModeCheckbox.checked,
            facebookAdminDebugEnabled: facebookAdminDebugCheckbox.checked,
            pageNetworkDebugEnabled: pageNetworkDebugCheckbox.checked,
            enableUnsupportedCompose: enableUnsupportedComposeCheckbox.checked,
            defaultVerifyFactLanguage: verifyFactLanguageSelect.value || DEFAULT_VERIFY_FACT_LANGUAGE,
            defaultQuickReplyPreset: quickReplyPresetSelect.value || DEFAULT_QUICK_REPLY_PRESET,
            defaultQuickReplyCustomInstruction: quickReplyInstructionInput.value.trim(),
        });

        const saveResult = await apiRequest(baseUrl, token, SETTINGS_PATH, {
            method: 'PUT',
            body: {
                responder_name: responderNameInput.value.trim(),
                persona_profile: systemPromptInput.value.trim(),
                auto_detect_responder: autoDetectCheckbox.checked,
                response_language: responseLanguageSelect.value || DEFAULT_RESPONSE_LANGUAGE,
                verify_fact_language: verifyFactLanguageSelect.value || DEFAULT_VERIFY_FACT_LANGUAGE,
            },
        });

        if (!saveResult.ok) {
            setStatus(status, extractApiMessage(saveResult.data, 'Could not save settings to Tools before testing.'), true);
            setBusyState(false, busyElements);
            return;
        }

        const result = await apiRequest(baseUrl, token, TEST_PATH, {
            method: 'POST',
            body: {
                question: question,
                response_length: 'very-short',
            },
        });
        if (!result.ok) {
            setStatus(status, extractApiMessage(result.data, 'Test failed.'), true);
            setBusyState(false, busyElements);
            return;
        }

        const user = result.data.user || {};
        const openAi = result.data.openai || {};
        const settingsSource = result.data.settings_source || {};
        const smokeTest = result.data.smoke_test || {};
        const backend = result.data.backend || {};
        setStatus(
            status,
            '✅ Tools → OpenAI test complete\n'
            + 'Question: ' + question + '\n\n'
            + 'Answer:\n' + ((smokeTest.response || '').trim() || excerptText(smokeTest.response_excerpt || '', 180) || '(empty response)') + '\n\n'
            + 'Source: ' + (backend.handler || 'tools_backend')
            + ' | OpenAI called=' + (backend.openai_called ? 'yes' : 'no')
            + ' | User=' + (user.name || 'Unknown') + '\n'
            + 'Tools settings used: responder=' + (settingsSource.responder_name || 'Anonymous')
            + ', profile=' + (settingsSource.persona_profile_excerpt ? 'yes' : 'no')
            + ', tone=' + (settingsSource.applied_tone || '-')
            + (openAi.global_key_ready ? '' : '\nGlobal OpenAI key ready: no'),
            !openAi.global_key_ready
        );

        await appendPopupDebugLog({
            level: 'info',
            category: 'popup-test',
            message: 'Tools → OpenAI popup test completed.',
            meta: {
                baseUrl: baseUrl,
                question: excerptText(question, 140),
                response_excerpt: smokeTest.response_excerpt || smokeTest.response || '',
            }
        });

        setBusyState(false, busyElements);

        await refreshAvailableModelsCache(token, baseUrl);

        if (devModeCheckbox.checked) {
            await refreshDebugConsole();
        }
    });

    resetBtn.addEventListener('click', function () {
        systemPromptInput.value = DEFAULT_PERSONA_PROFILE;
        responseLanguageSelect.value = DEFAULT_RESPONSE_LANGUAGE;
        verifyFactLanguageSelect.value = DEFAULT_VERIFY_FACT_LANGUAGE;
        quickReplyPresetSelect.value = DEFAULT_QUICK_REPLY_PRESET;
        quickReplyInstructionInput.value = DEFAULT_QUICK_REPLY_CUSTOM_INSTRUCTION;
        testQuestionInput.value = DEFAULT_TEST_QUESTION;
        setStatus(status, 'Responder profile reset to the default local fallback. Save to push it to Tools.', false);
    });

    refreshDebugBtn.addEventListener('click', async function () {
        await refreshDebugConsole();
        setStatus(status, 'Debug console refreshed.', false);
        await refreshFacebookAdminStatus();
    });

    copyDebugBtn.addEventListener('click', async function () {
        try {
            await navigator.clipboard.writeText(debugConsole.textContent || '');
            setStatus(status, 'Debug console copied to clipboard.', false);
        } catch (error) {
            setStatus(status, 'Could not copy debug console.', true);
        }
    });

    clearDebugBtn.addEventListener('click', async function () {
        const result = await sendRuntimeMessage({type: DEBUG_CLEAR_REQUEST});
        if (!result.ok) {
            setStatus(status, result.error || 'Could not clear debug console.', true);
            return;
        }

        debugConsole.textContent = 'No logs yet.';
        setStatus(status, 'Debug console cleared.', false);
    });

    window.addEventListener('focus', function () {
        refreshFacebookAdminStatus();
    });
});
