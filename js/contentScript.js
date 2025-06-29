let markedElements = [], isClickMarkingActive = false, panel;
let frontResponserName = '';

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

function showFactResultBox(content) {
    const existing = document.getElementById('sgpt-factbox');
    if (existing) existing.remove();

    const box = document.createElement('div');
    box.id = 'sgpt-factbox';
    box.style.position = 'fixed';
    box.style.bottom = '20px';
    box.style.right = '20px';
    box.style.width = '400px';
    box.style.maxHeight = '60vh';
    box.style.overflow = 'auto';
    box.style.background = '#fff';
    box.style.border = '1px solid #ccc';
    box.style.borderRadius = '8px';
    box.style.boxShadow = '0 4px 14px rgba(0,0,0,0.2)';
    box.style.padding = '12px';
    box.style.zIndex = 2147483647;
    box.style.fontFamily = 'system-ui, sans-serif';
    box.style.fontSize = '14px';
    box.style.whiteSpace = 'pre-wrap';
    box.style.lineHeight = '1.4';

    const closeBtn = document.createElement('button');
    closeBtn.textContent = '×';
    closeBtn.style.position = 'absolute';
    closeBtn.style.top = '6px';
    closeBtn.style.right = '8px';
    closeBtn.style.border = 'none';
    closeBtn.style.background = 'transparent';
    closeBtn.style.fontSize = '18px';
    closeBtn.style.cursor = 'pointer';
    closeBtn.addEventListener('click', () => box.remove());

    const title = document.createElement('div');
    title.textContent = '✅ Fact checking via OpenAI';
    title.style.fontWeight = 'bold';
    title.style.marginBottom = '8px';
    title.style.color = '#008CBA';

    const text = document.createElement('div');
    text.textContent = content;

    box.appendChild(closeBtn);
    box.appendChild(title);
    box.appendChild(text);
    document.body.appendChild(box);
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
            frontResponserName = name;
            observer.disconnect();
            callback(name);
        }
    });
    observer.observe(document.body, {childList: true, subtree: true});

    const name = extractFacebookUserName();
    if (name) {
        frontResponserName = name;
        observer.disconnect();
        callback(name);
    }
}

function extractFacebookUserName() {
    const scripts = document.querySelectorAll('script[type="application/json"]');
    for (const script of scripts) {
        try {
            const json = JSON.parse(script.textContent);
            const name = json?.require?.[0]?.[3]?.[0]?.__bbox?.require?.[0]?.[3]?.[1]?.__bbox?.result?.data?.viewer?.actor?.name;
            if (name) return name;
        } catch (e) {
        }
    }

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
    return (n.closest('[data-ad-preview="message"],[data-ad-comet-preview="message"],[role="article"],article,[data-pagelet],.userContentWrapper') || n.closest('form,div') || n.parentElement);
}


// ---------------------------------------------
// EXTRACT READABLE CONTEXT (GENERIC, WITH MEDIA)
// ---------------------------------------------
function getReadableContext(el) {
    const parts = [];

    // 1. Include the selected element
    parts.push(convertNodeToReadableText(el.cloneNode(true)));

    // 2. Look for outer container used by Facebook
    const fbContainer = el.closest('[data-ad-preview="message"]');
    if (fbContainer && fbContainer.parentElement) {
        const siblings = Array.from(fbContainer.parentElement.children);
        let found = false;
        for (const sib of siblings) {
            if (sib === fbContainer) {
                found = true;
                continue;
            }
            if (!found) continue;
            if (containsMedia(sib)) {
                parts.push('[Attached media]');
                parts.push(convertNodeToReadableText(sib.cloneNode(true)));
            }
        }
    }

    // 3. Background-image elements
    const bgImages = extractBackgroundImagesAround(el);
    if (bgImages.length > 0) {
        parts.push('[Background images]');
        parts.push(...bgImages);
    }

    return parts.join('\n\n');
}

function containsMedia(node) {
    return node.querySelector('img, video, iframe, picture, svg, audio, embed, object, a[href]') !== null;
}

function convertNodeToReadableText(node) {
    // Handle images
    const imgs = node.querySelectorAll('img');
    for (const img of imgs) {
        const isEmoji = img.src.includes('emoji.php');
        const label = isEmoji
            ? img.alt || '🖼️'
            : `[IMG: ${img.alt?.trim() || img.src || 'image'}]`;
        const span = document.createElement('span');
        span.textContent = label;
        img.replaceWith(span);
    }

    // Handle videos/embeds
    const videos = node.querySelectorAll('video, iframe, embed, object');
    for (const vid of videos) {
        const label = `[VIDEO: ${vid.src || 'embedded video'}]`;
        const span = document.createElement('span');
        span.textContent = label;
        vid.replaceWith(span);
    }

    // Handle links
    const links = node.querySelectorAll('a[href]');
    for (const a of links) {
        const text = a.textContent?.trim().replace(/\s+/g, ' ') || 'link';
        const url = a.href;
        const label = `[LINK: ${text} (${url})]`;
        const span = document.createElement('span');
        span.textContent = label;
        a.replaceWith(span);
    }

    return node.innerText.trim();
}

function extractBackgroundImagesAround(el) {
    const found = [];
    const scope = el.closest('[data-ad-preview="message"]')?.parentElement || el.parentElement;
    if (!scope) return found;

    const nodes = scope.querySelectorAll('*');
    for (const node of nodes) {
        const bg = window.getComputedStyle(node).getPropertyValue('background-image');
        const match = bg?.match(/url\(["']?(.*?)["']?\)/);
        if (match && match[1] && !match[1].includes('emoji.php')) {
            found.push(`[IMG: ${match[1]}]`);
        }
    }

    return found;
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
      <div id="sgpt-responder-label">Responder: <span id="sgpt-responder-name" data-name="${frontResponserName || ''}">${frontResponserName || '(loading...)'}</span></div>
      <label>Prompt<input type="text" id="sgpt-prompt"></label>
      <label>Context<textarea id="sgpt-context" readonly></textarea></label>
      <label>Output<textarea id="sgpt-out"></textarea></label>
      <label>Modifier<input type="text" id="sgpt-modifier"></label>
      <label>Mood
          <select id="sgpt-mood">
            <optgroup label="Objective & Informative">
              <option value="Neutral and formal">Neutral and formal</option>
              <option value="Fact-based and concise">Fact-based and concise</option>
              <option value="Academic and precise">Academic and precise</option>
              <option value="Analytical and critical">Analytical and critical</option>
            </optgroup>
            <optgroup label="Confrontational & Direct">
              <option value="Critical and direct">Critical and direct</option>
              <option value="Cynical and sharp">Cynical and sharp</option>
              <option value="Aggressive and unapologetic">Aggressive and unapologetic</option>
              <option value="Brutally honest">Brutally honest</option>
            </optgroup>
            <optgroup label="Satirical & Sarcastic">
              <option value="Sarcastic and dry">Sarcastic and dry</option>
              <option value="Snarky and dismissive">Snarky and dismissive</option>
              <option value="Satirical and ironic">Satirical and ironic</option>
              <option value="Witty and clever">Witty and clever</option>
            </optgroup>
            <optgroup label="Approachable & Light">
              <option value="Friendly and casual">Friendly and casual</option>
              <option value="Conversational and soft">Conversational and soft</option>
            </optgroup>
          </select>
        </label>
      <label>Custom mood<input type="text" id="sgpt-custom"></label>
      <label>Response length
          <select id="sgpt-length">
            <option value="auto">Let GPT decide</option>
            <option value="as-short-as-possible">As short as possible</option>
            <option value="shortest-possible">At maxmium one sentence. Possibly a oneliner.</option>
            <option value="very-short">2–3 sentences (very short)</option>
            <option value="short">4–6 sentences (short)</option>
            <option value="medium">6–10 sentences (medium)</option>
            <option value="extreme">Extreme. You want your own book.</option>
            <option value="long">Extended (whatever is needed)</option>
          </select>
      </label>
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
function sendGPT(mod, mode) {
    const ctx = panel.querySelector('#sgpt-context').value;
    const prompt = panel.querySelector('#sgpt-prompt').value.trim();
    const modifier = mod ? panel.querySelector('#sgpt-modifier')?.value.trim() : '';
    const model = panel.querySelector('#sgpt-model')?.value;
    if (!prompt && !mod) return alert('Enter prompt');
    showLoader();

    const selectedLength = panel.querySelector('#sgpt-length').value;
    chrome.storage.sync.set({ lastResponseLength: selectedLength });

    chrome.runtime.sendMessage({
        type: 'GPT_REQUEST',
        context: ctx,
        userPrompt: prompt,
        modifier,
        mood: panel.querySelector('#sgpt-mood')?.value,
        responseLength: selectedLength,
        customMood: panel.querySelector('#sgpt-custom')?.value.trim(),
        previousReply: panel.querySelector('#sgpt-out')?.value,
        model,
        responderName: panel.querySelector('#sgpt-responder-name')?.dataset.name?.trim() || frontResponserName || 'Anonymous',
        requestMode: mode || 'reply'
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

function resetMarksAndContext() {
    markedElements.forEach(el => el.classList.remove('socialgpt-marked'));
    markedElements = [];

    if (panel) {
        chrome.runtime.sendMessage({type: 'RESET_MARK_MODE'});

        const fields = [['#sgpt-modifier', '']
            /*
                        ['#sgpt-context', ''],
                        ['#sgpt-prompt', ''],
                        ['#sgpt-out', ''],
                        ['#sgpt-custom', ''],
                        ['#sgpt-mood', 'Friendly'],
                        ['#sgpt-model', 'gpt-4o']
            */];

        for (const [selector, value] of fields) {
            const el = panel.querySelector(selector);
            if (el) el.value = value;
        }
    }
}

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
        //p.querySelector('#sgpt-context').value = markedElements.map((el, i) => `[${i + 1}]\n${el.innerText.trim()}`).join('\n\n---\n\n') || '(No elements marked)';
        p.querySelector('#sgpt-context').value = markedElements.map((el, i) => `[${i + 1}]\n${getReadableContext(el)}`).join('\n\n---\n\n') || '(No elements marked)';
        p.querySelector('#sgpt-prompt').focus();

        isClickMarkingActive = false;
        chrome.runtime.sendMessage({type: 'TOGGLE_MARK_MODE', enabled: false});

        chrome.storage.sync.get(['responderName', 'autoDetectResponder'], (data) => {
            const label = p.querySelector('#sgpt-responder-name');

            if (data.autoDetectResponder) {
                detectFacebookUserNameViaObserver((name) => {
                    frontResponserName = name;
                    if (label) {
                        label.textContent = name;
                        label.dataset.name = name;
                    }
                });
            } else {
                frontResponserName = data.responderName || 'Anonymous';
                if (label) label.textContent = frontResponserName;
            }
        });
    } else if (req.type === 'GPT_RESPONSE') {
        hideLoader();
        if (panel) {
            const outputElement = panel.querySelector('#sgpt-out');
            if (outputElement) {
                outputElement.value = req.payload;
                resetMarksAndContext();
                return;
            }
        }

        showFactResultBox(req.payload);

    } else if (req.type === 'START_FACT_VERIFICATION') {
        if (!markedElements.length) return alert('No elements marked for verification.');

        const context = markedElements.map((el, i) => `[${i + 1}]\n${el.innerHTML.trim()}`).join('\n\n---\n\n');
        showLoader();

        chrome.runtime.sendMessage({
            type: 'GPT_REQUEST',
            context,
            userPrompt: 'Search facts and verify the following statements. If you find any false or misleading information, provide a detailed explanation of why it is incorrect. Use plain text, no format and no markdown.',
            requestMode: 'verify',
            responderName: frontResponserName || 'VerifierBot'
        });

        resetMarksAndContext();
    }
});

console.log('[SocialGPT] content script ready');
