import { getAll, getOne } from './db/db.js';
import { listItems } from './db/items.js';
import { listOutfits } from './db/outfits.js';
import { listLogs } from './db/logs.js';
import { getSettings } from './db/settings.js';
import { buildWearIndex } from './utils/stats.js';

const state = {
  ready: false,
  items: [],
  outfits: [],
  logs: [],
  settings: { categories: [], colors: [], lastBackupAt: null },
  photoUrls: new Map(),
  filters: { keyword: '', category: '', seasons: [], occasions: [], favoriteOnly: false },
  sort: 'recent',
};

const listeners = new Set();

export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function notify() {
  for (const fn of listeners) fn(state);
}

export function getState() {
  return state;
}

export function setFilters(patch) {
  Object.assign(state.filters, patch);
}

export function setSort(mode) {
  state.sort = mode;
}

export function itemById(id) {
  return state.items.find(item => item.id === id) ?? null;
}

export function outfitById(id) {
  return state.outfits.find(outfit => outfit.id === id) ?? null;
}

export function logByDate(date) {
  return state.logs.find(log => log.date === date) ?? null;
}

export function photoUrl(photoId) {
  if (!photoId) return null;
  return state.photoUrls.get(photoId) ?? null;
}

export function wearIndex() {
  return buildWearIndex(state.logs);
}

function revokePhotoUrls() {
  for (const url of state.photoUrls.values()) URL.revokeObjectURL(url);
  state.photoUrls.clear();
}

export async function loadAll() {
  const [items, outfits, logs, settings, photos] = await Promise.all([
    listItems(), listOutfits(), listLogs(), getSettings(), getAll('photos'),
  ]);
  revokePhotoUrls();
  state.items = items;
  state.outfits = outfits;
  state.logs = logs;
  state.settings = settings;
  for (const photo of photos) {
    state.photoUrls.set(photo.id, URL.createObjectURL(photo.thumb));
  }
  state.ready = true;
  notify();
}

export async function getFullPhoto(photoId) {
  return getOne('photos', photoId);
}
