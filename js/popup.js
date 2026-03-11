const PROD_BASE_URL = 'https://tools.tornevall.net';
const DEV_BASE_URL = 'https://tools.tornevall.com';
const SETTINGS_PATH = '/api/social-media-tools/extension/settings';
const TEST_PATH = '/api/social-media-tools/extension/test';

function getBaseUrl(devMode) {
    return devMode ? DEV_BASE_URL : PROD_BASE_URL;
}

function setStatus(el, message, isError) {
    el.textContent = message;
    el.style.color = isError ? '#b91c1c' : 'green';
}

async function apiRequest(baseUrl, token, path, options) {
    const config = options || {};
    const response = await fetch(baseUrl + path, {
        method: config.method || 'GET',
        headers: Object.assign({
            'Accept': 'application/json',
            'Authorization': 'Bearer ' + token,
        }, config.body ? {'Content-Type': 'application/json'} : {}),
        body: config.body ? JSON.stringify(config.body) : undefined,
    });

    const data = await response.json().catch(function () {
        return {};
    });

    return {
        ok: response.ok && data && data.ok !== false,
        status: response.status,
        data: data,
    };
}

document.addEventListener('DOMContentLoaded', function () {
    const apiKeyInput = document.getElementById('apiKey');
    const responderNameInput = document.getElementById('responderName');
    const autoDetectCheckbox = document.getElementById('autoDetectName');
    const systemPromptInput = document.getElementById('systemPrompt');
    const devModeCheckbox = document.getElementById('devMode');
    const endpointNote = document.getElementById('endpointNote');
    const status = document.getElementById('status');
    const saveBtn = document.getElementById('saveKeyBtn');
    const testBtn = document.getElementById('testConnectionBtn');
    const resetBtn = document.getElementById('resetPromptBtn');

    function renderEndpointNote() {
        const baseUrl = getBaseUrl(devModeCheckbox.checked);
        endpointNote.innerHTML = 'Requests are sent through <code>' + baseUrl + '/api/ai/socialgpt/respond</code> using your Tools bearer token.';
    }

    function syncLocalCache(values) {
        chrome.storage.sync.set({
            responderName: values.responderName,
            chatGptSystemPrompt: values.systemPrompt,
            autoDetectResponder: values.autoDetectResponder,
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
            return;
        }

        const settings = result.data.settings;
        responderNameInput.value = settings.responder_name || '';
        systemPromptInput.value = settings.system_prompt || '';
        autoDetectCheckbox.checked = settings.auto_detect_responder !== false;

        syncLocalCache({
            responderName: responderNameInput.value.trim(),
            systemPrompt: systemPromptInput.value.trim(),
            autoDetectResponder: autoDetectCheckbox.checked,
        });

        setStatus(status, 'Settings loaded from ' + baseUrl + '.', false);
    }

    chrome.storage.sync.get([
        'toolsApiToken',
        'devMode',
        'responderName',
        'chatGptSystemPrompt',
        'autoDetectResponder'
    ], async function (data) {
        if (data.toolsApiToken) apiKeyInput.value = data.toolsApiToken;
        if (data.responderName) responderNameInput.value = data.responderName;
        if (data.chatGptSystemPrompt) systemPromptInput.value = data.chatGptSystemPrompt;
        autoDetectCheckbox.checked = data.autoDetectResponder !== false;
        devModeCheckbox.checked = !!data.devMode;
        renderEndpointNote();

        if (data.toolsApiToken) {
            await loadRemoteSettings();
        }
    });

    devModeCheckbox.addEventListener('change', function () {
        renderEndpointNote();
        chrome.storage.sync.set({devMode: devModeCheckbox.checked}, async function () {
            setStatus(status, 'Environment changed to ' + getBaseUrl(devModeCheckbox.checked) + '.', false);
            if (apiKeyInput.value.trim()) {
                await loadRemoteSettings();
            }
        });
    });

    saveBtn.addEventListener('click', async function () {
        const token = apiKeyInput.value.trim();
        const baseUrl = getBaseUrl(devModeCheckbox.checked);

        chrome.storage.sync.set({
            toolsApiToken: token,
            devMode: devModeCheckbox.checked,
        });

        if (!token) {
            setStatus(status, 'Register at tools.tornevall.net and generate a personal bearer token there before saving.', true);
            return;
        }

        const result = await apiRequest(baseUrl, token, SETTINGS_PATH, {
            method: 'PUT',
            body: {
                responder_name: responderNameInput.value.trim(),
                system_prompt: systemPromptInput.value.trim(),
                auto_detect_responder: autoDetectCheckbox.checked,
            },
        });

        if (!result.ok) {
            setStatus(status, (result.data && (result.data.message || result.data.error)) || 'Could not save settings to Tools.', true);
            return;
        }

        syncLocalCache({
            responderName: responderNameInput.value.trim(),
            systemPrompt: systemPromptInput.value.trim(),
            autoDetectResponder: autoDetectCheckbox.checked,
        });

        setStatus(status, 'Settings saved to ' + baseUrl + '.', false);
    });

    testBtn.addEventListener('click', async function () {
        const token = apiKeyInput.value.trim();
        const baseUrl = getBaseUrl(devModeCheckbox.checked);

        if (!token) {
            setStatus(status, 'Paste a personal bearer token first, then test the connection.', true);
            return;
        }

        chrome.storage.sync.set({
            toolsApiToken: token,
            devMode: devModeCheckbox.checked,
        });

        const result = await apiRequest(baseUrl, token, TEST_PATH);
        if (!result.ok) {
            setStatus(status, (result.data && (result.data.message || result.data.error)) || 'Test failed.', true);
            return;
        }

        const user = result.data.user || {};
        const openAi = result.data.openai || {};
        setStatus(
            status,
            'Connected to ' + baseUrl + '\n'
            + 'User: ' + (user.name || 'Unknown') + ' (#' + (user.id || '?') + ')\n'
            + 'Global OpenAI key ready: ' + (openAi.global_key_ready ? 'yes' : 'no'),
            !openAi.global_key_ready
        );
    });

    resetBtn.addEventListener('click', function () {
        systemPromptInput.value = 'You are a friendly over intelligent human being, always ready to help. Respond as you are the one involved in the discussion.';
        setStatus(status, 'Prompt reset locally. Save to push it to Tools.', false);
    });
});
