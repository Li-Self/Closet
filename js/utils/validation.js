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
