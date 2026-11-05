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
    const active = hash === path
      || hash.startsWith(`${path}/`)
      || (path === '/wardrobe' && hash.startsWith('/item/'))
      || (path === '/outfits' && hash.startsWith('/outfit/'));
    if (active) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  }
}
