document.addEventListener('DOMContentLoaded', () => {
    const apiKeyInput = document.getElementById('apiKey');
    const responderNameInput = document.getElementById('responderName');
    const autoDetectCheckbox = document.getElementById('autoDetectName');
    const systemPromptInput = document.getElementById('systemPrompt');
    const status = document.getElementById('status');

    chrome.storage.sync.get(['openaiApiKey', 'responderName', 'chatGptSystemPrompt', 'autoDetectResponder'], data => {
        if (data.openaiApiKey) apiKeyInput.value = data.openaiApiKey;
        if (data.responderName) responderNameInput.value = data.responderName;
        if (data.chatGptSystemPrompt) systemPromptInput.value = data.chatGptSystemPrompt;
        autoDetectCheckbox.checked = data.autoDetectResponder !== false;
    });

    document.getElementById('saveKeyBtn').addEventListener('click', () => {
        chrome.storage.sync.set({
            openaiApiKey: apiKeyInput.value.trim(),
            responderName: responderNameInput.value.trim(),
            chatGptSystemPrompt: systemPromptInput.value.trim(),
            autoDetectResponder: autoDetectCheckbox.checked
        }, () => {
            status.textContent = 'Settings saved.';
            setTimeout(() => status.textContent = '', 2000);
        });
    });

    document.getElementById('resetPromptBtn').addEventListener('click', () => {
        const def = 'You are a friendly over intelligent human being, always ready to help. Respond as you are the one involved in the discussion.';
        systemPromptInput.value = def;
        chrome.storage.sync.set({chatGptSystemPrompt: def}, () => {
            status.textContent = 'Prompt reset to default.';
            setTimeout(() => status.textContent = '', 2000);
        });
    });
});