/**
 * Certificate Field Coordinate Maps
 * 
 * Single source of truth for all certificate field positions.
 * Coordinates are in PDF points (1/72 inch) relative to bottom-left origin.
 * 
 * Template dimensions:
 * - Standard letter size: 612 x 792 points (8.5" x 11")
 * - Certificate templates are scaled to fit letter size
 */

/**
 * Baptism Certificate Field Positions
 * Based on 2026 adult baptism template
 */
const BAPTISM_CERTIFICATE_MAP = {
  // Template metadata
  templateDimensions: {
    width: 612,  // Letter width in points
    height: 792, // Letter height in points
  },
  
  // Font configuration
  fonts: {
    default: {
      family: 'TimesRoman',
      size: 14,
      color: { r: 0, g: 0, b: 0 },
    },
    name: {
      family: 'TimesRoman',
      size: 18,
      color: { r: 0, g: 0, b: 0 },
      bold: true,
    },
  },
  
  // Field positions (x, y from bottom-left, in PDF points)
  fields: {
    fullName: {
      x: 306,        // Center-aligned
      y: 520,
      fontSize: 18,
      fontWeight: 'bold',
      align: 'center',
      maxWidth: 400,
    },
    birthDate: {
      x: 350,
      y: 480,
      fontSize: 14,
      align: 'left',
      maxWidth: 200,
    },
    birthplace: {
      x: 306,
      y: 455,
      fontSize: 14,
      align: 'center',
      maxWidth: 300,
    },
    baptismDate: {
      x: 306,
      y: 400,
      fontSize: 14,
      align: 'center',
      maxWidth: 200,
    },
    // Split date variants — match the OCA artwork's "ON ___, 20___"
    // layout. Operators drag to fine-tune; these are starter coords.
    birthDateMD: {
      x: 280,
      y: 480,
      fontSize: 14,
      align: 'center',
      maxWidth: 100,
    },
    birthDateYY: {
      x: 430,
      y: 480,
      fontSize: 14,
      align: 'center',
      maxWidth: 40,
    },
    baptismDateMD: {
      x: 280,
      y: 400,
      fontSize: 14,
      align: 'center',
      maxWidth: 100,
    },
    baptismDateYY: {
      x: 430,
      y: 400,
      fontSize: 14,
      align: 'center',
      maxWidth: 40,
    },
    sponsors: {
      x: 306,
      y: 350,
      fontSize: 14,
      align: 'center',
      maxWidth: 400,
      allowWrap: true,
    },
    clergyBy: {
      x: 306,
      y: 300,
      fontSize: 14,
      align: 'center',
      maxWidth: 300,
    },
    clergyRector: {
      x: 450,
      y: 150,
      fontSize: 12,
      align: 'left',
      maxWidth: 150,
    },
    church: {
      x: 306,
      y: 250,
      fontSize: 14,
      align: 'center',
      maxWidth: 400,
    },
  },
};

/**
 * Marriage Certificate Field Positions
 * Based on 2026 marriage template
 */
const MARRIAGE_CERTIFICATE_MAP = {
  // Template metadata
  templateDimensions: {
    width: 612,
    height: 792,
  },
  
  // Font configuration
  fonts: {
    default: {
      family: 'TimesRoman',
      size: 14,
      color: { r: 0, g: 0, b: 0 },
    },
    name: {
      family: 'TimesRoman',
      size: 18,
      color: { r: 0, g: 0, b: 0 },
      bold: true,
    },
  },
  
  // Field positions
  fields: {
    groomName: {
      x: 306,
      y: 520,
      fontSize: 18,
      fontWeight: 'bold',
      align: 'center',
      maxWidth: 400,
    },
    brideName: {
      x: 306,
      y: 480,
      fontSize: 18,
      fontWeight: 'bold',
      align: 'center',
      maxWidth: 400,
    },
    marriageDate: {
      x: 306,
      y: 420,
      fontSize: 14,
      align: 'center',
      maxWidth: 200,
    },
    // Split date variants — match the OCA artwork's "ON ___, 20___"
    // layout. Operators drag to fine-tune; these are starter coords.
    marriageDateMD: {
      x: 280,
      y: 420,
      fontSize: 14,
      align: 'center',
      maxWidth: 100,
    },
    marriageDateYY: {
      x: 430,
      y: 420,
      fontSize: 14,
      align: 'center',
      maxWidth: 40,
    },
    marriagePlace: {
      x: 306,
      y: 390,
      fontSize: 14,
      align: 'center',
      maxWidth: 300,
    },
    groomParents: {
      x: 306,
      y: 350,
      fontSize: 12,
      align: 'center',
      maxWidth: 400,
    },
    brideParents: {
      x: 306,
      y: 325,
      fontSize: 12,
      align: 'center',
      maxWidth: 400,
    },
    witnesses: {
      x: 306,
      y: 280,
      fontSize: 14,
      align: 'center',
      maxWidth: 400,
      allowWrap: true,
    },
    clergy: {
      x: 306,
      y: 240,
      fontSize: 14,
      align: 'center',
      maxWidth: 300,
    },
    church: {
      x: 306,
      y: 200,
      fontSize: 14,
      align: 'center',
      maxWidth: 400,
    },
  },
};

/**
 * Convert canvas coordinates (top-left origin) to PDF coordinates (bottom-left origin)
 * This is for backward compatibility with existing saved positions
 */
function canvasToPdfCoordinates(canvasX, canvasY, canvasHeight, pdfHeight) {
  // Canvas Y is from top, PDF Y is from bottom
  const pdfY = pdfHeight - (canvasY / canvasHeight * pdfHeight);
  const pdfX = canvasX / canvasHeight * pdfHeight; // Maintain aspect ratio
  
  return { x: pdfX, y: pdfY };
}

/**
 * Get coordinate map for a certificate type
 */
function getCoordinateMap(certificateType) {
  switch (certificateType.toLowerCase()) {
    case 'baptism':
      return BAPTISM_CERTIFICATE_MAP;
    case 'marriage':
      return MARRIAGE_CERTIFICATE_MAP;
    default:
      throw new Error(`Unknown certificate type: ${certificateType}`);
  }
}

/**
 * Merge custom positions with default coordinate map
 * Custom positions override defaults
 */
function mergeCustomPositions(coordinateMap, customPositions) {
  if (!customPositions || Object.keys(customPositions).length === 0) {
    return coordinateMap;
  }
  
  const merged = JSON.parse(JSON.stringify(coordinateMap)); // Deep clone
  
  Object.keys(customPositions).forEach(fieldName => {
    if (merged.fields[fieldName] && customPositions[fieldName]) {
      // Merge custom x, y while preserving other field properties
      merged.fields[fieldName] = {
        ...merged.fields[fieldName],
        x: customPositions[fieldName].x,
        y: customPositions[fieldName].y,
      };
    }
  });
  
  return merged;
}

module.exports = {
  BAPTISM_CERTIFICATE_MAP,
  MARRIAGE_CERTIFICATE_MAP,
  getCoordinateMap,
  mergeCustomPositions,
  canvasToPdfCoordinates,
};
