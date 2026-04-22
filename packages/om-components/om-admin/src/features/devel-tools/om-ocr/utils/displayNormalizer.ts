/**
 * Display Normalization Utilities (Client-Side)
 * Presentation-level formatting only (whitespace, line wrapping, UI cleanup)
 * 
 * NOTE: This is for UI display only. Semantic normalization (token cleanup, 
 * paragraph reconstruction, script detection) happens server-side.
 * This module does NOT change semantic content - no field inference, no token merging logic.
 */

/**
 * Normalize OCR text for clean display (presentation only)
 */
export function normalizeOcrText(ocrText: string | null | undefined): string {
  if (!ocrText) return '';

  return ocrText
    // Normalize line breaks
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    // Remove excessive blank lines (more than 2 consecutive)
    .replace(/\n{3,}/g, '\n\n')
    // Trim each line
    .split('\n')
    .map(line => line.trim())
    .join('\n')
    // Remove leading/trailing whitespace
    .trim();
}

/**
 * Extract structured text from Vision API response using blocks/paragraphs
 * This preserves document structure better than raw text extraction
 */
export function extractStructuredTextFromVision(visionResponse: any): string {
  if (!visionResponse?.fullTextAnnotation?.pages) {
    return '';
  }

  const lines: string[] = [];
  const pages = visionResponse.fullTextAnnotation.pages || [];
  
  pages.forEach((page: any, pageIndex: number) => {
    const blocks = page.blocks || [];
    
    blocks.forEach((block: any, blockIndex: number) => {
      const paragraphs = block.paragraphs || [];
      
      paragraphs.forEach((paragraph: any, paraIndex: number) => {
        const words = paragraph.words || [];
        
        // Extract text from words, preserving spacing
        const paragraphText = words
          .map((word: any) => {
            const symbols = word.symbols || [];
            return symbols.map((sym: any) => {
              // Check for break detection hints
              const text = sym.text || '';
              const hasBreak = sym.property?.detectedBreak;
              return text + (hasBreak?.type === 'LINE_BREAK' || hasBreak?.type === 'EOL_SURE_SPACE' ? '\n' : '');
            }).join('');
          })
          .filter((text: string) => text.trim().length > 0)
          .join(' ')
          .trim();
        
        if (paragraphText) {
          // Split on explicit line breaks if detected
          const splitLines = paragraphText.split('\n').map(l => l.trim()).filter(l => l.length > 0);
          lines.push(...splitLines);
        }
      });
      
      // Add blank line between blocks (logical sections) if not already present
      if (blockIndex < blocks.length - 1 && lines.length > 0 && lines[lines.length - 1]) {
        lines.push('');
      }
    });
    
    // Add blank line between pages
    if (pageIndex < pages.length - 1 && lines.length > 0 && lines[lines.length - 1]) {
      lines.push('');
    }
  });

  return lines.join('\n');
}

/**
 * Extract text from Vision API response
 * Uses structured extraction if available, falls back to raw text
 */
export function extractTextFromVisionResponse(visionResponse: any): string {
  if (!visionResponse) return '';
  
  // Try structured extraction first (preserves document structure)
  if (visionResponse.fullTextAnnotation?.pages) {
    const structured = extractStructuredTextFromVision(visionResponse);
    if (structured.trim().length > 0) {
      return normalizeOcrText(structured);
    }
  }
  
  // Fallback to fullTextAnnotation.text
  if (visionResponse.fullTextAnnotation?.text) {
    return normalizeOcrText(visionResponse.fullTextAnnotation.text);
  }
  
  // Fallback to textAnnotations
  if (visionResponse.textAnnotations && visionResponse.textAnnotations.length > 0) {
    // First annotation is usually the full text
    const rawText = visionResponse.textAnnotations[0].description || '';
    return normalizeOcrText(rawText);
  }
  
  return '';
}

/**
 * Check if a line looks like a name (starts with capital, has common name patterns)
 */
function looksLikeName(line: string): boolean {
  if (line.length < 3 || line.length > 50) return false;
  // Names often start with capital letter and contain letters/spaces/hyphens
  return /^[A-ZА-ЯЁ][a-zа-яё\s\-']+$/.test(line.trim());
}

/**
 * Check if a line looks like a date
 */
function looksLikeDate(line: string): boolean {
  // Patterns: "род 27 Января 1939", "Nov. 25, 1920", "AUG. 18, 1946", etc.
  const datePatterns = [
    /\d{1,2}\s+(Января|Февраля|Марта|Апреля|Мая|Июня|Июля|Августа|Сентября|Октября|Ноября|Декабря|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)/i,
    /(род|крещ|родился|baptized|born|date).*\d{4}/i,
    /\d{1,2}[,\s]+\d{4}/,
    /[A-Z]{3}\.\s+\d{1,2},\s+\d{4}/, // "AUG. 18, 1946"
  ];
  return datePatterns.some(pattern => pattern.test(line));
}

/**
 * Check if a line looks like a record header (baptism, marriage, etc.)
 */
function looksLikeRecordHeader(line: string): boolean {
  const headers = [
    'notification of marriage',
    'baptism',
    'marriage',
    'funeral',
    'крещение',
    'брак',
    'погребение',
  ];
  const lower = line.toLowerCase();
  return headers.some(h => lower.includes(h)) || /^[A-ZА-ЯЁ\s]+$/.test(line) && line.length < 40;
}

/**
 * Enhanced text display formatting (presentation only)
 * Groups related lines and improves spacing based on content patterns
 * This is UI-only formatting and does not change semantic content
 */
export function enhanceOcrTextStructure(text: string): string {
  if (!text) return '';
  
  const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
  if (lines.length === 0) return '';
  
  const enhanced: string[] = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const prevLine = i > 0 ? lines[i - 1] : null;
    const nextLine = i < lines.length - 1 ? lines[i + 1] : null;
    
    const isName = looksLikeName(line);
    const isDate = looksLikeDate(line);
    const isHeader = looksLikeRecordHeader(line);
    const isShort = line.length < 25;
    const isLong = line.length > 70;
    
    // Add blank line before record headers
    if (isHeader && prevLine && prevLine.length > 10 && enhanced.length > 0) {
      if (enhanced[enhanced.length - 1]) {
        enhanced.push('');
      }
    }
    
    // Add blank line before names if previous line was a date or long line
    if (isName && prevLine && (looksLikeDate(prevLine) || prevLine.length > 60)) {
      if (enhanced.length > 0 && enhanced[enhanced.length - 1]) {
        enhanced.push('');
      }
    }
    
    // Add blank line after dates if next line is a name
    if (isDate && nextLine && looksLikeName(nextLine)) {
      enhanced.push(line);
      if (nextLine) {
        enhanced.push('');
      }
      continue;
    }
    
    // Add blank line after short lines that look like labels/headers
    if (isShort && !isName && !isDate && nextLine && nextLine.length > 40) {
      enhanced.push(line);
      enhanced.push('');
      continue;
    }
    
    enhanced.push(line);
  }
  
  // Clean up: normalize multiple empty lines, remove leading/trailing empty lines
  let result = enhanced.join('\n');
  
  // Normalize: max 2 consecutive newlines
  result = result.replace(/\n{3,}/g, '\n\n');
  
  // Remove leading/trailing empty lines
  result = result.replace(/^\n+/, '').replace(/\n+$/, '');
  
  // Final pass: ensure proper spacing around record sections
  // Add blank line before lines that start with capital letters and are short (likely headers)
  const finalLines = result.split('\n');
  const finalEnhanced: string[] = [];
  
  for (let i = 0; i < finalLines.length; i++) {
    const line = finalLines[i];
    const prevLine = i > 0 ? finalLines[i - 1] : '';
    const isEmpty = line.trim().length === 0;
    
    if (isEmpty) {
      // Only add one empty line
      if (finalEnhanced.length > 0 && finalEnhanced[finalEnhanced.length - 1]) {
        finalEnhanced.push('');
      }
      continue;
    }
    
    // Add blank line before uppercase headers (all caps or title case)
    if (
      /^[A-ZА-ЯЁ]/.test(line) &&
      line.length < 50 &&
      prevLine &&
      prevLine.trim().length > 0 &&
      !prevLine.match(/^[A-ZА-ЯЁ]/) &&
      finalEnhanced.length > 0 &&
      finalEnhanced[finalEnhanced.length - 1]
    ) {
      finalEnhanced.push('');
    }
    
    finalEnhanced.push(line);
  }
  
  return finalEnhanced.join('\n').trim();
}

