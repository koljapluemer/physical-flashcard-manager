export async function resizeImageToDataUrl(file: File, maxWidth = 700): Promise<string> {
  const imageBitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxWidth / imageBitmap.width);
  const canvas = document.createElement('canvas');
  canvas.width = Math.floor(imageBitmap.width * scale);
  canvas.height = Math.floor(imageBitmap.height * scale);

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Unable to acquire canvas context');
  }

  ctx.drawImage(imageBitmap, 0, 0, canvas.width, canvas.height);

  return canvas.toDataURL(file.type || 'image/png', 0.9);
}
