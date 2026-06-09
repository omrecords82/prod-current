/**
 * Client-side crop of dark letterbox/pillarbox borders from reference photos.
 */

export interface ContentCropResult {
  blob: Blob;
  url: string;
  cropped: boolean;
  cropBox: { x: number; y: number; width: number; height: number };
}

const CONTENT_LUM = 48;
const EDGE_DENSITY = 0.04;
const ANALYSIS_MAX = 1200;

function luminance(r: number, g: number, b: number): number {
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

async function loadOrientedSource(
  file: File,
): Promise<{ source: CanvasImageSource; width: number; height: number; close?: () => void }> {
  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
    return {
      source: bitmap,
      width: bitmap.width,
      height: bitmap.height,
      close: () => bitmap.close(),
    };
  } catch {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const el = new Image();
      el.onload = () => {
        URL.revokeObjectURL(url);
        resolve(el);
      };
      el.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('Failed to load image'));
      };
      el.src = url;
    });
    return { source: img, width: img.naturalWidth, height: img.naturalHeight };
  }
}

export type FractionRect = { x: number; y: number; w: number; h: number };

function loadImageFromUrl(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    if (!url.startsWith('blob:')) {
      img.crossOrigin = 'anonymous';
    }
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = url;
  });
}

function drawToCanvas(source: CanvasImageSource, width: number, height: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas unavailable');
  ctx.drawImage(source, 0, 0, width, height);
  return canvas;
}

function findContentBounds(
  data: Uint8ClampedArray,
  width: number,
  height: number,
): { minX: number; minY: number; maxX: number; maxY: number } | null {
  const colDensity = new Float64Array(width);
  const rowDensity = new Float64Array(height);

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const i = (y * width + x) * 4;
      if (luminance(data[i], data[i + 1], data[i + 2]) > CONTENT_LUM) {
        colDensity[x] += 1;
        rowDensity[y] += 1;
      }
    }
  }

  for (let x = 0; x < width; x += 1) colDensity[x] /= height;
  for (let y = 0; y < height; y += 1) rowDensity[y] /= width;

  let minX = 0;
  while (minX < width && colDensity[minX] < EDGE_DENSITY) minX += 1;
  let maxX = width - 1;
  while (maxX > minX && colDensity[maxX] < EDGE_DENSITY) maxX -= 1;

  let minY = 0;
  while (minY < height && rowDensity[minY] < EDGE_DENSITY) minY += 1;
  let maxY = height - 1;
  while (maxY > minY && rowDensity[maxY] < EDGE_DENSITY) maxY -= 1;

  if (maxX <= minX || maxY <= minY) return null;
  return { minX, minY, maxX, maxY };
}

function mapBoundsToFull(
  bounds: { minX: number; minY: number; maxX: number; maxY: number },
  analysisW: number,
  analysisH: number,
  fullW: number,
  fullH: number,
) {
  const scaleX = fullW / analysisW;
  const scaleY = fullH / analysisH;
  const pad = Math.max(2, Math.round(Math.min(fullW, fullH) * 0.006));
  const minX = Math.max(0, Math.floor(bounds.minX * scaleX) - pad);
  const minY = Math.max(0, Math.floor(bounds.minY * scaleY) - pad);
  const maxX = Math.min(fullW - 1, Math.ceil(bounds.maxX * scaleX) + pad);
  const maxY = Math.min(fullH - 1, Math.ceil(bounds.maxY * scaleY) + pad);
  return {
    x: minX,
    y: minY,
    width: maxX - minX + 1,
    height: maxY - minY + 1,
  };
}

/**
 * Trim dark margins (e.g. black background around index cards).
 */
export async function cropImageContentBorders(file: File): Promise<ContentCropResult> {
  const { source, width, height, close } = await loadOrientedSource(file);
  const fullCanvas = drawToCanvas(source, width, height);
  close?.();

  const fullBox = { x: 0, y: 0, width, height };

  const scale = Math.min(1, ANALYSIS_MAX / Math.max(width, height));
  const analysisW = Math.max(1, Math.round(width * scale));
  const analysisH = Math.max(1, Math.round(height * scale));

  const analysisCanvas = document.createElement('canvas');
  analysisCanvas.width = analysisW;
  analysisCanvas.height = analysisH;
  const analysisCtx = analysisCanvas.getContext('2d');
  if (!analysisCtx) {
    const url = URL.createObjectURL(file);
    return { blob: file, url, cropped: false, cropBox: fullBox };
  }

  analysisCtx.drawImage(fullCanvas, 0, 0, analysisW, analysisH);
  const { data } = analysisCtx.getImageData(0, 0, analysisW, analysisH);
  const bounds = findContentBounds(data, analysisW, analysisH);

  if (!bounds) {
    const url = URL.createObjectURL(file);
    return { blob: file, url, cropped: false, cropBox: fullBox };
  }

  const cropBox = mapBoundsToFull(bounds, analysisW, analysisH, width, height);
  const trimmedFraction = 1 - (cropBox.width * cropBox.height) / (width * height);

  if (trimmedFraction < 0.005) {
    const url = URL.createObjectURL(file);
    return { blob: file, url, cropped: false, cropBox: fullBox };
  }

  const out = document.createElement('canvas');
  out.width = cropBox.width;
  out.height = cropBox.height;
  const outCtx = out.getContext('2d');
  if (!outCtx) {
    const url = URL.createObjectURL(file);
    return { blob: file, url, cropped: false, cropBox: fullBox };
  }

  outCtx.drawImage(
    fullCanvas,
    cropBox.x,
    cropBox.y,
    cropBox.width,
    cropBox.height,
    0,
    0,
    cropBox.width,
    cropBox.height,
  );

  const blob = await new Promise<Blob>((resolve, reject) => {
    out.toBlob(
      (b) => (b ? resolve(b) : reject(new Error('Crop export failed'))),
      file.type === 'image/jpeg' ? 'image/jpeg' : 'image/png',
      0.92,
    );
  });

  return {
    blob,
    url: URL.createObjectURL(blob),
    cropped: true,
    cropBox,
  };
}

/** Detect content bounds as fractional rect (for crop UI initial selection). */
export async function detectContentCropFraction(imageUrl: string): Promise<FractionRect> {
  const img = await loadImageFromUrl(imageUrl);
  const width = img.naturalWidth;
  const height = img.naturalHeight;
  const fullCanvas = drawToCanvas(img, width, height);

  const scale = Math.min(1, ANALYSIS_MAX / Math.max(width, height));
  const analysisW = Math.max(1, Math.round(width * scale));
  const analysisH = Math.max(1, Math.round(height * scale));

  const analysisCanvas = document.createElement('canvas');
  analysisCanvas.width = analysisW;
  analysisCanvas.height = analysisH;
  const analysisCtx = analysisCanvas.getContext('2d');
  if (!analysisCtx) return { x: 0, y: 0, w: 1, h: 1 };

  analysisCtx.drawImage(fullCanvas, 0, 0, analysisW, analysisH);
  const { data } = analysisCtx.getImageData(0, 0, analysisW, analysisH);
  const bounds = findContentBounds(data, analysisW, analysisH);
  if (!bounds) return { x: 0, y: 0, w: 1, h: 1 };

  const cropBox = mapBoundsToFull(bounds, analysisW, analysisH, width, height);
  return {
    x: cropBox.x / width,
    y: cropBox.y / height,
    w: cropBox.width / width,
    h: cropBox.height / height,
  };
}

/** Apply a fractional crop to an image URL and return a new blob URL. */
export async function applyImageCropFromUrl(
  imageUrl: string,
  frac: FractionRect,
): Promise<{ blob: Blob; url: string; width: number; height: number }> {
  const img = await loadImageFromUrl(imageUrl);
  const width = img.naturalWidth;
  const height = img.naturalHeight;
  const fullCanvas = drawToCanvas(img, width, height);

  const cropX = Math.round(frac.x * width);
  const cropY = Math.round(frac.y * height);
  const cropW = Math.max(1, Math.round(frac.w * width));
  const cropH = Math.max(1, Math.round(frac.h * height));

  const out = document.createElement('canvas');
  out.width = cropW;
  out.height = cropH;
  const outCtx = out.getContext('2d');
  if (!outCtx) throw new Error('Canvas unavailable');

  outCtx.drawImage(fullCanvas, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);
  const blob = await new Promise<Blob>((resolve, reject) => {
    out.toBlob(
      (b) => (b ? resolve(b) : reject(new Error('Crop export failed'))),
      'image/png',
    );
  });

  return {
    blob,
    url: URL.createObjectURL(blob),
    width: cropW,
    height: cropH,
  };
}
