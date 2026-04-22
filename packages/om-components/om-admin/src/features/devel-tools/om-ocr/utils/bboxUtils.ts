/**
 * BBox Utilities
 * Geometric operations on bounding boxes for OCR vision processing
 */

import type {
  BBox,
  FusionEntry,
  FusionToken,
} from '../types/fusion';

// ============================================================================
// BBox Utilities
// ============================================================================

/**
 * Convert Vision vertices to our BBox format
 */
export function verticesToBBox(vertices: { x?: number; y?: number }[] | undefined): BBox {
  if (!vertices || vertices.length < 4) {
    return { x: 0, y: 0, w: 0, h: 0 };
  }
  
  const xs = vertices.map(v => v.x || 0);
  const ys = vertices.map(v => v.y || 0);
  
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  
  return {
    x: minX,
    y: minY,
    w: maxX - minX,
    h: maxY - minY,
  };
}

/**
 * Get centroid of a bounding box
 */
export function getBBoxCentroid(bbox: BBox): { x: number; y: number } {
  return {
    x: bbox.x + bbox.w / 2,
    y: bbox.y + bbox.h / 2,
  };
}

/**
 * Merge multiple bboxes into one encompassing bbox
 */
export function mergeBBoxes(bboxes: BBox[]): BBox {
  if (bboxes.length === 0) {
    return { x: 0, y: 0, w: 0, h: 0 };
  }
  
  const minX = Math.min(...bboxes.map(b => b.x));
  const minY = Math.min(...bboxes.map(b => b.y));
  const maxX = Math.max(...bboxes.map(b => b.x + b.w));
  const maxY = Math.max(...bboxes.map(b => b.y + b.h));
  
  return {
    x: minX,
    y: minY,
    w: maxX - minX,
    h: maxY - minY,
  };
}

/**
 * Check if two bboxes overlap
 */
export function bboxesOverlap(a: BBox, b: BBox): boolean {
  return !(
    a.x + a.w < b.x ||
    b.x + b.w < a.x ||
    a.y + a.h < b.y ||
    b.y + b.h < a.y
  );
}

/**
 * Check if bbox A is within the same Y band as bbox B (with tolerance)
 */
export function isInSameYBand(a: BBox, b: BBox, tolerance: number = 20): boolean {
  const aCenterY = a.y + a.h / 2;
  const bTop = b.y - tolerance;
  const bBottom = b.y + b.h + tolerance;
  return aCenterY >= bTop && aCenterY <= bBottom;
}

/**
 * Check if bbox A is to the right of bbox B
 */
export function isToRightOf(a: BBox, b: BBox): boolean {
  return a.x > b.x + b.w;
}

/**
 * Check if bbox A is below bbox B
 */
export function isBelow(a: BBox, b: BBox): boolean {
  return a.y > b.y + b.h;
}

/**
 * Check if a bbox is within or intersects with a container bbox
 */
export function isBboxWithinContainer(bbox: BBox, container: BBox): boolean {
  // Check if bbox intersects with container
  return !(
    bbox.x + bbox.w < container.x ||
    container.x + container.w < bbox.x ||
    bbox.y + bbox.h < container.y ||
    container.y + container.h < bbox.y
  );
}

/**
 * Filter entry lines to only include those within the entry bbox
 */
export function filterEntryByBbox(entry: FusionEntry): FusionEntry {
  const filteredLines = entry.lines.filter(line => 
    isBboxWithinContainer(line.bbox, entry.bbox)
  );
  
  // Also filter tokens within each line
  const filteredLinesWithTokens = filteredLines.map(line => ({
    ...line,
    tokens: line.tokens.filter(token => 
      isBboxWithinContainer(token.bbox, entry.bbox)
    ),
  }));

  return {
    ...entry,
    lines: filteredLinesWithTokens,
  };
}

/**
 * Calculate Intersection over Union (IoU) between two bboxes
 */
export function calculateIoU(a: BBox, b: BBox): number {
  const xOverlap = Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x));
  const yOverlap = Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y));
  const intersection = xOverlap * yOverlap;
  
  const areaA = a.w * a.h;
  const areaB = b.w * b.h;
  const union = areaA + areaB - intersection;
  
  return union > 0 ? intersection / union : 0;
}

/**
 * Calculate containment percentage (how much of B is inside A)
 */
export function calculateContainment(container: BBox, contained: BBox): number {
  const xOverlap = Math.max(0, Math.min(container.x + container.w, contained.x + contained.w) - Math.max(container.x, contained.x));
  const yOverlap = Math.max(0, Math.min(container.y + container.h, contained.y + contained.h) - Math.max(container.y, contained.y));
  const intersection = xOverlap * yOverlap;
  
  const areaContained = contained.w * contained.h;
  return areaContained > 0 ? intersection / areaContained : 0;
}

/**
 * Calculate aspect ratio of a bbox
 */
export function calculateAspectRatio(bbox: BBox): number {
  return bbox.h > 0 ? bbox.w / bbox.h : 0;
}

/**
 * Convert vision-space bbox to screen-space bbox based on rendered image dimensions
 */
export function visionToScreenBBox(
  visionBbox: BBox,
  visionWidth: number,
  visionHeight: number,
  screenWidth: number,
  screenHeight: number
): BBox {
  if (visionWidth === 0 || visionHeight === 0) {
    return visionBbox;
  }
  
  const scaleX = screenWidth / visionWidth;
  const scaleY = screenHeight / visionHeight;
  
  return {
    x: visionBbox.x * scaleX,
    y: visionBbox.y * scaleY,
    w: visionBbox.w * scaleX,
    h: visionBbox.h * scaleY,
  };
}
