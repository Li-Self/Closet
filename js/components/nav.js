import { openSheet, closeSheet } from './modal.js';
import { navigate } from '../router.js';
import { openLogSheet } from './log-sheet.js';
import { nowKey } from '../utils/dates.js';

const tabs = [
  {
    path: '/wardrobe',
    label: '衣橱',
    icon: '<path d="M12 4v16M4 8h16M8 8l-3 5 3 2M16 8l3 5-3 2"/>',
    prefixes: ['/item'],
  },
  {
    path: '/outfits',
    label: '搭配',
    icon: '<rect x="4" y="4" width="7" height="7" rx="1.5"/><rect x="13" y="4" width="7" height="7" rx="1.5"/><rect x="4" y="13" width="7" height="7" rx="1.5"/><rect x="13" y="13" width="7" height="7" rx="1.5"/>',
    prefixes: ['/outfit'],
  },
  {
    path: '/logs',
    label: '记录',
    icon: '<rect x="4" y="5" width="16" height="15" rx="2"/><path d="M8 3v4M16 3v4M4 10h16"/>',
    prefixes: [],
  },
  {
    path: '/settings',
    label: '我的',
    icon: '<circle cx="12" cy="8" r="4"/><path d="M5 21c0-4 3-6 7-6s7 2 7 6"/>',
    prefixes: [],
  },
];

export function renderNav() {
  const nav = document.getElementById('bottom-nav');
  nav.innerHTML = '';
  for (const tab of tabs) {
    const link = document.createElement('a');
    link.href = `#${tab.path}`;
    link.className = 'nav-tab';
    link.dataset.path = tab.path;
    link.dataset.prefixes = tab.prefixes.join(',');
    link.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7">${tab.icon}</svg><span>${tab.label}</span>`;
    nav.append(link);
  }
  const fab = document.createElement('button');
  fab.type = 'button';
  fab.className = 'fab';
  fab.setAttribute('aria-label', '添加');
  fab.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M12 5v14M5 12h14"/></svg>';
  fab.addEventListener('click', openAddSheet);
  nav.append(fab);
  updateNav();
}

export function updateNav() {
  const hash = location.hash.replace(/^#/, '') || '/wardrobe';
  const nav = document.getElementById('bottom-nav');
  if (!nav) return;
  for (const link of nav.querySelectorAll('.nav-tab')) {
    const path = link.dataset.path;
    const prefixes = (link.dataset.prefixes || '').split(',').filter(Boolean);
    const active = hash === path
      || hash.startsWith(`${path}/`)
      || prefixes.some(prefix => hash === prefix || hash.startsWith(`${prefix}/`));
    if (active) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  }
}

function openAddSheet() {
  openSheet({
    title: '添加',
    actions: [
      {
        label: '添加单品',
        variant: 'primary',
        onClick: () => { closeSheet(); navigate('/item/new'); },
      },
      {
        label: '新建搭配',
        variant: 'ghost',
        onClick: () => { closeSheet(); navigate('/outfit/new'); },
      },
      {
        label: '记录今天穿着',
        variant: 'ghost',
        onClick: () => { closeSheet(); openLogSheet({ date: nowKey() }); },
      },
      {
        label: '取消',
        variant: 'ghost',
        onClick: closeSheet,
      },
    ],
  });
}
