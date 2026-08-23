export const MAX_PHOTO_BYTES = 400 * 1024;

export function dataUrlBytes(dataUrl) {
  if (!dataUrl) return 0;
  const comma = String(dataUrl).indexOf(',');
  const base64 = comma >= 0 ? dataUrl.slice(comma + 1) : dataUrl;
  const padding = base64.endsWith('==') ? 2 : base64.endsWith('=') ? 1 : 0;
  return Math.max(0, Math.floor((base64.length * 3) / 4) - padding);
}

export function assertPhotoDataUrl(dataUrl) {
  if (!dataUrl) return;
  if (dataUrlBytes(dataUrl) > MAX_PHOTO_BYTES) {
    throw new Error('Foto acima de 400KB. Escolha outra.');
  }
}

export function fileToDataUrl(file) {
  if (!file) return Promise.resolve('');
  if (file.size > MAX_PHOTO_BYTES) {
    return Promise.reject(new Error('Foto acima de 400KB. Escolha outra.'));
  }
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result || '');
      try {
        assertPhotoDataUrl(dataUrl);
        resolve(dataUrl);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(new Error('Não foi possível ler a foto.'));
    reader.readAsDataURL(file);
  });
}
