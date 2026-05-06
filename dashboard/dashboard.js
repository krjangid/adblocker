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
    document.getElementById(sections[link.id]).classList.add('active');
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

// Chart.js global defaults — Neumorphic style
Chart.defaults.font.family = 'Poppins';
Chart.defaults.color = '#7a8a9e';

function initCharts(breakdown, dailyCounts, topSites) {
  // --- Line Chart ---
  const dayKeys = getLast7DayKeys();
  const dayLabels = getLast7DayLabels();
  const dayData = dayKeys.map(k => dailyCounts[k] || 0);

  const lineCtx = document.getElementById('lineChart').getContext('2d');
  const gradient = lineCtx.createLinearGradient(0, 0, 0, 200);
  gradient.addColorStop(0, 'rgba(74, 144, 226, 0.3)');
  gradient.addColorStop(1, 'rgba(74, 144, 226, 0)');

  if (lineChart) lineChart.destroy();
  lineChart = new Chart(lineCtx, {
    type: 'line',
    data: {
      labels: dayLabels,
      datasets: [{
        data: dayData,
        borderColor: '#4a90e2',
        backgroundColor: gradient,
        borderWidth: 2.5,
        pointBackgroundColor: '#4a90e2',
        pointRadius: 4,
        tension: 0.4,
        fill: true
      }]
    },
    options: {
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: { color: 'rgba(163,177,198,0.3)' } },
        y: { beginAtZero: true, grid: { color: 'rgba(163,177,198,0.3)' }, ticks: { stepSize: 1 } }
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
        backgroundColor: ['#4a90e2', '#f39c12', '#e74c3c'],
        borderWidth: 0,
        hoverOffset: 8
      }]
    },
    options: {
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
    { label: 'Ads', color: '#4a90e2', val: ads },
    { label: 'Trackers', color: '#f39c12', val: trackers },
    { label: 'Malware', color: '#e74c3c', val: malware }
  ].map(item => `
    <div class="legend-item">
      <div class="legend-dot" style="background:${item.color}"></div>
      <span>${item.label}</span>
      <span style="margin-left:auto;color:#4a90e2;font-weight:700">${Math.round(item.val / totalLabel * 100)}%</span>
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
        backgroundColor: 'rgba(74, 144, 226, 0.6)',
        borderColor: '#4a90e2',
        borderWidth: 1.5,
        borderRadius: 8,
        hoverBackgroundColor: '#4a90e2'
      }]
    },
    options: {
      indexAxis: 'y',
      plugins: { legend: { display: false } },
      scales: {
        x: { beginAtZero: true, grid: { color: 'rgba(163,177,198,0.3)' }, ticks: { stepSize: 1 } },
        y: { grid: { display: false } }
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
  chrome.storage.local.get(['totalAdsBlocked', 'totalDataSaved', 'typeBreakdown', 'dailyCounts', 'topSites', 'liveFeed'], (result) => {
    const total = result.totalAdsBlocked || 0;
    const dataMB = ((result.totalDataSaved || 0) / 1024).toFixed(2);
    const breakdown = result.typeBreakdown || { ads: 0, trackers: 0, malware: 0 };
    const daily = result.dailyCounts || {};
    const sites = result.topSites || {};
    const feed = result.liveFeed || [];

    // Sidebar
    document.getElementById('sb-total').textContent = total.toLocaleString();
    document.getElementById('sb-data').textContent = dataMB + ' MB';

    // Stat cards
    document.getElementById('card-ads').textContent = (breakdown.ads || 0).toLocaleString();
    document.getElementById('card-trackers').textContent = (breakdown.trackers || 0).toLocaleString();
    document.getElementById('card-malware').textContent = (breakdown.malware || 0).toLocaleString();
    document.getElementById('card-data').textContent = dataMB + ' MB';

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
