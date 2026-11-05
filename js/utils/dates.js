const DAY_MS = 86400000;
export const WEEKDAY_LABELS = ['一', '二', '三', '四', '五', '六', '日'];

export function pad2(n) { return String(n).padStart(2, '0'); }

export function toDateKey(date = new Date()) {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

export function parseDateKey(key) {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(key, days) {
  const date = parseDateKey(key);
  date.setDate(date.getDate() + days);
  return toDateKey(date);
}

export function daysBetween(fromKey, toKey) {
  const from = parseDateKey(fromKey);
  const to = parseDateKey(toKey);
  const a = Date.UTC(from.getFullYear(), from.getMonth(), from.getDate());
  const b = Date.UTC(to.getFullYear(), to.getMonth(), to.getDate());
  return Math.round((b - a) / DAY_MS);
}

export function weekdayIndex(key) {
  return (parseDateKey(key).getDay() + 6) % 7;
}

export function weekdayLabel(key) {
  return `周${WEEKDAY_LABELS[weekdayIndex(key)]}`;
}

export function monthGrid(year, monthIndex) {
  const first = new Date(year, monthIndex, 1);
  const offset = (first.getDay() + 6) % 7;
  const start = new Date(year, monthIndex, 1 - offset);
  const cells = [];
  for (let i = 0; i < 42; i += 1) {
    const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
    cells.push({
      key: toDateKey(d),
      day: d.getDate(),
      inMonth: d.getMonth() === monthIndex && d.getFullYear() === year,
    });
  }
  return cells;
}

export function monthLabel(year, monthIndex) {
  return `${year} 年 ${monthIndex + 1} 月`;
}

export function formatDateLabel(key) {
  const d = parseDateKey(key);
  return `${d.getMonth() + 1} 月 ${d.getDate()} 日`;
}

export function nowKey() {
  return toDateKey(new Date());
}
