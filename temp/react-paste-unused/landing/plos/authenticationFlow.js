import { Swal } from '../../../shared/plugins/sweetalert/index.js';
import { apiService, API_ENDPOINTS } from '../../../services/api/apiService.js';
import { ROLE_IDS } from '../../../services/api/roleCatalog.js';
import { getRecaptchaSiteKey } from './plosAuthConfig.js';

export function maskEmail(email) {
  if (!email) return '';
  const [localPart, domain] = String(email).split('@');
  if (!domain) return email;
  const domainParts = domain.split('.');
  const maskedLocalPart = `${localPart.charAt(0)}${'*'.repeat(Math.max(0, localPart.length - 2))}${localPart.slice(-1)}`;
  const maskedDomain = domainParts
    .map((part, index) =>
      index === domainParts.length - 1 ? part : `${part[0]}${'*'.repeat(Math.max(0, part.length - 1))}`
    )
    .join('.');
  return `${maskedLocalPart}@${maskedDomain}`;
}

function buildDefaultPayload(resData, userEmail) {
  return {
    tbl: 'linksharing',
    docid: resData.docid || resData.docId || '',
    username: userEmail || resData.username || '',
    role: resData.role || '',
    rolename: ROLE_IDS[resData.role]?.name || resData.rolename || ''
  };
}

/** PLOS authentication — ES module port of legacy AuthenticationFlow (OTP + reCAPTCHA v3 IP). */
export class AuthenticationFlow {
  constructor(resData, { docId, userEmail, onAuthSuccess, onShowAcceptButton } = {}) {
    this.url_response = resData;
    this.docId = docId || resData.docid || resData.docId || '';
    this.userEmail = userEmail || '';
    this.onAuthSuccess = onAuthSuccess;
    this.onShowAcceptButton = onShowAcceptButton;
    this.storageKey = 'authFlowData';
    this.maxOtpAttempts = 3;
    this.maxOtpGenerationsPerHour = 2;
    this.otpGenerationWindowMs = 3600000;
    this.recaptchaSiteKey = getRecaptchaSiteKey();
    this.currentFlow = resData.r == 2 ? 'otp' : 'ip';
    this.flowOrder = ['preCheck', 'sendOtp', 'verifyOtp', 'attemptExceeded'];
    this.lastOtpGeneration_Id = null;
    this.retryAttempted_Without_Captcha = false;
    this.otpPassed = false;
    this.loadFromStorage();
  }

  loadFromStorage() {
    try {
      const raw = localStorage.getItem(this.storageKey);
      if (raw) {
        const data = JSON.parse(raw);
        this.otpGenerations = data.otpGenerations || [];
        this.currentOtpAttempts = data.currentOtpAttempts || 0;
      } else {
        this.otpGenerations = [];
        this.currentOtpAttempts = 0;
      }
    } catch {
      this.otpGenerations = [];
      this.currentOtpAttempts = 0;
    }
  }

  saveToStorage() {
    localStorage.setItem(
      this.storageKey,
      JSON.stringify({
        otpGenerations: this.otpGenerations,
        currentOtpAttempts: this.currentOtpAttempts
      })
    );
  }

  formatTimeRemaining(timeInSeconds) {
    const hours = Math.floor(timeInSeconds / 3600);
    const minutes = Math.floor((timeInSeconds % 3600) / 60);
    const seconds = timeInSeconds % 60;
    const parts = [];
    if (hours > 0) parts.push(`${hours} hour${hours !== 1 ? 's' : ''}`);
    if (minutes > 0) parts.push(`${minutes} minute${minutes !== 1 ? 's' : ''}`);
    if (seconds > 0) parts.push(`${seconds} second${seconds !== 1 ? 's' : ''}`);
    return parts.join(' and ');
  }

  calculateTimeRemaining() {
    if (!this.otpGenerations.length) return 0;
    const now = Date.now();
    const valid = this.otpGenerations
      .map((iso) => new Date(iso).getTime())
      .filter((t) => now - t < this.otpGenerationWindowMs);
    if (!valid.length) return 0;
    return Math.floor(Math.max(0, Math.min(...valid) + this.otpGenerationWindowMs - now) / 1000);
  }

  cleanExpiredGenerations() {
    const validWindow = Date.now() - this.otpGenerationWindowMs;
    this.otpGenerations = this.otpGenerations
      .map((iso) => new Date(iso).getTime())
      .filter((ts) => ts > validWindow)
      .map((ts) => new Date(ts).toISOString());
  }

  async loadRecaptchaScript() {
    if (typeof document === 'undefined') return;
    if (document.querySelector('script[src*="recaptcha/enterprise.js"]')) {
      return;
    }
    await new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = `https://www.google.com/recaptcha/enterprise.js?render=${this.recaptchaSiteKey}`;
      script.async = true;
      script.onload = resolve;
      script.onerror = () => reject(new Error('reCAPTCHA load failed'));
      document.head.appendChild(script);
    });
  }

  async verifyCaptchaToken(token) {
    const payload = {
      ...buildDefaultPayload(this.url_response, this.userEmail),
      token,
      version: 'v3'
    };
    return apiService.makeRequest(API_ENDPOINTS.VERIFY_CAPTCHA, payload);
  }

  async run() {
    if (this.url_response?.r === 0) {
      return { status: 'failed', reason: 'access_denied' };
    }

    if (this.currentFlow === 'otp') {
      await this.startOtpFlow();
      if (this.otpPassed) {
        return { status: 'passed' };
      }
      return { status: 'failed', reason: 'otp_failed' };
    }

    try {
      await this.loadRecaptchaScript();
      if (typeof grecaptcha !== 'undefined' && grecaptcha.enterprise) {
        await new Promise((resolve) => grecaptcha.enterprise.ready(resolve));
        const token = await grecaptcha.enterprise.execute(this.recaptchaSiteKey, {
          action: 'landing'
        });
        const response = await this.verifyCaptchaToken(token);
        if (response?.r == 1) {
          this.onShowAcceptButton?.();
          return { status: 'passed' };
        }
      }
    } catch {
      // retry without captcha below
    }

    if (!this.retryAttempted_Without_Captcha) {
      this.retryAttempted_Without_Captcha = true;
      this.onShowAcceptButton?.();
      return { status: 'passed', skippedCaptcha: true };
    }

    return { status: 'failed', reason: 'captcha_failed' };
  }

  async startOtpFlow() {
    await Swal.fire({
      title: 'Processing...',
      text: 'Please wait while we process your request.',
      allowOutsideClick: false,
      showConfirmButton: false,
      didOpen: () => Swal.showLoading()
    });
    await this.processStep('preCheck');
  }

  async processStep(stepName) {
    if (Swal.isVisible()) Swal.close();
    if (stepName === 'preCheck') await this.handlePreCheck();
    else if (stepName === 'sendOtp') await this.handleSendOtp();
    else if (stepName === 'verifyOtp') await this.handleVerifyOtp();
    else if (stepName === 'attemptExceeded') await this.handleAttemptExceeded();
  }

  async handlePreCheck() {
    this.cleanExpiredGenerations();
    const limit = this.otpGenerations.length >= this.maxOtpGenerationsPerHour;
    await this.processStep(limit ? 'attemptExceeded' : 'sendOtp');
  }

  resolveMail() {
    const { emailto } = this.url_response;
    if (Array.isArray(emailto)) {
      return (
        localStorage.getItem(`xmleditor:username:${this.docId}`) ||
        this.userEmail ||
        emailto[0] ||
        ''
      );
    }
    return emailto || this.userEmail || '';
  }

  async handleSendOtp() {
    const maskedEmail = maskEmail(this.resolveMail());
    const result = await Swal.fire({
      title: 'Send Access Code',
      html: `<p>Click to send the access code to your registered email: ${maskedEmail}</p>`,
      showConfirmButton: true,
      confirmButtonText: 'Send Code',
      showCancelButton: true,
      allowOutsideClick: false
    });
    if (!result.isConfirmed) return;

    const gen = await apiService.makeRequest(API_ENDPOINTS.GENERATE_OTP, {
      ...buildDefaultPayload(this.url_response, this.userEmail),
      status: 'pending'
    });

    if (gen?.r == 1 && gen.id) {
      this.lastOtpGeneration_Id = gen.id;
      this.otpGenerations.push(new Date().toISOString());
      this.saveToStorage();
      await this.processStep('verifyOtp');
    }
  }

  async handleVerifyOtp() {
    const otpInputsHtml = Array(6)
      .fill()
      .map(
        () =>
          '<input type="text" class="swal2-input otp-input" maxlength="1" style="width:40px;height:40px;text-align:center;margin:0 4px;">'
      )
      .join('');

    const result = await Swal.fire({
      title: 'Verify Access Code',
      html: `<p>Kindly input the 6-digit access code</p><div style="display:flex;justify-content:center;">${otpInputsHtml}</div>`,
      showCancelButton: true,
      confirmButtonText: 'Verify',
      allowOutsideClick: false,
      preConfirm: async () => {
        const inputs = Swal.getHtmlContainer().querySelectorAll('.otp-input');
        const otp = Array.from(inputs)
          .map((input) => input.value)
          .join('');
        if (otp.length !== 6) {
          Swal.showValidationMessage('Please enter all 6 digits');
          return false;
        }
        return apiService.makeRequest(API_ENDPOINTS.VERIFY_ACCESS_CODE, {
          usergeneratetoken: parseInt(otp, 10),
          _id: this.lastOtpGeneration_Id,
          tbl: 'generatetoken'
        });
      }
    });

    if (result.isConfirmed && result.value?.r == 1) {
      await Swal.fire({
        icon: 'success',
        title: 'Success!',
        text: 'Access code verified successfully!'
      });
      this.onAuthSuccess?.();
      this.onShowAcceptButton?.();
      this.otpPassed = true;
      return;
    }

    this.currentOtpAttempts += 1;
    this.saveToStorage();
    if (this.currentOtpAttempts >= this.maxOtpAttempts) {
      await this.processStep('attemptExceeded');
    }
  }

  async handleAttemptExceeded() {
    const seconds = this.calculateTimeRemaining();
    await Swal.fire({
      title: 'Attempt Limit Exceeded',
      html: `<p>Please try again after ${this.formatTimeRemaining(seconds)}.</p>`,
      icon: 'error',
      showConfirmButton: false
    });
  }

  async initializeAuthentication() {
    return this.run();
  }
}
