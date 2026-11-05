import { getAll, putOne, requestPromise, runTransaction } from './db.js';

export const DEFAULT_CATEGORIES = ['上衣', '外套', '裤子', '裙子', '连衣裙', '套装', '鞋靴', '箱包', '配饰', '其他'];
export const DEFAULT_COLORS = ['黑', '白', '灰', '米', '棕', '红', '粉', '橙', '黄', '绿', '蓝', '紫', '花色'];
export const COLOR_HEX = {
  黑: '#2B2B2B', 白: '#FAF7F2', 灰: '#9A9A96', 米: '#D9C7A7', 棕: '#8B5E3C',
  红: '#B3402F', 粉: '#D9A0A6', 橙: '#C9773F', 黄: '#D9B44A', 绿: '#6B7B3C',
  蓝: '#4A6FA5', 紫: '#7B5E8C', 花色: '#C9A9A9',
};

const nowISO = () => new Date().toISOString();

export async function getSettings() {
  const rows = await getAll('settings');
  const map = Object.fromEntries(rows.map(row => [row.key, row.value]));
  return {
    categories: map.categories ?? DEFAULT_CATEGORIES,
    colors: map.colors ?? DEFAULT_COLORS,
    lastBackupAt: map.lastBackupAt ?? null,
    schemaVersion: map.schemaVersion ?? 2,
  };
}

export async function saveSetting(key, value) {
  await putOne('settings', { key, value });
}

export async function saveSettings(patch) {
  await runTransaction(['settings'], 'readwrite', tx => {
    for (const [key, value] of Object.entries(patch)) {
      tx.objectStore('settings').put({ key, value });
    }
  });
}

export async function renameCategory(oldName, newName) {
  if (!newName.trim() || oldName === newName) return;
  await runTransaction(['settings', 'items'], 'readwrite', async tx => {
    const items = await requestPromise(tx.objectStore('items').getAll());
    for (const item of items) {
      const categories = Array.isArray(item.categories)
        ? item.categories
        : (item.category ? [item.category] : []);
      if (!categories.includes(oldName)) continue;
      item.categories = [...new Set(categories.map(value => value === oldName ? newName : value))];
      delete item.category;
      item.updatedAt = nowISO();
      tx.objectStore('items').put(item);
    }
    const row = await requestPromise(tx.objectStore('settings').get('categories'));
    const list = row?.value ?? DEFAULT_CATEGORIES;
    tx.objectStore('settings').put({ key: 'categories', value: list.map(name => name === oldName ? newName : name) });
  });
}

export async function renameColor(oldName, newName) {
  if (!newName.trim() || oldName === newName) return;
  await runTransaction(['settings', 'items'], 'readwrite', async tx => {
    const items = await requestPromise(tx.objectStore('items').getAll());
    for (const item of items) {
      const colors = Array.isArray(item.colors)
        ? item.colors
        : (item.color ? [item.color] : []);
      if (!colors.includes(oldName)) continue;
      item.colors = [...new Set(colors.map(value => value === oldName ? newName : value))];
      delete item.color;
      item.updatedAt = nowISO();
      tx.objectStore('items').put(item);
    }
    const row = await requestPromise(tx.objectStore('settings').get('colors'));
    const list = row?.value ?? DEFAULT_COLORS;
    tx.objectStore('settings').put({ key: 'colors', value: list.map(name => name === oldName ? newName : name) });
  });
}
