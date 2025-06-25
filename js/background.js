// ===================================================
//  FILE: js/background.js (FINAL w/ responderName persona)
//  Includes:
//  – responderName embedded as a personality
//  – tab-based markMode management
//  – GPT_REQUEST + GPT_RESPONSE via reply-panel
// ===================================================

// Helper to store mark-state per tab
function setTabMarking(tabId, val) {
    chrome.storage.session.set({['marking_' + tabId]: val});
}

function getTabMarking(tabId) {
    return new Promise(r => chrome.storage.session.get('marking_' + tabId, d => r(d['marking_' + tabId] || false)));
}

chrome.runtime.onInstalled.addListener(() => {
    chrome.contextMenus.create({id: 'socialGptRoot', title: 'SocialGPT Tools', contexts: ['all']});
    chrome.contextMenus.create({
        id: 'replyToThis',
        parentId: 'socialGptRoot',
        title: 'Reply/Add text',
        contexts: ['all']
    });
    chrome.contextMenus.create({
        id: 'markWithGPT',
        parentId: 'socialGptRoot',
        title: 'Mark element for GPT reading',
        contexts: ['all']
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
    }
});

chrome.tabs.onUpdated.addListener((tabId, info) => {
    if (info.status === 'loading') {
        setTabMarking(tabId, false);
        chrome.contextMenus.update('markWithGPT', {title: 'Mark element for GPT reading'});
    }
});

async function callChatGPT(apiKey, messages) {
    try {
        const res = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}`},
            body: JSON.stringify({model: 'gpt-4o', messages, max_tokens: 300, temperature: 0.7})
        });
        const d = await res.json();
        return d.choices?.[0]?.message?.content?.trim() || 'No response from GPT.';
    } catch (e) {
        console.error('OpenAI error', e);
        return 'Error calling OpenAI.';
    }
}

chrome.runtime.onMessage.addListener((req, sender, sendResponse) => {
    if (req.type === 'GPT_REQUEST') {
        const tabId = sender.tab.id;
        chrome.storage.sync.get(['openaiApiKey', 'chatGptSystemPrompt', 'responderName'], async data => {
            if (!data.openaiApiKey) {
                sendResponse({ok: false, error: 'Missing key'});
                return;
            }

            const responder = data.responderName || 'Anonymous';
            const system = data.chatGptSystemPrompt || '';

            const userMsg = `You are a person named ${responder} responding in a public social media thread.

Your tone should reflect the mood: ${req.mood}.
${req.customMood ? 'Custom mood adjustment: ' + req.customMood + '.' : ''}

Always write as if it's really ${responder} replying directly but never mention yourself.

Context:
${req.context}

Instruction:
${req.userPrompt}${req.modifier ? '\n\nModifier: ' + req.modifier : ''}${req.previousReply ? '\n\nExisting reply:\n' + req.previousReply : ''}`;

            const gpt = await callChatGPT(data.openaiApiKey, [
                {role: 'system', content: system},
                {role: 'user', content: userMsg}
            ]);

            chrome.tabs.sendMessage(tabId, {type: 'GPT_RESPONSE', payload: gpt});
            sendResponse({ok: true});
        });
        return true; // async
    }
});

console.log('[SocialGPT] Background SW ready');
