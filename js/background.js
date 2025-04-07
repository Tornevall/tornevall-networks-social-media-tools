// background.js (Manifest V3 Service Worker)
// Handles context menu creation and OpenAI API calls

console.log("SocialGPT: Background service worker loaded.");

chrome.runtime.onInstalled.addListener(() => {
    chrome.contextMenus.create({
        id: "socialGptRoot",
        title: "SocialGPT Tools",
        contexts: ["all"]
    });

    chrome.contextMenus.create({
        id: "replyToThis",
        parentId: "socialGptRoot",
        title: "Reply/Add text",
        contexts: ["all"]
    });

    chrome.contextMenus.create({
        id: "markWithGPT",
        parentId: "socialGptRoot",
        title: "Mark element for GPT reading",
        contexts: ["all"]
    });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
    if (info.menuItemId === "replyToThis") {
        console.log("Context menu clicked: Reply to this");

        chrome.tabs.sendMessage(tab.id, {type: "HIGHLIGHT_LAST_ELEMENT"});

        setTimeout(() => {
            chrome.tabs.sendMessage(tab.id, {type: "MARK_OUTPUT_FIELD"}); // ⬅ NYTT!

            chrome.scripting.executeScript({
                target: {tabId: tab.id},
                func: () => {
                    const instructions = prompt("How would you like to reply to this?");
                    if (instructions) {
                        chrome.runtime.sendMessage({type: "USER_REPLY_INSTRUCTIONS", instructions});
                    } else {
                        alert("Aborted.");
                    }
                }
            });
        }, 300); // Delay to allow visual marking
    }

    else if (info.menuItemId === "markWithGPT") {
        chrome.tabs.sendMessage(tab.id, {type: "HIGHLIGHT_LAST_ELEMENT"});
    }
});

chrome.runtime.onMessage.addListener((request, sender) => {
    if (request.type === "USER_REPLY_INSTRUCTIONS") {
        const tabId = sender.tab.id;

        chrome.tabs.sendMessage(tabId, {type: "GET_ALL_MARKED_TEXT"}, async (response) => {
            if (!response || !response.text) {
                console.warn("No marked text found.");
                return;
            }

            chrome.tabs.sendMessage(tabId, {type: "SHOW_LOADER"});

            chrome.storage.sync.get(["openaiApiKey", "chatGptSystemPrompt", "responderName"], async (data) => {
                const apiKey = data.openaiApiKey;
                const responderName = data.responderName || "Anonymous";
                const systemPrompt = data.chatGptSystemPrompt || "You are a friendly over intelligent human being, always ready to help. Respond as you are the one involved in the discussion and try to use the language used in the prompt.";

                if (!apiKey) {
                    console.warn("No OpenAI API key found!");
                    return;
                }

                // Prompt user wrote just now
                const userInstruction = request.instructions?.trim();

                // Check if there's already text in output field
                chrome.tabs.sendMessage(tabId, {type: "GET_OUTPUT_TEXT"}, (outputResponse) => {
                    const previousReply = outputResponse && outputResponse.text ? outputResponse.text.trim() : "";

                    // Build final prompt
                    const finalPrompt = `
You are ${responderName}, and you're about to write a response to a comment thread on a social media platform.

${userInstruction ? "Custom instruction:\n" + userInstruction + "\n\n" : ""}
${previousReply ? "Existing reply (use or customize this):\n" + previousReply + "\n\n" : ""}

The thread you are responding to is:

${response.text}
                    `;

                    // Now send to GPT
                    sendTextToChatGPT(apiKey, finalPrompt, systemPrompt).then(gptResponse => {
                        chrome.tabs.sendMessage(tabId, {
                            type: "GPT_RESPONSE",
                            payload: gptResponse
                        });
                    });
                });
            });
        });
    } else if (request.type === "MARK_OUTPUT_FIELD") {
        const candidate = findOutputField(lastRightClickedElement);
        if (candidate) {
            outputElement = candidate;
            candidate.scrollIntoView({behavior: "smooth", block: "center"});
            candidate.style.backgroundColor = "#eaffea";
            markOutputWithOverlay(candidate);
            console.log("Output field marked.");
        } else {
            console.warn("No output field found on MARK_OUTPUT_FIELD.");
        }
    }
});

async function sendTextToChatGPT(apiKey, prompt, systemInstruction) {
    try {
        const bodyData = {
            model: "gpt-4o",
            messages: [
                {role: "system", content: systemInstruction},
                {role: "user", content: prompt}
            ],
            max_tokens: 300,
            temperature: 0.7
        };

        const apiUrl = "https://api.openai.com/v1/chat/completions";
        const response = await fetch(apiUrl, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${apiKey}`
            },
            body: JSON.stringify(bodyData)
        });

        const data = await response.json();
        return (data.choices && data.choices.length)
            ? data.choices[0].message.content.trim()
            : "No response from GPT.";
    } catch (error) {
        console.error("OpenAI error:", error);
        return "Error calling OpenAI API.";
    }
}
