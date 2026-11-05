import { compressPhoto, PHOTO_LIMITS } from '../utils/image.js';
import { openCamera } from './camera.js';
import { showToast } from './toast.js';

export function createPhotoInput({ initialUrl = null, onChange = () => {} } = {}) {
  const wrap = document.createElement('div');
  wrap.className = 'photo-input';
  wrap.innerHTML = `
    <input id="photo-camera" type="file" accept="image/*" capture="environment" hidden>
    <input id="photo-gallery" type="file" accept="image/*" hidden>
    <button type="button" class="photo-preview" id="photo-preview" aria-label="选择单品照片">
      ${initialUrl ? `<img src="${initialUrl}" alt="单品照片预览">` : '<span class="photo-placeholder">拍照或选择照片</span>'}
    </button>
    <div class="photo-actions">
      <button type="button" class="photo-action" id="camera-button">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.2"/></svg>
        拍照
      </button>
      <button type="button" class="photo-action" id="gallery-button">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="8" cy="10" r="1.5"/><path d="M21 16l-5-5-7 7"/></svg>
        从相册选择
      </button>
    </div>
    <div class="photo-quality">vivo 相机兼容 · 原图最高 ${PHOTO_LIMITS.fullMaxEdge}px · 画质优先</div>
    <button type="button" class="ghost-button" id="remove-photo" style="min-height:44px;margin-top:6px" hidden>移除照片</button>
  `;
  const cameraInput = wrap.querySelector('#photo-camera');
  const galleryInput = wrap.querySelector('#photo-gallery');
  const preview = wrap.querySelector('#photo-preview');
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
  };

  const applyFile = async file => {
    if (!file) return;
    try {
      const compressed = await compressPhoto(file);
      pending = compressed;
      setPreview(URL.createObjectURL(compressed.thumb));
      onChange(compressed);
    } catch {
      showToast('这张图片暂不支持，请换一张', { type: 'error' });
    }
  };

  wrap.querySelector('#camera-button').addEventListener('click', async () => {
    try {
      const blob = await openCamera();
      if (blob) await applyFile(blob);
    } catch {
      // 浏览器不允许 getUserMedia 时，退回带 capture 的系统相机入口
      cameraInput.click();
    }
  });
  wrap.querySelector('#gallery-button').addEventListener('click', () => galleryInput.click());
  preview.addEventListener('click', () => galleryInput.click());
  cameraInput.addEventListener('change', async () => {
    const file = cameraInput.files?.[0];
    cameraInput.value = '';
    await applyFile(file);
  });
  galleryInput.addEventListener('change', async () => {
    const file = galleryInput.files?.[0];
    galleryInput.value = '';
    await applyFile(file);
  });
  remove.addEventListener('click', () => {
    pending = null;
    setPreview(null);
    onChange(null);
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
