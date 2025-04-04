// popup.js
// Handles the logic for the settings popup: saving and restoring API key, responder name, and system prompt.

document.addEventListener("DOMContentLoaded", () => {
    const apiKeyInput = document.getElementById("apiKey");
    const responderNameInput = document.getElementById("responderName");
    const systemPromptInput = document.getElementById("systemPrompt");
    const saveKeyBtn = document.getElementById("saveKeyBtn");
    const resetPromptBtn = document.getElementById("resetPromptBtn");
    const status = document.getElementById("status");

    // Load values from chrome.storage
    chrome.storage.sync.get(["openaiApiKey", "responderName", "chatGptSystemPrompt"], (data) => {
        if (data.openaiApiKey) apiKeyInput.value = data.openaiApiKey;
        if (data.responderName) responderNameInput.value = data.responderName;
        if (data.chatGptSystemPrompt) systemPromptInput.value = data.chatGptSystemPrompt;
    });

    // Save button logic
    saveKeyBtn.addEventListener("click", () => {
        const key = apiKeyInput.value.trim();
        const name = responderNameInput.value.trim();
        const prompt = systemPromptInput.value.trim();

        chrome.storage.sync.set({
            openaiApiKey: key,
            responderName: name,
            chatGptSystemPrompt: prompt
        }, () => {
            status.textContent = "Settings saved.";
            setTimeout(() => status.textContent = "", 2000);
        });
    });

    // Reset prompt to default
    resetPromptBtn.addEventListener("click", () => {
        const defaultPrompt = "You are a friendly over intelligent human being, always ready to help. Respond as you are the one involved in the discussion.";
        systemPromptInput.value = defaultPrompt;

        chrome.storage.sync.set({chatGptSystemPrompt: defaultPrompt}, () => {
            status.textContent = "Prompt reset to default.";
            setTimeout(() => status.textContent = "", 2000);
        });
    });
});
