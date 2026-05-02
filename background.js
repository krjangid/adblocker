chrome.runtime.onInstalled.addListener(() => {
  // Set default state to enabled
  chrome.storage.local.get(['adblockEnabled'], (result) => {
    if (result.adblockEnabled === undefined) {
      chrome.storage.local.set({ adblockEnabled: true });
    }
  });
});

chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === 'local' && changes.adblockEnabled) {
    const isEnabled = changes.adblockEnabled.newValue;
    updateRulesetStatus(isEnabled);
  }
});

function updateRulesetStatus(isEnabled) {
  if (isEnabled) {
    chrome.declarativeNetRequest.updateEnabledRulesets({
      enableRulesetIds: ['ruleset_1'],
      disableRulesetIds: []
    });
    chrome.action.setBadgeText({ text: 'ON' });
    chrome.action.setBadgeBackgroundColor({ color: '#4CAF50' });
  } else {
    chrome.declarativeNetRequest.updateEnabledRulesets({
      enableRulesetIds: [],
      disableRulesetIds: ['ruleset_1']
    });
    chrome.action.setBadgeText({ text: 'OFF' });
    chrome.action.setBadgeBackgroundColor({ color: '#F44336' });
  }
}

// Initial badge setup based on current state
chrome.storage.local.get(['adblockEnabled'], (result) => {
  updateRulesetStatus(result.adblockEnabled !== false);
});
