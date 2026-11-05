import { daysBetween, toDateKey, nowKey } from './dates.js';

export function buildWearIndex(logs) {
  const counts = new Map();
  const lastWorn = new Map();
  for (const log of logs) {
    for (const id of log.itemIds ?? []) {
      counts.set(id, (counts.get(id) ?? 0) + 1);
      const prev = lastWorn.get(id);
      if (!prev || log.date > prev) lastWorn.set(id, log.date);
    }
  }
  return { counts, lastWorn };
}

export function itemWearStats(itemId, logs, today = nowKey()) {
  const { counts, lastWorn } = buildWearIndex(logs);
  const wearCount = counts.get(itemId) ?? 0;
  const last = lastWorn.get(itemId) ?? null;
  return {
    wearCount,
    lastWorn: last,
    daysSinceLastWorn: last ? daysBetween(last, today) : null,
  };
}

export function isIdle(item, logs, today = nowKey(), threshold = 90) {
  const createdKey = toDateKey(new Date(item.createdAt));
  if (daysBetween(createdKey, today) <= threshold) return false;
  const { lastWorn } = buildWearIndex(logs);
  const last = lastWorn.get(item.id);
  if (!last) return true;
  return daysBetween(last, today) > threshold;
}

export function countIdle(items, logs, today = nowKey(), threshold = 90) {
  return items.filter(item => isIdle(item, logs, today, threshold)).length;
}

export function monthlyStats(logs, year, monthIndex) {
  const prefix = `${year}-${String(monthIndex + 1).padStart(2, '0')}-`;
  const monthLogs = logs.filter(log => log.date.startsWith(prefix));
  const counts = new Map();
  const names = new Map();
  for (const log of monthLogs) {
    (log.itemIds ?? []).forEach((id, index) => {
      counts.set(id, (counts.get(id) ?? 0) + 1);
      if (!names.has(id)) names.set(id, log.itemNames?.[index] ?? '未知单品');
    });
  }
  let mostWorn = null;
  for (const [id, count] of counts) {
    if (!mostWorn || count > mostWorn.count) {
      mostWorn = { id, name: names.get(id), count };
    }
  }
  return { days: monthLogs.length, mostWorn };
}
