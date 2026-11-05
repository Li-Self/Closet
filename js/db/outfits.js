import { getAll, getOne, putOne, deleteOne, requestPromise, runTransaction } from './db.js';
import { uuid } from '../utils/id.js';
import { validateOutfit, hasErrors } from '../utils/validation.js';

const nowISO = () => new Date().toISOString();

export async function listOutfits() {
  const outfits = await getAll('outfits');
  return outfits.sort((a, b) => (a.sortOrder ?? a.code ?? 0) - (b.sortOrder ?? b.code ?? 0));
}

export async function getOutfit(id) {
  return getOne('outfits', id);
}

export async function saveOutfit(input) {
  const errors = validateOutfit(input);
  if (hasErrors(errors)) {
    const error = new Error('表单校验失败');
    error.errors = errors;
    throw error;
  }
  const now = nowISO();
  const existing = input.id ? await getOutfit(input.id) : null;
  const all = await getAll('outfits');
  let code = existing?.code;
  if (!code) {
    code = all.reduce((max, outfit) => Math.max(max, outfit.code ?? 0), 0) + 1;
  }
  let sortOrder = existing?.sortOrder;
  if (!Number.isFinite(sortOrder)) {
    sortOrder = all.reduce((max, outfit) => Math.max(max, outfit.sortOrder ?? 0), 0) + 1;
  }
  const outfit = {
    id: existing?.id ?? uuid(),
    code,
    sortOrder,
    name: input.name.trim(),
    itemIds: [...new Set(input.itemIds)],
    seasons: [...(input.seasons ?? [])],
    occasions: [...(input.occasions ?? [])],
    note: (input.note ?? '').trim(),
    favorite: input.favorite !== undefined ? Boolean(input.favorite) : Boolean(existing?.favorite),
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };
  await putOne('outfits', outfit);
  return outfit;
}

export async function reorderOutfits(orderedIds) {
  await runTransaction(['outfits'], 'readwrite', async tx => {
    const store = tx.objectStore('outfits');
    for (let index = 0; index < orderedIds.length; index += 1) {
      const outfit = await requestPromise(store.get(orderedIds[index]));
      if (!outfit) continue;
      outfit.sortOrder = index;
      outfit.updatedAt = nowISO();
      store.put(outfit);
    }
  });
}

export async function deleteOutfit(id) {
  return deleteOne('outfits', id);
}
