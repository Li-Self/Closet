import { compressPhoto } from '../utils/image.js';
import { showToast } from './toast.js';

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
