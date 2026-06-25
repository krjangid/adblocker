// Background script initialized
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.get(['adblockEnabled', 'premiumEnabled', 'notifyEnabled', 'totalAdsBlocked', 'totalDataSaved', 'liveFeed', 'topSites', 'typeBreakdown', 'dailyCounts'], (result) => {
    const updates = {};
    if (result.adblockEnabled === undefined) updates.adblockEnabled = true;
    if (result.premiumEnabled === undefined) updates.premiumEnabled = false;
    if (result.notifyEnabled === undefined) updates.notifyEnabled = false;
    if (result.cookieDismissEnabled === undefined) updates.cookieDismissEnabled = false;
    if (result.totalAdsBlocked === undefined) updates.totalAdsBlocked = 0;
    if (result.totalDataSaved === undefined) updates.totalDataSaved = 0;
    if (!result.liveFeed) updates.liveFeed = [];
    if (!result.topSites) updates.topSites = {};
    if (!result.typeBreakdown) updates.typeBreakdown = { ads: 0, trackers: 0, malware: 0 };
    if (!result.dailyCounts) updates.dailyCounts = {};
    if (Object.keys(updates).length > 0) chrome.storage.local.set(updates);
  });
});

// Helper: classify rule ID into category
function classifyRule(ruleId) {
  if (ruleId >= 2000) return 'malware';
  if (ruleId >= 1000) return 'tracker';
  return 'ad';
}

// Helper: get today's date key (YYYY-MM-DD)
function todayKey() {
  return new Date().toISOString().split('T')[0];
}

// Helper: extract domain from url
function getDomain(url) {
  try { return new URL(url).hostname.replace(/^www\./, ''); }
  catch(e) { return url; }
}

// ---- Notification Alerts ----
// Track which tabs have already shown a notification this page load
// so we don't spam the user with repeated alerts
const notifiedTabs = new Map();

function showThreatNotification(category, domain, tabId) {
  chrome.storage.local.get(['notifyEnabled'], (result) => {
    if (!result.notifyEnabled) return;

    // Only notify once per tab per page load for threats
    const tabKey = `${tabId}-${category}`;
    if (notifiedTabs.has(tabKey)) return;
    notifiedTabs.set(tabKey, true);

    const titles = {
      malware: '🦠 Malware Blocked!',
      tracker: '👁️ Tracker Stopped!'
    };

    const messages = {
      malware: `Blockium blocked a malware request from ${domain}. Your device is protected.`,
      tracker: `Blockium stopped a tracker from ${domain} trying to follow you.`
    };

    const title = titles[category] || '🛡️ Threat Blocked!';
    const message = messages[category] || `Blockium blocked a threat from ${domain}.`;

    chrome.notifications.create(`blockium-${Date.now()}`, {
      type: 'basic',
      iconUrl: 'icons/icon128.png',
      title: title,
      message: message,
      priority: 1,
      silent: false
    });
  });
}

// Clear notification tracking when a tab navigates to a new page
chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (changeInfo.status === 'loading') {
    // Clear all entries for this tab when the page starts loading
    for (const key of notifiedTabs.keys()) {
      if (key.startsWith(`${tabId}-`)) {
        notifiedTabs.delete(key);
      }
    }
  }
});

// Clear notification tracking when a tab is closed
chrome.tabs.onRemoved.addListener((tabId) => {
  for (const key of notifiedTabs.keys()) {
    if (key.startsWith(`${tabId}-`)) {
      notifiedTabs.delete(key);
    }
  }
});

// Process a list of matched rules and update storage
function processMatchedRules(matchedRules, tabId) {
  if (!matchedRules || matchedRules.length === 0) return;

  chrome.storage.local.get(['totalAdsBlocked', 'totalDataSaved', 'liveFeed', 'topSites', 'typeBreakdown', 'dailyCounts'], (result) => {
    let totalAdsBlocked = result.totalAdsBlocked || 0;
    let totalDataSaved = result.totalDataSaved || 0;
    const feed = result.liveFeed || [];
    const sites = result.topSites || {};
    const breakdown = result.typeBreakdown || { ads: 0, trackers: 0, malware: 0 };
    const daily = result.dailyCounts || {};
    const today = todayKey();

    matchedRules.forEach(({ rule, request }) => {
      // Safety check — request can be undefined for some rule types
      if (!rule || !request || !request.url) return;

      const ruleId = rule.ruleId;
      const category = classifyRule(ruleId);
      const domain = getDomain(request.url);

      totalAdsBlocked++;
      totalDataSaved += 50;

      // Live feed (max 10)
      feed.unshift({ domain, category, time: Date.now() });
      if (feed.length > 10) feed.pop();

      // Top sites
      sites[domain] = (sites[domain] || 0) + 1;

      // Type breakdown
      if (category === 'ad') breakdown.ads++;
      else if (category === 'tracker') breakdown.trackers++;
      else breakdown.malware++;

      // Daily counts
      daily[today] = (daily[today] || 0) + 1;

      // Send notification for malware and tracker blocks
      if (category === 'malware' || category === 'tracker') {
        showThreatNotification(category, domain, tabId);
      }
    });

    // Prune old daily data (keep 7 days)
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 7);
    Object.keys(daily).forEach(k => { if (new Date(k) < cutoff) delete daily[k]; });

    chrome.storage.local.set({ totalAdsBlocked, totalDataSaved, liveFeed: feed, topSites: sites, typeBreakdown: breakdown, dailyCounts: daily });
  });
}

// PRIMARY: Use getMatchedRules() when a tab finishes loading — reliable in all unpacked extensions
chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (changeInfo.status === 'complete') {
    chrome.declarativeNetRequest.getMatchedRules({ tabId }, (result) => {
      if (chrome.runtime.lastError) return; // tab may have closed
      if (result && result.rulesMatchedInfo) {
        processMatchedRules(result.rulesMatchedInfo, tabId);
      }
    });
  }
});

// SECONDARY: Also try onRuleMatchedDebug if available (some Chrome versions support it)
if (chrome.declarativeNetRequest.onRuleMatchedDebug) {
  chrome.declarativeNetRequest.onRuleMatchedDebug.addListener((info) => {
    const tabId = info.request ? info.request.tabId : -1;
    processMatchedRules([info], tabId);
  });
}

// Listen for changes in adblockEnabled and premiumEnabled
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === 'local') {
    if (changes.adblockEnabled) updateRulesetStatus(changes.adblockEnabled.newValue);
    if (changes.premiumEnabled) updatePremiumRuleset(changes.premiumEnabled.newValue);
  }
});

function updateRulesetStatus(isEnabled) {
  if (isEnabled) {
    chrome.declarativeNetRequest.updateEnabledRulesets({ enableRulesetIds: ['ruleset_1'], disableRulesetIds: [] });
    chrome.declarativeNetRequest.setExtensionActionOptions({ displayActionCountAsBadgeText: true });
    chrome.action.setBadgeBackgroundColor({ color: '#4a90e2' });
  } else {
    chrome.declarativeNetRequest.updateEnabledRulesets({ enableRulesetIds: [], disableRulesetIds: ['ruleset_1'] });
    chrome.declarativeNetRequest.setExtensionActionOptions({ displayActionCountAsBadgeText: false });
    chrome.action.setBadgeText({ text: 'OFF' });
    chrome.action.setBadgeBackgroundColor({ color: '#e74c3c' });
  }
}

function updatePremiumRuleset(isEnabled) {
  if (isEnabled) {
    chrome.declarativeNetRequest.updateEnabledRulesets({ enableRulesetIds: ['malware_rules'], disableRulesetIds: [] });
  } else {
    chrome.declarativeNetRequest.updateEnabledRulesets({ enableRulesetIds: [], disableRulesetIds: ['malware_rules'] });
  }
}

// Initial setup
chrome.storage.local.get(['adblockEnabled', 'premiumEnabled'], (result) => {
  updateRulesetStatus(result.adblockEnabled !== false);
  updatePremiumRuleset(result.premiumEnabled === true);
});
