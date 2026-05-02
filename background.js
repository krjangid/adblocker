// Background script initialized
chrome.runtime.onInstalled.addListener(() => {
  // Set default state to enabled
  chrome.storage.local.get(['adblockEnabled', 'totalAdsBlocked', 'totalDataSaved'], (result) => {
    const updates = {};
    if (result.adblockEnabled === undefined) updates.adblockEnabled = true;
    if (result.totalAdsBlocked === undefined) updates.totalAdsBlocked = 0;
    if (result.totalDataSaved === undefined) updates.totalDataSaved = 0;
    if (Object.keys(updates).length > 0) {
      chrome.storage.local.set(updates);
    }
  });
});

// Track blocked requests to update total analytics
if (chrome.declarativeNetRequest.onRuleMatchedDebug) {
  chrome.declarativeNetRequest.onRuleMatchedDebug.addListener((info) => {
    chrome.storage.local.get(['totalAdsBlocked', 'totalDataSaved'], (result) => {
      const newBlocked = (result.totalAdsBlocked || 0) + 1;
      // Estimate 50KB per blocked ad request
      const newData = (result.totalDataSaved || 0) + 50; 
      chrome.storage.local.set({
        totalAdsBlocked: newBlocked,
        totalDataSaved: newData
      });
    });
  });
}
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
    chrome.action.setBadgeText({ text: '' }); // Clear manual text
    chrome.declarativeNetRequest.setExtensionActionOptions({ displayActionCountAsBadgeText: true });
    chrome.action.setBadgeBackgroundColor({ color: '#ff6b35' }); // Sunset Glow orange
  } else {
    chrome.declarativeNetRequest.updateEnabledRulesets({
      enableRulesetIds: [],
      disableRulesetIds: ['ruleset_1']
    });
    chrome.declarativeNetRequest.setExtensionActionOptions({ displayActionCountAsBadgeText: false });
    chrome.action.setBadgeText({ text: 'OFF' });
    chrome.action.setBadgeBackgroundColor({ color: '#ff1a1a' }); // Sunset Glow red
  }
}

// Initial badge setup based on current state
chrome.storage.local.get(['adblockEnabled'], (result) => {
  updateRulesetStatus(result.adblockEnabled !== false);
});
