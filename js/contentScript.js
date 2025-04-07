// contentScript.js
console.log("SocialGPT: content script loaded.");

let markedElements = [];
let outputElement = null;
let lastRightClickedElement = null;

// Inject loader element into the current webpage
function injectLoader() {
    if (!document.getElementById("socialgpt-loader")) {
        const loader = document.createElement("div");
        loader.id = "socialgpt-loader";
        document.body.appendChild(loader);
    }
}

function showLoader() {
    const loader = document.getElementById("socialgpt-loader");
    if (loader) loader.style.display = "block";
}

function hideLoader() {
    const loader = document.getElementById("socialgpt-loader");
    if (loader) loader.style.display = "none";
}

function markOutputWithOverlay(target) {
    const overlay = document.createElement("div");

    overlay.style.position = "absolute";
    overlay.style.top = `${target.offsetTop}px`;
    overlay.style.left = `${target.offsetLeft}px`;
    overlay.style.width = `${target.offsetWidth}px`;
    overlay.style.height = `${target.offsetHeight}px`;

    overlay.style.border = "none";
    overlay.style.boxShadow = "0 0 10px 2px #00c853";
    overlay.style.backgroundColor = "rgba(0, 200, 83, 0.1)";
    overlay.style.borderRadius = "6px";

    overlay.style.pointerEvents = "none";
    overlay.style.zIndex = "9999";
    overlay.className = "socialgpt-overlay-marker";

    target.parentElement?.appendChild(overlay);

    setTimeout(() => overlay.remove(), 3000);
}

function findFullContextNode(node) {
    return (
        node.closest("[data-ad-preview='message'], [data-ad-comet-preview='message']") ||
        node.closest("[role='article'], article") ||
        node.closest("[data-pagelet], .userContentWrapper") ||
        node.closest("form, div") ||
        node.parentElement
    );
}

function findOutputField(startNode) {
    const searchRoots = [
        startNode?.closest("article, [role='feed'], form, div"),
        document.body
    ];

    for (const root of searchRoots) {
        if (!root) continue;
        const candidate = root.querySelector("[contenteditable='true'], [role='textbox'], textarea");
        if (candidate) return candidate;
    }

    return null;
}

injectLoader();

document.addEventListener("contextmenu", (event) => {
    lastRightClickedElement = findFullContextNode(event.target);
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    chrome.storage.sync.get("openaiApiKey", (data) => {
        if (!data.openaiApiKey || data.openaiApiKey.trim() === "") {
            alert("⚠️ You need to set your OpenAI API key in the SocialGPT settings to use this tool.");
        }
    });

    if (request.type === "HIGHLIGHT_LAST_ELEMENT") {
        if (lastRightClickedElement) {
            const index = markedElements.indexOf(lastRightClickedElement);

            if (index !== -1) {
                // Unmark field.
                lastRightClickedElement.style.outline = "";
                markedElements.splice(index, 1);
                console.log("Element unmarked.");
            } else {
                // Mark field.
                lastRightClickedElement.style.outline = "2px solid red";
                lastRightClickedElement.scrollIntoView({behavior: "smooth", block: "center"});
                markedElements.push(lastRightClickedElement);
                console.log("Element marked.");
            }

            sendResponse?.({
                status: "OK",
                text: lastRightClickedElement.innerText || ""
            });
        } else {
            sendResponse?.({status: "NO_TARGET", text: ""});
        }
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
    } else if (request.type === "GET_ALL_MARKED_TEXT") {
        const combinedText = markedElements
            .map((el, index) => `[${index + 1}]\n${el.innerText.trim()}`)
            .join("\n\n---\n\n");

        sendResponse?.({status: "OK", text: combinedText || ""});
    } else if (request.type === "GET_OUTPUT_TEXT") {
        if (outputElement && outputElement.innerText) {
            sendResponse?.({status: "OK", text: outputElement.innerText});
        } else {
            sendResponse?.({status: "NO_OUTPUT", text: ""});
        }
    } else if (request.type === "RESET_MARKED_ELEMENTS") {
        markedElements.forEach(el => el.style.outline = ""); // remove visual outlines
        markedElements = [];
        outputElement = null;
        console.log("Marked elements and output element have been reset.");
        sendResponse?.({status: "OK"});
    } else if (request.type === "GPT_RESPONSE") {
        hideLoader();

        if (!outputElement) {
            console.warn("No output element set. Falling back to alert.");
            alert("Response from ChatGPT:\n\n" + request.payload);
            chrome.runtime.sendMessage({type: "RESET_MARKED_ELEMENTS"});
            return;
        }

        try {
            outputElement.focus();
            document.execCommand("selectAll", false, null);
            document.execCommand("insertText", false, request.payload);
            outputElement.scrollIntoView({behavior: "smooth", block: "center"});
            outputElement.style.backgroundColor = "#e2ffe2";
            setTimeout(() => outputElement.style.backgroundColor = "", 1500);
        } catch (e) {
            console.warn("Direct insertion failed:", e);
            alert("Response from ChatGPT:\n\n" + request.payload);
        } finally {
            chrome.runtime.sendMessage({type: "RESET_MARKED_ELEMENTS"});
        }
    } else if (request.type === "SHOW_LOADER") {
        showLoader();
    }

    return false;
});
