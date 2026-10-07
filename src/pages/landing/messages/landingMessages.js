import { LandingMessageKey } from './landingMessageKeys.js';

/**
 * Landing-page alert catalog (from run-task/queue/LandingPage.js ALERT_MESSAGE).
 * Private store — use getLandingMessage / showLandingMessage only.
 */
export const LANDING_MESSAGES = Object.freeze({
  [LandingMessageKey.SESSION_OUT]: Object.freeze({
    type: 'info',
    title: 'Session Ended',
    text: 'Due to inactivity, your session got expired. Please click &ldquo;AGREE & CONTINUE&rdquo; to start a new session.',
    button1: 'OK',
    button2: '',
    param: true,
    Options: Object.freeze({ hide: true })
  }),
  [LandingMessageKey.FILE_DELETED]: Object.freeze({
    title: 'File Deleted',
    type: 'info',
    text: 'The proofing link is expired. If you have not downloaded your proof, please contact &ldquo;<a class="font-weight-bold email-text" href="mailto:{{MAIL}}">{{TEXT}}</a>&rdquo;.',
    button1: 'OK',
    button2: '',
    param: true,
    Options: Object.freeze({ hide: false })
  }),
  [LandingMessageKey.SIGN_OFF]: Object.freeze({
    type: 'info',
    title: 'Signed Off',
    text: 'The proof link has been approved, and the {{DOC_TYPE}} is now accessible in read-only mode.<br><br>{{human_time}}',
    button1: 'OK',
    button2: '',
    param: true,
    Options: Object.freeze({ hide: true })
  }),
  [LandingMessageKey.EXPIRED]: Object.freeze({
    type: 'info',
    title: 'Expired',
    text: 'The link you have used has expired and is invalid. If you need help, please contact our support team.',
    button1: 'OK',
    button2: '',
    param: true,
    Options: Object.freeze({ hide: false })
  }),
  [LandingMessageKey.INVALID]: Object.freeze({
    type: 'error',
    title: 'Invalid Link',
    text: 'The link seems to be invalid or broken. Please verify the URL and try again. If the problem persists, kindly contact our support team for assistance.',
    button1: 'OK',
    button2: '',
    param: true,
    Options: Object.freeze({ hide: true })
  }),
  [LandingMessageKey.LINK_OPENED]: Object.freeze({
    type: 'error',
    title: 'Request Denied!',
    text: 'Link has been already opened in another tab. Please check',
    button1: 'OK',
    button2: '',
    param: true,
    Options: Object.freeze({ hide: true })
  }),
  [LandingMessageKey.UNSUPPORTED_BROWSER]: Object.freeze({
    type: 'warning',
    title: 'Unsupported Browser',
    text: 'The browser version you are using is no longer supported. Please upgrade to a supported version or switch to another supported browser. A list of supported browsers and versions is available at the bottom of the screen.',
    button1: '',
    button2: '',
    param: true,
    Options: Object.freeze({ hide: false })
  }),
  [LandingMessageKey.TRY_AGAIN]: Object.freeze({
    type: 'error',
    title: 'Request denied',
    text: 'Please try after some time.',
    button1: 'OK',
    button2: '',
    param: true,
    Options: Object.freeze({ hide: true })
  }),
  [LandingMessageKey.TRY_AGAIN_LATER]: Object.freeze({
    type: 'error',
    title: 'Request denied',
    text: 'Unable to process your request. Kindly try after some time.',
    button1: 'OK',
    button2: '',
    param: true,
    Options: Object.freeze({ hide: true })
  }),
  [LandingMessageKey.SEND_REQUEST]: Object.freeze({
    type: 'warning',
    title: '',
    text: 'Oops! This session is either open with another user, or your session was closed without logging out correctly. Please press &lsquo;Send Request&rsquo; to regain access, or press &lsquo;Cancel&rsquo; to exit the tool.',
    button1: 'Send Request',
    button2: 'Cancel',
    param: true,
    Options: Object.freeze({ hide: true })
  }),
  [LandingMessageKey.ACCESS_DENIED]: Object.freeze({
    type: 'error',
    title: 'Request Denied',
    text: 'You don&rsquo;t have access to the proof link for the following reason: %1%',
    button1: 'OK',
    button2: '',
    param: true,
    Options: Object.freeze({ hide: true })
  }),
  [LandingMessageKey.SCHEDULED_MAINTENANCE]: Object.freeze({
    text: "Kindly note that we will be experiencing server downtime due to scheduled maintenance from <span class='font-weight-bold'>{{T1}}&#x000a0;{{T1A}}</span> to <span class='font-weight-bold'>{{T2}}&#x000a0;{{T1A}}</span> (in your local time)."
  }),
  [LandingMessageKey.SECURITY_INVALID_IP]: Object.freeze({
    type: 'error',
    title: 'Access denied',
    text: 'Your IP address and system do not have permission to access the IMPACT link. Please reach out to the PLOS team for assistance.',
    button1: '',
    button2: '',
    param: true,
    Options: Object.freeze({ hide: true })
  })
});

export default LANDING_MESSAGES;
