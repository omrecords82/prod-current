/**
 * Detect and crop separate record cards/regions from a single photo
 * (e.g. 2×2 index cards on a dark background).
 */

import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

export interface PixelBBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface ComponentBox {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  count: number;
}

const BRIGHTNESS_THRESHOLD = 38;
const MIN_AREA_FRACTION = 0.04;
const MAX_COMPONENTS = 12;
const ANALYSIS_MAX_DIM = 900;
const PADDING_FRACTION = 0.01;
const GUTTER_DENSITY_MAX = 0.1;

function findConnectedComponents(mask: Uint8Array, w: number, h: number): ComponentBox[] {
  const visited = new Uint8Array(w * h);
  const components: ComponentBox[] = [];

  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      const start = y * w + x;
      if (!mask[start] || visited[start]) continue;

      const stack = [start];
      visited[start] = 1;
      let minX = x;
      let maxX = x;
      let minY = y;
      let maxY = y;
      let count = 0;

      while (stack.length > 0) {
        const idx = stack.pop()!;
        const px = idx % w;
        const py = Math.floor(idx / w);
        count += 1;
        minX = Math.min(minX, px);
        maxX = Math.max(maxX, px);
        minY = Math.min(minY, py);
        maxY = Math.max(maxY, py);

        const neighbors = [
          [px + 1, py],
          [px - 1, py],
          [px, py + 1],
          [px, py - 1],
        ];
        for (const [nx, ny] of neighbors) {
          if (nx < 0 || nx >= w || ny < 0 || ny >= h) continue;
          const ni = ny * w + nx;
          if (mask[ni] && !visited[ni]) {
            visited[ni] = 1;
            stack.push(ni);
          }
        }
      }

      components.push({ minX, maxX, minY, maxY, count });
    }
  }

  return components;
}

function applyPadding(
  box: PixelBBox,
  imgW: number,
  imgH: number,
): PixelBBox {
  const padX = Math.round(imgW * PADDING_FRACTION);
  const padY = Math.round(imgH * PADDING_FRACTION);
  const x = Math.max(0, box.x - padX);
  const y = Math.max(0, box.y - padY);
  const right = Math.min(imgW, box.x + box.width + padX);
  const bottom = Math.min(imgH, box.y + box.height + padY);
  return {
    x,
    y,
    width: Math.max(1, right - x),
    height: Math.max(1, bottom - y),
  };
}

function buildDensityMaps(mask: Uint8Array, w: number, h: number) {
  const rowDensity = new Float64Array(h);
  const colDensity = new Float64Array(w);
  for (let y = 0; y < h; y += 1) {
    let sum = 0;
    for (let x = 0; x < w; x += 1) sum += mask[y * w + x];
    rowDensity[y] = sum / w;
  }
  for (let x = 0; x < w; x += 1) {
    let sum = 0;
    for (let y = 0; y < h; y += 1) sum += mask[y * w + x];
    colDensity[x] = sum / h;
  }
  return { rowDensity, colDensity };
}

function tryFixedGridSplit(
  mask: Uint8Array,
  sw: number,
  sh: number,
  imgW: number,
  imgH: number,
  rows: number,
  cols: number,
): PixelBBox[] | null {
  const regions: PixelBBox[] = [];
  let validCells = 0;
  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      const x0 = Math.floor((col * sw) / cols);
      const x1 = Math.floor(((col + 1) * sw) / cols);
      const y0 = Math.floor((row * sh) / rows);
      const y1 = Math.floor(((row + 1) * sh) / rows);
      const box = regionFromBounds(x0, x1, y0, y1, sw, sh, imgW, imgH, mask, 0.01);
      if (box) {
        regions.push(box);
        validCells += 1;
      }
    }
  }
  return validCells >= 2 ? regions : null;
}

function findAxisGutterSplit(density: Float64Array, len: number): number | null {
  const start = Math.floor(len * 0.22);
  const end = Math.floor(len * 0.78);
  const center = len / 2;
  let bestIdx = -1;
  let bestScore = Infinity;

  for (let i = start; i < end; i += 1) {
    let windowMin = Infinity;
    for (let j = Math.max(start, i - 6); j <= Math.min(end, i + 6); j += 1) {
      windowMin = Math.min(windowMin, density[j]);
    }
    if (windowMin > GUTTER_DENSITY_MAX) continue;
    const centerBias = Math.abs(i - center) / len;
    const score = windowMin + centerBias * 0.04;
    if (score < bestScore) {
      bestScore = score;
      bestIdx = i;
    }
  }

  return bestIdx >= 0 ? bestIdx : null;
}

function rowDensityForColumn(mask: Uint8Array, sw: number, sh: number, x0: number, x1: number): Float64Array {
  const density = new Float64Array(sh);
  const width = Math.max(1, x1 - x0);
  for (let y = 0; y < sh; y += 1) {
    let sum = 0;
    for (let x = x0; x < x1; x += 1) sum += mask[y * sw + x];
    density[y] = sum / width;
  }
  return density;
}

function regionFromBounds(
  x0: number,
  x1: number,
  y0: number,
  y1: number,
  sw: number,
  sh: number,
  imgW: number,
  imgH: number,
  mask: Uint8Array,
  minAreaFraction = MIN_AREA_FRACTION,
): PixelBBox | null {
  let count = 0;
  for (let y = y0; y < y1; y += 1) {
    for (let x = x0; x < x1; x += 1) count += mask[y * sw + x];
  }
  const area = (x1 - x0) * (y1 - y0);
  if (count < area * minAreaFraction) return null;
  return applyPadding({
    x: Math.round((x0 / sw) * imgW),
    y: Math.round((y0 / sh) * imgH),
    width: Math.round(((x1 - x0) / sw) * imgW),
    height: Math.round(((y1 - y0) / sh) * imgH),
  }, imgW, imgH);
}

function regionsFromGutters(
  mask: Uint8Array,
  sw: number,
  sh: number,
  imgW: number,
  imgH: number,
): PixelBBox[] | null {
  const { colDensity } = buildDensityMaps(mask, sw, sh);
  const colSplit = findAxisGutterSplit(colDensity, sw);

  if (colSplit !== null) {
    const leftRowDensity = rowDensityForColumn(mask, sw, sh, 0, colSplit);
    const rightRowDensity = rowDensityForColumn(mask, sw, sh, colSplit, sw);
    const rowSplit = findAxisGutterSplit(leftRowDensity, sh)
      ?? findAxisGutterSplit(rightRowDensity, sh);

    if (rowSplit !== null) {
      const xBounds = [0, colSplit, sw];
      const yBounds = [0, rowSplit, sh];
      const gridRegions: PixelBBox[] = [];
      for (let row = 0; row < 2; row += 1) {
        for (let col = 0; col < 2; col += 1) {
          const box = regionFromBounds(
            xBounds[col],
            xBounds[col + 1],
            yBounds[row],
            yBounds[row + 1],
            sw,
            sh,
            imgW,
            imgH,
            mask,
          );
          if (box) gridRegions.push(box);
        }
      }
      if (gridRegions.length >= 2) return gridRegions;
    }

    const columnRegions: PixelBBox[] = [];
    for (const [x0, x1] of [[0, colSplit], [colSplit, sw]] as const) {
      const colRowDensity = rowDensityForColumn(mask, sw, sh, x0, x1);
      const localRowSplit = findAxisGutterSplit(colRowDensity, sh);
      const yBounds = localRowSplit !== null ? [0, localRowSplit, sh] : [0, sh];
      for (let row = 0; row < yBounds.length - 1; row += 1) {
        const box = regionFromBounds(x0, x1, yBounds[row], yBounds[row + 1], sw, sh, imgW, imgH, mask);
        if (box) columnRegions.push(box);
      }
    }
    if (columnRegions.length >= 2) return columnRegions;
  }

  const { rowDensity } = buildDensityMaps(mask, sw, sh);
  const rowSplit = findAxisGutterSplit(rowDensity, sh);
  if (rowSplit !== null) {
    const yBounds = [0, rowSplit, sh];
    const rowRegions: PixelBBox[] = [];
    for (let row = 0; row < 2; row += 1) {
      const box = regionFromBounds(0, sw, yBounds[row], yBounds[row + 1], sw, sh, imgW, imgH, mask);
      if (box) rowRegions.push(box);
    }
    if (rowRegions.length >= 2) return rowRegions;
  }

  return null;
}

/**
 * Detect distinct bright record regions on a dark background.
 * Returns pixel boxes sorted top-to-bottom, left-to-right.
 */
export async function detectSeparateRecordRegions(
  imagePath: string,
  opts?: { gridRows?: number; gridCols?: number },
): Promise<PixelBBox[]> {
  if (!fs.existsSync(imagePath)) return [];

  const img = sharp(imagePath);
  const meta = await img.metadata();
  const imgW = meta.width || 0;
  const imgH = meta.height || 0;
  if (imgW < 80 || imgH < 80) return [];

  const scale = Math.min(1, ANALYSIS_MAX_DIM / Math.max(imgW, imgH));
  const sw = Math.max(1, Math.round(imgW * scale));
  const sh = Math.max(1, Math.round(imgH * scale));

  const { data } = await img
    .resize(sw, sh, { fit: 'fill' })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const mask = new Uint8Array(sw * sh);
  for (let i = 0; i < sw * sh; i += 1) {
    const r = data[i * 3];
    const g = data[i * 3 + 1];
    const b = data[i * 3 + 2];
    const lum = 0.299 * r + 0.587 * g + 0.114 * b;
    mask[i] = lum > BRIGHTNESS_THRESHOLD ? 1 : 0;
  }

  const gridRows = Math.min(6, Math.max(0, opts?.gridRows || 0));
  const gridCols = Math.min(6, Math.max(0, opts?.gridCols || 0));
  if (gridRows >= 2 && gridCols >= 2) {
    const gridRegions = tryFixedGridSplit(mask, sw, sh, imgW, imgH, gridRows, gridCols);
    if (gridRegions && gridRegions.length >= 2) return gridRegions;
  }

  const gutterRegions = regionsFromGutters(mask, sw, sh, imgW, imgH);
  if (gutterRegions && gutterRegions.length >= 2) {
    gutterRegions.sort((a, b) => {
      const rowA = Math.floor(a.y / (imgH * 0.5));
      const rowB = Math.floor(b.y / (imgH * 0.5));
      if (rowA !== rowB) return rowA - rowB;
      return a.x - b.x;
    });
    return gutterRegions;
  }

  const minPixels = Math.floor(sw * sh * MIN_AREA_FRACTION);
  const components = findConnectedComponents(mask, sw, sh)
    .filter((c) => c.count >= minPixels)
    .map((c) => ({
      x: Math.round((c.minX / sw) * imgW),
      y: Math.round((c.minY / sh) * imgH),
      width: Math.round(((c.maxX - c.minX + 1) / sw) * imgW),
      height: Math.round(((c.maxY - c.minY + 1) / sh) * imgH),
    }))
    .map((b) => applyPadding(b, imgW, imgH))
    .slice(0, MAX_COMPONENTS);

  components.sort((a, b) => {
    const rowA = Math.floor(a.y / (imgH * 0.5));
    const rowB = Math.floor(b.y / (imgH * 0.5));
    if (rowA !== rowB) return rowA - rowB;
    return a.x - b.x;
  });

  return components;
}

export async function cropRecordRegions(
  imagePath: string,
  regions: PixelBBox[],
  outputDir: string,
  baseName: string,
  ext: string,
): Promise<string[]> {
  if (!regions.length) return [];
  fs.mkdirSync(outputDir, { recursive: true });

  const outputs: string[] = [];
  for (let i = 0; i < regions.length; i += 1) {
    const region = regions[i];
    const outName = `${baseName}_record${i + 1}${ext}`;
    const outPath = path.join(outputDir, outName);
    await sharp(imagePath)
      .extract({
        left: region.x,
        top: region.y,
        width: region.width,
        height: region.height,
      })
      .toFile(outPath);
    outputs.push(outPath);
  }
  return outputs;
}

/** Split into multiple jobs when 2+ distinct record regions are detected. */
export function shouldSplitIntoMultipleJobs(
  recordLayoutMode: string,
  regionCount: number,
): boolean {
  if (regionCount < 2) return false;
  return recordLayoutMode === 'multi_record_split' || recordLayoutMode === 'auto';
}

/** Per-job snippet override for layout modes that process one full record per image. */
export function shouldDisableRecordSnippets(recordLayoutMode: string): boolean {
  return recordLayoutMode === 'multi_record_split' || recordLayoutMode === 'multi_form_page';
}
