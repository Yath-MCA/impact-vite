window._IsChrome = false, window._IsFirefox = false, window._IsOpera = false, window._IsEdge = false, window._IsSafari = false, window._IsEdgeChromium = false, window._IsIE = false, window._IsBlink = false;
var BROWSER_REQUIREMENTS = {
    Chrome: {
        min: 72,
        max: Infinity,
        allowed: true
    },
    Firefox: {
        min: 66,
        max: Infinity,
        allowed: true
    },
    "Microsoft Edge": {
        min: 80,
        max: Infinity,
        allowed: true
    },
    "Internet Explorer": {
        min: 11,
        max: 11,
        allowed: false
    },
    Opera: {
        min: 98,
        max: Infinity,
        allowed: true
    },
    Brave: {
        min: 1,
        max: Infinity,
        allowed: false
    },
    Safari: {
        min: 14,
        max: Infinity,
        allowed: true
    }
};

function detectOS() {
    var ua = navigator.userAgent;
    var os = '';
    var osVersion = '';

    var windowsMatch = ua.match(/Windows NT (\d+\.\d+)/);
    var macMatch = ua.match(/Mac OS X (\d+[._]\d+)/);
    var androidMatch = ua.match(/Android (\d+\.\d+)/);
    var iosMatch = ua.match(/OS (\d+[._]\d+)/);

    if (windowsMatch) {
        os = 'Windows';
        // Get captured version
        var ntVersion = windowsMatch[1];
        var windowsVersions = {
            '11.0': '11',
            '10.0': '10',
            '6.3': '8.1',
            '6.2': '8',
            '6.1': '7',
            '6.0': 'Vista',
            '5.1': 'XP'
        };
        // Default to NT version if unknown
        osVersion = windowsVersions[ntVersion] || ntVersion;
    } else if (macMatch) {
        os = 'Mac';
        osVersion = macMatch[1].replace('_', '.');
    } else if (/Linux/.test(ua)) {
        os = 'Linux';
    } else if (androidMatch) {
        os = 'Android';
        osVersion = androidMatch[1];
    } else if (/iPhone|iPad|iPod/.test(ua) && iosMatch) {
        os = 'iOS';
        osVersion = iosMatch[1].replace('_', '.');
    }
    return {
        os: os,
        osVersion: osVersion
    };
}

// Helper function to parse version from user agent string
function parseVersion(ua, regex) {
    var match = ua.match(regex);
    return match ? match[1] : '';
}

function showBrowserCompatibilityAlert(title, text, icon, options) {
    try {
        options = options || {};
        if (window.Swal && typeof Swal.fire === "function") {
            return Swal.fire(Object.assign({
                title: title,
                text: text,
                icon: icon || "error"
            }, options));
        }
        if (typeof swal === "function") {
            return swal({
                title: title,
                text: text,
                icon: icon || "error",
                buttons: options.showConfirmButton === false ? false : undefined,
                closeOnEsc: options.allowEscapeKey === false ? false : undefined,
                closeOnClickOutside: options.allowOutsideClick === false ? false : undefined
            });
        }
        alert(text);
    } catch (err) {
        console.warn(err.message);
        alert(text);
    }
}

function checkBrowserCompatibility() {
    var ua = navigator.userAgent;
    var browserInfo = {
        isChrome: false,
        isFirefox: false,
        isSafari: false,
        isEdge: false,
        isEdgeChromium: false,
        isOpera: false,
        isBrave: false,
        isIE: false,
        browser: 'Unknown',
        version: '',
        majorVersion: 0,
        os: '',
        osVersion: '',
        isAllowed: false,
        screenSize: typeof screen !== 'undefined' ? screen.width + ' x ' + screen.height : '',
        isCompatible: false
    };
    var osInfo = detectOS();
    browserInfo.os = osInfo.os;
    browserInfo.osVersion = osInfo.osVersion;

    // Internet Explorer
    if ( /*@cc_on!@*/ false || !!document.documentMode) {
        browserInfo.name = 'Internet Explorer';
        if (document.documentMode) {
            browserInfo.version = document.documentMode.toString();
        } else {
            browserInfo.version = parseVersion(ua, /MSIE ([0-9.]+)/);
        }
    } else if (/Chrome\/(\d+)/.test(ua) && !/Edg|OPR|Brave|YaBrowser/.test(ua)) {
        _IsChrome = browserInfo.isChrome = true;
        browserInfo.browser = 'Chrome';
        browserInfo.version = parseVersion(ua, /Chrome\/([0-9.]+)/);
    } else if (/Firefox\/(\d+)/.test(ua)) {
        _IsFirefox = browserInfo.isFirefox = true;
        browserInfo.browser = 'Firefox';
        browserInfo.version = parseVersion(ua, /(?:Firefox|FxiOS)\/([0-9.]+)/);
        window._IsFirefox = true;
    } else if (/Edg\/(\d+)/.test(ua)) {
        _IsEdge = browserInfo.isEdge = true;
        _IsEdgeChromium = browserInfo.isEdgeChromium = true;
        browserInfo.browser = 'Microsoft Edge';
        browserInfo.version = parseVersion(ua, /Edg\/([0-9.]+)/);
    } else if (/OPR\/(\d+)/.test(ua)) {
        _IsOpera = browserInfo.isOpera = true;
        browserInfo.browser = 'Opera';
        browserInfo.version = parseVersion(ua, /(?:OPR|Opera)\/([0-9.]+)/) || parseVersion(ua, /Version\/([0-9.]+)/);
    }

    if (/Version\/(\d+\.\d+)/.test(ua) && /Safari/.test(ua) && !/Chrome/.test(ua)) {
        _IsSafari = browserInfo.isSafari = true;
        browserInfo.browser = 'Safari';
        browserInfo.version = parseVersion(ua, /Version\/([0-9.]+)/);
    }

    if (!browserInfo.browser) {
        alert('Browser is not supported. Please use Chrome, Firefox, or Edge.');
        return;
    }

    browserInfo.majorVersion = parseInt(browserInfo.version, 10);
    debug.log("00");
    var requirements = BROWSER_REQUIREMENTS[browserInfo.browser];
    if (requirements) {
        debug.log("01");
        browserInfo.isAllowed = requirements.allowed;
        browserInfo.isCompatible = requirements.allowed && browserInfo.majorVersion >= requirements.min && browserInfo.majorVersion <= requirements.max;

        var alert_text = browserInfo.browser + " is not supported. Please use Chrome, Firefox, or Edge. You can find a list of supported browsers and their versions at the bottom of the screen.";

        debug.log("02");
        if (!browserInfo.isAllowed) {
            debug.log("03");
            try {
                debug.log("04");
                // Instead of just getElementById, add error checking and fallbacks
                var form = document.getElementById("formLanding") || document.forms["formLanding"] || document.querySelector("#formLanding");
                // Add a check to ensure the element was found
                if (form && form.parentNode) {
                    form.parentNode.removeChild(form);
                    debug.log("05");
                    debug.log("Form element removed");
                } else {
                    debug.log("06");
                    debug.log("Form element not found");
                }
                debug.log("07");
                debug.log("08");
                setTimeout(() => {
                    showBrowserCompatibilityAlert("Unsupported Browser", alert_text, "error", {
                        showConfirmButton: false
                    });
                }, 0);
            } catch (err) {
                console.warn(err.message);
                alert(alert_text);
                debug.log("10");
            }
        }
        debug.log("11");
        if (!browserInfo.isCompatible) {
            debug.log("12");
            alert_text = "Your browser (" + browserInfo.browser + " " + browserInfo.version + ") is not supported. Minimum version required is " + requirements.min + ".  Please upgrade to a newer version. You can find a list of supported browsers and their versions at the bottom of the screen.";
            try {
                debug.log("13");
                debug.log("14");
                setTimeout(() => {
                    showBrowserCompatibilityAlert("Unsupported Browser", alert_text, "error", {
                        showConfirmButton: false,
                        allowEscapeKey: false,
                        allowOutsideClick: false
                    });
                }, 0);
            } catch (err) {
                console.warn(err.message);
                alert(alert_text);
                debug.log("16");
            }
        }
        debug.log("end");
        // For Chrome, Firefox, IE, and Opera
        if (document.documentElement && document.documentElement.scrollTop) {
            document.documentElement.scrollTop = document.body.scrollHeight;
        }
        // For Safari
        if (document.body && document.body.scrollTop) {
            document.body.scrollTop = document.body.scrollHeight;
        }
        return browserInfo;
    } else {
        alert('Your browser is not supported. Please use Chrome, Firefox, or Edge.');
    }
}


function fireEvent_browser_validation() {
    try {
        var browserInfo = checkBrowserCompatibility();
        window.browserInfo = browserInfo;
        debug.log('Browser check result:', JSON.stringify(browserInfo));
    } catch (error) {
        console.error('Browser check failed:', error);
        alert('Your browser is not supported. Kindly use updated version.');
    }
}
// Early page-script entry (DOMContentLoaded below) — must stay outside editor boot phases.
window.fireEvent_browser_validation = fireEvent_browser_validation;
// Add before SweetAlert2 initialization
// Polyfill for Promise.allSettled (if missing)
if (!Promise.allSettled) {
    Promise.allSettled = function (promises) {
        return Promise.all(promises.map(p => Promise.resolve(p).then(
            value => ({ status: 'fulfilled', value }),
            reason => ({ status: 'rejected', reason })
        )));
    };
}

// Polyfill for Object.fromEntries (if missing)
if (!Object.fromEntries) {
    Object.fromEntries = function (entries) {
        const obj = {};
        for (const [key, value] of entries) {
            obj[key] = value;
        }
        return obj;
    };
}
if (document.addEventListener) {
    document.addEventListener('DOMContentLoaded', function () {
        fireEvent_browser_validation();
    });
} else if (document.attachEvent) {
    // For IE8 and earlier versions 
    document.attachEvent('onreadystatechange', function () {
        if (document.readyState === 'complete') {
            fireEvent_browser_validation();
        }
    });
}
