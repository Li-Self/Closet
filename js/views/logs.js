import { getState, subscribe, logByDate, itemById, photoUrl } from '../store.js';
import { monthGrid, monthLabel, formatDateLabel, weekdayLabel, nowKey, WEEKDAY_LABELS } from '../utils/dates.js';
import { monthlyStats, countIdle } from '../utils/stats.js';
import { escapeHtml } from '../utils/dom.js';
import { openLogSheet } from '../components/log-sheet.js';

let unsubscribe = null;
let viewYear = new Date().getFullYear();
let viewMonth = new Date().getMonth();
let selectedDate = nowKey();

export function renderLogs() {
  unsubscribe?.();
  unsubscribe = subscribe(() => paint());
  paint();
  return () => {
    unsubscribe?.();
    unsubscribe = null;
  };
}

function paint() {
  const app = document.getElementById('app');
  const state = getState();
  const cells = monthGrid(viewYear, viewMonth);
  const logDates = new Set(state.logs.map(log => log.date));
  const stats = monthlyStats(state.logs, viewYear, viewMonth);
  const idle = countIdle(state.items, state.logs, nowKey());
  const selectedLog = logByDate(selectedDate);
  app.innerHTML = `
    <div class="page">
      <header class="page-header">
        <div>
          <div class="page-subtitle">Wear Diary</div>
          <h1 class="page-title">穿着记录</h1>
        </div>
        <button class="icon-button" id="today-button" aria-label="回到今天">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><rect x="4" y="5" width="16" height="15" rx="2"/><path d="M8 3v4M16 3v4M4 10h16"/></svg>
        </button>
      </header>
      <div class="month-nav">
        <button class="icon-button" id="prev-month" aria-label="上个月">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M15 5l-7 7 7 7"/></svg>
        </button>
        <strong style="font-family:var(--font-mono);font-size:13px">${monthLabel(viewYear, viewMonth)}</strong>
        <button class="icon-button" id="next-month" aria-label="下个月">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M9 5l7 7-7 7"/></svg>
        </button>
      </div>
      <div class="calendar-week">${WEEKDAY_LABELS.map(label => `<span>${label}</span>`).join('')}</div>
      <div class="calendar" id="calendar">
        ${cells.map(cell => `
          <button type="button" class="calendar-day${cell.inMonth ? '' : ' dim'}${cell.key === selectedDate ? ' selected' : ''}" data-date="${cell.key}" aria-label="${formatDateLabel(cell.key)}">
            ${cell.day}${logDates.has(cell.key) ? '<span class="dot"></span>' : ''}
          </button>
        `).join('')}
      </div>
      <div class="summary-row">
        <span class="summary-pill">本月记录 ${stats.days} 天</span>
        ${stats.mostWorn ? `<span class="summary-pill">最常穿 ${escapeHtml(stats.mostWorn.name)} ×${stats.mostWorn.count}</span>` : ''}
        <span class="summary-pill">闲置 ${idle} 件</span>
      </div>
      <section>
        <div class="page-header" style="margin-bottom:8px">
          <h2 class="page-title" style="font-size:18px">${formatDateLabel(selectedDate)} · ${weekdayLabel(selectedDate)}</h2>
          <button class="ghost-button" id="add-log" style="width:auto;padding:0 12px;font-size:12px">＋ 记录</button>
        </div>
        <div id="day-log"></div>
      </section>
    </div>
  `;

  document.getElementById('prev-month').addEventListener('click', () => {
    viewMonth -= 1;
    if (viewMonth < 0) { viewMonth = 11; viewYear -= 1; }
    selectFirstOfMonth();
    paint();
  });
  document.getElementById('next-month').addEventListener('click', () => {
    viewMonth += 1;
    if (viewMonth > 11) { viewMonth = 0; viewYear += 1; }
    selectFirstOfMonth();
    paint();
  });
  document.getElementById('today-button').addEventListener('click', () => {
    const today = new Date();
    viewYear = today.getFullYear();
    viewMonth = today.getMonth();
    selectedDate = nowKey();
    paint();
  });
  document.getElementById('calendar').addEventListener('click', event => {
    const button = event.target.closest('[data-date]');
    if (!button) return;
    selectedDate = button.dataset.date;
    if (!button.classList.contains('dim')) {
      const [year, month] = selectedDate.split('-').map(Number);
      viewYear = year;
      viewMonth = month - 1;
    }
    paint();
  });
  document.getElementById('add-log').addEventListener('click', () => openLogSheet({ date: selectedDate }));

  const dayLog = document.getElementById('day-log');
  if (!selectedLog) {
    const hint = document.createElement('div');
    hint.className = 'empty-inline';
    hint.textContent = '这一天还没有记录。';
    dayLog.append(hint);
    return;
  }
  const card = document.createElement('button');
  card.type = 'button';
  card.className = 'log-card';
  card.style.width = '100%';
  card.style.textAlign = 'left';
  const thumbs = (selectedLog.itemIds ?? []).slice(0, 5).map(id => {
    const url = photoUrl(itemById(id)?.photoId);
    return `<div>${url ? `<img src="${url}" alt="">` : ''}</div>`;
  }).join('');
  card.innerHTML = `
    <div class="log-card-thumbs">${thumbs}</div>
    <h3>${escapeHtml(selectedLog.outfitName || (selectedLog.itemNames ?? []).join(' · ') || '穿着记录')}</h3>
    ${selectedLog.note ? `<p>${escapeHtml(selectedLog.note)}</p>` : ''}
    ${selectedLog.weather ? `<span class="weather-tag">${escapeHtml(selectedLog.weather)}</span>` : ''}
  `;
  card.addEventListener('click', () => openLogSheet({ date: selectedDate }));
  dayLog.append(card);
}

function selectFirstOfMonth() {
  selectedDate = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-01`;
}
