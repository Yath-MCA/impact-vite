/*******************
 * 
 * 
 * https://claude.site/artifacts/dd15b281-2df7-44e8-bca7-57ca0c522673
 * https://claude.site/artifacts/9b010561-5a68-459e-9389-4f230eee1c6d
 * 
 */



/*******************
 * 
 
    Usage example:
    document.addEventListener('DOMContentLoaded', () => {
        const authFlow = new AuthenticationFlow('YOUR_RECAPTCHA_SITE_KEY', 'YOUR_RECAPTCHA_SECRET_KEY');
        const loginForm = document.getElementById('loginForm');
        authFlow.initializeAuthentication(loginForm).then(result => {
            if (result) {
                console.log('Authentication process initiated');
            } else {
                console.log('Authentication failed or OTP flow initiated');
            }
        }).catch(error => {
            console.error('Authentication error:', error.message);
        });
    });
 * 
 * 
 */


class AuthenticationFlow {
    constructor(resData, Options = {}) {
        this.storageKey = 'authFlowData';
        this.maxOtpAttempts = 3;
        // 1 hour
        this.rateLimitWindowMs = 3600000;
        this.maxAttemptsPerWindow = 10;
        this.maxOtpGenerationsPerHour = 2;
        // 1 hour
        this.otpGenerationWindowMs = 3600000;
        this.url_response = resData;
        this.apiPath = API_PATH;
        this.endPoint_verify_captcha = this.apiPath + "verifycaptcha";
        this.endPoint_gen_otp = this.apiPath + "generatetokenotpandsendemail";
        this.endPoint_verify_otp = this.apiPath + "verifyaccesscode";
        this.recaptchaWidgetId = null;
        this.elementId = "divCaptchaRe";
        this.alertConfig = {
            defaultTimer: 5000,
            timerInterval: null,
            updateInterval: 100
        };
        this.Options = Options;

        this.config = {
            _isV2: false,
            _isV3: true,
            _isEP: false,
            _v2: "",
            _v3: IS_LIVE_DOMAIN ? "6LdOV5YqAAAAAJui4nPTaSFn7R289JDwUtrYRx7Y" : IS_DEV_DOMAIN ? "6LeiiLoqAAAAADwIiqp3d5-yMkw5Oqdme8hYmW9j" : "6LdgzFAqAAAAAOnaiV36VW-SdYuvvICaJqzkOeeR",
            _ep: ""
        };
        this.config.version = this.config._isEP ? "ep" : this.config._isV3 ? "v3" : "v2";
        this.recaptchaSiteKey = this.config["_" + this.config.version];
        this.currentFlow = this.url_response.r == 2 ? 'otp' : 'ip';

        // this.recaptchaSecretKey = recaptchaSecretKey;
        this.scriptLoadTimeout = 10000;
        this.scriptLoaded = false;
        // Add flag to track retry status
        this.isRetrying_Without_Captcha = false;
        // Add flag to prevent multiple retries
        this.retryAttempted_Without_Captcha = false;
        // Allow forced fallback when reCAPTCHA quota is exhausted
        this.isQuotaLimitExceeded = false;

        this.loadFromStorage();
        this.UpdateMessages();
        this.fetchAPI = new FetchService();
        this.init();
    }

    /*********** DEFAULT FUNCTION START ********/

    logError(functionName, error) {
        console.warn(`Error in ${functionName}: ${error.message}`);
        ErrorLogTrace(`AuthenticationFlow ${functionName}`, error.message);
    }

    async init() {
        try {
            await this.loadRecaptchaScript();
            if (this.config._isV2) {
                this.initV2();
            } else {
                await this.initV3();
                const isVerified = await this.executeV3Action('landing');
                if (isVerified) {
                    this.start();
                }
            }
        } catch (err) {
            this.logError("init", err);
            // If script loading failed, try without reCAPTCHA
            return this.reTry_WithOut_reCaptch_Promise();
        }
    }

    loadRecaptchaScript(retries = 3, timeout = 25000) {
        try {
            return new Promise((resolve, reject) => {
                // Check if already loaded
                if (document.querySelector(`script[src*="recaptcha/enterprise.js"]`)) {
                    this.scriptLoaded = true;
                    resolve();
                    return;
                }

                const scriptTimeoutId = setTimeout(async () => {
                    if (!this.scriptLoaded) {
                        // this.logError("loadRecaptchaScript", new Error("Script load timeout after 10 seconds"));
                        await this.reTry_WithOut_reCaptch_Promise();
                    }
                }, this.scriptLoadTimeout);

                const script = document.createElement('script');
                const scriptUrl = this.config._isV2 ?
                    'https://www.google.com/recaptcha/enterprise.js' :
                    `https://www.google.com/recaptcha/enterprise.js?render=${this.recaptchaSiteKey}`;

                script.src = scriptUrl;
                script.async = true;
                script.defer = true;

                script.onload = () => {
                    clearTimeout(scriptTimeoutId);
                    this.scriptLoaded = true;
                    resolve();
                };

                script.onerror = async (error) => {
                    clearTimeout(scriptTimeoutId);
                    if (retries > 0) {
                        try {
                            // Wait before retrying
                            await new Promise(r => setTimeout(r, 1000));
                            await this.loadRecaptchaScript(retries - 1, timeout);
                            resolve();
                        } catch (err) {
                            // this.alert("recaptcha_load_error", {});
                            await this.reTry_WithOut_reCaptch_Promise();
                        }
                    } else {
                        // this.alert("recaptcha_load_error", {});
                        await this.reTry_WithOut_reCaptch_Promise();
                        // reject(new Error('reCAPTCHA script failed to load'));
                    }
                };

                document.head.appendChild(script);
            });
        } catch (err) {
            this.logError("loadRecaptchaScript", err);
        }
    }

    initV2() {
        try {
            if (typeof grecaptcha === 'undefined' || typeof grecaptcha.enterprise === 'undefined') {
                console.error('reCAPTCHA has not loaded properly');
                return;
            }
            this.renderV2Widget();
        } catch (err) {
            this.logError("initV2", err);
        }

    }

    async initV3() {
        try {
            if (typeof grecaptcha !== 'undefined' && typeof grecaptcha.enterprise !== 'undefined') {
                await new Promise(resolve => grecaptcha.enterprise.ready(resolve));
            }
        } catch (err) {
            // this.logError("Error initializing reCAPTCHA v3", err);
        }
    }

    renderV2Widget(self) {
        self = this;
        try {
            var recaptchaTimer = setInterval(() => {
                if (typeof grecaptcha.enterprise.render == "function") {
                    self.recaptchaWidgetId = grecaptcha.enterprise.render(self.elementId, {
                        'sitekey': self.recaptchaSiteKey,
                        'callback': self.handleCaptchaResponse.bind(self),
                        'expired-callback': self.handleCaptchaExpired.bind(self),
                        'error-callback': self.handleCaptchaError.bind(self)
                    });
                    clearInterval(recaptchaTimer);
                }
            }, 1000);
        } catch (err) {
            this.logError('Error rendering reCAPTCHA v2 widget:', err);
        }
    }

    async executeV3Action(action) {
        try {
            if (typeof grecaptcha != 'undefined' && typeof grecaptcha.enterprise != 'undefined') {
                const token = await grecaptcha.enterprise.execute(this.recaptchaSiteKey, {
                    action
                });
                return await this.verifyCaptcha(token, action);
            } else return this.reTry_WithOut_reCaptch_Promise();
        } catch (err) {
            // this.logError('Error executing reCAPTCHA v3 action', err);
            this.reTry_WithOut_reCaptch_Promise();
            return false;
        }
    }
    async handleCaptchaResponse(token) {
        try {
            const isVerified = await this.verifyTokenWithBackend(token);
            if (isVerified) {
                this.handleValidCaptcha();
            }
        } catch (err) {
            this.logError('Verification failed:', err);
        }
    }

    handleCaptchaExpired() {
        try {
            console.log('reCAPTCHA expired');
            this.hideAllButtons();
            if (this.config._isV2) {
                this.enableRecaptcha();
            }
        } catch (err) {
            this.logError("handleCaptchaExpired", err);
        }
    }

    handleCaptchaError(message) {
        try {
            message = `An error occurred with reCAPTCHA. Please try again.`;
            // console.error('An error occurred with reCAPTCHA. Please try again.');
            this.handleInvalidCaptcha(message);
        } catch (err) {
            this.logError('handleCaptchaError:', err);
        }
    }
    /*
    handleCaptchaError() {
        try {
            console.error('reCAPTCHA error occurred');
            this.hideAllButtons();
            if (this.config._isV2) {
                this.enableRecaptcha();
            }
        } catch (err) {
            this.logError("handleCaptchaError", err);
        }
    }
    */
    fireEvt() {
        try {
            return new Event('submit', {
                // Allows the event to bubble up through the DOM
                bubbles: true,
                // Allows the event to be canceled
                cancelable: true
            });
        } catch (err) {
            this.logError("fireEvt", err);
        }
    }

    loadFromStorage() {
        try {
            const storedData = localStorage.getItem(this.storageKey);
            if (storedData) {
                const {
                    otpGenerations,
                    lastOtpGenerationTime,
                    currentOtpAttempts,
                    rateLimitData
                } = JSON.parse(storedData);
                this.otpGenerations = otpGenerations || [];
                this.lastOtpGenerationTime = lastOtpGenerationTime || 0;
                this.currentOtpAttempts = currentOtpAttempts || 0;
                this.rateLimitData = rateLimitData || {};
            } else {
                this.otpGenerations = [];
                this.lastOtpGenerationTime = 0;
                this.currentOtpAttempts = 0;
                this.rateLimitData = {};
            }
        } catch (err) {
            this.logError("loadFromStorage", err);
        }
    }
    saveToStorage() {
        try {
            const dataToStore = {
                otpGenerations: this.otpGenerations,
                lastOtpGenerationTime: this.lastOtpGenerationTime,
                currentOtpAttempts: this.currentOtpAttempts,
                rateLimitData: this.rateLimitData
            };
            localStorage.setItem(this.storageKey, JSON.stringify(dataToStore));
        } catch (err) {
            this.logError("saveToStorage", err);
        }
    }

    resetOtpAttempts() {
        try {
            this.currentOtpAttempts = 0;
            this.saveToStorage();
        } catch (err) {
            this.logError("resetOtpAttempts", err);
        }
    }
    /*********** DEFAULT FUNCTION END ********/


    /*********** ALERT CONFIG AND FUNCTION START ********/

    formatTimeRemaining(timeInSeconds) {
        try {
            const hours = Math.floor(timeInSeconds / 3600);
            const minutes = Math.floor((timeInSeconds % 3600) / 60);
            const seconds = timeInSeconds % 60;

            const parts = [];
            if (hours > 0) parts.push(`${hours} hour${hours !== 1 ? 's' : ''}`);
            if (minutes > 0) parts.push(`${minutes} minute${minutes !== 1 ? 's' : ''}`);
            if (seconds > 0) parts.push(`${seconds} second${seconds !== 1 ? 's' : ''}`);

            return parts.join(' and ');
        } catch (err) {
            this.logError("fireEvt", err);
        }
    }

    parseServerTimestamp(timeiso) {
        try {
            // Handle both string dates and MongoDB-style date objects
            if (typeof timeiso === 'object' && timeiso.$date) {
                return new Date(timeiso.$date).getTime();
            }
            return new Date(timeiso).getTime();
        } catch (err) {
            this.logError("parseServerTimestamp", err);
        }
    }

    isRecaptchaQuotaError(message) {
        try {
            if (!message) return false;
            const errorText = String(message).toLowerCase();
            return errorText.includes('resource_exhausted') ||
                errorText.includes('over enterprise free quota') ||
                (errorText.includes('recaptcha') && errorText.includes('billing'));
        } catch (err) {
            this.logError("isRecaptchaQuotaError", err);
            return false;
        }
    }

    async handleQuotaFallback(message) {
        try {
            this.isQuotaLimitExceeded = true;
            // this.alert('recaptcha_quota_fallback', { AddText: message || '' }, true);
            this.logError("handleQuotaFallback", {
                message: message || "reCAPTCHA quota exceeded, falling back to OTP flow"
            });
            return await this.reTry_WithOut_reCaptch_Promise(true);
        } catch (err) {
            this.logError('handleQuotaFallback', err);
            return false;
        }
    }


    calculateTimeRemaining() {
        {
            var reTurnData = 0;
            try {
                if (!this.otpGenerations.length) return reTurnData;

                const timestamps = this.otpGenerations.map(isoTime => new Date(isoTime).getTime());

                const currentTime = Date.now();
                const validTimestamps = timestamps.filter(time => currentTime - time < this.otpGenerationWindowMs);

                if (!validTimestamps.length) return reTurnData;

                const oldestValidTime = Math.min(...validTimestamps);
                const expiryTime = oldestValidTime + this.otpGenerationWindowMs;
                const timeLeft = Math.max(0, expiryTime - currentTime);

                // Convert milliseconds to seconds
                return Math.floor(timeLeft / 1000);
            } catch (err) {
                this.logError("calculateTimeRemaining", err);
                return reTurnData;
            }
        }
    }
    resetRetryState() {
        this.isRetrying_Without_Captcha = false;
        this.retryAttempted_Without_Captcha = false;
        this.isQuotaLimitExceeded = false;
    }
    async reTry_WithOut_reCaptch_Promise(forceAllow = false) {
        try {
            const retryResult = await this.reTry_reCaptch(forceAllow);
            return retryResult;
        } catch (err) {
            return false;
        }
    }
    reTry_reCaptch(forceAllow = false) {
        try {
            // Return early if already retrying or retry was attempted
            const allowByQuota = this.isQuotaLimitExceeded || forceAllow;
            if (this.isRetrying_Without_Captcha || (this.retryAttempted_Without_Captcha && !allowByQuota)) {
                // this.logError('Retry already in progress or attempted', 'Multiple retry attempts prevented');
                return false;
            }
            this.isRetrying_Without_Captcha = true;
            this.retryAttempted_Without_Captcha = true;

            // this.logError('Enable token without reCaptcha', "load Issue");

            // Use Promise to ensure we complete the retry before allowing new attempts
            return new Promise((resolve) => {
                const finishRetry = () => {
                    this.isRetrying_Without_Captcha = false;
                    resolve(true);
                };

                const runAccessCodeFlow = (this.currentFlow == "otp") && typeof this.start === 'function';
                if (runAccessCodeFlow || (runAccessCodeFlow && allowByQuota)) {
                    this.start().finally(finishRetry);
                } else {
                    this.showValidateButton();
                    finishRetry();
                }
            });
        } catch (err) {
            this.isRetrying_Without_Captcha = false;
            this.logError('Error reTryWithOutCaptch:', err);
            return false;
        }
    }

    /*********** ALERT CONFIG AND FUNCTION END ********/


    /*********** RECAPTCHA AND FUNCTION START ********/

    async response_verifyCaptcha(response) {
        try {
            if (this.config._isV3) {} else {}
            this.stepperLogic = true;
            if (response.r == 1) {
                if (this.stepperLogic) {
                    if (this.currentFlow == "otp") this.start();
                    else this.showValidateButton();
                } else {
                    this.handleValidCaptcha();
                }
                return true;
            } else {
                if (this.isRecaptchaQuotaError(response && response.m)) {
                    // Inform user and continue with fallback path when enterprise quota is exhausted.
                    return await this.handleQuotaFallback(response && response.m);
                }
                this.handleInvalidCaptcha(response.m);
                debug.log('reCAPTCHA verification failed:', response.m);
                return false;
            }
        } catch (err) {
            if (this.isRecaptchaQuotaError(err && err.message)) {
                return await this.handleQuotaFallback(err && err.message);
            }
            this.logError('Error verifying reCAPTCHA:', err);
            this.handleInvalidCaptcha(err.message);
            return false;
        }
    }

    async verifyCaptcha(token) {
        try {
            var jsondata = ADD_DEFAULT_KEYS("default");
            jsondata.rolename = ROLE_IDS[RES_DATA.role]['name'];
            jsondata.token = token;
            jsondata.version = this.config.version;
            commonfn.callajaxwithoutjsontype(jsondata, 'response_verifyCaptcha', this.endPoint_verify_captcha, this);
        } catch (error) {
            if (this.isRecaptchaQuotaError(error && error.message)) {
                return await this.handleQuotaFallback(error && error.message);
            }
            this.logError('Error verifying reCAPTCHA:', error);
            this.handleInvalidCaptcha();
            return false;
        }
    }


    renderCaptcha(elementId) {
        try {
            if (this._v2) {
                if (typeof grecaptcha === 'undefined' || typeof grecaptcha.enterprise.render === 'undefined') {
                    console.error('reCAPTCHA has not loaded properly');
                    return;
                }
                this.recaptchaWidgetId = grecaptcha.enterprise.render(elementId, {
                    'sitekey': this.recaptchaSiteKey,
                    'callback': this.handleCaptchaResponse.bind(this),
                    'expired-callback': this.handleCaptchaExpired.bind(this),
                    'error-callback': this.handleCaptchaError.bind(this)
                });
            } else {
                grecaptcha.enterprise.ready(async () => {
                    const token = await grecaptcha.enterprise.execute(this.recaptchaSiteKey, {
                        action: 'LOGIN'
                    });
                });
            }
        } catch (err) {
            this.logError('renderCaptcha:', err);
            return false;
        }
    }
    disableRecaptcha() {
        try {
            if (typeof grecaptcha !== 'undefined' && this.recaptchaWidgetId !== null) {
                grecaptcha.enterprise.reset(this.recaptchaWidgetId);
                let recaptchaElement = document.querySelector('.g-recaptcha');
                if (recaptchaElement) {
                    recaptchaElement.style.opacity = '0.5';
                    recaptchaElement.style.pointerEvents = 'none';
                }
            }
        } catch (err) {
            this.logError('disableRecaptcha:', err);
            return false;
        }
    }
    enableRecaptcha() {
        try {
            if (typeof grecaptcha !== 'undefined') {
                let recaptchaElement = document.querySelector('.g-recaptcha');
                if (recaptchaElement) {
                    recaptchaElement.style.opacity = '1';
                    recaptchaElement.style.pointerEvents = 'auto';
                }
            }
        } catch (err) {
            this.logError('enableRecaptcha:', err);
            return false;
        }
    }
    handleValidCaptcha() {
        try {
            if (this.currentFlow == "otp") {
                this.showOTPButton();
            } else this.showValidateButton();
        } catch (err) {
            this.logError('handleValidCaptcha:', err);
        }
    }
    handleInvalidCaptcha(message) {
        try {
            this.showValidateButton(!0);
            this.alert("recaptcha_token_error", {
                AddText: message
            });
        } catch (err) {
            this.logError('handleInvalidCaptcha:', err);
        }
    }
    // console.error('An error occurred with reCAPTCHA. Please try again.');

    // this.handleFormSubmit(this.fireEvt());
    handleCaptchaResponse(response) {
        try {
            this.verifyCaptcha(response);
        } catch (err) {
            this.logError('handleCaptchaResponse:', err);
        }
    }
    handleCaptchaExpired() {
        try {
            this.handleInvalidCaptcha('The reCAPTCHA has expired. Please obtain a new one to continue.');
        } catch (err) {
            this.logError('handleCaptchaExpired:', err);
        }
    }

    /*********** RECAPTCHA AND FUNCTION START ********/


    /*********** GENERATE OTP AND FUNCTION START ********/



    async UpdateOTPInfo(resData, UpdateFromServer, self) {
        self = this;
        try {
            if (Array.isArray(resData)) {
                this.synchronizeWithServerData(resData);
            } else {
                const currentTime = new Date().getTime();
                const validWindow = currentTime - this.otpGenerationWindowMs;
                // Handle single new OTP generation
                const isoTime = new Date(currentTime).toISOString();

                // Clean up expired generations before adding new one
                this.cleanExpiredGenerations(validWindow);

                this.otpGenerations.push(isoTime);
                this.lastOtpGenerationTime = currentTime;
            }

            this.resetOtpAttempts();
            // this.saveToStorage();

            // Update UI with remaining attempts info

            if (UpdateFromServer) {
                const remainingGenerations = this.maxOtpGenerationsPerHour - this.otpGenerations.length;
                if (remainingGenerations > 0) {
                    const timeRemaining = this.calculateTimeRemaining();
                    console.log(`You have ${remainingGenerations} OTP generations remaining in the next ${this.formatTimeRemaining(timeRemaining)}`);
                } else {
                    const timeRemaining = this.calculateTimeRemaining();
                    console.log(`OTP generation limit reached. Please wait ${this.formatTimeRemaining(timeRemaining)} before trying again.`);
                }
            }
        } catch (err) {
            this.logError('UpdateOTPInfo:', err);
        }
    }

    async response_generate_OTP(response) {
        try {
            console.log(JSON.stringify(response));
            if (response.r == 1 && response.id) {
                const otp_id = response.id;
                this.UpdateOTPInfo(response.data);
                // Show OTP send alert and handle verification
                this.lastOtpGeneration_Id = response.id;
                if (!this.stepperLogic) await this.showOtpSendAlert(otp_id);
                else return response.id;
            } else if (response.r == 2) {
                this.UpdateOTPInfo(response.data, !0);
                const timeRemaining = this.calculateTimeRemaining();
                const formattedTime = this.formatTimeRemaining(timeRemaining);
                this.alert('otp_limit', {
                    AddText: formattedTime
                });
            } else {

            }
        } catch (err) {
            this.logError('Authentication error:', err);
            return false;
        }
    }
    async generateOTP() {
        try {
            // PENDING = "pending" ||  VERIFIED = "verified" || INVALID = "invalid"  || EXPIRED = "expired"
            var jsondata = ADD_DEFAULT_KEYS("default");
            jsondata.rolename = ROLE_IDS[RES_DATA.role]['name'];
            jsondata.status = "pending";
            commonfn.callajaxwithoutjsontype(jsondata, 'response_generate_OTP', this.endPoint_gen_otp, this);
        } catch (error) {
            return false;
        }
    }

    getProgressStepsForDisplay() {
        return this.progressSteps.map(step => step.id.toString());
    }

    getCurrentProgressStep() {
        const currentStep = this.flowOrder[this.currentStepIndex];
        const stepMapping = {
            'preCheck': 0,
            'sendOtp': 1,
            'verifyOtp': 2,
            'attemptExceeded': 3
        };
        return stepMapping[currentStep] || 0;
    }

    async start() {
        try {
            this.stepperLogic = true;
            this.currentStepIndex = 0;
            // 3347248: PLOS - Loading the landing page needs an indication
            Swal.fire({
                title: 'Processing...',
                text: 'Please wait while we process your request.',
                allowOutsideClick: false,
                showConfirmButton: false,
                didOpen: () => {
                    Swal.showLoading();
                }
            });

            await new Promise(resolve => setTimeout(resolve, 300));
            await this.processStep(this.flowOrder[0]);

        } catch (error) {
            console.error("Error in start method:", error);
            if (Swal.isVisible()) {
                Swal.close();
            }

            // Show error dialog
            await Swal.fire({
                icon: 'error',
                title: 'Oops...',
                text: 'An error occurred while processing your request.',
                confirmButtonText: 'OK'
            });
        }
    }

    async closeExistingSwal() {
        if (Swal.isVisible()) {
            Swal.close();
            // Small delay to ensure UI updates
            await new Promise(resolve => setTimeout(resolve, 100));
        }
    }

    async processStep(stepName) {

        await this.closeExistingSwal();
        const stepHandlers = {
            preCheck: () => this.handlePreCheck(),
            sendOtp: () => this.handleSendOTP(),
            verifyOtp: () => this.handleVerifyOTP(),
            attemptExceeded: () => this.handleAttemptExceeded()
        };

        if (stepHandlers[stepName]) {
            await stepHandlers[stepName]();
        } else {
            this.logError("processStep", {
                "message": `Unknown step: ${stepName}`
            });
        }
    }

    async moveToNextStep(currentStep, success = true) {
        const currentIndex = this.flowOrder.indexOf(currentStep);
        let nextStep;

        if (success) {
            this.currentStepIndex = currentIndex + 0;
            nextStep = this.flowOrder[this.currentStepIndex];
        } else {
            this.cleanExpiredGenerations();

            const isLimitReached = this.otpGenerations.length >= this.maxOtpGenerationsPerHour;

            if (isLimitReached) {
                this.currentStepIndex = this.flowOrder.indexOf('attemptExceeded');
                nextStep = 'attemptExceeded';
            } else {
                // Stay on current step for retry
                nextStep = currentStep;
            }
        }

        if (nextStep) {
            await this.processStep(nextStep);
        }
    }

    async handlePreCheck(self) {
        self = this;
        const result = await Swal.fire({
            title: 'Pre-check verification',
            text: 'Checking previous attempts...',
            showConfirmButton: false,
            allowOutsideClick: false,
            didOpen: async () => {
                Swal.showLoading();
                try {
                    const preCheckResult = await self.performPreCheck();
                    if (preCheckResult.isLimitExceeded) {
                        this.currentOtpAttempts = this.maxOtpAttempts;
                        this.moveToNextStep('preCheck', false);
                        return;
                    }
                    let next = preCheckResult.isValidSession ? 'sendOtp' : 'attemptExceeded';
                    this.currentStepIndex = this.flowOrder.indexOf(next);
                    this.moveToNextStep(next, preCheckResult.isValidSession);
                    return;
                } catch (error) {
                    this.logError('Pre-check failed:', error);
                    Swal.fire({
                        title: 'Error',
                        text: 'Failed to perform pre-check. Please try again.',
                        icon: 'error',
                        confirmButtonText: 'OK',
                        allowOutsideClick: false
                    });
                }
            },
            progressSteps: this.getProgressStepsForDisplay(),
            currentProgressStep: this.getCurrentProgressStep()
        });
    }

    async handleSendOTP(self) {
        self = this;
        try {
            let {
                emailto
            } = self.url_response;

            // ? 3362545: PLOS - Multiple Author Email Address in Access Code Authentication
            const mail = Array.isArray(emailto) ? (localStorage.getItem(`xmleditor:username:${DOC_ID}`) || USER_INFO.MAIL_ID) : emailto;

            const maskedEmail = self.maskEmail(mail);
            const result = await Swal.fire({
                title: 'Send Access Code',
                html: `<p>Click to send the access code to your registered email: ${maskedEmail}</p><p class="attempt-counter">Remaining attempts: ${this.maxOtpGenerationsPerHour - this.otpGenerations.length}</p>`,
                showConfirmButton: true,
                confirmButtonText: 'Send Code',
                showCancelButton: true,
                cancelButtonText: 'Cancel',
                allowEscapeKey: false,
                allowOutsideClick: false,
                progressSteps: self.getProgressStepsForDisplay(),
                currentProgressStep: self.getCurrentProgressStep()
            });

            if (result.isConfirmed) {
                await Swal.fire({
                    title: 'Sending OTP',
                    text: 'Please wait...',
                    showConfirmButton: false,
                    allowOutsideClick: false,
                    didOpen: async () => {
                        Swal.showLoading();
                        try {
                            await self.generateOTP();
                            self.moveToNextStep('verifyOtp', true);
                        } catch (err) {
                            this.logError('Failed to send OTP:', err);
                            Swal.fire({
                                title: 'Error',
                                text: 'Failed to send OTP. Please try again.',
                                icon: 'error',
                                confirmButtonText: 'OK',
                                allowOutsideClick: false
                            });
                        }
                    }
                });
            }
        } catch (err) {
            this.logError("handleSendOTP", err);
        }
    }

    async handleResendOTP(self) {
        self = this;
        try {
            const maxAttemptsResult = await Swal.fire({
                icon: 'error',
                title: 'Maximum Attempts Exceeded',
                html: `<p>You have already used your first attempt for this session, and you have one final attempt remaining for this hour.</p>`,
                showConfirmButton: true,
                showCancelButton: true,
                confirmButtonText: 'Request New Code',
                cancelButtonText: 'Close',
                allowOutsideClick: false
            });
            if (maxAttemptsResult.isConfirmed) {
                // Reset attempts and trigger OTP resend
                this.currentOtpAttempts = 0;
                this.currentStepIndex = this.flowOrder.indexOf('verifyOtp');
                await self.generateOTP();
                self.moveToNextStep('verifyOtp', true);
            } else if (maxAttemptsResult.isDenied) {
                // Reset attempts and let user try again
                this.currentOtpAttempts = 0;
                location.reload();
            }
            return false;
        } catch (err) {
            this.logError("handleResendOTP", err);
        }
    }
    async handleVerifyOTP(self) {
        self = this;
        try {
            const customClass = {
                container: 'custom-swal-container',
                popup: 'custom-swal-popup',
                content: 'custom-swal-content'
            };

            const otpInputsHtml = Array(6).fill().map((_, i) => `<input type="text" class="swal2-input otp-input" maxlength="1" style="width: 40px; height: 40px; text-align: center; margin: 0 4px; font-size: 20px;" data-index="${i}">`).join('');
            let timerInterval;
            const result = await Swal.fire({
                title: 'Verify Access Code',
                html: `<style>.otp-inputs-container {display: flex;justify-content: center;gap: 8px;margin: 20px 0;}.otp-input {padding: 0 !important;}</style><p>Kindly input the 6-digit access code</p>
                        <div class="otp-inputs-container">${otpInputsHtml}</div><p class="attempt-counter">Remaining attempts: ${this.maxOtpAttempts - this.currentOtpAttempts}</p><p>Time left for the Access Code: <b class="timer font-weight-bolder">00:00</b></p>`,
                customClass,
                showCancelButton: true,
                confirmButtonText: 'Verify',
                cancelButtonText: 'Cancel',
                allowOutsideClick: false,
                timer: 60 * 10 * 1000,
                // denyButtonText: 'Resend Code',
                progressSteps: this.getProgressStepsForDisplay(),
                currentProgressStep: this.getCurrentProgressStep(),
                willOpen: (modal) => {
                    // Swal.showLoading();
                    const timerElement = modal.querySelector('.timer');
                    timerInterval = setInterval(() => {
                        const millisLeft = Swal.getTimerLeft();
                        const minutes = Math.floor(millisLeft / 60000);
                        const seconds = Math.ceil((millisLeft % 60000) / 1000);
                        timerElement.textContent = `${minutes.toString().padStart(2, '0')} minutes : ${seconds.toString().padStart(2, '0')} seconds`;
                    }, 100);
                },
                willClose: () => {
                    self.enableRecaptcha();
                    clearInterval(timerInterval);
                },
                didOpen: () => {
                    const container = Swal.getHtmlContainer();
                    const inputs = container.querySelectorAll('.otp-input');
                    inputs.forEach((input, index) => {
                        input.addEventListener('input', (e) => {
                            if (isNaN(e.target.value)) {
                                e.target.value = '';
                                return;
                            }

                            if (e.target.value && index < inputs.length - 1) {
                                inputs[index + 1].focus();
                            }
                        });

                        input.addEventListener('keydown', (e) => {
                            if (e.key === 'Backspace' && !e.target.value && index > 0) {
                                inputs[index - 1].focus();
                            }
                        });

                        input.addEventListener('paste', (e) => {
                            e.preventDefault();
                            const pasteData = e.clipboardData.getData('text')
                                .replace(/[^0-9]/g, '').slice(0, 6).split('');

                            pasteData.forEach((digit, i) => {
                                if (i < inputs.length) {
                                    inputs[i].value = digit;
                                }
                            });

                            const nextEmptyInput = Array.from(inputs).find(input => !input.value);
                            if (nextEmptyInput) {
                                nextEmptyInput.focus();
                            } else {
                                inputs[inputs.length - 1].focus();
                            }
                        });
                    });

                    inputs[0].focus();
                },
                preConfirm: async () => {
                    const container = Swal.getHtmlContainer();
                    const inputs = container.querySelectorAll('.otp-input');
                    const otp = Array.from(inputs).map(input => input.value).join('');

                    if (otp.length !== 6) {
                        Swal.showValidationMessage('Please enter all 6 digits');
                        return false;
                    }
                    try {
                        // await this.verifyOTP(otp);
                        // var jsondata = ADD_DEFAULT_KEYS("default");
                        // jsondata.rolename = ROLE_IDS[RES_DATA.role]['name'];
                        var jsondata = {
                            usergeneratetoken: parseInt(otp),
                            _id: this.lastOtpGeneration_Id,
                            tbl: "generatetoken"
                        };
                        return new Promise((resolve, reject) => {
                            const originalResponseVerifyOTP = self.response_verifyOTP.bind(self);
                            self.response_verifyOTP = async function(response) {
                                try {
                                    await originalResponseVerifyOTP(response);
                                    self.verifyResult = response;
                                    resolve(response);
                                } catch (error) {
                                    reject(error);
                                }
                            };
                            commonfn.callajaxwithoutjsontype(jsondata, 'response_verifyOTP', self.endPoint_verify_otp, self);
                        });

                    } catch (error) {
                        this.logError('Verification error:', error);
                        Swal.showValidationMessage('Verification failed. Please try again.');
                        return false;
                    }
                }
            });
            if (result.isDenied) {
                this.currentStepIndex = this.flowOrder.indexOf('sendOtp');
                await this.processStep('sendOtp');
            }
        } catch (err) {
            this.logError('handleVerifyOTP error:', err);
            await Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'An unexpected error occurred. Please try again.',
                allowOutsideClick: false
            });
        }
    }

    async handleAttemptExceeded(self) {
        self = this;
        try {
            var millisecondsRemaining = this.calculateTimeRemaining();
            var formattedTime = this.formatTimeRemaining(millisecondsRemaining);
            let timerInterval;
            self.disableRecaptcha();
            await Swal.fire({
                title: 'Attempt Limit Exceeded',
                html: `<p>You have exceeded the maximum number of access code attempts allowed in an hour. <br>Please try again after <span class="timer font-weight-bolder">${formattedTime}</span>.</p>`,
                icon: 'error',
                timer: millisecondsRemaining * 1000,
                timerProgressBar: true,
                // confirmButtonText: 'OK',
                showConfirmButton: false,
                showCancelButton: false,
                progressSteps: this.getProgressStepsForDisplay(),
                currentProgressStep: this.getCurrentProgressStep(),
                allowOutsideClick: false,
                didOpen: (modal) => {
                    const timerElement = modal.querySelector('.timer');
                    if (timerElement) timerInterval = setInterval(() => {
                        const millisLeft = Swal.getTimerLeft();
                        const minutes = Math.floor(millisLeft / 60000);
                        const seconds = Math.ceil((millisLeft % 60000) / 1000);
                        timerElement.textContent = `${minutes.toString().padStart(2, '0')} minutes : ${seconds.toString().padStart(2, '0')} seconds`;
                    }, 100);
                },
                willClose: () => {
                    clearInterval(timerInterval);
                }
            }).then((result) => {
                /* Read more about handling dismissals below */
                if (result.dismiss === Swal.DismissReason.timer) {
                    console.log("I was closed by the timer");
                    window.location.reload();
                }
            });
        } catch (err) {
            this.logError('handleAttemptExceeded', err);
        }
    }

    // Simulated backend functions
    async performPreCheck(self) {
        self = this;
        try {
            const server_result = await this.fetchAPI.makeRequest("getdocs", {
                tbl: "generatetoken",
                find: {
                    docid: RES_DATA.docid,
                    role: RES_DATA.role,
                    rolename: ROLE_IDS[RES_DATA.role]['name'],
                    status: {
                        $ne: "verified"
                    }
                }
            }, {
                isPayloadLogic: !0
            });
            this.synchronizeWithServerData(server_result.data);

            const local_result = await this.performGenOTPCheck(self);
            return {
                isLimitExceeded: this.maxOtpAttempts <= this.currentOtpAttempts,
                isValidSession: local_result,
                remainingAttempts: this.maxOtpAttempts - this.currentOtpAttempts
            };
        } catch (err) {
            throw err;
        }
    }

    synchronizeWithServerData(serverData) {
        if (!Array.isArray(serverData)) return;

        const currentTime = Date.now();
        const validWindow = currentTime - this.otpGenerationWindowMs;

        const serverTimestamps = serverData
            .filter(record => record && record.timeiso_c)
            .map(record => this.parseServerTimestamp(record.timeiso_c))
            .filter(timestamp => timestamp > validWindow);

        this.cleanExpiredGenerations(validWindow, serverTimestamps);

        if (this.otpGenerations.length > 0) {
            this.lastOtpGenerationTime = new Date(this.otpGenerations[0]).getTime();

        }

        this.saveToStorage();
    }
    async performGenOTPCheck() {
        // const currentTime = new Date().getTime();
        // const validWindow = currentTime - this.otpGenerationWindowMs;
        this.cleanExpiredGenerations();
        if (this.otpGenerations.length >= this.maxOtpGenerationsPerHour) {
            const timeRemaining = this.calculateTimeRemaining();
            const formattedTime = this.formatTimeRemaining(timeRemaining);
            if (!this.stepperLogic) this.alert('otp_limit', {
                AddText: formattedTime
            });
            return false;
        } else {
            if (this.stepperLogic) return true;
            return this.generateOTP();
        }
    }

    cleanExpiredGenerations(validWindow, serverData) {
        try {

            const currentTime = new Date().getTime();

            validWindow = (validWindow ? validWindow : currentTime) - this.otpGenerationWindowMs;

            this.otpGenerations = serverData ? serverData : this.otpGenerations
                .map(isoTime => new Date(isoTime).getTime())
                .filter(timestamp => timestamp > validWindow)
                .map(timestamp => new Date(timestamp).toISOString());

        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('cleanExpiredGenerations', err.message);
        }
    }

    mergeAndCleanTimestamps(serverTimestamps, localTimestamps, validWindow) {
        try {
            const cleanedLocalTimestamps = localTimestamps
                .map(isoTime => new Date(isoTime).getTime())
                .filter(timestamp => timestamp > validWindow);

            const allTimestamps = [...new Set([...serverTimestamps, ...cleanedLocalTimestamps])]
                .sort((a, b) => b - a);

            return allTimestamps.map(timestamp => new Date(timestamp).toISOString());
        } catch (error) {

        }

    }

    async response_verifyOTP(response) {
        try {

            this.currentOtpAttempts++;
            if (response.r != 1) {

                const container = Swal.getHtmlContainer();
                const remainOtpAttempts = this.maxOtpAttempts - this.currentOtpAttempts;
                const remainingGenerations = this.maxOtpGenerationsPerHour - this.otpGenerations.length;

                container.querySelector('.attempt-counter').textContent = `Remaining attempts: ${this.maxOtpAttempts - this.currentOtpAttempts}`;
                Swal.showValidationMessage(`The access code entered is incorrect. Please make sure you’re using the correct code from the email sent to you. If the problem continues, check your email inbox again or wait for the current code to expire before generating a new one.`);

                if (remainOtpAttempts == 0) {
                    if (remainingGenerations > 0) {
                        this.handleResendOTP();
                    } else {
                        this.moveToNextStep('verifyOtp', false);
                    }
                }
                return false;
            } else if (response.r == 1) {
                await Swal.fire({
                    icon: 'success',
                    title: 'Success!',
                    text: 'Access code verified successfully!',
                    allowOutsideClick: false
                }).then((result) => {
                    if (result.isConfirmed) {
                        window.landingAuthCompleted = true;
                        redirect();
                        return true;
                    } else if (result.isDenied) {

                    }
                });
            }
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('response_verifyOTP', err.message);
        }
    }
    async verifyOTP(userOTP) {
        try {
            var jsondata = ADD_DEFAULT_KEYS("default");
            jsondata.rolename = ROLE_IDS[RES_DATA.role]['name'];
            jsondata.usergeneratetoken = parseInt(userOTP);
            jsondata._id = this.lastOtpGeneration_Id;
            return commonfn.callajaxwithoutjsontype(jsondata, 'response_verifyOTP', this.endPoint_verify_otp, this);
        } catch (error) {
            this.logError('Error verifying reCAPTCHA:', error);
            this.handleInvalidCaptcha();
            return false;
        }
    }

    /*********** GENERATE OTP AND FUNCTION END ********/



    /*********** DEFAULT FUNCTION START ********/

    alert(key, Options = {}, IsToaster) {
        try {
            if (IsToaster) {
                TOASTER_ALERT(key);
            } else {
                // ? acase, title, content, btn1, btn2, IsPromise, Options
                let dialogConfig;
                if (Options.AddText) {
                    const config = this.TOASTER_MESSAGE[key];
                    dialogConfig = [
                        config.type,
                        config.title,
                        // content is stored as 'text' in config
                        config.text,
                        // btn1 is stored as 'button1' in config
                        config.button1,
                        // btn2 is stored as 'button2' in config
                        config.button2,
                        config.param,
                        Options
                    ];
                } else {
                    dialogConfig = key;
                }

                return AlertNewDialog.fire(...(Array.isArray(dialogConfig) ? dialogConfig : [dialogConfig]))
                    .then(result => {
                        // You can add specific handling for confirmed/cancelled cases here
                        return result.isConfirmed;
                    });
            }
        } catch (err) {

        }
    }

    showValidateButton(canHide) {
        const validateButton = document.querySelector('[id="ValidateBtnOpt"]');
        if (window.LANDING_AUTO_PROCEED_AFTER_AUTH && !canHide) {
            if (typeof redirect === 'function') {
                window.landingAuthCompleted = true;
                redirect();
            }
            return;
        }
        if (validateButton) {
            if (canHide) {
                validateButton.classList.add('d-none');
            } else {
                validateButton.classList.remove('d-none');
                // validateButton.click();
            }
        }
    }

    async handleFormSubmit(event) {
        event.preventDefault();

    }
    /**
     * Formats email for display by masking parts of it
     * @param {string} email - Email address to mask
     * @returns {string} Masked email address
     */
    maskEmail(email) {
        try {
            if (!email) return '';

            const [localPart, domain] = email.split('@');
            if (!domain) return email;

            const [domainName, extension] = domain.split('.');
            if (!extension) return email;

            const domainParts = domain.split('.');
            const maskedLocalPart = `${localPart.charAt(0)}${'*'.repeat(Math.max(0, localPart.length - 2))}${localPart.slice(-1)}`;
            //const maskedDomain = `${domainName.charAt(0)}${'*'.repeat(Math.max(0, domainName.length - 1))}`;
            // ? 3345906: PLOS - Email address display in Access Code screen - RJ-28_Jan_25
            const maskedDomain = domainParts.map((part, index) => {
                if (index === domainParts.length - 1) {
                    return part;
                } else if (index === 0) {
                    return part[0] + '*'.repeat(part.length - 1);
                } else {
                    return part[0] + '*'.repeat(part.length - 1);
                }
            }).join('.');

            return `${maskedLocalPart}@${maskedDomain}`;
        } catch (error) {
            this.logError('Error masking email:', error);
            return email;
        }
    }


    /*********** DEFAULT FUNCTION END ********/

    /*********** initializer start ********/

    async initializeAuthentication(formElement) {
        try {

            if (this.url_response.r == 0) return;

            this.currentFlow = this.url_response.r == 2 ? 'otp' : 'ip';
            // Add submit event listener
            // formElement.addEventListener('submit', this.handleFormSubmit.bind(this));
            formElement.onsubmit = function(event) {
                try {
                    // Prevent form from reloading the page
                    event.preventDefault();
                    this.handleFormSubmit(event);
                } catch (error) {

                }
            }.bind(this);
            // this.renderCaptcha('divCaptchaRe');
            console.log('Authentication process initiated');
            return true;
        } catch (error) {
            this.logError('initializeAuthentication', error);
            return false;
        }
    }

    /*********** initializer end ********/

    /*********** alert initializer start ********/
    UpdateMessages(self) {
        self = this;
        try {
            this.TOASTER_MESSAGE = {
                "otp_limit": {
                    "type": "error",
                    "title": "Limit Reached",
                    'text': `Access Code generation limit reached. Please try again after `,
                    "button1": "OK",
                    "button2": "",
                    "param": true,
                    "Options": {
                        hide: true
                    }
                },
                "recaptcha_load_error": {
                    "type": "warning",
                    "title": "Warning",
                    'text': `reCAPTCHA has not loaded properly. Try again`,
                    "button1": "OK",
                    "button2": "",
                    "param": true,
                    "Options": {
                        hide: true
                    }
                },
                "recaptcha_token_error": {
                    "type": "warning",
                    "title": "Warning",
                    'text': "",
                    "button1": "OK",
                    "button2": "",
                    "param": true,
                    "Options": {
                        hide: true
                    }
                },
                "recaptcha_quota_fallback": {
                    "type": "warning",
                    "title": "Security Check Limit Reached",
                    'text': "reCAPTCHA service quota is currently exhausted. Continuing with an alternate verification path.",
                    "button1": "OK",
                    "button2": "",
                    "param": true,
                    "Options": {
                        hide: true
                    }
                }
            };

            if (ALERT_MESSAGE) {
                Object.assign(ALERT_MESSAGE, this.TOASTER_MESSAGE);
            }

            this.flowOrder = ['preCheck', 'sendOtp', 'verifyOtp', 'attemptExceeded', 'complete'];
            this.progressSteps = [{
                    id: 0,
                    title: 'Pre-check'
                },
                {
                    id: 1,
                    title: 'Send OTP'
                },
                {
                    id: 2,
                    title: 'Verify'
                },
                {
                    id: 3,
                    title: 'Complete'
                }
            ];


            if (IS_LOCAL_HOST) {
                setTimeout((self) => {
                    let btn = document.getElementById("danger");

                    if (btn) {
                        let div = btn.closest(".container");

                        if (typeof btn.click === "function") {
                            btn.click();
                        }

                        if (div && !div.classList.contains("ds-none")) {
                            div.classList.add("ds-none");
                        }
                    } else {
                        console.error('Button with id "danger" not found');
                    }
                    localStorage.removeItem("authFlowData");
                    self.start();

                }, 5000, this);
            }

        } catch (err) {

        }
    }
    /*********** alert initializer end ********/

}

/**********************  END * ***************************/