(function () {
    if (window.__TN_NETWORK_MONITOR__) {
        return;
    }

    window.__TN_NETWORK_MONITOR__ = true;

    function clip(value, limit) {
        var text = String(value || '');
        if (text.length <= limit) {
            return text;
        }

        return text.substring(0, limit) + '\n...[clipped]';
    }

    function safeJsonParse(value) {
        try {
            return JSON.parse(value);
        } catch (e) {
            return null;
        }
    }

    function normalizeWhitespace(value) {
        return String(value || '').replace(/\s+/g, ' ').trim();
    }

    function detectHandledOutcome(text) {
        var lowered = normalizeWhitespace(text).toLowerCase();

        if (!lowered) {
            return null;
        }

        if (lowered.indexOf('godk') !== -1 || lowered.indexOf('approv') !== -1 || lowered.indexOf('published') !== -1 || lowered.indexOf('allowed') !== -1) {
            return 'approved';
        }

        if (lowered.indexOf('avvis') !== -1 || lowered.indexOf('reject') !== -1 || lowered.indexOf('declin') !== -1) {
            return 'rejected';
        }

        if (lowered.indexOf('tagit bort') !== -1 || lowered.indexOf('removed') !== -1 || lowered.indexOf('delete') !== -1) {
            return 'removed';
        }

        if (lowered.indexOf('rediger') !== -1 || lowered.indexOf('edit') !== -1 || lowered.indexOf('changed') !== -1) {
            return 'edited';
        }

        if (lowered.indexOf('lagt till') !== -1 || lowered.indexOf('added') !== -1) {
            return 'added';
        }

        if (lowered.indexOf('block') !== -1 || lowered.indexOf('banned') !== -1 || lowered.indexOf('ban ') !== -1) {
            return 'blocked';
        }

        if (lowered.indexOf('återkall') !== -1 || lowered.indexOf('revoked') !== -1) {
            return 'revoked';
        }

        return 'observed';
    }

    function detectHandledStatusText(text, isAutomatic, outcome) {
        if (isAutomatic) {
            return outcome ? outcome + '_automatically' : 'automatic';
        }

        return outcome || null;
    }

    function extractTitleNames(title) {
        var titleText = normalizeWhitespace(title && title.text ? title.text : '');
        var ranges = title && Array.isArray(title.ranges) ? title.ranges.slice() : [];
        var names = [];

        ranges.sort(function (a, b) {
            return (a && typeof a.offset === 'number' ? a.offset : 0) - (b && typeof b.offset === 'number' ? b.offset : 0);
        });

        ranges.forEach(function (range) {
            if (!range) {
                return;
            }

            var entityName = normalizeWhitespace(range.entity && (range.entity.name || range.entity.text || range.entity.short_name) ? (range.entity.name || range.entity.text || range.entity.short_name) : '');
            var slicedName = '';

            if (!entityName && titleText && typeof range.offset === 'number' && typeof range.length === 'number') {
                slicedName = normalizeWhitespace(titleText.slice(range.offset, range.offset + range.length));
            }

            var name = entityName || slicedName;
            if (name && names.indexOf(name) === -1) {
                names.push(name);
            }
        });

        return names;
    }

    function parseActivityNode(node) {
        if (!node || node.__typename !== 'GroupAdminActivity') {
            return null;
        }

        var actionText = normalizeWhitespace(node.activity_title && node.activity_title.text ? node.activity_title.text : '');
        if (!actionText) {
            return null;
        }

        var names = extractTitleNames(node.activity_title);
        var lowered = actionText.toLowerCase();
        var isAutomatic = !!node.is_automatic_action || lowered.indexOf('automatiskt') !== -1 || lowered.indexOf('automatically') !== -1;
        var actorName = isAutomatic ? 'Automatic moderation' : (names[0] || '');
        var targetName = isAutomatic ? (names[0] || names[1] || '') : (names[1] || '');
        var handledOutcome = detectHandledOutcome(actionText);

        if (!actorName && names[0]) {
            actorName = names[0];
        }

        if (!actorName) {
            actorName = isAutomatic ? 'Automatic moderation' : 'Unknown actor';
        }

        return {
            key: [window.location.pathname, String(node.id || ''), actorName, targetName || '', actionText].join('|'),
            source_url: window.location.origin + window.location.pathname,
            activity_url: window.location.href,
            occurred_at: node.activity_time ? new Date(node.activity_time * 1000).toISOString() : null,
            actor_name: actorName,
            action_text: actionText,
            target_name: targetName || null,
            handled_outcome: handledOutcome,
            handled_status_text: detectHandledStatusText(actionText, isAutomatic, handledOutcome),
            raw_blue_segment: actionText,
            network_activity_id: node.id || null,
            is_automatic_action: isAutomatic
        };
    }

    function walkForActivities(value, results, seenKeys) {
        if (!value) {
            return;
        }

        if (Array.isArray(value)) {
            value.forEach(function (item) {
                walkForActivities(item, results, seenKeys);
            });
            return;
        }

        if (typeof value !== 'object') {
            return;
        }

        if (value.__typename === 'GroupAdminActivity') {
            var parsedNode = parseActivityNode(value);
            if (parsedNode && !seenKeys[parsedNode.key]) {
                seenKeys[parsedNode.key] = true;
                results.push(parsedNode);
            }
        }

        var edges1 = value.data && value.data.node && value.data.node.management_activities && value.data.node.management_activities.edges;
        var edges2 = value.data && value.data.management_activity_log_target && value.data.management_activity_log_target.management_activities && value.data.management_activity_log_target.management_activities.edges;
        var edges3 = value.result && value.result.data && value.result.data.management_activity_log_target && value.result.data.management_activity_log_target.management_activities && value.result.data.management_activity_log_target.management_activities.edges;
        var edges4 = value.__bbox && value.__bbox.result && value.__bbox.result.data && value.__bbox.result.data.management_activity_log_target && value.__bbox.result.data.management_activity_log_target.management_activities && value.__bbox.result.data.management_activity_log_target.management_activities.edges;
        var edges5 = value.result && value.result.data && value.result.data.node && value.result.data.node.management_activities && value.result.data.node.management_activities.edges;

        [edges1, edges2, edges3, edges4, edges5].forEach(function (edges) {
            if (!Array.isArray(edges)) {
                return;
            }

            edges.forEach(function (edge) {
                var parsedNode = parseActivityNode(edge && edge.node ? edge.node : null);
                if (parsedNode && !seenKeys[parsedNode.key]) {
                    seenKeys[parsedNode.key] = true;
                    results.push(parsedNode);
                }
            });
        });

        Object.keys(value).forEach(function (key) {
            if (key === 'data' || key === 'result' || key === 'payload' || key === 'extensions' || key === '__bbox' || key === 'require') {
                walkForActivities(value[key], results, seenKeys);
            }
        });
    }

    function parseDetectedEntriesFromResponse(text) {
        var raw = String(text || '');
        var lowered = raw.toLowerCase();
        var results = [];
        var seenKeys = {};

        if (!raw || (lowered.indexOf('groupadminactivity') === -1 && lowered.indexOf('management_activities') === -1 && lowered.indexOf('management_activity_log_target') === -1 && lowered.indexOf('admin_activities') === -1)) {
            return results;
        }

        raw.split(/\n+(?=\{)/g).forEach(function (part) {
            var parsed = safeJsonParse(part);
            if (parsed) {
                walkForActivities(parsed, results, seenKeys);
            }
        });

        if (!results.length) {
            var singleParsed = safeJsonParse(raw);
            if (singleParsed) {
                walkForActivities(singleParsed, results, seenKeys);
            }
        }

        return results;
    }

    function extractCommentText(node) {
        var candidates = [
            node && node.body && node.body.text,
            node && node.preferred_body && node.preferred_body.text,
            node && node.message && node.message.text,
            node && node.comment_body && node.comment_body.text,
            node && node.text,
        ];

        for (var i = 0; i < candidates.length; i += 1) {
            var text = normalizeWhitespace(candidates[i]);
            if (text) {
                return text;
            }
        }

        return '';
    }

    function extractCommentAuthor(node) {
        var candidates = [
            node && node.author && node.author.name,
            node && node.user && node.user.name,
            node && node.actor && node.actor.name,
            node && node.owner && node.owner.name,
        ];

        for (var i = 0; i < candidates.length; i += 1) {
            var name = normalizeWhitespace(candidates[i]);
            if (name) {
                return name;
            }
        }

        return '';
    }

    function looksLikeCommentNode(node) {
        if (!node || typeof node !== 'object') {
            return false;
        }

        var typename = normalizeWhitespace(node.__typename || '').toLowerCase();
        var hasCommentType = typename.indexOf('comment') !== -1;
        var authorName = extractCommentAuthor(node);
        var bodyText = extractCommentText(node);
        var hasCommentShape = !!(node.author || node.user || node.body || node.preferred_body || node.message || node.comment_body);

        if (!authorName || !bodyText) {
            return false;
        }

        if (bodyText.length < 2) {
            return false;
        }

        return hasCommentType || hasCommentShape;
    }

    function parseCommentNode(node, batchId) {
        if (!looksLikeCommentNode(node)) {
            return null;
        }

        var authorName = extractCommentAuthor(node);
        var bodyText = extractCommentText(node);
        var commentId = normalizeWhitespace(node.id || node.legacy_fbid || node.comment_id || '');
        var parentCommentId = normalizeWhitespace(node.parent_comment_id || node.parent_id || '');

        return {
            key: ['comment', batchId, commentId || authorName, bodyText].join('|'),
            batch_id: batchId,
            comment_id: commentId || null,
            parent_comment_id: parentCommentId || null,
            author_name: authorName,
            body_text: bodyText,
            source_url: window.location.href,
        };
    }

    function walkForComments(value, results, seenKeys, batchId) {
        if (!value || results.length >= 120) {
            return;
        }

        if (Array.isArray(value)) {
            value.forEach(function (item) {
                walkForComments(item, results, seenKeys, batchId);
            });
            return;
        }

        if (typeof value !== 'object') {
            return;
        }

        var parsedComment = parseCommentNode(value, batchId);
        if (parsedComment && !seenKeys[parsedComment.key]) {
            seenKeys[parsedComment.key] = true;
            results.push(parsedComment);
        }

        Object.keys(value).forEach(function (key) {
            if (results.length >= 120) {
                return;
            }

            walkForComments(value[key], results, seenKeys, batchId);
        });
    }

    function parseDetectedCommentsFromResponse(text, batchId) {
        var raw = String(text || '');
        var lowered = raw.toLowerCase();
        var results = [];
        var seenKeys = {};

        if (!raw || (lowered.indexOf('comment') === -1 && lowered.indexOf('reply') === -1 && lowered.indexOf('feedback') === -1 && lowered.indexOf('ufi') === -1)) {
            return results;
        }

        raw.split(/\n+(?=\{)/g).forEach(function (part) {
            var parsed = safeJsonParse(part);
            if (parsed) {
                walkForComments(parsed, results, seenKeys, batchId);
            }
        });

        if (!results.length) {
            var singleParsed = safeJsonParse(raw);
            if (singleParsed) {
                walkForComments(singleParsed, results, seenKeys, batchId);
            }
        }

        return results;
    }

    function buildUrlMeta(url) {
        try {
            var parsed = new URL(url, window.location.origin);
            return {
                host: parsed.host,
                pathname: parsed.pathname,
                search: parsed.search,
                is_graphql: parsed.pathname.indexOf('/api/graphql') !== -1 || parsed.pathname.indexOf('graphql') !== -1,
            };
        } catch (e) {
            return {
                host: '',
                pathname: '',
                search: '',
                is_graphql: String(url || '').indexOf('graphql') !== -1,
            };
        }
    }

    function readBodyText(body) {
        if (!body) {
            return '';
        }

        if (typeof body === 'string') {
            return body;
        }

        if (typeof URLSearchParams !== 'undefined' && body instanceof URLSearchParams) {
            return body.toString();
        }

        if (typeof FormData !== 'undefined' && body instanceof FormData) {
            var params = new URLSearchParams();
            body.forEach(function (value, key) {
                params.append(key, String(value));
            });
            return params.toString();
        }

        if (typeof body === 'object') {
            try {
                return JSON.stringify(body);
            } catch (e) {
                return '[object body]';
            }
        }

        return String(body || '');
    }

    function parseBodyMeta(body) {
        var raw = readBodyText(body);
        var params = null;
        var json = null;
        var variables = null;

        if (raw) {
            try {
                params = new URLSearchParams(raw);
            } catch (e) {
                params = null;
            }

            if (/^\s*[\[{]/.test(raw)) {
                json = safeJsonParse(raw);
            }
        }

        if (params && params.get('variables')) {
            variables = safeJsonParse(params.get('variables')) || clip(params.get('variables'), 500);
        } else if (json && json.variables) {
            variables = json.variables;
        }

        return {
            raw: raw,
            preview: clip(raw, 1200),
            size: raw ? raw.length : 0,
            doc_id: (params && params.get('doc_id')) || (json && json.doc_id) || '',
            friendly_name: (params && (params.get('fb_api_req_friendly_name') || params.get('friendly_name'))) || (json && (json.fb_api_req_friendly_name || json.friendly_name || json.operationName)) || '',
            operation_name: (params && params.get('fb_api_req_friendly_name')) || (json && (json.operationName || json.fb_api_req_friendly_name)) || '',
            variables_preview: variables ? clip(typeof variables === 'string' ? variables : JSON.stringify(variables), 800) : '',
        };
    }

    function extractResponseHints(text) {
        var preview = clip(text, 2000);
        return {
            response_preview: preview,
            mentions_activity_log: /GroupAdminActivity|management_activities|management_activity_log_target|admin_activities/i.test(String(text || '')),
        };
    }

    function safeReadXhrResponseText(xhr) {
        var responseType = '';
        var contentType = '';

        try {
            responseType = String(xhr && xhr.responseType ? xhr.responseType : '');
        } catch (e) {
            responseType = '';
        }

        try {
            contentType = typeof xhr.getResponseHeader === 'function' ? String(xhr.getResponseHeader('content-type') || '') : '';
        } catch (e) {
            contentType = '';
        }

        if (!xhr) {
            return '';
        }

        if (responseType === '' || responseType === 'text') {
            try {
                return xhr.responseText || '';
            } catch (e) {
                return '[unavailable text response]';
            }
        }

        if (responseType === 'json') {
            try {
                return xhr.response ? JSON.stringify(xhr.response) : '';
            } catch (e) {
                return '[unavailable json response]';
            }
        }

        if (responseType === 'document') {
            try {
                return xhr.responseXML && xhr.responseXML.documentElement
                    ? xhr.responseXML.documentElement.outerHTML
                    : '[document response omitted]';
            } catch (e) {
                return '[document response omitted]';
            }
        }

        if (responseType === 'arraybuffer') {
            try {
                var byteLength = xhr.response && typeof xhr.response.byteLength === 'number' ? xhr.response.byteLength : 0;
                if (/json|text|javascript|graphql/i.test(contentType) && typeof TextDecoder !== 'undefined' && xhr.response) {
                    return new TextDecoder('utf-8').decode(new Uint8Array(xhr.response));
                }
                return '[arraybuffer response omitted' + (byteLength ? ' ' + byteLength + ' bytes' : '') + ']';
            } catch (e) {
                return '[arraybuffer response omitted]';
            }
        }

        if (responseType === 'blob') {
            try {
                var blobSize = xhr.response && typeof xhr.response.size === 'number' ? xhr.response.size : 0;
                return '[blob response omitted' + (blobSize ? ' ' + blobSize + ' bytes' : '') + ']';
            } catch (e) {
                return '[blob response omitted]';
            }
        }

        return '[response omitted for type ' + responseType + ']';
    }

    function buildPayload(base) {
        var urlMeta = buildUrlMeta(base.url || '');
        var bodyMeta = parseBodyMeta(base.request_body);
        var responseMeta = extractResponseHints(base.response_text || '');
        var batchId = [Date.now(), Math.round(Math.random() * 1000000), clip(base.url || '', 120)].join(':');
        var shouldParseDetections = !!(urlMeta.is_graphql || responseMeta.mentions_activity_log || /admin_activities|management_activities|management_activity_log_target|groupadminactivity/i.test(String(bodyMeta.preview || '')));
        var detectedEntries = shouldParseDetections ? parseDetectedEntriesFromResponse(base.response_text || '') : [];
        var shouldParseComments = !!(urlMeta.is_graphql && /comment|reply|feedback|ufi/i.test(String(bodyMeta.preview || '') + ' ' + String(responseMeta.response_preview || '')));
        var detectedComments = shouldParseComments ? parseDetectedCommentsFromResponse(base.response_text || '', batchId) : [];

        return {
            transport: base.transport,
            method: base.method,
            url: base.url,
            host: urlMeta.host,
            pathname: urlMeta.pathname,
            search: urlMeta.search,
            is_graphql: !!(base.is_graphql || urlMeta.is_graphql),
            status: base.status,
            duration_ms: base.duration_ms,
            content_type: base.content_type || '',
            response_type: base.response_type || '',
            doc_id: bodyMeta.doc_id,
            friendly_name: bodyMeta.friendly_name,
            operation_name: bodyMeta.operation_name,
            request_size: bodyMeta.size,
            request_preview: bodyMeta.preview,
            variables_preview: bodyMeta.variables_preview,
            response_preview: responseMeta.response_preview,
            mentions_activity_log: responseMeta.mentions_activity_log,
            network_batch_id: batchId,
            detected_entries: detectedEntries,
            detected_count: detectedEntries.length,
            detected_comment_entries: detectedComments,
            detected_comment_count: detectedComments.length,
        };
    }

    function post(payload) {
        try {

            window.postMessage({
                source: 'tn-networks-social-media-tools',
                type: 'NETWORK_EVENT',
                payload: payload,
            }, '*');
        } catch (e) {
        }
    }

    var originalFetch = window.fetch;
    if (typeof originalFetch === 'function') {
        window.fetch = function () {
            var args = Array.prototype.slice.call(arguments);
            var input = args[0];
            var init = args[1] || {};
            var url = typeof input === 'string' ? input : (input && input.url) || '';
            var method = init.method || (input && input.method) || 'GET';
            var startedAt = Date.now();
            var requestBody = init.body || null;

            return originalFetch.apply(this, args).then(function (response) {
                var cloned = response.clone();
                cloned.text().then(function (bodyText) {
                    post(buildPayload({
                        transport: 'fetch',
                        method: method,
                        url: url,
                        is_graphql: String(url || '').indexOf('graphql') !== -1,
                        status: response.status,
                        duration_ms: Date.now() - startedAt,
                        content_type: response.headers && response.headers.get ? (response.headers.get('content-type') || '') : '',
                        request_body: requestBody,
                        response_text: bodyText,
                    }));
                }).catch(function () {
                    post(buildPayload({
                        transport: 'fetch',
                        method: method,
                        url: url,
                        is_graphql: String(url || '').indexOf('graphql') !== -1,
                        status: response.status,
                        duration_ms: Date.now() - startedAt,
                        content_type: response.headers && response.headers.get ? (response.headers.get('content-type') || '') : '',
                        request_body: requestBody,
                        response_text: '[unavailable]',
                    }));
                });

                return response;
            }).catch(function (error) {
                post(buildPayload({
                    transport: 'fetch',
                    method: method,
                    url: url,
                    is_graphql: String(url || '').indexOf('graphql') !== -1,
                    status: 0,
                    duration_ms: Date.now() - startedAt,
                    request_body: requestBody,
                    response_text: '[error] ' + clip(error && error.message ? error.message : 'Unknown fetch error', 500),
                }));
                throw error;
            });
        };
    }

    var originalOpen = XMLHttpRequest.prototype.open;
    var originalSend = XMLHttpRequest.prototype.send;

    XMLHttpRequest.prototype.open = function (method, url) {
        this.__tnRequestMethod = method;
        this.__tnRequestUrl = url;
        this.__tnStartedAt = Date.now();
        return originalOpen.apply(this, arguments);
    };

    XMLHttpRequest.prototype.send = function (body) {
        var xhr = this;
        xhr.__tnRequestBody = body;
        xhr.addEventListener('loadend', function () {
            var responseType = '';
            try {
                responseType = String(xhr.responseType || '');
            } catch (e) {
                responseType = '';
            }

            post(buildPayload({
                transport: 'xhr',
                method: xhr.__tnRequestMethod || 'GET',
                url: xhr.__tnRequestUrl || '',
                is_graphql: String(xhr.__tnRequestUrl || '').indexOf('graphql') !== -1,
                status: xhr.status || 0,
                duration_ms: xhr.__tnStartedAt ? Date.now() - xhr.__tnStartedAt : null,
                content_type: typeof xhr.getResponseHeader === 'function' ? (xhr.getResponseHeader('content-type') || '') : '',
                response_type: responseType,
                request_body: xhr.__tnRequestBody,
                response_text: safeReadXhrResponseText(xhr),
            }));
        });

        return originalSend.apply(this, arguments);
    };
}());

