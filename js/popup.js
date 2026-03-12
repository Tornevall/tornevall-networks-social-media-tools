const PROD_BASE_URL = 'https://tools.tornevall.net';
const DEV_BASE_URL = 'https://tools.tornevall.com';
const SETTINGS_PATH = '/api/social-media-tools/extension/settings';
const TEST_PATH = '/api/social-media-tools/extension/test';
const AI_PATH = '/api/ai/socialgpt/respond';
const DEBUG_LOG_REQUEST = 'GET_DEBUG_LOGS';
const DEBUG_CLEAR_REQUEST = 'CLEAR_DEBUG_LOGS';
const DEFAULT_SYSTEM_PROMPT = 'You are a friendly over intelligent human being, always ready to help. Respond as you are the one involved in the discussion and try to use the language used in the prompt.';
const DEFAULT_MOOD = 'Neutral and formal';
const DEFAULT_TEST_QUESTION = 'A Facebook user writes: "Hi, what does this tool help you with?" Reply in one short sentence in your configured tone and style.';

function getBaseUrl(devMode) {
    return devMode ? DEV_BASE_URL : PROD_BASE_URL;
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

async function apiRequest(baseUrl, token, path, options) {
    const config = options || {};
    const method = config.method || 'GET';
    const url = baseUrl + path;
    const startedAt = performance.now();

    await appendPopupDebugLog({
        level: 'info',
        category: 'popup-api',
        message: 'Popup API request started.',
        meta: {
            method: method,
            url: url,
        }
    });

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
        await appendPopupDebugLog({
            level: 'error',
            category: 'popup-api',
            message: 'Popup API request failed before response.',
            meta: {
                method: method,
                url: url,
                duration_ms: Math.round(performance.now() - startedAt),
                error: error && error.message ? error.message : String(error),
            }
        });

        return {
            ok: false,
            status: 0,
            data: {
                ok: false,
                message: error && error.message ? error.message : 'Network request failed.',
            },
        };
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

document.addEventListener('DOMContentLoaded', function () {
    const apiKeyInput = document.getElementById('apiKey');
    const responderNameInput = document.getElementById('responderName');
    const autoDetectCheckbox = document.getElementById('autoDetectName');
    const systemPromptInput = document.getElementById('systemPrompt');
    const devModeCheckbox = document.getElementById('devMode');
    const facebookAdminDebugCheckbox = document.getElementById('facebookAdminDebugEnabled');
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
        });
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
        systemPromptInput.value = settings.persona_profile || '';
        autoDetectCheckbox.checked = settings.auto_detect_responder !== false;
        if (!testQuestionInput.value.trim()) {
            testQuestionInput.value = DEFAULT_TEST_QUESTION;
        }

        syncLocalCache({
            responderName: responderNameInput.value.trim(),
            systemPrompt: systemPromptInput.value.trim(),
            autoDetectResponder: autoDetectCheckbox.checked,
            defaultMood: settings.mood || DEFAULT_MOOD,
            defaultCustomMood: settings.custom_mood || '',
        });

        setStatus(status, 'Settings loaded from ' + baseUrl + '.', false);

        if (devModeCheckbox.checked) {
            await refreshDebugConsole();
        }
    }

    chrome.storage.sync.get([
        'toolsApiToken',
        'devMode',
        'facebookAdminDebugEnabled',
        'responderName',
        'chatGptSystemPrompt',
        'autoDetectResponder',
        'defaultMood',
        'defaultCustomMood'
    ], async function (data) {
        if (data.toolsApiToken) apiKeyInput.value = data.toolsApiToken;
        if (data.responderName) responderNameInput.value = data.responderName;
        systemPromptInput.value = data.chatGptSystemPrompt || '';
        testQuestionInput.value = DEFAULT_TEST_QUESTION;
        autoDetectCheckbox.checked = data.autoDetectResponder !== false;
        devModeCheckbox.checked = !!data.devMode;
        facebookAdminDebugCheckbox.checked = !!data.facebookAdminDebugEnabled;
        renderEndpointNote();
        renderDebugConsoleVisibility();

        if (data.toolsApiToken) {
            await loadRemoteSettings();
        } else if (devModeCheckbox.checked) {
            await refreshDebugConsole();
        }
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

    saveBtn.addEventListener('click', async function () {
        const token = apiKeyInput.value.trim();
        const baseUrl = getBaseUrl(devModeCheckbox.checked);

        chrome.storage.sync.set({
            toolsApiToken: token,
            devMode: devModeCheckbox.checked,
            facebookAdminDebugEnabled: facebookAdminDebugCheckbox.checked,
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
        });

        setStatus(status, 'Settings saved to ' + baseUrl + '.', false);

        if (devModeCheckbox.checked) {
            await refreshDebugConsole();
        }
    });

    testBtn.addEventListener('click', async function () {
        const token = apiKeyInput.value.trim();
        const baseUrl = getBaseUrl(devModeCheckbox.checked);
        const question = testQuestionInput.value.trim() || DEFAULT_TEST_QUESTION;
        const busyElements = [saveBtn, testBtn, resetBtn, apiKeyInput, responderNameInput, systemPromptInput, testQuestionInput, devModeCheckbox, facebookAdminDebugCheckbox, autoDetectCheckbox];

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
        });

        const saveResult = await apiRequest(baseUrl, token, SETTINGS_PATH, {
            method: 'PUT',
            body: {
                responder_name: responderNameInput.value.trim(),
                persona_profile: systemPromptInput.value.trim(),
                auto_detect_responder: autoDetectCheckbox.checked,
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

        if (devModeCheckbox.checked) {
            await refreshDebugConsole();
        }
    });

    resetBtn.addEventListener('click', function () {
        systemPromptInput.value = '';
        testQuestionInput.value = DEFAULT_TEST_QUESTION;
        setStatus(status, 'Responder profile reset locally. Save to push it to Tools.', false);
    });

    refreshDebugBtn.addEventListener('click', async function () {
        await refreshDebugConsole();
        setStatus(status, 'Debug console refreshed.', false);
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
});
