const { getAppPool } = require('../config/db-compat');
const { getChurchPool } = require('../db/pool');
const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const { createCanvas, loadImage } = require('canvas');
const { promisePool } = require('../config/db-compat'); // Use promisePool instead of db
const { recordCertificateGeneration, churchIdFromReq, userIdFromReq } = require('../certificates/audit');

// Records live in the church-scoped DB (om_church_<id>), not the platform DB.
// Resolve the right pool from the authenticated user's church_id.
function getRecordsPoolForRequest(req) {
  const churchId = req.user && (req.user.church_id || req.user.churchId);
  if (!churchId) {
    const err = new Error('No church context on request');
    err.code = 'NO_CHURCH_CONTEXT';
    throw err;
  }
  return getChurchPool(churchId);
}

// Certificate output path
const OUTPUT_DIR = path.join(__dirname, '../certificates');
if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR);

// Certificate template image
const TEMPLATE_PATH = path.join(__dirname, '../templates/baptism_certificate_template.png');

// Default field positions based on the certificate template
// These are base positions that work well with the template
const DEFAULT_POSITIONS = {
  fullName: { x: 383, y: 574 },      // Name field
  birthplace: { x: 400, y: 600 },   // Birthplace field
  birthDate: { x: 444, y: 626 },    // Birth date field
  clergy: { x: 410, y: 698 },       // Clergy field
  church: { x: 514, y: 724 },       // Church field
  baptismDate: { x: 424, y: 754 },  // Baptism date field
  sponsors: { x: 400, y: 784 }      // Sponsors field
};

// Helper function to generate certificate
const generateCertificate = async (record, fieldOffsets = {}, hiddenFields = []) => {
  try {
    // Check if template exists
    if (!fs.existsSync(TEMPLATE_PATH)) {
      throw new Error(`Template not found at ${TEMPLATE_PATH}`);
    }

    // Load template image
    const image = await loadImage(TEMPLATE_PATH);
    const canvas = createCanvas(image.width, image.height);
    const ctx = canvas.getContext('2d');
    ctx.drawImage(image, 0, 0);

    // Text config - increased font size for better visibility
    ctx.font = '36px serif'; // Increased from 20px to 36px
    ctx.fillStyle = 'black';
    ctx.textAlign = 'center';

    // Merge default positions with custom offsets
    const positions = {};
    Object.keys(DEFAULT_POSITIONS).forEach(key => {
      positions[key] = {
        x: DEFAULT_POSITIONS[key].x + (fieldOffsets[key]?.x || 0),
        y: DEFAULT_POSITIONS[key].y + (fieldOffsets[key]?.y || 0)
      };
    });

    // Insert data with dynamic positioning, respecting hidden fields
    const fullName = `${record.first_name || ''} ${record.last_name || ''}`.trim();
    if (fullName && !hiddenFields.includes('fullName')) {
      ctx.fillText(fullName, positions.fullName.x, positions.fullName.y);
    }
    
    if (record.birthplace && !hiddenFields.includes('birthplace')) {
      ctx.fillText(record.birthplace, positions.birthplace.x, positions.birthplace.y);
    }
    
    if (record.birth_date && !hiddenFields.includes('birthDate')) {
      const birthDate = new Date(record.birth_date).toLocaleDateString();
      ctx.fillText(birthDate, positions.birthDate.x, positions.birthDate.y);
    }
    
    if (record.clergy && !hiddenFields.includes('clergy')) {
      ctx.fillText(record.clergy, positions.clergy.x, positions.clergy.y);
    }
    
    // Add church name (you might want to make this configurable)
    if (!hiddenFields.includes('church')) {
      ctx.fillText('Orthodox Church in America', positions.church.x, positions.church.y);
    }
    
    if (record.reception_date && !hiddenFields.includes('baptismDate')) {
      const baptismDate = new Date(record.reception_date).toLocaleDateString();
      ctx.fillText(baptismDate, positions.baptismDate.x, positions.baptismDate.y);
    }
    
    if (record.sponsors && !hiddenFields.includes('sponsors')) {
      ctx.fillText(record.sponsors, positions.sponsors.x, positions.sponsors.y);
    }

    return canvas;
  } catch (error) {
    console.error('Error in generateCertificate:', error);
    throw error;
  }
};

// GET /api/certificate/baptism/:id - Generate and download certificate
router.get('/:id', async (req, res) => {
  const id = parseInt(req.params.id);
  if (!id) return res.status(400).send('Invalid ID');

  try {
    // Query the baptism record
    const [rows] = await getRecordsPoolForRequest(req).query('SELECT * FROM baptism_records WHERE id = ?', [id]);
    if (rows.length === 0) return res.status(404).send('Record not found');

    const record = rows[0];
    
    // Get field offsets from query parameters if provided
    const fieldOffsets = {};
    if (req.query.offsets) {
      try {
        Object.assign(fieldOffsets, JSON.parse(req.query.offsets));
      } catch (e) {
        console.warn('Invalid offsets parameter:', req.query.offsets);
      }
    }

    const canvas = await generateCertificate(record, fieldOffsets);

    // Save output file
    const outputFile = path.join(OUTPUT_DIR, `baptism_${id}.png`);
    const outStream = fs.createWriteStream(outputFile);
    const stream = canvas.createPNGStream();

    stream.pipe(outStream);
    outStream.on('finish', () => {
      res.sendFile(outputFile, (sendErr) => {
        if (sendErr) return;
        let fileSize = null;
        try { fileSize = fs.statSync(outputFile).size; } catch {}
        recordCertificateGeneration({
          churchId: churchIdFromReq(req),
          recordType: 'baptism',
          recordId: id,
          status: 'generated',
          filePath: outputFile,
          fileSize,
          userId: userIdFromReq(req),
          metadata: { source: 'legacy_png_endpoint', route: 'GET /api/baptismCertificates/:id' },
        });
      });
    });

  } catch (err) {
    console.error(err);
    res.status(500).send('Error generating certificate');
  }
});

// POST /api/certificate/baptism/:id/preview - Generate preview with custom field positions
router.post('/:id/preview', async (req, res) => {
  const id = parseInt(req.params.id);
  if (!id) return res.status(400).send('Invalid ID');

  try {
    // Query the baptism record
    const [rows] = await getRecordsPoolForRequest(req).query('SELECT * FROM baptism_records WHERE id = ?', [id]);
    if (rows.length === 0) return res.status(404).send('Record not found');

    const record = rows[0];
    const fieldOffsets = req.body.fieldOffsets || {};
    const hiddenFields = req.body.hiddenFields || [];

    const canvas = await generateCertificate(record, fieldOffsets, hiddenFields);

    // Return base64 encoded image for preview
    const buffer = canvas.toBuffer('image/png');
    const base64Image = buffer.toString('base64');
    
    res.json({
      success: true,
      preview: `data:image/png;base64,${base64Image}`,
      positions: Object.keys(DEFAULT_POSITIONS).reduce((acc, key) => {
        acc[key] = {
          x: DEFAULT_POSITIONS[key].x + (fieldOffsets[key]?.x || 0),
          y: DEFAULT_POSITIONS[key].y + (fieldOffsets[key]?.y || 0)
        };
        return acc;
      }, {})
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Error generating preview' });
  }
});

// GET /api/certificate/baptism/:id/download - Download certificate with custom positions
router.get('/:id/download', async (req, res) => {
  const id = parseInt(req.params.id);
  if (!id) return res.status(400).send('Invalid ID');

  try {
    // Query the baptism record
    const [rows] = await getRecordsPoolForRequest(req).query('SELECT * FROM baptism_records WHERE id = ?', [id]);
    if (rows.length === 0) return res.status(404).send('Record not found');

    const record = rows[0];
    
    // Get field offsets and hidden fields from query parameters if provided
    const fieldOffsets = {};
    const hiddenFields = [];
    
    if (req.query.offsets) {
      try {
        Object.assign(fieldOffsets, JSON.parse(req.query.offsets));
      } catch (e) {
        console.warn('Invalid offsets parameter:', req.query.offsets);
      }
    }
    
    if (req.query.hiddenFields) {
      try {
        hiddenFields.push(...JSON.parse(req.query.hiddenFields));
      } catch (e) {
        console.warn('Invalid hiddenFields parameter:', req.query.hiddenFields);
      }
    }

    const canvas = await generateCertificate(record, fieldOffsets, hiddenFields);

    // Set headers for download
    const filename = `baptism_certificate_${record.first_name}_${record.last_name}_${id}.png`;
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    // Send the image buffer
    const buffer = canvas.toBuffer('image/png');
    res.send(buffer);
    recordCertificateGeneration({
      churchId: churchIdFromReq(req),
      recordType: 'baptism',
      recordId: id,
      status: 'downloaded',
      filePath: null,
      fileSize: buffer.length,
      userId: userIdFromReq(req),
      metadata: {
        source: 'legacy_png_endpoint',
        route: 'GET /api/baptismCertificates/:id/download',
        filename,
        hiddenFields: hiddenFields.length ? hiddenFields : undefined,
      },
    });

  } catch (err) {
    console.error(err);
    res.status(500).send('Error generating certificate');
  }
});

// GET /api/certificate/baptism/test - Test endpoint to verify template exists
router.get('/test', async (req, res) => {
  try {
    // Check if template exists
    if (!fs.existsSync(TEMPLATE_PATH)) {
      return res.status(404).json({ 
        success: false, 
        error: 'Template not found', 
        path: TEMPLATE_PATH 
      });
    }

    // Try to load the template
    const image = await loadImage(TEMPLATE_PATH);
    
    res.json({
      success: true,
      message: 'Template loaded successfully',
      templatePath: TEMPLATE_PATH,
      dimensions: {
        width: image.width,
        height: image.height
      },
      defaultPositions: DEFAULT_POSITIONS
    });
  } catch (err) {
    console.error('Template test error:', err);
    res.status(500).json({ 
      success: false, 
      error: 'Error loading template', 
      details: err.message 
    });
  }
});

module.exports = router;
