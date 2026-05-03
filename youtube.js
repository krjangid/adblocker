let adSkipInterval = null;

// Initialize
chrome.storage.local.get(['adblockEnabled'], (result) => {
  const isEnabled = result.adblockEnabled !== false;
  if (isEnabled) {
    startSkipper();
  }
});

// Listen for toggle changes
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === 'local' && changes.adblockEnabled) {
    if (changes.adblockEnabled.newValue) {
      startSkipper();
    } else {
      stopSkipper();
    }
  }
});

function startSkipper() {
  if (adSkipInterval) return;
  
  // Run every 500ms to instantly detect ads without heavy DOM observation
  adSkipInterval = setInterval(() => {
    // 1. Click standard "Skip Ad" buttons
    const skipButtons = document.querySelectorAll('.ytp-ad-skip-button, .ytp-ad-skip-button-modern, .ytp-skip-ad-button');
    if (skipButtons && skipButtons.length > 0) {
      skipButtons.forEach(button => button.click());
    }

    // 2. Fast forward unskippable video ads
    // Check if the ad container is showing
    const adPlayerOverlay = document.querySelector('.ytp-ad-player-overlay, .ad-showing');
    if (adPlayerOverlay) {
      const video = document.querySelector('video.html5-main-video');
      if (video && !isNaN(video.duration)) {
        // Fast forward to the end of the ad
        video.currentTime = video.duration;
      }
    }

    // 3. Close text/banner overlays at the bottom of the player
    const closeButtons = document.querySelectorAll('.ytp-ad-overlay-close-button');
    if (closeButtons && closeButtons.length > 0) {
      closeButtons.forEach(button => button.click());
    }
  }, 500);
}

function stopSkipper() {
  if (adSkipInterval) {
    clearInterval(adSkipInterval);
    adSkipInterval = null;
  }
}
