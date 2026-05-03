/**
 * Church-specific Certificate Generation API
 * Uses canvas for preview (PNG) and NEW deterministic pdf-lib generator for PDF
 * 
 * Architecture:
 * - Preview: Canvas-based PNG (browser display only)
 * - PDF Download: Deterministic PDF generator with embedded fonts and explicit coordinates
 */

const express = require('express');
const router = express.Router({ mergeParams: true });
const { createCanvas, loadImage } = require('canvas');
const fs = require('fs');
const path = require('path');
const { getChurchPool, mainPool } = require('../db/pool');

// NEW: Import deterministic PDF generator
const { generateCertificatePDF } = require('../certificates/pdf-generator');

/**
 * Get church name from the churches table in orthodoxmetrics_db
 * Falls back to users.company field if church not found
 */
const getChurchName = async (churchId) => {
  try {
    const appPool = mainPool;
    
    // First try to get from churches table
    const [churchRows] = await appPool.query(
      'SELECT church_name, name FROM churches WHERE id = ?',
      [churchId]
    );
    
    if (churchRows.length > 0) {
      return churchRows[0].church_name || churchRows[0].name || 'Orthodox Church';
    }
    
    // Fallback: try to get from users.company field for the church admin
    const [userRows] = await appPool.query(
      'SELECT company FROM users WHERE church_id = ? AND company IS NOT NULL LIMIT 1',
      [churchId]
    );
    
    if (userRows.length > 0 && userRows[0].company) {
      return userRows[0].company;
    }
    
    return 'Orthodox Church';
  } catch (err) {
    console.error('Error fetching church name:', err);
    return 'Orthodox Church';
  }
};

// Template paths
// Certificate template paths - using 2026 templates
const BAPTISM_TEMPLATE_PATH = path.join(__dirname, '../../certificates/2026/adult-baptism.png');
const BAPTISM_CHILD_TEMPLATE_PATH = path.join(__dirname, '../../certificates/2026/adult-baptism.png');
const MARRIAGE_TEMPLATE_PATH = path.join(__dirname, '../../certificates/2026/marriage.png');

// Default field positions for baptism certificate.
// The MD / YY split tiles match the OCA artwork's "ON ___, 20___"
// layout — the long blank takes month/day, and YY fills the trailing
// two underscores after the pre-printed "20". Operators can drag to
// fine-tune; these are starter positions only.
const BAPTISM_POSITIONS = {
  fullName: { x: 383, y: 574 },
  birthplace: { x: 400, y: 600 },
  birthDate: { x: 444, y: 626 },
  birthDateMD: { x: 350, y: 626 },
  birthDateYY: { x: 560, y: 626 },
  clergyBy: { x: 410, y: 698 },       // BY field (clergy who performed baptism)
  church: { x: 514, y: 724 },
  baptismDate: { x: 424, y: 754 },
  baptismDateMD: { x: 350, y: 754 },
  baptismDateYY: { x: 560, y: 754 },
  sponsors: { x: 400, y: 784 },
  clergyRector: { x: 500, y: 850 }    // Rector field (signing clergy)
};

// Default field positions for marriage certificate
const MARRIAGE_POSITIONS = {
  groomName: { x: 383, y: 574 },
  groomParents: { x: 400, y: 600 },
  brideName: { x: 383, y: 626 },
  brideParents: { x: 400, y: 652 },
  marriageDate: { x: 444, y: 678 },
  marriageDateMD: { x: 350, y: 678 },
  marriageDateYY: { x: 560, y: 678 },
  marriagePlace: { x: 410, y: 704 },
  clergy: { x: 410, y: 730 },
  church: { x: 514, y: 756 },
  witnesses: { x: 400, y: 782 }
};

// Date format helpers. Match the front-end formatDateMD / formatDateYY
// behavior in certificateTypes.ts so the drag-tile preview value and
// the rendered cert always agree.
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
function dateMD(raw) {
  const d = _parseUtcDate(raw);
  if (!d) return '';
  return `${d.getUTCMonth() + 1}/${d.getUTCDate()}`;
}
function dateYY(raw) {
  const d = _parseUtcDate(raw);
  if (!d) return '';
  return String(d.getUTCFullYear()).slice(-2);
}

/**
 * Generate baptism certificate preview using canvas (PNG)
 */
const generateBaptismPreview = async (record, fieldOffsets = {}, hiddenFields = []) => {
  // Check if template exists, if not create a simple certificate
  let canvas, ctx;
  
  if (fs.existsSync(BAPTISM_TEMPLATE_PATH)) {
    const image = await loadImage(BAPTISM_TEMPLATE_PATH);
    canvas = createCanvas(image.width, image.height);
    ctx = canvas.getContext('2d');
    ctx.drawImage(image, 0, 0);
  } else {
    // Create a simple certificate without template
    canvas = createCanvas(800, 1000);
    ctx = canvas.getContext('2d');
    
    // White background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, 800, 1000);
    
    // Gold border
    ctx.strokeStyle = '#c9a227';
    ctx.lineWidth = 8;
    ctx.strokeRect(30, 30, 740, 940);
    
    // Inner border
    ctx.strokeStyle = '#c9a227';
    ctx.lineWidth = 2;
    ctx.strokeRect(50, 50, 700, 900);
    
    // Header
    ctx.fillStyle = '#1a365d';
    ctx.font = 'bold 36px serif';
    ctx.textAlign = 'center';
    ctx.fillText('CERTIFICATE OF BAPTISM', 400, 120);
    
    // Decorative line
    ctx.strokeStyle = '#c9a227';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(150, 140);
    ctx.lineTo(650, 140);
    ctx.stroke();
    
    // Orthodox cross symbol
    ctx.font = '48px serif';
    ctx.fillText('☦', 400, 200);
  }

  // Text config
  ctx.font = '28px serif';
  ctx.fillStyle = '#000000';
  ctx.textAlign = 'center';

  // Use provided positions directly if they have x/y values, otherwise use defaults
  const positions = {};
  Object.keys(BAPTISM_POSITIONS).forEach(key => {
    if (fieldOffsets[key] && typeof fieldOffsets[key].x === 'number' && typeof fieldOffsets[key].y === 'number') {
      // Use provided absolute positions
      positions[key] = { x: fieldOffsets[key].x, y: fieldOffsets[key].y };
    } else {
      // Fall back to defaults
      positions[key] = { x: BAPTISM_POSITIONS[key].x, y: BAPTISM_POSITIONS[key].y };
    }
  });

  // For template-less version, use different positions
  if (!fs.existsSync(BAPTISM_TEMPLATE_PATH)) {
    const baseY = 280;
    const lineHeight = 50;
    
    ctx.font = '20px serif';
    ctx.fillStyle = '#333333';
    ctx.textAlign = 'center';
    
    ctx.fillText('This is to certify that', 400, baseY);
    
    // Full name (emphasized)
    const fullName = `${record.first_name || ''} ${record.last_name || ''}`.trim() || '[Name]';
    ctx.font = 'bold 32px serif';
    ctx.fillStyle = '#1a365d';
    ctx.fillText(fullName, 400, baseY + lineHeight);
    
    ctx.font = '20px serif';
    ctx.fillStyle = '#333333';
    
    // Birth info
    const birthDate = record.birth_date ? new Date(record.birth_date).toLocaleDateString() : '[Birth Date]';
    ctx.fillText(`Born: ${birthDate}`, 400, baseY + lineHeight * 2);
    
    const birthplace = record.birthplace || '[Birthplace]';
    ctx.fillText(`Place of Birth: ${birthplace}`, 400, baseY + lineHeight * 2.8);
    
    // Baptism info
    ctx.fillText('was received into the Holy Orthodox Church through', 400, baseY + lineHeight * 4);
    ctx.font = 'bold 24px serif';
    ctx.fillText('HOLY BAPTISM', 400, baseY + lineHeight * 4.8);
    
    ctx.font = '20px serif';
    const receptionDate = record.reception_date ? new Date(record.reception_date).toLocaleDateString() : '[Baptism Date]';
    ctx.fillText(`on ${receptionDate}`, 400, baseY + lineHeight * 5.6);
    
    // Parents
    const parents = record.parents || '[Parents]';
    ctx.fillText(`Parents: ${parents}`, 400, baseY + lineHeight * 6.8);
    
    // Sponsors
    const sponsors = record.sponsors || '[Sponsors/Godparents]';
    ctx.fillText(`Sponsors: ${sponsors}`, 400, baseY + lineHeight * 7.6);
    
    // Clergy
    const clergy = record.clergy || '[Clergy]';
    ctx.fillText(`Officiated by: ${clergy}`, 400, baseY + lineHeight * 8.8);
    
    // Church seal area
    ctx.font = 'italic 16px serif';
    ctx.fillStyle = '#666666';
    ctx.fillText('Church Seal', 650, 900);
    
    // Signature line
    ctx.strokeStyle = '#333333';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(500, 880);
    ctx.lineTo(750, 880);
    ctx.stroke();
    ctx.fillText('Priest Signature', 625, 870);
  } else {
    // Use template positions
    if (!hiddenFields.includes('fullName')) {
      const fullName = `${record.first_name || ''} ${record.last_name || ''}`.trim();
      if (fullName) ctx.fillText(fullName, positions.fullName.x, positions.fullName.y);
    }
    
    if (record.birthplace && !hiddenFields.includes('birthplace')) {
      ctx.fillText(record.birthplace, positions.birthplace.x, positions.birthplace.y);
    }
    
    if (record.birth_date && !hiddenFields.includes('birthDate')) {
      const birthDate = new Date(record.birth_date).toLocaleDateString();
      ctx.fillText(birthDate, positions.birthDate.x, positions.birthDate.y);
    }
    if (record.birth_date && !hiddenFields.includes('birthDateMD') && positions.birthDateMD) {
      const md = dateMD(record.birth_date);
      if (md) ctx.fillText(md, positions.birthDateMD.x, positions.birthDateMD.y);
    }
    if (record.birth_date && !hiddenFields.includes('birthDateYY') && positions.birthDateYY) {
      const yy = dateYY(record.birth_date);
      if (yy) ctx.fillText(yy, positions.birthDateYY.x, positions.birthDateYY.y);
    }
    
    // Clergy BY field (who performed the baptism)
    if (record.clergy && !hiddenFields.includes('clergyBy')) {
      ctx.fillText(record.clergy, positions.clergyBy.x, positions.clergyBy.y);
    }
    
    // Clergy Rector field (signing clergy)
    if (record.clergy && !hiddenFields.includes('clergyRector')) {
      ctx.fillText(record.clergy, positions.clergyRector.x, positions.clergyRector.y);
    }
    
    if (!hiddenFields.includes('church')) {
      ctx.fillText(record.churchName || 'Orthodox Church', positions.church.x, positions.church.y);
    }
    
    if (record.reception_date && !hiddenFields.includes('baptismDate')) {
      const baptismDate = new Date(record.reception_date).toLocaleDateString();
      ctx.fillText(baptismDate, positions.baptismDate.x, positions.baptismDate.y);
    }
    if (record.reception_date && !hiddenFields.includes('baptismDateMD') && positions.baptismDateMD) {
      const md = dateMD(record.reception_date);
      if (md) ctx.fillText(md, positions.baptismDateMD.x, positions.baptismDateMD.y);
    }
    if (record.reception_date && !hiddenFields.includes('baptismDateYY') && positions.baptismDateYY) {
      const yy = dateYY(record.reception_date);
      if (yy) ctx.fillText(yy, positions.baptismDateYY.x, positions.baptismDateYY.y);
    }
    
    if (record.sponsors && !hiddenFields.includes('sponsors')) {
      ctx.fillText(record.sponsors, positions.sponsors.x, positions.sponsors.y);
    }
  }

  return canvas;
};

/**
 * Generate marriage certificate preview using canvas (PNG)
 */
const generateMarriagePreview = async (record, fieldOffsets = {}, hiddenFields = []) => {
  let canvas, ctx;
  
  if (fs.existsSync(MARRIAGE_TEMPLATE_PATH)) {
    const image = await loadImage(MARRIAGE_TEMPLATE_PATH);
    canvas = createCanvas(image.width, image.height);
    ctx = canvas.getContext('2d');
    ctx.drawImage(image, 0, 0);
  } else {
    // Create a simple certificate without template
    canvas = createCanvas(800, 1000);
    ctx = canvas.getContext('2d');
    
    // White background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, 800, 1000);
    
    // Gold border
    ctx.strokeStyle = '#c9a227';
    ctx.lineWidth = 8;
    ctx.strokeRect(30, 30, 740, 940);
    
    // Inner border
    ctx.strokeStyle = '#c9a227';
    ctx.lineWidth = 2;
    ctx.strokeRect(50, 50, 700, 900);
    
    // Header
    ctx.fillStyle = '#1a365d';
    ctx.font = 'bold 36px serif';
    ctx.textAlign = 'center';
    ctx.fillText('CERTIFICATE OF MARRIAGE', 400, 120);
    
    // Decorative line
    ctx.strokeStyle = '#c9a227';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(150, 140);
    ctx.lineTo(650, 140);
    ctx.stroke();
    
    // Orthodox cross symbol
    ctx.font = '48px serif';
    ctx.fillText('☦', 400, 200);
  }

  // Text config
  ctx.font = '28px serif';
  ctx.fillStyle = '#000000';
  ctx.textAlign = 'center';

  // ── Template path: positioned drawing (mirrors baptism) ──────────────────
  // Previously this branch did nothing — the bare template image was
  // returned as-is. So saved drag positions for marriage were silently
  // ignored. Now we draw each known field at its saved (or default)
  // position, including the new MD/YY split tiles.
  if (fs.existsSync(MARRIAGE_TEMPLATE_PATH)) {
    const positions = {};
    Object.keys(MARRIAGE_POSITIONS).forEach(key => {
      if (fieldOffsets[key] && typeof fieldOffsets[key].x === 'number' && typeof fieldOffsets[key].y === 'number') {
        positions[key] = { x: fieldOffsets[key].x, y: fieldOffsets[key].y };
      } else {
        positions[key] = { x: MARRIAGE_POSITIONS[key].x, y: MARRIAGE_POSITIONS[key].y };
      }
    });

    const draw = (key, value) => {
      if (!value || hiddenFields.includes(key) || !positions[key]) return;
      ctx.fillText(String(value), positions[key].x, positions[key].y);
    };

    const groomName = `${record.fname_groom || record.groom_first || ''} ${record.lname_groom || record.groom_last || ''}`.trim();
    const brideName = `${record.fname_bride || record.bride_first || ''} ${record.lname_bride || record.bride_last || ''}`.trim();
    draw('groomName', groomName);
    draw('brideName', brideName);
    draw('groomParents', record.parentsg || record.parents_groom);
    draw('brideParents', record.parentsb || record.parents_bride);
    if (record.marriage_date) {
      draw('marriageDate', new Date(record.marriage_date).toLocaleDateString());
      draw('marriageDateMD', dateMD(record.marriage_date));
      draw('marriageDateYY', dateYY(record.marriage_date));
    }
    draw('marriagePlace', record.marriage_place || record.place || record.mlicense);
    draw('clergy', record.clergy);
    draw('church', record.churchName || 'Orthodox Church');
    draw('witnesses', record.witnesses);
  }

  // For template-less version
  if (!fs.existsSync(MARRIAGE_TEMPLATE_PATH)) {
    const baseY = 260;
    const lineHeight = 45;
    
    ctx.font = '20px serif';
    ctx.fillStyle = '#333333';
    ctx.textAlign = 'center';
    
    ctx.fillText('This is to certify that', 400, baseY);
    
    // Groom name
    const groomName = `${record.fname_groom || record.groom_first_name || ''} ${record.lname_groom || record.groom_last_name || ''}`.trim() || '[Groom Name]';
    ctx.font = 'bold 28px serif';
    ctx.fillStyle = '#1a365d';
    ctx.fillText(groomName, 400, baseY + lineHeight);
    
    ctx.font = '20px serif';
    ctx.fillStyle = '#333333';
    ctx.fillText('and', 400, baseY + lineHeight * 1.7);
    
    // Bride name
    const brideName = `${record.fname_bride || record.bride_first_name || ''} ${record.lname_bride || record.bride_last_name || ''}`.trim() || '[Bride Name]';
    ctx.font = 'bold 28px serif';
    ctx.fillStyle = '#1a365d';
    ctx.fillText(brideName, 400, baseY + lineHeight * 2.4);
    
    ctx.font = '20px serif';
    ctx.fillStyle = '#333333';
    ctx.fillText('were united in Holy Matrimony', 400, baseY + lineHeight * 3.4);
    
    // Marriage date
    const marriageDate = record.marriage_date ? new Date(record.marriage_date).toLocaleDateString() : '[Marriage Date]';
    ctx.fillText(`on ${marriageDate}`, 400, baseY + lineHeight * 4.2);
    
    // Parents
    const groomParents = record.parentsg || record.parents_groom || '[Groom\'s Parents]';
    ctx.fillText(`Groom's Parents: ${groomParents}`, 400, baseY + lineHeight * 5.4);
    
    const brideParents = record.parentsb || record.parents_bride || '[Bride\'s Parents]';
    ctx.fillText(`Bride's Parents: ${brideParents}`, 400, baseY + lineHeight * 6.2);
    
    // Witnesses
    const witnesses = record.witnesses || '[Witnesses]';
    ctx.fillText(`Witnesses: ${witnesses}`, 400, baseY + lineHeight * 7.4);
    
    // Clergy
    const clergy = record.clergy || '[Clergy]';
    ctx.fillText(`Officiated by: ${clergy}`, 400, baseY + lineHeight * 8.4);
    
    // Church seal area
    ctx.font = 'italic 16px serif';
    ctx.fillStyle = '#666666';
    ctx.fillText('Church Seal', 650, 900);
    
    // Signature line
    ctx.strokeStyle = '#333333';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(500, 880);
    ctx.lineTo(750, 880);
    ctx.stroke();
    ctx.fillText('Priest Signature', 625, 870);
  }

  return canvas;
};

/**
 * Generate baptism certificate PDF using pdf-lib
 */
const generateBaptismPDF = async (record, fieldPositions = null, hiddenFields = []) => {
  const pdfDoc = await PDFDocument.create();
  
  // Check if template exists
  if (fs.existsSync(BAPTISM_TEMPLATE_PATH)) {
    // Load the template image
    const templateBytes = fs.readFileSync(BAPTISM_TEMPLATE_PATH);
    const templateImage = await pdfDoc.embedPng(templateBytes);
    
    // Get template dimensions
    const { width: imgWidth, height: imgHeight } = templateImage.scale(1);
    
    // Create page with template dimensions (or scale to fit letter size)
    const pageWidth = 612; // Letter width
    const pageHeight = (imgHeight / imgWidth) * pageWidth;
    const page = pdfDoc.addPage([pageWidth, pageHeight]);
    
    // Draw template as background
    page.drawImage(templateImage, {
      x: 0,
      y: 0,
      width: pageWidth,
      height: pageHeight,
    });
    
    // Embed font for text overlay
    const textFont = await pdfDoc.embedFont(StandardFonts.TimesRoman);
    const black = rgb(0, 0, 0);
    
    // Use provided positions or defaults
    const positions = fieldPositions || BAPTISM_POSITIONS;
    
    // Scale factor from template coordinates to PDF coordinates
    const scaleX = pageWidth / imgWidth;
    const scaleY = pageHeight / imgHeight;
    
    // Helper to draw text at position (converting from top-left to bottom-left origin)
    const drawField = (fieldName, text, fontSize = 12) => {
      if (!text || hiddenFields.includes(fieldName)) return;
      const pos = positions[fieldName];
      if (!pos) return;
      
      // Convert Y coordinate (canvas is top-down, PDF is bottom-up)
      const pdfX = pos.x * scaleX;
      const pdfY = pageHeight - (pos.y * scaleY);
      
      page.drawText(String(text), {
        x: pdfX,
        y: pdfY,
        size: fontSize,
        font: textFont,
        color: black,
      });
    };
    
    // Draw all fields
    const fullName = `${record.first_name || ''} ${record.last_name || ''}`.trim();
    drawField('fullName', fullName, 14);
    
    if (record.birth_date) {
      drawField('birthDate', new Date(record.birth_date).toLocaleDateString());
      drawField('birthDateMD', dateMD(record.birth_date));
      drawField('birthDateYY', dateYY(record.birth_date));
    }

    drawField('birthplace', record.birthplace);

    if (record.reception_date) {
      drawField('baptismDate', new Date(record.reception_date).toLocaleDateString());
      drawField('baptismDateMD', dateMD(record.reception_date));
      drawField('baptismDateYY', dateYY(record.reception_date));
    }
    
    drawField('sponsors', record.sponsors);
    drawField('clergyBy', record.clergy);
    drawField('clergyRector', record.clergy);
    drawField('church', record.churchName);
    
  } else {
    // Fallback: Generate simple certificate without template
    const page = pdfDoc.addPage([612, 792]);
    const { width, height } = page.getSize();
    
    const titleFont = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);
    const textFont = await pdfDoc.embedFont(StandardFonts.TimesRoman);
    
    const darkBlue = rgb(0.1, 0.2, 0.4);
    const black = rgb(0, 0, 0);
    const gold = rgb(0.79, 0.63, 0.15);
    
    // Border
    page.drawRectangle({
      x: 30, y: 30, width: width - 60, height: height - 60,
      borderColor: gold, borderWidth: 3,
    });
    
    // Title
    const title = 'CERTIFICATE OF BAPTISM';
    const titleWidth = titleFont.widthOfTextAtSize(title, 28);
    page.drawText(title, {
      x: (width - titleWidth) / 2, y: height - 100,
      size: 28, font: titleFont, color: darkBlue,
    });
    
    let yPos = height - 180;
    const leftMargin = 80;
    
    page.drawText('This is to certify that', {
      x: leftMargin, y: yPos, size: 14, font: textFont, color: black,
    });
    
    yPos -= 40;
    const fullName = `${record.first_name || ''} ${record.last_name || ''}`.trim() || '[Name]';
    const nameWidth = titleFont.widthOfTextAtSize(fullName, 22);
    page.drawText(fullName, {
      x: (width - nameWidth) / 2, y: yPos, size: 22, font: titleFont, color: darkBlue,
    });
    
    yPos -= 50;
    if (record.birth_date) {
      page.drawText(`Born: ${new Date(record.birth_date).toLocaleDateString()}`, {
        x: leftMargin, y: yPos, size: 12, font: textFont, color: black,
      });
      yPos -= 25;
    }
    
    if (record.birthplace) {
      page.drawText(`Place of Birth: ${record.birthplace}`, {
        x: leftMargin, y: yPos, size: 12, font: textFont, color: black,
      });
      yPos -= 40;
    }
    
    page.drawText('was received into the Holy Orthodox Church through', {
      x: leftMargin, y: yPos, size: 12, font: textFont, color: black,
    });
    yPos -= 30;
    
    page.drawText('HOLY BAPTISM', {
      x: (width - titleFont.widthOfTextAtSize('HOLY BAPTISM', 18)) / 2, y: yPos,
      size: 18, font: titleFont, color: darkBlue,
    });
    yPos -= 40;
    
    if (record.reception_date) {
      page.drawText(`on ${new Date(record.reception_date).toLocaleDateString()}`, {
        x: leftMargin, y: yPos, size: 12, font: textFont, color: black,
      });
      yPos -= 40;
    }
    
    if (record.sponsors) {
      page.drawText(`Sponsors: ${record.sponsors}`, {
        x: leftMargin, y: yPos, size: 12, font: textFont, color: black,
      });
      yPos -= 25;
    }
    
    if (record.clergy) {
      page.drawText(`Officiated by: ${record.clergy}`, {
        x: leftMargin, y: yPos, size: 12, font: textFont, color: black,
      });
    }
  }

  return pdfDoc.save();
};

const generateMarriagePDF = async (record) => {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([612, 792]);
  const { width, height } = page.getSize();

  const titleFont = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);
  const textFont = await pdfDoc.embedFont(StandardFonts.TimesRoman);
  const italicFont = await pdfDoc.embedFont(StandardFonts.TimesRomanItalic);

  const darkBlue = rgb(0.1, 0.2, 0.4);
  const black = rgb(0, 0, 0);
  const gold = rgb(0.79, 0.63, 0.15);

  // Decorative border
  page.drawRectangle({
    x: 30,
    y: 30,
    width: width - 60,
    height: height - 60,
    borderColor: gold,
    borderWidth: 3,
  });

  page.drawRectangle({
    x: 40,
    y: 40,
    width: width - 80,
    height: height - 80,
    borderColor: gold,
    borderWidth: 1,
  });

  // Title
  const title = 'CERTIFICATE OF MARRIAGE';
  const titleWidth = titleFont.widthOfTextAtSize(title, 28);
  page.drawText(title, {
    x: (width - titleWidth) / 2,
    y: height - 100,
    size: 28,
    font: titleFont,
    color: darkBlue,
  });

  // Decorative line
  page.drawLine({
    start: { x: width / 2 - 150, y: height - 115 },
    end: { x: width / 2 + 150, y: height - 115 },
    thickness: 2,
    color: gold,
  });

  let yPosition = height - 180;
  const leftMargin = 80;

  page.drawText('This is to certify that', {
    x: leftMargin,
    y: yPosition,
    size: 14,
    font: textFont,
    color: black,
  });

  yPosition -= 40;

  // Groom name
  const groomName = `${record.fname_groom || record.groom_first_name || ''} ${record.lname_groom || record.groom_last_name || ''}`.trim() || '[Groom Name]';
  const groomWidth = titleFont.widthOfTextAtSize(groomName, 20);
  page.drawText(groomName, {
    x: (width - groomWidth) / 2,
    y: yPosition,
    size: 20,
    font: titleFont,
    color: darkBlue,
  });

  yPosition -= 30;

  const andWidth = textFont.widthOfTextAtSize('and', 14);
  page.drawText('and', {
    x: (width - andWidth) / 2,
    y: yPosition,
    size: 14,
    font: textFont,
    color: black,
  });

  yPosition -= 30;

  // Bride name
  const brideName = `${record.fname_bride || record.bride_first_name || ''} ${record.lname_bride || record.bride_last_name || ''}`.trim() || '[Bride Name]';
  const brideWidth = titleFont.widthOfTextAtSize(brideName, 20);
  page.drawText(brideName, {
    x: (width - brideWidth) / 2,
    y: yPosition,
    size: 20,
    font: titleFont,
    color: darkBlue,
  });

  yPosition -= 40;

  page.drawText('were united in Holy Matrimony', {
    x: leftMargin,
    y: yPosition,
    size: 12,
    font: textFont,
    color: black,
  });

  yPosition -= 30;

  const marriageDate = record.marriage_date ? new Date(record.marriage_date).toLocaleDateString() : '[Marriage Date]';
  page.drawText(`on ${marriageDate}`, {
    x: leftMargin,
    y: yPosition,
    size: 12,
    font: textFont,
    color: black,
  });

  yPosition -= 40;

  // Parents
  const groomParents = record.parentsg || record.parents_groom || '[Groom\'s Parents]';
  page.drawText(`Groom's Parents: ${groomParents}`, {
    x: leftMargin,
    y: yPosition,
    size: 11,
    font: textFont,
    color: black,
  });

  yPosition -= 25;

  const brideParents = record.parentsb || record.parents_bride || '[Bride\'s Parents]';
  page.drawText(`Bride's Parents: ${brideParents}`, {
    x: leftMargin,
    y: yPosition,
    size: 11,
    font: textFont,
    color: black,
  });

  yPosition -= 35;

  // Witnesses
  const witnesses = record.witnesses || '[Witnesses]';
  page.drawText(`Witnesses: ${witnesses}`, {
    x: leftMargin,
    y: yPosition,
    size: 11,
    font: textFont,
    color: black,
  });

  yPosition -= 35;

  // Clergy
  const clergy = record.clergy || '[Clergy]';
  page.drawText(`Officiated by: ${clergy}`, {
    x: leftMargin,
    y: yPosition,
    size: 12,
    font: textFont,
    color: black,
  });

  // Signature area
  page.drawLine({
    start: { x: width - 250, y: 120 },
    end: { x: width - 50, y: 120 },
    thickness: 1,
    color: black,
  });

  page.drawText('Priest Signature', {
    x: width - 200,
    y: 100,
    size: 10,
    font: italicFont,
    color: black,
  });

  page.drawText('Church Seal', {
    x: width - 200,
    y: 60,
    size: 10,
    font: italicFont,
    color: black,
  });

  return pdfDoc.save();
};

// ============================================
// ROUTES
// ============================================


/**
 * GET /api/church/:churchId/certificate/baptism/template
 * Get blank baptism certificate template (no text rendered)
 */
router.get('/baptism/template', async (req, res) => {
  try {
    if (!fs.existsSync(BAPTISM_TEMPLATE_PATH)) {
      return res.status(404).json({ success: false, error: 'Template not found' });
    }
    
    const templateBuffer = fs.readFileSync(BAPTISM_TEMPLATE_PATH);
    const base64Image = templateBuffer.toString('base64');
    
    res.json({
      success: true,
      template: `data:image/png;base64,${base64Image}`,
    });
  } catch (err) {
    console.error('Template error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/church/:churchId/certificate/marriage/template
 * Get blank marriage certificate template (no text rendered)
 */
router.get('/marriage/template', async (req, res) => {
  try {
    if (!fs.existsSync(MARRIAGE_TEMPLATE_PATH)) {
      return res.status(404).json({ success: false, error: 'Template not found' });
    }
    
    const templateBuffer = fs.readFileSync(MARRIAGE_TEMPLATE_PATH);
    const base64Image = templateBuffer.toString('base64');
    
    res.json({
      success: true,
      template: `data:image/png;base64,${base64Image}`,
    });
  } catch (err) {
    console.error('Template error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/church/:churchId/certificate/baptism/:id/preview
 * Generate baptism certificate preview (PNG via canvas)
 */
router.post('/baptism/:id/preview', async (req, res) => {
  const { churchId } = req.params;
  const id = parseInt(req.params.id);
  
  if (!churchId) {
    return res.status(400).json({ success: false, error: 'Church ID is required' });
  }
  if (!id) {
    return res.status(400).json({ success: false, error: 'Invalid record ID' });
  }

  try {
    const pool = getChurchPool(churchId);
    const [rows] = await pool.query('SELECT * FROM baptism_records WHERE id = ?', [id]);
    
    if (rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Baptism record not found' });
    }

    const record = rows[0];
    
    // Get church name from database
    const churchName = await getChurchName(churchId);
    record.churchName = churchName;
    
    const fieldOffsets = req.body.fieldOffsets || {};
    const hiddenFields = req.body.hiddenFields || [];

    const canvas = await generateBaptismPreview(record, fieldOffsets, hiddenFields);
    const buffer = canvas.toBuffer('image/png');
    const base64Image = buffer.toString('base64');

    res.json({
      success: true,
      preview: `data:image/png;base64,${base64Image}`,
      positions: BAPTISM_POSITIONS,
      // Return the whole record so the front-end has every column it might
      // want for drag-tile labels (parents, entry_type, etc.). Avoids the
      // fragile per-field allowlist that previously dropped `parents` and
      // left the new fatherName / motherName tiles empty.
      record,
    });

  } catch (err) {
    console.error('Baptism certificate preview error:', err);
    res.status(500).json({ success: false, error: err.message || 'Error generating preview' });
  }
});

/**
 * GET /api/church/:churchId/certificate/baptism/:id/download
 * Download baptism certificate (PDF via NEW deterministic generator)
 */
router.get('/baptism/:id/download', async (req, res) => {
  const { churchId } = req.params;
  const id = parseInt(req.params.id);
  
  if (!churchId) {
    return res.status(400).send('Church ID is required');
  }
  if (!id) {
    return res.status(400).send('Invalid record ID');
  }

  try {
    // Parse field positions and hidden fields from query params
    let customPositions = null;
    let hiddenFields = [];
    
    if (req.query.positions) {
      try {
        customPositions = JSON.parse(decodeURIComponent(req.query.positions));
      } catch (e) {
        console.warn('Could not parse positions:', e);
      }
    }
    
    if (req.query.hidden) {
      try {
        hiddenFields = JSON.parse(decodeURIComponent(req.query.hidden));
      } catch (e) {
        console.warn('Could not parse hidden fields:', e);
      }
    }
    
    const pool = getChurchPool(churchId);
    const [rows] = await pool.query('SELECT * FROM baptism_records WHERE id = ?', [id]);
    
    if (rows.length === 0) {
      return res.status(404).send('Baptism record not found');
    }

    const record = rows[0];
    
    // Get church name from database
    const churchName = await getChurchName(churchId);
    record.churchName = churchName;
    
    // NEW: Use deterministic PDF generator
    const pdfBytes = await generateCertificatePDF('baptism', record, {
      customPositions,
      hiddenFields,
    });

    const filename = `baptism_certificate_${record.first_name || 'unknown'}_${record.last_name || 'unknown'}_${id}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(Buffer.from(pdfBytes));

  } catch (err) {
    console.error('Baptism certificate download error:', err);
    res.status(500).send('Error generating certificate');
  }
});

/**
 * POST /api/church/:churchId/certificate/marriage/:id/preview
 * Generate marriage certificate preview (PNG via canvas)
 */
router.post('/marriage/:id/preview', async (req, res) => {
  const { churchId } = req.params;
  const id = parseInt(req.params.id);
  
  if (!churchId) {
    return res.status(400).json({ success: false, error: 'Church ID is required' });
  }
  if (!id) {
    return res.status(400).json({ success: false, error: 'Invalid record ID' });
  }

  try {
    const pool = getChurchPool(churchId);
    const [rows] = await pool.query('SELECT * FROM marriage_records WHERE id = ?', [id]);
    
    if (rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Marriage record not found' });
    }

    const record = rows[0];
    
    // Get church name from database
    const churchName = await getChurchName(churchId);
    record.churchName = churchName;
    
    const fieldOffsets = req.body.fieldOffsets || {};
    const hiddenFields = req.body.hiddenFields || [];

    const canvas = await generateMarriagePreview(record, fieldOffsets, hiddenFields);
    const buffer = canvas.toBuffer('image/png');
    const base64Image = buffer.toString('base64');

    res.json({
      success: true,
      preview: `data:image/png;base64,${base64Image}`,
      positions: MARRIAGE_POSITIONS,
      // Whole record (see baptism preview above for rationale).
      record,
    });

  } catch (err) {
    console.error('Marriage certificate preview error:', err);
    res.status(500).json({ success: false, error: err.message || 'Error generating preview' });
  }
});

/**
 * GET /api/church/:churchId/certificate/marriage/:id/download
 * Download marriage certificate (PDF via NEW deterministic generator)
 */
router.get('/marriage/:id/download', async (req, res) => {
  const { churchId } = req.params;
  const id = parseInt(req.params.id);
  
  if (!churchId) {
    return res.status(400).send('Church ID is required');
  }
  if (!id) {
    return res.status(400).send('Invalid record ID');
  }

  try {
    // Parse field positions and hidden fields from query params
    let customPositions = null;
    let hiddenFields = [];
    
    if (req.query.positions) {
      try {
        customPositions = JSON.parse(decodeURIComponent(req.query.positions));
      } catch (e) {
        console.warn('Could not parse positions:', e);
      }
    }
    
    if (req.query.hidden) {
      try {
        hiddenFields = JSON.parse(decodeURIComponent(req.query.hidden));
      } catch (e) {
        console.warn('Could not parse hidden fields:', e);
      }
    }
    
    const pool = getChurchPool(churchId);
    const [rows] = await pool.query('SELECT * FROM marriage_records WHERE id = ?', [id]);
    
    if (rows.length === 0) {
      return res.status(404).send('Marriage record not found');
    }

    const record = rows[0];
    
    // Get church name from database
    const churchName = await getChurchName(churchId);
    record.churchName = churchName;
    
    // NEW: Use deterministic PDF generator
    const pdfBytes = await generateCertificatePDF('marriage', record, {
      customPositions,
      hiddenFields,
    });

    const groomName = `${record.fname_groom || 'unknown'}_${record.lname_groom || ''}`.trim();
    const brideName = `${record.fname_bride || 'unknown'}_${record.lname_bride || ''}`.trim();
    const filename = `marriage_certificate_${groomName}_${brideName}_${id}.pdf`;
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(Buffer.from(pdfBytes));

  } catch (err) {
    console.error('Marriage certificate download error:', err);
    res.status(500).send('Error generating certificate');
  }
});



/**
 * GET /api/church/:churchId/certificate/baptism/search
 * Search baptism records with multiple criteria
 */
router.get('/baptism/search', async (req, res) => {
  const { churchId } = req.params;
  
  try {
    const pool = getChurchPool(churchId);
    
    // Build WHERE clause from query params
    const conditions = [];
    const values = [];
    
    const searchableFields = ['first_name', 'last_name', 'birth_date', 'reception_date', 'birthplace', 'sponsors', 'clergy'];
    
    for (const field of searchableFields) {
      if (req.query[field]) {
        if (field.includes('date')) {
          conditions.push(`${field} = ?`);
          values.push(req.query[field]);
        } else {
          conditions.push(`${field} LIKE ?`);
          values.push(`%${req.query[field]}%`);
        }
      }
    }
    
    if (conditions.length === 0) {
      return res.status(400).json({ success: false, error: 'At least one search criteria is required' });
    }
    
    const query = `SELECT * FROM baptism_records WHERE ${conditions.join(' AND ')} ORDER BY id DESC LIMIT 100`;
    const [rows] = await pool.query(query, values);
    
    res.json({ success: true, records: rows });
  } catch (err) {
    console.error('Search error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/church/:churchId/certificate/marriage/search
 * Search marriage records with multiple criteria
 */
router.get('/marriage/search', async (req, res) => {
  const { churchId } = req.params;
  
  try {
    const pool = getChurchPool(churchId);
    
    const conditions = [];
    const values = [];
    
    const fieldMappings = {
      'groom_first': ['fname_groom', 'groom_first'],
      'groom_last': ['lname_groom', 'groom_last'],
      'bride_first': ['fname_bride', 'bride_first'],
      'bride_last': ['lname_bride', 'bride_last'],
      'marriage_date': ['marriage_date'],
      'clergy': ['clergy']
    };
    
    for (const [queryField, dbFields] of Object.entries(fieldMappings)) {
      if (req.query[queryField]) {
        const fieldConditions = dbFields.map(f => {
          if (f.includes('date')) {
            values.push(req.query[queryField]);
            return `${f} = ?`;
          } else {
            values.push(`%${req.query[queryField]}%`);
            return `${f} LIKE ?`;
          }
        });
        conditions.push(`(${fieldConditions.join(' OR ')})`);
      }
    }
    
    if (conditions.length === 0) {
      return res.status(400).json({ success: false, error: 'At least one search criteria is required' });
    }
    
    const query = `SELECT * FROM marriage_records WHERE ${conditions.join(' AND ')} ORDER BY id DESC LIMIT 100`;
    const [rows] = await pool.query(query, values);
    
    res.json({ success: true, records: rows });
  } catch (err) {
    console.error('Search error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/church/:churchId/certificate/positions/:type
 * Load saved field positions for a church
 */
router.get('/positions/:type', async (req, res) => {
  const { churchId } = req.params;
  const certType = req.params.type; // 'baptism' or 'marriage'
  
  try {
    const appPool = mainPool;
    
    // Check if table exists, create if not
    await appPool.query(`
      CREATE TABLE IF NOT EXISTS certificate_positions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        church_id INT NOT NULL,
        cert_type VARCHAR(50) NOT NULL,
        positions JSON NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY unique_church_cert (church_id, cert_type)
      )
    `);
    
    const [rows] = await appPool.query(
      'SELECT positions FROM certificate_positions WHERE church_id = ? AND cert_type = ?',
      [churchId, certType]
    );
    
    if (rows.length > 0) {
      // Parse positions if stored as string
      let positions = rows[0].positions;
      if (typeof positions === 'string') {
        try {
          positions = JSON.parse(positions);
        } catch (e) {
          console.warn('Could not parse positions:', e);
        }
      }
      res.json({
        success: true,
        positions: positions,
      });
    } else {
      // Return default positions
      const defaults = certType === 'marriage' ? MARRIAGE_POSITIONS : BAPTISM_POSITIONS;
      res.json({
        success: true,
        positions: defaults,
        isDefault: true,
      });
    }
  } catch (err) {
    console.error('Load positions error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/church/:churchId/certificate/positions/:type
 * Save field positions for a church
 */
router.post('/positions/:type', async (req, res) => {
  const { churchId } = req.params;
  const certType = req.params.type;
  const { positions } = req.body;
  
  if (!positions) {
    return res.status(400).json({ success: false, error: 'Positions are required' });
  }
  
  try {
    const appPool = mainPool;
    
    // Ensure table exists
    await appPool.query(`
      CREATE TABLE IF NOT EXISTS certificate_positions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        church_id INT NOT NULL,
        cert_type VARCHAR(50) NOT NULL,
        positions JSON NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY unique_church_cert (church_id, cert_type)
      )
    `);
    
    // Upsert positions - ensure positions is properly formatted
    const positionsStr = typeof positions === 'string' ? positions : JSON.stringify(positions);
    
    await appPool.query(`
      INSERT INTO certificate_positions (church_id, cert_type, positions)
      VALUES (?, ?, ?)
      ON DUPLICATE KEY UPDATE positions = VALUES(positions)
    `, [churchId, certType, positionsStr]);
    
    res.json({ success: true, message: 'Positions saved' });
  } catch (err) {
    console.error('Save positions error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;

