let primeSkipInterval = null;

// Initialize
console.log("[Blockium] Amazon Prime Skipper loaded.");
chrome.storage.local.get(['adblockEnabled'], (result) => {
  const isEnabled = result.adblockEnabled !== false;
  if (isEnabled) {
    startPrimeSkipper();
  }
});

// Listen for toggle changes
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === 'local' && changes.adblockEnabled) {
    if (changes.adblockEnabled.newValue) {
      startPrimeSkipper();
    } else {
      stopPrimeSkipper();
    }
  }
});

function startPrimeSkipper() {
  if (primeSkipInterval) return;
  
  // Run every 1000ms
  primeSkipInterval = setInterval(() => {
    // 1. Text-based resilient button clicker
    // Instead of relying on random CSS classes that Amazon changes frequently,
    // we search the page for any button that contains the word "Skip"
    const buttons = document.querySelectorAll('button, div[role="button"], .skipElement, .atvwebplayersdk-skipelement-button');
    if (buttons && buttons.length > 0) {
      buttons.forEach(btn => {
        const text = btn.innerText || btn.textContent;
        if (text) {
          const lowerText = text.toLowerCase();
          if (lowerText.includes('skip ad') || lowerText.includes('skip trailer') || lowerText.includes('skip recap') || lowerText.includes('skip intro')) {
            btn.click();
          }
        }
      });
    }

    // 2. Aggressive Short-Video Fast-Forward
    // Amazon heavily obfuscates their "Ad 0:09" text (often splitting it into multiple hidden spans).
    // Instead of looking for the Ad text, we will just aggressively scan every video player on the screen.
    const videos = document.querySelectorAll('video');
    
    if (videos && videos.length > 0) {
      videos.forEach(video => {
        // Ensure the video has loaded its metadata and has a valid duration
        if (video && !isNaN(video.duration) && video.duration > 0) {
          
          // CRITICAL LOGIC: People go to Amazon Prime to watch long TV shows and Movies (20+ minutes).
          // If a video is playing and its total length is less than 3 minutes (180 seconds), 
          // it is 100% guaranteed to be a pre-roll Ad or a Trailer.
          if (video.duration < 180) {
            console.log(`[Blockium] Short ad/trailer detected (${video.duration}s). Nuking it!`);
            
            video.muted = true; // Silence it
            video.playbackRate = 16.0; // Max speed
            
            // Jump to exactly 0.5 seconds before the end so the Amazon player naturally triggers 
            // its own "video ended" event and loads your actual movie.
            if (video.currentTime < video.duration - 1) {
              video.currentTime = video.duration - 0.5;
            }
          }
        }
      });
    }
  }, 500);
}

function stopPrimeSkipper() {
  if (primeSkipInterval) {
    clearInterval(primeSkipInterval);
    primeSkipInterval = null;
  }
}
