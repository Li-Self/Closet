# 我的衣橱 PWA 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 构建一个数据完全本地、可离线、可添加到安卓主屏幕的个人衣橱 PWA，覆盖单品、搭配、穿着记录与备份。

**Architecture:** 纯静态单页应用，原生 ES Modules + IndexedDB，无框架、无构建、无第三方运行时依赖。视图按页面拆分，数据访问集中在 `js/db/`，内存状态集中在 `store.js`，哈希路由负责页面切换，Service Worker 提供离线缓存。

**Tech Stack:** HTML、CSS、原生 JavaScript（ES Modules）、IndexedDB、Service Worker、Web App Manifest、Node 内置测试运行器（仅开发期使用）。

**关于 Git：** 当前目录不是 Git 仓库，本轮不自动执行 `git init` 或提交。若需要版本管理，先征求用户同意后再初始化，并在每个任务结束时提交。

---

## 文件结构

| 路径 | 职责 |
| --- | --- |
| `index.html` | 应用外壳、CSP、挂载点 |
| `package.json` | `"type": "module"`、测试与开发服务器脚本，无依赖 |
| `css/tokens.css` | 设计令牌、重置、基础排版 |
| `css/app.css` | 布局、组件、页面样式 |
| `js/app.js` | 启动、路由注册、Service Worker 注册、全局错误处理 |
| `js/router.js` | 哈希路由 |
| `js/store.js` | 内存状态、订阅、照片 URL 缓存 |
| `js/db/db.js` | IndexedDB 打开与通用读写 |
| `js/db/photos.js` | 照片 Blob 读写 |
| `js/db/items.js` | 单品数据访问与删除级联 |
| `js/db/outfits.js` | 搭配数据访问 |
| `js/db/logs.js` | 穿着记录数据访问 |
| `js/db/settings.js` | 分类、颜色、设置与重命名 |
| `js/db/backups.js` | 导出、校验、导入 |
| `js/views/*.js` | 各页面渲染与事件 |
| `js/components/nav.js` | 底部导航 |
| `js/components/modal.js` | 底部抽屉与确认框 |
| `js/components/toast.js` | 轻提示 |
| `js/components/log-sheet.js` | 记录穿着表单 |
| `js/components/photo-input.js` | 拍照/相册选择与预览 |
| `js/components/empty-state.js` | 空状态 |
| `js/utils/dates.js` | 本地日期工具 |
| `js/utils/stats.js` | 穿着统计 |
| `js/utils/filters.js` | 筛选与排序 |
| `js/utils/validation.js` | 表单校验 |
| `js/utils/image.js` | 图片压缩与 DataURL 转换 |
| `js/utils/id.js` | UUID |
| `js/utils/dom.js` | DOM 与转义工具 |
| `sw.js` | 离线缓存 |
| `manifest.webmanifest` | PWA 元数据 |
| `icons/` | 图标 |
| `tests/*.test.js` | 纯逻辑测试 |
| `scripts/dev-server.mjs` | 本地静态服务器，无依赖 |
| `scripts/generate-icons.mjs` | 生成 PNG 图标，无依赖 |
| `README.md` | 使用与部署说明 |

---

## Task 0：项目骨架、开发服务器与设计令牌

**Files:**
- Create: `package.json`
- Create: `scripts/dev-server.mjs`
- Create: `index.html`
- Create: `css/tokens.css`
- Create: `css/app.css`
- Create: `js/utils/dom.js`

- [ ] **Step 1: 创建 `package.json`**

```json
{
  "name": "my-wardrobe-pwa",
  "private": true,
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "test": "node --test",
    "dev": "node scripts/dev-server.mjs",
    "icons": "node scripts/generate-icons.mjs"
  }
}
```

- [ ] **Step 2: 创建无依赖本地服务器 `scripts/dev-server.mjs`**

```js
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const port = Number(process.env.PORT || 5173);
const types = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.ico': 'image/x-icon',
};

createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://localhost');
    let pathname = decodeURIComponent(url.pathname);
    if (pathname === '/') pathname = '/index.html';
    const filePath = normalize(join(root, pathname));
    if (!filePath.startsWith(root)) {
      res.writeHead(403);
      res.end('Forbidden');
      return;
    }
    const data = await readFile(filePath);
    res.writeHead(200, {
      'Content-Type': types[extname(filePath).toLowerCase()] ?? 'application/octet-stream',
      'Cache-Control': 'no-store',
    });
    res.end(data);
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Not found');
  }
}).listen(port, () => console.log(`http://localhost:${port}`));
```

- [ ] **Step 3: 创建 `index.html`**

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <meta name="theme-color" content="#F5E6C8">
  <meta http-equiv="Content-Security-Policy" content="default-src 'self'; img-src 'self' blob: data:; style-src 'self' 'unsafe-inline'; script-src 'self'; connect-src 'none'; manifest-src 'self'; worker-src 'self'">
  <title>我的衣橱</title>
  <link rel="manifest" href="./manifest.webmanifest">
  <link rel="icon" href="./icons/icon.svg" type="image/svg+xml">
  <link rel="stylesheet" href="./css/tokens.css">
  <link rel="stylesheet" href="./css/app.css">
</head>
<body>
  <div id="app" class="app-shell" aria-live="polite"></div>
  <nav id="bottom-nav" class="bottom-nav" aria-label="主导航"></nav>
  <div id="modal-root"></div>
  <div id="toast-root" aria-live="polite"></div>
  <script type="module" src="./js/app.js"></script>
</body>
</html>
```

- [ ] **Step 4: 创建 `css/tokens.css`**

```css
:root {
  --paper: #F5E6C8;
  --paper-soft: #FBF3E2;
  --card: #FFFDF6;
  --ink: #3B2F26;
  --ink-soft: #7A6652;
  --line: #DCCDAF;
  --line-strong: #C9B08A;
  --rust: #8B5E3C;
  --rust-deep: #6F4529;
  --teal: #4A7B7C;
  --rose: #CFA79B;
  --sand: #EBD9B8;
  --danger: #A33A2A;
  --radius-sm: 4px;
  --radius-md: 6px;
  --radius-lg: 10px;
  --shadow-card: 0 1px 3px rgba(80, 60, 30, .15);
  --shadow-photo: 1px 3px 7px rgba(80, 60, 30, .18);
  --font-heading: "Noto Serif SC", "Songti SC", "STSong", Georgia, serif;
  --font-body: system-ui, -apple-system, "Noto Sans SC", "PingFang SC", "Microsoft YaHei", sans-serif;
  --font-mono: ui-monospace, "Cascadia Mono", "SFMono-Regular", Consolas, monospace;
  --nav-height: 58px;
  --content-max: 480px;
  --motion: 180ms ease-out;
}

* { box-sizing: border-box; margin: 0; padding: 0; }
html { -webkit-text-size-adjust: 100%; }
body {
  min-height: 100vh;
  background: var(--paper);
  color: var(--ink);
  font-family: var(--font-body);
  font-size: 16px;
  line-height: 1.55;
  background-image:
    repeating-linear-gradient(0deg, rgba(90, 70, 40, .035) 0 1px, transparent 1px 4px),
    radial-gradient(circle at 85% 4%, rgba(255, 190, 120, .18), transparent 42%);
  background-attachment: fixed;
}
button, input, textarea, select { font: inherit; color: inherit; }
button { cursor: pointer; }
a { color: var(--rust); }
img { max-width: 100%; display: block; }
:focus-visible { outline: 2px solid var(--teal); outline-offset: 2px; }
.sr-only {
  position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px;
  overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; border: 0;
}
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: .01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: .01ms !important;
    scroll-behavior: auto !important;
  }
}
```

- [ ] **Step 5: 创建 `css/app.css` 的基础壳层样式**

```css
.app-shell {
  width: 100%;
  max-width: var(--content-max);
  margin: 0 auto;
  padding: 16px 16px calc(var(--nav-height) + 24px + env(safe-area-inset-bottom));
  min-height: 100vh;
}
.bottom-nav {
  position: fixed;
  left: 50%;
  bottom: 0;
  transform: translateX(-50%);
  width: 100%;
  max-width: var(--content-max);
  height: calc(var(--nav-height) + env(safe-area-inset-bottom));
  padding-bottom: env(safe-area-inset-bottom);
  display: flex;
  justify-content: space-around;
  align-items: center;
  background: rgba(245, 230, 200, .96);
  border-top: 2px dashed var(--line-strong);
  z-index: 30;
}
.bottom-nav a {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  min-width: 56px;
  min-height: 44px;
  color: var(--ink-soft);
  text-decoration: none;
  font-family: var(--font-mono);
  font-size: 11px;
}
.bottom-nav a[aria-current="page"] { color: var(--rust); font-weight: 600; }
.bottom-nav svg { width: 20px; height: 20px; }
.page { display: flex; flex-direction: column; gap: 14px; }
.page-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; }
.page-title { font-family: var(--font-heading); font-size: 26px; line-height: 1.15; font-weight: 700; }
.page-subtitle { font-family: var(--font-mono); font-size: 11px; letter-spacing: .1em; color: var(--ink-soft); text-transform: uppercase; }
.icon-button {
  width: 44px; height: 44px; display: inline-flex; align-items: center; justify-content: center;
  border: 1px solid var(--line-strong); border-radius: var(--radius-sm);
  background: var(--card); color: var(--rust);
}
.icon-button svg { width: 22px; height: 22px; }
.primary-button {
  min-height: 44px; width: 100%; border: 0; border-radius: var(--radius-sm);
  background: var(--rust); color: #FFF9F0; font-weight: 600;
  display: inline-flex; align-items: center; justify-content: center; gap: 6px;
}
.primary-button:active { background: var(--rust-deep); }
.ghost-button {
  min-height: 44px; width: 100%; border: 1px dashed var(--line-strong); border-radius: var(--radius-sm);
  background: transparent; color: var(--rust); font-weight: 600;
  display: inline-flex; align-items: center; justify-content: center; gap: 6px;
}
.danger-button {
  min-height: 44px; width: 100%; border: 1px solid var(--danger); border-radius: var(--radius-sm);
  background: transparent; color: var(--danger); font-weight: 600;
}
.text-input, .text-area, .select-input {
  width: 100%; min-height: 44px; border: 1px solid var(--line-strong); border-radius: var(--radius-sm);
  background: var(--paper-soft); color: var(--ink); padding: 10px 12px;
}
.text-area { min-height: 88px; resize: vertical; }
.field { display: flex; flex-direction: column; gap: 6px; }
.field-label { font-family: var(--font-mono); font-size: 11px; letter-spacing: .08em; color: var(--ink-soft); }
.field-error { color: var(--danger); font-size: 12px; }
.sheet-backdrop {
  position: fixed; inset: 0; background: rgba(43, 32, 22, .45); z-index: 40;
  display: flex; align-items: flex-end; justify-content: center;
}
.sheet {
  width: 100%; max-width: var(--content-max); max-height: 88vh; overflow-y: auto;
  background: var(--card); border-radius: var(--radius-lg) var(--radius-lg) 0 0;
  padding: 16px 16px calc(20px + env(safe-area-inset-bottom));
  box-shadow: 0 -8px 30px rgba(60, 40, 20, .18);
}
.toast-stack {
  position: fixed; left: 50%; bottom: calc(var(--nav-height) + 18px + env(safe-area-inset-bottom));
  transform: translateX(-50%); z-index: 60; display: flex; flex-direction: column; gap: 8px;
  width: min(92vw, 420px); pointer-events: none;
}
.toast {
  background: rgba(59, 47, 38, .94); color: #FFF9F0; padding: 10px 14px;
  border-radius: var(--radius-sm); font-size: 13px; text-align: center;
}
.toast.error { background: var(--danger); }
.empty-state {
  text-align: center; padding: 40px 16px; color: var(--ink-soft);
  border: 1px dashed var(--line-strong); border-radius: var(--radius-md); background: var(--paper-soft);
}
.empty-state h3 { font-family: var(--font-heading); color: var(--ink); margin-bottom: 6px; }
```

- [ ] **Step 6: 创建 `js/utils/dom.js`**

```js
export function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

export function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (key === 'className') node.className = value;
    else if (key === 'dataset') Object.assign(node.dataset, value);
    else if (key.startsWith('on') && typeof value === 'function') node.addEventListener(key.slice(2).toLowerCase(), value);
    else if (value !== null && value !== undefined && value !== false) node.setAttribute(key, value === true ? '' : value);
  }
  const list = Array.isArray(children) ? children : [children];
  for (const child of list) {
    if (child === null || child === undefined || child === false) continue;
    node.append(child instanceof Node ? child : document.createTextNode(String(child)));
  }
  return node;
}

export function debounce(fn, wait = 150) {
  let timer = null;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), wait);
  };
}

export function formatCount(n) {
  return new Intl.NumberFormat('zh-CN').format(n);
}
```

- [ ] **Step 7: 验证骨架**

Run: `npm run dev`
Expected: 终端输出 `http://localhost:5173`；浏览器打开后看到空白纸张背景和空导航区域，控制台无报错（`js/app.js` 尚不存在时会有 404，下一步创建）。

---

## Task 1：纯逻辑工具与测试（TDD）

**Files:**
- Create: `js/utils/id.js`
- Create: `js/utils/dates.js`
- Create: `js/utils/stats.js`
- Create: `js/utils/filters.js`
- Create: `js/utils/validation.js`
- Create: `js/utils/image.js`
- Test: `tests/dates.test.js`
- Test: `tests/stats.test.js`
- Test: `tests/filters.test.js`
- Test: `tests/validation.test.js`
- Test: `tests/image.test.js`

- [ ] **Step 1: 先写 `tests/dates.test.js`**

```js
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
```

- [ ] **Step 2: 运行测试确认失败**

Run: `node --test tests/dates.test.js`
Expected: FAIL，报错 `Cannot find module ... js/utils/dates.js`。

- [ ] **Step 3: 实现 `js/utils/dates.js`**

```js
const DAY_MS = 86400000;
export const WEEKDAY_LABELS = ['一', '二', '三', '四', '五', '六', '日'];

export function pad2(n) { return String(n).padStart(2, '0'); }

export function toDateKey(date = new Date()) {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

export function parseDateKey(key) {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(key, days) {
  const date = parseDateKey(key);
  date.setDate(date.getDate() + days);
  return toDateKey(date);
}

export function daysBetween(fromKey, toKey) {
  const from = parseDateKey(fromKey);
  const to = parseDateKey(toKey);
  const a = Date.UTC(from.getFullYear(), from.getMonth(), from.getDate());
  const b = Date.UTC(to.getFullYear(), to.getMonth(), to.getDate());
  return Math.round((b - a) / DAY_MS);
}

export function weekdayIndex(key) {
  return (parseDateKey(key).getDay() + 6) % 7;
}

export function weekdayLabel(key) {
  return `周${WEEKDAY_LABELS[weekdayIndex(key)]}`;
}

export function monthGrid(year, monthIndex) {
  const first = new Date(year, monthIndex, 1);
  const offset = (first.getDay() + 6) % 7;
  const start = new Date(year, monthIndex, 1 - offset);
  const cells = [];
  for (let i = 0; i < 42; i += 1) {
    const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
    cells.push({
      key: toDateKey(d),
      day: d.getDate(),
      inMonth: d.getMonth() === monthIndex && d.getFullYear() === year,
    });
  }
  return cells;
}

export function monthLabel(year, monthIndex) {
  return `${year} 年 ${monthIndex + 1} 月`;
}

export function formatDateLabel(key) {
  const d = parseDateKey(key);
  return `${d.getMonth() + 1} 月 ${d.getDate()} 日`;
}
```

- [ ] **Step 4: 运行测试确认通过**

Run: `node --test tests/dates.test.js`
Expected: PASS，7 个测试全部通过。

- [ ] **Step 5: 先写 `tests/stats.test.js`**

```js
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
  assert.equal(isIdle(oldItem, logs, '2026-11-03'), false);
  const recentItem = { id: 'recent', createdAt: '2026-10-01T00:00:00.000Z' };
  assert.equal(isIdle(recentItem, [], '2026-11-03'), false);
  assert.equal(countIdle([oldItem, recentItem], [], '2026-11-03'), 1);
});

test('月度统计返回天数与最常穿', () => {
  const result = monthlyStats(logs, 2026, 10);
  assert.equal(result.days, 2);
  assert.deepEqual(result.mostWorn, { id: 'a', name: '风衣', count: 2 });
});
```

- [ ] **Step 6: 运行测试确认失败**

Run: `node --test tests/stats.test.js`
Expected: FAIL，模块不存在。

- [ ] **Step 7: 实现 `js/utils/stats.js`**

```js
import { daysBetween, toDateKey, nowKey } from './dates.js';

export function buildWearIndex(logs) {
  const counts = new Map();
  const lastWorn = new Map();
  for (const log of logs) {
    for (const id of log.itemIds ?? []) {
      counts.set(id, (counts.get(id) ?? 0) + 1);
      const prev = lastWorn.get(id);
      if (!prev || log.date > prev) lastWorn.set(id, log.date);
    }
  }
  return { counts, lastWorn };
}

export function itemWearStats(itemId, logs, today = nowKey()) {
  const { counts, lastWorn } = buildWearIndex(logs);
  const wearCount = counts.get(itemId) ?? 0;
  const last = lastWorn.get(itemId) ?? null;
  return {
    wearCount,
    lastWorn: last,
    daysSinceLastWorn: last ? daysBetween(last, today) : null,
  };
}

export function isIdle(item, logs, today = nowKey(), threshold = 90) {
  const createdKey = toDateKey(new Date(item.createdAt));
  if (daysBetween(createdKey, today) <= threshold) return false;
  const { lastWorn } = buildWearIndex(logs);
  const last = lastWorn.get(item.id);
  if (!last) return true;
  return daysBetween(last, today) > threshold;
}

export function countIdle(items, logs, today = nowKey(), threshold = 90) {
  return items.filter(item => isIdle(item, logs, today, threshold)).length;
}

export function monthlyStats(logs, year, monthIndex) {
  const prefix = `${year}-${String(monthIndex + 1).padStart(2, '0')}-`;
  const monthLogs = logs.filter(log => log.date.startsWith(prefix));
  const counts = new Map();
  const names = new Map();
  for (const log of monthLogs) {
    (log.itemIds ?? []).forEach((id, index) => {
      counts.set(id, (counts.get(id) ?? 0) + 1);
      if (!names.has(id)) names.set(id, log.itemNames?.[index] ?? '未知单品');
    });
  }
  let mostWorn = null;
  for (const [id, count] of counts) {
    if (!mostWorn || count > mostWorn.count) {
      mostWorn = { id, name: names.get(id), count };
    }
  }
  return { days: monthLogs.length, mostWorn };
}
```

- [ ] **Step 8: 运行测试确认通过**

Run: `node --test tests/stats.test.js`
Expected: PASS，4 个测试全部通过。

- [ ] **Step 9: 先写 `tests/filters.test.js`**

```js
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
```

- [ ] **Step 10: 运行测试确认失败，然后实现 `js/utils/filters.js`**

Run: `node --test tests/filters.test.js`
Expected: FAIL，模块不存在。

```js
export function filterItems(items, filters = {}) {
  const { keyword = '', category = '', seasons = [], occasions = [], favoriteOnly = false } = filters;
  const q = keyword.trim().toLowerCase();
  return items.filter(item => {
    if (category && item.category !== category) return false;
    if (favoriteOnly && !item.favorite) return false;
    if (seasons.length && !(item.seasons ?? []).some(s => seasons.includes(s))) return false;
    if (occasions.length && !(item.occasions ?? []).some(o => occasions.includes(o))) return false;
    if (!q) return true;
    return [item.name, item.brand, item.note, item.color, item.category]
      .filter(Boolean).join(' ').toLowerCase().includes(q);
  });
}

export function sortItems(items, mode = 'recent', { counts = new Map(), lastWorn = new Map() } = {}) {
  const list = [...items];
  if (mode === 'mostWorn') {
    return list.sort((a, b) => (counts.get(b.id) ?? 0) - (counts.get(a.id) ?? 0)
      || new Date(b.createdAt) - new Date(a.createdAt));
  }
  if (mode === 'leastWorn') {
    return list.sort((a, b) => {
      const la = lastWorn.get(a.id) ?? '';
      const lb = lastWorn.get(b.id) ?? '';
      if (!la && !lb) return new Date(a.createdAt) - new Date(b.createdAt);
      if (!la) return -1;
      if (!lb) return 1;
      return la.localeCompare(lb);
    });
  }
  return list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}
```

- [ ] **Step 11: 运行测试确认通过**

Run: `node --test tests/filters.test.js`
Expected: PASS，3 个测试全部通过。

- [ ] **Step 12: 先写 `tests/validation.test.js`，再实现 `js/utils/validation.js`**

```js
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
```

```js
export const SEASONS = ['spring', 'summer', 'autumn', 'winter'];
export const OCCASIONS = ['daily', 'work', 'date', 'sport', 'formal', 'home'];
export const SEASON_LABELS = { spring: '春', summer: '夏', autumn: '秋', winter: '冬' };
export const OCCASION_LABELS = { daily: '日常', work: '通勤', date: '约会', sport: '运动', formal: '正式', home: '居家' };

const trim = value => (typeof value === 'string' ? value.trim() : '');

export function validateItem(input) {
  const errors = {};
  const name = trim(input.name);
  if (!name) errors.name = '请填写单品名称';
  else if (name.length > 60) errors.name = '名称不能超过 60 字';
  if (!input.category) errors.category = '请选择分类';
  if (trim(input.brand).length > 40) errors.brand = '品牌不能超过 40 字';
  if (trim(input.note).length > 500) errors.note = '备注不能超过 500 字';
  return errors;
}

export function validateOutfit(input) {
  const errors = {};
  const name = trim(input.name);
  if (!name) errors.name = '请填写搭配名称';
  else if (name.length > 60) errors.name = '名称不能超过 60 字';
  if (!Array.isArray(input.itemIds) || input.itemIds.length === 0) errors.itemIds = '至少选择一件单品';
  if (trim(input.note).length > 500) errors.note = '备注不能超过 500 字';
  return errors;
}

export function validateLog(input) {
  const errors = {};
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.date ?? '')) errors.date = '日期格式不正确';
  if (!Array.isArray(input.itemIds) || input.itemIds.length === 0) errors.itemIds = '请至少选择一件单品';
  if (trim(input.note).length > 300) errors.note = '备注不能超过 300 字';
  return errors;
}

export function hasErrors(errors) {
  return Object.keys(errors).length > 0;
}
```

Run: `node --test tests/validation.test.js`
Expected: PASS，3 个测试全部通过。

- [ ] **Step 13: 实现 `js/utils/id.js` 与 `tests/image.test.js`**

```js
export function uuid() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  const bytes = globalThis.crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = [...bytes].map(b => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
```

```js
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
```

- [ ] **Step 14: 实现 `js/utils/image.js`**

```js
export function computeTargetSize(width, height, maxEdge) {
  if (!width || !height) return { width: 0, height: 0 };
  const scale = Math.min(1, maxEdge / Math.max(width, height));
  return { width: Math.round(width * scale), height: Math.round(height * scale) };
}

async function decodeImage(file) {
  if (globalThis.createImageBitmap) {
    try {
      return await createImageBitmap(file, { imageOrientation: 'from-image' });
    } catch {}
    try {
      return await createImageBitmap(file);
    } catch {}
  }
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('图片解码失败')); };
    img.src = url;
  });
}

function drawToBlob(source, width, height, quality) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  canvas.getContext('2d').drawImage(source, 0, 0, width, height);
  return new Promise((resolve, reject) => {
    canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('图片压缩失败')), 'image/jpeg', quality);
  });
}

export async function compressPhoto(file) {
  const source = await decodeImage(file);
  const width = source.width;
  const height = source.height;
  const fullSize = computeTargetSize(width, height, 1200);
  const thumbSize = computeTargetSize(width, height, 400);
  const [full, thumb] = await Promise.all([
    drawToBlob(source, fullSize.width, fullSize.height, 0.82),
    drawToBlob(source, thumbSize.width, thumbSize.height, 0.75),
  ]);
  source.close?.();
  return { thumb, full, width, height };
}

export function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

export function dataUrlToBlob(dataUrl) {
  const [header, data] = dataUrl.split(',');
  const mime = /data:([^;]+)/.exec(header)?.[1] ?? 'image/jpeg';
  const bytes = atob(data);
  const arr = new Uint8Array(bytes.length);
  for (let i = 0; i < bytes.length; i += 1) arr[i] = bytes.charCodeAt(i);
  return new Blob([arr], { type: mime });
}
```

Run: `npm test`
Expected: PASS，所有测试通过。

---

## Task 2：IndexedDB 数据层

**Files:**
- Create: `js/db/db.js`
- Create: `js/db/photos.js`
- Create: `js/db/items.js`
- Create: `js/db/outfits.js`
- Create: `js/db/logs.js`
- Create: `js/db/settings.js`

- [ ] **Step 1: 实现 `js/db/db.js`**

```js
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
```

- [ ] **Step 2: 实现 `js/db/photos.js`**

```js
import { getOne, putOne, deleteOne } from './db.js';

export async function savePhoto(photo) {
  await putOne('photos', photo);
  return photo;
}

export async function getPhoto(id) {
  return getOne('photos', id);
}

export async function deletePhoto(id) {
  return deleteOne('photos', id);
}
```

- [ ] **Step 3: 实现 `js/db/items.js`**

```js
import { getAll, getOne, putOne, requestPromise, runTransaction } from './db.js';
import { uuid } from '../utils/id.js';
import { validateItem, hasErrors } from '../utils/validation.js';

const nowISO = () => new Date().toISOString();

export async function listItems() {
  const items = await getAll('items');
  return items.sort((a, b) => (b.code ?? 0) - (a.code ?? 0));
}

export async function getItem(id) {
  return getOne('items', id);
}

export async function saveItem(input) {
  const errors = validateItem(input);
  if (hasErrors(errors)) {
    const error = new Error('表单校验失败');
    error.errors = errors;
    throw error;
  }
  const now = nowISO();
  const existing = input.id ? await getItem(input.id) : null;
  let code = existing?.code;
  if (!code) {
    const all = await getAll('items');
    code = all.reduce((max, item) => Math.max(max, item.code ?? 0), 0) + 1;
  }
  const item = {
    id: existing?.id ?? uuid(),
    code,
    name: input.name.trim(),
    category: input.category,
    color: input.color ?? '',
    seasons: [...(input.seasons ?? [])],
    occasions: [...(input.occasions ?? [])],
    brand: (input.brand ?? '').trim(),
    note: (input.note ?? '').trim(),
    photoId: input.photoId !== undefined ? input.photoId : (existing?.photoId ?? null),
    favorite: input.favorite !== undefined ? Boolean(input.favorite) : Boolean(existing?.favorite),
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };
  await putOne('items', item);
  return item;
}

export async function deleteItem(id) {
  await runTransaction(['items', 'photos', 'outfits'], 'readwrite', async tx => {
    const item = await requestPromise(tx.objectStore('items').get(id));
    if (!item) return;
    tx.objectStore('items').delete(id);
    if (item.photoId) tx.objectStore('photos').delete(item.photoId);
    const outfits = await requestPromise(tx.objectStore('outfits').getAll());
    for (const outfit of outfits) {
      if (!outfit.itemIds?.includes(id)) continue;
      outfit.itemIds = outfit.itemIds.filter(itemId => itemId !== id);
      outfit.updatedAt = nowISO();
      tx.objectStore('outfits').put(outfit);
    }
  });
}
```

- [ ] **Step 4: 实现 `js/db/outfits.js`**

```js
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
```

- [ ] **Step 5: 实现 `js/db/logs.js`**

```js
import { getAll, getOne, openDB, putOne, deleteOne, requestPromise } from './db.js';
import { uuid } from '../utils/id.js';
import { validateLog, hasErrors } from '../utils/validation.js';

const nowISO = () => new Date().toISOString();

export async function listLogs() {
  const logs = await getAll('wearLogs');
  return logs.sort((a, b) => b.date.localeCompare(a.date));
}

export async function getLogByDate(date) {
  const db = await openDB();
  return requestPromise(
    db.transaction('wearLogs', 'readonly').objectStore('wearLogs').index('date').get(date)
  );
}

export async function getLog(id) {
  return getOne('wearLogs', id);
}

export async function saveLog(input) {
  const items = Array.isArray(input.items) ? input.items : [];
  const payload = {
    date: input.date,
    itemIds: items.map(item => item.id),
    note: input.note ?? '',
  };
  const errors = validateLog(payload);
  if (hasErrors(errors)) {
    const error = new Error('表单校验失败');
    error.errors = errors;
    throw error;
  }
  const existingByDate = await getLogByDate(input.date);
  if (existingByDate && existingByDate.id !== input.id) {
    const error = new Error('这一天已经有记录');
    error.code = 'DUPLICATE_DATE';
    throw error;
  }
  const existing = input.id ? await getLog(input.id) : existingByDate;
  const now = nowISO();
  const log = {
    id: existing?.id ?? uuid(),
    date: input.date,
    outfitId: input.outfitId ?? null,
    outfitName: input.outfitName ?? '',
    itemIds: payload.itemIds,
    itemNames: items.map(item => item.name),
    note: (input.note ?? '').trim(),
    weather: input.weather ?? '',
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };
  await putOne('wearLogs', log);
  return log;
}

export async function deleteLog(id) {
  return deleteOne('wearLogs', id);
}
```

- [ ] **Step 6: 实现 `js/db/settings.js`**

```js
import { getAll, openDB, putOne, requestPromise, runTransaction } from './db.js';

export const DEFAULT_CATEGORIES = ['上装', '下装', '连衣裙', '外套', '鞋', '包', '配饰', '其他'];
export const DEFAULT_COLORS = ['黑', '白', '灰', '米', '棕', '红', '粉', '橙', '黄', '绿', '蓝', '紫', '花色'];
export const COLOR_HEX = {
  黑: '#2B2B2B', 白: '#FAF7F2', 灰: '#9A9A96', 米: '#D9C7A7', 棕: '#8B5E3C',
  红: '#B3402F', 粉: '#D9A0A6', 橙: '#C9773F', 黄: '#D9B44A', 绿: '#6B7B3C',
  蓝: '#4A6FA5', 紫: '#7B5E8C', 花色: '#C9A9A9',
};

const nowISO = () => new Date().toISOString();

export async function getSettings() {
  const rows = await getAll('settings');
  const map = Object.fromEntries(rows.map(row => [row.key, row.value]));
  return {
    categories: map.categories ?? DEFAULT_CATEGORIES,
    colors: map.colors ?? DEFAULT_COLORS,
    lastBackupAt: map.lastBackupAt ?? null,
    schemaVersion: map.schemaVersion ?? 1,
  };
}

export async function saveSetting(key, value) {
  await putOne('settings', { key, value });
}

export async function saveSettings(patch) {
  await runTransaction(['settings'], 'readwrite', tx => {
    for (const [key, value] of Object.entries(patch)) {
      tx.objectStore('settings').put({ key, value });
    }
  });
}

export async function renameCategory(oldName, newName) {
  if (!newName.trim() || oldName === newName) return;
  await runTransaction(['settings', 'items'], 'readwrite', async tx => {
    const items = await requestPromise(tx.objectStore('items').getAll());
    for (const item of items) {
      if (item.category !== oldName) continue;
      item.category = newName;
      item.updatedAt = nowISO();
      tx.objectStore('items').put(item);
    }
    const row = await requestPromise(tx.objectStore('settings').get('categories'));
    const list = row?.value ?? DEFAULT_CATEGORIES;
    tx.objectStore('settings').put({ key: 'categories', value: list.map(name => name === oldName ? newName : name) });
  });
}

export async function renameColor(oldName, newName) {
  if (!newName.trim() || oldName === newName) return;
  await runTransaction(['settings', 'items'], 'readwrite', async tx => {
    const items = await requestPromise(tx.objectStore('items').getAll());
    for (const item of items) {
      if (item.color !== oldName) continue;
      item.color = newName;
      item.updatedAt = nowISO();
      tx.objectStore('items').put(item);
    }
    const row = await requestPromise(tx.objectStore('settings').get('colors'));
    const list = row?.value ?? DEFAULT_COLORS;
    tx.objectStore('settings').put({ key: 'colors', value: list.map(name => name === oldName ? newName : name) });
  });
}
```

- [ ] **Step 7: 语法检查**

Run: `node --check js/db/db.js && node --check js/db/photos.js && node --check js/db/items.js && node --check js/db/outfits.js && node --check js/db/logs.js && node --check js/db/settings.js`
Expected: 无输出、退出码 0。

---

## Task 3：状态、路由与共享组件

**Files:**
- Create: `js/store.js`
- Create: `js/router.js`
- Create: `js/components/toast.js`
- Create: `js/components/modal.js`
- Create: `js/components/empty-state.js`
- Create: `js/components/nav.js`

- [ ] **Step 1: 实现 `js/store.js`**

```js
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
```

- [ ] **Step 2: 实现 `js/router.js`**

```js
const routes = [];
let cleanup = null;
let currentPath = '/wardrobe';

export function register(pattern, handler) {
  const keys = [];
  const source = pattern.replace(/:[^/]+/g, match => {
    keys.push(match.slice(1));
    return '([^/]+)';
  });
  routes.push({ regex: new RegExp(`^${source}$`), keys, handler });
}

export function parsePath(hash = location.hash) {
  const clean = hash.startsWith('#') ? hash.slice(1) : hash;
  return clean || '/wardrobe';
}

export async function navigate(path) {
  location.hash = `#${path}`;
}

export function start() {
  const render = async () => {
    const path = parsePath();
    currentPath = path;
    for (const route of routes) {
      const match = route.regex.exec(path);
      if (!match) continue;
      const params = Object.fromEntries(route.keys.map((key, index) => [key, decodeURIComponent(match[index + 1])]));
      if (typeof cleanup === 'function') {
        try { cleanup(); } catch {}
        cleanup = null;
      }
      const result = await route.handler(params);
      cleanup = typeof result === 'function' ? result : null;
      return;
    }
    location.hash = '#/wardrobe';
  };
  addEventListener('hashchange', render);
  return render();
}

export function getCurrentPath() {
  return currentPath;
}
```

- [ ] **Step 3: 实现 `js/components/toast.js`**

```js
export function showToast(message, { type = 'info', duration = 3000 } = {}) {
  let root = document.getElementById('toast-root');
  if (!root) {
    root = document.createElement('div');
    root.id = 'toast-root';
    document.body.append(root);
  }
  let stack = root.querySelector('.toast-stack');
  if (!stack) {
    stack = document.createElement('div');
    stack.className = 'toast-stack';
    root.append(stack);
  }
  const toast = document.createElement('div');
  toast.className = `toast${type === 'error' ? ' error' : ''}`;
  toast.textContent = message;
  stack.append(toast);
  setTimeout(() => toast.remove(), duration);
}
```

- [ ] **Step 4: 实现 `js/components/modal.js`**

```js
let active = null;

export function closeSheet() {
  if (!active) return;
  active.backdrop.remove();
  document.body.style.overflow = '';
  const onClose = active.onClose;
  active = null;
  onClose?.();
}

export function openSheet({ title, content, actions = [], onClose = null }) {
  closeSheet();
  const root = document.getElementById('modal-root');
  const backdrop = document.createElement('div');
  backdrop.className = 'sheet-backdrop';
  const sheet = document.createElement('div');
  sheet.className = 'sheet';
  sheet.setAttribute('role', 'dialog');
  sheet.setAttribute('aria-modal', 'true');
  const header = document.createElement('div');
  header.className = 'page-header';
  const heading = document.createElement('h2');
  heading.className = 'page-title';
  heading.style.fontSize = '20px';
  heading.textContent = title;
  const close = document.createElement('button');
  close.type = 'button';
  close.className = 'icon-button';
  close.setAttribute('aria-label', '关闭');
  close.innerHTML = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M6 6l12 12M18 6L6 18"/></svg>';
  close.addEventListener('click', closeSheet);
  header.append(heading, close);
  sheet.append(header);
  if (content) sheet.append(content);
  if (actions.length) {
    const footer = document.createElement('div');
    footer.style.display = 'flex';
    footer.style.flexDirection = 'column';
    footer.style.gap = '8px';
    footer.style.marginTop = '14px';
    for (const action of actions) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = action.variant === 'primary' ? 'primary-button'
        : action.variant === 'danger' ? 'danger-button' : 'ghost-button';
      button.textContent = action.label;
      button.addEventListener('click', () => action.onClick?.());
      footer.append(button);
    }
    sheet.append(footer);
  }
  backdrop.append(sheet);
  backdrop.addEventListener('click', event => { if (event.target === backdrop) closeSheet(); });
  root.append(backdrop);
  document.body.style.overflow = 'hidden';
  active = { backdrop, onClose };
  const focusTarget = sheet.querySelector('input, textarea, select, button');
  focusTarget?.focus({ preventScroll: true });
  return { sheet, close: closeSheet };
}

export function confirmDialog({ title, message, confirmText = '确定', cancelText = '取消', danger = false }) {
  return new Promise(resolve => {
    const content = document.createElement('p');
    content.textContent = message;
    content.style.color = 'var(--ink-soft)';
    content.style.fontSize = '14px';
    const handle = openSheet({
      title,
      content,
      actions: [
        { label: confirmText, variant: danger ? 'danger' : 'primary', onClick: () => { closeSheet(); resolve(true); } },
        { label: cancelText, variant: 'ghost', onClick: () => { closeSheet(); resolve(false); } },
      ],
      onClose: () => resolve(false),
    });
    handle.sheet.dataset.danger = danger ? 'true' : 'false';
  });
}
```

- [ ] **Step 5: 实现 `js/components/empty-state.js`**

```js
export function emptyState({ title, description, actionLabel, onAction }) {
  const wrap = document.createElement('div');
  wrap.className = 'empty-state';
  const heading = document.createElement('h3');
  heading.textContent = title;
  const text = document.createElement('p');
  text.textContent = description;
  text.style.fontSize = '13px';
  wrap.append(heading, text);
  if (actionLabel) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'primary-button';
    button.style.marginTop = '12px';
    button.style.maxWidth = '240px';
    button.textContent = actionLabel;
    button.addEventListener('click', onAction);
    wrap.append(button);
  }
  return wrap;
}
```

- [ ] **Step 6: 实现 `js/components/nav.js`**

```js
const items = [
  { path: '/wardrobe', label: '衣橱', icon: '<path d="M12 3v18M4 7h16M8 7l-3 5 3 2M16 7l3 5-3 2"/>' },
  { path: '/outfits', label: '搭配', icon: '<rect x="4" y="4" width="7" height="7" rx="1"/><rect x="13" y="4" width="7" height="7" rx="1"/><rect x="4" y="13" width="7" height="7" rx="1"/><rect x="13" y="13" width="7" height="7" rx="1"/>' },
  { path: '/logs', label: '记录', icon: '<rect x="4" y="5" width="16" height="15" rx="2"/><path d="M8 3v4M16 3v4M4 10h16"/>' },
  { path: '/settings', label: '我的', icon: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2"/>' },
];

export function renderNav() {
  const nav = document.getElementById('bottom-nav');
  nav.innerHTML = '';
  for (const item of items) {
    const link = document.createElement('a');
    link.href = `#${item.path}`;
    link.dataset.path = item.path;
    link.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7">${item.icon}</svg><span>${item.label}</span>`;
    nav.append(link);
  }
  updateNav();
}

export function updateNav() {
  const hash = location.hash.replace(/^#/, '') || '/wardrobe';
  const nav = document.getElementById('bottom-nav');
  if (!nav) return;
  for (const link of nav.querySelectorAll('a')) {
    const path = link.dataset.path;
    const active = hash === path || hash.startsWith(`${path}/`);
    if (active) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  }
}
```

- [ ] **Step 7: 语法检查**

Run: `node --check js/store.js && node --check js/router.js && node --check js/components/toast.js && node --check js/components/modal.js && node --check js/components/empty-state.js && node --check js/components/nav.js`
Expected: 无输出、退出码 0。

---

## Task 4：衣橱列表、单品详情与应用启动

**Files:**
- Create: `js/views/wardrobe.js`
- Create: `js/views/item-detail.js`
- Create: `js/app.js`
- Modify: `css/app.css`
- Modify: `js/components/nav.js`（让详情页保持父级导航高亮）

- [ ] **Step 1: 追加卡片与列表样式到 `css/app.css`**

```css
.page-meta { font-size: 12px; color: var(--ink-soft); }
.search-row { display: flex; gap: 8px; align-items: stretch; }
.search-row .text-input { flex: 1; min-width: 0; }
.chip-row { display: flex; gap: 8px; overflow-x: auto; padding: 2px 0 6px; scrollbar-width: none; }
.chip-row::-webkit-scrollbar { display: none; }
.chip {
  flex: 0 0 auto; min-height: 44px; padding: 0 14px; border-radius: var(--radius-sm);
  border: 1px solid var(--line-strong); background: var(--paper-soft); color: var(--ink-soft);
  font-size: 13px; display: inline-flex; align-items: center;
}
.chip[aria-pressed="true"] { background: var(--rust); border-color: var(--rust); color: #FFF9F0; font-weight: 600; }
.toolbar-row { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.toolbar-row .select-input { width: auto; min-height: 40px; font-size: 13px; padding: 6px 10px; }
.item-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px 12px; }
.item-card { border: 0; background: transparent; padding: 0; text-align: left; min-width: 0; }
.item-photo {
  background: var(--sand); border: 5px solid var(--card); box-shadow: var(--shadow-photo);
  aspect-ratio: 4 / 5; display: flex; align-items: center; justify-content: center;
  overflow: hidden; transform: rotate(-.6deg);
}
.item-card:nth-child(even) .item-photo { transform: rotate(.6deg); }
.item-photo img { width: 100%; height: 100%; object-fit: cover; }
.item-photo svg { width: 42px; height: 42px; opacity: .45; }
.item-meta { padding: 7px 2px 0; }
.item-name { font-size: 14px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.item-tags { margin-top: 2px; font-family: var(--font-mono); font-size: 10px; color: var(--ink-soft); letter-spacing: .03em; }
.detail-photo {
  background: var(--sand); border: 6px solid var(--card); box-shadow: var(--shadow-photo);
  aspect-ratio: 4 / 5; overflow: hidden; display: flex; align-items: center; justify-content: center;
}
.detail-photo img { width: 100%; height: 100%; object-fit: cover; }
.detail-photo svg { width: 64px; height: 64px; opacity: .45; }
.tag-row { display: flex; flex-wrap: wrap; gap: 6px; }
.tag { font-size: 11px; padding: 4px 9px; border-radius: var(--radius-sm); background: var(--sand); color: var(--ink-soft); }
.tag.accent { background: var(--teal); color: #FDF7EA; }
.info-list { border-top: 1px dashed var(--line); }
.info-row { display: flex; justify-content: space-between; gap: 16px; padding: 9px 0; border-bottom: 1px dashed var(--line); font-size: 13px; }
.info-row dt { color: var(--ink-soft); flex-shrink: 0; }
.info-row dd { text-align: right; }
.stat-row { display: flex; background: var(--paper-soft); border: 1px solid var(--line); border-radius: var(--radius-sm); }
.stat-item { flex: 1; text-align: center; padding: 10px 4px; border-right: 1px dashed var(--line); }
.stat-item:last-child { border-right: 0; }
.stat-item b { display: block; font-family: var(--font-heading); font-size: 18px; color: var(--rust); }
.stat-item span { font-size: 10px; color: var(--ink-soft); }
.detail-actions { display: flex; flex-direction: column; gap: 8px; }
.form-grid { display: flex; flex-direction: column; gap: 12px; }
.choice-row { display: flex; flex-wrap: wrap; gap: 6px; }
.choice-chip {
  min-height: 40px; padding: 0 12px; border-radius: var(--radius-sm); border: 1px solid var(--line-strong);
  background: var(--paper-soft); color: var(--ink-soft); font-size: 13px;
  display: inline-flex; align-items: center;
}
.choice-chip[aria-pressed="true"] { background: var(--teal); border-color: var(--teal); color: #FDF7EA; }
.photo-input { display: flex; flex-direction: column; gap: 8px; }
.photo-preview {
  width: 100%; aspect-ratio: 4 / 5; border: 5px solid var(--card); background: var(--sand);
  box-shadow: var(--shadow-photo); padding: 0; overflow: hidden;
  display: flex; align-items: center; justify-content: center; color: var(--ink-soft);
}
.photo-preview img { width: 100%; height: 100%; object-fit: cover; }
.photo-placeholder { font-family: var(--font-mono); font-size: 12px; letter-spacing: .08em; }
.photo-actions { display: flex; gap: 8px; }
.photo-actions .ghost-button { min-height: 40px; font-size: 13px; }
```

- [ ] **Step 2: 实现 `js/views/wardrobe.js`**

```js
import { getState, setFilters, setSort, subscribe, notify, photoUrl, wearIndex } from '../store.js';
import { filterItems, sortItems } from '../utils/filters.js';
import { escapeHtml } from '../utils/dom.js';
import { SEASON_LABELS, OCCASION_LABELS } from '../utils/validation.js';
import { emptyState } from '../components/empty-state.js';
import { openSheet } from '../components/modal.js';
import { navigate } from '../router.js';

let unsubscribe = null;
let currentItems = [];

const placeholder = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M12 3v18M4 7h16M8 7l-3 5 3 2M16 7l3 5-3 2"/></svg>';

export function renderWardrobe() {
  unsubscribe?.();
  unsubscribe = subscribe(() => paint());
  paint();
  return () => {
    unsubscribe?.();
    unsubscribe = null;
  };
}

function paint() {
  const app = document.getElementById('app');
  const state = getState();
  const { counts, lastWorn } = wearIndex();
  currentItems = sortItems(filterItems(state.items, state.filters), state.sort, { counts, lastWorn });
  const categories = ['', ...state.settings.categories];
  app.innerHTML = `
    <div class="page">
      <header class="page-header">
        <div>
          <div class="page-subtitle">My Wardrobe</div>
          <h1 class="page-title">我的衣橱</h1>
          <div class="page-meta">${state.items.length} 件单品 · ${state.outfits.length} 套搭配</div>
        </div>
        <button class="icon-button" id="add-item" aria-label="录入单品">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 5v14M5 12h14"/></svg>
        </button>
      </header>
      <div class="search-row">
        <input id="search-input" class="text-input" type="search" placeholder="搜索名称、颜色、品牌" aria-label="搜索单品" value="${escapeHtml(state.filters.keyword)}">
        <button class="icon-button" id="filter-button" aria-label="筛选">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M4 6h16M7 12h10M10 18h4"/></svg>
        </button>
      </div>
      <div class="chip-row" id="category-chips">
        ${categories.map(name => `<button type="button" class="chip" data-category="${escapeHtml(name)}" aria-pressed="${state.filters.category === name}">${name ? escapeHtml(name) : '全部'}</button>`).join('')}
      </div>
      <div class="toolbar-row">
        <span class="page-meta" id="result-count"></span>
        <select id="sort-select" class="select-input" aria-label="排序方式">
          <option value="recent">最近添加</option>
          <option value="mostWorn">最常穿</option>
          <option value="leastWorn">最久未穿</option>
        </select>
      </div>
      <div id="item-grid" class="item-grid"></div>
    </div>
  `;
  document.getElementById('sort-select').value = state.sort;
  document.getElementById('add-item').addEventListener('click', () => navigate('/item/new'));
  document.getElementById('search-input').addEventListener('input', event => {
    setFilters({ keyword: event.target.value });
    renderGrid();
  });
  document.getElementById('filter-button').addEventListener('click', openFilterSheet);
  document.getElementById('category-chips').addEventListener('click', event => {
    const button = event.target.closest('[data-category]');
    if (!button) return;
    setFilters({ category: button.dataset.category });
    for (const chip of event.currentTarget.querySelectorAll('.chip')) {
      chip.setAttribute('aria-pressed', String(chip === button));
    }
    renderGrid();
  });
  document.getElementById('sort-select').addEventListener('change', event => {
    setSort(event.target.value);
    renderGrid();
  });
  renderGrid();
}

function renderGrid() {
  const state = getState();
  const { counts, lastWorn } = wearIndex();
  currentItems = sortItems(filterItems(state.items, state.filters), state.sort, { counts, lastWorn });
  const grid = document.getElementById('item-grid');
  const count = document.getElementById('result-count');
  if (count) count.textContent = `${currentItems.length} 件`;
  if (!grid) return;
  grid.innerHTML = '';
  if (!currentItems.length) {
    grid.append(emptyState({
      title: state.items.length ? '没有符合条件的单品' : '衣橱还是空的',
      description: state.items.length ? '换个关键词或清除筛选试试。' : '拍下第一件衣服，开始建立你的衣橱。',
      actionLabel: state.items.length ? '清除筛选' : '录入第一件单品',
      onAction: () => {
        if (state.items.length) {
          setFilters({ keyword: '', category: '', seasons: [], occasions: [], favoriteOnly: false });
          notify();
        } else {
          navigate('/item/new');
        }
      },
    }));
    return;
  }
  for (const item of currentItems) {
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'item-card';
    card.setAttribute('aria-label', `查看 ${item.name}`);
    const url = photoUrl(item.photoId);
    const seasonText = (item.seasons ?? []).map(s => SEASON_LABELS[s] ?? s).join('');
    const occasionText = (item.occasions ?? []).map(o => OCCASION_LABELS[o] ?? o).join(' · ');
    card.innerHTML = `
      <div class="item-photo">${url ? `<img src="${url}" alt="${escapeHtml(item.name)}" loading="lazy">` : placeholder}</div>
      <div class="item-meta">
        <div class="item-name">${escapeHtml(item.name)}</div>
        <div class="item-tags">${escapeHtml(item.category)}${seasonText ? ` · ${seasonText}` : ''}${occasionText ? ` · ${occasionText}` : ''}</div>
      </div>
    `;
    card.addEventListener('click', () => navigate(`/item/${item.id}`));
    grid.append(card);
  }
}

function openFilterSheet() {
  const state = getState();
  const draft = {
    seasons: new Set(state.filters.seasons),
    occasions: new Set(state.filters.occasions),
    favoriteOnly: state.filters.favoriteOnly,
  };
  const content = document.createElement('div');
  content.style.display = 'flex';
  content.style.flexDirection = 'column';
  content.style.gap = '14px';
  const renderChoices = () => {
    content.innerHTML = `
      <div class="field">
        <div class="field-label">季节</div>
        <div class="choice-row">${Object.entries(SEASON_LABELS).map(([key, label]) => `<button type="button" class="choice-chip" data-season="${key}" aria-pressed="${draft.seasons.has(key)}">${label}</button>`).join('')}</div>
      </div>
      <div class="field">
        <div class="field-label">场合</div>
        <div class="choice-row">${Object.entries(OCCASION_LABELS).map(([key, label]) => `<button type="button" class="choice-chip" data-occasion="${key}" aria-pressed="${draft.occasions.has(key)}">${label}</button>`).join('')}</div>
      </div>
      <div class="field">
        <div class="field-label">收藏</div>
        <div class="choice-row"><button type="button" class="choice-chip" id="favorite-only" aria-pressed="${draft.favoriteOnly}">仅看收藏</button></div>
      </div>
    `;
    content.querySelectorAll('[data-season]').forEach(button => button.addEventListener('click', () => {
      const key = button.dataset.season;
      draft.seasons.has(key) ? draft.seasons.delete(key) : draft.seasons.add(key);
      renderChoices();
    }));
    content.querySelectorAll('[data-occasion]').forEach(button => button.addEventListener('click', () => {
      const key = button.dataset.occasion;
      draft.occasions.has(key) ? draft.occasions.delete(key) : draft.occasions.add(key);
      renderChoices();
    }));
    content.querySelector('#favorite-only').addEventListener('click', () => {
      draft.favoriteOnly = !draft.favoriteOnly;
      renderChoices();
    });
  };
  renderChoices();
  openSheet({
    title: '筛选',
    content,
    actions: [
      {
        label: '应用筛选',
        variant: 'primary',
        onClick: () => {
          setFilters({ seasons: [...draft.seasons], occasions: [...draft.occasions], favoriteOnly: draft.favoriteOnly });
          document.getElementById('sheet-apply')?.blur();
          document.querySelector('.sheet-backdrop')?.remove();
          document.body.style.overflow = '';
          notify();
        },
      },
      {
        label: '清除筛选',
        variant: 'ghost',
        onClick: () => {
          setFilters({ keyword: '', category: '', seasons: [], occasions: [], favoriteOnly: false });
          document.querySelector('.sheet-backdrop')?.remove();
          document.body.style.overflow = '';
          notify();
        },
      },
    ],
  });
}
```

- [ ] **Step 3: 实现 `js/views/item-detail.js`**

```js
import { getState, itemById, logByDate, photoUrl, getFullPhoto } from '../store.js';
import { itemWearStats } from '../utils/stats.js';
import { daysBetween, nowKey, toDateKey, formatDateLabel } from '../utils/dates.js';
import { SEASON_LABELS, OCCASION_LABELS } from '../utils/validation.js';
import { escapeHtml } from '../utils/dom.js';
import { emptyState } from '../components/empty-state.js';
import { navigate } from '../router.js';

const placeholder = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.3"><path d="M12 3v18M4 7h16M8 7l-3 5 3 2M16 7l3 5-3 2"/></svg>';

export async function renderItemDetail({ id }) {
  const app = document.getElementById('app');
  const item = itemById(id);
  if (!item) {
    app.innerHTML = '';
    app.append(emptyState({ title: '单品不存在', description: '它可能已经被删除。', actionLabel: '返回衣橱', onAction: () => navigate('/wardrobe') }));
    return () => {};
  }
  const state = getState();
  const stats = itemWearStats(item.id, state.logs, nowKey());
  const daysInWardrobe = daysBetween(toDateKey(new Date(item.createdAt)), nowKey());
  const thumb = photoUrl(item.photoId);
  const seasonText = (item.seasons ?? []).map(s => SEASON_LABELS[s] ?? s).join('、');
  const occasionText = (item.occasions ?? []).map(o => OCCASION_LABELS[o] ?? o).join('、');
  app.innerHTML = `
    <div class="page">
      <header class="page-header">
        <button class="icon-button" id="back-button" aria-label="返回">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M15 5l-7 7 7 7"/></svg>
        </button>
        <div style="flex:1; text-align:center">
          <div class="page-subtitle">Item No.${String(item.code ?? 0).padStart(3, '0')}</div>
        </div>
        <span style="width:44px"></span>
      </header>
      <div class="detail-photo" id="detail-photo-box">${thumb ? `<img id="detail-photo" src="${thumb}" alt="${escapeHtml(item.name)}">` : placeholder}</div>
      <div>
        <h1 class="page-title" style="font-size:24px">${escapeHtml(item.name)}</h1>
        <div class="tag-row" style="margin-top:8px">
          <span class="tag accent">${escapeHtml(item.category)}</span>
          ${item.color ? `<span class="tag">${escapeHtml(item.color)}</span>` : ''}
          ${seasonText ? `<span class="tag">${escapeHtml(seasonText)}</span>` : ''}
          ${occasionText ? `<span class="tag">${escapeHtml(occasionText)}</span>` : ''}
          ${item.favorite ? '<span class="tag">已收藏</span>' : ''}
        </div>
      </div>
      <dl class="info-list">
        ${item.brand ? `<div class="info-row"><dt>品牌</dt><dd>${escapeHtml(item.brand)}</dd></div>` : ''}
        <div class="info-row"><dt>备注</dt><dd>${item.note ? escapeHtml(item.note) : '—'}</dd></div>
      </dl>
      <div class="stat-row">
        <div class="stat-item"><b>${stats.wearCount}</b><span>穿过</span></div>
        <div class="stat-item"><b>${stats.lastWorn ? formatDateLabel(stats.lastWorn) : '—'}</b><span>最近穿着</span></div>
        <div class="stat-item"><b>${daysInWardrobe}</b><span>在衣橱天数</span></div>
      </div>
      <div class="detail-actions" id="detail-actions"></div>
    </div>
  `;
  document.getElementById('back-button').addEventListener('click', () => {
    if (history.length > 1) history.back();
    else navigate('/wardrobe');
  });
  let objectUrl = null;
  if (item.photoId) {
    const photo = await getFullPhoto(item.photoId);
    if (photo) {
      objectUrl = URL.createObjectURL(photo.full);
      const img = document.getElementById('detail-photo');
      if (img) img.src = objectUrl;
    }
  }
  return () => { if (objectUrl) URL.revokeObjectURL(objectUrl); };
}
```

- [ ] **Step 4: 实现 `js/app.js`（只注册衣橱与详情路由）**

```js
import { loadAll, subscribe } from './store.js';
import { register, start } from './router.js';
import { renderNav, updateNav } from './components/nav.js';
import { renderWardrobe } from './views/wardrobe.js';
import { renderItemDetail } from './views/item-detail.js';
import { showToast } from './components/toast.js';

function renderFatal(error) {
  const app = document.getElementById('app');
  app.innerHTML = `
    <div class="empty-state" style="margin-top:40px">
      <h3>数据加载失败</h3>
      <p style="font-size:13px;margin-bottom:12px">${String(error?.message ?? error)}</p>
      <button class="primary-button" id="retry-button" style="max-width:200px;margin:0 auto">重试</button>
    </div>
  `;
  document.getElementById('retry-button').addEventListener('click', () => location.reload());
}

async function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;
  try {
    await navigator.serviceWorker.register('./sw.js', { scope: './' });
  } catch (error) {
    showToast('离线缓存注册失败，在线状态下仍可使用', { type: 'error' });
  }
}

async function boot() {
  renderNav();
  updateNav();
  addEventListener('hashchange', updateNav);
  subscribe(() => updateNav());
  addEventListener('error', event => showToast(event.message || '发生未知错误', { type: 'error' }));
  addEventListener('unhandledrejection', event => showToast(event.reason?.message || '操作失败', { type: 'error' }));
  try {
    await loadAll();
  } catch (error) {
    renderFatal(error);
    return;
  }
  register('/wardrobe', renderWardrobe);
  register('/item/:id', renderItemDetail);
  await start();
  registerServiceWorker();
  navigator.storage?.persist?.().catch(() => {});
}

boot();
```

- [ ] **Step 5: 修改 `js/components/nav.js` 的 `updateNav`，让详情页保持父级高亮**

将 `updateNav` 中的 `const active = ...` 一行替换为：

```js
    const active = hash === path
      || hash.startsWith(`${path}/`)
      || (path === '/wardrobe' && hash.startsWith('/item/'))
      || (path === '/outfits' && hash.startsWith('/outfit/'));
```

- [ ] **Step 6: 启动并验证**

Run: `npm run dev`
Expected:
- 打开 `http://localhost:5173`，看到纸张质感背景、标题「我的衣橱」、搜索框、分类胶囊、空状态。
- 底部四栏导航可见，当前项「衣橱」为铁锈色。
- 点击「录入第一件单品」暂时跳到 `/item/new`，显示「单品不存在」（录入页在 Task 5 实现），这是预期中间状态。
- 浏览器控制台无报错（Service Worker 404 在 Task 9 前可忽略）。

---

## Task 5：单品录入/编辑、图片压缩与删除

**Files:**
- Create: `js/components/photo-input.js`
- Create: `js/views/item-edit.js`
- Modify: `js/views/item-detail.js`
- Modify: `js/app.js`
- Modify: `css/app.css`

- [ ] **Step 1: 实现 `js/components/photo-input.js`**

```js
import { compressPhoto } from '../utils/image.js';
import { showToast } from '../components/toast.js';

export function createPhotoInput({ initialUrl = null, onChange = () => {} } = {}) {
  const wrap = document.createElement('div');
  wrap.className = 'photo-input';
  wrap.innerHTML = `
    <input id="photo-file" type="file" accept="image/*" hidden>
    <button type="button" class="photo-preview" id="photo-preview" aria-label="选择单品照片">
      ${initialUrl ? `<img src="${initialUrl}" alt="单品照片预览">` : '<span class="photo-placeholder">拍照或选择照片</span>'}
    </button>
    <div class="photo-actions">
      <button type="button" class="ghost-button" id="choose-photo">${initialUrl ? '更换照片' : '选择照片'}</button>
      <button type="button" class="ghost-button" id="remove-photo" ${initialUrl ? '' : 'hidden'}>移除</button>
    </div>
  `;
  const input = wrap.querySelector('#photo-file');
  const preview = wrap.querySelector('#photo-preview');
  const choose = wrap.querySelector('#choose-photo');
  const remove = wrap.querySelector('#remove-photo');
  let pending = null;
  let previewUrl = null;

  const setPreview = url => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    previewUrl = url;
    preview.innerHTML = url
      ? `<img src="${url}" alt="单品照片预览">`
      : '<span class="photo-placeholder">拍照或选择照片</span>';
    remove.hidden = !url;
    choose.textContent = url ? '更换照片' : '选择照片';
  };

  choose.addEventListener('click', () => input.click());
  preview.addEventListener('click', () => input.click());
  remove.addEventListener('click', () => {
    pending = null;
    setPreview(null);
    onChange(null);
  });
  input.addEventListener('change', async () => {
    const file = input.files?.[0];
    if (!file) return;
    try {
      const compressed = await compressPhoto(file);
      pending = compressed;
      setPreview(URL.createObjectURL(compressed.thumb));
      onChange(compressed);
    } catch {
      showToast('这张图片暂不支持，请换一张', { type: 'error' });
    } finally {
      input.value = '';
    }
  });

  return {
    element: wrap,
    getPhoto: () => pending,
    clear() {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      previewUrl = null;
    },
  };
}
```

- [ ] **Step 2: 实现 `js/views/item-edit.js`**

```js
import { getState, itemById, photoUrl, loadAll } from '../store.js';
import { saveItem, deleteItem } from '../db/items.js';
import { savePhoto, deletePhoto } from '../db/photos.js';
import { uuid } from '../utils/id.js';
import { validateItem, hasErrors, SEASONS, OCCASIONS, SEASON_LABELS, OCCASION_LABELS } from '../utils/validation.js';
import { escapeHtml } from '../utils/dom.js';
import { createPhotoInput } from '../components/photo-input.js';
import { confirmDialog } from '../components/modal.js';
import { showToast } from '../components/toast.js';
import { navigate } from '../router.js';

export function renderItemEdit({ id = 'new' } = {}) {
  const state = getState();
  const existing = id && id !== 'new' ? itemById(id) : null;
  if (id !== 'new' && !existing) {
    showToast('单品不存在', { type: 'error' });
    navigate('/wardrobe');
    return () => {};
  }
  const app = document.getElementById('app');
  const selected = {
    seasons: new Set(existing?.seasons ?? []),
    occasions: new Set(existing?.occasions ?? []),
    favorite: Boolean(existing?.favorite),
  };
  const categories = state.settings.categories;
  const colors = state.settings.colors;
  let selectedCategory = existing?.category ?? categories[0] ?? '';
  let selectedColor = existing?.color ?? colors[0] ?? '';
  let photoChanged = false;

  app.innerHTML = `
    <div class="page">
      <header class="page-header">
        <button class="icon-button" id="back-button" aria-label="返回">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M15 5l-7 7 7 7"/></svg>
        </button>
        <h1 class="page-title" style="font-size:22px;flex:1;text-align:center">${existing ? '编辑单品' : '录入单品'}</h1>
        <span style="width:44px"></span>
      </header>
      <form class="form-grid" id="item-form" novalidate>
        <div id="photo-slot"></div>
        <div class="field">
          <label class="field-label" for="item-name">名称 *</label>
          <input class="text-input" id="item-name" name="name" maxlength="60" value="${escapeHtml(existing?.name ?? '')}" required>
          <div class="field-error" id="error-name"></div>
        </div>
        <div class="field">
          <div class="field-label">分类 *</div>
          <div class="choice-row" id="category-choices">
            ${categories.map(name => `<button type="button" class="choice-chip" data-category="${escapeHtml(name)}" aria-pressed="${name === selectedCategory}">${escapeHtml(name)}</button>`).join('')}
          </div>
          <div class="field-error" id="error-category"></div>
        </div>
        <div class="field">
          <div class="field-label">颜色</div>
          <div class="choice-row" id="color-choices">
            ${colors.map(name => `<button type="button" class="choice-chip" data-color="${escapeHtml(name)}" aria-pressed="${name === selectedColor}">${escapeHtml(name)}</button>`).join('')}
          </div>
        </div>
        <div class="field">
          <div class="field-label">季节</div>
          <div class="choice-row" id="season-choices">
            ${SEASONS.map(key => `<button type="button" class="choice-chip" data-season="${key}" aria-pressed="${selected.seasons.has(key)}">${SEASON_LABELS[key]}</button>`).join('')}
          </div>
        </div>
        <div class="field">
          <div class="field-label">场合</div>
          <div class="choice-row" id="occasion-choices">
            ${OCCASIONS.map(key => `<button type="button" class="choice-chip" data-occasion="${key}" aria-pressed="${selected.occasions.has(key)}">${OCCASION_LABELS[key]}</button>`).join('')}
          </div>
        </div>
        <div class="field">
          <label class="field-label" for="item-brand">品牌</label>
          <input class="text-input" id="item-brand" name="brand" maxlength="40" value="${escapeHtml(existing?.brand ?? '')}">
        </div>
        <div class="field">
          <label class="field-label" for="item-note">备注</label>
          <textarea class="text-area" id="item-note" name="note" maxlength="500">${escapeHtml(existing?.note ?? '')}</textarea>
        </div>
        <div class="field">
          <div class="field-label">收藏</div>
          <div class="choice-row"><button type="button" class="choice-chip" id="favorite-toggle" aria-pressed="${selected.favorite}">加入收藏</button></div>
        </div>
        <div class="detail-actions">
          <button type="submit" class="primary-button" id="save-button">保存单品</button>
          ${existing ? '<button type="button" class="danger-button" id="delete-button">删除单品</button>' : ''}
        </div>
      </form>
    </div>
  `;

  const photoInput = createPhotoInput({
    initialUrl: existing?.photoId ? photoUrl(existing.photoId) : null,
    onChange: photo => { photoChanged = true; pendingPhoto = photo; },
  });
  let pendingPhoto = null;
  document.getElementById('photo-slot').append(photoInput.element);

  document.getElementById('back-button').addEventListener('click', () => {
    photoInput.clear();
    if (history.length > 1) history.back();
    else navigate('/wardrobe');
  });
  document.getElementById('favorite-toggle').addEventListener('click', event => {
    selected.favorite = !selected.favorite;
    event.currentTarget.setAttribute('aria-pressed', String(selected.favorite));
  });
  document.getElementById('category-choices').addEventListener('click', event => {
    const button = event.target.closest('[data-category]');
    if (!button) return;
    selectedCategory = button.dataset.category;
    for (const chip of event.currentTarget.querySelectorAll('.choice-chip')) {
      chip.setAttribute('aria-pressed', String(chip === button));
    }
  });
  document.getElementById('color-choices').addEventListener('click', event => {
    const button = event.target.closest('[data-color]');
    if (!button) return;
    selectedColor = button.dataset.color;
    for (const chip of event.currentTarget.querySelectorAll('.choice-chip')) {
      chip.setAttribute('aria-pressed', String(chip === button));
    }
  });
  document.getElementById('season-choices').addEventListener('click', event => {
    const button = event.target.closest('[data-season]');
    if (!button) return;
    const key = button.dataset.season;
    selected.seasons.has(key) ? selected.seasons.delete(key) : selected.seasons.add(key);
    button.setAttribute('aria-pressed', String(selected.seasons.has(key)));
  });
  document.getElementById('occasion-choices').addEventListener('click', event => {
    const button = event.target.closest('[data-occasion]');
    if (!button) return;
    const key = button.dataset.occasion;
    selected.occasions.has(key) ? selected.occasions.delete(key) : selected.occasions.add(key);
    button.setAttribute('aria-pressed', String(selected.occasions.has(key)));
  });

  document.getElementById('item-form').addEventListener('submit', async event => {
    event.preventDefault();
    const form = {
      id: existing?.id,
      name: document.getElementById('item-name').value,
      category: selectedCategory,
      color: selectedColor,
      seasons: [...selected.seasons],
      occasions: [...selected.occasions],
      brand: document.getElementById('item-brand').value,
      note: document.getElementById('item-note').value,
      favorite: selected.favorite,
    };
    const errors = validateItem(form);
    document.getElementById('error-name').textContent = errors.name ?? '';
    document.getElementById('error-category').textContent = errors.category ?? '';
    if (hasErrors(errors)) return;
    const saveButton = document.getElementById('save-button');
    saveButton.disabled = true;
    saveButton.textContent = '保存中…';
    let newPhoto = null;
    try {
      if (pendingPhoto) {
        newPhoto = {
          id: uuid(),
          thumb: pendingPhoto.thumb,
          full: pendingPhoto.full,
          width: pendingPhoto.width,
          height: pendingPhoto.height,
          createdAt: new Date().toISOString(),
        };
        await savePhoto(newPhoto);
        form.photoId = newPhoto.id;
      } else if (photoChanged) {
        form.photoId = null;
      }
      const saved = await saveItem(form);
      if (photoChanged && existing?.photoId && existing.photoId !== newPhoto?.id) {
        await deletePhoto(existing.photoId);
      }
      await loadAll();
      photoInput.clear();
      showToast('已保存');
      navigate(`/item/${saved.id}`);
    } catch (error) {
      if (newPhoto) await deletePhoto(newPhoto.id).catch(() => {});
      showToast(error?.errors ? Object.values(error.errors)[0] : '保存失败，请重试', { type: 'error' });
      saveButton.disabled = false;
      saveButton.textContent = '保存单品';
    }
  });

  document.getElementById('delete-button')?.addEventListener('click', async () => {
    const ok = await confirmDialog({
      title: '删除单品',
      message: `确定删除「${existing.name}」吗？它会从所有搭配中移除，历史穿着记录会保留。`,
      confirmText: '删除',
      danger: true,
    });
    if (!ok) return;
    await deleteItem(existing.id);
    await loadAll();
    showToast('已删除');
    navigate('/wardrobe');
  });

  return () => photoInput.clear();
}
```

- [ ] **Step 3: 在 `js/views/item-detail.js` 中加入操作按钮**

在 `renderItemDetail` 中，紧接 `document.getElementById('back-button').addEventListener(...)` 之后，加入：

```js
  const actions = document.getElementById('detail-actions');
  const editButton = document.createElement('button');
  editButton.type = 'button';
  editButton.className = 'primary-button';
  editButton.textContent = '编辑单品';
  editButton.addEventListener('click', () => navigate(`/item/${item.id}/edit`));
  const deleteButton = document.createElement('button');
  deleteButton.type = 'button';
  deleteButton.className = 'danger-button';
  deleteButton.textContent = '删除单品';
  deleteButton.addEventListener('click', async () => {
    const { confirmDialog } = await import('../components/modal.js');
    const { deleteItem } = await import('../db/items.js');
    const { loadAll } = await import('../store.js');
    const ok = await confirmDialog({
      title: '删除单品',
      message: `确定删除「${item.name}」吗？它会从所有搭配中移除，历史穿着记录会保留。`,
      confirmText: '删除',
      danger: true,
    });
    if (!ok) return;
    await deleteItem(item.id);
    await loadAll();
    showToast('已删除');
    navigate('/wardrobe');
  });
  actions.append(editButton, deleteButton);
```

同时在 `item-detail.js` 顶部补充导入：

```js
import { showToast } from '../components/toast.js';
```

- [ ] **Step 4: 在 `js/app.js` 注册录入与编辑路由**

将路由注册部分替换为：

```js
  register('/wardrobe', renderWardrobe);
  register('/item/new', renderItemEdit);
  register('/item/:id/edit', renderItemEdit);
  register('/item/:id', renderItemDetail);
```

并在顶部增加：

```js
import { renderItemEdit } from './views/item-edit.js';
```

- [ ] **Step 5: 验证录入、编辑、删除与持久化**

Run: `npm run dev`

手动检查：
1. 打开 `http://localhost:5173`，点「＋」进入录入页。
2. 选择一张照片，填写名称、分类、颜色、季节、场合，保存。
3. 返回衣橱，看到相纸卡片与照片；刷新页面后数据仍在。
4. 点卡片进入详情，看到大图与统计；点「编辑单品」修改名称，保存后生效。
5. 点「删除单品」，确认后卡片消失，刷新后仍为空。
6. 控制台无报错。

---

## Task 6：穿着记录、日历与记录表单

**Files:**
- Create: `js/components/log-sheet.js`
- Create: `js/views/logs.js`
- Modify: `js/views/item-detail.js`
- Modify: `js/app.js`
- Modify: `css/app.css`

- [ ] **Step 1: 追加日历与记录样式到 `css/app.css`**

```css
.log-date { font-family: var(--font-mono); font-size: 12px; color: var(--ink-soft); }
.log-option {
  display: flex; gap: 10px; align-items: center; width: 100%; min-height: 56px;
  text-align: left; padding: 6px; background: var(--paper-soft);
  border: 1px solid var(--line); border-radius: var(--radius-sm); margin-bottom: 6px;
}
.log-option[aria-pressed="true"] { border-color: var(--rust); background: #F3E4CF; }
.log-option-thumb, .log-item-thumb {
  width: 40px; height: 48px; background: var(--sand); overflow: hidden;
  display: flex; align-items: center; justify-content: center; flex: 0 0 auto;
}
.log-option-thumb img, .log-item-thumb img { width: 100%; height: 100%; object-fit: cover; }
.log-option b { display: block; font-size: 13px; }
.log-option small { font-family: var(--font-mono); font-size: 10px; color: var(--ink-soft); }
.log-items-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 6px; max-height: 240px; overflow-y: auto; }
.log-item {
  display: flex; gap: 8px; align-items: center; min-height: 52px; text-align: left;
  padding: 5px; background: var(--paper-soft); border: 1px solid var(--line);
  border-radius: var(--radius-sm); font-size: 12px;
}
.log-item[aria-pressed="true"] { border-color: var(--teal); background: #E4EFE9; }
.empty-inline {
  padding: 16px; text-align: center; color: var(--ink-soft); font-size: 12px;
  border: 1px dashed var(--line-strong); border-radius: var(--radius-sm);
}
.calendar-week { display: grid; grid-template-columns: repeat(7, 1fr); text-align: center; font-size: 11px; color: var(--ink-soft); margin-bottom: 2px; }
.calendar { display: grid; grid-template-columns: repeat(7, 1fr); gap: 2px 0; }
.calendar-day {
  position: relative; min-height: 44px; display: flex; flex-direction: column;
  align-items: center; justify-content: center; border: 0; background: transparent;
  font-size: 13px; color: var(--ink); border-radius: 50%;
}
.calendar-day.dim { color: #C4B294; }
.calendar-day .dot { width: 4px; height: 4px; border-radius: 50%; background: var(--teal); margin-top: 2px; }
.calendar-day.selected { background: var(--rust); color: #FFF9F0; }
.calendar-day.selected .dot { background: #F5E6C8; }
.month-nav { display: flex; align-items: center; justify-content: space-between; }
.summary-row { display: flex; flex-wrap: wrap; gap: 6px; }
.summary-pill {
  font-size: 11px; color: var(--ink-soft); background: var(--paper-soft);
  border: 1px solid var(--line); border-radius: var(--radius-sm); padding: 4px 8px;
}
.log-card { background: var(--card); border: 1px solid var(--line); box-shadow: var(--shadow-card); padding: 10px; }
.log-card-thumbs { display: flex; gap: 4px; }
.log-card-thumbs div { width: 34px; height: 42px; background: var(--sand); display: flex; align-items: center; justify-content: center; }
.log-card-thumbs img { width: 100%; height: 100%; object-fit: cover; }
.log-card-thumbs svg { width: 18px; height: 18px; opacity: .4; }
.log-card h3 { font-size: 14px; margin-top: 6px; }
.log-card p { font-size: 12px; color: var(--ink-soft); margin-top: 3px; }
.weather-tag {
  display: inline-block; font-family: var(--font-mono); font-size: 10px;
  color: var(--teal); border: 1px solid #B7CDCB; padding: 2px 6px; margin-top: 5px;
}
```

- [ ] **Step 2: 实现 `js/components/log-sheet.js`**

```js
import { getState, itemById, logByDate, loadAll, photoUrl } from '../store.js';
import { saveLog } from '../db/logs.js';
import { nowKey, formatDateLabel, weekdayLabel } from '../utils/dates.js';
import { escapeHtml } from '../utils/dom.js';
import { openSheet, closeSheet } from './modal.js';
import { showToast } from './toast.js';

const WEATHERS = ['晴', '阴', '雨', '冷', '热'];

export function openLogSheet({ date = nowKey(), outfitId = null, itemIds = [] } = {}) {
  const state = getState();
  const existing = logByDate(date);
  const initialMode = outfitId || existing?.outfitId ? 'outfit' : 'items';
  const draft = {
    mode: initialMode,
    outfitId: outfitId ?? existing?.outfitId ?? state.outfits[0]?.id ?? null,
    itemIds: new Set(itemIds.length ? itemIds : (existing?.itemIds ?? [])),
    note: existing?.note ?? '',
    weather: existing?.weather ?? '',
  };

  const content = document.createElement('div');
  content.className = 'log-sheet';
  content.style.display = 'flex';
  content.style.flexDirection = 'column';
  content.style.gap = '12px';
  content.innerHTML = `
    <div class="log-date">${formatDateLabel(date)} · ${weekdayLabel(date)}</div>
    <div class="choice-row" id="mode-choices">
      <button type="button" class="choice-chip" data-mode="outfit" aria-pressed="${draft.mode === 'outfit'}">选搭配</button>
      <button type="button" class="choice-chip" data-mode="items" aria-pressed="${draft.mode === 'items'}">临时选单品</button>
    </div>
    <div id="outfit-pane"></div>
    <div id="items-pane"></div>
    <div class="field">
      <label class="field-label" for="log-note">备注</label>
      <textarea class="text-area" id="log-note" maxlength="300">${escapeHtml(draft.note)}</textarea>
    </div>
    <div class="field">
      <div class="field-label">天气（可选）</div>
      <div class="choice-row" id="weather-choices"></div>
    </div>
    <div class="field-error" id="log-error"></div>
  `;

  const paintModes = () => {
    content.querySelectorAll('[data-mode]').forEach(button => {
      button.setAttribute('aria-pressed', String(button.dataset.mode === draft.mode));
    });
    paintOutfits();
    paintItems();
  };

  const paintOutfits = () => {
    const pane = content.querySelector('#outfit-pane');
    if (draft.mode !== 'outfit') { pane.innerHTML = ''; return; }
    if (!state.outfits.length) {
      pane.innerHTML = '<div class="empty-inline">还没有搭配，切换到「临时选单品」记录。</div>';
      return;
    }
    pane.innerHTML = state.outfits.map(outfit => {
      const ids = outfit.itemIds ?? [];
      const thumb = ids.map(id => photoUrl(itemById(id)?.photoId)).find(Boolean);
      return `
        <button type="button" class="log-option" data-outfit="${outfit.id}" aria-pressed="${draft.outfitId === outfit.id}">
          <span class="log-option-thumb">${thumb ? `<img src="${thumb}" alt="">` : ''}</span>
          <span><b>${escapeHtml(outfit.name)}</b><small>${ids.length} 件单品</small></span>
        </button>
      `;
    }).join('');
    pane.querySelectorAll('[data-outfit]').forEach(button => {
      button.addEventListener('click', () => {
        draft.outfitId = button.dataset.outfit;
        paintOutfits();
      });
    });
  };

  const paintItems = () => {
    const pane = content.querySelector('#items-pane');
    if (draft.mode !== 'items') { pane.innerHTML = ''; return; }
    if (!state.items.length) {
      pane.innerHTML = '<div class="empty-inline">衣橱还是空的，先去录入单品。</div>';
      return;
    }
    pane.innerHTML = `<div class="log-items-grid">${state.items.map(item => {
      const url = photoUrl(item.photoId);
      return `
        <button type="button" class="log-item" data-item="${item.id}" aria-pressed="${draft.itemIds.has(item.id)}">
          <span class="log-item-thumb">${url ? `<img src="${url}" alt="">` : ''}</span>
          <span>${escapeHtml(item.name)}</span>
        </button>
      `;
    }).join('')}</div>`;
    pane.querySelectorAll('[data-item]').forEach(button => {
      button.addEventListener('click', () => {
        const id = button.dataset.item;
        draft.itemIds.has(id) ? draft.itemIds.delete(id) : draft.itemIds.add(id);
        paintItems();
      });
    });
  };

  const paintWeather = () => {
    const row = content.querySelector('#weather-choices');
    row.innerHTML = WEATHERS.map(weather => `
      <button type="button" class="choice-chip" data-weather="${weather}" aria-pressed="${draft.weather === weather}">${weather}</button>
    `).join('');
    row.querySelectorAll('[data-weather]').forEach(button => {
      button.addEventListener('click', () => {
        draft.weather = draft.weather === button.dataset.weather ? '' : button.dataset.weather;
        paintWeather();
      });
    });
  };

  content.querySelector('#mode-choices').addEventListener('click', event => {
    const button = event.target.closest('[data-mode]');
    if (!button) return;
    draft.mode = button.dataset.mode;
    paintModes();
  });
  content.querySelector('#log-note').addEventListener('input', event => {
    draft.note = event.target.value;
  });

  paintModes();
  paintWeather();

  const save = async () => {
    let outfit = null;
    let items = [];
    if (draft.mode === 'outfit') {
      outfit = state.outfits.find(item => item.id === draft.outfitId);
      if (!outfit) { showToast('请选择一套搭配', { type: 'error' }); return; }
      items = outfit.itemIds.map(id => itemById(id)).filter(Boolean);
      if (!items.length) { showToast('这套搭配里的单品已被删除，请先编辑搭配', { type: 'error' }); return; }
    } else {
      items = [...draft.itemIds].map(id => itemById(id)).filter(Boolean);
      if (!items.length) { showToast('请至少选择一件单品', { type: 'error' }); return; }
    }
    try {
      await saveLog({
        id: existing?.id,
        date,
        outfitId: outfit?.id ?? null,
        outfitName: outfit?.name ?? '',
        items,
        note: draft.note,
        weather: draft.weather,
      });
      await loadAll();
      closeSheet();
      showToast('已记录');
    } catch (error) {
      const box = document.getElementById('log-error');
      if (box) box.textContent = error.code === 'DUPLICATE_DATE' ? '这一天已经有记录，请重新打开编辑。' : (error.message || '保存失败');
    }
  };

  openSheet({
    title: existing ? '编辑穿着记录' : '记录穿着',
    content,
    actions: [{ label: '保存记录', variant: 'primary', onClick: save }],
  });
}
```

- [ ] **Step 3: 实现 `js/views/logs.js`**

```js
import { getState, subscribe, logByDate, itemById, photoUrl } from '../store.js';
import { monthGrid, monthLabel, formatDateLabel, weekdayLabel, nowKey, WEEKDAY_LABELS } from '../utils/dates.js';
import { monthlyStats, countIdle } from '../utils/stats.js';
import { escapeHtml } from '../utils/dom.js';
import { openLogSheet } from '../components/log-sheet.js';
import { openSheet } from '../components/modal.js';
import { navigate } from '../router.js';

let unsubscribe = null;
let viewYear = new Date().getFullYear();
let viewMonth = new Date().getMonth();
let selectedDate = nowKey();

export function renderLogs() {
  unsubscribe?.();
  unsubscribe = subscribe(() => paint());
  paint();
  return () => {
    unsubscribe?.();
    unsubscribe = null;
  };
}

function paint() {
  const app = document.getElementById('app');
  const state = getState();
  const cells = monthGrid(viewYear, viewMonth);
  const logDates = new Set(state.logs.map(log => log.date));
  const stats = monthlyStats(state.logs, viewYear, viewMonth);
  const idle = countIdle(state.items, state.logs, nowKey());
  const selectedLog = logByDate(selectedDate);
  app.innerHTML = `
    <div class="page">
      <header class="page-header">
        <div>
          <div class="page-subtitle">Wear Diary</div>
          <h1 class="page-title">穿着记录</h1>
        </div>
        <button class="icon-button" id="today-button" aria-label="回到今天">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><rect x="4" y="5" width="16" height="15" rx="2"/><path d="M8 3v4M16 3v4M4 10h16"/></svg>
        </button>
      </header>
      <div class="month-nav">
        <button class="icon-button" id="prev-month" aria-label="上个月">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M15 5l-7 7 7 7"/></svg>
        </button>
        <strong style="font-family:var(--font-mono);font-size:13px">${monthLabel(viewYear, viewMonth)}</strong>
        <button class="icon-button" id="next-month" aria-label="下个月">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M9 5l7 7-7 7"/></svg>
        </button>
      </div>
      <div class="calendar-week">${WEEKDAY_LABELS.map(label => `<span>${label}</span>`).join('')}</div>
      <div class="calendar" id="calendar">
        ${cells.map(cell => `
          <button type="button" class="calendar-day${cell.inMonth ? '' : ' dim'}${cell.key === selectedDate ? ' selected' : ''}" data-date="${cell.key}" aria-label="${formatDateLabel(cell.key)}">
            ${cell.day}${logDates.has(cell.key) ? '<span class="dot"></span>' : ''}
          </button>
        `).join('')}
      </div>
      <div class="summary-row">
        <span class="summary-pill">本月记录 ${stats.days} 天</span>
        ${stats.mostWorn ? `<span class="summary-pill">最常穿 ${escapeHtml(stats.mostWorn.name)} ×${stats.mostWorn.count}</span>` : ''}
        <span class="summary-pill">闲置 ${idle} 件</span>
      </div>
      <section>
        <div class="page-header" style="margin-bottom:8px">
          <h2 class="page-title" style="font-size:18px">${formatDateLabel(selectedDate)} · ${weekdayLabel(selectedDate)}</h2>
          <button class="ghost-button" id="add-log" style="width:auto;padding:0 12px;font-size:12px">＋ 记录</button>
        </div>
        <div id="day-log"></div>
      </section>
    </div>
  `;

  document.getElementById('prev-month').addEventListener('click', () => {
    viewMonth -= 1;
    if (viewMonth < 0) { viewMonth = 11; viewYear -= 1; }
    selectFirstOfMonth();
    paint();
  });
  document.getElementById('next-month').addEventListener('click', () => {
    viewMonth += 1;
    if (viewMonth > 11) { viewMonth = 0; viewYear += 1; }
    selectFirstOfMonth();
    paint();
  });
  document.getElementById('today-button').addEventListener('click', () => {
    const today = new Date();
    viewYear = today.getFullYear();
    viewMonth = today.getMonth();
    selectedDate = nowKey();
    paint();
  });
  document.getElementById('calendar').addEventListener('click', event => {
    const button = event.target.closest('[data-date]');
    if (!button) return;
    selectedDate = button.dataset.date;
    if (!button.classList.contains('dim')) {
      const [year, month] = selectedDate.split('-').map(Number);
      viewYear = year;
      viewMonth = month - 1;
    }
    paint();
  });
  document.getElementById('add-log').addEventListener('click', () => openLogSheet({ date: selectedDate }));

  const dayLog = document.getElementById('day-log');
  if (!selectedLog) {
    const hint = document.createElement('div');
    hint.className = 'empty-inline';
    hint.textContent = '这一天还没有记录。';
    dayLog.append(hint);
    return;
  }
  const card = document.createElement('button');
  card.type = 'button';
  card.className = 'log-card';
  card.style.width = '100%';
  card.style.textAlign = 'left';
  const thumbs = (selectedLog.itemIds ?? []).slice(0, 5).map(id => {
    const url = photoUrl(itemById(id)?.photoId);
    return `<div>${url ? `<img src="${url}" alt="">` : ''}</div>`;
  }).join('');
  card.innerHTML = `
    <div class="log-card-thumbs">${thumbs}</div>
    <h3>${escapeHtml(selectedLog.outfitName || (selectedLog.itemNames ?? []).join(' · ') || '穿着记录')}</h3>
    ${selectedLog.note ? `<p>${escapeHtml(selectedLog.note)}</p>` : ''}
    ${selectedLog.weather ? `<span class="weather-tag">${escapeHtml(selectedLog.weather)}</span>` : ''}
  `;
  card.addEventListener('click', () => openLogSheet({ date: selectedDate }));
  dayLog.append(card);
}

function selectFirstOfMonth() {
  selectedDate = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-01`;
}
```

- [ ] **Step 4: 在 `js/views/item-detail.js` 增加「记录今天穿它」按钮**

在顶部加入：

```js
import { openLogSheet } from '../components/log-sheet.js';
import { nowKey } from '../utils/dates.js';
```

在 `const actions = document.getElementById('detail-actions');` 之后、创建 `editButton` 之前加入：

```js
  const logButton = document.createElement('button');
  logButton.type = 'button';
  logButton.className = 'primary-button';
  logButton.textContent = '记录今天穿它';
  logButton.addEventListener('click', () => openLogSheet({ date: nowKey(), itemIds: [item.id] }));
```

并把最后的 `actions.append(editButton, deleteButton);` 改为：

```js
  actions.append(logButton, editButton, deleteButton);
```

- [ ] **Step 5: 在 `js/app.js` 注册记录路由**

顶部加入：

```js
import { renderLogs } from './views/logs.js';
```

路由注册部分加入：

```js
  register('/logs', renderLogs);
```

- [ ] **Step 6: 验证记录流程**

Run: `npm run dev`

手动检查：
1. 进入「记录」页，看到当月日历与统计胶囊。
2. 点「＋ 记录」，选择刚录入的单品，可加备注与天气，保存。
3. 日历当天出现青绿圆点，下方显示记录卡片。
4. 再次点同一天记录，表单显示已有内容并可编辑。
5. 在单品详情点「记录今天穿它」，直接打开单选单品的记录表单。
6. 刷新页面后记录仍在。

---

## Task 7：搭配列表、详情与编辑

**Files:**
- Create: `js/views/outfits.js`
- Create: `js/views/outfit-detail.js`
- Create: `js/views/outfit-edit.js`
- Modify: `js/app.js`
- Modify: `css/app.css`

- [ ] **Step 1: 追加搭配样式到 `css/app.css`**

```css
.outfit-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px 12px; }
.outfit-card { border: 0; background: transparent; padding: 0; text-align: left; min-width: 0; }
.outfit-cover {
  display: grid; grid-template-columns: 1fr 1fr; gap: 3px;
  background: var(--card); border: 5px solid var(--card); box-shadow: var(--shadow-photo);
  aspect-ratio: 1 / 1; overflow: hidden;
}
.outfit-cover > div { background: var(--sand); display: flex; align-items: center; justify-content: center; overflow: hidden; }
.outfit-cover img { width: 100%; height: 100%; object-fit: cover; }
.outfit-name { font-size: 14px; font-weight: 600; margin-top: 7px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.outfit-meta { font-family: var(--font-mono); font-size: 10px; color: var(--ink-soft); }
.outfit-item-row {
  display: flex; gap: 10px; align-items: center; padding: 7px 0;
  border: 0; border-bottom: 1px dashed var(--line); width: 100%;
  background: transparent; text-align: left;
}
.outfit-item-row .thumb { width: 40px; height: 48px; background: var(--sand); flex: 0 0 auto; overflow: hidden; }
.outfit-item-row img { width: 100%; height: 100%; object-fit: cover; }
.outfit-item-row .nm { font-size: 13px; font-weight: 500; }
.outfit-item-row .ct { font-size: 10px; color: var(--ink-soft); }
.item-choose-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 6px; max-height: 320px; overflow-y: auto; }
.item-choose {
  border: 2px solid transparent; background: var(--sand); padding: 0;
  position: relative; aspect-ratio: 1; overflow: hidden;
}
.item-choose[aria-pressed="true"] { border-color: var(--teal); }
.item-choose img { width: 100%; height: 100%; object-fit: cover; }
.item-choose .choose-name {
  position: absolute; left: 0; right: 0; bottom: 0; font-size: 9px;
  background: rgba(59, 47, 38, .65); color: #fff; padding: 2px 3px;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.item-choose .check {
  position: absolute; top: 4px; right: 4px; width: 18px; height: 18px;
  border-radius: 50%; background: var(--card); border: 1px solid var(--line-strong);
  display: flex; align-items: center; justify-content: center; font-size: 11px; color: var(--teal);
}
.item-choose[aria-pressed="true"] .check { background: var(--teal); color: #fff; border-color: var(--teal); }
```

- [ ] **Step 2: 实现 `js/views/outfits.js`**

```js
import { getState, subscribe, photoUrl, itemById } from '../store.js';
import { escapeHtml } from '../utils/dom.js';
import { SEASON_LABELS, OCCASION_LABELS } from '../utils/validation.js';
import { emptyState } from '../components/empty-state.js';
import { navigate } from '../router.js';

let unsubscribe = null;

export function renderOutfits() {
  unsubscribe?.();
  unsubscribe = subscribe(() => paint());
  paint();
  return () => {
    unsubscribe?.();
    unsubscribe = null;
  };
}

export function outfitCoverHtml(outfit) {
  const ids = (outfit.itemIds ?? []).slice(0, 4);
  const cells = ids.map(id => {
    const url = photoUrl(itemById(id)?.photoId);
    return `<div>${url ? `<img src="${url}" alt="">` : ''}</div>`;
  });
  while (cells.length < 4) cells.push('<div></div>');
  return `<div class="outfit-cover">${cells.join('')}</div>`;
}

function paint() {
  const app = document.getElementById('app');
  const state = getState();
  app.innerHTML = `
    <div class="page">
      <header class="page-header">
        <div>
          <div class="page-subtitle">Saved Looks</div>
          <h1 class="page-title">搭配</h1>
          <div class="page-meta">${state.outfits.length} 套搭配</div>
        </div>
        <button class="icon-button" id="add-outfit" aria-label="新建搭配">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 5v14M5 12h14"/></svg>
        </button>
      </header>
      <div id="outfit-grid" class="outfit-grid"></div>
    </div>
  `;
  document.getElementById('add-outfit').addEventListener('click', () => navigate('/outfit/new'));
  const grid = document.getElementById('outfit-grid');
  if (!state.outfits.length) {
    grid.append(emptyState({
      title: '还没有搭配',
      description: '把常穿的单品组合起来，出门前直接选一套。',
      actionLabel: state.items.length ? '新建第一套搭配' : '先去录入单品',
      onAction: () => navigate(state.items.length ? '/outfit/new' : '/item/new'),
    }));
    return;
  }
  for (const outfit of state.outfits) {
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'outfit-card';
    card.setAttribute('aria-label', `查看 ${outfit.name}`);
    const seasonText = (outfit.seasons ?? []).map(s => SEASON_LABELS[s] ?? s).join('');
    const occasionText = (outfit.occasions ?? []).map(o => OCCASION_LABELS[o] ?? o).join(' · ');
    card.innerHTML = `
      ${outfitCoverHtml(outfit)}
      <div class="outfit-name">${escapeHtml(outfit.name)}</div>
      <div class="outfit-meta">${(outfit.itemIds ?? []).length} 件${seasonText ? ` · ${seasonText}` : ''}${occasionText ? ` · ${occasionText}` : ''}</div>
    `;
    card.addEventListener('click', () => navigate(`/outfit/${outfit.id}`));
    grid.append(card);
  }
}
```

- [ ] **Step 3: 实现 `js/views/outfit-detail.js`**

```js
import { getState, outfitById, itemById, loadAll } from '../store.js';
import { escapeHtml } from '../utils/dom.js';
import { SEASON_LABELS, OCCASION_LABELS } from '../utils/validation.js';
import { formatDateLabel, nowKey } from '../utils/dates.js';
import { emptyState } from '../components/empty-state.js';
import { confirmDialog } from '../components/modal.js';
import { showToast } from '../components/toast.js';
import { openLogSheet } from '../components/log-sheet.js';
import { deleteOutfit } from '../db/outfits.js';
import { outfitCoverHtml } from './outfits.js';
import { navigate } from '../router.js';

export function renderOutfitDetail({ id }) {
  const app = document.getElementById('app');
  const outfit = outfitById(id);
  if (!outfit) {
    app.innerHTML = '';
    app.append(emptyState({ title: '搭配不存在', description: '它可能已经被删除。', actionLabel: '返回搭配', onAction: () => navigate('/outfits') }));
    return () => {};
  }
  const state = getState();
  const items = (outfit.itemIds ?? []).map(itemId => itemById(itemId));
  const existingItems = items.filter(Boolean);
  const outfitLogs = state.logs.filter(log => log.outfitId === outfit.id);
  const lastWorn = outfitLogs.reduce((max, log) => (log.date > max ? log.date : max), '');
  const seasonText = (outfit.seasons ?? []).map(s => SEASON_LABELS[s] ?? s).join('、');
  const occasionText = (outfit.occasions ?? []).map(o => OCCASION_LABELS[o] ?? o).join('、');
  app.innerHTML = `
    <div class="page">
      <header class="page-header">
        <button class="icon-button" id="back-button" aria-label="返回">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M15 5l-7 7 7 7"/></svg>
        </button>
        <div style="flex:1;text-align:center"><div class="page-subtitle">Look No.${String(outfit.code ?? 0).padStart(2, '0')}</div></div>
        <span style="width:44px"></span>
      </header>
      ${outfitCoverHtml(outfit)}
      <div>
        <h1 class="page-title" style="font-size:24px">${escapeHtml(outfit.name)}</h1>
        <div class="tag-row" style="margin-top:8px">
          ${seasonText ? `<span class="tag accent">${escapeHtml(seasonText)}</span>` : ''}
          ${occasionText ? `<span class="tag">${escapeHtml(occasionText)}</span>` : ''}
          <span class="tag">${existingItems.length} 件单品</span>
          ${outfit.favorite ? '<span class="tag">已收藏</span>' : ''}
        </div>
      </div>
      <div id="outfit-items"></div>
      ${items.length !== existingItems.length ? `<div class="empty-inline">有 ${items.length - existingItems.length} 件单品已被删除，请编辑搭配补充。</div>` : ''}
      ${outfit.note ? `<p style="font-size:13px;color:var(--ink-soft)">${escapeHtml(outfit.note)}</p>` : ''}
      <div class="stat-row">
        <div class="stat-item"><b>${outfitLogs.length}</b><span>穿过</span></div>
        <div class="stat-item"><b>${lastWorn ? formatDateLabel(lastWorn) : '—'}</b><span>最近穿着</span></div>
        <div class="stat-item"><b>${existingItems.length}</b><span>可用单品</span></div>
      </div>
      <div class="detail-actions" id="outfit-actions"></div>
    </div>
  `;
  const itemsBox = document.getElementById('outfit-items');
  for (const item of items) {
    if (!item) {
      const row = document.createElement('div');
      row.className = 'outfit-item-row';
      row.innerHTML = '<span class="thumb"></span><span><span class="nm">已删除的单品</span><br><span class="ct">请编辑搭配</span></span>';
      itemsBox.append(row);
      continue;
    }
    const row = document.createElement('button');
    row.type = 'button';
    row.className = 'outfit-item-row';
    const url = (await import('../store.js')).photoUrl(item.photoId);
    row.innerHTML = `
      <span class="thumb">${url ? `<img src="${url}" alt="">` : ''}</span>
      <span><span class="nm">${escapeHtml(item.name)}</span><br><span class="ct">${escapeHtml(item.category)}</span></span>
    `;
    row.addEventListener('click', () => navigate(`/item/${item.id}`));
    itemsBox.append(row);
  }
  document.getElementById('back-button').addEventListener('click', () => {
    if (history.length > 1) history.back();
    else navigate('/outfits');
  });
  const actions = document.getElementById('outfit-actions');
  const logButton = document.createElement('button');
  logButton.type = 'button';
  logButton.className = 'primary-button';
  logButton.textContent = '今天穿这套';
  logButton.addEventListener('click', () => openLogSheet({ date: nowKey(), outfitId: outfit.id }));
  const editButton = document.createElement('button');
  editButton.type = 'button';
  editButton.className = 'ghost-button';
  editButton.textContent = '编辑搭配';
  editButton.addEventListener('click', () => navigate(`/outfit/${outfit.id}/edit`));
  const deleteButton = document.createElement('button');
  deleteButton.type = 'button';
  deleteButton.className = 'danger-button';
  deleteButton.textContent = '删除搭配';
  deleteButton.addEventListener('click', async () => {
    const ok = await confirmDialog({
      title: '删除搭配',
      message: `确定删除「${outfit.name}」吗？历史穿着记录会保留。`,
      confirmText: '删除',
      danger: true,
    });
    if (!ok) return;
    await deleteOutfit(outfit.id);
    await loadAll();
    showToast('已删除');
    navigate('/outfits');
  });
  actions.append(logButton, editButton, deleteButton);
  return () => {};
}
```

- [ ] **Step 4: 实现 `js/views/outfit-edit.js`**

```js
import { getState, outfitById, photoUrl, loadAll } from '../store.js';
import { saveOutfit } from '../db/outfits.js';
import { validateOutfit, hasErrors, SEASONS, OCCASIONS, SEASON_LABELS, OCCASION_LABELS } from '../utils/validation.js';
import { escapeHtml } from '../utils/dom.js';
import { showToast } from '../components/toast.js';
import { navigate } from '../router.js';

export function renderOutfitEdit({ id = 'new' } = {}) {
  const state = getState();
  const existing = id && id !== 'new' ? outfitById(id) : null;
  if (id !== 'new' && !existing) {
    showToast('搭配不存在', { type: 'error' });
    navigate('/outfits');
    return () => {};
  }
  const app = document.getElementById('app');
  const selected = {
    itemIds: new Set(existing?.itemIds ?? []),
    seasons: new Set(existing?.seasons ?? []),
    occasions: new Set(existing?.occasions ?? []),
    favorite: Boolean(existing?.favorite),
  };
  app.innerHTML = `
    <div class="page">
      <header class="page-header">
        <button class="icon-button" id="back-button" aria-label="返回">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M15 5l-7 7 7 7"/></svg>
        </button>
        <h1 class="page-title" style="font-size:22px;flex:1;text-align:center">${existing ? '编辑搭配' : '新建搭配'}</h1>
        <span style="width:44px"></span>
      </header>
      <form class="form-grid" id="outfit-form" novalidate>
        <div class="field">
          <label class="field-label" for="outfit-name">名称 *</label>
          <input class="text-input" id="outfit-name" maxlength="60" value="${escapeHtml(existing?.name ?? '')}" required>
          <div class="field-error" id="error-name"></div>
        </div>
        <div class="field">
          <div class="field-label">选择单品 * <span id="selected-count">${selected.itemIds.size}</span> 件</div>
          <div id="item-choices" class="item-choose-grid"></div>
          <div class="field-error" id="error-items"></div>
          ${state.items.length ? '' : '<div class="empty-inline">衣橱还是空的，先去录入单品。</div>'}
        </div>
        <div class="field">
          <div class="field-label">季节</div>
          <div class="choice-row" id="season-choices">
            ${SEASONS.map(key => `<button type="button" class="choice-chip" data-season="${key}" aria-pressed="${selected.seasons.has(key)}">${SEASON_LABELS[key]}</button>`).join('')}
          </div>
        </div>
        <div class="field">
          <div class="field-label">场合</div>
          <div class="choice-row" id="occasion-choices">
            ${OCCASIONS.map(key => `<button type="button" class="choice-chip" data-occasion="${key}" aria-pressed="${selected.occasions.has(key)}">${OCCASION_LABELS[key]}</button>`).join('')}
          </div>
        </div>
        <div class="field">
          <label class="field-label" for="outfit-note">备注</label>
          <textarea class="text-area" id="outfit-note" maxlength="500">${escapeHtml(existing?.note ?? '')}</textarea>
        </div>
        <div class="field">
          <div class="field-label">收藏</div>
          <div class="choice-row"><button type="button" class="choice-chip" id="favorite-toggle" aria-pressed="${selected.favorite}">加入收藏</button></div>
        </div>
        <button type="submit" class="primary-button" id="save-button">保存搭配</button>
      </form>
    </div>
  `;

  const choices = document.getElementById('item-choices');
  const paintChoices = () => {
    choices.innerHTML = state.items.map(item => {
      const url = photoUrl(item.photoId);
      const active = selected.itemIds.has(item.id);
      return `
        <button type="button" class="item-choose" data-item="${item.id}" aria-pressed="${active}" aria-label="${escapeHtml(item.name)}">
          ${url ? `<img src="${url}" alt="">` : ''}
          <span class="choose-name">${escapeHtml(item.name)}</span>
          <span class="check">${active ? '✓' : ''}</span>
        </button>
      `;
    }).join('');
    choices.querySelectorAll('[data-item]').forEach(button => {
      button.addEventListener('click', () => {
        const itemId = button.dataset.item;
        selected.itemIds.has(itemId) ? selected.itemIds.delete(itemId) : selected.itemIds.add(itemId);
        document.getElementById('selected-count').textContent = selected.itemIds.size;
        paintChoices();
      });
    });
  };
  paintChoices();

  document.getElementById('back-button').addEventListener('click', () => {
    if (history.length > 1) history.back();
    else navigate('/outfits');
  });
  document.getElementById('favorite-toggle').addEventListener('click', event => {
    selected.favorite = !selected.favorite;
    event.currentTarget.setAttribute('aria-pressed', String(selected.favorite));
  });
  document.getElementById('season-choices').addEventListener('click', event => {
    const button = event.target.closest('[data-season]');
    if (!button) return;
    const key = button.dataset.season;
    selected.seasons.has(key) ? selected.seasons.delete(key) : selected.seasons.add(key);
    button.setAttribute('aria-pressed', String(selected.seasons.has(key)));
  });
  document.getElementById('occasion-choices').addEventListener('click', event => {
    const button = event.target.closest('[data-occasion]');
    if (!button) return;
    const key = button.dataset.occasion;
    selected.occasions.has(key) ? selected.occasions.delete(key) : selected.occasions.add(key);
    button.setAttribute('aria-pressed', String(selected.occasions.has(key)));
  });

  document.getElementById('outfit-form').addEventListener('submit', async event => {
    event.preventDefault();
    const form = {
      id: existing?.id,
      name: document.getElementById('outfit-name').value,
      itemIds: [...selected.itemIds],
      seasons: [...selected.seasons],
      occasions: [...selected.occasions],
      note: document.getElementById('outfit-note').value,
      favorite: selected.favorite,
    };
    const errors = validateOutfit(form);
    document.getElementById('error-name').textContent = errors.name ?? '';
    document.getElementById('error-items').textContent = errors.itemIds ?? '';
    if (hasErrors(errors)) return;
    const button = document.getElementById('save-button');
    button.disabled = true;
    button.textContent = '保存中…';
    try {
      const saved = await saveOutfit(form);
      await loadAll();
      showToast('已保存');
      navigate(`/outfit/${saved.id}`);
    } catch (error) {
      showToast(error?.errors ? Object.values(error.errors)[0] : '保存失败，请重试', { type: 'error' });
      button.disabled = false;
      button.textContent = '保存搭配';
    }
  });

  return () => {};
}
```

- [ ] **Step 5: 在 `js/app.js` 注册搭配路由**

顶部加入：

```js
import { renderOutfits } from './views/outfits.js';
import { renderOutfitDetail } from './views/outfit-detail.js';
import { renderOutfitEdit } from './views/outfit-edit.js';
```

路由注册部分加入（`/outfit/new` 必须在 `/outfit/:id` 之前）：

```js
  register('/outfits', renderOutfits);
  register('/outfit/new', renderOutfitEdit);
  register('/outfit/:id/edit', renderOutfitEdit);
  register('/outfit/:id', renderOutfitDetail);
```

- [ ] **Step 6: 验证搭配流程**

Run: `npm run dev`

手动检查：
1. 进入「搭配」页，点「＋」新建搭配。
2. 输入名称，选择至少两件单品，保存。
3. 列表出现拼贴封面；点进详情，看到单品清单与穿着统计。
4. 点「今天穿这套」，记录表单预选该搭配，保存后记录页出现圆点。
5. 编辑搭配、增删单品后保存，详情更新。
6. 删除搭配后列表移除，历史记录仍保留搭配名称快照。

---

## Task 8：设置、分类颜色管理与备份导入导出

**Files:**
- Create: `js/db/backups.js`
- Test: `tests/backup.test.js`
- Create: `js/views/settings.js`
- Modify: `js/app.js`
- Modify: `css/app.css`

- [ ] **Step 1: 先写 `tests/backup.test.js`**

```js
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
```

- [ ] **Step 2: 运行测试确认失败**

Run: `node --test tests/backup.test.js`
Expected: FAIL，`js/db/backups.js` 不存在。

- [ ] **Step 3: 实现 `js/db/backups.js`**

```js
import { getAll, runTransaction } from './db.js';
import { blobToDataUrl, dataUrlToBlob } from '../utils/image.js';
import { saveSetting } from './settings.js';

export const BACKUP_APP = 'wardrobe-pwa';
export const BACKUP_VERSION = 1;

export function validateBackup(payload) {
  const errors = [];
  if (!payload || typeof payload !== 'object') {
    return { ok: false, errors: ['备份文件内容为空或格式不正确'] };
  }
  if (payload.app !== BACKUP_APP) errors.push('不是本应用的备份文件');
  if (!Number.isInteger(payload.schemaVersion) || payload.schemaVersion < 1) errors.push('备份版本无效');
  else if (payload.schemaVersion > BACKUP_VERSION) errors.push('备份文件来自更高版本，请先更新应用');
  const data = payload.data;
  if (!data || typeof data !== 'object') {
    errors.push('缺少 data 数据');
  } else {
    for (const key of ['items', 'outfits', 'wearLogs', 'settings', 'photos']) {
      if (!Array.isArray(data[key])) errors.push(`缺少 ${key} 数组`);
    }
  }
  if (errors.length) return { ok: false, errors };
  for (const item of data.items) {
    if (!item?.id || typeof item.name !== 'string' || !item.name.trim()) {
      errors.push('存在无效的单品数据');
      break;
    }
  }
  for (const outfit of data.outfits) {
    if (!outfit?.id || typeof outfit.name !== 'string' || !outfit.name.trim() || !Array.isArray(outfit.itemIds)) {
      errors.push('存在无效的搭配数据');
      break;
    }
  }
  for (const log of data.wearLogs) {
    if (!log?.id || !/^\d{4}-\d{2}-\d{2}$/.test(log.date ?? '') || !Array.isArray(log.itemIds)) {
      errors.push('存在无效的穿着记录');
      break;
    }
  }
  for (const photo of data.photos) {
    if (!photo?.id || typeof photo.thumb !== 'string' || !photo.thumb.startsWith('data:image/')
      || typeof photo.full !== 'string' || !photo.full.startsWith('data:image/')) {
      errors.push('存在损坏的照片数据');
      break;
    }
  }
  return { ok: errors.length === 0, errors };
}

export async function buildBackup() {
  const [items, outfits, wearLogs, settings, photos] = await Promise.all([
    getAll('items'), getAll('outfits'), getAll('wearLogs'), getAll('settings'), getAll('photos'),
  ]);
  const photoPayload = [];
  for (const photo of photos) {
    photoPayload.push({
      id: photo.id,
      thumb: await blobToDataUrl(photo.thumb),
      full: await blobToDataUrl(photo.full),
      width: photo.width,
      height: photo.height,
      createdAt: photo.createdAt,
    });
  }
  return {
    app: BACKUP_APP,
    schemaVersion: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    data: { items, outfits, wearLogs, settings, photos: photoPayload },
  };
}

export async function exportBackupFile() {
  const payload = await buildBackup();
  const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `wardrobe-backup-${payload.exportedAt.slice(0, 10)}.json`;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  await saveSetting('lastBackupAt', payload.exportedAt);
  return payload;
}

export async function readBackupFile(file) {
  let payload;
  try {
    payload = JSON.parse(await file.text());
  } catch {
    throw new Error('文件不是有效的 JSON');
  }
  const result = validateBackup(payload);
  if (!result.ok) throw new Error(result.errors.join('；'));
  return payload;
}

export async function applyBackup(payload) {
  const photos = payload.data.photos.map(photo => ({
    ...photo,
    thumb: dataUrlToBlob(photo.thumb),
    full: dataUrlToBlob(photo.full),
  }));
  await runTransaction(['items', 'photos', 'outfits', 'wearLogs', 'settings'], 'readwrite', tx => {
    for (const name of ['items', 'photos', 'outfits', 'wearLogs', 'settings']) {
      tx.objectStore(name).clear();
    }
    for (const value of payload.data.items) tx.objectStore('items').put(value);
    for (const value of photos) tx.objectStore('photos').put(value);
    for (const value of payload.data.outfits) tx.objectStore('outfits').put(value);
    for (const value of payload.data.wearLogs) tx.objectStore('wearLogs').put(value);
    for (const value of payload.data.settings) tx.objectStore('settings').put(value);
  });
  return payload;
}

export async function importBackupFile(file) {
  return applyBackup(await readBackupFile(file));
}
```

- [ ] **Step 4: 运行测试确认通过**

Run: `node --test tests/backup.test.js`
Expected: PASS，4 个测试全部通过。

- [ ] **Step 5: 追加设置页样式到 `css/app.css`**

```css
.settings-section { display: flex; flex-direction: column; gap: 10px; padding-top: 12px; border-top: 1px dashed var(--line); }
.settings-section h2 { font-family: var(--font-heading); font-size: 17px; }
.settings-row { display: flex; align-items: center; justify-content: space-between; gap: 8px; min-height: 44px; }
.settings-row .name { font-size: 13px; }
.settings-actions { display: flex; gap: 6px; }
.mini-button {
  min-height: 36px; padding: 0 10px; border: 1px solid var(--line-strong);
  background: var(--paper-soft); color: var(--ink-soft);
  border-radius: var(--radius-sm); font-size: 12px;
}
.mini-button.danger { color: var(--danger); border-color: var(--danger); }
.add-row { display: flex; gap: 6px; }
.add-row .text-input { flex: 1; min-width: 0; }
.add-row .primary-button { width: auto; padding: 0 14px; }
.color-dot {
  width: 14px; height: 14px; border-radius: 50%; border: 1px solid var(--line-strong);
  display: inline-block; vertical-align: middle; margin-right: 6px;
}
.storage-line { font-family: var(--font-mono); font-size: 12px; color: var(--ink-soft); }
```

- [ ] **Step 6: 实现 `js/views/settings.js`**

```js
import { getState, subscribe, loadAll } from '../store.js';
import { saveSettings, renameCategory, renameColor, COLOR_HEX } from '../db/settings.js';
import { exportBackupFile, readBackupFile, applyBackup } from '../db/backups.js';
import { escapeHtml } from '../utils/dom.js';
import { openSheet, closeSheet, confirmDialog } from '../components/modal.js';
import { showToast } from '../components/toast.js';

let unsubscribe = null;

export function renderSettings() {
  unsubscribe?.();
  unsubscribe = subscribe(() => paint());
  paint();
  return () => {
    unsubscribe?.();
    unsubscribe = null;
  };
}

function paint() {
  const app = document.getElementById('app');
  const state = getState();
  app.innerHTML = `
    <div class="page">
      <header class="page-header">
        <div>
          <div class="page-subtitle">My Closet</div>
          <h1 class="page-title">我的</h1>
        </div>
      </header>
      <section class="settings-section">
        <h2>数据备份</h2>
        <p class="page-meta">数据只存在这台手机的浏览器里。换手机或清理浏览器前，请先导出备份。</p>
        <button class="primary-button" id="export-button">导出备份文件</button>
        <label class="ghost-button" for="import-file" style="text-align:center">导入备份文件</label>
        <input id="import-file" type="file" accept="application/json,.json" hidden>
        <div class="storage-line" id="backup-time">最近备份：${state.settings.lastBackupAt ? new Date(state.settings.lastBackupAt).toLocaleString('zh-CN') : '从未备份'}</div>
      </section>
      <section class="settings-section">
        <h2>存储占用</h2>
        <div class="storage-line" id="storage-line">正在读取…</div>
        <div class="storage-line">${state.items.length} 件单品 · ${state.outfits.length} 套搭配 · ${state.logs.length} 条记录</div>
      </section>
      <section class="settings-section">
        <h2>分类</h2>
        <div id="category-list"></div>
        <div class="add-row">
          <input class="text-input" id="new-category" maxlength="20" placeholder="新增分类">
          <button class="primary-button" id="add-category">添加</button>
        </div>
      </section>
      <section class="settings-section">
        <h2>颜色</h2>
        <div id="color-list"></div>
        <div class="add-row">
          <input class="text-input" id="new-color" maxlength="20" placeholder="新增颜色">
          <button class="primary-button" id="add-color">添加</button>
        </div>
      </section>
      <section class="settings-section">
        <h2>安装到桌面</h2>
        <p class="page-meta">用安卓 Chrome 打开本页 → 右上角菜单 → 「安装应用」或「添加到主屏幕」。之后可以像普通 App 一样离线打开。</p>
      </section>
      <section class="settings-section">
        <h2>关于</h2>
        <p class="page-meta">我的衣橱 · 版本 1.0.0<br>本地优先，无账号，无云同步。导出的备份文件包含个人照片，请妥善保管。</p>
      </section>
    </div>
  `;

  document.getElementById('export-button').addEventListener('click', async () => {
    try {
      await exportBackupFile();
      await loadAll();
      showToast('备份已导出');
    } catch (error) {
      showToast(error.message || '导出失败', { type: 'error' });
    }
  });

  document.getElementById('import-file').addEventListener('change', async event => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    try {
      const payload = await readBackupFile(file);
      const counts = `${payload.data.items.length} 件单品、${payload.data.outfits.length} 套搭配、${payload.data.wearLogs.length} 条记录`;
      const content = document.createElement('p');
      content.style.fontSize = '13px';
      content.style.color = 'var(--ink-soft)';
      content.textContent = `备份包含 ${counts}。导入会覆盖当前全部数据，且无法撤销。建议先导出一份当前数据。`;
      openSheet({
        title: '导入备份',
        content,
        actions: [
          {
            label: '覆盖导入',
            variant: 'primary',
            onClick: async () => {
              closeSheet();
              try {
                await applyBackup(payload);
                await loadAll();
                showToast('导入完成');
              } catch (error) {
                showToast(error.message || '导入失败', { type: 'error' });
              }
            },
          },
          {
            label: '先导出一份当前数据',
            variant: 'ghost',
            onClick: async () => {
              closeSheet();
              try {
                await exportBackupFile();
                await loadAll();
                showToast('当前数据已导出');
              } catch (error) {
                showToast(error.message || '导出失败', { type: 'error' });
              }
            },
          },
          { label: '取消', variant: 'ghost', onClick: closeSheet },
        ],
      });
    } catch (error) {
      showToast(error.message || '备份文件无效', { type: 'error' });
    }
  });

  navigator.storage?.estimate?.().then(({ usage = 0, quota = 0 }) => {
    const line = document.getElementById('storage-line');
    if (!line) return;
    const mb = value => `${(value / 1048576).toFixed(1)} MB`;
    line.textContent = quota ? `已用 ${mb(usage)} / 可用约 ${mb(quota)}` : `已用 ${mb(usage)}`;
  }).catch(() => {});

  renderCategoryList();
  renderColorList();
  document.getElementById('add-category').addEventListener('click', () => addValue('category'));
  document.getElementById('add-color').addEventListener('click', () => addValue('color'));
}

function renderCategoryList() {
  const state = getState();
  const list = document.getElementById('category-list');
  if (!list) return;
  list.innerHTML = state.settings.categories.map(name => `
    <div class="settings-row">
      <span class="name">${escapeHtml(name)}</span>
      <span class="settings-actions">
        <button type="button" class="mini-button" data-rename-category="${escapeHtml(name)}">重命名</button>
        <button type="button" class="mini-button danger" data-delete-category="${escapeHtml(name)}">删除</button>
      </span>
    </div>
  `).join('');
  list.querySelectorAll('[data-rename-category]').forEach(button => {
    button.addEventListener('click', () => openRename('category', button.dataset.renameCategory));
  });
  list.querySelectorAll('[data-delete-category]').forEach(button => {
    button.addEventListener('click', () => removeValue('category', button.dataset.deleteCategory));
  });
}

function renderColorList() {
  const state = getState();
  const list = document.getElementById('color-list');
  if (!list) return;
  list.innerHTML = state.settings.colors.map(name => `
    <div class="settings-row">
      <span class="name"><span class="color-dot" style="background:${COLOR_HEX[name] ?? '#C9A9A9'}"></span>${escapeHtml(name)}</span>
      <span class="settings-actions">
        <button type="button" class="mini-button" data-rename-color="${escapeHtml(name)}">重命名</button>
        <button type="button" class="mini-button danger" data-delete-color="${escapeHtml(name)}">删除</button>
      </span>
    </div>
  `).join('');
  list.querySelectorAll('[data-rename-color]').forEach(button => {
    button.addEventListener('click', () => openRename('color', button.dataset.renameColor));
  });
  list.querySelectorAll('[data-delete-color]').forEach(button => {
    button.addEventListener('click', () => removeValue('color', button.dataset.deleteColor));
  });
}

function openRename(kind, oldName) {
  const content = document.createElement('div');
  content.className = 'field';
  content.innerHTML = `<label class="field-label" for="rename-input">新的名称</label><input class="text-input" id="rename-input" maxlength="20" value="${escapeHtml(oldName)}">`;
  openSheet({
    title: kind === 'category' ? '重命名分类' : '重命名颜色',
    content,
    actions: [{
      label: '保存',
      variant: 'primary',
      onClick: async () => {
        const value = content.querySelector('#rename-input').value.trim();
        if (!value) { showToast('名称不能为空', { type: 'error' }); return; }
        if (kind === 'category') await renameCategory(oldName, value);
        else await renameColor(oldName, value);
        closeSheet();
        await loadAll();
        showToast('已更新');
      },
    }],
  });
}

async function removeValue(kind, name) {
  const state = getState();
  const ok = await confirmDialog({
    title: kind === 'category' ? '删除分类' : '删除颜色',
    message: `确定从预设中删除「${name}」吗？已经使用该值的单品不会被修改。`,
    confirmText: '删除',
    danger: true,
  });
  if (!ok) return;
  if (kind === 'category') {
    await saveSettings({ categories: state.settings.categories.filter(value => value !== name) });
  } else {
    await saveSettings({ colors: state.settings.colors.filter(value => value !== name) });
  }
  await loadAll();
  showToast('已删除');
}

async function addValue(kind) {
  const input = document.getElementById(kind === 'category' ? 'new-category' : 'new-color');
  const value = input.value.trim();
  if (!value) { showToast('请输入名称', { type: 'error' }); return; }
  const state = getState();
  const list = kind === 'category' ? state.settings.categories : state.settings.colors;
  if (list.includes(value)) { showToast('这个名称已经存在', { type: 'error' }); return; }
  if (kind === 'category') await saveSettings({ categories: [...list, value] });
  else await saveSettings({ colors: [...list, value] });
  input.value = '';
  await loadAll();
  showToast('已添加');
}
```

- [ ] **Step 7: 在 `js/app.js` 注册设置路由**

顶部加入：

```js
import { renderSettings } from './views/settings.js';
```

路由注册部分加入：

```js
  register('/settings', renderSettings);
```

- [ ] **Step 8: 验证设置与备份**

Run: `npm test && npm run dev`

手动检查：
1. 「我的」页显示备份、存储占用、分类、颜色、安装说明。
2. 新增/重命名/删除分类与颜色，衣橱录入页的选项同步更新。
3. 导出备份，浏览器下载 JSON 文件。
4. 删除一件单品后导入刚才的备份，单品、照片、搭配、记录全部恢复。
5. 导入损坏的 JSON 时提示具体错误，原数据不变。

---

## Task 9：PWA、离线缓存与图标

**Files:**
- Create: `manifest.webmanifest`
- Create: `sw.js`
- Create: `icons/icon.svg`
- Create: `scripts/generate-icons.mjs`
- Modify: `js/app.js`

- [ ] **Step 1: 创建 `manifest.webmanifest`**

```json
{
  "name": "我的衣橱",
  "short_name": "衣橱",
  "description": "本地优先的个人衣橱与穿搭记录",
  "lang": "zh-CN",
  "start_url": "./",
  "scope": "./",
  "display": "standalone",
  "orientation": "portrait",
  "background_color": "#F5E6C8",
  "theme_color": "#F5E6C8",
  "icons": [
    { "src": "./icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "./icons/icon-512.png", "sizes": "512x512", "type": "image/png" },
    { "src": "./icons/icon-maskable-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
  ]
}
```

- [ ] **Step 2: 创建 `sw.js`**

```js
const CACHE = 'wardrobe-v5';
const CORE = [
  './',
  './index.html',
  './css/tokens.css',
  './css/app.css',
  './js/app.js',
  './js/store.js',
  './js/router.js',
  './js/db/db.js',
  './js/db/photos.js',
  './js/db/items.js',
  './js/db/outfits.js',
  './js/db/logs.js',
  './js/db/settings.js',
  './js/db/backups.js',
  './js/views/wardrobe.js',
  './js/views/item-detail.js',
  './js/views/item-edit.js',
  './js/views/outfits.js',
  './js/views/outfit-detail.js',
  './js/views/outfit-edit.js',
  './js/views/logs.js',
  './js/views/settings.js',
  './js/components/nav.js',
  './js/components/modal.js',
  './js/components/toast.js',
  './js/components/log-sheet.js',
  './js/components/photo-input.js',
  './js/components/empty-state.js',
  './js/utils/dates.js',
  './js/utils/stats.js',
  './js/utils/filters.js',
  './js/utils/validation.js',
  './js/utils/image.js',
  './js/utils/id.js',
  './js/utils/dom.js',
  './manifest.webmanifest',
  './icons/icon.svg',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(CORE)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then(response => {
          const copy = response.clone();
          caches.open(CACHE).then(cache => cache.put(request, copy));
          return response;
        })
        .catch(() => caches.match(request).then(cached => cached || caches.match('./index.html')))
    );
    return;
  }

  event.respondWith(
    caches.match(request).then(cached => {
      if (cached) return cached;
      return fetch(request).then(response => {
        const copy = response.clone();
        caches.open(CACHE).then(cache => cache.put(request, copy));
        return response;
      });
    })
  );
});
```

- [ ] **Step 3: 创建 `icons/icon.svg`**

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" fill="#F5E6C8"/>
  <circle cx="256" cy="256" r="184" fill="#8B5E3C"/>
  <g fill="none" stroke="#FFFDF6" stroke-width="10" stroke-linecap="round" stroke-linejoin="round">
    <path d="M256 190a30 30 0 1 1 30 30"/>
    <path d="M256 220v50"/>
    <path d="M150 330l106-60 106 60z"/>
    <path d="M150 330h212"/>
  </g>
</svg>
```

- [ ] **Step 4: 创建 `scripts/generate-icons.mjs`**

```js
import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const outDir = fileURLToPath(new URL('../icons/', import.meta.url));
mkdirSync(outDir, { recursive: true });

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(buffer) {
  let c = 0xffffffff;
  for (const byte of buffer) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([length, body, crc]);
}

function encodePng(size, pixels) {
  const stride = size * 4;
  const raw = Buffer.alloc((stride + 1) * size);
  for (let y = 0; y < size; y += 1) {
    raw[y * (stride + 1)] = 0;
    pixels.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

function drawIcon(size, paddingRatio = 0) {
  const pixels = Buffer.alloc(size * size * 4);
  const paper = [245, 230, 200];
  const rust = [139, 94, 60];
  const cream = [255, 253, 246];
  const set = (x, y, color) => {
    if (x < 0 || y < 0 || x >= size || y >= size) return;
    const i = (y * size + x) * 4;
    pixels[i] = color[0];
    pixels[i + 1] = color[1];
    pixels[i + 2] = color[2];
    pixels[i + 3] = 255;
  };
  for (let y = 0; y < size; y += 1) for (let x = 0; x < size; x += 1) set(x, y, paper);

  const cx = size / 2;
  const cy = size / 2;
  const radius = size * (0.36 - paddingRatio);
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      if ((x - cx) ** 2 + (y - cy) ** 2 <= radius ** 2) set(x, y, rust);
    }
  }

  const scale = size / 512;
  const line = (x1, y1, x2, y2, width) => {
    x1 *= scale; y1 *= scale; x2 *= scale; y2 *= scale; width *= scale;
    const minX = Math.max(0, Math.min(x1, x2) - width);
    const maxX = Math.min(size, Math.max(x1, x2) + width);
    const minY = Math.max(0, Math.min(y1, y2) - width);
    const maxY = Math.min(size, Math.max(y1, y2) + width);
    const vx = x2 - x1;
    const vy = y2 - y1;
    const len2 = vx * vx + vy * vy || 1;
    for (let y = Math.floor(minY); y < maxY; y += 1) {
      for (let x = Math.floor(minX); x < maxX; x += 1) {
        const t = Math.max(0, Math.min(1, ((x - x1) * vx + (y - y1) * vy) / len2));
        const px = x1 + t * vx;
        const py = y1 + t * vy;
        if ((x - px) ** 2 + (y - py) ** 2 <= (width / 2) ** 2) set(x, y, cream);
      }
    }
  };
  const hookRadius = 30 * scale;
  const hookX = 256 * scale;
  const hookY = 190 * scale;
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const distance = Math.hypot(x - hookX, y - hookY);
      if (Math.abs(distance - hookRadius) < 5 * scale && y <= hookY + 6 * scale) set(x, y, cream);
    }
  }
  line(256, 220, 256, 270, 10);
  line(150, 330, 256, 270, 10);
  line(362, 330, 256, 270, 10);
  line(150, 330, 362, 330, 10);
  return pixels;
}

for (const size of [192, 512]) {
  writeFileSync(join(outDir, `icon-${size}.png`), encodePng(size, drawIcon(size)));
}
writeFileSync(join(outDir, 'icon-maskable-512.png'), encodePng(512, drawIcon(512, 0.1)));
console.log('icons generated');
```

- [ ] **Step 5: 生成图标并检查**

Run: `npm run icons`
Expected: 输出 `icons generated`；`icons/` 下存在 `icon-192.png`、`icon-512.png`、`icon-maskable-512.png`、`icon.svg`。

- [ ] **Step 6: 在 `js/app.js` 增加更新提示**

把 `registerServiceWorker` 中的注册行替换为：

```js
    const registration = await navigator.serviceWorker.register('./sw.js', { scope: './' });
    registration.addEventListener('updatefound', () => {
      const worker = registration.installing;
      worker?.addEventListener('statechange', () => {
        if (worker.state === 'installed' && navigator.serviceWorker.controller) {
          showToast('有新版本，重新打开应用后生效');
        }
      });
    });
```

- [ ] **Step 7: 验证离线与安装**

Run: `npm run dev`

手动检查：
1. 打开 `http://localhost:5173`，等待 Service Worker 安装完成（DevTools → Application → Service Workers 显示 activated）。
2. 切换到离线模式，刷新页面：应用仍能打开，已有数据可浏览。
3. DevTools → Application → Manifest：名称、图标、启动地址正确，无安装错误。
4. 用手机 Chrome 通过 HTTPS 打开部署地址，菜单中出现「安装应用」或「添加到主屏幕」。

---

## Task 10：验收、README 与部署

**Files:**
- Create: `README.md`
- Modify: `sw.js`（发布新版本时更新缓存版本号）
- Verify: 全项目

- [ ] **Step 1: 创建 `README.md`**

```markdown
# 我的衣橱

一个只给自己用的本地衣橱 PWA：管理单品、组合搭配、记录每天穿了什么。数据全部保存在手机浏览器的 IndexedDB 中，不上传云端，不需要账号。

## 功能

- 单品：拍照/相册录入、分类、颜色、季节、场合、品牌、备注、收藏、搜索筛选与排序。
- 搭配：多选单品创建搭配，自动生成拼贴封面，一键记录今天穿这套。
- 记录：月历查看、每日穿搭记录、月度统计、闲置提醒。
- 备份：导出单个 JSON（含照片），导入覆盖恢复。
- 离线：首次加载后可断网使用，可添加到安卓主屏幕。

## 本地开发

需要 Node.js 18 以上（本项目无第三方依赖，无需 `npm install`）。

```bash
npm run dev      # http://localhost:5173
npm test         # 运行纯逻辑测试
npm run icons    # 重新生成 PWA 图标
```

## 部署到 GitHub Pages

1. 在 GitHub 新建一个仓库，把本目录内容推送到 `main` 分支。
2. 仓库 Settings → Pages → Build and deployment → Source 选择 `Deploy from a branch`，分支选 `main`，目录选 `/ (root)`。
3. 等待部署完成，打开 `https://<用户名>.github.io/<仓库名>/`。

## 部署到 Cloudflare Pages

1. Cloudflare Dashboard → Workers & Pages → Create → Pages → Connect to Git（或直接上传）。
2. Build command 留空，Build output directory 填 `/`。
3. 部署完成后用分配的 HTTPS 地址访问。

## 安卓安装

用 Chrome 打开部署地址 → 右上角菜单 → 「安装应用」或「添加到主屏幕」。安装后从桌面图标启动，无浏览器地址栏。

## 数据与备份

- 数据保存在浏览器 IndexedDB，按站点隔离；清除浏览器数据、卸载浏览器或换手机都会丢失。
- 定期在「我的 → 数据备份」导出 JSON。备份文件包含个人照片，请妥善保管。
- 导入会覆盖当前全部数据，导入前建议先导出一份。
- 应用不发起任何业务网络请求，无统计、无账号、无云同步。

## 更新应用

修改代码后，把 `sw.js` 顶部的 `CACHE` 版本号加一（例如 `wardrobe-v1` → `wardrobe-v2`），否则已安装的旧缓存不会自动更新。部署后重新打开应用，会提示有新版本。

## 项目结构

```
index.html            应用外壳
css/                  设计令牌与样式
js/app.js             启动与路由注册
js/router.js          哈希路由
js/store.js           内存状态
js/db/                IndexedDB 数据访问
js/views/             页面
js/components/        共享组件
js/utils/             纯逻辑工具
tests/                Node 内置测试
sw.js                 Service Worker
manifest.webmanifest  PWA 清单
icons/                图标
scripts/              本地服务器与图标生成
```

## 浏览器要求

主要目标为安卓 Chrome。iPhone Safari 也可打开，但未做专门适配。

## 版本

1.0.0
```

- [ ] **Step 2: 运行完整测试与语法检查**

Run: `npm test`
Expected: 所有测试通过（dates、stats、filters、validation、image、backup）。

Run: `node --check js/app.js`
Expected: 无输出、退出码 0。

- [ ] **Step 3: 执行移动端手动验收**

逐项勾选：

- [ ] 375px 宽度无横向滚动；底部导航不遮挡内容；按钮触控区域不小于 44px。
- [ ] 添加带照片的单品，刷新后照片与字段仍在。
- [ ] 创建搭配，封面拼贴为前 4 件单品缩略图。
- [ ] 从搭配详情记录今天穿着，日历出现圆点，统计数字正确。
- [ ] 同一天再次记录进入编辑，不会新增第二条。
- [ ] 搜索、分类/季节/场合筛选、三种排序均正确。
- [ ] 导出备份 → 删除一件单品 → 导入备份，数据与照片全部恢复。
- [ ] 断网后刷新，应用与已有数据仍可访问。
- [ ] DevTools Network 面板中无第三方请求。
- [ ] DevTools Application → Manifest 无错误，Service Worker 状态为 activated。

- [ ] **Step 4: 停止可视化伴侣服务器**

Run: `bash "C:/Users/Li/.claude/skills/brainstorming/scripts/stop-server.sh" "d:/Ai/Claude/系统/.superpowers/brainstorm/879-1793703715"`
Expected: 服务器停止。`.superpowers/brainstorm/` 下的草图保留，便于回看；如果之后初始化 Git，把 `.superpowers/` 加入 `.gitignore`。

- [ ] **Step 5: 交付说明**

向用户说明：
- 如何本地启动与测试。
- 如何部署到免费静态托管。
- 如何在安卓 Chrome 安装到主屏幕。
- 数据只在本机，必须定期导出备份。
- 首次部署后如果发现样式或交互问题，可在浏览器直接改 CSS/JS 后重新部署。

---

## 自查记录

### 规格覆盖

| 规格章节 | 对应任务 |
| --- | --- |
| 2.1 单品管理 | Task 4、Task 5 |
| 2.1 搭配组合 | Task 7 |
| 2.1 穿着记录 | Task 6 |
| 2.1 数据备份 | Task 8 |
| 2.1 PWA | Task 9 |
| 5 视觉规范 | Task 0 令牌，Task 4/5/6/7/8 组件样式 |
| 6 数据模型 | Task 2 |
| 7 技术架构 | Task 0–9 |
| 8 关键流程 | Task 4–8 |
| 9 错误处理 | Task 3、5、6、8 |
| 10 测试策略 | Task 1、8，Task 10 手动验收 |
| 11 部署 | Task 10 |
| 12 验收标准 | Task 10 |

### 占位符与一致性检查

- 未使用 TBD/TODO；每个代码步骤都给出了完整实现或精确替换位置。
- 字段命名统一：`itemIds`、`itemNames`、`outfitId`、`outfitName`、`photoId`、`code`、`weather`、`createdAt`、`updatedAt`。
- `saveItem`、`saveOutfit`、`saveLog` 的输入形状与调用方一致。
- 路由注册顺序保证 `/item/new` 先于 `/item/:id`、`/outfit/new` 先于 `/outfit/:id`。
- 备份校验与导入使用同一个 `validateBackup`，避免两套规则。

### 实现时需顺手修正的小项

- 移除未使用的导入：`item-detail.js` 中的 `logByDate`、`logs.js` 中的 `openSheet` 与 `navigate`。
- 筛选弹层关闭时优先调用 `closeSheet()`，而不是直接移除 DOM。
- `photo-input.js` 的文件输入不要加 `capture` 属性，让安卓 Chrome 的图片选择器同时提供拍照与相册；若需要强制拍照，可再加一个带 `capture` 的独立按钮。
- `outfit-detail.js` 中 `photoUrl` 改为顶部静态导入，避免动态 `import()`。
- 测试若在非中国时区运行，`toDateKey(new Date('...Z'))` 相关断言可能偏移一天；测试中使用本地构造的日期，或在测试文件顶部固定 `process.env.TZ = 'Asia/Shanghai'`。

---

## 执行方式

计划已保存。两种执行方式：

1. **当前会话内联执行（推荐）**：由本会话按任务顺序实现，保持视觉与交互一致，遇到问题即时修正，成本更低。
2. **子代理逐任务执行**：每个任务派发独立子代理，任务间做规格与质量审查，适合需要并行或强隔离的场景。

推荐内联执行：这是一个视觉高度统一的小型应用，单会话更容易保持设计语言、组件复用和代码风格一致，也避免子代理反复读取上下文带来的额外成本。

