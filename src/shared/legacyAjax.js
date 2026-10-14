/**
 * Shared $.ajaxSetup + commonfn.callajax for SPA pages (editor, landing, …).
 * Canonical behavior from editor_open (localhost guard, role fill, timers)
 * plus index.js ajaxSetup headers / 401 reload.
 */

function ensureCommonfn(g) {
  if (typeof g.commonfn === 'undefined' || !g.commonfn) {
    g.commonfn = {};
  }
  if (!g.commonfn.timerCall) {
    g.commonfn.timerCall = {};
  }
  return g.commonfn;
}

function formatTime(ts) {
  try {
    return new Date(ts).toISOString();
  } catch {
    return String(ts);
  }
}

export function applyAjaxSetup(g = typeof window !== 'undefined' ? window : globalThis) {
  const $ = g.jQuery || g.$;
  if (!$ || typeof $.ajaxSetup !== 'function') return;

  $.ajaxSetup({
    beforeSend: function (request) {
      request.setRequestHeader(
        'Content-Type',
        'application/x-www-form-urlencoded;charset=UTF-8'
      );
      try {
        request.setRequestHeader(
          'appkey',
          localStorage.getItem('xmleditor:appkey')
        );
        request.setRequestHeader(
          'apikey',
          localStorage.getItem('xmleditor:apikey')
        );
      } catch {
        /* ignore */
      }
    },
    success: function (_jqXHR, textStatus) {
      console.log(textStatus);
    },
    error: function (jqXHR, textStatus) {
      console.log(textStatus);
      if (jqXHR && jqXHR.status === 401) {
        location.reload(true);
      }
    },
    always: function () {},
  });
}

export function installCallAjax(g = typeof window !== 'undefined' ? window : globalThis) {
  const commonfn = ensureCommonfn(g);
  const $ = g.jQuery || g.$;

  commonfn.callajax = function (jsondata, postfun, url, opt = '') {
    try {
      const exceptionList = [
        'onlinecrossrefplaintext',
        'anystylecrossrefplaintext',
      ];
      const urlStr = url == null ? '' : String(url);
      const isException = exceptionList.some((ex) => urlStr.includes(ex));
      const hasUrl = typeof url !== 'undefined';
      const isLocalHost =
        typeof location !== 'undefined' && location.hostname === 'localhost';
      const isNotLocalString = !urlStr.includes('local');

      if (hasUrl && isLocalHost && isNotLocalString && !isException) {
        return console.warn('Local API call skipped:', url);
      }

      const USER_INFO = g.USER_INFO || {};
      if (jsondata && typeof jsondata === 'object') {
        if (!jsondata.username) jsondata.username = USER_INFO.MAIL_ID;
        if (!jsondata.role) jsondata.role = USER_INFO.ROLE_ID;
        if (!jsondata.rolename) jsondata.rolename = USER_INFO.ROLE_NAME;

        const collabEnabled =
          typeof g.isCollabEnabled === 'function' &&
          g.isCollabEnabled(g.DOC_ID);
        if (jsondata.tbl === 'linksharing' && collabEnabled) {
          jsondata.collaborative = '1';
        }
      }

      const payload = JSON.stringify(jsondata);
      const startTs = Date.now();
      commonfn.timerCall[postfun] = {
        url,
        startTs,
        startTime: formatTime(startTs),
        endTime: null,
        durationSec: null,
      };

      if (!$ || typeof $.ajax !== 'function') {
        throw new Error('jQuery $.ajax is not available');
      }

      $.ajax({
        url: url,
        data: { jsondata: payload },
        type: 'post',
        dataType: 'JSON',
        contentType: 'application/json',
        success: function (response) {
          const endTs = Date.now();
          const entry = commonfn.timerCall[postfun];
          if (entry) {
            entry.endTime = formatTime(endTs);
            entry.durationSec = ((endTs - entry.startTs) / 1000).toFixed(2);
          }
          if (commonfn[postfun]) {
            commonfn[postfun](response, opt);
          } else if (
            opt &&
            (opt[postfun] || (opt.M_FUN && opt.M_FUN[postfun]))
          ) {
            if (opt[postfun]) opt[postfun](response, opt);
            else opt.M_FUN[postfun](response, opt);
          } else if (
            typeof g.ErrorLogTrace === 'function' &&
            postfun !== 'fun_return'
          ) {
            console.log(postfun);
          }
        },
        error: function (_jqXHR, textStatus, errorThrown) {
          const endTs = Date.now();
          const entry = commonfn.timerCall[postfun];
          if (entry) {
            entry.endTime = formatTime(endTs);
            entry.durationSec = ((endTs - entry.startTs) / 1000).toFixed(2);
          }
          console.log('Error calling:', postfun, textStatus, errorThrown);
        },
      });
    } catch (err) {
      console.warn(err && err.message);
      if (typeof g.ErrorLogTrace === 'function') {
        g.ErrorLogTrace('callajax', err && err.message);
      }
    }
  };
}

/**
 * Install ajaxSetup (if jQuery present) + commonfn.callajax on the global.
 * Safe to call multiple times; always reinstalls the shared callajax.
 */
export function applyLegacyAjax(g = typeof window !== 'undefined' ? window : globalThis) {
  ensureCommonfn(g);
  applyAjaxSetup(g);
  installCallAjax(g);
}
