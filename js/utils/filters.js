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
