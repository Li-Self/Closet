import { getAll, getOne, openDB, putOne, deleteOne, requestPromise } from './db.js';
import { uuid } from '../utils/id.js';
import { validateLog, hasErrors } from '../utils/validation.js';

const nowISO = () => new Date().toISOString();

export async function listLogs() {
  const logs = await getAll('wearLogs');
  return logs.sort((a, b) => b.date.localeCompare(a.date));
}

export async function getLogByDate(date) {
  const db = await openDB();
  return requestPromise(
    db.transaction('wearLogs', 'readonly').objectStore('wearLogs').index('date').get(date)
  );
}

export async function getLog(id) {
  return getOne('wearLogs', id);
}

export async function saveLog(input) {
  const items = Array.isArray(input.items) ? input.items : [];
  const payload = {
    date: input.date,
    itemIds: items.map(item => item.id),
    note: input.note ?? '',
  };
  const errors = validateLog(payload);
  if (hasErrors(errors)) {
    const error = new Error('表单校验失败');
    error.errors = errors;
    throw error;
  }
  const existingByDate = await getLogByDate(input.date);
  if (existingByDate && existingByDate.id !== input.id) {
    const error = new Error('这一天已经有记录');
    error.code = 'DUPLICATE_DATE';
    throw error;
  }
  const existing = input.id ? await getLog(input.id) : existingByDate;
  const now = nowISO();
  const log = {
    id: existing?.id ?? uuid(),
    date: input.date,
    outfitId: input.outfitId ?? null,
    outfitName: input.outfitName ?? '',
    itemIds: payload.itemIds,
    itemNames: items.map(item => item.name),
    note: (input.note ?? '').trim(),
    weather: input.weather ?? '',
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };
  await putOne('wearLogs', log);
  return log;
}

export async function deleteLog(id) {
  return deleteOne('wearLogs', id);
}
