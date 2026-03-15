/* =====================================================
   WASTEWATCH — Main JavaScript
   Chart.js visualizations, predictor, scroll animations
   ===================================================== */

document.addEventListener('DOMContentLoaded', () => {
  initNavbar();
  initAuthButton();
  initScrollReveal();
  initCounters();
  initCharts();
  initPredictor();
});

/* ── Auth-aware navbar button ──────────────────── */
function initAuthButton() {
  const btn = document.getElementById('nav-auth-btn');
  if (!btn) return;

  if (typeof AUTH !== 'undefined' && AUTH.isLoggedIn()) {
    btn.textContent = 'Dashboard';
    btn.href = 'dashboard.html';
    btn.classList.add('auth-logged-in');
  } else {
    btn.textContent = 'Login';
    btn.href = 'login.html';
  }
}

/* ═══════════════════════════════════════════════════
   NAVBAR
   ═══════════════════════════════════════════════════ */
function initNavbar() {
  const toggle = document.getElementById('nav-toggle');
  const links = document.getElementById('nav-links');
  const navLinks = document.querySelectorAll('.nav-link');

  toggle.addEventListener('click', () => {
    links.classList.toggle('open');
  });

  // Close menu on link click (mobile)
  navLinks.forEach(link => {
    link.addEventListener('click', () => links.classList.remove('open'));
  });

  // Active section highlighting
  const sections = document.querySelectorAll('section[id]');
  const observerOptions = { rootMargin: '-40% 0px -55% 0px' };

  const sectionObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        navLinks.forEach(l => l.classList.remove('active'));
        const id = entry.target.id;
        const activeLink = document.querySelector(`.nav-link[href="#${id}"]`);
        if (activeLink) activeLink.classList.add('active');
      }
    });
  }, observerOptions);

  sections.forEach(s => sectionObserver.observe(s));
}

/* ═══════════════════════════════════════════════════
   SCROLL REVEAL
   ═══════════════════════════════════════════════════ */
function initScrollReveal() {
  const reveals = document.querySelectorAll('.reveal');
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const delay = parseInt(entry.target.dataset.delay) || 0;
        setTimeout(() => entry.target.classList.add('visible'), delay);
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15 });

  reveals.forEach(r => observer.observe(r));
}

/* ═══════════════════════════════════════════════════
   ANIMATED COUNTERS
   ═══════════════════════════════════════════════════ */
function initCounters() {
  const counters = document.querySelectorAll('.stat-number, .counter');
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        animateCounter(entry.target);
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.5 });

  counters.forEach(c => observer.observe(c));
}

function animateCounter(el) {
  const target = parseInt(el.dataset.target);
  const suffix = el.dataset.suffix || '';
  const duration = 2000;
  const start = performance.now();

  function update(now) {
    const elapsed = now - start;
    const progress = Math.min(elapsed / duration, 1);
    // easeOutExpo
    const eased = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
    const current = Math.floor(eased * target);
    el.textContent = formatNumber(current) + suffix;
    if (progress < 1) requestAnimationFrame(update);
  }
  requestAnimationFrame(update);
}

function formatNumber(n) {
  return n.toLocaleString('en-IN');
}

/* ═══════════════════════════════════════════════════
   CHART.JS — THEME CONFIG
   ═══════════════════════════════════════════════════ */
const COLORS = {
  crimson: '#c9243f',
  crimsonGlow: '#e8304a',
  cyan: '#0ff5e5',
  cyanDim: '#0bb8ac',
  gold: '#f0c940',
  amber: '#f59e0b',
  purple: '#a855f7',
  pink: '#ec4899',
  textDim: '#8a8a9a',
  textPrimary: '#e8e6e1',
  gridLine: 'rgba(255,255,255,0.06)',
  surface: '#1e1e2a',
};

function chartDefaults() {
  Chart.defaults.color = COLORS.textDim;
  Chart.defaults.font.family = "'Inter', system-ui, sans-serif";
  Chart.defaults.plugins.legend.labels.usePointStyle = true;
  Chart.defaults.plugins.legend.labels.pointStyleWidth = 10;
  Chart.defaults.plugins.tooltip.backgroundColor = 'rgba(12,12,18,0.92)';
  Chart.defaults.plugins.tooltip.borderColor = COLORS.crimson;
  Chart.defaults.plugins.tooltip.borderWidth = 1;
  Chart.defaults.plugins.tooltip.cornerRadius = 4;
  Chart.defaults.plugins.tooltip.titleFont = { family: "'Playfair Display', serif", weight: '700', size: 13 };
  Chart.defaults.plugins.tooltip.bodyFont = { size: 12 };
  Chart.defaults.plugins.tooltip.padding = 12;
}

/* ═══════════════════════════════════════════════════
   CHARTS
   ═══════════════════════════════════════════════════ */
function initCharts() {
  chartDefaults();
  createBarChart();
  createDoughnutChart();
  createLineChart();
}

/* ── Bar: Waste by Material Type ───────────────── */
function createBarChart() {
  const ctx = document.getElementById('chart-bar').getContext('2d');
  new Chart(ctx, {
    type: 'bar',
    data: {
      labels: ['Plastic Containers', 'Plastic Bags', 'Paper/Cardboard', 'Aluminium Foil', 'Styrofoam', 'Cutlery & Straws'],
      datasets: [{
        label: 'Tonnes / Month',
        data: [3200, 1800, 1600, 1100, 900, 800],
        backgroundColor: [
          COLORS.crimson,
          COLORS.crimsonGlow,
          COLORS.cyan,
          COLORS.gold,
          COLORS.purple,
          COLORS.pink,
        ],
        borderWidth: 0,
        borderRadius: 4,
        barPercentage: 0.7,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { font: { size: 11 } },
        },
        y: {
          grid: { color: COLORS.gridLine },
          ticks: {
            font: { size: 11 },
            callback: v => v.toLocaleString(),
          },
        },
      },
    },
  });
}

/* ── Doughnut: Packaging Composition ───────────── */
function createDoughnutChart() {
  const ctx = document.getElementById('chart-doughnut').getContext('2d');
  new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['Plastic', 'Paper/Cardboard', 'Aluminium', 'Styrofoam', 'Others'],
      datasets: [{
        data: [53, 17, 12, 10, 8],
        backgroundColor: [
          COLORS.crimson,
          COLORS.cyan,
          COLORS.gold,
          COLORS.purple,
          COLORS.pink,
        ],
        borderColor: '#12121a',
        borderWidth: 3,
        hoverOffset: 8,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '62%',
      plugins: {
        legend: {
          position: 'bottom',
          labels: { padding: 16, font: { size: 12 } },
        },
        tooltip: {
          callbacks: {
            label: ctx => ` ${ctx.label}: ${ctx.parsed}%`,
          },
        },
      },
    },
  });
}

/* ── Line: Year-over-Year Growth ───────────────── */
function createLineChart() {
  const ctx = document.getElementById('chart-line').getContext('2d');
  const gradient = ctx.createLinearGradient(0, 0, 0, 320);
  gradient.addColorStop(0, 'rgba(201,36,63,0.25)');
  gradient.addColorStop(1, 'rgba(201,36,63,0)');

  new Chart(ctx, {
    type: 'line',
    data: {
      labels: ['2018', '2019', '2020', '2021', '2022', '2023', '2024', '2025'],
      datasets: [{
        label: 'Packaging Waste (thousand tonnes/year)',
        data: [28, 42, 35, 56, 78, 98, 115, 135],
        borderColor: COLORS.crimson,
        backgroundColor: gradient,
        borderWidth: 3,
        fill: true,
        tension: 0.35,
        pointBackgroundColor: COLORS.crimsonGlow,
        pointBorderColor: '#0a0a0f',
        pointBorderWidth: 2,
        pointRadius: 5,
        pointHoverRadius: 8,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          labels: { font: { size: 12 } },
        },
      },
      scales: {
        x: {
          grid: { color: COLORS.gridLine },
          ticks: { font: { size: 11 } },
        },
        y: {
          grid: { color: COLORS.gridLine },
          ticks: {
            font: { size: 11 },
            callback: v => v + 'k',
          },
        },
      },
    },
  });
}

/* ═══════════════════════════════════════════════════
   WASTE PREDICTOR — Interactive Calculator
   ═══════════════════════════════════════════════════ */
let predictorChart = null;

function initPredictor() {
  const sliderOrders = document.getElementById('slider-orders');
  const sliderWeight = document.getElementById('slider-weight');
  const sliderGrowth = document.getElementById('slider-growth');
  const sliderRecycle = document.getElementById('slider-recycle');

  const valOrders = document.getElementById('val-orders');
  const valWeight = document.getElementById('val-weight');
  const valGrowth = document.getElementById('val-growth');
  const valRecycle = document.getElementById('val-recycle');

  function updateSliderFill(slider) {
    const pct = ((slider.value - slider.min) / (slider.max - slider.min)) * 100;
    slider.style.background = `linear-gradient(90deg, var(--crimson) ${pct}%, var(--surface) ${pct}%)`;
  }

  function updatePredictor() {
    const orders = parseFloat(sliderOrders.value);    // millions/day
    const weight = parseFloat(sliderWeight.value);     // grams
    const growth = parseFloat(sliderGrowth.value);     // % year
    const recycle = parseFloat(sliderRecycle.value);    // %

    // Display values
    valOrders.textContent = orders.toFixed(1);
    valWeight.textContent = weight;
    valGrowth.textContent = growth;
    valRecycle.textContent = recycle;

    // Update slider fills
    updateSliderFill(sliderOrders);
    updateSliderFill(sliderWeight);
    updateSliderFill(sliderGrowth);
    updateSliderFill(sliderRecycle);

    // Compute projections
    const years = [];
    const totalWaste = [];
    const unrecycledWaste = [];
    const recycledWaste = [];

    const baseYear = 2025;
    for (let i = 0; i <= 10; i++) {
      const year = baseYear + i;
      years.push(year.toString());

      // daily orders grow by growth% each year
      const dailyOrders = orders * 1e6 * Math.pow(1 + growth / 100, i);
      // daily waste in tonnes
      const dailyWasteTonnes = (dailyOrders * weight) / 1e6;
      // annual waste in thousand tonnes
      const annualWasteKT = (dailyWasteTonnes * 365) / 1000;

      const recycledKT = annualWasteKT * (recycle / 100);
      const unrecycledKT = annualWasteKT - recycledKT;

      totalWaste.push(Math.round(annualWasteKT * 10) / 10);
      recycledWaste.push(Math.round(recycledKT * 10) / 10);
      unrecycledWaste.push(Math.round(unrecycledKT * 10) / 10);
    }

    // Update summary
    const finalUnrecycled = unrecycledWaste[unrecycledWaste.length - 1];
    document.getElementById('summary-number').textContent =
      finalUnrecycled.toLocaleString('en-IN', { maximumFractionDigits: 0 }) + ' thousand tonnes';

    // Update or create chart
    updatePredictorChart(years, totalWaste, unrecycledWaste, recycledWaste);
  }

  [sliderOrders, sliderWeight, sliderGrowth, sliderRecycle].forEach(s => {
    s.addEventListener('input', updatePredictor);
  });

  // Initial render
  updatePredictor();
}

function updatePredictorChart(labels, total, unrecycled, recycled) {
  const ctx = document.getElementById('chart-predictor').getContext('2d');

  if (predictorChart) {
    predictorChart.data.labels = labels;
    predictorChart.data.datasets[0].data = total;
    predictorChart.data.datasets[1].data = unrecycled;
    predictorChart.data.datasets[2].data = recycled;
    predictorChart.update('none');
    return;
  }

  const gradientRed = ctx.createLinearGradient(0, 0, 0, 320);
  gradientRed.addColorStop(0, 'rgba(232,48,74,0.2)');
  gradientRed.addColorStop(1, 'rgba(232,48,74,0)');

  const gradientCyan = ctx.createLinearGradient(0, 0, 0, 320);
  gradientCyan.addColorStop(0, 'rgba(15,245,229,0.15)');
  gradientCyan.addColorStop(1, 'rgba(15,245,229,0)');

  predictorChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: 'Total Waste (k tonnes)',
          data: total,
          borderColor: COLORS.crimsonGlow,
          backgroundColor: gradientRed,
          borderWidth: 3,
          fill: true,
          tension: 0.3,
          pointBackgroundColor: COLORS.crimsonGlow,
          pointBorderColor: '#0a0a0f',
          pointBorderWidth: 2,
          pointRadius: 4,
          pointHoverRadius: 7,
        },
        {
          label: 'Unrecycled (k tonnes)',
          data: unrecycled,
          borderColor: COLORS.gold,
          borderWidth: 2,
          borderDash: [6, 3],
          fill: false,
          tension: 0.3,
          pointBackgroundColor: COLORS.gold,
          pointBorderColor: '#0a0a0f',
          pointBorderWidth: 2,
          pointRadius: 3,
          pointHoverRadius: 6,
        },
        {
          label: 'Recycled (k tonnes)',
          data: recycled,
          borderColor: COLORS.cyan,
          backgroundColor: gradientCyan,
          borderWidth: 2,
          fill: true,
          tension: 0.3,
          pointBackgroundColor: COLORS.cyan,
          pointBorderColor: '#0a0a0f',
          pointBorderWidth: 2,
          pointRadius: 3,
          pointHoverRadius: 6,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: 'index',
        intersect: false,
      },
      plugins: {
        legend: {
          labels: { font: { size: 12 }, padding: 16 },
        },
        tooltip: {
          callbacks: {
            label: ctx => ` ${ctx.dataset.label}: ${ctx.parsed.y.toLocaleString()} k tonnes`,
          },
        },
      },
      scales: {
        x: {
          grid: { color: COLORS.gridLine },
          ticks: { font: { size: 11 } },
        },
        y: {
          grid: { color: COLORS.gridLine },
          ticks: {
            font: { size: 11 },
            callback: v => v.toLocaleString() + 'k',
          },
        },
      },
      animation: {
        duration: 0,
      },
    },
  });
}
