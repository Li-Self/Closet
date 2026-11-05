export function openCamera() {
  return new Promise((resolve, reject) => {
    if (!navigator.mediaDevices?.getUserMedia) {
      reject(new Error('当前浏览器不支持相机'));
      return;
    }
    const overlay = document.createElement('div');
    overlay.className = 'camera-overlay';
    overlay.innerHTML = `
      <video class="camera-video" autoplay playsinline muted></video>
      <div class="camera-top">
        <button type="button" class="camera-close" aria-label="关闭相机">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 6l12 12M18 6L6 18"/></svg>
        </button>
        <span class="camera-hint">将衣服放入画面</span>
      </div>
      <div class="camera-bottom">
        <button type="button" class="camera-shutter" aria-label="拍照"></button>
      </div>
    `;
    document.body.append(overlay);
    const video = overlay.querySelector('video');
    let stream = null;
    let settled = false;

    const cleanup = () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
        stream = null;
      }
      overlay.remove();
    };

    const finish = (value, error) => {
      if (settled) return;
      settled = true;
      cleanup();
      if (error) reject(error);
      else resolve(value);
    };

    overlay.querySelector('.camera-close').addEventListener('click', () => finish(null));
    overlay.querySelector('.camera-shutter').addEventListener('click', () => {
      if (!video.videoWidth || !video.videoHeight) {
        finish(null, new Error('相机尚未准备好'));
        return;
      }
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      canvas.getContext('2d').drawImage(video, 0, 0);
      canvas.toBlob(blob => {
        if (blob) finish(blob);
        else finish(null, new Error('拍照失败'));
      }, 'image/jpeg', 0.95);
    });

    navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: 'environment' } },
      audio: false,
    }).then(mediaStream => {
      if (settled) {
        mediaStream.getTracks().forEach(track => track.stop());
        return;
      }
      stream = mediaStream;
      video.srcObject = mediaStream;
      return video.play();
    }).catch(error => finish(null, error));
  });
}
