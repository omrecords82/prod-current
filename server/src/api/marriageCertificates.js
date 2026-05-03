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
const TEMPLATE_PATH = path.join(__dirname, '../templates/marriage_certificate_template.png');

// Default field positions based on the certificate template
// These are base positions that work well with the template
const DEFAULT_POSITIONS = {
  groomName: { x: 383, y: 574 },      // Groom's name
  groomParents: { x: 400, y: 600 },   // Groom's parents
  brideName: { x: 383, y: 626 },      // Bride's name
  brideParents: { x: 400, y: 652 },   // Bride's parents
  marriageDate: { x: 444, y: 678 },   // Marriage date
  marriagePlace: { x: 410, y: 704 },  // Marriage place
  clergy: { x: 410, y: 730 },         // Clergy
  church: { x: 514, y: 756 },         // Church
  witnesses: { x: 400, y: 782 }       // Witnesses
};

// Helper function to generate certificate
const generateCertificate = async (record, fieldOffsets = {}) => {
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

    // Insert data with dynamic positioning
    const groomName = `${record.fname_groom || ''} ${record.lname_groom || ''}`.trim();
    if (groomName) {
      ctx.fillText(groomName, positions.groomName.x, positions.groomName.y);
    }
    
    if (record.parentsg) {
      ctx.fillText(record.parentsg, positions.groomParents.x, positions.groomParents.y);
    }
    
    const brideName = `${record.fname_bride || ''} ${record.lname_bride || ''}`.trim();
    if (brideName) {
      ctx.fillText(brideName, positions.brideName.x, positions.brideName.y);
    }
    
    if (record.parentsb) {
      ctx.fillText(record.parentsb, positions.brideParents.x, positions.brideParents.y);
    }
    
    if (record.marriage_date) {
      const marriageDate = new Date(record.marriage_date).toLocaleDateString();
      ctx.fillText(marriageDate, positions.marriageDate.x, positions.marriageDate.y);
    }
    
    if (record.marriage_place) {
      ctx.fillText(record.marriage_place, positions.marriagePlace.x, positions.marriagePlace.y);
    }
    
    if (record.clergy) {
      ctx.fillText(record.clergy, positions.clergy.x, positions.clergy.y);
    }
    
    // Add church name (you might want to make this configurable)
    ctx.fillText('Orthodox Church in America', positions.church.x, positions.church.y);
    
    if (record.witnesses) {
      ctx.fillText(record.witnesses, positions.witnesses.x, positions.witnesses.y);
    }

    return canvas;
  } catch (error) {
    console.error('Error in generateCertificate:', error);
    throw error;
  }
};

// GET /api/certificate/marriage/test - Test endpoint to verify template exists
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

// GET /api/certificate/marriage/:id - Generate and download certificate
router.get('/:id', async (req, res) => {
  const id = parseInt(req.params.id);
  if (!id) return res.status(400).send('Invalid ID');

  try {
    // Query the marriage record
    const [rows] = await getRecordsPoolForRequest(req).query('SELECT * FROM marriage_records WHERE id = ?', [id]);
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
    const outputFile = path.join(OUTPUT_DIR, `marriage_${id}.png`);
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
          recordType: 'marriage',
          recordId: id,
          status: 'generated',
          filePath: outputFile,
          fileSize,
          userId: userIdFromReq(req),
          metadata: { source: 'legacy_png_endpoint', route: 'GET /api/marriageCertificates/:id' },
        });
      });
    });

  } catch (err) {
    console.error(err);
    res.status(500).send('Error generating certificate');
  }
});

// POST /api/certificate/marriage/:id/preview - Generate preview with custom field positions
router.post('/:id/preview', async (req, res) => {
  const id = parseInt(req.params.id);
  if (!id) return res.status(400).send('Invalid ID');

  try {
    // Query the marriage record
    const [rows] = await getRecordsPoolForRequest(req).query('SELECT * FROM marriage_records WHERE id = ?', [id]);
    if (rows.length === 0) return res.status(404).send('Record not found');

    const record = rows[0];
    const fieldOffsets = req.body.fieldOffsets || {};

    const canvas = await generateCertificate(record, fieldOffsets);

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

// GET /api/certificate/marriage/:id/download - Download certificate with custom positions
router.get('/:id/download', async (req, res) => {
  const id = parseInt(req.params.id);
  if (!id) return res.status(400).send('Invalid ID');

  try {
    // Query the marriage record
    const [rows] = await getRecordsPoolForRequest(req).query('SELECT * FROM marriage_records WHERE id = ?', [id]);
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

    // Set headers for download
    const filename = `marriage_certificate_${record.fname_groom}_${record.lname_groom}_${record.fname_bride}_${record.lname_bride}_${id}.png`;
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    // Send the image buffer
    const buffer = canvas.toBuffer('image/png');
    res.send(buffer);
    recordCertificateGeneration({
      churchId: churchIdFromReq(req),
      recordType: 'marriage',
      recordId: id,
      status: 'downloaded',
      filePath: null,
      fileSize: buffer.length,
      userId: userIdFromReq(req),
      metadata: {
        source: 'legacy_png_endpoint',
        route: 'GET /api/marriageCertificates/:id/download',
        filename,
      },
    });

  } catch (err) {
    console.error(err);
    res.status(500).send('Error generating certificate');
  }
});

module.exports = router;
