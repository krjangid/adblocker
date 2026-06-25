// Helpers
function timeAgo(ts) {
  const diff = Math.floor((Date.now() - ts) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  return `${Math.floor(diff / 3600)}h ago`;
}

function badgeClass(category) {
  if (category === 'tracker') return 'badge-tracker';
  if (category === 'malware') return 'badge-malware';
  return 'badge-ad';
}

function badgeLabel(category) {
  if (category === 'tracker') return 'TRACKER';
  if (category === 'malware') return 'MALWARE';
  return 'AD';
}

// ---- Theme ----
const themeToggle = document.getElementById('theme-toggle-dash');
const themeIcon = document.getElementById('theme-icon-dash');

function applyTheme(theme) {
  document.body.setAttribute('data-theme', theme);
  themeIcon.textContent = theme === 'dark' ? '☀️' : '🌙';
}

// Load saved theme
chrome.storage.local.get(['theme'], (result) => {
  applyTheme(result.theme || 'dark');
});

themeToggle.addEventListener('click', () => {
  const current = document.body.getAttribute('data-theme') || 'dark';
  const next = current === 'dark' ? 'light' : 'dark';
  applyTheme(next);
  chrome.storage.local.set({ theme: next });
  // Reload charts with new theme colors
  loadDashboard();
});

// ---- Theme-aware chart colors ----
function getChartColors() {
  const isLight = document.body.getAttribute('data-theme') === 'light';
  return {
    blue: isLight ? '#3b82f6' : '#60a5fa',
    orange: isLight ? '#f59e0b' : '#fbbf24',
    red: isLight ? '#ef4444' : '#f87171',
    green: isLight ? '#10b981' : '#34d399',
    purple: isLight ? '#8b5cf6' : '#a78bfa',
    textColor: isLight ? 'rgba(30, 40, 80, 0.5)' : 'rgba(255, 255, 255, 0.5)',
    gridColor: isLight ? 'rgba(0, 0, 0, 0.06)' : 'rgba(255, 255, 255, 0.06)',
    borderColor: isLight ? 'rgba(0, 0, 0, 0.08)' : 'rgba(255, 255, 255, 0.08)',
    gradientTop: isLight ? 'rgba(59, 130, 246, 0.2)' : 'rgba(96, 165, 250, 0.25)',
    gradientBottom: isLight ? 'rgba(59, 130, 246, 0)' : 'rgba(96, 165, 250, 0)',
    barBg: isLight ? 'rgba(59, 130, 246, 0.25)' : 'rgba(96, 165, 250, 0.35)',
    barHover: isLight ? 'rgba(59, 130, 246, 0.5)' : 'rgba(96, 165, 250, 0.6)',
  };
}

// Navigation
const sections = {
  'nav-overview': 'section-overview',
  'nav-livefeed': 'section-livefeed',
  'nav-topsites': 'section-topsites'
};

document.querySelectorAll('.nav-link').forEach(link => {
  link.addEventListener('click', (e) => {
    e.preventDefault();
    document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
    link.classList.add('active');
    const sectionId = sections[link.id];
    document.getElementById(sectionId).classList.add('active');

    // Re-render charts when switching back to overview (they need visible canvas)
    if (sectionId === 'section-overview') {
      setTimeout(() => initCharts(latestBreakdown, latestDaily, latestSites), 50);
    }
  });
});

// Chart instances
let lineChart, donutChart, barChart;

// Last 7 days labels
function getLast7DayLabels() {
  const labels = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    labels.push(d.toLocaleDateString('en-US', { weekday: 'short' }));
  }
  return labels;
}

function getLast7DayKeys() {
  const keys = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    keys.push(d.toISOString().split('T')[0]);
  }
  return keys;
}

// Chart.js global defaults — Liquid Glass style
Chart.defaults.font.family = 'Poppins';

// Store latest data so we can re-render when switching tabs
let latestBreakdown = {}, latestDaily = {}, latestSites = {};

function initCharts(breakdown, dailyCounts, topSites) {
  // Store data for deferred rendering
  latestBreakdown = breakdown;
  latestDaily = dailyCounts;
  latestSites = topSites;

  // Only render charts if the overview section is visible
  const overviewSection = document.getElementById('section-overview');
  if (!overviewSection || !overviewSection.classList.contains('active')) return;

  const c = getChartColors();
  Chart.defaults.color = c.textColor;

  // --- Line Chart ---
  const lineCanvas = document.getElementById('lineChart');
  if (!lineCanvas || lineCanvas.offsetWidth === 0) return;

  const dayKeys = getLast7DayKeys();
  const dayLabels = getLast7DayLabels();
  const dayData = dayKeys.map(k => dailyCounts[k] || 0);

  const lineCtx = lineCanvas.getContext('2d');
  const gradient = lineCtx.createLinearGradient(0, 0, 0, 200);
  gradient.addColorStop(0, c.gradientTop);
  gradient.addColorStop(1, c.gradientBottom);

  if (lineChart) lineChart.destroy();
  lineChart = new Chart(lineCtx, {
    type: 'line',
    data: {
      labels: dayLabels,
      datasets: [{
        data: dayData,
        borderColor: c.blue,
        backgroundColor: gradient,
        borderWidth: 2.5,
        pointBackgroundColor: c.blue,
        pointRadius: 4,
        pointBorderColor: c.blue + '99',
        pointBorderWidth: 2,
        tension: 0.4,
        fill: true
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 0 },
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: { color: c.gridColor }, border: { color: c.borderColor } },
        y: { beginAtZero: true, grid: { color: c.gridColor }, border: { color: c.borderColor }, ticks: { precision: 0 } }
      }
    }
  });

  // --- Donut Chart ---
  const ads = breakdown.ads || 0;
  const trackers = breakdown.trackers || 0;
  const malware = breakdown.malware || 0;
  const total = ads + trackers + malware;

  const donutCtx = document.getElementById('donutChart').getContext('2d');
  if (donutChart) donutChart.destroy();
  donutChart = new Chart(donutCtx, {
    type: 'doughnut',
    data: {
      labels: ['Ads', 'Trackers', 'Malware'],
      datasets: [{
        data: total === 0 ? [1, 0, 0] : [ads, trackers, malware],
        backgroundColor: [c.blue, c.orange, c.red],
        borderWidth: 0,
        hoverOffset: 8
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 0 },
      cutout: '65%',
      plugins: {
        legend: { display: false },
        tooltip: { enabled: total > 0 }
      }
    }
  });

  // Legend
  const legend = document.getElementById('donut-legend');
  const totalLabel = total === 0 ? 1 : total;
  legend.innerHTML = [
    { label: 'Ads', color: c.blue, val: ads },
    { label: 'Trackers', color: c.orange, val: trackers },
    { label: 'Malware', color: c.red, val: malware }
  ].map(item => `
    <div class="legend-item">
      <div class="legend-dot" style="background:${item.color}"></div>
      <span>${item.label}</span>
      <span style="margin-left:auto;color:${c.blue};font-weight:700">${Math.round(item.val / totalLabel * 100)}%</span>
    </div>
  `).join('');

  // --- Bar Chart (Top 5 Sites) ---
  const sortedSites = Object.entries(topSites)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);
  const barLabels = sortedSites.map(([k]) => k);
  const barData = sortedSites.map(([, v]) => v);

  const barCtx = document.getElementById('barChart').getContext('2d');
  if (barChart) barChart.destroy();
  barChart = new Chart(barCtx, {
    type: 'bar',
    data: {
      labels: barLabels.length ? barLabels : ['No data yet'],
      datasets: [{
        data: barData.length ? barData : [0],
        backgroundColor: c.barBg,
        borderColor: c.blue,
        borderWidth: 1.5,
        borderRadius: 8,
        hoverBackgroundColor: c.barHover
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 0 },
      indexAxis: 'y',
      plugins: { legend: { display: false } },
      scales: {
        x: { beginAtZero: true, grid: { color: c.gridColor }, border: { color: c.borderColor }, ticks: { precision: 0 } },
        y: { grid: { display: false }, border: { color: c.borderColor } }
      }
    }
  });
}

// Render Live Feed
function renderFeed(feed) {
  const list = document.getElementById('feed-list');
  if (!feed || feed.length === 0) {
    list.innerHTML = '<li class="feed-empty">No blocked requests recorded yet. Browse the web with Blockium enabled!</li>';
    return;
  }
  list.innerHTML = feed.map(item => `
    <li class="feed-item">
      <div class="feed-favicon">🌐</div>
      <span class="feed-domain">${item.domain}</span>
      <span class="feed-badge ${badgeClass(item.category)}">${badgeLabel(item.category)}</span>
      <span class="feed-time">${timeAgo(item.time)}</span>
    </li>
  `).join('');
}

// Render Hall of Shame
function renderShame(topSites) {
  const container = document.getElementById('shame-list');
  const sorted = Object.entries(topSites).sort((a, b) => b[1] - a[1]).slice(0, 8);
  if (sorted.length === 0) {
    container.innerHTML = '<p class="feed-empty">No tracker data yet. Browse the web with Blockium enabled!</p>';
    return;
  }
  const max = sorted[0][1];
  container.innerHTML = sorted.map(([domain, count], i) => `
    <div class="shame-item">
      <span class="shame-rank">${i + 1}</span>
      <div class="shame-info">
        <div class="shame-domain">${domain}</div>
        <div class="shame-bar-bg">
          <div class="shame-bar-fill" style="width: ${Math.round((count / max) * 100)}%"></div>
        </div>
      </div>
      <span class="shame-count">${count} attempts</span>
    </div>
  `).join('');
}

// Load all data and render
function loadDashboard() {
  chrome.storage.local.get(['totalAdsBlocked', 'totalDataSaved', 'typeBreakdown', 'dailyCounts', 'topSites', 'liveFeed', 'averageLoadTime'], (result) => {
    const total = result.totalAdsBlocked || 0;
    const dataMB = ((result.totalDataSaved || 0) / 1024).toFixed(2);
    const breakdown = result.typeBreakdown || { ads: 0, trackers: 0, malware: 0 };
    const daily = result.dailyCounts || {};
    const sites = result.topSites || {};
    const feed = result.liveFeed || [];
    const avgSpeed = result.averageLoadTime || 0;

    // Sidebar
    document.getElementById('sb-total').textContent = total.toLocaleString();
    document.getElementById('sb-data').textContent = dataMB + ' MB';

    // Stat cards
    document.getElementById('card-ads').textContent = (breakdown.ads || 0).toLocaleString();
    document.getElementById('card-trackers').textContent = (breakdown.trackers || 0).toLocaleString();
    document.getElementById('card-malware').textContent = (breakdown.malware || 0).toLocaleString();
    document.getElementById('card-data').textContent = dataMB + ' MB';
    document.getElementById('card-speed').textContent = avgSpeed ? avgSpeed.toFixed(2) + 's' : '0.00s';

    // Charts
    initCharts(breakdown, daily, sites);

    // Feed & Shame
    renderFeed(feed);
    renderShame(sites);
  });
}

// Initial load
loadDashboard();

// Auto-refresh every 5 seconds
setInterval(loadDashboard, 5000);
