/**
 * Layout-Aware Field Extractor (Robust Anchor-Based)
 * Extracts fields using multi-word anchor detection and normalized search zones
 */

// ============================================================================
// Types
// ============================================================================

export interface Token {
  text: string;
  confidence: number;
  langCodes: string[];
  bboxPx: { x0: number; y0: number; x1: number; y1: number };
  bboxNorm: { nx0: number; ny0: number; nx1: number; ny1: number };
  pageIndex: number;
  isRu: boolean;
  tokenId: string;
}

export interface NormalizedBBox {
  x0: number; // 0..1
  y0: number; // 0..1
  x1: number; // 0..1
  y1: number; // 0..1
}

export interface PixelBBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface FieldExtraction {
  fieldKey: string;
  extractedText: string;
  bboxUnionPx: PixelBBox;
  bboxUnionNorm: NormalizedBBox;
  tokensUsedCount: number;
  avgConfidence: number;
  anchorMatched?: string; // Which anchor phrase matched
  anchorBBox?: NormalizedBBox; // Anchor bounding box
  searchZone?: NormalizedBBox; // Search zone used
}

export interface AnchorConfig {
  phrases: string[]; // Multi-word phrases to match
  direction: 'below' | 'right';
  zonePadding: { left: number; right: number; top: number; bottom: number }; // Normalized
  zoneExtent: { width: number; height: number } | 'toNextColumn' | 'toPageEdge';
}

export interface LayoutExtractorConfig {
  confidenceThreshold: number; // Default 0.60
  imageWidth: number;
  imageHeight: number;
  recordType: 'baptism' | 'marriage' | 'funeral';
  entryAreas?: Array<{ entryId: string; bbox: PixelBBox }>; // Pre-detected entry areas
  debug?: boolean;
}

export interface LayoutExtractorResult {
  fields: Record<string, FieldExtraction>;
  anchors: Array<{ fieldKey: string; phrase: string; bbox: NormalizedBBox }>;
  debug?: {
    tokensTotal: number;
    tokensFiltered: number;
    tokensRu: number;
    tokensLowConf: number;
    anchorsMatched: string[];
    extractionMethod: 'anchor' | 'roi' | 'none';
    perEntry?: Record<string, {
      tokensInEntry: number;
      anchorsFound: number;
      fieldsExtracted: number;
    }>;
  };
}

// ============================================================================
// Vision API Types (inline)
// ============================================================================

export interface VisionVertex {
  x: number;
  y: number;
}

export interface VisionBoundingPoly {
  vertices: VisionVertex[];
}

export interface VisionSymbol {
  text: string;
  confidence?: number;
  boundingBox?: VisionBoundingPoly;
  property?: {
    detectedBreak?: {
      type: 'SPACE' | 'SURE_SPACE' | 'EOL_SURE_SPACE' | 'HYPHEN' | 'LINE_BREAK';
    };
  };
}

export interface VisionWord {
  symbols: VisionSymbol[];
  confidence?: number;
  boundingBox?: VisionBoundingPoly;
}

export interface VisionParagraph {
  words: VisionWord[];
  confidence?: number;
  boundingBox?: VisionBoundingPoly;
  detectedLanguages?: Array<{ languageCode: string; confidence?: number }>;
}

export interface VisionBlock {
  paragraphs: VisionParagraph[];
  blockType?: string;
  confidence?: number;
  boundingBox?: VisionBoundingPoly;
  detectedLanguages?: Array<{ languageCode: string; confidence?: number }>;
}

export interface VisionPage {
  blocks: VisionBlock[];
  width: number;
  height: number;
  confidence?: number;
}

export interface VisionFullTextAnnotation {
  pages: VisionPage[];
  text: string;
}

export interface VisionResponse {
  textAnnotations?: any[];
  fullTextAnnotation?: VisionFullTextAnnotation;
}

// ============================================================================
// Anchor Configuration per Field
// ============================================================================

const ANCHOR_CONFIGS: Record<string, AnchorConfig> = {
  record_number: {
    phrases: ['NO', 'N°', 'NUMBER', 'RECORD', 'PARISH RECORD'],
    direction: 'right',
    zonePadding: { left: 0.01, right: 0.05, top: 0, bottom: 0.02 },
    zoneExtent: { width: 0.1, height: 0.05 },
  },
  child_first_name: {
    phrases: ['NAME OF CHILD', 'CHILD', 'FIRST NAME'],
    direction: 'below',
    zonePadding: { left: 0, right: 0, top: 0.01, bottom: 0.05 },
    zoneExtent: { width: 0.3, height: 0.1 },
  },
  child_last_name: {
    phrases: ['LAST NAME', 'SURNAME', 'FAMILY NAME'],
    direction: 'below',
    zonePadding: { left: 0, right: 0, top: 0.01, bottom: 0.05 },
    zoneExtent: { width: 0.3, height: 0.1 },
  },
  birth_date: {
    phrases: ['DATE OF BIRTH', 'BIRTH DATE', 'BORN'],
    direction: 'below',
    zonePadding: { left: 0, right: 0, top: 0.01, bottom: 0.05 },
    zoneExtent: { width: 0.25, height: 0.1 },
  },
  baptism_date: {
    phrases: ['DATE OF BAPTISM', 'BAPTISM DATE', 'BAPTIZED', 'RECEPTION DATE'],
    direction: 'below',
    zonePadding: { left: 0, right: 0, top: 0.01, bottom: 0.05 },
    zoneExtent: { width: 0.3, height: 0.1 },
  },
  birthplace: {
    phrases: ['PLACE OF BIRTH', 'BIRTHPLACE', 'CITY OF BIRTH', 'BORN IN'],
    direction: 'below',
    zonePadding: { left: 0, right: 0, top: 0.01, bottom: 0.05 },
    zoneExtent: { width: 0.3, height: 0.1 },
  },
  sponsors: {
    phrases: ['FULL NAMES OF SPONSORS', 'NAMES OF SPONSORS', 'SPONSORS', 'GODPARENTS', 'GOD PARENTS'],
    direction: 'below',
    zonePadding: { left: 0, right: 0, top: 0.01, bottom: 0.08 },
    zoneExtent: { width: 0.45, height: 0.12 },
  },
  parents: {
    phrases: ['PARENTS', 'FATHER', 'MOTHER', 'NAME OF PARENTS', "FATHER'S NAME", "MOTHER'S NAME"],
    direction: 'below',
    zonePadding: { left: 0, right: 0, top: 0.01, bottom: 0.08 },
    zoneExtent: { width: 0.4, height: 0.12 },
  },
  clergy: {
    phrases: ["PRIEST'S NAME", 'PRIEST NAME', 'PRIEST', 'CLERGY', 'PERFORMED BY', 'SACRAMENTS PERFORMED BY'],
    direction: 'right',
    zonePadding: { left: 0.02, right: 0.02, top: 0, bottom: 0.05 },
    zoneExtent: 'toPageEdge', // Spans to right edge of page
  },
};

// Marriage anchor configs
const MARRIAGE_ANCHOR_CONFIGS: Record<string, AnchorConfig> = {
  groom_name: {
    phrases: ['GROOM', 'BRIDEGROOM', 'HUSBAND', 'NAME OF GROOM'],
    direction: 'below',
    zonePadding: { left: 0, right: 0, top: 0.01, bottom: 0.05 },
    zoneExtent: { width: 0.4, height: 0.1 },
  },
  bride_name: {
    phrases: ['BRIDE', 'WIFE', 'NAME OF BRIDE'],
    direction: 'below',
    zonePadding: { left: 0, right: 0, top: 0.01, bottom: 0.05 },
    zoneExtent: { width: 0.4, height: 0.1 },
  },
  date_of_marriage: {
    phrases: ['DATE OF MARRIAGE', 'MARRIAGE DATE', 'WEDDING DATE', 'MARRIED'],
    direction: 'below',
    zonePadding: { left: 0, right: 0, top: 0.01, bottom: 0.05 },
    zoneExtent: { width: 0.3, height: 0.1 },
  },
  witnesses: {
    phrases: ['WITNESSES', 'WITNESS', 'BEST MAN', 'KOOM', 'KUMOVI'],
    direction: 'below',
    zonePadding: { left: 0, right: 0, top: 0.01, bottom: 0.08 },
    zoneExtent: { width: 0.45, height: 0.12 },
  },
  officiant: {
    phrases: ['PRIEST', 'CLERGY', 'OFFICIANT', 'PERFORMED BY', 'SACRAMENTS PERFORMED BY'],
    direction: 'right',
    zonePadding: { left: 0.02, right: 0.02, top: 0, bottom: 0.05 },
    zoneExtent: 'toPageEdge',
  },
};

// Funeral anchor configs
const FUNERAL_ANCHOR_CONFIGS: Record<string, AnchorConfig> = {
  deceased_name: {
    phrases: ['DECEASED', 'NAME OF DECEASED', 'DECEDENT', 'FULL NAME'],
    direction: 'below',
    zonePadding: { left: 0, right: 0, top: 0.01, bottom: 0.05 },
    zoneExtent: { width: 0.4, height: 0.1 },
  },
  date_of_death: {
    phrases: ['DATE OF DEATH', 'DIED', 'DEATH DATE'],
    direction: 'below',
    zonePadding: { left: 0, right: 0, top: 0.01, bottom: 0.05 },
    zoneExtent: { width: 0.3, height: 0.1 },
  },
  date_of_funeral: {
    phrases: ['DATE OF FUNERAL', 'FUNERAL DATE', 'FUNERAL SERVICE'],
    direction: 'below',
    zonePadding: { left: 0, right: 0, top: 0.01, bottom: 0.05 },
    zoneExtent: { width: 0.3, height: 0.1 },
  },
  date_of_burial: {
    phrases: ['DATE OF BURIAL', 'BURIAL DATE', 'INTERMENT', 'BURIED'],
    direction: 'below',
    zonePadding: { left: 0, right: 0, top: 0.01, bottom: 0.05 },
    zoneExtent: { width: 0.3, height: 0.1 },
  },
  place_of_burial: {
    phrases: ['PLACE OF BURIAL', 'CEMETERY', 'INTERMENT PLACE', 'BURIED AT'],
    direction: 'below',
    zonePadding: { left: 0, right: 0, top: 0.01, bottom: 0.05 },
    zoneExtent: { width: 0.4, height: 0.1 },
  },
  age_at_death: {
    phrases: ['AGE', 'AGE AT DEATH', 'YEARS OLD'],
    direction: 'right',
    zonePadding: { left: 0.01, right: 0.02, top: 0, bottom: 0.02 },
    zoneExtent: { width: 0.15, height: 0.05 },
  },
  cause_of_death: {
    phrases: ['CAUSE OF DEATH', 'CAUSE', 'MANNER OF DEATH'],
    direction: 'below',
    zonePadding: { left: 0, right: 0, top: 0.01, bottom: 0.05 },
    zoneExtent: { width: 0.4, height: 0.1 },
  },
  officiant: {
    phrases: ['PRIEST', 'CLERGY', 'OFFICIANT', 'PERFORMED BY'],
    direction: 'right',
    zonePadding: { left: 0.02, right: 0.02, top: 0, bottom: 0.05 },
    zoneExtent: 'toPageEdge',
  },
};

// All default anchors by record type
export const DEFAULT_ANCHOR_CONFIGS: Record<string, Record<string, AnchorConfig>> = {
  baptism: ANCHOR_CONFIGS,
  marriage: MARRIAGE_ANCHOR_CONFIGS,
  funeral: FUNERAL_ANCHOR_CONFIGS,
};

// Canonical 9 fields for baptism
const BAPTISM_FIELDS = [
  'record_number',
  'child_first_name',
  'child_last_name',
  'birth_date',
  'baptism_date',
  'birthplace',
  'sponsors',
  'parents',
  'clergy',
] as const;

const MARRIAGE_FIELDS = [
  'groom_name',
  'bride_name',
  'date_of_marriage',
  'witnesses',
  'officiant',
] as const;

const FUNERAL_FIELDS = [
  'deceased_name',
  'date_of_death',
  'date_of_funeral',
  'date_of_burial',
  'place_of_burial',
  'age_at_death',
  'cause_of_death',
  'officiant',
] as const;

const FIELD_LISTS_BY_TYPE: Record<string, readonly string[]> = {
  baptism: BAPTISM_FIELDS,
  marriage: MARRIAGE_FIELDS,
  funeral: FUNERAL_FIELDS,
};

// ============================================================================
// Coordinate Conversion Utilities
// ============================================================================

function verticesToPixelBBox(vertices: VisionVertex[] | undefined): { x0: number; y0: number; x1: number; y1: number } | null {
  if (!vertices || vertices.length < 4) return null;
  
  const xs = vertices.map(v => v.x || 0);
  const ys = vertices.map(v => v.y || 0);
  
  return {
    x0: Math.min(...xs),
    y0: Math.min(...ys),
    x1: Math.max(...xs),
    y1: Math.max(...ys),
  };
}

function pixelToNormalized(bbox: { x0: number; y0: number; x1: number; y1: number }, imageWidth: number, imageHeight: number): NormalizedBBox {
  return {
    x0: bbox.x0 / imageWidth,
    y0: bbox.y0 / imageHeight,
    x1: bbox.x1 / imageWidth,
    y1: bbox.y1 / imageHeight,
  };
}

function normalizedToPixel(bbox: NormalizedBBox, imageWidth: number, imageHeight: number): PixelBBox {
  return {
    x: bbox.x0 * imageWidth,
    y: bbox.y0 * imageHeight,
    w: (bbox.x1 - bbox.x0) * imageWidth,
    h: (bbox.y1 - bbox.y0) * imageHeight,
  };
}

// ============================================================================
// Token Extraction with Full Metadata
// ============================================================================

function extractTokens(
  visionResponse: VisionResponse,
  config: LayoutExtractorConfig
): Token[] {
  const tokens: Token[] = [];
  const fullText = visionResponse.fullTextAnnotation;
  
  if (!fullText || !fullText.pages || fullText.pages.length === 0) {
    return tokens;
  }
  
  let tokenIdCounter = 0;
  
  for (let pageIndex = 0; pageIndex < fullText.pages.length; pageIndex++) {
    const page = fullText.pages[pageIndex];
    
    for (const block of page.blocks || []) {
      const blockLangCodes = (block.detectedLanguages || []).map(l => l.languageCode || '');
      const isBlockRu = blockLangCodes.includes('ru');
      
      for (const paragraph of block.paragraphs || []) {
        const paraLangCodes = (paragraph.detectedLanguages || []).map(l => l.languageCode || '');
        const isParaRu = paraLangCodes.includes('ru');
        const isRu = isBlockRu || isParaRu;
        
        for (const word of paragraph.words || []) {
          for (const symbol of word.symbols || []) {
            const pixelBbox = verticesToPixelBBox(symbol.boundingBox?.vertices);
            if (!pixelBbox) continue;
            
            const bboxNorm = pixelToNormalized(pixelBbox, config.imageWidth, config.imageHeight);
            
            const confidence = symbol.confidence ?? word.confidence ?? paragraph.confidence ?? block.confidence ?? 1.0;
            const langCodes = [...new Set([...blockLangCodes, ...paraLangCodes])];
            
            tokens.push({
              text: symbol.text || '',
              confidence,
              langCodes,
              bboxPx: pixelBbox,
              bboxNorm: {
                nx0: bboxNorm.x0,
                ny0: bboxNorm.y0,
                nx1: bboxNorm.x1,
                ny1: bboxNorm.y1
              },
              pageIndex,
              isRu,
              tokenId: `token_${tokenIdCounter++}`,
            });
          }
        }
      }
    }
  }
  
  return tokens;
}

// ============================================================================
// Line Clustering and Reading Order
// ============================================================================

interface LineGroup {
  tokens: Token[];
  yCenter: number;
  xCenter: number;
}

function clusterTokensIntoLines(tokens: Token[]): LineGroup[] {
  if (tokens.length === 0) return [];
  
  // Sort by Y center, then X
  const sorted = [...tokens].sort((a, b) => {
    const aY = (a.bboxNorm.ny0 + a.bboxNorm.ny1) / 2;
    const bY = (b.bboxNorm.ny0 + b.bboxNorm.ny1) / 2;
    const yDiff = aY - bY;
    if (Math.abs(yDiff) > 0.01) return yDiff; // Different lines (1% tolerance)
    return (a.bboxNorm.nx0 + a.bboxNorm.nx1) / 2 - (b.bboxNorm.nx0 + b.bboxNorm.nx1) / 2;
  });
  
  // Cluster into lines
  const lines: LineGroup[] = [];
  let currentLine: Token[] = [sorted[0]];
  let currentY = (sorted[0].bboxNorm.ny0 + sorted[0].bboxNorm.ny1) / 2;
  const lineHeight = sorted[0].bboxNorm.ny1 - sorted[0].bboxNorm.ny0;
  const tolerance = lineHeight * 1.5; // 1.5x line height tolerance
  
  for (let i = 1; i < sorted.length; i++) {
    const token = sorted[i];
    const tokenY = (token.bboxNorm.ny0 + token.bboxNorm.ny1) / 2;
    
    if (Math.abs(tokenY - currentY) <= tolerance) {
      currentLine.push(token);
    } else {
      // New line
      const yCenter = currentLine.reduce((sum, t) => sum + (t.bboxNorm.ny0 + t.bboxNorm.ny1) / 2, 0) / currentLine.length;
      const xCenter = currentLine.reduce((sum, t) => sum + (t.bboxNorm.nx0 + t.bboxNorm.nx1) / 2, 0) / currentLine.length;
      lines.push({ tokens: currentLine, yCenter, xCenter });
      currentLine = [token];
      currentY = tokenY;
    }
  }
  
  // Add last line
  if (currentLine.length > 0) {
    const yCenter = currentLine.reduce((sum, t) => sum + (t.bboxNorm.ny0 + t.bboxNorm.ny1) / 2, 0) / currentLine.length;
    const xCenter = currentLine.reduce((sum, t) => sum + (t.bboxNorm.nx0 + t.bboxNorm.nx1) / 2, 0) / currentLine.length;
    lines.push({ tokens: currentLine, yCenter, xCenter });
  }
  
  return lines;
}

// ============================================================================
// Multi-Word Anchor Detection
// ============================================================================

function normalizeText(text: string): string {
  return text.toUpperCase().replace(/[^\w\s]/g, '').trim();
}

function matchPhraseInLine(line: LineGroup, phrase: string): Token[] | null {
  const phraseWords = normalizeText(phrase).split(/\s+/).filter(w => w.length > 0);
  if (phraseWords.length === 0) return null;
  
  const lineTokens = line.tokens;
  if (lineTokens.length < phraseWords.length) return null;
  
  // Try to match phrase as sequence
  for (let i = 0; i <= lineTokens.length - phraseWords.length; i++) {
    const candidate = lineTokens.slice(i, i + phraseWords.length);
    const candidateText = candidate.map(t => normalizeText(t.text)).join(' ');
    
    if (candidateText === phraseWords.join(' ')) {
      return candidate;
    }
    
    // Also try without spaces (for cases like "PRIEST'S" vs "PRIEST S")
    const candidateNoSpace = candidate.map(t => normalizeText(t.text)).join('');
    const phraseNoSpace = phraseWords.join('');
    if (candidateNoSpace === phraseNoSpace) {
      return candidate;
    }
  }
  
  return null;
}

function detectAnchors(
  tokens: Token[],
  config: LayoutExtractorConfig,
  customAnchors?: Record<string, AnchorConfig>
): Array<{ fieldKey: string; phrase: string; bbox: NormalizedBBox }> {
  const anchors: Array<{ fieldKey: string; phrase: string; bbox: NormalizedBBox }> = [];
  const lines = clusterTokensIntoLines(tokens);

  // Use custom anchors if provided, otherwise use defaults for the record type
  const anchorConfigs = customAnchors || DEFAULT_ANCHOR_CONFIGS[config.recordType] || ANCHOR_CONFIGS;
  const fieldKeys = customAnchors
    ? Object.keys(customAnchors)
    : (FIELD_LISTS_BY_TYPE[config.recordType] || BAPTISM_FIELDS);

  for (const fieldKey of fieldKeys) {
    const anchorConfig = anchorConfigs[fieldKey];
    if (!anchorConfig) continue;
    
    for (const phrase of anchorConfig.phrases) {
      for (const line of lines) {
        const matchedTokens = matchPhraseInLine(line, phrase);
        if (matchedTokens && matchedTokens.length > 0) {
          // Compute union bbox of matched tokens
          const x0 = Math.min(...matchedTokens.map(t => t.bboxNorm.nx0));
          const y0 = Math.min(...matchedTokens.map(t => t.bboxNorm.ny0));
          const x1 = Math.max(...matchedTokens.map(t => t.bboxNorm.nx1));
          const y1 = Math.max(...matchedTokens.map(t => t.bboxNorm.ny1));
          
          anchors.push({
            fieldKey,
            phrase,
            bbox: { x0, y0, x1, y1 },
          });
          
          break; // One anchor per field
        }
      }
      if (anchors.some(a => a.fieldKey === fieldKey)) break; // Found anchor for this field
    }
  }
  
  return anchors;
}

// ============================================================================
// Search Zone Computation
// ============================================================================

function computeSearchZone(
  anchorBBox: NormalizedBBox,
  anchorConfig: AnchorConfig,
  imageWidth: number,
  imageHeight: number
): NormalizedBBox {
  const { direction, zonePadding, zoneExtent } = anchorConfig;
  
  let zone: NormalizedBBox;
  
  if (direction === 'below') {
    zone = {
      x0: anchorBBox.x0 - zonePadding.left,
      y0: anchorBBox.y1 + zonePadding.top,
      x1: anchorBBox.x1 + zonePadding.right,
      y1: anchorBBox.y1 + zonePadding.top + (typeof zoneExtent === 'object' ? zoneExtent.height : 0.1),
    };
    
    if (typeof zoneExtent === 'object') {
      zone.x1 = zone.x0 + zoneExtent.width;
    }
  } else {
    // direction === 'right'
    zone = {
      x0: anchorBBox.x1 + zonePadding.left,
      y0: anchorBBox.y0 - zonePadding.top,
      x1: zoneExtent === 'toPageEdge' ? 1.0 : (anchorBBox.x1 + zonePadding.left + (typeof zoneExtent === 'object' ? zoneExtent.width : 0.3)),
      y1: anchorBBox.y1 + zonePadding.bottom,
    };
  }
  
  // Clamp to [0, 1]
  zone.x0 = Math.max(0, Math.min(1, zone.x0));
  zone.y0 = Math.max(0, Math.min(1, zone.y0));
  zone.x1 = Math.max(0, Math.min(1, zone.x1));
  zone.y1 = Math.max(0, Math.min(1, zone.y1));
  
  return zone;
}

// ============================================================================
// Token Extraction from Zone
// ============================================================================

function bboxOverlap(a: NormalizedBBox, b: NormalizedBBox): number {
  const xOverlap = Math.max(0, Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0));
  const yOverlap = Math.max(0, Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0));
  const overlapArea = xOverlap * yOverlap;
  const aArea = (a.x1 - a.x0) * (a.y1 - a.y0);
  return aArea > 0 ? overlapArea / aArea : 0;
}

function extractTokensFromZone(
  tokens: Token[],
  zone: NormalizedBBox,
  config: LayoutExtractorConfig,
  overlapThreshold: number = 0.3
): Token[] {
  return tokens.filter(token => {
    // Exclude Russian
    if (token.isRu) return false;
    
    // Exclude low confidence
    if (token.confidence < config.confidenceThreshold) return false;
    
    // Check overlap - convert token.bboxNorm to NormalizedBBox format
    const tokenBBox: NormalizedBBox = {
      x0: token.bboxNorm.nx0,
      y0: token.bboxNorm.ny0,
      x1: token.bboxNorm.nx1,
      y1: token.bboxNorm.ny1
    };
    const overlap = bboxOverlap(tokenBBox, zone);
    return overlap >= overlapThreshold;
  });
}

function joinTokensInReadingOrder(tokens: Token[]): string {
  if (tokens.length === 0) return '';
  
  // Sort by reading order (top-to-bottom, left-to-right)
  const sorted = [...tokens].sort((a, b) => {
    const yDiff = (a.bboxNorm.ny0 + a.bboxNorm.ny1) / 2 - (b.bboxNorm.ny0 + b.bboxNorm.ny1) / 2;
    if (Math.abs(yDiff) > 0.01) return yDiff;
    return (a.bboxNorm.nx0 + a.bboxNorm.nx1) / 2 - (b.bboxNorm.nx0 + b.bboxNorm.nx1) / 2;
  });
  
  // Join with spaces, but detect line breaks
  const parts: string[] = [];
  for (let i = 0; i < sorted.length; i++) {
    parts.push(sorted[i].text);
    
    // Check if next token is on a different line
    if (i < sorted.length - 1) {
      const currentY = (sorted[i].bboxNorm.ny0 + sorted[i].bboxNorm.ny1) / 2;
      const nextY = (sorted[i + 1].bboxNorm.ny0 + sorted[i + 1].bboxNorm.ny1) / 2;
      const lineHeight = sorted[i].bboxNorm.ny1 - sorted[i].bboxNorm.ny0;
      
      if (Math.abs(nextY - currentY) > lineHeight * 1.5) {
        parts.push('\n');
      } else {
        parts.push(' ');
      }
    }
  }
  
  return parts.join('').trim();
}

function computeUnionBBox(tokens: Token[], imageWidth: number, imageHeight: number): { px: PixelBBox; norm: NormalizedBBox } | null {
  if (tokens.length === 0) return null;
  
  const x0 = Math.min(...tokens.map(t => t.bboxNorm.nx0));
  const y0 = Math.min(...tokens.map(t => t.bboxNorm.ny0));
  const x1 = Math.max(...tokens.map(t => t.bboxNorm.nx1));
  const y1 = Math.max(...tokens.map(t => t.bboxNorm.ny1));
  
  const norm: NormalizedBBox = { x0, y0, x1, y1 };
  const px = normalizedToPixel(norm, imageWidth, imageHeight);
  
  return { px, norm };
}

// ============================================================================
// Entry Area / Quadrant Support
// ============================================================================

function clipTokensToEntryArea(tokens: Token[], entryArea: { entryId: string; bbox: PixelBBox }, imageWidth: number, imageHeight: number): Token[] {
  const entryNorm: NormalizedBBox = {
    x0: entryArea.bbox.x / imageWidth,
    y0: entryArea.bbox.y / imageHeight,
    x1: (entryArea.bbox.x + entryArea.bbox.w) / imageWidth,
    y1: (entryArea.bbox.y + entryArea.bbox.h) / imageHeight,
  };
  
  return tokens.filter(token => {
    // Convert token.bboxNorm to NormalizedBBox format
    const tokenBBox: NormalizedBBox = {
      x0: token.bboxNorm.nx0,
      y0: token.bboxNorm.ny0,
      x1: token.bboxNorm.nx1,
      y1: token.bboxNorm.ny1
    };
    const overlap = bboxOverlap(tokenBBox, entryNorm);
    return overlap >= 0.3; // Token must overlap with entry area
  });
}

function splitTokensIntoQuadrants(tokens: Token[]): Record<string, Token[]> {
  const quadrants: Record<string, Token[]> = {
    TL: [], // Top-left
    TR: [], // Top-right
    BL: [], // Bottom-left
    BR: [], // Bottom-right
  };
  
  for (const token of tokens) {
    const centerX = (token.bboxNorm.nx0 + token.bboxNorm.nx1) / 2;
    const centerY = (token.bboxNorm.ny0 + token.bboxNorm.ny1) / 2;
    
    const isTop = centerY < 0.5;
    const isLeft = centerX < 0.5;
    
    if (isTop && isLeft) quadrants.TL.push(token);
    else if (isTop && !isLeft) quadrants.TR.push(token);
    else if (!isTop && isLeft) quadrants.BL.push(token);
    else quadrants.BR.push(token);
  }
  
  return quadrants;
}

// ============================================================================
// Main Layout Extractor
// ============================================================================

export function extractLayoutFields(
  visionResponse: VisionResponse,
  config: LayoutExtractorConfig,
  customAnchors?: Record<string, AnchorConfig>
): LayoutExtractorResult {
  const debug = config.debug || false;
  
  // Extract all tokens with full metadata
  const allTokens = extractTokens(visionResponse, config);
  const tokensTotal = allTokens.length;
  const tokensRu = allTokens.filter(t => t.isRu).length;
  const tokensLowConf = allTokens.filter(t => t.confidence < config.confidenceThreshold).length;
  const tokensFiltered = tokensRu + tokensLowConf;
  
  if (debug) {
    console.log(`[LayoutExtractor] Extracted ${tokensTotal} tokens`);
    console.log(`[LayoutExtractor] Filtered: ${tokensRu} Russian, ${tokensLowConf} low confidence`);
  }
  
  // Determine extraction regions
  const hasEntryAreas = config.entryAreas && config.entryAreas.length > 0;
  const extractionRegions = hasEntryAreas
    ? config.entryAreas!.map(area => ({ type: 'entry' as const, area, tokens: clipTokensToEntryArea(allTokens, area, config.imageWidth, config.imageHeight) }))
    : [{ type: 'quadrant' as const, quadrants: splitTokensIntoQuadrants(allTokens) }];
  
  const fields: Record<string, FieldExtraction> = {};
  const anchors: Array<{ fieldKey: string; phrase: string; bbox: NormalizedBBox }> = [];
  const debugPerEntry: Record<string, any> = {};
  
  // Extract fields per region
  for (const region of extractionRegions) {
    if (region.type === 'entry') {
      const entryId = region.area.entryId;
      const entryTokens = region.tokens;
      
      if (debug) {
        console.log(`[LayoutExtractor] Processing entry ${entryId} with ${entryTokens.length} tokens`);
      }
      
      // Detect anchors in this entry
      const entryAnchors = detectAnchors(entryTokens, config, customAnchors);

      // Extract each field
      const anchorConfigs = customAnchors || DEFAULT_ANCHOR_CONFIGS[config.recordType] || ANCHOR_CONFIGS;
      const fieldKeys = customAnchors
        ? Object.keys(customAnchors)
        : (FIELD_LISTS_BY_TYPE[config.recordType] || BAPTISM_FIELDS);
      for (const fieldKey of fieldKeys) {
        const anchorConfig = anchorConfigs[fieldKey];
        if (!anchorConfig) continue;
        
        const anchor = entryAnchors.find(a => a.fieldKey === fieldKey);
        if (!anchor) continue;
        
        // Compute search zone
        const searchZone = computeSearchZone(anchor.bbox, anchorConfig, config.imageWidth, config.imageHeight);
        
        // Extract tokens from zone
        const zoneTokens = extractTokensFromZone(entryTokens, searchZone, config);
        const extractedText = joinTokensInReadingOrder(zoneTokens);
        
        if (extractedText || debug) {
          const unionBBox = computeUnionBBox(zoneTokens, config.imageWidth, config.imageHeight);
          const avgConfidence = zoneTokens.length > 0
            ? zoneTokens.reduce((sum, t) => sum + t.confidence, 0) / zoneTokens.length
            : 0;
          
          const fieldKeyWithEntry = `${entryId}_${fieldKey}`;
          fields[fieldKeyWithEntry] = {
            fieldKey,
            extractedText,
            bboxUnionPx: unionBBox?.px || { x: 0, y: 0, w: 0, h: 0 },
            bboxUnionNorm: unionBBox?.norm || { x0: 0, y0: 0, x1: 0, y1: 0 },
            tokensUsedCount: zoneTokens.length,
            avgConfidence,
            anchorMatched: anchor.phrase,
            anchorBBox: anchor.bbox,
            searchZone,
          };
          
          if (debug) {
            console.log(`[LayoutExtractor] ${fieldKeyWithEntry}: "${extractedText}" (${zoneTokens.length} tokens, conf=${avgConfidence.toFixed(2)})`);
            console.log(`[LayoutExtractor]   Anchor: "${anchor.phrase}" at (${anchor.bbox.x0.toFixed(3)}, ${anchor.bbox.y0.toFixed(3)})`);
            console.log(`[LayoutExtractor]   Zone: (${searchZone.x0.toFixed(3)}, ${searchZone.y0.toFixed(3)}) to (${searchZone.x1.toFixed(3)}, ${searchZone.y1.toFixed(3)})`);
          }
        }
      }
      
      anchors.push(...entryAnchors);
      
      if (debug) {
        debugPerEntry[entryId] = {
          tokensInEntry: entryTokens.length,
          anchorsFound: entryAnchors.length,
          fieldsExtracted: Object.keys(fields).filter(k => k.startsWith(entryId + '_')).length,
        };
      }
    } else {
      // Quadrant-based extraction (fallback)
      // Similar logic but per quadrant
      // TODO: Implement quadrant extraction if needed
    }
  }
  
  return {
    fields,
    anchors,
    debug: debug ? {
      tokensTotal,
      tokensFiltered,
      tokensRu,
      tokensLowConf,
      anchorsMatched: anchors.map(a => `${a.fieldKey}:${a.phrase}`),
      extractionMethod: anchors.length > 0 ? 'anchor' : 'none',
      perEntry: debugPerEntry,
    } : undefined,
  };
}

// ============================================================================
// Test-only exports
// ============================================================================
// These pure helpers are exposed solely so the unit-test suite can exercise
// them in isolation. They are NOT part of the public API — production callers
// should use `extractLayoutFields` only.
export const __test__ = {
  verticesToPixelBBox,
  pixelToNormalized,
  normalizedToPixel,
  bboxOverlap,
  normalizeText,
  clusterTokensIntoLines,
  matchPhraseInLine,
  computeSearchZone,
  joinTokensInReadingOrder,
  computeUnionBBox,
};
