# CLAUDE.md — Blockium Adblocker

This file provides context and guidelines for AI assistants (Claude, Gemini, etc.) working on this project.

---

## Project Overview

**Blockium** is a Chrome browser extension (Manifest V3) that blocks ads, trackers, malware, and phishing domains. It includes:
- A **Neumorphic Soft UI** popup with a PRO toggle
- A **full-page Privacy Dashboard** with real-time Chart.js analytics
- Dedicated **content scripts** for YouTube, Amazon Prime, and Hotstar
- A **dual ruleset system**: basic ads (always on) + PRO malware/tracker rules (toggled)

**GitHub:** `https://github.com/krjangid/adblocker`  
**Current version:** 2.0.0  
**Active branch:** `new-feature` (merge to `main` when stable)

---

## Architecture

```
adblocker/
├── manifest.json          # MV3 manifest — permissions, rulesets, content scripts
├── background.js          # Service worker — ruleset switching, analytics collection
├── content.js             # Cosmetic CSS filtering — runs on all URLs
├── youtube.js             # YouTube ad-skip — fast-forward + skip button clicker
├── prime.js               # Amazon Prime ad-skip — duration-based fast-forward
├── rules.json             # Core ad-blocking rules (ruleset_1, always enabled)
├── malware_rules.json     # PRO rules — trackers, malware, phishing, cryptominers
├── popup/
│   ├── popup.html         # Neumorphic popup UI
│   ├── popup.css          # Soft UI CSS (variables, shadows, toggle, PRO card)
│   └── popup.js           # Popup logic — toggle handlers, dashboard button
├── dashboard/
│   ├── dashboard.html     # Full-page analytics dashboard (3 sections via sidebar)
│   ├── dashboard.css      # Dashboard styles — sidebar, stat cards, feed, shame list
│   ├── dashboard.js       # Loads from chrome.storage, renders Chart.js charts
│   └── chart.min.js       # Chart.js v4.4.0 bundled locally (CSP requirement)
├── icons/                 # Extension icons — icon16.png, icon48.png, icon128.png
└── assets/                # README screenshots
```

---

## Key Technical Decisions

### 1. Manifest V3 — declarativeNetRequest
- All network blocking uses `declarativeNetRequest` (not `webRequest`). This is Chrome-native and adds zero JavaScript overhead.
- Two rulesets are declared in `manifest.json`:
  - `ruleset_1` → `rules.json` → **always enabled**
  - `malware_rules` → `malware_rules.json` → **disabled by default, enabled via PRO toggle**
- Rule IDs are namespaced: `1–999` = ads, `1000–1999` = trackers, `2000+` = malware/phishing/cryptominers

### 2. Analytics Data Collection
- `background.js` listens to `chrome.tabs.onUpdated` (status: `complete`)
- On each tab load, it calls `chrome.declarativeNetRequest.getMatchedRules({ tabId })`
- **Do NOT use `onRuleMatchedDebug`** — it is unreliable in practice and requires special Chrome flags
- The `request` object inside matched rules can be `undefined` — always guard with `if (!rule || !request || !request.url) return;`
- Data stored in `chrome.storage.local`: `totalAdsBlocked`, `totalDataSaved`, `liveFeed` (last 10), `topSites` (domain → count), `typeBreakdown` ({ads, trackers, malware}), `dailyCounts` (YYYY-MM-DD → count, last 7 days)

### 3. Content Security Policy (CSP)
- Chrome extensions **cannot load scripts from external CDNs**. Any `<script src="https://...">` in extension HTML pages will be blocked by CSP.
- Chart.js is bundled locally as `dashboard/chart.min.js` — do not replace with a CDN link.
- Google Fonts `<link>` tags are allowed (stylesheet, not script).

### 4. Design System — Neumorphism
- Background: `#e0e5ec` (off-white)
- Font: `Poppins` from Google Fonts (400, 600, 700)
- Shadow formula (raised): `6px 6px 12px #a3b1c6, -6px -6px 12px #ffffff`
- Shadow formula (inset/pressed): `inset 6px 6px 12px #a3b1c6, inset -6px -6px 12px #ffffff`
- Accent colors: Blue `#4a90e2`, Orange `#f39c12`, Green `#2ecc71`, Red `#e74c3c`
- All CSS variables are defined in `:root` in `popup.css`
- **Do not use dark mode** — Neumorphism only works on light backgrounds

### 5. YouTube Ad-Skipping
- Uses a `setInterval` (500ms) to monitor the video player
- Fast-forwards `<video>` element `currentTime` to `duration - 0.1` to skip unskippable ads
- Also clicks `.ytp-skip-ad-button` and `.ytp-ad-overlay-close-button` when present
- **Do NOT use MutationObserver** — too heavy and not needed at 500ms interval

### 6. Amazon Prime Ad-Skipping
- Detects any `<video>` element under 3 minutes duration (180s) as a Freevee ad
- Sets `playbackRate = 16` and `muted = true` to fast-forward silently
- Amazon uses SSAI (server-side ad insertion) with obfuscated/randomized CSS classes — do not rely on class names

---

## Permissions

```json
"permissions": [
  "declarativeNetRequest",
  "declarativeNetRequestWithHostAccess",
  "declarativeNetRequestFeedback",
  "storage",
  "scripting",
  "tabs"
]
```

- `tabs` permission is required for `chrome.tabs.onUpdated` and `chrome.action.getBadgeText({ tabId })`
- `declarativeNetRequestFeedback` is required for `getMatchedRules()`
- `host_permissions: ["<all_urls>"]` is required for content scripts and cosmetic filtering

---

## Storage Schema

```js
chrome.storage.local = {
  adblockEnabled: true,          // bool — main toggle state
  premiumEnabled: false,         // bool — PRO malware shield state
  totalAdsBlocked: 0,            // number — lifetime count
  totalDataSaved: 0,             // number — KB saved (50KB per block)
  liveFeed: [],                  // array — last 10 { domain, category, time }
  topSites: {},                  // object — { "example.com": 42 }
  typeBreakdown: {               // object — category counts
    ads: 0,
    trackers: 0,
    malware: 0
  },
  dailyCounts: {}                // object — { "2026-05-06": 120 }
}
```

---

## Dashboard Sections

The dashboard (`dashboard/dashboard.html`) has 3 navigable sections:

| Section ID | Nav Link ID | Content |
|---|---|---|
| `section-overview` | `nav-overview` | Stat cards + line chart + donut chart + bar chart |
| `section-livefeed` | `nav-livefeed` | Feed list of last 10 blocked requests |
| `section-topsites` | `nav-topsites` | Ranked leaderboard of top blocked domains |

Dashboard auto-refreshes every 5 seconds via `setInterval(loadDashboard, 5000)`.

---

## Common Gotchas

1. **Reload required**: After any change to `manifest.json`, `background.js`, or any JSON ruleset, you MUST reload the extension at `chrome://extensions/` for changes to take effect.
2. **Page refresh required**: After reloading the extension, you must also refresh the target website (YouTube, etc.) for content scripts to re-inject.
3. **`onRuleMatchedDebug` is unreliable**: Do not use it as the primary data collection method. Use `getMatchedRules()` instead.
4. **CDN scripts are blocked**: Never add `<script src="https://...">` to extension HTML. Download libraries locally.
5. **Neumorphism shadows**: Both `--shadow-light` (`#ffffff`) and `--shadow-dark` (`#a3b1c6`) must be defined for shadows to look correct. If only one shadow is used, the effect breaks.
6. **`request` can be undefined**: In `getMatchedRules()` results, always guard against `request` being undefined before accessing `request.url`.

---

## Development Workflow

1. Make code changes
2. Go to `chrome://extensions/` → Click **Reload (↻)** on Blockium
3. Refresh the target website
4. Test the feature
5. Commit to `new-feature` branch
6. When stable, open a Pull Request to merge `new-feature` → `main`

## Testing Tracker Blocking

Visit these websites with the PRO toggle ON to generate dashboard data:
- `flipkart.com` — Google Analytics, Facebook Pixel
- `ndtv.com` — 10–15 trackers per page
- `zomato.com` — TikTok Pixel, Google Ads
- `amazon.in` — Multiple ad networks
