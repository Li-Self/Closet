import test from 'node:test';
import assert from 'node:assert/strict';
import { validateBackup, BACKUP_APP, BACKUP_VERSION } from '../js/db/backups.js';

function validPayload() {
  return {
    app: BACKUP_APP,
    schemaVersion: BACKUP_VERSION,
    exportedAt: '2026-11-03T10:00:00.000Z',
    data: { items: [], outfits: [], wearLogs: [], settings: [], photos: [] },
  };
}

test('有效备份通过校验', () => {
  assert.deepEqual(validateBackup(validPayload()), { ok: true, errors: [] });
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
