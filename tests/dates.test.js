import test from 'node:test';
import assert from 'node:assert/strict';
import {
  toDateKey, parseDateKey, addDays, daysBetween, weekdayIndex,
  weekdayLabel, monthGrid, monthLabel, formatDateLabel,
} from '../js/utils/dates.js';

test('toDateKey 使用本地日期', () => {
  assert.equal(toDateKey(new Date(2026, 10, 3)), '2026-11-03');
  assert.equal(toDateKey(new Date(2026, 0, 9)), '2026-01-09');
});

test('parseDateKey 与 toDateKey 往返一致', () => {
  assert.equal(toDateKey(parseDateKey('2026-11-03')), '2026-11-03');
});

test('addDays 跨月与跨年', () => {
  assert.equal(addDays('2026-11-30', 1), '2026-12-01');
  assert.equal(addDays('2026-12-31', 1), '2027-01-01');
  assert.equal(addDays('2026-03-01', -1), '2026-02-28');
});

test('daysBetween 返回整日差', () => {
  assert.equal(daysBetween('2026-11-01', '2026-11-03'), 2);
  assert.equal(daysBetween('2026-11-03', '2026-11-01'), -2);
  assert.equal(daysBetween('2026-11-03', '2026-11-03'), 0);
});

test('周一为一周起始', () => {
  assert.equal(weekdayIndex('2026-11-02'), 0);
  assert.equal(weekdayIndex('2026-11-03'), 1);
  assert.equal(weekdayIndex('2026-11-08'), 6);
  assert.equal(weekdayLabel('2026-11-03'), '周二');
});

test('monthGrid 生成 42 个单元格', () => {
  const cells = monthGrid(2026, 10);
  assert.equal(cells.length, 42);
  assert.equal(cells[0].key, '2026-10-26');
  assert.equal(cells.at(-1).key, '2026-12-06');
  assert.equal(cells.filter(cell => cell.inMonth).length, 30);
});

test('月份与日期标签', () => {
  assert.equal(monthLabel(2026, 10), '2026 年 11 月');
  assert.equal(formatDateLabel('2026-11-03'), '11 月 3 日');
});
