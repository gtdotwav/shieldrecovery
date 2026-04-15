import { NextResponse } from "next/server";

/**
 * GET /api/tracking/pixel.js
 *
 * Returns the JavaScript tracking pixel that sellers embed on their pages.
 * Captures page views, UTM params, session/visitor IDs, and sends to the event API.
 */

const PIXEL_SCRIPT = `
(function(w,d) {
  'use strict';
  if (w.__pgr_tracking) return;
  w.__pgr_tracking = true;

  var API = '__BASE_URL__/api/tracking/event';
  var sk = d.currentScript && d.currentScript.getAttribute('data-seller-key') || '';
  if (!sk) { console.warn('[PagRecovery Tracking] data-seller-key missing'); return; }

  // Session & visitor IDs
  function uuid() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      var r = Math.random() * 16 | 0;
      return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
    });
  }

  function getCookie(name) {
    var v = d.cookie.match('(^|;)\\\\s*' + name + '\\\\s*=\\\\s*([^;]+)');
    return v ? v.pop() : '';
  }

  function setCookie(name, value, days) {
    var expires = '';
    if (days) {
      var date = new Date();
      date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
      expires = '; expires=' + date.toUTCString();
    }
    d.cookie = name + '=' + value + expires + '; path=/; SameSite=Lax';
  }

  var vid = getCookie('_pgr_vid');
  if (!vid) { vid = uuid(); setCookie('_pgr_vid', vid, 365); }

  var sid = w.sessionStorage && w.sessionStorage.getItem('_pgr_sid');
  if (!sid) { sid = uuid(); try { w.sessionStorage.setItem('_pgr_sid', sid); } catch(e) {} }

  // Extract UTM from URL
  function getUtm() {
    var sp = new URLSearchParams(w.location.search);
    return {
      us: sp.get('utm_source') || '',
      um: sp.get('utm_medium') || '',
      uc: sp.get('utm_campaign') || '',
      ux: sp.get('utm_content') || '',
      ut: sp.get('utm_term') || ''
    };
  }

  // Store UTM in sessionStorage so it persists across pages
  var utm = getUtm();
  if (utm.us) {
    try { w.sessionStorage.setItem('_pgr_utm', JSON.stringify(utm)); } catch(e) {}
  } else {
    try {
      var stored = w.sessionStorage.getItem('_pgr_utm');
      if (stored) utm = JSON.parse(stored);
    } catch(e) {}
  }

  // Send event
  function track(eventType, extra) {
    var payload = {
      sk: sk,
      et: eventType,
      sid: sid,
      vid: vid,
      us: utm.us,
      um: utm.um,
      uc: utm.uc,
      ux: utm.ux,
      ut: utm.ut,
      referrer: d.referrer || '',
      page: w.location.href
    };
    if (extra) { for (var k in extra) { payload[k] = extra[k]; } }

    if (w.navigator.sendBeacon) {
      w.navigator.sendBeacon(API, JSON.stringify(payload));
    } else {
      var xhr = new XMLHttpRequest();
      xhr.open('POST', API, true);
      xhr.setRequestHeader('Content-Type', 'application/json');
      xhr.send(JSON.stringify(payload));
    }
  }

  // Auto page view
  track('page_view');

  // Track link clicks on recovery/checkout links
  d.addEventListener('click', function(e) {
    var a = e.target.closest && e.target.closest('a[href]');
    if (!a) return;
    var href = a.href || '';
    if (href.indexOf('/retry/') !== -1 || href.indexOf('/checkout/') !== -1) {
      track('checkout_start', { landing_page: href });
    }
  }, true);

  // Expose global for manual tracking
  w.pgrTrack = track;
})(window, document);
`.trim();

export async function GET(req: Request) {
  const url = new URL(req.url);
  const baseUrl = `${url.protocol}//${url.host}`;
  const script = PIXEL_SCRIPT.replace(/__BASE_URL__/g, baseUrl);

  return new NextResponse(script, {
    status: 200,
    headers: {
      "Content-Type": "application/javascript; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=86400",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
