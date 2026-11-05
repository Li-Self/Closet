export function filterItems(items, filters = {}) {
  const {
    keyword = '', category = '', categories = [], colors = [],
    seasons = [], occasions = [], favoriteOnly = false,
  } = filters;
  const q = keyword.trim().toLowerCase();
  const selectedCategories = [...(category ? [category] : []), ...categories].filter(Boolean);
  return items.filter(item => {
    const itemCategories = Array.isArray(item.categories)
      ? item.categories
      : (item.category ? [item.category] : []);
    const itemColors = Array.isArray(item.colors)
      ? item.colors
      : (item.color ? [item.color] : []);
    if (selectedCategories.length && !itemCategories.some(value => selectedCategories.includes(value))) return false;
    if (colors.length && !itemColors.some(value => colors.includes(value))) return false;
    if (favoriteOnly && !item.favorite) return false;
    if (seasons.length && !(item.seasons ?? []).some(value => seasons.includes(value))) return false;
    if (occasions.length && !(item.occasions ?? []).some(value => occasions.includes(value))) return false;
    if (!q) return true;
    return [item.name, item.brand, item.note, ...itemCategories, ...itemColors]
      .filter(Boolean).join(' ').toLowerCase().includes(q);
  });
}

export function sortItems(items, mode = 'custom', { counts = new Map(), lastWorn = new Map() } = {}) {
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
  if (mode === 'recent') {
    return list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }
  return list.sort((a, b) => (a.sortOrder ?? a.code ?? 0) - (b.sortOrder ?? b.code ?? 0));
}
