import { getAll, getOne, putOne, deleteOne } from './db.js';
import { uuid } from '../utils/id.js';
import { validateOutfit, hasErrors } from '../utils/validation.js';

const nowISO = () => new Date().toISOString();

export async function listOutfits() {
  const outfits = await getAll('outfits');
  return outfits.sort((a, b) => (b.code ?? 0) - (a.code ?? 0));
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
  let code = existing?.code;
  if (!code) {
    const all = await getAll('outfits');
    code = all.reduce((max, outfit) => Math.max(max, outfit.code ?? 0), 0) + 1;
  }
  const outfit = {
    id: existing?.id ?? uuid(),
    code,
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

export async function deleteOutfit(id) {
  return deleteOne('outfits', id);
}
