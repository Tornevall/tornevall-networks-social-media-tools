// ==============================
//  SocialGPT – COMPLETE CODEBASE (restores loader + name fix + model select)
// ==============================

let markedElements = [], isClickMarkingActive = false, panel;

// ---------------------------------------------
// LOADER HANDLING
// ---------------------------------------------
function injectLoader() {
    if (!document.getElementById("socialgpt-loader")) {
        const loader = document.createElement("div");
        loader.id = "socialgpt-loader";
        loader.style.position = "fixed";
        loader.style.bottom = "10px";
        loader.style.left = "10px";
        loader.style.width = "30px";
        loader.style.height = "30px";
        loader.style.border = "4px solid transparent";
        loader.style.borderTop = "4px solid #008CBA";
        loader.style.borderRadius = "50%";
        loader.style.animation = "spin 1s linear infinite";
        loader.style.display = "none";
        loader.style.zIndex = "999999";
        document.body.appendChild(loader);

        const style = document.createElement("style");
        style.textContent = `
        #socialgpt-loader {
            position: fixed;
            bottom: 10px;
            left: 10px;
            width: 30px;
            height: 30px;
            border: 4px solid transparent;
            border-top: 4px solid #008CBA;
            border-radius: 50%;
            animation: spin 1s linear infinite;
            display: none;
            z-index: 9999;
        }
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }`;
        document.head.appendChild(style);
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

injectLoader();

// ---------------------------------------------
// FACEBOOK NAME DETECTION
// ---------------------------------------------
function detectFacebookUserNameViaObserver(callback) {
    if (!location.hostname.includes("facebook.com")) return;
    const observer = new MutationObserver(() => {
        const name = extractFacebookUserName();
        if (name) {
            observer.disconnect();
            callback(name);
        }
    });
    observer.observe(document.body, {childList: true, subtree: true});

    const name = extractFacebookUserName();
    if (name) {
        observer.disconnect();
        callback(name);
    }
}

function extractFacebookUserName() {
    const img = document.querySelector('img[alt][src*="scontent"]');
    if (img && img.alt && img.alt.length > 1) return img.alt.trim();
    const spans = [...document.querySelectorAll('span')];
    for (const span of spans) {
        const txt = span.textContent?.trim();
        if (txt && txt.length >= 4 && /^[A-ZÅÄÖ][a-zåäö]+(?: [A-ZÅÄÖ][a-zåäö]+)?$/.test(txt)) return txt;
    }
    return null;
}

// ---------------------------------------------
// FIND CONTEXT NODE
// ---------------------------------------------
function findFullContextNode(n) {
    return (
        n.closest('[data-ad-preview="message"],[data-ad-comet-preview="message"],[role="article"],article,[data-pagelet],.userContentWrapper') ||
        n.closest('form,div') ||
        n.parentElement
    );
}

// ---------------------------------------------
// PANEL HTML
// ---------------------------------------------
function panelHTML() {
    return `
    <style id="sgpt-style">
      #sgpt-panel{position:fixed;bottom:16px;right:16px;width:360px;max-height:70vh;background:#fff;border:1px solid #ccc;border-radius:6px;box-shadow:0 4px 14px rgba(0,0,0,0.15);z-index:2147483647;display:flex;flex-direction:column;font-family:system-ui,sans-serif;font-size:14px}
      #sgpt-panel[data-collapsed="true"]{transform:translateX(calc(100% - 42px));transition:transform .3s}
      #sgpt-head{display:flex;align-items:center;background:#008CBA;color:#fff;padding:4px 8px;cursor:move;border-top-left-radius:6px;border-top-right-radius:6px}
      #sgpt-close{margin-left:auto;background:transparent;border:none;color:#fff;font-size:18px;cursor:pointer}
      #sgpt-body{flex:1;display:flex;flex-direction:column;padding:8px;overflow:hidden}
      #sgpt-body input[type=text],#sgpt-body textarea,#sgpt-body select{width:100%;margin-bottom:6px;border:1px solid #aaa;border-radius:4px;padding:4px;font-family:monospace}
      #sgpt-body textarea{resize:vertical;min-height:60px;max-height:160px}
      #sgpt-send,#sgpt-mod{margin-right:4px;padding:4px 10px;border:none;border-radius:4px;background:#008CBA;color:#fff;cursor:pointer}
      #sgpt-foot{display:flex;justify-content:flex-end}
      #sgpt-responder-label{font-size:12px;color:#666;margin-bottom:6px;text-align:right}
    </style>
    <div id="sgpt-head">SocialGPT ↔ <button id="sgpt-close">×</button></div>
    <div id="sgpt-body">
      <div id="sgpt-responder-label">Responder: <span id="sgpt-responder-name">(loading...)</span></div>
      <label>Prompt<input type="text" id="sgpt-prompt"></label>
      <label>Context<textarea id="sgpt-context" readonly></textarea></label>
      <label>Output<textarea id="sgpt-out"></textarea></label>
      <label>Modifier<input type="text" id="sgpt-modifier"></label>
      <label>Mood<select id="sgpt-mood">
        <option value="Friendly">Friendly</option>
        <option value="Sarcastic">Sarcastic</option>
        <option value="Formal">Formal</option>
        <option value="Aggressive">Aggressive</option>
      </select></label>
      <label>Custom mood<input type="text" id="sgpt-custom"></label>
      <label>Model<select id="sgpt-model">
        <option value="gpt-4o">gpt-4o</option>
        <option value="gpt-4">gpt-4</option>
        <option value="o3-mini">o3-mini</option>
      </select></label>
      <div id="sgpt-foot"><button id="sgpt-send">Send</button><button id="sgpt-mod">Modify</button></div>
    </div>`;
}

// ---------------------------------------------
// CREATE PANEL
// ---------------------------------------------
function createPanel() {
    if (panel) return panel;
    panel = document.createElement('div');
    panel.id = 'sgpt-panel';
    panel.innerHTML = panelHTML();
    document.body.appendChild(panel);

    const head = panel.querySelector('#sgpt-head');
    let drag = false, sx, sy;

    head.addEventListener('mousedown', e => {
        drag = true;
        sx = e.clientX;
        sy = e.clientY;
    });

    document.addEventListener('mousemove', e => {
        if (!drag) return;
        const dx = e.clientX - sx;
        const dy = e.clientY - sy;
        const r = panel.getBoundingClientRect();
        panel.style.right = Math.max(parseFloat(panel.style.right || '16') - dx, 0) + 'px';
        panel.style.bottom = Math.max(parseFloat(panel.style.bottom || '16') - dy, 0) + 'px';
        sx = e.clientX;
        sy = e.clientY;
    });

    document.addEventListener('mouseup', () => drag = false);

    head.addEventListener('dblclick', () => {
        panel.dataset.collapsed = panel.dataset.collapsed === 'true' ? 'false' : 'true';
    });

    panel.querySelector('#sgpt-close').addEventListener('click', () => {
        panel.remove();
        panel = null;
    });

    panel.querySelector('#sgpt-send').addEventListener('click', () => sendGPT(false));
    panel.querySelector('#sgpt-mod').addEventListener('click', () => sendGPT(true));

    return panel;
}

// ---------------------------------------------
// SEND TO GPT
// ---------------------------------------------
function sendGPT(mod) {
    const ctx = panel.querySelector('#sgpt-context').value;
    const prompt = panel.querySelector('#sgpt-prompt').value.trim();
    const modifier = mod ? panel.querySelector('#sgpt-modifier').value.trim() : '';
    const model = panel.querySelector('#sgpt-model').value;
    if (!prompt && !mod) return alert('Enter prompt');
    showLoader();
    chrome.runtime.sendMessage({
        type: 'GPT_REQUEST',
        context: ctx,
        userPrompt: prompt,
        modifier,
        mood: panel.querySelector('#sgpt-mood').value,
        customMood: panel.querySelector('#sgpt-custom').value.trim(),
        previousReply: panel.querySelector('#sgpt-out').value,
        model
    });
}

// ---------------------------------------------
// MARK-MODE CLICK HANDLER
// ---------------------------------------------
document.addEventListener('click', e => {
    if (!isClickMarkingActive) return;
    if (e.target.closest('#sgpt-panel')) return;
    const t = findFullContextNode(e.target);
    if (!t) return;
    const already = markedElements.includes(t);
    if (already) {
        t.classList.remove('socialgpt-marked');
        markedElements = markedElements.filter(el => el !== t);
    } else {
        t.classList.add('socialgpt-marked');
        markedElements.push(t);
    }
    e.preventDefault();
}, true);

// ---------------------------------------------
// MAIN LISTENER
// ---------------------------------------------
chrome.runtime.onMessage.addListener(req => {
    if (req.type === 'SHOW_LOADER') return showLoader();
    if (req.type === 'HIDE_LOADER') return hideLoader();

    if (req.type === 'TOGGLE_MARK_MODE') {
        isClickMarkingActive = req.enabled;

    } else if (req.type === 'OPEN_REPLY_PANEL') {
        const p = createPanel();
        p.dataset.collapsed = 'false';
        p.querySelector('#sgpt-context').value = markedElements.map((el, i) => `[${i + 1}]\n${el.innerText.trim()}`).join('\n\n---\n\n') || '(No elements marked)';
        p.querySelector('#sgpt-prompt').focus();

        isClickMarkingActive = false;
        chrome.runtime.sendMessage({type: 'TOGGLE_MARK_MODE', enabled: false});

        chrome.storage.sync.get('responderName', (data) => {
            const rName = data.responderName || 'Anonymous';
            const label = p.querySelector('#sgpt-responder-name');
            if (label) label.textContent = rName;
        });

        detectFacebookUserNameViaObserver((name) => {
            chrome.storage.sync.get('responderName', (data) => {
                if (!data.responderName || data.responderName === 'Anonymous') {
                    chrome.storage.sync.set({responderName: name});
                    const label = p.querySelector('#sgpt-responder-name');
                    if (label && name) label.textContent = name;
                    console.log('[SocialGPT] Auto-detected name:', name);
                }
            });
        });

    } else if (req.type === 'GPT_RESPONSE') {
        hideLoader();
        if (panel) {
            const outputElement = panel.querySelector('#sgpt-out');
            if (outputElement) outputElement.value = req.payload;
        }
    }
});

console.log('[SocialGPT] content script ready');
