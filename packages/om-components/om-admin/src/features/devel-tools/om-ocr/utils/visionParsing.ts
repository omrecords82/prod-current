/**
 * Vision JSON Parsing
 * Parses Google Vision API response into structured FusionLines and tokens
 */

import type {
  BBox,
  FusionLine,
  FusionToken,
  VisionResponse,
  VisionBlock,
  VisionParagraph,
  VisionWord,
  VisionVertex,
} from '../types/fusion';
import { verticesToBBox, mergeBBoxes } from './bboxUtils';

// ============================================================================
// Vision JSON Parsing
// ============================================================================

/**
 * Extract word text from Vision symbols
 */
function extractWordText(word: VisionWord): string {
  if (!word.symbols) return '';
  
  let text = '';
  for (const symbol of word.symbols) {
    text += symbol.text || '';
    // Add space/break after symbol if indicated
    if (symbol.property?.detectedBreak) {
      const breakType = symbol.property.detectedBreak.type;
      if (breakType === 'SPACE' || breakType === 'SURE_SPACE') {
        text += ' ';
      }
    }
  }
  return text;
}

/**
 * Generate stable deterministic ID for a token/line
 * Uses bbox coordinates rounded to integers + text + index for uniqueness
 */
function generateStableId(
  type: 'token' | 'line',
  text: string,
  bbox: BBox,
  index: number,
  pageIndex: number = 0
): string {
  // Round bbox to integers for stability
  const x = Math.round(bbox.x);
  const y = Math.round(bbox.y);
  const w = Math.round(bbox.w);
  const h = Math.round(bbox.h);
  
  // Normalize text (remove extra whitespace, lowercase for comparison)
  const normalizedText = text.trim().toLowerCase().replace(/\s+/g, ' ');
  
  // Create stable ID: type_pageIndex_x_y_w_h_normalizedText_index
  return `${type}_p${pageIndex}_${x}_${y}_${w}_${h}_${normalizedText.slice(0, 20)}_${index}`;
}

/**
 * Parse Vision word into FusionToken with stable ID
 */
function parseWord(word: VisionWord, index: number, pageIndex: number = 0): FusionToken & { id: string } {
  const text = extractWordText(word).trim();
  const bbox = verticesToBBox(word.boundingBox?.vertices);
  
  return {
    id: generateStableId('token', text, bbox, index, pageIndex),
    text,
    bbox,
    confidence: word.confidence,
  };
}

/**
 * Parse Vision paragraph into FusionLine with stable IDs
 */
function parseParagraph(
  paragraph: VisionParagraph,
  paragraphIndex: number,
  pageIndex: number = 0
): FusionLine & { id: string } {
  const tokens: (FusionToken & { id: string })[] = (paragraph.words || []).map((word, wordIndex) =>
    parseWord(word, wordIndex, pageIndex)
  );
  const text = tokens.map(t => t.text).join(' ');
  const tokenBboxes = tokens.filter(t => t.bbox.w > 0).map(t => t.bbox);
  const bbox = tokenBboxes.length > 0 ? mergeBBoxes(tokenBboxes) : verticesToBBox(paragraph.boundingBox?.vertices);
  
  return {
    id: generateStableId('line', text, bbox, paragraphIndex, pageIndex),
    text,
    bbox,
    confidence: paragraph.confidence,
    tokens,
  };
}

/**
 * Parse Vision block into array of FusionLines with stable IDs
 */
function parseBlock(block: VisionBlock, blockIndex: number, pageIndex: number = 0): (FusionLine & { id: string })[] {
  if (!block.paragraphs) return [];
  return block.paragraphs.map((paragraph, paragraphIndex) =>
    parseParagraph(paragraph, paragraphIndex, pageIndex)
  );
}

/**
 * Parse full Vision response into lines with bboxes and stable IDs
 */
export function parseVisionResponse(vision: VisionResponse | null): (FusionLine & { id: string })[] {
  // Support both standard fullTextAnnotation structure and alternative root-level pages
  const pages = vision?.fullTextAnnotation?.pages || (vision as any)?.pages;
  if (!pages) {
    return [];
  }

  const lines: (FusionLine & { id: string })[] = [];

  pages.forEach((page: any, pageIndex: number) => {
    (page.blocks || []).forEach((block: any, blockIndex: number) => {
      lines.push(...parseBlock(block, blockIndex, pageIndex));
    });
  });

  return lines;
}

/**
 * Get page dimensions from Vision response
 */
export function getVisionPageSize(vision: VisionResponse | null): { width: number; height: number } {
  // Check standard fullTextAnnotation structure
  if (vision?.fullTextAnnotation?.pages?.[0]) {
    const page = vision.fullTextAnnotation.pages[0];
    return {
      width: page.width || 0,
      height: page.height || 0,
    };
  }

  // Check alternative structure where pages are at root level (feeder pipeline)
  const alt = vision as any;
  if (alt?.pages?.[0]?.width) {
    return {
      width: alt.pages[0].width || 0,
      height: alt.pages[0].height || 0,
    };
  }

  return { width: 0, height: 0 };
}
