document.addEventListener('DOMContentLoaded', () => {
  const powerSwitch = document.getElementById('power-switch');
  const statusText = document.getElementById('status-text');
  const statusSubtext = document.getElementById('status-subtext');
  const statusCard = document.querySelector('.status-card');

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
      statusText.textContent = 'AdBlocker is ON';
      statusSubtext.textContent = 'Blocking ads on this page';
      statusCard.classList.add('active');
      statusCard.classList.remove('inactive');
    } else {
      statusText.textContent = 'AdBlocker is OFF';
      statusSubtext.textContent = 'Ads are allowed';
      statusCard.classList.add('inactive');
      statusCard.classList.remove('active');
    }
  }
});
