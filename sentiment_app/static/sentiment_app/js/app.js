/* ── SentimentAI — Frontend Application ── */

const API = {
  analyze: '/api/analyze/',
  bulk: '/api/bulk/',
  history: '/api/history/',
  stats: '/api/stats/',
  reset: '/api/reset/',
};

// ── State ──
let currentSource = 'social_media';
let currentBulkSource = 'bulk';
let allHistory = [];

// ── DOM Helpers ──
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

function toast(msg, type = 'info', duration = 3500) {
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  const icons = { success: '✓', error: '✕', info: '◎' };
  el.innerHTML = `<span>${icons[type]}</span><span>${msg}</span>`;
  $('#toastContainer').appendChild(el);
  setTimeout(() => el.remove(), duration);
}

function setLoading(show, text = 'Analyzing sentiment...') {
  const overlay = $('#loadingOverlay');
  const loader = overlay.querySelector('.loader__text');
  loader.textContent = text;
  overlay.classList.toggle('hidden', !show);
}

async function fetchJSON(url, options = {}) {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json', 'X-CSRFToken': getCookie('csrftoken') },
    ...options,
  });
  return res.json();
}

function getCookie(name) {
  const val = `; ${document.cookie}`.split(`; ${name}=`);
  if (val.length === 2) return val.pop().split(';').shift();
  return '';
}

// ── Status Check ──
async function checkStatus() {
  try {
    const data = await fetchJSON(API.stats);
    const dot = $('#statusDot');
    const label = $('#statusLabel');
    if (data.success) {
      dot.className = 'status-dot online';
      label.textContent = 'Online';
    } else {
      dot.className = 'status-dot offline';
      label.textContent = 'API Error';
    }
  } catch {
    $('#statusDot').className = 'status-dot offline';
    $('#statusLabel').textContent = 'Offline';
  }
}

// ── Tab Navigation ──
function initTabs() {
  $$('.nav-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const tab = btn.dataset.tab;
      $$('.nav-btn').forEach((b) => b.classList.remove('active'));
      $$('.tab-panel').forEach((p) => p.classList.remove('active'));
      btn.classList.add('active');
      $(`#tab-${tab}`).classList.add('active');
      if (tab === 'dashboard') loadDashboard();
      if (tab === 'history') loadHistory();
    });
  });
}

// ── Source Pills ──
function initPills() {
  $$('[data-source]').forEach((pill) => {
    pill.addEventListener('click', () => {
      $$('[data-source]').forEach((p) => p.classList.remove('active'));
      pill.classList.add('active');
      currentSource = pill.dataset.source;
    });
  });
  $$('[data-bulk-source]').forEach((pill) => {
    pill.addEventListener('click', () => {
      $$('[data-bulk-source]').forEach((p) => p.classList.remove('active'));
      pill.classList.add('active');
      currentBulkSource = pill.dataset.bulkSource;
    });
  });
}

// ── Char Counter ──
function initCharCounter() {
  const ta = $('#analyzeText');
  const counter = $('#charCount');
  ta.addEventListener('input', () => {
    counter.textContent = `${ta.value.length} / 5000`;
  });

  const bulk = $('#bulkText');
  const lineCounter = $('#lineCount');
  bulk.addEventListener('input', () => {
    const lines = bulk.value.split('\n').filter((l) => l.trim()).length;
    lineCounter.textContent = `${lines} line${lines !== 1 ? 's' : ''}`;
  });
}

// ── Analyze Single ──
async function analyzeSingle() {
  const text = $('#analyzeText').value.trim();
  if (!text) { toast('Please enter some text to analyze.', 'error'); return; }

  const btn = $('#analyzeBtn');
  btn.disabled = true;
  setLoading(true, 'Analyzing sentiment...');

  try {
    const data = await fetchJSON(API.analyze, {
      method: 'POST',
      body: JSON.stringify({ text, source: currentSource }),
    });

    if (data.success) {
      renderResult(data.result);
      toast('Analysis complete!', 'success');
    } else {
      toast(data.error || 'Analysis failed.', 'error');
    }
  } catch (e) {
    toast('Network error. Is the server running?', 'error');
  } finally {
    btn.disabled = false;
    setLoading(false);
  }
}

function renderResult(result) {
  const placeholder = $('#resultPlaceholder');
  const content = $('#resultContent');

  placeholder.classList.add('hidden');
  content.classList.remove('hidden');

  // Badge
  const badge = $('#resultBadge');
  badge.className = `result-badge ${result.label}`;
  badge.textContent = result.label;

  // Confidence
  $('#confValue').textContent = `${result.confidence}%`;

  // Preview
  const preview = $('#resultPreview');
  preview.textContent = result.text;

  // Score Bars
  const scoreBars = $('#scoreBars');
  scoreBars.innerHTML = '';
  const colors = { positive: 'positive', negative: 'negative', neutral: 'neutral' };
  for (const [key, val] of Object.entries(result.scores)) {
    const pct = Math.round(val * 100);
    scoreBars.innerHTML += `
      <div class="score-row">
        <span class="score-name">${key}</span>
        <div class="score-bar-bg">
          <div class="score-bar-fill ${colors[key]}" style="width:${pct}%"></div>
        </div>
        <span class="score-pct">${pct}%</span>
      </div>`;
  }

  // Meta
  const meta = result.created_at
    ? new Date(result.created_at).toLocaleString()
    : new Date().toLocaleString();
  $('#resultMeta').innerHTML = `
    <span>Source: ${result.source || currentSource}</span>
    <span>${meta}</span>`;
}

// ── Bulk Analyze ──
async function analyzeBulk() {
  const raw = $('#bulkText').value.trim();
  if (!raw) { toast('Please enter texts to analyze.', 'error'); return; }

  const btn = $('#bulkBtn');
  btn.disabled = true;
  setLoading(true, 'Processing bulk texts...');

  try {
    const data = await fetchJSON(API.bulk, {
      method: 'POST',
      body: JSON.stringify({ texts: raw, source: currentBulkSource }),
    });

    if (data.success) {
      renderBulkResults(data.results);
      toast(`Analyzed ${data.count} items!`, 'success');
    } else {
      toast(data.error || 'Bulk analysis failed.', 'error');
    }
  } catch {
    toast('Network error.', 'error');
  } finally {
    btn.disabled = false;
    setLoading(false);
  }
}

function renderBulkResults(results) {
  const container = $('#bulkResults');
  container.innerHTML = '';
  results.forEach((r) => {
    container.innerHTML += `
      <div class="bulk-item">
        <div class="bulk-item__text">${escapeHTML(r.text)}</div>
        <span class="bulk-item__badge ${r.label}">${r.label} ${r.confidence}%</span>
      </div>`;
  });
}

// ── Dashboard ──
async function loadDashboard() {
  try {
    const data = await fetchJSON(API.stats);
    if (!data.success) return;
    const s = data.stats;

    $('#statTotal').textContent = s.total;
    $('#statPos').textContent = s.counts.positive;
    $('#statNeg').textContent = s.counts.negative;
    $('#statNeu').textContent = s.counts.neutral;
    $('#statConf').textContent = s.avg_confidence ? `${s.avg_confidence}%` : '—';

    renderDonut(s);
    renderBarChart(s);
  } catch (e) {
    toast('Could not load dashboard stats.', 'error');
  }
}

function renderDonut(s) {
  const total = s.total;
  if (!total) {
    $('#donutCenter').textContent = '—';
    return;
  }

  const segments = [
    { label: 'positive', count: s.counts.positive, color: '#00e5a0' },
    { label: 'negative', count: s.counts.negative, color: '#ff4d6d' },
    { label: 'neutral', count: s.counts.neutral, color: '#4d8eff' },
  ];

  const cx = 100, cy = 100, r = 72, strokeW = 22;
  const circumference = 2 * Math.PI * r;
  let svg = '';
  let offset = 0;

  segments.forEach(({ count, color }) => {
    const ratio = total > 0 ? count / total : 0;
    const dash = ratio * circumference;
    const gap = circumference - dash;
    svg += `<circle
      cx="${cx}" cy="${cy}" r="${r}"
      fill="none" stroke="${color}" stroke-width="${strokeW}"
      stroke-dasharray="${dash} ${gap}"
      stroke-dashoffset="${-offset}"
    />`;
    offset += dash;
  });

  $('#donutSvg').innerHTML = svg;

  // Find dominant
  const dominant = segments.reduce((a, b) => (a.count > b.count ? a : b));
  const pct = total > 0 ? Math.round((dominant.count / total) * 100) : 0;
  $('#donutCenter').textContent = `${pct}%`;

  // Legend
  const legend = $('#donutLegend');
  legend.innerHTML = segments
    .map(
      ({ label, count, color }) => `
      <div class="legend-item">
        <span class="legend-dot" style="background:${color}"></span>
        <span class="legend-label">${label}</span>
        <span class="legend-pct">${total > 0 ? Math.round((count / total) * 100) : 0}%</span>
      </div>`
    )
    .join('');
}

function renderBarChart(s) {
  const total = s.total || 1;
  const bars = [
    { label: 'Positive', count: s.counts.positive, cls: 'positive', pct: s.percentages?.positive ?? 0 },
    { label: 'Negative', count: s.counts.negative, cls: 'negative', pct: s.percentages?.negative ?? 0 },
    { label: 'Neutral', count: s.counts.neutral, cls: 'neutral', pct: s.percentages?.neutral ?? 0 },
  ];

  const chart = $('#barChart');
  chart.innerHTML = bars
    .map(
      ({ label, count, cls, pct }) => `
      <div class="bar-row">
        <div class="bar-row__label">
          <span>${label}</span><span>${count} entries</span>
        </div>
        <div class="bar-row__track">
          <div class="bar-row__fill ${cls}" style="width:${pct}%">
            ${pct > 8 ? `${pct}%` : ''}
          </div>
        </div>
      </div>`
    )
    .join('');
}

// ── History ──
async function loadHistory() {
  try {
    const data = await fetchJSON(API.history);
    if (data.success) {
      allHistory = data.analyses;
      renderHistory(allHistory);
    }
  } catch {
    toast('Could not load history.', 'error');
  }
}

function renderHistory(items) {
  const list = $('#historyList');
  if (!items.length) {
    list.innerHTML = `
      <div class="result-placeholder">
        <div class="placeholder-icon">◎</div>
        <p>No analyses found.</p>
      </div>`;
    return;
  }

  list.innerHTML = items
    .map(
      (item) => `
      <div class="history-item">
        <div>
          <div class="history-item__text">${escapeHTML(item.text)}</div>
          <div class="history-item__meta">
            <span>Source: ${item.source || 'manual'}</span>
            <span>${item.created_at ? new Date(item.created_at).toLocaleString() : ''}</span>
          </div>
        </div>
        <div class="history-item__right">
          <span class="history-badge ${item.label}">${item.label}</span>
          <span class="history-conf">${item.confidence}% confident</span>
        </div>
      </div>`
    )
    .join('');
}

function initHistoryFilters() {
  const search = $('#historySearch');
  const filter = $('#historyFilter');

  function applyFilters() {
    const query = search.value.toLowerCase();
    const label = filter.value;
    const filtered = allHistory.filter((item) => {
      const matchText = item.text.toLowerCase().includes(query);
      const matchLabel = !label || item.label === label;
      return matchText && matchLabel;
    });
    renderHistory(filtered);
  }

  search.addEventListener('input', applyFilters);
  filter.addEventListener('change', applyFilters);
}

// ── Reset ──
async function resetData() {
  if (!confirm('Delete all analyses? This cannot be undone.')) return;
  try {
    const data = await fetchJSON(API.reset, { method: 'POST' });
    if (data.success) {
      toast('All data cleared.', 'success');
      allHistory = [];
      loadDashboard();
    }
  } catch {
    toast('Reset failed.', 'error');
  }
}

// ── Utils ──
function escapeHTML(str) {
  return str.replace(/[&<>"']/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
}

// ── Init ──
document.addEventListener('DOMContentLoaded', () => {
  initTabs();
  initPills();
  initCharCounter();
  initHistoryFilters();

  $('#analyzeBtn').addEventListener('click', analyzeSingle);
  $('#analyzeText').addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.key === 'Enter') analyzeSingle();
  });

  $('#bulkBtn').addEventListener('click', analyzeBulk);
  $('#refreshStats').addEventListener('click', loadDashboard);
  $('#resetBtn').addEventListener('click', resetData);

  checkStatus();
});
