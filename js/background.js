const PROD_BASE_URL = 'https://tools.tornevall.net';
const DEV_BASE_URL = 'https://tools.tornevall.com';
const SOCIALGPT_PATH = '/api/ai/socialgpt/respond';

function getToolsBaseUrl(devMode) {
    return devMode ? DEV_BASE_URL : PROD_BASE_URL;
}

// Helper to store mark-state per tab
function setTabMarking(tabId, val) {
    chrome.storage.session.set({['marking_' + tabId]: val});
}

function getTabMarking(tabId) {
    return new Promise(r => chrome.storage.session.get('marking_' + tabId, d => r(d['marking_' + tabId] || false)));
}

chrome.runtime.onInstalled.addListener(() => {
    chrome.contextMenus.create({id: 'socialGptRoot', title: 'Tornevall Networks Social Media Tools', contexts: ['all']});
    chrome.contextMenus.create({
        id: 'verifyFact',
        parentId: 'socialGptRoot',
        title: 'Verify fact',
        contexts: ['all']
    });
    chrome.contextMenus.create({
        id: 'replyToThis', parentId: 'socialGptRoot', title: 'Reply/Add text', contexts: ['all']
    });
    chrome.contextMenus.create({
        id: 'markWithGPT', parentId: 'socialGptRoot', title: 'Mark element for GPT reading', contexts: ['all']
    });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
    if (info.menuItemId === 'replyToThis') {
        chrome.tabs.sendMessage(tab.id, {type: 'OPEN_REPLY_PANEL'});
    } else if (info.menuItemId === 'markWithGPT') {
        const curr = await getTabMarking(tab.id);
        const next = !curr;
        setTabMarking(tab.id, next);
        chrome.contextMenus.update('markWithGPT', {title: next ? 'Stop marking for GPT' : 'Mark element for GPT reading'});
        chrome.tabs.sendMessage(tab.id, {type: 'TOGGLE_MARK_MODE', enabled: next});
    } else if (info.menuItemId === 'verifyFact') {
        chrome.tabs.sendMessage(tab.id, { type: 'START_FACT_VERIFICATION' });
    }
});

chrome.tabs.onUpdated.addListener((tabId, info) => {
    if (info.status === 'loading') {
        setTabMarking(tabId, false);
        chrome.contextMenus.update('markWithGPT', {title: 'Mark element for GPT reading'});
    }
});

async function callToolsSocialGpt(apiToken, baseUrl, payload) {
    try {
        const res = await fetch(baseUrl + SOCIALGPT_PATH, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiToken}`,
            },
            body: JSON.stringify(payload)
        });

        const data = await res.json().catch(() => ({}));

        if (!res.ok || !data.ok) {
            const errorMessage = (data && (data.error || data.message)) || `Tools API request failed (${res.status})`;
            console.error('[Tornevall Networks Social Media Tools] Tools API error', {status: res.status, data, baseUrl});
            return {ok: false, error: errorMessage};
        }

        return {
            ok: true,
            response: (data && data.response ? String(data.response).trim() : '') || 'No response from Tools API.',
        };
    } catch (e) {
        console.error('[Tornevall Networks Social Media Tools] Tools API request crashed', e);
        return {ok: false, error: 'Error calling Tools API.'};
    }
}

chrome.runtime.onMessage.addListener((req, sender, sendResponse) => {
    if (req.type === 'RESET_MARK_MODE') {
        const tabId = sender.tab.id;
        setTabMarking(tabId, false);
        chrome.contextMenus.update('markWithGPT', {title: 'Mark element for GPT reading'});
        chrome.tabs.sendMessage(tabId, {type: 'TOGGLE_MARK_MODE', enabled: false});
        return;
    }

    if (req.type === 'GPT_REQUEST') {
        const tabId = sender.tab.id;
        chrome.storage.sync.get(['toolsApiToken', 'devMode'], async data => {
            if (!data.toolsApiToken) {
                sendResponse({ok: false, error: 'Missing Tools API token'});
                chrome.tabs.sendMessage(tabId, {
                    type: 'GPT_RESPONSE',
                    payload: 'Missing Tools API token. Register at tools.tornevall.net, generate a personal bearer token there, and save it in the extension popup.'
                });
                return;
            }

            const baseUrl = getToolsBaseUrl(!!data.devMode);
            const payload = {
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

            const toolsResponse = await callToolsSocialGpt(data.toolsApiToken, baseUrl, payload);
            const output = toolsResponse.ok ? toolsResponse.response : toolsResponse.error;

            chrome.tabs.sendMessage(tabId, {type: 'GPT_RESPONSE', payload: output});
            sendResponse({ok: toolsResponse.ok, error: toolsResponse.error || null});
        });
        return true;
    }
});

console.log('[Tornevall Networks Social Media Tools] Background SW ready for tools.tornevall.net / tools.tornevall.com');
