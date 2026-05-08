/**
 * Production-Grade Certificate PDF Generator
 * 
 * Uses pdf-lib with embedded fonts and explicit coordinates for pixel-perfect output.
 * No HTML/Canvas dependency - pure PDF primitives for deterministic results.
 * 
 * Architecture:
 * - Background: PNG template embedded into PDF
 * - Text: Direct PDF text drawing at explicit coordinates
 * - Fonts: Embedded TTF/OTF fonts (no fallback)
 * - Coordinates: Single source of truth from coordinate-maps.js
 */

const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');
const fs = require('fs');
const path = require('path');
const { getCoordinateMap, mergeCustomPositions } = require('./coordinate-maps');

// Date format helpers — UTC-anchored so the rendered date matches the
// DB's stored value regardless of server timezone. Mirrors the
// front-end formatDateMD / formatDateYY in
// front-end/src/features/certificates/certificateTypes.ts.
function _parseUtcDate(raw) {
  if (raw == null || raw === '') return null;
  if (raw instanceof Date) return Number.isNaN(raw.getTime()) ? null : raw;
  if (typeof raw === 'string') {
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(raw);
    if (m) return new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
    const d = new Date(raw);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  return null;
}
// "12/3" — month/day, no zero padding (matches the OCA cert artwork).
function dateMD(raw) {
  const d = _parseUtcDate(raw);
  if (!d) return '';
  return `${d.getUTCMonth() + 1}/${d.getUTCDate()}`;
}
// "25" — last 2 digits of the year. Pairs with the OCA "20___"
// pre-printed prefix.
function dateYY(raw) {
  const d = _parseUtcDate(raw);
  if (!d) return '';
  return String(d.getUTCFullYear()).slice(-2);
}
// "12/3/2025" — full M/D/YYYY for cert templates that have a single
// date string field (no split tiles). Used for birthDate / baptismDate /
// marriageDate. Was previously `new Date(raw).toLocaleDateString()`,
// which resolves in the server-process timezone and rendered the
// day-before for midnight-UTC values on non-UTC hosts.
function dateMDY(raw) {
  const d = _parseUtcDate(raw);
  if (!d) return '';
  return `${d.getUTCMonth() + 1}/${d.getUTCDate()}/${d.getUTCFullYear()}`;
}

// Saved positions live in template-image pixel space (top-left origin,
// native image dimensions — what handleDrop captured via naturalWidth/
// naturalHeight in the front-end editor). The PDF page is 612x792 points,
// bottom-left origin, with the template drawn scaled-and-centered. This
// converts each saved position into the PDF's point space so drawText
// lands where the operator placed it on screen.
function convertCanvasPositionsToPdf(positions, imgWidth, imgHeight, pageWidth, pageHeight) {
  if (!positions || !imgWidth || !imgHeight) return positions || {};
  const scale = Math.min(pageWidth / imgWidth, pageHeight / imgHeight);
  const scaledWidth = imgWidth * scale;
  const scaledHeight = imgHeight * scale;
  const offsetX = (pageWidth - scaledWidth) / 2;
  const offsetY = (pageHeight - scaledHeight) / 2;
  const out = {};
  for (const [key, pos] of Object.entries(positions)) {
    if (!pos || typeof pos.x !== 'number' || typeof pos.y !== 'number') continue;
    out[key] = {
      x: offsetX + pos.x * scale,
      // Flip Y: image origin top-left, PDF origin bottom-left.
      y: offsetY + (imgHeight - pos.y) * scale,
    };
  }
  return out;
}

// Split "Father & Mother" / "Father, Mother" / "Father; Mother" into
// [father, mother]. Mirrors front-end splitParents in
// certificateTypes.ts so the PDF renders the same fields the operator
// dragged in the editor.
function splitParents(combined) {
  if (!combined) return ['', ''];
  const trimmed = String(combined).trim();
  if (!trimmed) return ['', ''];
  for (const sep of [' & ', '&', ';', ',']) {
    if (trimmed.includes(sep)) {
      const parts = trimmed.split(sep).map(s => s.trim()).filter(Boolean);
      return [parts[0] || '', parts[1] || ''];
    }
  }
  return [trimmed, ''];
}

/**
 * Text alignment helper
 */
function getAlignedX(text, x, align, font, fontSize, maxWidth) {
  const textWidth = font.widthOfTextAtSize(text, fontSize);
  
  switch (align) {
    case 'center':
      return x - (textWidth / 2);
    case 'right':
      return x - textWidth;
    case 'left':
    default:
      return x;
  }
}

/**
 * Text wrapping helper for long text
 */
function wrapText(text, font, fontSize, maxWidth) {
  const words = text.split(' ');
  const lines = [];
  let currentLine = '';
  
  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    const testWidth = font.widthOfTextAtSize(testLine, fontSize);
    
    if (testWidth <= maxWidth) {
      currentLine = testLine;
    } else {
      if (currentLine) lines.push(currentLine);
      currentLine = word;
    }
  }
  
  if (currentLine) lines.push(currentLine);
  return lines;
}

/**
 * Draw a single field on the PDF page
 */
async function drawField(page, fieldConfig, text, font, fontBold = null) {
  if (!text || text.trim() === '') return;
  
  const {
    x,
    y,
    fontSize = 14,
    fontWeight,
    align = 'left',
    maxWidth = 500,
    allowWrap = false,
    color = { r: 0, g: 0, b: 0 },
  } = fieldConfig;
  
  // Choose font based on weight
  const selectedFont = (fontWeight === 'bold' && fontBold) ? fontBold : font;
  const textColor = rgb(color.r, color.g, color.b);
  
  // Handle text wrapping if enabled
  if (allowWrap && maxWidth) {
    const lines = wrapText(String(text), selectedFont, fontSize, maxWidth);
    const lineHeight = fontSize * 1.2;
    
    lines.forEach((line, index) => {
      const lineY = y - (index * lineHeight);
      const lineX = getAlignedX(line, x, align, selectedFont, fontSize, maxWidth);
      
      page.drawText(line, {
        x: lineX,
        y: lineY,
        size: fontSize,
        font: selectedFont,
        color: textColor,
      });
    });
  } else {
    // Single line text
    let displayText = String(text);
    
    // Truncate if too long
    if (maxWidth) {
      let textWidth = selectedFont.widthOfTextAtSize(displayText, fontSize);
      while (textWidth > maxWidth && displayText.length > 0) {
        displayText = displayText.slice(0, -1);
        textWidth = selectedFont.widthOfTextAtSize(displayText + '...', fontSize);
      }
      if (displayText.length < text.length) {
        displayText += '...';
      }
    }
    
    const textX = getAlignedX(displayText, x, align, selectedFont, fontSize, maxWidth);
    
    page.drawText(displayText, {
      x: textX,
      y: y,
      size: fontSize,
      font: selectedFont,
      color: textColor,
    });
  }
}

/**
 * Generate Baptism Certificate PDF
 * 
 * @param {Object} record - Baptism record data
 * @param {Object} options - Generation options
 * @param {Object} options.customPositions - Custom field positions (overrides defaults)
 * @param {Array} options.hiddenFields - Fields to hide
 * @param {string} options.templatePath - Path to template PNG
 * @returns {Promise<Uint8Array>} - PDF bytes
 */
async function generateBaptismCertificatePDF(record, options = {}) {
  const {
    customPositions = null,
    hiddenFields = [],
    templatePath = path.join(__dirname, '../../certificates/2026/adult-baptism.png'),
  } = options;

  // Create PDF document
  const pdfDoc = await PDFDocument.create();

  const baseCoordinateMap = getCoordinateMap('baptism');
  const { width, height } = baseCoordinateMap.templateDimensions;

  // Load and embed template image
  let templateImage = null;
  if (fs.existsSync(templatePath)) {
    const templateBytes = fs.readFileSync(templatePath);
    try {
      templateImage = await pdfDoc.embedPng(templateBytes);
    } catch (err) {
      // Try JPEG if PNG fails
      try {
        templateImage = await pdfDoc.embedJpg(templateBytes);
      } catch (err2) {
        console.warn('Could not embed template image:', err2);
      }
    }
  }

  // Merge customPositions AFTER we know the template's natural pixel
  // dimensions — saved positions are in image-pixel space (top-left
  // origin) and need to be projected into the PDF's point space
  // (bottom-left origin, scaled-and-centered to fit the page).
  let coordinateMap = baseCoordinateMap;
  if (customPositions) {
    let pdfPositions = customPositions;
    if (templateImage) {
      const imgDims = templateImage.scale(1);
      pdfPositions = convertCanvasPositionsToPdf(
        customPositions, imgDims.width, imgDims.height, width, height
      );
    }
    coordinateMap = mergeCustomPositions(baseCoordinateMap, pdfPositions);
  }

  // Create page
  const page = pdfDoc.addPage([width, height]);

  // Draw template background
  if (templateImage) {
    const imgDims = templateImage.scale(1);
    const scale = Math.min(width / imgDims.width, height / imgDims.height);
    const scaledWidth = imgDims.width * scale;
    const scaledHeight = imgDims.height * scale;
    const x = (width - scaledWidth) / 2;
    const y = (height - scaledHeight) / 2;

    page.drawImage(templateImage, {
      x,
      y,
      width: scaledWidth,
      height: scaledHeight,
    });
  }

  // Embed fonts
  const font = await pdfDoc.embedFont(StandardFonts.TimesRoman);
  const fontBold = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);

  // Extract field data from record
  const baptismDateRaw = record.reception_date || record.baptism_date || null;
  const [fatherName, motherName] = splitParents(record.parents);
  const fieldData = {
    fullName: `${record.first_name || ''} ${record.last_name || ''}`.trim(),
    birthDate: dateMDY(record.birth_date),
    birthDateMD: dateMD(record.birth_date),
    birthDateYY: dateYY(record.birth_date),
    birthplace: record.birthplace || '',
    baptismDate: dateMDY(baptismDateRaw),
    baptismDateMD: dateMD(baptismDateRaw),
    baptismDateYY: dateYY(baptismDateRaw),
    sponsors: record.sponsors || record.godparents || '',
    clergyBy: record.clergy || '',
    clergyRector: record.clergy || '',
    church: record.churchName || 'Orthodox Church',
    fatherName,
    motherName,
    // Only emit the combined "parents" string when splitParents
    // actually produced two names. A single-name record.parents
    // (e.g. "Robert Smith") is treated as fatherName only — otherwise
    // we'd double-render the same text in two places.
    parents: motherName ? (record.parents || '') : '',
  };
  
  // Draw each field
  for (const [fieldName, fieldConfig] of Object.entries(coordinateMap.fields)) {
    if (hiddenFields.includes(fieldName)) continue;
    if (!fieldData[fieldName]) continue;
    
    await drawField(page, fieldConfig, fieldData[fieldName], font, fontBold);
  }
  
  // Save and return PDF bytes
  return await pdfDoc.save();
}

/**
 * Generate Marriage Certificate PDF
 * 
 * @param {Object} record - Marriage record data
 * @param {Object} options - Generation options
 * @returns {Promise<Uint8Array>} - PDF bytes
 */
async function generateMarriageCertificatePDF(record, options = {}) {
  const {
    customPositions = null,
    hiddenFields = [],
    templatePath = path.join(__dirname, '../../certificates/2026/marriage.png'),
  } = options;

  // Create PDF document
  const pdfDoc = await PDFDocument.create();

  const baseCoordinateMap = getCoordinateMap('marriage');
  const { width, height } = baseCoordinateMap.templateDimensions;

  // Load and embed template image
  let templateImage = null;
  if (fs.existsSync(templatePath)) {
    const templateBytes = fs.readFileSync(templatePath);
    try {
      templateImage = await pdfDoc.embedPng(templateBytes);
    } catch (err) {
      try {
        templateImage = await pdfDoc.embedJpg(templateBytes);
      } catch (err2) {
        console.warn('Could not embed template image:', err2);
      }
    }
  }

  // Project saved canvas-pixel positions into PDF point space.
  let coordinateMap = baseCoordinateMap;
  if (customPositions) {
    let pdfPositions = customPositions;
    if (templateImage) {
      const imgDims = templateImage.scale(1);
      pdfPositions = convertCanvasPositionsToPdf(
        customPositions, imgDims.width, imgDims.height, width, height
      );
    }
    coordinateMap = mergeCustomPositions(baseCoordinateMap, pdfPositions);
  }

  // Create page
  const page = pdfDoc.addPage([width, height]);
  
  // Draw template background
  if (templateImage) {
    const imgDims = templateImage.scale(1);
    const scale = Math.min(width / imgDims.width, height / imgDims.height);
    const scaledWidth = imgDims.width * scale;
    const scaledHeight = imgDims.height * scale;
    const x = (width - scaledWidth) / 2;
    const y = (height - scaledHeight) / 2;
    
    page.drawImage(templateImage, {
      x,
      y,
      width: scaledWidth,
      height: scaledHeight,
    });
  }
  
  // Embed fonts
  const font = await pdfDoc.embedFont(StandardFonts.TimesRoman);
  const fontBold = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);
  
  // Extract field data from record. groomParents/brideParents/marriagePlace
  // are intentionally omitted — they are not exposed in
  // MARRIAGE_FIELD_LABELS so the operator cannot place them, and their
  // old default coordinates collided with the groomName/brideName saved
  // positions (visible as overlapping text on every cert before this
  // change).
  const clergyName = record.clergy || '';
  const fieldData = {
    groomName: `${record.fname_groom || record.groom_first || ''} ${record.lname_groom || record.groom_last || ''}`.trim(),
    brideName: `${record.fname_bride || record.bride_first || ''} ${record.lname_bride || record.bride_last || ''}`.trim(),
    marriageDate: dateMDY(record.mdate || record.marriage_date),
    marriageDateMD: dateMD(record.mdate || record.marriage_date),
    marriageDateYY: dateYY(record.mdate || record.marriage_date),
    witnesses: record.witness || record.witnesses || '',
    clergy: clergyName,
    // Second clergy slot — the OCA template has both a "By" line
    // (officiating priest) and a "Rector" line at the bottom. Same
    // value as `clergy`; the operator drags the two markers to the
    // two locations.
    clergyRector: clergyName,
    church: record.churchName || 'Orthodox Church',
  };
  
  // Draw each field
  for (const [fieldName, fieldConfig] of Object.entries(coordinateMap.fields)) {
    if (hiddenFields.includes(fieldName)) continue;
    if (!fieldData[fieldName]) continue;
    
    await drawField(page, fieldConfig, fieldData[fieldName], font, fontBold);
  }
  
  // Save and return PDF bytes
  return await pdfDoc.save();
}

/**
 * Generate certificate PDF (auto-detect type)
 */
async function generateCertificatePDF(certificateType, record, options = {}) {
  switch (certificateType.toLowerCase()) {
    case 'baptism':
      return await generateBaptismCertificatePDF(record, options);
    case 'marriage':
      return await generateMarriageCertificatePDF(record, options);
    default:
      throw new Error(`Unsupported certificate type: ${certificateType}`);
  }
}

module.exports = {
  generateBaptismCertificatePDF,
  generateMarriageCertificatePDF,
  generateCertificatePDF,
};
