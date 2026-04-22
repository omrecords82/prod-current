/**
 * Entry Detection (Multi-Record Segmentation) - Production-Grade with NMS
 * Detects individual record entries within OCR pages using multiple strategies
 */

import type {
  BBox,
  FusionEntry,
  FusionLine,
} from '../types/fusion';
import {
  getBBoxCentroid,
  mergeBBoxes,
  calculateIoU,
  calculateContainment,
  calculateAspectRatio,
} from './bboxUtils';
import { parseVisionResponse, getVisionPageSize } from './visionParsing';
import type { VisionResponse } from '../types/fusion';

// ============================================================================
// Entry Detection (Multi-Record Segmentation) - Production-Grade with NMS
// ============================================================================

/**
 * Anchor labels that indicate a valid sacramental record
 */
const ANCHOR_LABELS = [
  'NAME OF CHILD', 'NAME OF PARENTS', 'DATE OF BIRTH', 'DATE OF BAPTISM',
  'PLACE OF BIRTH', 'GOD PARENTS', 'GODPARENTS', 'SPONSORS', 'SACRAMENTS',
  'PERFORMED BY', 'RECTOR', 'PRIEST', 'FATHER', 'MOTHER', 'ADDRESS',
  'PARISH RECORD', 'BAPTISM', 'MARRIAGE', 'FUNERAL', 'CONFIRMATION',
];

/**
 * Score a candidate entry based on multiple factors
 */
interface CandidateScore {
  area: number;
  textDensity: number;
  anchorLabelCount: number;
  aspectRatioPenalty: number;
  totalScore: number;
}

function scoreCandidate(
  bbox: BBox,
  lines: FusionLine[],
  pageArea: number
): CandidateScore {
  const area = bbox.w * bbox.h;
  const normalizedArea = pageArea > 0 ? area / pageArea : 0;
  
  // Text density: characters per area (normalized)
  const totalChars = lines.reduce((sum, l) => sum + l.text.length, 0);
  const textDensity = area > 0 ? (totalChars / area) * 10000 : 0; // Scale for readability
  
  // Count anchor labels found in this entry
  const allText = lines.map(l => l.text.toUpperCase()).join(' ');
  let anchorLabelCount = 0;
  for (const label of ANCHOR_LABELS) {
    if (allText.includes(label)) {
      anchorLabelCount++;
    }
  }
  
  // Aspect ratio penalty: penalize extreme ratios (too wide or too tall)
  const aspectRatio = calculateAspectRatio(bbox);
  let aspectRatioPenalty = 0;
  if (aspectRatio < 0.3 || aspectRatio > 3.0) {
    aspectRatioPenalty = 0.5; // Heavy penalty for extreme aspect ratios
  } else if (aspectRatio < 0.5 || aspectRatio > 2.0) {
    aspectRatioPenalty = 0.2; // Moderate penalty
  }
  
  // Total score: weighted combination
  // Prefer: larger area, higher text density, more anchor labels
  const totalScore = (
    normalizedArea * 40 +           // Area contributes 40%
    Math.min(textDensity, 10) * 3 + // Text density contributes up to 30%
    anchorLabelCount * 5 -          // Each anchor label adds 5 points
    aspectRatioPenalty * 20         // Penalty subtracts up to 10 points
  );
  
  return {
    area,
    textDensity,
    anchorLabelCount,
    aspectRatioPenalty,
    totalScore,
  };
}

/**
 * Debug log for entry detection (can be toggled)
 */
const DEBUG_ENTRY_DETECTION = true;

function debugLog(message: string, data?: any) {
  if (DEBUG_ENTRY_DETECTION) {
    console.log(`[EntryDetection] ${message}`, data || '');
  }
}

/**
 * Non-Maximum Suppression to collapse duplicate/overlapping entries
 * Rules:
 * - IoU >= 0.5 OR containment >= 80% => same entry
 * - Keep highest scoring box, discard/merge others
 */
function applyNMS(
  candidates: Array<{ entry: FusionEntry; score: CandidateScore }>,
  iouThreshold: number = 0.5,
  containmentThreshold: number = 0.8
): FusionEntry[] {
  if (candidates.length === 0) return [];
  if (candidates.length === 1) return [candidates[0].entry];
  
  // Sort by score descending
  const sorted = [...candidates].sort((a, b) => b.score.totalScore - a.score.totalScore);
  
  const kept: FusionEntry[] = [];
  const suppressed = new Set<number>();
  
  debugLog('NMS Input candidates:', sorted.map((c, i) => ({
    index: i,
    score: c.score.totalScore.toFixed(2),
    area: c.score.area,
    anchorLabels: c.score.anchorLabelCount,
    bbox: c.entry.bbox,
  })));
  
  for (let i = 0; i < sorted.length; i++) {
    if (suppressed.has(i)) continue;
    
    const current = sorted[i];
    kept.push(current.entry);
    
    // Check all remaining candidates for overlap
    for (let j = i + 1; j < sorted.length; j++) {
      if (suppressed.has(j)) continue;
      
      const other = sorted[j];
      const iou = calculateIoU(current.entry.bbox, other.entry.bbox);
      const containment = calculateContainment(current.entry.bbox, other.entry.bbox);
      const reverseContainment = calculateContainment(other.entry.bbox, current.entry.bbox);
      
      debugLog(`Comparing ${i} vs ${j}:`, {
        iou: iou.toFixed(3),
        containment: containment.toFixed(3),
        reverseContainment: reverseContainment.toFixed(3),
      });
      
      // Suppress if significant overlap or containment
      if (iou >= iouThreshold || containment >= containmentThreshold || reverseContainment >= containmentThreshold) {
        debugLog(`Suppressing candidate ${j} (overlaps with ${i})`);
        suppressed.add(j);
        
        // Merge lines from suppressed entry into current
        const existingLineTexts = new Set(current.entry.lines.map(l => l.text));
        for (const line of other.entry.lines) {
          if (!existingLineTexts.has(line.text)) {
            current.entry.lines.push(line);
          }
        }
        // Update bbox to encompass merged content
        current.entry.bbox = mergeBBoxes([current.entry.bbox, other.entry.bbox]);
      }
    }
  }
  
  debugLog(`NMS Result: ${candidates.length} candidates -> ${kept.length} entries`);
  return kept;
}

/**
 * Check if a single dominant entry should collapse all others
 * Returns true if one entry is clearly dominant and overlaps all others
 */
function checkSingleRecordDominance(
  candidates: Array<{ entry: FusionEntry; score: CandidateScore }>,
  pageArea: number
): boolean {
  if (candidates.length <= 1) return false;
  
  // Only check for single record dominance if we have 3+ candidates
  // This prevents false positives when we have 2-4 valid entries
  if (candidates.length < 3) {
    debugLog('Skipping single record dominance check (too few candidates)');
    return false;
  }
  
  // Sort by area descending
  const sorted = [...candidates].sort((a, b) => b.score.area - a.score.area);
  const largest = sorted[0];
  
  // Check if largest covers significant portion of page (>60% - increased threshold)
  const largestCoverage = largest.score.area / pageArea;
  if (largestCoverage < 0.6) {
    debugLog(`Not single dominant: coverage ${(largestCoverage * 100).toFixed(1)}% < 60%`);
    return false;
  }
  
  // Check if largest has significantly more anchor labels (at least 2x more)
  const largestAnchors = largest.score.anchorLabelCount;
  const otherMaxAnchors = Math.max(...sorted.slice(1).map(c => c.score.anchorLabelCount));
  if (largestAnchors < otherMaxAnchors * 2) {
    debugLog(`Not single dominant: anchor labels ${largestAnchors} < ${otherMaxAnchors * 2}`);
    return false;
  }
  
  // Check if all other candidates overlap with the largest (at least 80% overlap)
  for (let i = 1; i < sorted.length; i++) {
    const containment = calculateContainment(largest.entry.bbox, sorted[i].entry.bbox);
    if (containment < 0.8) {
      // Found a candidate that doesn't significantly overlap - not single dominant
      debugLog(`Not single dominant: candidate ${i} has only ${(containment * 100).toFixed(1)}% overlap`);
      return false;
    }
  }
  
  debugLog('Single record dominance detected', {
    coverage: (largestCoverage * 100).toFixed(1) + '%',
    anchorLabels: largestAnchors,
  });
  
  return true;
}

/**
 * Detect entries using quadrant clustering for 4-card layouts
 * Now with post-processing to validate results
 */
export function detectEntriesQuadrant(
  lines: FusionLine[],
  pageWidth: number,
  pageHeight: number
): FusionEntry[] {
  if (lines.length === 0 || pageWidth === 0 || pageHeight === 0) {
    return [];
  }
  
  const midX = pageWidth / 2;
  const midY = pageHeight / 2;
  
  // Group lines into quadrants
  const quadrants: { [key: string]: FusionLine[] } = {
    TL: [], TR: [], BL: [], BR: [],
  };
  
  for (const line of lines) {
    const centroid = getBBoxCentroid(line.bbox);
    const isLeft = centroid.x < midX;
    const isTop = centroid.y < midY;
    
    if (isTop && isLeft) quadrants.TL.push(line);
    else if (isTop && !isLeft) quadrants.TR.push(line);
    else if (!isTop && isLeft) quadrants.BL.push(line);
    else quadrants.BR.push(line);
  }
  
  // Create entries from non-empty quadrants
  const entries: FusionEntry[] = [];
  const quadrantOrder = ['TL', 'TR', 'BL', 'BR'];
  
  for (const quadrant of quadrantOrder) {
    const quadrantLines = quadrants[quadrant];
    if (quadrantLines.length === 0) continue;
    
    const lineBboxes = quadrantLines.map(l => l.bbox);
    const entryBbox = mergeBBoxes(lineBboxes);
    const recordNumber = extractRecordNumber(quadrantLines);
    
    entries.push({
      id: `entry-${entries.length}`,
      index: entries.length,
      recordNumber,
      bbox: entryBbox,
      blocks: [],
      lines: quadrantLines,
    });
  }
  
  return entries;
}

/**
 * Detect entries using gap-based clustering (for non-quadrant layouts)
 */
export function detectEntriesGap(
  lines: FusionLine[],
  yGapThreshold: number = 30  // Reduced threshold for better detection of closely-spaced entries
): FusionEntry[] {
  if (lines.length === 0) return [];
  
  // Sort lines by Y position
  const sortedLines = [...lines].sort((a, b) => a.bbox.y - b.bbox.y);
  
  const entries: FusionEntry[] = [];
  let currentLines: FusionLine[] = [sortedLines[0]];
  
  for (let i = 1; i < sortedLines.length; i++) {
    const prevLine = sortedLines[i - 1];
    const currLine = sortedLines[i];
    const gap = currLine.bbox.y - (prevLine.bbox.y + prevLine.bbox.h);
    
    if (gap > yGapThreshold) {
      // Start new entry
      const lineBboxes = currentLines.map(l => l.bbox);
      const entryBbox = mergeBBoxes(lineBboxes);
      const recordNumber = extractRecordNumber(currentLines);
      
      entries.push({
        id: `entry-${entries.length}`,
        index: entries.length,
        recordNumber,
        bbox: entryBbox,
        blocks: [],
        lines: currentLines,
      });
      
      currentLines = [currLine];
    } else {
      currentLines.push(currLine);
    }
  }
  
  // Don't forget the last group
  if (currentLines.length > 0) {
    const lineBboxes = currentLines.map(l => l.bbox);
    const entryBbox = mergeBBoxes(lineBboxes);
    const recordNumber = extractRecordNumber(currentLines);
    
    entries.push({
      id: `entry-${entries.length}`,
      index: entries.length,
      recordNumber,
      bbox: entryBbox,
      blocks: [],
      lines: currentLines,
    });
  }
  
  return entries;
}

/**
 * Extract record number from lines (looks for N° or No patterns)
 */
export function extractRecordNumber(lines: FusionLine[]): string | undefined {
  const patterns = [
    /N[°o]\s*(\d+)/i,
    /No\.?\s*(\d+)/i,
    /Record\s*#?\s*(\d+)/i,
    /PARISH\s+RECORD\s+N[°o]?\s*(\d+)/i,
  ];
  
  for (const line of lines) {
    for (const pattern of patterns) {
      const match = line.text.match(pattern);
      if (match && match[1]) {
        return match[1];
      }
    }
  }
  
  return undefined;
}

/**
 * Hard filters to discard invalid candidate entries
 */
function applyHardFilters(
  entries: FusionEntry[],
  pageWidth: number,
  pageHeight: number
): FusionEntry[] {
  const pageArea = pageWidth * pageHeight;
  const minAreaThreshold = pageArea * 0.05; // At least 5% of page
  
  return entries.filter(entry => {
    const area = entry.bbox.w * entry.bbox.h;
    const aspectRatio = calculateAspectRatio(entry.bbox);
    
    // Filter 1: Minimum area
    if (area < minAreaThreshold) {
      debugLog(`Filtered out entry (too small): area=${area}, threshold=${minAreaThreshold}`);
      return false;
    }
    
    // Filter 2: Extreme aspect ratios (not resembling a record card)
    if (aspectRatio < 0.2 || aspectRatio > 5.0) {
      debugLog(`Filtered out entry (extreme aspect ratio): ${aspectRatio.toFixed(2)}`);
      return false;
    }
    
    // Filter 3: Must have some text content
    if (entry.lines.length === 0) {
      debugLog('Filtered out entry (no lines)');
      return false;
    }
    
    return true;
  });
}

/**
 * Main entry detection function - Production-grade with NMS
 * Tries multiple detection strategies and applies robust post-processing
 */
export function detectEntries(
  vision: VisionResponse | null,
  ocrText?: string
): FusionEntry[] {
  debugLog('=== Starting Entry Detection ===');
  
  // Try Vision-based detection first
  if (vision?.fullTextAnnotation) {
    const lines = parseVisionResponse(vision);
    const { width, height } = getVisionPageSize(vision);
    const pageArea = width * height;
    
    debugLog(`Page dimensions: ${width}x${height}, Lines: ${lines.length}`);
    
    if (lines.length > 0 && width > 0 && height > 0) {
      // Collect candidate entries from multiple strategies
      let candidates: Array<{ entry: FusionEntry; score: CandidateScore }> = [];
      
      // Strategy 1: Quadrant detection
      const quadrantEntries = detectEntriesQuadrant(lines, width, height);
      debugLog(`Quadrant detection found ${quadrantEntries.length} entries`);
      
      // Strategy 2: Gap-based detection
      const gapEntries = detectEntriesGap(lines);
      debugLog(`Gap detection found ${gapEntries.length} entries`);
      
      // Strategy 3: Single entry (all lines together)
      const singleEntry: FusionEntry = {
        id: 'entry-single',
        index: 0,
        recordNumber: extractRecordNumber(lines),
        bbox: mergeBBoxes(lines.map(l => l.bbox)),
        blocks: [],
        lines,
      };
      
      // Score all candidates
      const allCandidates = [
        ...quadrantEntries,
        ...gapEntries,
        singleEntry,
      ];
      
      // Apply hard filters first
      const filteredCandidates = applyHardFilters(allCandidates, width, height);
      debugLog(`After hard filters: ${filteredCandidates.length} candidates`);
      
      // Score remaining candidates
      candidates = filteredCandidates.map(entry => ({
        entry,
        score: scoreCandidate(entry.bbox, entry.lines, pageArea),
      }));
      
      // Log candidate scores for debugging
      for (const c of candidates) {
        debugLog(`Candidate score:`, {
          area: c.score.area,
          textDensity: c.score.textDensity.toFixed(2),
          anchorLabels: c.score.anchorLabelCount,
          aspectPenalty: c.score.aspectRatioPenalty,
          totalScore: c.score.totalScore.toFixed(2),
          bbox: c.entry.bbox,
        });
      }
      
      // Check for single record dominance
      if (checkSingleRecordDominance(candidates, pageArea)) {
        // Return only the largest/highest-scoring entry
        const sorted = [...candidates].sort((a, b) => b.score.totalScore - a.score.totalScore);
        const dominant = sorted[0].entry;
        dominant.id = 'entry-0';
        dominant.index = 0;
        debugLog('Returning single dominant entry');
        return [dominant];
      }
      
      // Apply NMS to collapse overlapping entries
      const nmsResult = applyNMS(candidates);
      
      // Re-index entries
      const finalEntries = nmsResult.map((entry, idx) => ({
        ...entry,
        id: `entry-${idx}`,
        index: idx,
      }));
      
      debugLog(`Final result: ${finalEntries.length} entries`);
      return finalEntries;
    }
  }
  
  // Fallback: regex-based detection from OCR text
  if (ocrText) {
    debugLog('Falling back to text-based detection');
    return detectEntriesFromText(ocrText);
  }
  
  debugLog('No entries detected');
  return [];
}

/**
 * Fallback: detect entries from plain OCR text using regex
 */
export function detectEntriesFromText(ocrText: string): FusionEntry[] {
  // Strategy 1: Split by "PARISH RECORD" or "PART 1" headers
  const entryPattern = /(?:PARISH\s+RECORD|PART\s+1[-–]?BAPTISMS?)/gi;
  const parts = ocrText.split(entryPattern);
  
  if (parts.length > 1) {
    const entries: FusionEntry[] = [];
    for (let i = 1; i < parts.length; i++) {
      const text = parts[i].trim();
      if (!text) continue;
      
      // Try to extract record number
      const recordMatch = text.match(/N[°o]\s*(\d+)/i);
      
      entries.push({
        id: `entry-${entries.length}`,
        index: entries.length,
        recordNumber: recordMatch?.[1],
        bbox: { x: 0, y: 0, w: 0, h: 0 }, // No bbox info in text-only mode
        blocks: [],
        lines: [{ text, bbox: { x: 0, y: 0, w: 0, h: 0 }, tokens: [] }],
      });
    }
    
    if (entries.length > 0) return entries;
  }
  
  // Strategy 2: Split by blank lines (double newlines or large gaps)
  // This handles documents where entries are separated by blank lines
  const blankLinePattern = /\n\s*\n\s*\n/; // Three or more newlines
  const blankLineParts = ocrText.split(blankLinePattern);
  
  if (blankLineParts.length > 1) {
    const entries: FusionEntry[] = [];
    for (let i = 0; i < blankLineParts.length; i++) {
      const text = blankLineParts[i].trim();
      if (!text || text.length < 10) continue; // Skip very short fragments
      
      // Try to extract record number
      const recordMatch = text.match(/N[°o]\s*(\d+)/i);
      
      entries.push({
        id: `entry-${entries.length}`,
        index: entries.length,
        recordNumber: recordMatch?.[1],
        bbox: { x: 0, y: 0, w: 0, h: 0 },
        blocks: [],
        lines: [{ text, bbox: { x: 0, y: 0, w: 0, h: 0 }, tokens: [] }],
      });
    }
    
    if (entries.length > 1) {
      debugLog(`Text-based detection found ${entries.length} entries via blank lines`);
      return entries;
    }
  }
  
  // Strategy 3: Split by patterns that look like name lines (lines starting with capital letters)
  // This is a fallback for documents without clear separators
  const lines = ocrText.split('\n').filter(l => l.trim().length > 0);
  const namePattern = /^[A-ZА-ЯЁ][a-zа-яё]+\s+[A-ZА-ЯЁ][a-zа-яё]+/; // Pattern: CapitalWord CapitalWord
  
  if (lines.length > 5) {
    const entries: FusionEntry[] = [];
    let currentEntryLines: string[] = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Check if this line looks like the start of a new entry (name pattern)
      if (namePattern.test(line) && currentEntryLines.length > 3) {
        // Save previous entry
        const entryText = currentEntryLines.join('\n');
        entries.push({
          id: `entry-${entries.length}`,
          index: entries.length,
          recordNumber: undefined,
          bbox: { x: 0, y: 0, w: 0, h: 0 },
          blocks: [],
          lines: [{ text: entryText, bbox: { x: 0, y: 0, w: 0, h: 0 }, tokens: [] }],
        });
        currentEntryLines = [line];
      } else {
        currentEntryLines.push(line);
      }
    }
    
    // Don't forget the last entry
    if (currentEntryLines.length > 0) {
      const entryText = currentEntryLines.join('\n');
      entries.push({
        id: `entry-${entries.length}`,
        index: entries.length,
        recordNumber: undefined,
        bbox: { x: 0, y: 0, w: 0, h: 0 },
        blocks: [],
        lines: [{ text: entryText, bbox: { x: 0, y: 0, w: 0, h: 0 }, tokens: [] }],
      });
    }
    
    if (entries.length > 1) {
      debugLog(`Text-based detection found ${entries.length} entries via name patterns`);
      return entries;
    }
  }
  
  // Fallback: return single entry
  debugLog('Text-based detection: falling back to single entry');
  return [{
    id: 'entry-0',
    index: 0,
    bbox: { x: 0, y: 0, w: 0, h: 0 },
    blocks: [],
    lines: [{ text: ocrText, bbox: { x: 0, y: 0, w: 0, h: 0 }, tokens: [] }],
  }];
}
