/**
 * Client-side crop of dark letterbox/pillarbox borders from reference photos.
 */

export interface ContentCropResult {
  blob: Blob;
  url: string;
  cropped: boolean;
  cropBox: { x: number; y: number; width: number; height: number };
}

function loadImageFromFile(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image'));
    };
    img.src = url;
  });
}

/**
 * Trim uniform dark margins (e.g. black background around index cards).
 */
export async function cropImageContentBorders(
  file: File,
  brightnessThreshold = 42,
): Promise<ContentCropResult> {
  const img = await loadImageFromFile(file);
  const width = img.naturalWidth;
  const height = img.naturalHeight;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    const url = URL.createObjectURL(file);
    return {
      blob: file,
      url,
      cropped: false,
      cropBox: { x: 0, y: 0, width, height },
    };
  }

  ctx.drawImage(img, 0, 0);
  const { data } = ctx.getImageData(0, 0, width, height);

  let minX = width;
  let minY = height;
  let maxX = 0;
  let maxY = 0;
  let brightPixels = 0;

  const step = width * height > 2_000_000 ? 2 : 1;
  for (let y = 0; y < height; y += step) {
    for (let x = 0; x < width; x += step) {
      const i = (y * width + x) * 4;
      const lum = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
      if (lum > brightnessThreshold) {
        brightPixels += 1;
        minX = Math.min(minX, x);
        maxX = Math.max(maxX, x);
        minY = Math.min(minY, y);
        maxY = Math.max(maxY, y);
      }
    }
  }

  const fullBox = { x: 0, y: 0, width, height };
  if (brightPixels === 0 || maxX <= minX || maxY <= minY) {
    const url = URL.createObjectURL(file);
    return { blob: file, url, cropped: false, cropBox: fullBox };
  }

  const pad = Math.max(2, Math.round(Math.min(width, height) * 0.008));
  minX = Math.max(0, minX - pad);
  minY = Math.max(0, minY - pad);
  maxX = Math.min(width - 1, maxX + pad);
  maxY = Math.min(height - 1, maxY + pad);

  const cropW = maxX - minX + 1;
  const cropH = maxY - minY + 1;
  const trimmedFraction = 1 - (cropW * cropH) / (width * height);

  if (trimmedFraction < 0.02) {
    const url = URL.createObjectURL(file);
    return { blob: file, url, cropped: false, cropBox: fullBox };
  }

  const out = document.createElement('canvas');
  out.width = cropW;
  out.height = cropH;
  const outCtx = out.getContext('2d');
  if (!outCtx) {
    const url = URL.createObjectURL(file);
    return { blob: file, url, cropped: false, cropBox: fullBox };
  }

  outCtx.drawImage(canvas, minX, minY, cropW, cropH, 0, 0, cropW, cropH);
  const blob = await new Promise<Blob>((resolve, reject) => {
    out.toBlob((b) => (b ? resolve(b) : reject(new Error('Crop export failed'))), file.type || 'image/png');
  });

  return {
    blob,
    url: URL.createObjectURL(blob),
    cropped: true,
    cropBox: { x: minX, y: minY, width: cropW, height: cropH },
  };
}
