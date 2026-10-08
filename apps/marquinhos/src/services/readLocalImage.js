const MAX_EDGE = 256;
const MAX_BYTES = 5 * 1024 * 1024;

function drawJpeg(image, edge, quality) {
  const scale = Math.min(1, edge / Math.max(image.width, image.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(image.width * scale));
  canvas.height = Math.max(1, Math.round(image.height * scale));
  const context = canvas.getContext('2d');
  if (!context) return '';
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/jpeg', quality);
}

export function readLocalImage(file, { maxEdge = MAX_EDGE, maxChars = 0 } = {}) {
  if (!file) return Promise.resolve('');
  if (!file.type.startsWith('image/')) {
    return Promise.reject(new Error('Envie um arquivo de imagem.'));
  }
  if (file.size > MAX_BYTES) {
    return Promise.reject(new Error('A foto precisa ter no máximo 5 MB.'));
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Não foi possível ler a foto.'));
    reader.onload = () => {
      const image = new Image();
      image.onerror = () => reject(new Error('Não foi possível ler a foto.'));
      image.onload = () => {
        let edge = maxEdge;
        let quality = 0.72;
        let encoded = drawJpeg(image, edge, quality);
        if (!encoded) {
          reject(new Error('Não foi possível ler a foto.'));
          return;
        }
        while (maxChars && encoded.length > maxChars && edge > 32) {
          if (quality > 0.45) quality = Math.round((quality - 0.08) * 100) / 100;
          else {
            edge = Math.max(32, Math.round(edge * 0.8));
            quality = 0.72;
          }
          encoded = drawJpeg(image, edge, quality);
        }
        if (maxChars && encoded.length > maxChars) {
          reject(new Error('A foto ficou grande demais. Tente outra imagem.'));
          return;
        }
        resolve(encoded);
      };
      image.src = String(reader.result || '');
    };
    reader.readAsDataURL(file);
  });
}
