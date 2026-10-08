import { LandingMessageKey } from './landingMessageKeys.js';

export const LANDING_MESSAGES = Object.freeze({
  [LandingMessageKey.FILE_DELETED]: Object.freeze({
    title: 'File Deleted',
    type: 'info',
    text: 'The proofing link is expired or the file is missing on the server. If you need help, please contact support.',
    button1: 'OK',
    button2: '',
  }),
  [LandingMessageKey.EXPIRED]: Object.freeze({
    type: 'info',
    title: 'Expired',
    text: 'The link you have used has expired and is invalid. If you need help, please contact our support team.',
    button1: 'OK',
    button2: '',
  }),
  [LandingMessageKey.INVALID]: Object.freeze({
    type: 'error',
    title: 'Invalid Link',
    text: 'The link seems to be invalid or broken. Please verify the URL and try again.',
    button1: 'OK',
    button2: '',
  }),
  [LandingMessageKey.UNSUPPORTED_BROWSER]: Object.freeze({
    type: 'warning',
    title: 'Unsupported Browser',
    text: 'The browser version you are using is no longer supported. Please upgrade to a supported version or switch to another supported browser.',
    button1: 'OK',
    button2: '',
  }),
  [LandingMessageKey.TRY_AGAIN]: Object.freeze({
    type: 'error',
    title: 'Request denied',
    text: 'Please try after some time.',
    button1: 'OK',
    button2: '',
  }),
  [LandingMessageKey.TRY_AGAIN_LATER]: Object.freeze({
    type: 'error',
    title: 'Request denied',
    text: 'Unable to process your request. Kindly try after some time.',
    button1: 'OK',
    button2: '',
  }),
  [LandingMessageKey.SCHEDULED_MAINTENANCE]: Object.freeze({
    text:
      "Kindly note that we will be experiencing server downtime due to scheduled maintenance from <span class='font-weight-bold'>{{T1}}&#x000a0;{{T1A}}</span> to <span class='font-weight-bold'>{{T2}}&#x000a0;{{T2A}}</span> (in your local time).",
  }),
});

export default LANDING_MESSAGES;
