import { getAll, getOne, putOne, requestPromise, runTransaction } from './db.js';
import { uuid } from '../utils/id.js';
import { validateItem, hasErrors } from '../utils/validation.js';

const nowISO = () => new Date().toISOString();

export async function listItems() {
  const items = await getAll('items');
  return items.sort((a, b) => (b.code ?? 0) - (a.code ?? 0));
}

export async function getItem(id) {
  return getOne('items', id);
}

export async function saveItem(input) {
  const errors = validateItem(input);
  if (hasErrors(errors)) {
    const error = new Error('表单校验失败');
    error.errors = errors;
    throw error;
  }
  const now = nowISO();
  const existing = input.id ? await getItem(input.id) : null;
  let code = existing?.code;
  if (!code) {
    const all = await getAll('items');
    code = all.reduce((max, item) => Math.max(max, item.code ?? 0), 0) + 1;
  }
  const item = {
    id: existing?.id ?? uuid(),
    code,
    name: input.name.trim(),
    category: input.category,
    color: input.color ?? '',
    seasons: [...(input.seasons ?? [])],
    occasions: [...(input.occasions ?? [])],
    brand: (input.brand ?? '').trim(),
    note: (input.note ?? '').trim(),
    photoId: input.photoId !== undefined ? input.photoId : (existing?.photoId ?? null),
    favorite: input.favorite !== undefined ? Boolean(input.favorite) : Boolean(existing?.favorite),
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };
  await putOne('items', item);
  return item;
}

export async function deleteItem(id) {
  await runTransaction(['items', 'photos', 'outfits'], 'readwrite', async tx => {
    const item = await requestPromise(tx.objectStore('items').get(id));
    if (!item) return;
    tx.objectStore('items').delete(id);
    if (item.photoId) tx.objectStore('photos').delete(item.photoId);
    const outfits = await requestPromise(tx.objectStore('outfits').getAll());
    for (const outfit of outfits) {
      if (!outfit.itemIds?.includes(id)) continue;
      outfit.itemIds = outfit.itemIds.filter(itemId => itemId !== id);
      outfit.updatedAt = nowISO();
      tx.objectStore('outfits').put(outfit);
    }
  });
}
