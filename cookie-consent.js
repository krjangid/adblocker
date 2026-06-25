// ============================================
// BLOCKIUM — Cookie Consent Auto-Dismiss
// ============================================
// Detects and auto-dismisses cookie consent banners
// by clicking "Reject All", "Decline", or similar buttons.
// Falls back to hiding the banner if no reject button found.

(function() {
  'use strict';

  let cookieDismissEnabled = false;
  let dismissAttempts = 0;
  const MAX_ATTEMPTS = 15;
  const ATTEMPT_INTERVAL = 800;

  // Check if feature is enabled
  chrome.storage.local.get(['cookieDismissEnabled'], (result) => {
    cookieDismissEnabled = result.cookieDismissEnabled === true;
    if (cookieDismissEnabled) {
      startDismissing();
    }
  });

  // Listen for changes (user toggles mid-session)
  chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'local' && changes.cookieDismissEnabled) {
      cookieDismissEnabled = changes.cookieDismissEnabled.newValue;
      if (cookieDismissEnabled) {
        dismissAttempts = 0;
        startDismissing();
      }
    }
  });

  function startDismissing() {
    // Try immediately
    attemptDismiss();

    // Also try periodically for a few seconds (banners load async)
    const interval = setInterval(() => {
      dismissAttempts++;
      if (dismissAttempts >= MAX_ATTEMPTS || !cookieDismissEnabled) {
        clearInterval(interval);
        return;
      }
      attemptDismiss();
    }, ATTEMPT_INTERVAL);

    // Also watch for dynamically added banners
    observeDOM();
  }

  function attemptDismiss() {
    if (!cookieDismissEnabled) return;

    // Try known frameworks first, then generic detection
    const dismissed =
      dismissOneTrust() ||
      dismissCookiebot() ||
      dismissQuantcast() ||
      dismissTrustArc() ||
      dismissDidomi() ||
      dismissOsano() ||
      dismissComplianz() ||
      dismissCookieYes() ||
      dismissTermly() ||
      dismissGenericBanner();

    return dismissed;
  }

  // ---- Known Framework Handlers ----

  // OneTrust (very common — used by ~30% of top sites)
  function dismissOneTrust() {
    const rejectBtn = document.querySelector(
      '#onetrust-reject-all-handler, ' +
      '.ot-pc-refuse-all-handler, ' +
      '#onetrust-button-group-parent button[aria-label*="Reject"], ' +
      '#onetrust-button-group-parent button[aria-label*="reject"], ' +
      'button.onetrust-close-btn-handler'
    );
    if (rejectBtn && isVisible(rejectBtn)) {
      rejectBtn.click();
      return true;
    }
    return false;
  }

  // Cookiebot
  function dismissCookiebot() {
    const rejectBtn = document.querySelector(
      '#CybotCookiebotDialogBodyButtonDecline, ' +
      '#CybotCookiebotDialogBodyLevelButtonLevelOptinDeclineAll, ' +
      'a#CybotCookiebotDialogBodyButtonDecline, ' +
      '[data-cookiebanner="decline"]'
    );
    if (rejectBtn && isVisible(rejectBtn)) {
      rejectBtn.click();
      return true;
    }
    return false;
  }

  // Quantcast / GDPR CMP
  function dismissQuantcast() {
    const rejectBtn = document.querySelector(
      '.qc-cmp2-summary-buttons button[mode="secondary"], ' +
      'button.qc-cmp-button[onclick*="reject"], ' +
      '.qc-cmp2-footer button:first-child, ' +
      'button[class*="qc-cmp"][class*="reject"]'
    );
    if (rejectBtn && isVisible(rejectBtn)) {
      rejectBtn.click();
      return true;
    }
    return false;
  }

  // TrustArc
  function dismissTrustArc() {
    const rejectBtn = document.querySelector(
      '#truste-consent-required, ' +
      '.truste_box_overlay .truste-consent-required, ' +
      'a.decline, ' +
      '#truste-consent-button[value*="decline" i]'
    );
    if (rejectBtn && isVisible(rejectBtn)) {
      rejectBtn.click();
      return true;
    }
    return false;
  }

  // Didomi
  function dismissDidomi() {
    const rejectBtn = document.querySelector(
      '#didomi-notice-disagree-button, ' +
      'button[class*="didomi"][class*="disagree"], ' +
      '[aria-label="Disagree and close"]'
    );
    if (rejectBtn && isVisible(rejectBtn)) {
      rejectBtn.click();
      return true;
    }
    return false;
  }

  // Osano
  function dismissOsano() {
    const rejectBtn = document.querySelector(
      '.osano-cm-denyAll, ' +
      'button.osano-cm-deny'
    );
    if (rejectBtn && isVisible(rejectBtn)) {
      rejectBtn.click();
      return true;
    }
    return false;
  }

  // Complianz
  function dismissComplianz() {
    const rejectBtn = document.querySelector(
      '.cmplz-deny, ' +
      '.cmplz-btn.cmplz-deny, ' +
      'button.cmplz-deny'
    );
    if (rejectBtn && isVisible(rejectBtn)) {
      rejectBtn.click();
      return true;
    }
    return false;
  }

  // CookieYes
  function dismissCookieYes() {
    const rejectBtn = document.querySelector(
      '.cky-btn-reject, ' +
      'button[data-cky-tag="reject-button"], ' +
      '#cookie_action_close_header_reject'
    );
    if (rejectBtn && isVisible(rejectBtn)) {
      rejectBtn.click();
      return true;
    }
    return false;
  }

  // Termly
  function dismissTermly() {
    const rejectBtn = document.querySelector(
      'button[class*="t-declineAllButton"], ' +
      '.t-bannercontent button:first-child'
    );
    if (rejectBtn && isVisible(rejectBtn)) {
      rejectBtn.click();
      return true;
    }
    return false;
  }

  // ---- Generic Banner Detection ----
  function dismissGenericBanner() {
    // Step 1: Try to find and click a "Reject" / "Decline" / "Only essential" button
    if (clickGenericRejectButton()) return true;

    // Step 2: Try to find and hide the banner element
    if (hideGenericBanner()) return true;

    return false;
  }

  function clickGenericRejectButton() {
    // Patterns for reject/decline buttons (ordered by preference)
    const rejectPatterns = [
      /reject\s*all/i,
      /decline\s*all/i,
      /deny\s*all/i,
      /refuse\s*all/i,
      /reject/i,
      /decline/i,
      /deny/i,
      /refuse/i,
      /only\s*essential/i,
      /only\s*necessary/i,
      /essential\s*only/i,
      /necessary\s*only/i,
      /accept\s*essential/i,
      /accept\s*necessary/i,
      /manage\s*preferences/i,
      /no[\s,]*thanks/i,
      /nein/i,
      /ablehnen/i,
      /refuser/i,
      /tout\s*refuser/i,
      /rechazar/i,
      /rifiuta/i,
    ];

    // Find all buttons and links in potential cookie banners
    const bannerEl = findBannerElement();
    if (!bannerEl) return false;

    const clickables = bannerEl.querySelectorAll('button, a[role="button"], a[href="#"], input[type="button"], input[type="submit"], [role="button"]');

    for (const pattern of rejectPatterns) {
      for (const el of clickables) {
        const text = (el.textContent || el.value || el.getAttribute('aria-label') || '').trim();
        if (pattern.test(text) && isVisible(el)) {
          el.click();
          return true;
        }
      }
    }

    return false;
  }

  function findBannerElement() {
    // Common cookie banner selectors
    const selectors = [
      '#cookie-banner', '#cookie-consent', '#cookie-notice', '#cookie-bar',
      '#cookie-popup', '#cookie-modal', '#cookie-dialog', '#cookie-warning',
      '#cookieBanner', '#cookieConsent', '#cookieNotice', '#cookieBar',
      '#gdpr-banner', '#gdpr-consent', '#gdpr-notice', '#gdpr-popup',
      '#consent-banner', '#consent-popup', '#consent-modal', '#consent-bar',
      '#privacy-banner', '#privacy-notice', '#privacy-popup',
      '.cookie-banner', '.cookie-consent', '.cookie-notice', '.cookie-bar',
      '.cookie-popup', '.cookie-modal', '.cookie-dialog', '.cookie-warning',
      '.cookieBanner', '.cookieConsent', '.cookieNotice', '.cookieBar',
      '.gdpr-banner', '.gdpr-consent', '.gdpr-notice', '.gdpr-popup',
      '.consent-banner', '.consent-popup', '.consent-modal', '.consent-bar',
      '.privacy-banner', '.privacy-notice', '.privacy-popup',
      '.cc-banner', '.cc-window', '.cc-dialog',
      '[class*="cookie-consent"]', '[class*="cookie-banner"]',
      '[class*="cookie-notice"]', '[class*="cookie-popup"]',
      '[id*="cookie-consent"]', '[id*="cookie-banner"]',
      '[aria-label*="cookie" i]', '[aria-label*="consent" i]',
      '[role="dialog"][aria-label*="cookie" i]',
      '[role="dialog"][aria-label*="privacy" i]',
    ];

    for (const sel of selectors) {
      try {
        const el = document.querySelector(sel);
        if (el && isVisible(el)) return el;
      } catch (e) { /* invalid selector, skip */ }
    }

    // Fallback: find fixed/sticky elements that look like cookie banners
    const allElements = document.querySelectorAll('div, section, aside, footer');
    for (const el of allElements) {
      if (!isVisible(el)) continue;
      const style = window.getComputedStyle(el);
      const isFixed = style.position === 'fixed' || style.position === 'sticky';
      if (!isFixed) continue;

      const text = (el.textContent || '').toLowerCase();
      const hasCookieText = /cookie|consent|gdpr|privacy|datenschutz|rgpd/.test(text);
      const hasButton = el.querySelector('button, a[role="button"], [role="button"]');

      if (hasCookieText && hasButton && el.offsetHeight < 500) {
        return el;
      }
    }

    return null;
  }

  function hideGenericBanner() {
    const banner = findBannerElement();
    if (!banner) return false;

    // Hide the banner
    banner.style.display = 'none';
    banner.style.visibility = 'hidden';
    banner.setAttribute('aria-hidden', 'true');

    // Also remove any overlay/backdrop
    const overlays = document.querySelectorAll(
      '.cookie-overlay, .consent-overlay, .gdpr-overlay, ' +
      '[class*="cookie-backdrop"], [class*="consent-backdrop"], ' +
      '[class*="cookie-overlay"], [class*="consent-overlay"]'
    );
    overlays.forEach(o => {
      o.style.display = 'none';
    });

    // Restore body scrolling (some banners block scroll)
    document.body.style.overflow = '';
    document.documentElement.style.overflow = '';

    return true;
  }

  // ---- Helpers ----

  function isVisible(el) {
    if (!el) return false;
    const style = window.getComputedStyle(el);
    return (
      style.display !== 'none' &&
      style.visibility !== 'hidden' &&
      style.opacity !== '0' &&
      el.offsetWidth > 0 &&
      el.offsetHeight > 0
    );
  }

  // Watch for dynamically added cookie banners
  function observeDOM() {
    const observer = new MutationObserver((mutations) => {
      if (!cookieDismissEnabled) return;

      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (node.nodeType !== Node.ELEMENT_NODE) continue;
          const text = (node.textContent || '').toLowerCase();
          if (/cookie|consent|gdpr|privacy/.test(text)) {
            // Wait a tick for the banner to fully render
            setTimeout(attemptDismiss, 200);
            return;
          }
        }
      }
    });

    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
    });

    // Stop observing after 30 seconds to save resources
    setTimeout(() => observer.disconnect(), 30000);
  }

})();
