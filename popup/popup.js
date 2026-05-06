document.addEventListener('DOMContentLoaded', () => {
  const powerSwitch = document.getElementById('power-switch');
  const statusDot = document.getElementById('status-dot');
  const statusText = document.getElementById('status-text');
  const premiumSwitch = document.getElementById('premium-switch');
  const proCard = document.getElementById('pro-card');
  const proSubtext = document.getElementById('pro-subtext');

  // Load initial state for both toggles
  chrome.storage.local.get(['adblockEnabled', 'premiumEnabled'], (result) => {
    const isEnabled = result.adblockEnabled !== false;
    const isPremium = result.premiumEnabled === true;
    powerSwitch.checked = isEnabled;
    premiumSwitch.checked = isPremium;
    updateUI(isEnabled);
    updatePremiumUI(isPremium);
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

  // Analytics Dashboard
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

  // Open dashboard in new tab
  document.getElementById('open-dashboard').addEventListener('click', () => {
    chrome.tabs.create({ url: chrome.runtime.getURL('dashboard/dashboard.html') });
  });
});
