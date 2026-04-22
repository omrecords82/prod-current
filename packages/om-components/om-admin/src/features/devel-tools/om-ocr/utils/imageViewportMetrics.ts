/**
 * Image Viewport Metrics Helper
 * Provides accurate coordinate space calculations for image overlays
 * Ensures image and overlay share exact coordinate space
 */

export interface ImageViewportMetrics {
  left: number;
  top: number;
  width: number;
  height: number;
  naturalWidth: number;
  naturalHeight: number;
  scaleX: number;
  scaleY: number;
  clientRect: DOMRect;
}

/**
 * Get viewport metrics for an image element
 * Uses getBoundingClientRect() for accurate positioning
 */
export function getImageViewportMetrics(imgEl: HTMLImageElement | null): ImageViewportMetrics | null {
  if (!imgEl) return null;

  const rect = imgEl.getBoundingClientRect();
  const naturalWidth = imgEl.naturalWidth || 0;
  const naturalHeight = imgEl.naturalHeight || 0;
  const displayedWidth = rect.width;
  const displayedHeight = rect.height;

  // Calculate scale factors
  const scaleX = naturalWidth > 0 ? displayedWidth / naturalWidth : 1;
  const scaleY = naturalHeight > 0 ? displayedHeight / naturalHeight : 1;

  return {
    left: rect.left,
    top: rect.top,
    width: displayedWidth,
    height: displayedHeight,
    naturalWidth,
    naturalHeight,
    scaleX,
    scaleY,
    clientRect: rect,
  };
}

/**
 * Convert vision-space coordinates to screen/client coordinates
 */
export function visionToScreen(
  visionX: number,
  visionY: number,
  metrics: ImageViewportMetrics
): { x: number; y: number } {
  return {
    x: metrics.left + visionX * metrics.scaleX,
    y: metrics.top + visionY * metrics.scaleY,
  };
}

/**
 * Convert screen/client coordinates to vision-space coordinates
 */
export function screenToVision(
  screenX: number,
  screenY: number,
  metrics: ImageViewportMetrics
): { x: number; y: number } {
  return {
    x: (screenX - metrics.left) / metrics.scaleX,
    y: (screenY - metrics.top) / metrics.scaleY,
  };
}

/**
 * Convert vision-space bbox to screen-space bbox
 * Vision coordinates are in Vision page space, need to scale to actual image space first
 */
export function visionBboxToScreen(
  bbox: { x: number; y: number; w: number; h: number },
  metrics: ImageViewportMetrics,
  visionWidth?: number,
  visionHeight?: number
): { x: number; y: number; w: number; h: number } {
  // If Vision page dimensions are provided and differ from natural dimensions,
  // scale coordinates from Vision space to actual image space first
  let scaledBbox = bbox;
  if (visionWidth && visionHeight && metrics.naturalWidth && metrics.naturalHeight) {
    const visionToImageScaleX = metrics.naturalWidth / visionWidth;
    const visionToImageScaleY = metrics.naturalHeight / visionHeight;
    
    // Only apply scaling if dimensions differ significantly (>1% difference)
    if (Math.abs(visionToImageScaleX - 1) > 0.01 || Math.abs(visionToImageScaleY - 1) > 0.01) {
      scaledBbox = {
        x: bbox.x * visionToImageScaleX,
        y: bbox.y * visionToImageScaleY,
        w: bbox.w * visionToImageScaleX,
        h: bbox.h * visionToImageScaleY,
      };
    }
  }
  
  // Then scale to screen space
  return {
    x: metrics.left + scaledBbox.x * metrics.scaleX,
    y: metrics.top + scaledBbox.y * metrics.scaleY,
    w: scaledBbox.w * metrics.scaleX,
    h: scaledBbox.h * metrics.scaleY,
  };
}

/**
 * Convert screen-space bbox to vision-space bbox
 */
export function screenBboxToVision(
  screenBbox: { x: number; y: number; w: number; h: number },
  metrics: ImageViewportMetrics
): { x: number; y: number; w: number; h: number } {
  return {
    x: (screenBbox.x - metrics.left) / metrics.scaleX,
    y: (screenBbox.y - metrics.top) / metrics.scaleY,
    w: screenBbox.w / metrics.scaleX,
    h: screenBbox.h / metrics.scaleY,
  };
}

