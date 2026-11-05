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
