document.addEventListener('DOMContentLoaded', () => {
  const powerSwitch = document.getElementById('power-switch');
  const statusDot = document.getElementById('status-dot');
  const statusText = document.getElementById('status-text');
  const premiumSwitch = document.getElementById('premium-switch');
  const proCard = document.getElementById('pro-card');
  const proSubtext = document.getElementById('pro-subtext');
  const themeToggle = document.getElementById('theme-toggle');
  const themeIcon = document.getElementById('theme-icon');
  const notifySwitch = document.getElementById('notify-switch');
  const notifyCard = document.getElementById('notify-card');
  const notifySubtext = document.getElementById('notify-subtext');
  const cookieSwitch = document.getElementById('cookie-switch');
  const cookieCard = document.getElementById('cookie-card');
  const cookieSubtext = document.getElementById('cookie-subtext');

  // ---- Theme ----
  chrome.storage.local.get(['theme'], (result) => {
    const theme = result.theme || 'dark';
    applyTheme(theme);
  });

  themeToggle.addEventListener('click', () => {
    const current = document.body.getAttribute('data-theme') || 'dark';
    const next = current === 'dark' ? 'light' : 'dark';
    applyTheme(next);
    chrome.storage.local.set({ theme: next });
  });

  function applyTheme(theme) {
    document.body.setAttribute('data-theme', theme);
    themeIcon.textContent = theme === 'dark' ? '☀️' : '🌙';
  }

  // ---- Load initial state ----
  chrome.storage.local.get(['adblockEnabled', 'premiumEnabled', 'notifyEnabled', 'cookieDismissEnabled'], (result) => {
    const isEnabled = result.adblockEnabled !== false;
    const isPremium = result.premiumEnabled === true;
    const isNotify = result.notifyEnabled === true;
    const isCookie = result.cookieDismissEnabled === true;
    powerSwitch.checked = isEnabled;
    premiumSwitch.checked = isPremium;
    notifySwitch.checked = isNotify;
    cookieSwitch.checked = isCookie;
    updateUI(isEnabled);
    updatePremiumUI(isPremium);
    updateNotifyUI(isNotify);
    updateCookieUI(isCookie);
  });

  // Handle main toggle
  powerSwitch.addEventListener('change', (e) => {
    const isEnabled = e.target.checked;
    chrome.storage.local.set({ adblockEnabled: isEnabled });
    updateUI(isEnabled);
  });

  // Handle premium toggle
  premiumSwitch.addEventListener('change', (e) => {
    const isPremium = e.target.checked;
    chrome.storage.local.set({ premiumEnabled: isPremium });
    updatePremiumUI(isPremium);
  });

  // Handle notification toggle
  notifySwitch.addEventListener('change', (e) => {
    const isNotify = e.target.checked;
    chrome.storage.local.set({ notifyEnabled: isNotify });
    updateNotifyUI(isNotify);
  });

  // Handle cookie toggle
  cookieSwitch.addEventListener('change', (e) => {
    const isCookie = e.target.checked;
    chrome.storage.local.set({ cookieDismissEnabled: isCookie });
    updateCookieUI(isCookie);
  });

  function updateUI(isEnabled) {
    if (isEnabled) {
      statusText.textContent = 'ACTIVE';
      statusText.style.color = 'var(--text-dark)';
      statusDot.classList.remove('off');
    } else {
      statusText.textContent = 'DISABLED';
      statusText.style.color = 'var(--text-light)';
      statusDot.classList.add('off');
    }
  }

  function updatePremiumUI(isPremium) {
    if (isPremium) {
      proCard.classList.add('active');
      proSubtext.textContent = '✅ Shield active — trackers & malware blocked';
    } else {
      proCard.classList.remove('active');
      proSubtext.textContent = 'Activate to block trackers & malware';
    }
  }

  function updateNotifyUI(isNotify) {
    if (isNotify) {
      notifyCard.classList.add('active');
      notifySubtext.textContent = '✅ Alerts enabled — you\'ll be notified';
    } else {
      notifyCard.classList.remove('active');
      notifySubtext.textContent = 'Get notified when threats are blocked';
    }
  }

  function updateCookieUI(isCookie) {
    if (isCookie) {
      cookieCard.classList.add('active');
      cookieSubtext.textContent = '✅ Enabled — auto-rejecting cookie banners';
    } else {
      cookieCard.classList.remove('active');
      cookieSubtext.textContent = 'Auto-reject cookie consent banners';
    }
  }

  // ---- Analytics Dashboard ----
  const pageBlockedEl = document.getElementById('page-blocked');
  const totalBlockedEl = document.getElementById('total-blocked');
  const dataSavedEl = document.getElementById('data-saved');

  // Load total stats
  chrome.storage.local.get(['totalAdsBlocked', 'totalDataSaved'], (result) => {
    totalBlockedEl.textContent = (result.totalAdsBlocked || 0).toLocaleString();
    const mbSaved = ((result.totalDataSaved || 0) / 1024).toFixed(2);
    dataSavedEl.textContent = mbSaved + ' MB';
  });

  // Get current tab blocked count
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs[0] && tabs[0].id) {
      chrome.action.getBadgeText({ tabId: tabs[0].id }, (text) => {
        if (text === 'ON' || text === 'OFF' || !text) {
          pageBlockedEl.textContent = '0';
        } else {
          pageBlockedEl.textContent = text;
        }
      });
    }
  });

  // Get current tab page load speed
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs[0] && tabs[0].id) {
      const tabId = tabs[0].id;
      chrome.storage.local.get([`loadTime_${tabId}`], (result) => {
        const speed = result[`loadTime_${tabId}`];
        const pageLoadEl = document.getElementById('page-load-time');
        if (pageLoadEl) {
          pageLoadEl.textContent = speed ? speed.toFixed(2) + 's' : '--';
        }
      });
    }
  });

  // Listen for real-time page speed updates while popup is open
  chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'local') {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0] && tabs[0].id) {
          const tabId = tabs[0].id;
          const key = `loadTime_${tabId}`;
          if (changes[key]) {
            const pageLoadEl = document.getElementById('page-load-time');
            if (pageLoadEl) {
              const speed = changes[key].newValue;
              pageLoadEl.textContent = speed ? speed.toFixed(2) + 's' : '--';
            }
          }
        }
      });
    }
  });

  // Open dashboard in new tab
  document.getElementById('open-dashboard').addEventListener('click', () => {
    chrome.tabs.create({ url: chrome.runtime.getURL('dashboard/dashboard.html') });
  });
});
