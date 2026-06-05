/**
 * Transcription Normalization Module (Server-Side Canonical)
 * Converts OCR tokens/lines into readable transcription text
 * This is the source-of-truth for stored OCR output
 */

import { Token } from '../layoutExtractor';
import { OcrLine } from './extractTokensFromVision';

export interface OcrToken {
  text: string;
  confidence?: number;
  bbox?: { x0: number; y0: number; x1: number; y1: number }; // Normalized 0..1
  langHint?: 'latin' | 'cyrillic' | 'mixed' | 'unknown';
}

export interface NormalizationSettings {
  transcriptionMode?: 'exact' | 'fix-spelling'; // For v1, only 'exact' is implemented
  textExtractionScope?: 'all' | 'handwritten-only'; // For v1, only 'all' is implemented
  formattingMode?: 'improve-formatting'; // For v1, always improves formatting
  confidenceThreshold?: number; // Default 0.35
}

export interface NormalizationResult {
  text: string;
  paragraphs: string[];
  diagnostics: {
    droppedTokenCount: number;
    lineCount: number;
    paragraphCount: number;
    scriptsPresent: string[];
    warnings: string[];
  };
}

/**
 * Script detection (fast classifier)
 */
function detectScript(text: string): 'latin' | 'cyrillic' | 'unknown' {
  if (!text) return 'unknown';
  
  // Check for Cyrillic (Unicode range \u0400-\u04FF)
  const hasCyrillic = /[\u0400-\u04FF]/.test(text);
  
  // Check for Latin (A-Z, a-z)
  const hasLatin = /[A-Za-z]/.test(text);
  
  if (hasCyrillic) return 'cyrillic';
  if (hasLatin) return 'latin';
  return 'unknown';
}

/**
 * Check if token is OCR garbage
 */
function isOcrGarbage(text: string): boolean {
  if (!text || text.length <= 2) return false;
  
  // Repeated random consonants (conservative pattern)
  // e.g., "qwertyuiop", "zxcvbnm" - but allow reasonable words
  const repeatedConsonants = /^[bcdfghjklmnpqrstvwxyz]{5,}$/i;
  if (repeatedConsonants.test(text) && text.length > 6) {
    // Allow if it looks like a real word (has vowels or is short)
    const hasVowels = /[aeiouAEIOUаеёиоуыэюяАЕЁИОУЫЭЮЯ]/.test(text);
    if (!hasVowels) return true;
  }
  
  return false;
}

/**
 * Token cleanup
 */
function shouldDropToken(token: OcrToken | Token, threshold: number): boolean {
  const text = token.text?.trim() || '';
  const confidence = 'confidence' in token ? token.confidence : undefined;
  
  // Drop empty tokens
  if (!text) return true;
  
  // Drop single-character punctuation-only tokens
  if (text.length === 1 && !/[A-Za-z0-9А-Яа-я]/.test(text)) {
    return true;
  }
  
  // Drop low-confidence short tokens
  if (confidence !== undefined && confidence < threshold && text.length <= 2) {
    return true;
  }
  
  // Drop OCR garbage
  if (isOcrGarbage(text)) {
    return true;
  }
  
  return false;
}

/**
 * Normalize token text
 */
function normalizeTokenText(text: string): string {
  return text
    .trim()
    .replace(/\s+/g, ' ') // Collapse whitespace
    .trim();
}

/**
 * Get Y-center from token (handles both Token and OcrToken)
 */
function getTokenYCenter(token: OcrToken | Token): number {
  if ('bboxNorm' in token && token.bboxNorm) {
    return (token.bboxNorm.ny0 + token.bboxNorm.ny1) / 2;
  }
  if ('bbox' in token && token.bbox) {
    return (token.bbox.y0 + token.bbox.y1) / 2;
  }
  return 0.5;
}

/**
 * Get token height (handles both Token and OcrToken)
 */
function getTokenHeight(token: OcrToken | Token): number {
  if ('bboxNorm' in token && token.bboxNorm) {
    return Math.abs(token.bboxNorm.ny1 - token.bboxNorm.ny0);
  }
  if ('bbox' in token && token.bbox) {
    return Math.abs(token.bbox.y1 - token.bbox.y0);
  }
  return 0.02;
}

/**
 * Get X position from token (handles both Token and OcrToken)
 */
function getTokenX(token: OcrToken | Token): number {
  if ('bboxNorm' in token && token.bboxNorm) {
    return token.bboxNorm.nx0;
  }
  if ('bbox' in token && token.bbox) {
    return token.bbox.x0;
  }
  return 0.5;
}

/**
 * Reconstruct lines from tokens (if lines not provided)
 */
function reconstructLines(tokens: Array<OcrToken | Token>): OcrLine[] {
  if (tokens.length === 0) return [];
  
  // Sort tokens by Y-center
  const tokensWithY = tokens.map(token => ({
    token,
    yCenter: getTokenYCenter(token),
  }));
  
  tokensWithY.sort((a, b) => a.yCenter - b.yCenter);
  
  // Calculate median token height for adaptive threshold
  const heights = tokensWithY
    .map(t => getTokenHeight(t.token))
    .filter(h => h > 0);
  
  const medianHeight = heights.length > 0
    ? heights.sort((a, b) => a - b)[Math.floor(heights.length / 2)]
    : 0.02;
  
  const lineThreshold = medianHeight * 0.8; // Adaptive threshold
  
  // Group tokens into lines
  const lineGroups: Array<Array<OcrToken | Token>> = [];
  let currentLine: Array<OcrToken | Token> = [];
  let currentLineY = tokensWithY[0]?.yCenter ?? 0;
  
  for (const { token } of tokensWithY) {
    const tokenY = getTokenYCenter(token);
    
    if (Math.abs(tokenY - currentLineY) <= lineThreshold) {
      currentLine.push(token);
    } else {
      if (currentLine.length > 0) {
        lineGroups.push(currentLine);
      }
      currentLine = [token];
      currentLineY = tokenY;
    }
  }
  
  if (currentLine.length > 0) {
    lineGroups.push(currentLine);
  }
  
  // Convert to OcrLine format
  return lineGroups.map(lineTokens => {
    // Sort tokens within line by X
    lineTokens.sort((a, b) => getTokenX(a) - getTokenX(b));
    
    const text = lineTokens.map(t => normalizeTokenText(t.text)).join(' ');
    
    return {
      text,
      tokens: lineTokens as Token[],
      bboxNorm: { x0: 0, y0: 0, x1: 1, y1: 1 }, // Approximate
      confidence: lineTokens.reduce((sum, t) => {
        const conf = 'confidence' in t ? t.confidence : undefined;
        return sum + (conf ?? 0.5);
      }, 0) / lineTokens.length,
    };
  });
}

/**
 * Preserve hyphenated line breaks
 */
function joinHyphenatedLines(lines: OcrLine[]): OcrLine[] {
  if (lines.length <= 1) return lines;
  
  const joined: OcrLine[] = [];
  let i = 0;
  
  while (i < lines.length) {
    const currentLine = lines[i];
    const nextLine = lines[i + 1];
    
    // Check if current line ends with hyphen and next line starts with letter
    const currentText = currentLine.text.trim();
    const endsWithHyphen = currentText.endsWith('-');
    const nextText = nextLine?.text.trim() || '';
    const startsWithLetter = nextText.length > 0 && /[A-Za-zА-Яа-я]/.test(nextText[0]);
    
    if (endsWithHyphen && startsWithLetter && nextLine) {
      // Join without space, remove hyphen
      const joinedText = currentText.slice(0, -1) + nextText;
      joined.push({
        text: joinedText,
        tokens: [...currentLine.tokens, ...nextLine.tokens],
        bboxNorm: currentLine.bboxNorm,
        confidence: Math.min(currentLine.confidence ?? 0.5, nextLine.confidence ?? 0.5),
      });
      i += 2; // Skip both lines
    } else {
      joined.push(currentLine);
      i += 1;
    }
  }
  
  return joined;
}

/**
 * Reconstruct paragraphs from lines
 */
function reconstructParagraphs(lines: OcrLine[]): string[][] {
  if (lines.length === 0) return [];
  
  // Calculate median line height
  const lineHeights: number[] = lines
    .map(line => {
      if (line.tokens.length === 0) return 0.02;
      const tokenHeights = line.tokens
        .map(t => {
          if (t.bboxNorm) {
            return Math.abs(t.bboxNorm.ny1 - t.bboxNorm.ny0);
          }
          return 0.02;
        })
        .filter(h => h > 0);
      return tokenHeights.length > 0
        ? tokenHeights.reduce((a, b) => a + b, 0) / tokenHeights.length
        : 0.02;
    })
    .filter(h => h > 0);
  
  const medianLineHeight = lineHeights.length > 0
    ? lineHeights.sort((a, b) => a - b)[Math.floor(lineHeights.length / 2)]
    : 0.02;
  
  const paragraphGapThreshold = medianLineHeight * 1.2;
  
  const paragraphs: string[][] = [];
  let currentParagraph: string[] = [];
  let prevLineY = lines[0]?.tokens[0]?.bboxNorm?.ny1 ?? 0;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineText = line.text.trim();
    if (!lineText) continue;
    
    // Get line Y position (use first token's bottom)
    let lineY = prevLineY;
    if (line.tokens.length > 0) {
      const firstToken = line.tokens[0];
      if (firstToken.bboxNorm) {
        lineY = firstToken.bboxNorm.ny1;
      } else if ('bbox' in firstToken) {
        const ocrToken = firstToken as OcrToken;
        if (ocrToken.bbox) {
          lineY = ocrToken.bbox.y1;
        }
      }
    }
    
    // Calculate gap
    const gap = lineY - prevLineY;
    
    // Detect script change (latin <-> cyrillic)
    const lineScript = detectScript(lineText);
    const prevLineScript = currentParagraph.length > 0
      ? detectScript(currentParagraph[currentParagraph.length - 1])
      : 'unknown';
    
    const scriptChanged = lineScript !== 'unknown' && 
                          prevLineScript !== 'unknown' && 
                          lineScript !== prevLineScript;
    
    // Check if line looks like a header (short, capitalized)
    const looksLikeHeader = lineText.length < 40 && 
                           /^[A-ZА-ЯЁ]/.test(lineText) &&
                           (lineText === lineText.toUpperCase() || 
                            /^[A-ZА-ЯЁ][a-zа-яё]*$/.test(lineText.split(' ')[0]));
    
    // Start new paragraph if:
    // - Large vertical gap
    // - Script change with header-like line
    if ((gap > paragraphGapThreshold || (scriptChanged && looksLikeHeader)) && currentParagraph.length > 0) {
      paragraphs.push(currentParagraph);
      currentParagraph = [];
    }
    
    currentParagraph.push(lineText);
    
    // Update prevLineY to last token's bottom
    if (line.tokens.length > 0) {
      const lastToken = line.tokens[line.tokens.length - 1];
      if (lastToken.bboxNorm) {
        prevLineY = lastToken.bboxNorm.ny1;
      } else if ('bbox' in lastToken) {
        const ocrToken = lastToken as OcrToken;
        if (ocrToken.bbox) {
          prevLineY = ocrToken.bbox.y1;
        } else {
          prevLineY = lineY;
        }
      } else {
        prevLineY = lineY;
      }
    } else {
      prevLineY = lineY;
    }
  }
  
  if (currentParagraph.length > 0) {
    paragraphs.push(currentParagraph);
  }
  
  return paragraphs;
}

// ── Test-only exports (private helpers exposed for unit tests) ────────────
export const __test__ = {
  detectScript,
  isOcrGarbage,
  shouldDropToken,
  normalizeTokenText,
  getTokenYCenter,
  getTokenHeight,
  getTokenX,
  reconstructLines,
  joinHyphenatedLines,
  reconstructParagraphs,
};

/**
 * Main normalization function
 */
export function normalizeTranscription(
  input: {
    tokens?: Array<OcrToken | Token>;
    lines?: OcrLine[];
  },
  settings: NormalizationSettings = {}
): NormalizationResult {
  const confidenceThreshold = settings.confidenceThreshold ?? 0.35;
  const diagnostics = {
    droppedTokenCount: 0,
    lineCount: 0,
    paragraphCount: 0,
    scriptsPresent: [] as string[],
    warnings: [] as string[],
  };
  
  // Step 1: Token cleanup
  let cleanedTokens: Array<OcrToken | Token> = [];
  if (input.tokens) {
    for (const token of input.tokens) {
      if (shouldDropToken(token, confidenceThreshold)) {
        diagnostics.droppedTokenCount++;
        continue;
      }
      
      const normalized = normalizeTokenText(token.text);
      if (normalized) {
        cleanedTokens.push({
          ...token,
          text: normalized,
        });
      }
    }
  }
  
  // Step 2: Get or reconstruct lines
  let lines = input.lines || [];
  if (lines.length === 0 && cleanedTokens.length > 0) {
    lines = reconstructLines(cleanedTokens);
  } else if (lines.length > 0 && cleanedTokens.length > 0) {
    // If lines provided, still filter tokens in those lines
    lines = lines.map(line => {
      const filteredTokens = line.tokens.filter(token => {
        const normalized = normalizeTokenText(token.text);
        return normalized && !shouldDropToken(token, confidenceThreshold);
      });
      return {
        ...line,
        tokens: filteredTokens,
        text: filteredTokens.map(t => normalizeTokenText(t.text)).join(' '),
      };
    });
  }
  
  // Filter out empty lines
  lines = lines.filter(line => line.text.trim().length > 0);
  
  diagnostics.lineCount = lines.length;
  
  // Step 3: Join hyphenated line breaks
  lines = joinHyphenatedLines(lines);
  
  // Step 4: Reconstruct paragraphs
  const paragraphs = reconstructParagraphs(lines);
  diagnostics.paragraphCount = paragraphs.length;
  
  // Step 5: Detect scripts present
  const scriptsSet = new Set<string>();
  for (const line of lines) {
    const script = detectScript(line.text);
    if (script !== 'unknown') {
      scriptsSet.add(script);
    }
  }
  diagnostics.scriptsPresent = Array.from(scriptsSet);
  
  // Step 6: Format output
  // Join paragraphs with blank lines, within paragraphs join lines with spaces
  const paragraphTexts = paragraphs.map(paraLines => paraLines.join(' '));
  const fullText = paragraphTexts.join('\n\n');
  
  // Low confidence warning
  const avgConfidence = lines.length > 0
    ? lines.reduce((sum, line) => sum + (line.confidence ?? 0.5), 0) / lines.length
    : 0;
  if (avgConfidence < 0.5) {
    diagnostics.warnings.push('low_confidence_overall');
  }
  
  return {
    text: fullText,
    paragraphs: paragraphTexts,
    diagnostics,
  };
}

export interface OcrCorrectionEntry {
  incorrect_value: string;
  correct_value: string;
}

/**
 * Apply learned/global OCR corrections to raw text (word-boundary safe).
 */
export function applyCorrectionDictionary(text: string, corrections: OcrCorrectionEntry[]): string {
  if (!text || corrections.length === 0) return text;

  let result = text;
  const sorted = [...corrections]
    .filter((c) => c.incorrect_value && c.correct_value && c.incorrect_value !== c.correct_value)
    .sort((a, b) => b.incorrect_value.length - a.incorrect_value.length);

  for (const { incorrect_value, correct_value } of sorted) {
    const escaped = incorrect_value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    result = result.replace(new RegExp(`\\b${escaped}\\b`, 'g'), correct_value);
  }
  return result;
}

