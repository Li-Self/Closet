import test from 'node:test';
import assert from 'node:assert/strict';
import { validateItem, validateOutfit, validateLog, hasErrors } from '../js/utils/validation.js';

test('单品：名称必填且长度受限', () => {
  assert.equal(hasErrors(validateItem({ name: '', category: '上装' })), true);
  assert.equal(hasErrors(validateItem({ name: '   ', category: '上装' })), true);
  assert.equal(hasErrors(validateItem({ name: '风衣', category: '外套' })), false);
  assert.equal(hasErrors(validateItem({ name: 'a'.repeat(61), category: '外套' })), true);
  assert.equal(hasErrors(validateItem({ name: '风衣', category: '' })), true);
});

test('搭配：至少一件单品', () => {
  assert.equal(hasErrors(validateOutfit({ name: '周末', itemIds: [] })), true);
  assert.equal(hasErrors(validateOutfit({ name: '周末', itemIds: ['a'] })), false);
});

test('记录：日期格式与单品必选', () => {
  assert.equal(hasErrors(validateLog({ date: '2026/11/03', itemIds: ['a'] })), true);
  assert.equal(hasErrors(validateLog({ date: '2026-11-03', itemIds: [] })), true);
  assert.equal(hasErrors(validateLog({ date: '2026-11-03', itemIds: ['a'] })), false);
});
