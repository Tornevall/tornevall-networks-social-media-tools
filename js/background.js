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
    if (req.type === 'RESET_MARK_MODE') {
        const tabId = sender.tab.id;
        setTabMarking(tabId, false);
        chrome.contextMenus.update('markWithGPT', {title: 'Mark element for GPT reading'});
        chrome.tabs.sendMessage(tabId, {type: 'TOGGLE_MARK_MODE', enabled: false});
        return;
    }


    if (req.type === 'GPT_REQUEST') {
        const tabId = sender.tab.id;
        chrome.storage.sync.get(['openaiApiKey', 'chatGptSystemPrompt', 'responderName'], async data => {
            if (!data.openaiApiKey) {
                sendResponse({ok: false, error: 'Missing key'});
                return;
            }

            const responder = req.responderName || data.responderName || 'Anonymous';
            const system = data.chatGptSystemPrompt || '';

            const tone = req.customMood?.trim() || req.mood || 'Neutral';
            let lengthInstruction = '';
            switch (req.responseLength) {
                case 'as-short-as-possible':
                    lengthInstruction = 'Keep your reply as short as possible.';
                    break;
                case 'shortest-possible':
                    lengthInstruction = 'Keep your reply at maximum of one sentence. Try to reach a oneliner comment.';
                    break;
                case 'very-short':
                    lengthInstruction = 'Limit your reply to 2–3 short sentences. Be direct and impactful.';
                    break;
                case 'short':
                    lengthInstruction = 'Keep your reply within 4–6 sentences. Be clear and focused.';
                    break;
                case 'medium':
                    lengthInstruction = 'Reply in 6–10 sentences. Provide full context, but stay concise.';
                    break;
                case 'long':
                    lengthInstruction = 'Use as much detail as needed to deliver the full message effectively.';
                    break;
                case 'extreme':
                    lengthInstruction = 'Write it as a book. It may be delivered with its on ISBN number.';
                    break;
                case 'auto':
                default:
                    // Do nothing – GPT decides
                    break;
            }

            const userMsg = `You are writing as ${responder} in a public social media thread.
Your tone is: ${tone}.
${lengthInstruction ? lengthInstruction + '\n' : ''}Write directly and naturally, as if ${responder} is replying – but never mention yourself in third person or refer to being an AI.

Context:
${req.context.trim()}

Instruction:
${req.userPrompt.trim()}${req.modifier ? '\n\nModifier: ' + req.modifier.trim() : ''}${req.previousReply ? '\n\nPrevious draft:\n' + req.previousReply.trim() : ''}`;

            const gpt = await callChatGPT(data.openaiApiKey, [{role: 'system', content: system}, {
                role: 'user',
                content: userMsg
            }]);

            chrome.tabs.sendMessage(tabId, {type: 'GPT_RESPONSE', payload: gpt});
            sendResponse({ok: true});
        });
        return true; // async
    }
});

console.log('[SocialGPT] Background SW ready');
