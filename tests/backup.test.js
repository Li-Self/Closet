import test from 'node:test';
import assert from 'node:assert/strict';
import { validateBackup, normalizeBackup, BACKUP_APP, BACKUP_VERSION } from '../js/db/backups.js';

function validPayload() {
  return {
    app: BACKUP_APP,
    schemaVersion: BACKUP_VERSION,
    exportedAt: '2026-11-05T10:00:00.000Z',
    data: { items: [], outfits: [], wearLogs: [], settings: [], photos: [] },
  };
}

test('有效备份通过校验', () => {
  assert.deepEqual(validateBackup(validPayload()), { ok: true, errors: [] });
});

test('v2 多分类多颜色单品通过校验', () => {
  const payload = validPayload();
  payload.data.items = [{ id: 'i1', name: '风衣', categories: ['外套', '上衣'], colors: ['米', '白'], sortOrder: 1 }];
  assert.equal(validateBackup(payload).ok, true);
});

test('v1 旧备份可校验并迁移为数组', () => {
  const payload = validPayload();
  payload.schemaVersion = 1;
  payload.data.items = [{ id: 'i1', name: '风衣', category: '外套', color: '米', code: 3 }];
  assert.equal(validateBackup(payload).ok, true);
  const normalized = normalizeBackup(payload);
  assert.equal(normalized.schemaVersion, BACKUP_VERSION);
  assert.deepEqual(normalized.data.items[0].categories, ['外套']);
  assert.deepEqual(normalized.data.items[0].colors, ['米']);
  assert.equal(normalized.data.items[0].sortOrder, 3);
  assert.equal('category' in normalized.data.items[0], false);
  assert.equal('color' in normalized.data.items[0], false);
});

test('拒绝缺少分类的单品', () => {
  const payload = validPayload();
  payload.data.items = [{ id: 'i1', name: '风衣' }];
  assert.equal(validateBackup(payload).ok, false);
});

test('拒绝其他应用或更高版本', () => {
  const wrongApp = validPayload();
  wrongApp.app = 'other-app';
  assert.equal(validateBackup(wrongApp).ok, false);
  const future = validPayload();
  future.schemaVersion = 99;
  assert.equal(validateBackup(future).ok, false);
});

test('拒绝缺失数据数组', () => {
  const payload = validPayload();
  delete payload.data.photos;
  const result = validateBackup(payload);
  assert.equal(result.ok, false);
  assert.match(result.errors.join(' '), /photos/);
});

test('拒绝损坏的照片与记录', () => {
  const badPhoto = validPayload();
  badPhoto.data.photos = [{ id: 'p1', thumb: 'not-a-data-url', full: 'not-a-data-url' }];
  assert.equal(validateBackup(badPhoto).ok, false);
  const badLog = validPayload();
  badLog.data.wearLogs = [{ id: 'l1', date: '2026/11/03', itemIds: [] }];
  assert.equal(validateBackup(badLog).ok, false);
});
