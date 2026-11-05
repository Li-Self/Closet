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
        try {
          if (kind === 'category') await renameCategory(oldName, value);
          else await renameColor(oldName, value);
          closeSheet();
          await loadAll();
          showToast('已更新');
        } catch (error) {
          showToast(error.message || '更新失败', { type: 'error' });
        }
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
  try {
    if (kind === 'category') {
      await saveSettings({ categories: state.settings.categories.filter(value => value !== name) });
    } else {
      await saveSettings({ colors: state.settings.colors.filter(value => value !== name) });
    }
    await loadAll();
    showToast('已删除');
  } catch (error) {
    showToast(error.message || '删除失败', { type: 'error' });
  }
}

async function addValue(kind) {
  const input = document.getElementById(kind === 'category' ? 'new-category' : 'new-color');
  const value = input.value.trim();
  if (!value) { showToast('请输入名称', { type: 'error' }); return; }
  const state = getState();
  const list = kind === 'category' ? state.settings.categories : state.settings.colors;
  if (list.includes(value)) { showToast('这个名称已经存在', { type: 'error' }); return; }
  try {
    if (kind === 'category') await saveSettings({ categories: [...list, value] });
    else await saveSettings({ colors: [...list, value] });
    input.value = '';
    await loadAll();
    showToast('已添加');
  } catch (error) {
    showToast(error.message || '添加失败', { type: 'error' });
  }
}
