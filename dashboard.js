/* =====================================================
   WASTEWATCH — Dashboard JavaScript
   Waste Tracker, Pledges, City Data
   ===================================================== */

document.addEventListener('DOMContentLoaded', () => {
  // Auth guard
  if (!AUTH.isLoggedIn()) {
    window.location.href = 'login.html';
    return;
  }

  const user = AUTH.getCurrentUser();

  // Populate navbar
  document.getElementById('user-name').textContent = user.username;
  document.getElementById('user-city').textContent = user.city;

  // Logout
  document.getElementById('btn-logout').addEventListener('click', () => {
    AUTH.logout();
    window.location.href = 'index.html';
  });

  // Tab switching
  initTabs();

  // Init all panels
  initTracker();
  initPledges();
  initCity();
});

/* ═══════════════════════════════════════════════════
   TABS
   ═══════════════════════════════════════════════════ */
function initTabs() {
  const btns = document.querySelectorAll('.tab-btn');
  const panels = document.querySelectorAll('.tab-panel');

  btns.forEach(btn => {
    btn.addEventListener('click', () => {
      btns.forEach(b => b.classList.remove('active'));
      panels.forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
      const panel = document.getElementById('panel-' + btn.dataset.tab);
      panel.classList.add('active');

      // Re-trigger animation
      panel.style.animation = 'none';
      panel.offsetHeight; // force reflow
      panel.style.animation = '';
    });
  });
}

/* ═══════════════════════════════════════════════════
   TAB 1: WASTE TRACKER
   ═══════════════════════════════════════════════════ */
const PACKAGING_WEIGHTS = {
  plastic: 150,
  mixed: 120,
  paper: 100,
  biodegradable: 80,
};

let trackerChart = null;

function initTracker() {
  // Set default date to today
  const dateInput = document.getElementById('log-date');
  dateInput.value = new Date().toISOString().split('T')[0];

  // Form submit
  document.getElementById('tracker-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const date = dateInput.value;
    const orders = parseInt(document.getElementById('log-orders').value);
    const packaging = document.getElementById('log-packaging').value;
    const wasteGrams = orders * PACKAGING_WEIGHTS[packaging];

    await AUTH.addWasteEntry({ date, orders, packaging, wasteGrams });

    // Flash success
    const card = document.querySelector('.tracker-form-card');
    card.classList.add('flash');
    setTimeout(() => card.classList.remove('flash'), 600);

    // Reset
    document.getElementById('log-orders').value = 1;
    dateInput.value = new Date().toISOString().split('T')[0];

    await refreshTracker();
  });

  refreshTracker();
}

async function refreshTracker() {
  const log = await AUTH.getWasteLog();

  // Stats
  const totalOrders = log.reduce((s, e) => s + e.orders, 0);
  const totalWasteG = log.reduce((s, e) => s + e.wasteGrams, 0);
  const avgWaste = totalOrders > 0 ? Math.round(totalWasteG / totalOrders) : 0;

  const now = new Date();
  const thisMonth = log.filter(e => {
    const d = new Date(e.date);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).reduce((s, e) => s + e.orders, 0);

  document.getElementById('stat-total-orders').textContent = totalOrders.toLocaleString();
  document.getElementById('stat-total-waste').textContent = (totalWasteG / 1000).toFixed(2) + ' kg';
  document.getElementById('stat-avg-waste').textContent = avgWaste + ' g';
  document.getElementById('stat-this-month').textContent = thisMonth;

  // History table
  const tbody = document.getElementById('history-body');
  if (log.length === 0) {
    tbody.innerHTML = '<tr class="empty-row"><td colspan="5">No entries yet. Log your first order above!</td></tr>';
  } else {
    // Sort by date desc
    const sorted = [...log].sort((a, b) => new Date(b.date) - new Date(a.date));
    tbody.innerHTML = sorted.map(e => `
      <tr>
        <td>${formatDate(e.date)}</td>
        <td>${e.orders}</td>
        <td style="text-transform:capitalize">${e.packaging}</td>
        <td>${(e.wasteGrams / 1000).toFixed(2)} kg</td>
        <td><button class="btn-delete" data-id="${e.id}" title="Remove">✕</button></td>
      </tr>
    `).join('');

    // Bind delete buttons
    tbody.querySelectorAll('.btn-delete').forEach(btn => {
      btn.addEventListener('click', async () => {
        await AUTH.removeWasteEntry(parseInt(btn.dataset.id));
        await refreshTracker();
      });
    });
  }

  // Chart
  updateTrackerChart(log);
}

function updateTrackerChart(log) {
  if (log.length === 0) return;

  // Aggregate by date
  const byDate = {};
  log.forEach(e => {
    byDate[e.date] = (byDate[e.date] || 0) + e.wasteGrams;
  });

  const sorted = Object.entries(byDate).sort((a, b) => a[0].localeCompare(b[0]));
  const labels = sorted.map(([d]) => formatDate(d));
  const data = sorted.map(([, g]) => +(g / 1000).toFixed(2));

  // Running total
  let cumulative = 0;
  const cumulativeData = data.map(v => { cumulative += v; return +cumulative.toFixed(2); });

  const ctx = document.getElementById('tracker-chart').getContext('2d');

  if (trackerChart) {
    trackerChart.data.labels = labels;
    trackerChart.data.datasets[0].data = data;
    trackerChart.data.datasets[1].data = cumulativeData;
    trackerChart.update();
    return;
  }

  const gradient = ctx.createLinearGradient(0, 0, 0, 280);
  gradient.addColorStop(0, 'rgba(201,36,63,0.2)');
  gradient.addColorStop(1, 'rgba(201,36,63,0)');

  const gradientCyan = ctx.createLinearGradient(0, 0, 0, 280);
  gradientCyan.addColorStop(0, 'rgba(15,245,229,0.15)');
  gradientCyan.addColorStop(1, 'rgba(15,245,229,0)');

  trackerChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: 'Daily Waste (kg)',
          data,
          borderColor: '#e8304a',
          backgroundColor: gradient,
          borderWidth: 2,
          fill: true,
          tension: 0.3,
          pointBackgroundColor: '#e8304a',
          pointBorderColor: '#0a0a0f',
          pointBorderWidth: 2,
          pointRadius: 4,
          pointHoverRadius: 6,
        },
        {
          label: 'Cumulative (kg)',
          data: cumulativeData,
          borderColor: '#0ff5e5',
          backgroundColor: gradientCyan,
          borderWidth: 2,
          fill: true,
          tension: 0.3,
          pointBackgroundColor: '#0ff5e5',
          pointBorderColor: '#0a0a0f',
          pointBorderWidth: 2,
          pointRadius: 3,
          pointHoverRadius: 5,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { labels: { color: '#8a8a9a', font: { size: 11 } } },
        tooltip: {
          backgroundColor: 'rgba(12,12,18,0.92)',
          borderColor: '#c9243f',
          borderWidth: 1,
          padding: 10,
        },
      },
      scales: {
        x: {
          grid: { color: 'rgba(255,255,255,0.04)' },
          ticks: { color: '#8a8a9a', font: { size: 10 } },
        },
        y: {
          grid: { color: 'rgba(255,255,255,0.04)' },
          ticks: {
            color: '#8a8a9a',
            font: { size: 10 },
            callback: v => v + ' kg',
          },
        },
      },
    },
  });
}

function formatDate(d) {
  const date = new Date(d);
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

/* ═══════════════════════════════════════════════════
   TAB 2: PLEDGES
   ═══════════════════════════════════════════════════ */
function initPledges() {
  renderPledges();
}

async function renderPledges() {
  const grid = document.getElementById('pledge-grid');
  const activePledges = await AUTH.getPledges();

  grid.innerHTML = AUTH.PLEDGE_TYPES.map(p => {
    const isActive = !!activePledges[p.id];
    const rankInfo = isActive ? AUTH.getPledgeRank(activePledges[p.id].activatedAt) : { rank: 0, label: '—', next: null };

    return `
      <div class="pledge-card ${isActive ? 'active' : ''}" data-pledge="${p.id}">
        <div class="pledge-top">
          <span class="pledge-icon">${p.icon}</span>
          <div class="pledge-info">
            <div class="pledge-name">${p.name}</div>
            <div class="pledge-desc">${p.desc}</div>
          </div>
        </div>
        <div class="pledge-bottom">
          <div class="pledge-rank">
            <div class="pledge-rank-circle">${rankInfo.rank}</div>
            <div>
              <div class="pledge-rank-label">${rankInfo.label}</div>
              ${rankInfo.next !== null ? `<div class="pledge-rank-next">${rankInfo.next}d to next rank</div>` : '<div class="pledge-rank-next" style="color:var(--gold)">MAX RANK</div>'}
            </div>
          </div>
          <button class="pledge-status" data-pledge-id="${p.id}">
            ${isActive ? 'ACTIVE ✓' : 'ACTIVATE'}
          </button>
        </div>
      </div>
    `;
  }).join('');

  // Bind toggle buttons
  grid.querySelectorAll('.pledge-status').forEach(btn => {
    btn.addEventListener('click', async () => {
      const pledgeId = btn.dataset.pledgeId;
      const wasActive = !!activePledges[pledgeId];
      await AUTH.togglePledge(pledgeId, wasActive);
      await renderPledges();
    });
  });

  // Compute impact
  updatePledgeImpact(activePledges);
}

function updatePledgeImpact(activePledges) {
  let totalDays = 0;

  Object.values(activePledges).forEach(p => {
    if (p.activatedAt) {
      const days = Math.floor((Date.now() - new Date(p.activatedAt).getTime()) / 86400000);
      totalDays += Math.max(days, 1);
    }
  });

  // Rough estimate: each active pledge day prevents ~30g of waste
  const savedKg = ((totalDays * 30) / 1000).toFixed(1);
  const impactEl = document.getElementById('pledge-impact');
  impactEl.textContent = totalDays > 0 ? `~${savedKg} kg` : '—';
}

/* ═══════════════════════════════════════════════════
   TAB 3: YOUR CITY
   ═══════════════════════════════════════════════════ */
function initCity() {
  const user = AUTH.getCurrentUser();
  const cityName = user.city;
  const cityData = AUTH.CITY_DATA[cityName];

  if (!cityData) return;

  // Hero
  const badge = document.getElementById('city-rank-badge');
  badge.textContent = cityData.rank;
  badge.dataset.rank = cityData.rank;
  document.getElementById('city-name-display').textContent = cityName;

  const rankDescriptions = {
    S: 'Leading the nation in waste management',
    A: 'Strong waste management infrastructure',
    B: 'Moderate progress, room for improvement',
    C: 'Below average, significant challenges',
    D: 'Critical attention needed',
  };
  document.getElementById('city-tagline').textContent = rankDescriptions[cityData.rank] || '';

  // Stats
  document.getElementById('cstat-pop').textContent = cityData.population;
  document.getElementById('cstat-waste').textContent = cityData.wastePerCapita;
  document.getElementById('cstat-recycle').textContent = cityData.recycling;

  // Programs
  const programsEl = document.getElementById('city-programs');
  programsEl.innerHTML = cityData.programs.map(p =>
    `<span class="program-tag">${p}</span>`
  ).join('');

  // Orgs
  const orgsEl = document.getElementById('city-orgs');
  orgsEl.innerHTML = cityData.orgs.map(o =>
    `<span class="org-tag">${o}</span>`
  ).join('');

  // Rankings
  renderCityRankings(cityName);
}

function renderCityRankings(userCity) {
  const container = document.getElementById('city-rankings');

  // Sort cities by recycling rate desc
  const sorted = Object.entries(AUTH.CITY_DATA)
    .sort((a, b) => b[1].recycling - a[1].recycling);

  const maxRecycling = Math.max(...sorted.map(([, d]) => d.recycling));

  container.innerHTML = sorted.map(([name, data], i) => {
    const pct = (data.recycling / maxRecycling * 100).toFixed(0);
    const isUser = name === userCity;

    return `
      <div class="ranking-row">
        <span class="ranking-pos">${i + 1}</span>
        <span class="ranking-city-name ${isUser ? 'is-user' : ''}">${name}</span>
        <div class="ranking-bar-wrap">
          <div class="ranking-bar" data-rank="${data.rank}" style="width:${pct}%"></div>
        </div>
        <span class="ranking-grade" style="color:${getRankColor(data.rank)}">${data.rank}</span>
        <span class="ranking-pct">${data.recycling}%</span>
      </div>
    `;
  }).join('');
}

function getRankColor(rank) {
  const colors = { S: '#f0c940', A: '#0ff5e5', B: '#a855f7', C: '#8a8a9a', D: '#e8304a' };
  return colors[rank] || '#8a8a9a';
}
