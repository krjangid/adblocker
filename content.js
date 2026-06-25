chrome.storage.local.get(['adblockEnabled'], (result) => {
  const isEnabled = result.adblockEnabled !== false; // default true
  if (isEnabled) {
    applyCosmeticFiltering();
  }
});

chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === 'local' && changes.adblockEnabled) {
    if (changes.adblockEnabled.newValue) {
      applyCosmeticFiltering();
    } else {
      removeCosmeticFiltering();
    }
  }
});

function applyCosmeticFiltering() {
  // If not already injected, add the style class to body or inject a style block
  if (!document.getElementById('antigravity-adblock-styles')) {
    const style = document.createElement('style');
    style.id = 'antigravity-adblock-styles';
    style.textContent = `
      .ad-container,
      .ad-banner,
      .ad-wrapper,
      .advertisement,
      .adsbygoogle,
      [id^="div-gpt-ad-"],
      [id^="google_ads_iframe_"],
      .sponsored-post,
      .native-ad,
      .banner-ad,
      .hs-ad-container,
      .shimmer-ad,
      iframe[src*="doubleclick.net"],
      iframe[src*="googlesyndication.com"] {
          display: none !important;
          visibility: hidden !important;
          opacity: 0 !important;
          width: 0 !important;
          height: 0 !important;
          pointer-events: none !important;
          position: absolute !important;
          z-index: -1 !important;
      }
    `;
    (document.head || document.documentElement).appendChild(style);
  }
}

function removeCosmeticFiltering() {
  const style = document.getElementById('antigravity-adblock-styles');
  if (style) {
    style.remove();
  }
}

// ---- Speed / Page Load Timer ----
function measureSpeed() {
  const navTiming = performance.getEntriesByType('navigation')[0];
  if (navTiming && navTiming.loadEventEnd > 0) {
    const loadTime = (navTiming.loadEventEnd - navTiming.startTime) / 1000;
    sendSpeed(loadTime);
  } else {
    const t = performance.timing;
    if (t && t.loadEventEnd > 0) {
      const loadTime = (t.loadEventEnd - t.navigationStart) / 1000;
      sendSpeed(loadTime);
    } else {
      setTimeout(measureSpeed, 100);
    }
  }
}

function sendSpeed(speed) {
  if (speed > 0 && speed < 120) {
    chrome.runtime.sendMessage({ type: 'page_speed', speed: speed });
  }
}

if (document.readyState === 'complete') {
  measureSpeed();
} else {
  window.addEventListener('load', () => {
    setTimeout(measureSpeed, 0);
  });
}
