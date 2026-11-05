import test from 'node:test';
import assert from 'node:assert/strict';
import { filterItems, sortItems } from '../js/utils/filters.js';

const items = [
  { id: '1', name: '米色开衫', category: '上装', color: '米', seasons: ['spring', 'autumn'], occasions: ['daily'], favorite: true, createdAt: '2026-10-01T00:00:00.000Z' },
  { id: '2', name: '橄榄绿长裙', category: '下装', color: '绿', seasons: ['summer'], occasions: ['date'], favorite: false, createdAt: '2026-10-02T00:00:00.000Z' },
  { id: '3', name: '燕麦风衣', category: '外套', color: '米', seasons: ['autumn', 'winter'], occasions: ['work'], favorite: false, createdAt: '2026-10-03T00:00:00.000Z' },
];

test('关键词同时匹配名称、颜色与分类', () => {
  assert.deepEqual(filterItems(items, { keyword: '米' }).map(i => i.id), ['1', '3']);
  assert.deepEqual(filterItems(items, { keyword: '长裙' }).map(i => i.id), ['2']);
});

test('分类、季节、场合与收藏组合筛选', () => {
  assert.deepEqual(filterItems(items, { category: '外套' }).map(i => i.id), ['3']);
  assert.deepEqual(filterItems(items, { seasons: ['winter'] }).map(i => i.id), ['3']);
  assert.deepEqual(filterItems(items, { occasions: ['daily', 'date'] }).map(i => i.id), ['1', '2']);
  assert.deepEqual(filterItems(items, { favoriteOnly: true }).map(i => i.id), ['1']);
});

test('排序：最近添加、最常穿、最久未穿', () => {
  assert.deepEqual(sortItems(items, 'recent').map(i => i.id), ['3', '2', '1']);
  const counts = new Map([['1', 5], ['2', 2], ['3', 9]]);
  assert.deepEqual(sortItems(items, 'mostWorn', { counts }).map(i => i.id), ['3', '1', '2']);
  const lastWorn = new Map([['1', '2026-11-01'], ['3', '2026-10-01']]);
  assert.deepEqual(sortItems(items, 'leastWorn', { lastWorn }).map(i => i.id), ['2', '3', '1']);
});
