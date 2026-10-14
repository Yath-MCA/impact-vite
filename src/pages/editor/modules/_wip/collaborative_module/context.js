(function() {
    "use strict";

    window.CollaborativeModule = window.CollaborativeModule || {
        _isEnabled: false,
        _isDisabled: false,
        getLockedElementsByOthers: () => ({
            byOthers: [],
            total: 0,
            elements: []
        }),
        _isElementLocked: () => false,
        startRuntime: () => false,
        stopRuntime: () => false,
        destroyRuntime: () => false,
        isRuntimeActive: () => false,
        showStatusDialog: () => false,
        show: () => false
    };
}());
