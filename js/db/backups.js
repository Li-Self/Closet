import { getAll, runTransaction } from './db.js';
import { blobToDataUrl, dataUrlToBlob } from '../utils/image.js';
import { saveSetting } from './settings.js';

export const BACKUP_APP = 'wardrobe-pwa';
export const BACKUP_VERSION = 1;

export function validateBackup(payload) {
  const errors = [];
  if (!payload || typeof payload !== 'object') {
    return { ok: false, errors: ['备份文件内容为空或格式不正确'] };
  }
  if (payload.app !== BACKUP_APP) errors.push('不是本应用的备份文件');
  if (!Number.isInteger(payload.schemaVersion) || payload.schemaVersion < 1) errors.push('备份版本无效');
  else if (payload.schemaVersion > BACKUP_VERSION) errors.push('备份文件来自更高版本，请先更新应用');
  const data = payload.data;
  if (!data || typeof data !== 'object') {
    errors.push('缺少 data 数据');
  } else {
    for (const key of ['items', 'outfits', 'wearLogs', 'settings', 'photos']) {
      if (!Array.isArray(data[key])) errors.push(`缺少 ${key} 数组`);
    }
  }
  if (errors.length) return { ok: false, errors };
  for (const item of data.items) {
    if (!item?.id || typeof item.name !== 'string' || !item.name.trim()) {
      errors.push('存在无效的单品数据');
      break;
    }
  }
  for (const outfit of data.outfits) {
    if (!outfit?.id || typeof outfit.name !== 'string' || !outfit.name.trim() || !Array.isArray(outfit.itemIds)) {
      errors.push('存在无效的搭配数据');
      break;
    }
  }
  for (const log of data.wearLogs) {
    if (!log?.id || !/^\d{4}-\d{2}-\d{2}$/.test(log.date ?? '') || !Array.isArray(log.itemIds)) {
      errors.push('存在无效的穿着记录');
      break;
    }
  }
  for (const photo of data.photos) {
    if (!photo?.id || typeof photo.thumb !== 'string' || !photo.thumb.startsWith('data:image/')
      || typeof photo.full !== 'string' || !photo.full.startsWith('data:image/')) {
      errors.push('存在损坏的照片数据');
      break;
    }
  }
  return { ok: errors.length === 0, errors };
}

export async function buildBackup() {
  const [items, outfits, wearLogs, settings, photos] = await Promise.all([
    getAll('items'), getAll('outfits'), getAll('wearLogs'), getAll('settings'), getAll('photos'),
  ]);
  const photoPayload = [];
  for (const photo of photos) {
    photoPayload.push({
      id: photo.id,
      thumb: await blobToDataUrl(photo.thumb),
      full: await blobToDataUrl(photo.full),
      width: photo.width,
      height: photo.height,
      createdAt: photo.createdAt,
    });
  }
  return {
    app: BACKUP_APP,
    schemaVersion: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    data: { items, outfits, wearLogs, settings, photos: photoPayload },
  };
}

export async function exportBackupFile() {
  const payload = await buildBackup();
  const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `wardrobe-backup-${payload.exportedAt.slice(0, 10)}.json`;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  await saveSetting('lastBackupAt', payload.exportedAt);
  return payload;
}

export async function readBackupFile(file) {
  let payload;
  try {
    payload = JSON.parse(await file.text());
  } catch {
    throw new Error('文件不是有效的 JSON');
  }
  const result = validateBackup(payload);
  if (!result.ok) throw new Error(result.errors.join('；'));
  return payload;
}

export async function applyBackup(payload) {
  const photos = payload.data.photos.map(photo => ({
    ...photo,
    thumb: dataUrlToBlob(photo.thumb),
    full: dataUrlToBlob(photo.full),
  }));
  await runTransaction(['items', 'photos', 'outfits', 'wearLogs', 'settings'], 'readwrite', tx => {
    for (const name of ['items', 'photos', 'outfits', 'wearLogs', 'settings']) {
      tx.objectStore(name).clear();
    }
    for (const value of payload.data.items) tx.objectStore('items').put(value);
    for (const value of photos) tx.objectStore('photos').put(value);
    for (const value of payload.data.outfits) tx.objectStore('outfits').put(value);
    for (const value of payload.data.wearLogs) tx.objectStore('wearLogs').put(value);
    for (const value of payload.data.settings) tx.objectStore('settings').put(value);
  });
  return payload;
}

export async function importBackupFile(file) {
  return applyBackup(await readBackupFile(file));
}
