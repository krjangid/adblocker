document.addEventListener('DOMContentLoaded', () => {
  const powerSwitch = document.getElementById('power-switch');
  const statusDot = document.getElementById('status-dot');
  const statusText = document.getElementById('status-text');

  // Load initial state
  chrome.storage.local.get(['adblockEnabled'], (result) => {
    const isEnabled = result.adblockEnabled !== false; // true by default
    powerSwitch.checked = isEnabled;
    updateUI(isEnabled);
  });

  // Handle toggle
  powerSwitch.addEventListener('change', (e) => {
    const isEnabled = e.target.checked;
    chrome.storage.local.set({ adblockEnabled: isEnabled });
    updateUI(isEnabled);
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

  // Analytics Dashboard
  const pageBlockedEl = document.getElementById('page-blocked');
  const totalBlockedEl = document.getElementById('total-blocked');
  const dataSavedEl = document.getElementById('data-saved');

  // Load total stats
  chrome.storage.local.get(['totalAdsBlocked', 'totalDataSaved'], (result) => {
    totalBlockedEl.textContent = (result.totalAdsBlocked || 0).toLocaleString();
    // Convert KB to MB
    const mbSaved = ((result.totalDataSaved || 0) / 1024).toFixed(2);
    dataSavedEl.textContent = mbSaved + ' MB';
  });

  // Get current tab blocked count
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs[0] && tabs[0].id) {
      chrome.action.getBadgeText({ tabId: tabs[0].id }, (text) => {
        // If badge text is 'ON' or 'OFF', it means no ads blocked on this specific page via declarativeNetRequest yet
        if (text === 'ON' || text === 'OFF' || !text) {
          pageBlockedEl.textContent = '0';
        } else {
          pageBlockedEl.textContent = text;
        }
      });
    }
  });
});
