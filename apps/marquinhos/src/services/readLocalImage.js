const MAX_EDGE = 256;
const MAX_BYTES = 5 * 1024 * 1024;

export function readLocalImage(file) {
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
        const scale = Math.min(1, MAX_EDGE / Math.max(image.width, image.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(image.width * scale));
        canvas.height = Math.max(1, Math.round(image.height * scale));
        const context = canvas.getContext('2d');
        if (!context) {
          reject(new Error('Não foi possível ler a foto.'));
          return;
        }
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.72));
      };
      image.src = String(reader.result || '');
    };
    reader.readAsDataURL(file);
  });
}
