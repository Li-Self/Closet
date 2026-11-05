import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildWearIndex, itemWearStats, isIdle, countIdle, monthlyStats,
} from '../js/utils/stats.js';

const logs = [
  { date: '2026-10-28', itemIds: ['a', 'b'], itemNames: ['风衣', '开衫'] },
  { date: '2026-11-01', itemIds: ['a'], itemNames: ['风衣'] },
  { date: '2026-11-03', itemIds: ['a', 'c'], itemNames: ['风衣', '长裙'] },
];

test('buildWearIndex 统计次数与最近日期', () => {
  const { counts, lastWorn } = buildWearIndex(logs);
  assert.equal(counts.get('a'), 3);
  assert.equal(counts.get('b'), 1);
  assert.equal(lastWorn.get('a'), '2026-11-03');
  assert.equal(lastWorn.get('b'), '2026-10-28');
  assert.equal(lastWorn.get('c'), '2026-11-03');
});

test('itemWearStats 返回穿着次数与最近穿着', () => {
  assert.deepEqual(itemWearStats('a', logs, '2026-11-08'), {
    wearCount: 3,
    lastWorn: '2026-11-03',
    daysSinceLastWorn: 5,
  });
  assert.deepEqual(itemWearStats('z', logs, '2026-11-08'), {
    wearCount: 0,
    lastWorn: null,
    daysSinceLastWorn: null,
  });
});

test('闲置判断：超过 90 天且长期未穿', () => {
  const oldItem = { id: 'old', createdAt: '2026-01-01T00:00:00.000Z' };
  assert.equal(isIdle(oldItem, [], '2026-11-03'), true);
  const wornItem = { id: 'a', createdAt: '2026-01-01T00:00:00.000Z' };
  assert.equal(isIdle(wornItem, logs, '2026-11-03'), false);
  const recentItem = { id: 'recent', createdAt: '2026-10-01T00:00:00.000Z' };
  assert.equal(isIdle(recentItem, [], '2026-11-03'), false);
  assert.equal(countIdle([oldItem, recentItem], [], '2026-11-03'), 1);
});

test('月度统计返回天数与最常穿', () => {
  const result = monthlyStats(logs, 2026, 10);
  assert.equal(result.days, 2);
  assert.deepEqual(result.mostWorn, { id: 'a', name: '风衣', count: 2 });
});
