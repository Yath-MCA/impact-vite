/** Copied from skipped src/legacy/js/index.js for SPA editor boot. */

export const ADMIN_USER_IDs = [
  'sivakumars',
  'yasar.mohideen',
  'durairajan.gnanam',
];

export const MAIL_DETAIL = {
  HELP_DESK: {
    DEFAULT: {
      TEXT: 'aW1wYWN0LmhlbHBkZXNrQG5ld2dlbi5jbw==',
      MAIL: 'aW1wYWN0Lm5vdGlmaWNhdGlvbkBuZXdnZW4uY28=',
    },
    TNF: {
      TEXT: 'aW1wYWN0LmhlbHBkZXNrLnRuZkBuZXdnZW4uY28=',
      MAIL: 'aW1wYWN0LmhlbHBkZXNrLnRuZkBuZXdnZW4uY28=',
    },
    OSO: {
      TEXT: 'aW1wYWN0Lm5vdGlmaWNhdGlvbi5vdXBAbmV3Z2VuLmNv',
      MAIL: 'aW1wYWN0Lm5vdGlmaWNhdGlvbi5vdXBAbmV3Z2VuLmNv',
    },
  },
  SHARE_LINK: {
    DEFAULT: {
      TEXT: 'aW1wYWN0LmhlbHBkZXNrQG5ld2dlbi5jbw==',
      MAIL: 'aW1wYWN0Lm5vdGlmaWNhdGlvbkBuZXdnZW4uY28=',
    },
    TNF: {
      TEXT: 'aW1wYWN0LmhlbHBkZXNrQG5ld2dlbi5jbw==',
      MAIL: 'aW1wYWN0Lm5vdGlmaWNhdGlvbkBuZXdnZW4uY28=',
    },
  },
  PUBKIT_TOKEN_EMAIL: 'c2l2YWt1bWFyc0BuZXdnZW4uY28=',
  PUBKIT_TOKEN_PASS: 'Rm5ldEluZGlhQDEyMw==',
  ADMIN_USERS_EMAIL: [
    'eWFzYXIubW9oaWRlZW4=',
    'ZHVyYWlyYWphbi5nbmFuYW0=',
    'c2l2YWt1bWFycw==',
  ],
  QA_USERS_EMAIL: [
    'a2FydGhpY2tleWFuLmE=',
    'ZGl2eWEua3Jpc2huYW11cnRoeQ==',
  ],
  Error_Mail: {
    from: {
      live: 'aW1wYWN0Lm5vdGlmaWNhdGlvbkBuZXdnZW4uY28=',
      default: 'aW1wYWN0Lm5vdGlmaWNhdGlvbkBuZXdnZW4uY28=',
    },
    to: {
      live: 'c2l2YWt1bWFyc0BuZXdnZW4uY28=',
      default: 'c2l2YWt1bWFyc0BuZXdnZW4uY28=',
    },
    bcc: {
      live: 'eWFzYXIubW9oaWRlZW5Abmt3LnB1YixkdXJhaXJhamFuLmduYW5hbUBua3cucHVi',
      default: 'eWFzYXIubW9oaWRlZW5Abmt3LnB1YixkdXJhaXJhamFuLmduYW5hbUBua3cucHVi',
    },
  },
};

/**
 * Resolve encoded sender/receiver mail config (legacy index.js behavior).
 * Reads SHARED_KEY / RES_DATA / IS_LIVE_DOMAIN from globalThis at call time.
 */
export function GET_SENDER_RECEIVER_ID(type, client) {
  try {
    const g = typeof globalThis !== 'undefined' ? globalThis : {};
    const mailDetail = g.MAIL_DETAIL || MAIL_DETAIL;
    let result = mailDetail[type];
    if (typeof result === 'string') {
      return atob(result);
    }
    if (/SHARE_LINK|HELP_DESK/gi.test(type)) {
      if (!client) {
        const shared = g.SHARED_KEY || {};
        const res = g.RES_DATA || {};
        client = shared.client || res.client;
      }
      if (client) client = String(client).toLocaleUpperCase();
      const reObj =
        client && result[client] ? result[client] : result.DEFAULT;
      const sendJson = {};
      for (const [key, value] of Object.entries(reObj || {})) {
        sendJson[key] = atob(value);
      }
      return sendJson;
    }
    if (type === 'Error_Mail') {
      const live = Boolean(g.IS_LIVE_DOMAIN);
      return {
        from: atob(result.from.default),
        to: atob(live ? result.to.live : result.to.default),
        bcc: atob(live ? result.bcc.live : result.bcc.default),
      };
    }
  } catch (err) {
    console.warn(err && err.message);
    const g = typeof globalThis !== 'undefined' ? globalThis : {};
    if (typeof g.ErrorLogTrace === 'function') {
      g.ErrorLogTrace('GET_SENDER_RECEIVER_ID', err && err.message);
    }
  }
  return undefined;
}
