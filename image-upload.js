const MAX_INPUT_BYTES = 5 * 1024 * 1024;
const MAX_OUTPUT_BYTES = 300 * 1024;
const MAX_EDGE = 800;

function dataUrlBytes(data) {
 const encoded = data.slice(data.indexOf(',') + 1);
 const padding = encoded.endsWith('==') ? 2 : encoded.endsWith('=') ? 1 : 0;
 return encoded.length * 3 / 4 - padding;
}

export async function prepareImage(file) {
 if (!file || !['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) throw new Error('请选择 JPG、PNG 或 WebP 图片。');
 if (file.size > MAX_INPUT_BYTES) throw new Error('图片不能超过 5MB。');
 let bitmap;
 try { bitmap = await createImageBitmap(file); }
 catch { throw new Error('图片无法读取，可能已损坏，请重新选择 JPG、PNG 或 WebP 图片。'); }
 try {
  const canvas = document.createElement('canvas');
  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('浏览器无法处理图片。');
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  for (let size = 0; size < 6; size++) {
   for (const quality of [.88, .78, .68, .58, .48, .38]) {
    const data = canvas.toDataURL('image/webp', quality);
    if (data.startsWith('data:image/') && dataUrlBytes(data) <= MAX_OUTPUT_BYTES) return data;
   }
   const temp = document.createElement('canvas');
   temp.width = Math.max(1, Math.round(canvas.width * .8));
   temp.height = Math.max(1, Math.round(canvas.height * .8));
   const tempCtx = temp.getContext('2d');
   if (!tempCtx) throw new Error('浏览器无法处理图片。');
   tempCtx.drawImage(canvas, 0, 0, temp.width, temp.height);
   canvas.width = temp.width;
   canvas.height = temp.height;
   ctx.drawImage(temp, 0, 0);
  }
  throw new Error('压缩后的图片仍超过 300KB，请选择更简单的图片。');
 } finally { bitmap.close(); }
}
