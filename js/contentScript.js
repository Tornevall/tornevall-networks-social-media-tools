// contentScript.js
// Injected into all webpages via manifest.json
// Handles DOM-level logic like element selection, highlighting, response display, and output targeting.

console.log("SocialGPT: content script loaded.");

let markedElements = [];
let outputElement = null;
let lastRightClickedElement = null;

function findFullContextNode(node) {
    return (
        node.closest("[data-ad-preview='message'], [data-ad-comet-preview='message']") ||
        node.closest("[role='article'], article") ||
        node.closest("[data-pagelet], .userContentWrapper") ||
        node.closest("form, div") ||
        node.parentElement
    );
}

document.addEventListener("contextmenu", (event) => {
    lastRightClickedElement = findFullContextNode(event.target);
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === "HIGHLIGHT_LAST_ELEMENT") {
        if (lastRightClickedElement) {
            lastRightClickedElement.style.outline = "2px solid red";
            markedElements.push(lastRightClickedElement);

            const localRoot = lastRightClickedElement.closest("article, [role='feed'], form, div") || document.body;
            let candidate = localRoot.querySelector("[contenteditable='true'], [role='textbox']");

            if (!candidate) {
                candidate = document.querySelector("[contenteditable='true'], [role='textbox']");
            }

            if (candidate) {
                outputElement = candidate;
                candidate.style.outline = "2px dashed green";
                console.log("Auto-selected output field:", candidate);
            } else {
                console.log("Output field not found.");
            }

            sendResponse({
                status: "OK",
                text: lastRightClickedElement.innerText || ""
            });
        } else {
            sendResponse({status: "NO_TARGET", text: ""});
        }
    } else if (request.type === "GET_ALL_MARKED_TEXT") {
        const combinedText = markedElements
            .map((el, index) => `[${index + 1}]\n${el.innerText.trim()}`)
            .join("\n\n---\n\n");

        sendResponse({status: "OK", text: combinedText || ""});
    } else if (request.type === "GET_OUTPUT_TEXT") {
        // Get existing output text from the selected element
        if (outputElement && outputElement.innerText) {
            sendResponse({status: "OK", text: outputElement.innerText});
        } else {
            sendResponse({status: "NO_OUTPUT", text: ""});
        }
    } else if (request.type === "RESET_MARKED_ELEMENTS") {
        markedElements = [];
        console.log("Marked elements have been reset.");
        sendResponse({status: "OK"});
    } else if (request.type === "GPT_RESPONSE") {
        if (!outputElement) {
            console.warn("No output element set. Falling back to alert.");
            alert("Response from ChatGPT:\n\n" + request.payload);
            return;
        }

        try {
            // The inserter here is very much (as I get it) based on Facebook's ways of handling comments.
            // This behaviour is probably unique to Facebook, so we should eventually consider a rewrite or
            // separation of this code, so we can adapt into more social medias without collisions.
            outputElement.focus();
            document.execCommand("selectAll", false, null);
            document.execCommand("insertText", false, request.payload);
            outputElement.scrollIntoView({behavior: "smooth", block: "center"});
            outputElement.style.backgroundColor = "#e2ffe2";
            setTimeout(() => outputElement.style.backgroundColor = "", 1500);
            // Reset only after confirming insertion happened
            chrome.runtime.sendMessage({type: "RESET_MARKED_ELEMENTS"});
        } catch (e) {
            console.warn("Direct insertion failed:", e);
            alert("Response from ChatGPT:\n\n" + request.payload);
        }
    }

    return false;
});
