# OM Specification Documentation Manager

## Overview

This component is a clone of the Gallery component, adapted for managing documentation files. It supports uploading and viewing `.docx`, `.xlsx`, `.md`, `.json`, `.txt`, `.pdf`, `.tsx`, `.ts`, `.html`, and `.js` files.

## Features

- Upload documentation files (docx, xlsx, md, json, txt, pdf, tsx, ts, html, js)
- View files in a carousel and grid layout
- Organized file storage with timestamps
- File type icons and color coding
- Download functionality
- File metadata display (size, upload date, timestamp)

## File Organization

**Important:** Files are stored in: `front-end/public/docs` (relative to project root)

**Full path on server:** `/var/www/orthodoxmetrics/prod/front-end/public/docs`

Files are organized with timestamps in the format: `YYYY-MM-DDTHH-MM-SS-sssZ`

**Note:** The `public/docs` directory must exist. Files in this directory are served statically at `/docs/` URL path.

## Backend API Requirements

The component expects the following backend API endpoints:

### GET `/api/docs/files`

Returns a list of all documentation files from `front-end/public/docs` directory.

**Backend Implementation Requirements:**
- Read files from: `/var/www/orthodoxmetrics/prod/front-end/public/docs` (production)
- Or: `front-end/public/docs` (development, relative to project root)
- Parse filenames to extract timestamps (format: `YYYY-MM-DDTHH-MM-SS-sssZ_filename.ext`)
- Get file metadata (size, modification date)
- Return file type based on extension (.docx, .xlsx, .md, .json, .txt, .pdf, .tsx, .ts, .html, .js)

**Response:**
```json
{
  "files": [
    {
      "name": "document.docx",
      "path": "2024-12-09T10-30-45-123Z_document.docx",
      "type": "docx",
      "size": 12345,
      "uploadedAt": "2024-12-09T10:30:45.123Z",
      "timestamp": "2024-12-09T10-30-45-123Z"
    }
  ]
}
```

### POST `/api/docs/upload`

Uploads a documentation file to `front-end/public/docs` directory.

**Request:**
- `file`: The file to upload (FormData, field name: `file`)
- `timestamp`: ISO timestamp string for file organization (FormData, field name: `timestamp`)

**Backend Implementation Requirements:**
- Save files to: `/var/www/orthodoxmetrics/prod/front-end/public/docs` (production)
- Or: `front-end/public/docs` (development, relative to project root)
- Validate file types: .docx, .xlsx, .md, .json, .txt, .pdf, .tsx, .ts, .html, .js
- Validate file size (max 50MB recommended)
- Generate filename: `{timestamp}_{originalFilename}`
- Ensure directory exists (create if needed)
- Return file metadata

**Response:**
```json
{
  "success": true,
  "message": "File uploaded successfully",
  "file": {
    "name": "document.docx",
    "path": "2024-12-09T10-30-45-123Z_document.docx",
    "type": "docx",
    "size": 12345,
    "uploadedAt": "2024-12-09T10:30:45.123Z",
    "timestamp": "2024-12-09T10-30-45-123Z"
  }
}
```

**Error Response:**
```json
{
  "success": false,
  "error": "Error message here",
  "message": "Upload failed: reason"
}
```

## File Storage Structure

**Directory Path:** `front-end/public/docs` (relative to project root)

**Full Server Path:** `/var/www/orthodoxmetrics/prod/front-end/public/docs`

**Important Notes:**
- Files in `public/docs` are served statically at `/docs/` URL path
- The directory must exist before uploads can work
- Files are accessible via: `http://yourdomain.com/docs/{filename}`

**Backend Implementation Steps:**

1. **Create Directory (if it doesn't exist):**
   ```bash
   mkdir -p /var/www/orthodoxmetrics/prod/front-end/public/docs
   chmod 755 /var/www/orthodoxmetrics/prod/front-end/public/docs
   ```

2. **Accept file uploads** via POST `/api/docs/upload`
3. **Validate file type** (.docx, .xlsx, .md, .json)
4. **Validate file size** (max 50MB recommended)
5. **Generate timestamp** in format: `YYYY-MM-DDTHH-MM-SS-sssZ`
6. **Create filename**: `{timestamp}_{originalFilename}`
7. **Save file** to `front-end/public/docs/` directory
8. **Return file metadata** including the timestamp

**Example Backend Code (Node.js/Express):**
```javascript
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const DOCS_DIR = process.env.NODE_ENV === 'production' 
  ? '/var/www/orthodoxmetrics/prod/front-end/public/docs'
  : path.join(process.cwd(), 'public', 'docs');

// Ensure directory exists
fs.mkdirSync(DOCS_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, DOCS_DIR);
  },
  filename: (req, file, cb) => {
    const timestamp = req.body.timestamp || new Date().toISOString().replace(/[:.]/g, '-');
    const ext = path.extname(file.originalname);
    const name = path.basename(file.originalname, ext);
    cb(null, `${timestamp}_${name}${ext}`);
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['.docx', '.xlsx', '.md', '.json', '.txt', '.pdf', '.tsx', '.ts', '.html', '.js'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedTypes.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Allowed: .docx, .xlsx, .md, .json, .txt, .pdf, .tsx, .ts, .html, .js'));
    }
  }
});

// Route handler
router.post('/api/docs/upload', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, error: 'No file uploaded' });
  }
  
  const stats = fs.statSync(req.file.path);
  res.json({
    success: true,
    message: 'File uploaded successfully',
    file: {
      name: req.file.originalname,
      path: req.file.filename,
      type: path.extname(req.file.filename).substring(1),
      size: stats.size,
      uploadedAt: stats.birthtime.toISOString(),
      timestamp: req.body.timestamp
    }
  });
});

// List files route
router.get('/api/docs/files', (req, res) => {
  try {
    const files = fs.readdirSync(DOCS_DIR)
      .filter(file => {
        const ext = path.extname(file).toLowerCase();
        return ['.docx', '.xlsx', '.md', '.json', '.txt', '.pdf', '.tsx', '.ts', '.html', '.js'].includes(ext);
      })
      .map(file => {
        const filePath = path.join(DOCS_DIR, file);
        const stats = fs.statSync(filePath);
        const ext = path.extname(file).toLowerCase().substring(1);
        
        // Extract timestamp from filename (format: YYYY-MM-DDTHH-MM-SS-sssZ_filename.ext)
        const timestampMatch = file.match(/^(\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-\d{3}Z)_(.+)$/);
        const timestamp = timestampMatch ? timestampMatch[1] : stats.birthtime.toISOString().replace(/[:.]/g, '-');
        const originalName = timestampMatch ? timestampMatch[2] : file;
        
        return {
          name: originalName,
          path: file,
          type: ext,
          size: stats.size,
          uploadedAt: stats.birthtime.toISOString(),
          timestamp: timestamp
        };
      });
    
    res.json({ files });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});
```

## Usage

```tsx
import OMSpecDocumentation from '@/features/devel-tools/system-documentation/om-spec';

<OMSpecDocumentation />
```

## Image Asset

The component displays the OM Archives image from:
`/images/random/om-archives.png`

This image appears below the page header.

