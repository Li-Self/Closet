import test from 'node:test';
import assert from 'node:assert/strict';
import { computeTargetSize } from '../js/utils/image.js';

test('图片按最长边缩放，不放大', () => {
  assert.deepEqual(computeTargetSize(2000, 1000, 1200), { width: 1200, height: 600 });
  assert.deepEqual(computeTargetSize(1000, 2000, 400), { width: 200, height: 400 });
  assert.deepEqual(computeTargetSize(800, 600, 1200), { width: 800, height: 600 });
});

test('无效尺寸返回 0', () => {
  assert.deepEqual(computeTargetSize(0, 0, 400), { width: 0, height: 0 });
});
