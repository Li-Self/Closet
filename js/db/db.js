const DB_NAME = 'wardrobe-db';
const DB_VERSION = 1;
let dbPromise = null;

export function openDB() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains('items')) {
        const store = db.createObjectStore('items', { keyPath: 'id' });
        store.createIndex('category', 'category');
        store.createIndex('favorite', 'favorite');
        store.createIndex('createdAt', 'createdAt');
        store.createIndex('updatedAt', 'updatedAt');
      }
      if (!db.objectStoreNames.contains('photos')) {
        db.createObjectStore('photos', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('outfits')) {
        const store = db.createObjectStore('outfits', { keyPath: 'id' });
        store.createIndex('favorite', 'favorite');
        store.createIndex('createdAt', 'createdAt');
      }
      if (!db.objectStoreNames.contains('wearLogs')) {
        const store = db.createObjectStore('wearLogs', { keyPath: 'id' });
        store.createIndex('date', 'date', { unique: true });
        store.createIndex('createdAt', 'createdAt');
      }
      if (!db.objectStoreNames.contains('settings')) {
        db.createObjectStore('settings', { keyPath: 'key' });
      }
    };
    request.onsuccess = () => {
      const db = request.result;
      db.onversionchange = () => db.close();
      resolve(db);
    };
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error('数据库被其他页面占用，请关闭其他标签页后重试'));
  });
  return dbPromise;
}

export function requestPromise(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function runTransaction(storeNames, mode, fn) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeNames, mode);
    let result;
    let settled = false;
    tx.oncomplete = () => { settled = true; resolve(result); };
    tx.onerror = () => { if (!settled) { settled = true; reject(tx.error); } };
    tx.onabort = () => { if (!settled) { settled = true; reject(tx.error ?? new Error('事务已回滚')); } };
    Promise.resolve(fn(tx)).then(value => { result = value; }).catch(error => {
      try { tx.abort(); } catch {}
      if (!settled) { settled = true; reject(error); }
    });
  });
}

export async function getAll(storeName) {
  const db = await openDB();
  return requestPromise(db.transaction(storeName, 'readonly').objectStore(storeName).getAll());
}

export async function getOne(storeName, key) {
  const db = await openDB();
  return requestPromise(db.transaction(storeName, 'readonly').objectStore(storeName).get(key));
}

export async function putOne(storeName, value) {
  return runTransaction([storeName], 'readwrite', tx => requestPromise(tx.objectStore(storeName).put(value)));
}

export async function deleteOne(storeName, key) {
  return runTransaction([storeName], 'readwrite', tx => requestPromise(tx.objectStore(storeName).delete(key)));
}

export async function clearStore(storeName) {
  return runTransaction([storeName], 'readwrite', tx => requestPromise(tx.objectStore(storeName).clear()));
}

export function closeDB() {
  if (dbPromise) {
    dbPromise.then(db => db.close()).catch(() => {});
    dbPromise = null;
  }
}
