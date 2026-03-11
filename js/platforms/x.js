(function () {
    function detectResponderName() {
        var currentUser = document.querySelector('[data-testid="SideNav_AccountSwitcher_Button"] span');
        if (currentUser && currentUser.textContent) {
            return currentUser.textContent.trim();
        }

        var headings = document.querySelectorAll('[data-testid="UserName"] span');
        if (headings.length > 0 && headings[0].textContent) {
            return headings[0].textContent.trim();
        }

        return null;
    }

    window.TNNetworksPlatformRegistry.register({
        id: 'x',
        label: 'X / Twitter',
        matchesHost: function (hostname) {
            return hostname.indexOf('x.com') !== -1 || hostname.indexOf('twitter.com') !== -1;
        },
        detectResponderName: detectResponderName,
        enableNetworkCapture: true,
    });
}());

