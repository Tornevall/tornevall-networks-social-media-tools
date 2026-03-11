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

            return originalFetch.apply(this, args).then(function (response) {
                var cloned = response.clone();
                cloned.text().then(function (bodyText) {
                    post({
                        transport: 'fetch',
                        method: method,
                        url: url,
                        status: response.status,
                        duration_ms: Date.now() - startedAt,
                        response_preview: clip(bodyText, 2000),
                    });
                }).catch(function () {
                    post({
                        transport: 'fetch',
                        method: method,
                        url: url,
                        status: response.status,
                        duration_ms: Date.now() - startedAt,
                        response_preview: '[unavailable]',
                    });
                });

                return response;
            }).catch(function (error) {
                post({
                    transport: 'fetch',
                    method: method,
                    url: url,
                    status: 0,
                    duration_ms: Date.now() - startedAt,
                    response_preview: '[error] ' + clip(error && error.message ? error.message : 'Unknown fetch error', 500),
                });
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

    XMLHttpRequest.prototype.send = function () {
        var xhr = this;
        xhr.addEventListener('loadend', function () {
            post({
                transport: 'xhr',
                method: xhr.__tnRequestMethod || 'GET',
                url: xhr.__tnRequestUrl || '',
                status: xhr.status || 0,
                duration_ms: xhr.__tnStartedAt ? Date.now() - xhr.__tnStartedAt : null,
                response_preview: clip(xhr.responseText || '', 2000),
            });
        });

        return originalSend.apply(this, arguments);
    };
}());

