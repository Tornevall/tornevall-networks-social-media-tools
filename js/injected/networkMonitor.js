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

    function buildPayload(base) {
        var urlMeta = buildUrlMeta(base.url || '');
        var bodyMeta = parseBodyMeta(base.request_body);
        var responseMeta = extractResponseHints(base.response_text || '');

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
            doc_id: bodyMeta.doc_id,
            friendly_name: bodyMeta.friendly_name,
            operation_name: bodyMeta.operation_name,
            request_size: bodyMeta.size,
            request_preview: bodyMeta.preview,
            variables_preview: bodyMeta.variables_preview,
            response_preview: responseMeta.response_preview,
            mentions_activity_log: responseMeta.mentions_activity_log,
        };
    }

    function shouldConsoleLog(payload) {
        if (!payload) {
            return false;
        }

        if (payload.mentions_activity_log) {
            return true;
        }

        if (payload.is_graphql) {
            return true;
        }

        var haystack = [
            payload.url,
            payload.pathname,
            payload.friendly_name,
            payload.operation_name,
            payload.doc_id,
            payload.request_preview,
            payload.response_preview,
        ].join(' ').toLowerCase();

        return haystack.indexOf('admin_activities') !== -1
            || haystack.indexOf('management_activities') !== -1
            || haystack.indexOf('management_activity_log_target') !== -1
            || haystack.indexOf('groupadminactivity') !== -1;
    }

    function post(payload) {
        try {
            if (shouldConsoleLog(payload) && typeof console !== 'undefined' && console.info) {
                console.info('[TN Social Tools][network]', {
                    transport: payload.transport,
                    method: payload.method,
                    status: payload.status,
                    duration_ms: payload.duration_ms,
                    pathname: payload.pathname,
                    doc_id: payload.doc_id,
                    friendly_name: payload.friendly_name || payload.operation_name || '',
                    mentions_activity_log: payload.mentions_activity_log,
                    request_preview: payload.request_preview,
                    response_preview: payload.response_preview,
                });
            }

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
            post(buildPayload({
                transport: 'xhr',
                method: xhr.__tnRequestMethod || 'GET',
                url: xhr.__tnRequestUrl || '',
                is_graphql: String(xhr.__tnRequestUrl || '').indexOf('graphql') !== -1,
                status: xhr.status || 0,
                duration_ms: xhr.__tnStartedAt ? Date.now() - xhr.__tnStartedAt : null,
                content_type: typeof xhr.getResponseHeader === 'function' ? (xhr.getResponseHeader('content-type') || '') : '',
                request_body: xhr.__tnRequestBody,
                response_text: xhr.responseText || '',
            }));
        });

        return originalSend.apply(this, arguments);
    };
}());

