/**
 * OCR Job Routes
 * Church-scoped and platform-scoped OCR job endpoints.
 * Extracted from index.ts.
 *
 * Usage:
 *   const createRouters = require('./routes/ocr/jobs');
 *   const { churchJobsRouter, platformJobsRouter } = createRouters(upload);
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const express = require('express');
import { promisePool, resolveChurchDb, mapFieldsToDbColumns, buildInsertQuery } from './helpers';

function createRouters(upload: any) {

  // =========================================================================
  // CHURCH-SCOPED ROUTER  (mounted at /api/church/:churchId/ocr)
  // =========================================================================
  const churchJobsRouter = express.Router({ mergeParams: true });

  // -----------------------------------------------------------------------
  // 1. GET /jobs — List OCR jobs for a church
  // -----------------------------------------------------------------------
  churchJobsRouter.get('/jobs', async (req: any, res: any) => {
    try {
      const churchId = parseInt(req.params.churchId);
      const limit = Math.min(parseInt(req.query.limit as string) || 100, 500);
      console.log(`[OCR Jobs] GET /api/church/${churchId}/ocr/jobs - ROUTE HIT`);

      // Query PLATFORM DB — ocr_jobs lives in orthodoxmetrics_db (the upload + worker table)
      const [jobRows] = await promisePool.query(`
        SELECT id, church_id, uploaded_by, filename, status, review_status, review_notes,
               record_type, language,
               confidence_score, ocr_text, ocr_result, error_regions,
               agent_status, ready_to_seed, seeded_at,
               created_at, source_pipeline, agent_extract_json
        FROM ocr_jobs
        WHERE church_id = ?
        ORDER BY created_at DESC
        LIMIT ?
      `, [churchId, limit]);
      const jobs = (jobRows as any[]);
      console.log(`[OCR Jobs GET] Found ${jobs.length} jobs in platform DB for church ${churchId}`);

      // DB is source of truth - no bundle merge
      // Optionally check for bundle existence as metadata only (non-blocking)
      let bundleCheckMap = new Map<number, boolean>();
      try {
        let jobBundleModule: any = null;
        try {
          jobBundleModule = require('./utils/jobBundle');
        } catch (e) {
          try {
            jobBundleModule = require('../../utils/jobBundle');
          } catch (e2) {
            jobBundleModule = null;
          }
        }

        if (jobBundleModule && jobBundleModule.tryReadManifest) {
          const { tryReadManifest } = jobBundleModule;
          const bundleChecks = await Promise.all(
            jobs.map(async (job: any) => {
              try {
                const manifest = await tryReadManifest(churchId, String(job.id));
                return { id: job.id, hasBundle: manifest !== null };
              } catch {
                return { id: job.id, hasBundle: false };
              }
            })
          );
          bundleChecks.forEach((b: any) => bundleCheckMap.set(b.id, b.hasBundle));
        }
      } catch (bundleError: any) {
        // Non-blocking - bundle check failure doesn't affect response
        console.log(`[OCR Jobs GET] Bundle check skipped (non-blocking):`, bundleError.message);
      }

      // Map to API response format - DB is source of truth
      const mappedJobs = jobs.map((job: any) => {
        // DB status is canonical
        const jobStatus = job.status || 'pending';
        const isCompleted = jobStatus === 'completed' || jobStatus === 'complete';
        const hasOcrText = !!job.ocr_text;

        // Generate preview from ocr_text in DB
        let ocrTextPreview = null;
        if (job.ocr_text) {
          const lines = job.ocr_text.split('\n').slice(0, 8);
          ocrTextPreview = lines.join('\n').substring(0, 400);
          if (ocrTextPreview.length < job.ocr_text.length) {
            ocrTextPreview += '...';
          }
        } else if (isCompleted) {
          ocrTextPreview = '[OCR text available - click to view]';
        }

        // Parse agent_extract_json to count records and confirmed ones
        let recordsCount = null;
        let confirmedCount = null;
        if (job.agent_extract_json) {
          try {
            const parsed = typeof job.agent_extract_json === 'string'
              ? JSON.parse(job.agent_extract_json)
              : job.agent_extract_json;
            if (parsed && typeof parsed === 'object') {
              if (Array.isArray(parsed.records)) {
                recordsCount = parsed.records.length;
              } else if (parsed.fields && typeof parsed.fields === 'object') {
                recordsCount = 1;
              }
              if (Array.isArray(parsed.confirmed_indexes)) {
                confirmedCount = parsed.confirmed_indexes.length;
              }
            }
          } catch (e: any) {
            console.error(`[OCR Jobs GET] Error parsing agent_extract_json for job ${job.id}:`, e.message);
          }
        }

        return {
          id: job.id?.toString() || '',
          church_id: job.church_id?.toString() || churchId.toString(),
          original_filename: job.original_filename || job.filename || '',
          filename: job.filename || '',
          status: jobStatus,
          review_status: job.review_status || 'uploaded',
          review_notes: job.review_notes || null,
          confidence_score: job.confidence_score || 0,
          error_message: job.error || null,
          created_at: job.created_at || new Date().toISOString(),
          updated_at: job.updated_at || new Date().toISOString(),
          record_type: job.record_type || null,
          language: job.language || 'en',
          ocr_text_preview: ocrTextPreview,
          has_ocr_text: hasOcrText,
          has_bundle: bundleCheckMap.get(job.id) || false,
          agent_status: job.agent_status || null,
          ready_to_seed: !!job.ready_to_seed,
          seeded_at: job.seeded_at || null,
          records_count: recordsCount,
          confirmed_count: confirmedCount,
        };
      });

      res.json({ jobs: mappedJobs });
    } catch (error: any) {
      console.error('[OCR Jobs] Error fetching church OCR jobs:', error);
      res.status(500).json({ error: 'Failed to fetch OCR jobs', message: error.message, jobs: [] });
    }
  });

  // -----------------------------------------------------------------------
  // 2. POST /enhanced/process — Simulation OCR endpoint
  // -----------------------------------------------------------------------
  churchJobsRouter.post('/enhanced/process', upload.array('files', 10), async (req: any, res: any) => {
    try {
      const churchId = parseInt(req.params.churchId);
      const ocrMode = req.query.ocr_mode || req.body.ocr_mode;

      if (churchId !== 46 || ocrMode !== 'simulate') {
        return res.status(400).json({ error: 'Simulation mode only available for church 46', jobs: [] });
      }

      const files = req.files as any[];
      if (!files || files.length === 0) {
        return res.status(400).json({ error: 'No files uploaded', jobs: [] });
      }

      // Import simulation manifest
      const { CHURCH_46_DEMO_FILES } = require('../../ocr/sim/manifests/church_46_demo_manifest');
      const recordType = (req.body.recordType || 'baptism') as 'baptism' | 'marriage' | 'funeral';

      // Validate church exists
      const [churchRows] = await promisePool.query('SELECT database_name FROM churches WHERE id = ?', [churchId]);
      if (!churchRows.length) {
        return res.status(404).json({ error: 'Church not found', jobs: [] });
      }

      const createdJobs: any[] = [];
      const ocrPaths = require('../../utils/ocrPaths');
      const uploadDir = ocrPaths.getOcrUploadDir(churchId);

      for (const file of files) {
        try {
          const originalName = file.originalname;
          const simData = CHURCH_46_DEMO_FILES[originalName];

          if (!simData) {
            console.log(`[Simulation] No simulation data for file: ${originalName}`);
            continue;
          }

          // Generate unique filename
          const timestamp = Date.now();
          const ext = path.extname(originalName);
          const baseName = path.basename(originalName, ext);
          const uniqueFilename = `${baseName}_${timestamp}${ext}`;
          const finalPath = path.join(uploadDir, uniqueFilename);
          const dbPath = ocrPaths.getOcrDbPath(churchId, uniqueFilename);

          // Move file
          fs.renameSync(file.path, finalPath);
          const stats = fs.statSync(finalPath);

          // Insert job into PLATFORM DB (global queue)
          const [result] = await promisePool.query(`
            INSERT INTO ocr_jobs (
              church_id, filename,
              status, record_type, language, confidence_score, ocr_text, ocr_result,
              created_at, source_pipeline
            ) VALUES (?, ?, 'complete', ?, ?, ?, ?, ?, NOW(), 'studio')
          `, [
            churchId,
            uniqueFilename,
            simData.record_type,
            'en',
            simData.confidence,
            simData.ocrText || '',
            JSON.stringify({
              record_type: simData.record_type,
              church: simData.church,
              city: simData.city,
              state: simData.state,
              records: simData.records,
              confidence: simData.confidence,
              source: simData.source
            })
          ]);

          const jobId = (result as any).insertId;
          const jobData = {
            id: jobId,
            filename: uniqueFilename,
            original_filename: originalName,
            status: 'completed',
            record_type: simData.record_type,
            source: 'simulation',
            data: {
              record_type: simData.record_type,
              church: simData.church,
              city: simData.city,
              state: simData.state,
              records: simData.records,
              confidence: simData.confidence,
              source: simData.source
            }
          };
          createdJobs.push(jobData);

          console.log(`[Simulation] Created job ${jobId} for ${originalName} with ${simData.records.length} records`);
        } catch (error: any) {
          console.error(`[Simulation] Error processing file ${file.originalname}:`, error);
        }
      }

      return res.json({
        success: true,
        data: {
          jobs: createdJobs,
          source: 'simulation'
        },
        jobs: createdJobs,
        message: `Processed ${createdJobs.length} file(s) in simulation mode`
      });
    } catch (error: any) {
      console.error('[Simulation OCR] Error:', error);
      return res.status(500).json({ error: error.message || 'Simulation processing failed', jobs: [] });
    }
  });

  // -----------------------------------------------------------------------
  // 3. GET /jobs/:jobId — Job detail (heavy, includes ocr_text)
  // -----------------------------------------------------------------------
  churchJobsRouter.get('/jobs/:jobId', async (req: any, res: any) => {
    try {
      const churchId = parseInt(req.params.churchId);
      const jobId = parseInt(req.params.jobId);
      console.log(`[OCR Jobs] GET /api/church/${churchId}/ocr/jobs/${jobId}`);

      // Query PLATFORM DB — ocr_jobs lives in orthodoxmetrics_db
      const [rows] = await promisePool.query(
        `SELECT id, church_id, filename, status, review_status, record_type, language,
                confidence_score, ocr_text, ocr_result, error_regions,
                agent_status, agent_extract_json, ready_to_seed, seeded_at, variation_id,
                created_at, layout_classification_json
         FROM ocr_jobs WHERE id = ? AND church_id = ?`,
        [jobId, churchId]
      );

      if (!(rows as any[]).length) {
        return res.status(404).json({ error: 'Job not found' });
      }

      const job = (rows as any[])[0];

      // DB is source of truth
      const ocrText = job.ocr_text || null;
      let ocrResult = null;

      if (job.ocr_result) {
        try {
          ocrResult = typeof job.ocr_result === 'string'
            ? JSON.parse(job.ocr_result)
            : job.ocr_result;
        } catch (e) {
          ocrResult = job.ocr_result;
        }
      }

      // Optional: Check if bundle exists (metadata only, non-blocking)
      let hasBundle = false;
      try {
        let jobBundleModule: any = null;
        try {
          jobBundleModule = require('../../utils/jobBundle');
        } catch (e) {
          // Bundle module not available
        }
        if (jobBundleModule && jobBundleModule.tryReadManifest) {
          const manifest = await jobBundleModule.tryReadManifest(churchId, String(jobId));
          hasBundle = manifest !== null;
        }
      } catch {
        // Bundle check failure doesn't affect response
      }

      // Load saved mapping if exists (ocr_mappings lives in tenant DB)
      let mapping = null;
      try {
        const { getTenantPool: getTenantPoolForMapping } = require('../../config/db');
        const mappingPool = getTenantPoolForMapping(churchId);
        const [mappings] = await mappingPool.query('SELECT * FROM ocr_mappings WHERE ocr_job_id = ? ORDER BY updated_at DESC LIMIT 1', [jobId]);
        if (mappings.length > 0) {
          mapping = {
            id: mappings[0].id,
            record_type: mappings[0].record_type,
            mapping_json: typeof mappings[0].mapping_json === 'string' ? JSON.parse(mappings[0].mapping_json) : mappings[0].mapping_json,
            created_by: mappings[0].created_by,
            created_at: mappings[0].created_at,
            updated_at: mappings[0].updated_at
          };
        }
      } catch (e) {
        // Table may not exist
      }

      // ── Feeder artifact lookup (source of truth override) ──────────────
      let pages: any[] = [];
      let feederSource = false;
      let feederRawText: string | null = null;
      try {
        const { getTenantPool } = require('../../config/db');
        const tenantPool = getTenantPool(churchId);

        // Get feeder pages for this job
        const [pageRows] = await tenantPool.query(
          `SELECT id, page_index, input_path, status, ocr_confidence
           FROM ocr_feeder_pages WHERE job_id = ? ORDER BY page_index ASC`,
          [jobId]
        );

        if ((pageRows as any[]).length > 0) {
          const textParts: string[] = [];

          for (const page of (pageRows as any[])) {
            // Get artifacts for this page (most recent first per type)
            const [artifacts] = await tenantPool.query(
              `SELECT id, type, storage_path, json_blob, meta_json
               FROM ocr_feeder_artifacts WHERE page_id = ? ORDER BY created_at DESC`,
              [page.id]
            );

            let rawText: string | null = null;
            let rawTextArtifactId: number | null = null;
            let structuredText: string | null = null;
            let structuredArtifactId: number | null = null;
            let recordCandidates: any = null;
            let tableExtractionJson: any = null;
            let scoringV2: any = null;
            let meta: any = null;
            let sourceImagePath: string | null = null;

            for (const art of (artifacts as any[])) {
              if (art.type === 'raw_text' && !rawText) {
                rawTextArtifactId = art.id;
                // Prefer file on disk, fall back to json_blob
                if (art.storage_path && fs.existsSync(art.storage_path)) {
                  rawText = fs.readFileSync(art.storage_path, 'utf8');
                } else if (art.json_blob) {
                  rawText = typeof art.json_blob === 'string' ? art.json_blob : JSON.stringify(art.json_blob);
                }
                if (art.meta_json) {
                  try { meta = typeof art.meta_json === 'string' ? JSON.parse(art.meta_json) : art.meta_json; } catch (_) {}
                }
              }
              if (art.type === 'table_extraction' && !structuredText) {
                structuredArtifactId = art.id;
                if (art.storage_path && fs.existsSync(art.storage_path)) {
                  structuredText = fs.readFileSync(art.storage_path, 'utf8');
                }
                // Also load the companion JSON file for column mapping data
                if (art.storage_path) {
                  const jsonCompanion = art.storage_path.replace(/_structured.*\.txt$/, 'table_extraction.json')
                    .replace(/_structured_rerun_\d+\.txt$/, 'table_extraction_rerun_' + path.basename(art.storage_path).match(/rerun_(\d+)/)?.[1] + '.json');
                  // Try directory-based lookup: same dir as storage_path
                  const artDir = path.dirname(art.storage_path);
                  const jsonFiles = fs.existsSync(artDir) ? fs.readdirSync(artDir).filter((f: string) => f.includes('table_extraction') && f.endsWith('.json')) : [];
                  if (jsonFiles.length > 0) {
                    try {
                      tableExtractionJson = JSON.parse(fs.readFileSync(path.join(artDir, jsonFiles[jsonFiles.length - 1]), 'utf8'));
                    } catch (_) {}
                  }
                }
              }
              if (art.type === 'record_candidates' && !recordCandidates) {
                try {
                  recordCandidates = art.json_blob
                    ? (typeof art.json_blob === 'string' ? JSON.parse(art.json_blob) : art.json_blob)
                    : null;
                } catch (_) {}
              }
              if (art.type === 'scoring_v2' && !scoringV2) {
                try {
                  if (art.storage_path && fs.existsSync(art.storage_path)) {
                    scoringV2 = JSON.parse(fs.readFileSync(art.storage_path, 'utf8'));
                  } else if (art.json_blob) {
                    scoringV2 = typeof art.json_blob === 'string' ? JSON.parse(art.json_blob) : art.json_blob;
                  }
                } catch (_) {}
              }
              if (art.type === 'source_image' && !sourceImagePath) {
                sourceImagePath = art.storage_path || null;
              }
            }

            // Prefer structured table text over raw flat text
            const bestText = structuredText || rawText || null;
            const bestArtifactId = structuredText ? structuredArtifactId : rawTextArtifactId;

            // Fall back to ocr_jobs.ocr_text for raw text
            if (!bestText && ocrText) {
              rawText = ocrText;
            }

            if (bestText || rawText) textParts.push(bestText || rawText!);

            pages.push({
              pageId: page.id,
              pageIndex: page.page_index,
              sourceImagePath,
              rawText: bestText || rawText || null,
              rawTextArtifactId: bestArtifactId || rawTextArtifactId,
              recordCandidates,
              tableExtractionJson,
              scoringV2,
              meta,
              ocrConfidence: page.ocr_confidence,
              status: page.status,
            });
          }

          if (textParts.length > 0) {
            feederRawText = textParts.join('\n');
            feederSource = true;
          }
        }
      } catch (feederErr: any) {
        // Non-blocking: feeder lookup failure doesn't break the response
        console.warn(`[OCR Job Detail] Feeder lookup failed for job ${jobId}: ${feederErr.message}`);
      }

      // Override ocr_text with feeder data when available
      const finalOcrText = feederRawText || ocrText;

      let parsedLayout = null;
      if (job.layout_classification_json) {
        try {
          parsedLayout = typeof job.layout_classification_json === 'string'
            ? JSON.parse(job.layout_classification_json)
            : job.layout_classification_json;
        } catch (e) {
          console.warn('[Job Detail API] Failed to parse layout_classification_json:', e);
        }
      }

      res.json({
        id: job.id.toString(),
        original_filename: job.filename,
        filename: job.filename,
        status: job.status,
        record_type: job.record_type || null,
        language: job.language || 'en',
        confidence_score: job.confidence_score || 0,
        created_at: job.created_at,
        ocr_text: finalOcrText,
        ocr_result: ocrResult,
        error_regions: job.error_regions || null,
        mapping: mapping,
        has_ocr_text: !!finalOcrText,
        has_bundle: hasBundle,
        pages: pages.length > 0 ? pages : undefined,
        feeder_source: feederSource || undefined,
        layout_classification_json: parsedLayout,
      });
    } catch (error: any) {
      console.error('[OCR Job Detail] Error:', error);
      res.status(500).json({ error: 'Failed to fetch job detail', message: error.message });
    }
  });

  // -----------------------------------------------------------------------
  // 4. GET /jobs/:jobId/image — Serve job image file
  // -----------------------------------------------------------------------
  churchJobsRouter.get('/jobs/:jobId/image', async (req: any, res: any) => {
    try {
      const churchId = parseInt(req.params.churchId);
      const jobId = parseInt(req.params.jobId);
      const wantOriginal = req.query.original === 'true';
      console.log(`[OCR Jobs] GET /api/church/${churchId}/ocr/jobs/${jobId}/image${wantOriginal ? ' (original)' : ''}`);

      // Prefer preprocessed version unless ?original=true
      if (!wantOriginal) {
        const preprocPath = path.join(__dirname, '..', '..', '..', 'storage', 'feeder', `job_${jobId}`, 'page_0', 'preprocessed.jpg');
        if (fs.existsSync(preprocPath)) {
          res.setHeader('Content-Type', 'image/jpeg');
          res.setHeader('Cache-Control', 'public, max-age=3600');
          return fs.createReadStream(preprocPath).pipe(res);
        }
      }

      // Query PLATFORM DB — ocr_jobs lives in orthodoxmetrics_db
      const [rows] = await promisePool.query('SELECT filename FROM ocr_jobs WHERE id = ? AND church_id = ?', [jobId, churchId]);

      if (!rows.length || !rows[0].filename) {
        return res.status(404).json({ error: 'Job or image not found' });
      }

      const jobFilename = rows[0].filename;

      let foundPath: string | undefined;
      // Absolute path (e.g. batch_import jobs) — use directly
      if (jobFilename.startsWith('/') && !jobFilename.startsWith('/uploads/') && !jobFilename.startsWith('/server/uploads/')) {
        if (fs.existsSync(jobFilename)) foundPath = jobFilename;
      }
      if (!foundPath && (jobFilename.startsWith('/uploads/') || jobFilename.startsWith('/server/uploads/'))) {
        const abs = path.join('/var/www/orthodoxmetrics/prod', jobFilename);
        if (fs.existsSync(abs)) foundPath = abs;
      }
      if (!foundPath) {
        const baseDirs = [
          path.join('/var/www/orthodoxmetrics/prod/uploads', `om_church_${churchId}`),
          path.join('/var/www/orthodoxmetrics/prod/server/uploads', `om_church_${churchId}`),
        ];
        const subdirs = ['uploaded', 'processed'];
        const candidatePaths: string[] = [];
        for (const base of baseDirs) {
          for (const sub of subdirs) {
            candidatePaths.push(path.join(base, sub, jobFilename));
          }
        }
        candidatePaths.push(
          path.join('/var/www/orthodoxmetrics/prod/server/uploads', 'ocr', `church_${churchId}`, jobFilename)
        );
        foundPath = candidatePaths.find(p => fs.existsSync(p));
      }

      if (!foundPath) {
        console.warn(`[OCR Image] File not found. filename: ${jobFilename}, churchId: ${churchId}`);
        return res.status(404).json({ error: 'Image file not found on disk' });
      }

      // Detect mime type from extension
      const ext = path.extname(foundPath).toLowerCase();
      const mimeMap: Record<string, string> = {
        '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png',
        '.gif': 'image/gif', '.webp': 'image/webp', '.tiff': 'image/tiff', '.bmp': 'image/bmp'
      };
      const mimeType = mimeMap[ext] || 'image/jpeg';

      res.setHeader('Content-Type', mimeType);
      res.setHeader('Cache-Control', 'public, max-age=3600');
      fs.createReadStream(foundPath).pipe(res);
    } catch (error: any) {
      console.error('[OCR Image] Error:', error);
      res.status(500).json({ error: 'Failed to serve image' });
    }
  });

  // -----------------------------------------------------------------------
  // 4b. GET /jobs/:jobId/record-crop/:recordIndex — Per-record review image
  //     ?mode=review (default) — header rows + this record's row band
  //     ?mode=row — legacy data-row-only crop (record_N.png)
  // -----------------------------------------------------------------------
  function unionFractionalBboxesLocal(bboxes: number[][]): number[] | null {
    if (!bboxes.length) return null;
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const b of bboxes) {
      if (!b || b.length !== 4) continue;
      x0 = Math.min(x0, b[0]); y0 = Math.min(y0, b[1]);
      x1 = Math.max(x1, b[2]); y1 = Math.max(y1, b[3]);
    }
    if (!Number.isFinite(x0)) return null;
    const pad = 0.004;
    return [
      Math.max(0, x0 - pad),
      Math.max(0, y0 - pad),
      Math.min(1, x1 + pad),
      Math.min(1, y1 + pad),
    ];
  }

  function computeReviewCropBbox(tableJson: any, candidates: any[], recordIndex: number): number[] | null {
    const candidate = candidates?.[recordIndex];
    if (!candidate || !tableJson?.tables?.length) return null;
    const rowStart = candidate.sourceRowIndex;
    const rowEnd = candidate.sourceRowEnd ?? rowStart;
    if (typeof rowStart !== 'number' || rowStart < 0) return null;

    const parts: number[][] = [];
    for (const table of tableJson.tables) {
      for (const row of table.rows || []) {
        const isHeader = row.type === 'header';
        const inRecord = !isHeader && row.row_index >= rowStart && row.row_index <= rowEnd;
        if (!isHeader && !inRecord) continue;
        for (const cell of row.cells || []) {
          if (cell.bbox?.length === 4) parts.push(cell.bbox);
        }
      }
    }
    return unionFractionalBboxesLocal(parts);
  }

  churchJobsRouter.get('/jobs/:jobId/record-crop/:recordIndex', async (req: any, res: any) => {
    try {
      const jobId = parseInt(req.params.jobId);
      const recordIndex = parseInt(req.params.recordIndex);
      const pageIndex = parseInt(req.query.page as string) || 0;
      const mode = (req.query.mode as string) || 'review';

      const pageDir = path.resolve(__dirname, '../../../storage/feeder', `job_${jobId}`, `page_${pageIndex}`);
      const legacyCropPath = path.join(pageDir, `record_${recordIndex}.png`);
      const reviewCropPath = path.join(pageDir, `record_${recordIndex}_review.jpg`);

      if (mode === 'row' && fs.existsSync(legacyCropPath)) {
        res.setHeader('Content-Type', 'image/png');
        res.setHeader('Cache-Control', 'public, max-age=3600');
        return fs.createReadStream(legacyCropPath).pipe(res);
      }

      if (mode !== 'row' && fs.existsSync(reviewCropPath)) {
        res.setHeader('Content-Type', 'image/jpeg');
        res.setHeader('Cache-Control', 'public, max-age=3600');
        return fs.createReadStream(reviewCropPath).pipe(res);
      }

      const preprocPath = path.join(pageDir, 'preprocessed.jpg');
      const tablePath = path.join(pageDir, 'table_extraction.json');
      const candPath = path.join(pageDir, 'record_candidates.json');

      if (mode !== 'row' && fs.existsSync(preprocPath) && fs.existsSync(tablePath) && fs.existsSync(candPath)) {
        const tableJson = JSON.parse(fs.readFileSync(tablePath, 'utf8'));
        const candData = JSON.parse(fs.readFileSync(candPath, 'utf8'));
        const candidates = candData.candidates || candData || [];
        const cropBbox = computeReviewCropBbox(tableJson, candidates, recordIndex);

        if (cropBbox) {
          const sharp = require('sharp');
          const meta = await sharp(preprocPath).metadata();
          const imgW = meta.width || 1;
          const imgH = meta.height || 1;
          const [fx0, fy0, fx1, fy1] = cropBbox;
          const left = Math.max(0, Math.floor(fx0 * imgW));
          const top = Math.max(0, Math.floor(fy0 * imgH));
          const width = Math.max(1, Math.min(imgW - left, Math.ceil((fx1 - fx0) * imgW)));
          const height = Math.max(1, Math.min(imgH - top, Math.ceil((fy1 - fy0) * imgH)));

          const buffer = await sharp(preprocPath)
            .extract({ left, top, width, height })
            .jpeg({ quality: 90 })
            .toBuffer();

          try {
            fs.writeFileSync(reviewCropPath, buffer);
          } catch { /* cache optional */ }

          res.setHeader('Content-Type', 'image/jpeg');
          res.setHeader('Cache-Control', 'public, max-age=3600');
          res.setHeader('X-Crop-Bbox', cropBbox.map((n: number) => n.toFixed(5)).join(','));
          return res.send(buffer);
        }
      }

      if (fs.existsSync(legacyCropPath)) {
        res.setHeader('Content-Type', 'image/png');
        res.setHeader('Cache-Control', 'public, max-age=3600');
        return fs.createReadStream(legacyCropPath).pipe(res);
      }

      return res.status(404).json({ error: 'Record crop not found' });
    } catch (error: any) {
      console.error('[OCR RecordCrop] Error:', error);
      res.status(500).json({ error: 'Failed to serve record crop' });
    }
  });

  // -----------------------------------------------------------------------
  // 4c. GET /jobs/:jobId/debug — Debug endpoint for pipeline artifacts
  // -----------------------------------------------------------------------
  churchJobsRouter.get('/jobs/:jobId/debug', async (req: any, res: any) => {
    try {
      const churchId = parseInt(req.params.churchId);
      const jobId = parseInt(req.params.jobId);
      const pageIndex = parseInt(req.query.page as string) || 0;

      // Require super_admin or admin role
      if (!req.session?.user || !['super_admin', 'admin'].includes(req.session.user.role)) {
        return res.status(403).json({ error: 'Insufficient permissions' });
      }

      const pageDir = path.resolve(__dirname, '../../storage/feeder', `job_${jobId}`, `page_${pageIndex}`);
      if (!fs.existsSync(pageDir)) {
        return res.status(404).json({ error: 'Page directory not found' });
      }

      const debug: any = { jobId, pageIndex, pageDir, artifacts: {} };

      // Load each artifact if it exists
      const artifactFiles: Record<string, string> = {
        vision_result: 'vision_result.json',
        table_extraction: 'table_extraction.json',
        record_candidates: 'record_candidates.json',
        header_metrics: 'header_metrics.json',
        record_crops_manifest: 'record_crops_manifest.json',
        metrics: 'metrics.json',
        deskew_geometry: 'deskew_geometry.json',
        border_geometry: 'border_geometry.json',
        roi_geometry: 'roi_geometry.json',
        scoring_v2: 'scoring_v2.json',
        tokens_normalized: 'tokens_normalized.json',
        table_provenance: 'table_provenance.json',
      };

      for (const [key, filename] of Object.entries(artifactFiles)) {
        const filePath = path.join(pageDir, filename);
        if (fs.existsSync(filePath)) {
          try {
            debug.artifacts[key] = JSON.parse(fs.readFileSync(filePath, 'utf8'));
          } catch {
            debug.artifacts[key] = { error: 'Failed to parse' };
          }
        }
      }

      // Add canonical dims info from vision result
      if (debug.artifacts.vision_result?.pages?.[0]) {
        const vp = debug.artifacts.vision_result.pages[0];
        debug.canonicalDims = { width: vp.width, height: vp.height };
      }

      // List per-record crop files
      const recordCrops: string[] = [];
      try {
        const files = fs.readdirSync(pageDir);
        for (const f of files) {
          if (f.match(/^record_\d+\.(png|ocr\.json|extract\.json)$/)) {
            recordCrops.push(f);
          }
        }
      } catch {}
      debug.recordCropFiles = recordCrops;

      res.json(debug);
    } catch (error: any) {
      console.error('[OCR Debug] Error:', error);
      res.status(500).json({ error: 'Failed to load debug info' });
    }
  });

  // -----------------------------------------------------------------------
  // 4d. POST /jobs/:jobId/replay — Re-run extraction from stored artifacts
  // -----------------------------------------------------------------------
  churchJobsRouter.post('/jobs/:jobId/replay', async (req: any, res: any) => {
    try {
      const churchId = parseInt(req.params.churchId);
      const jobId = parseInt(req.params.jobId);
      const pageIndex = parseInt(req.query.page as string) || 0;

      // Require super_admin
      if (!req.session?.user || req.session.user.role !== 'super_admin') {
        return res.status(403).json({ error: 'super_admin required' });
      }

      const pageDir = path.resolve(__dirname, '../../storage/feeder', `job_${jobId}`, `page_${pageIndex}`);
      const visionPath = path.join(pageDir, 'vision_result.json');

      if (!fs.existsSync(visionPath)) {
        return res.status(404).json({ error: 'No vision_result.json found — cannot replay without Vision data' });
      }

      // Re-read vision result and apply canonical dims override
      const visionResultJson = JSON.parse(fs.readFileSync(visionPath, 'utf8'));

      // Find preprocessed image to get canonical dims
      const preprocPath = path.join(pageDir, '..', 'preprocessed.jpg');
      const altPreprocPath = path.join(pageDir, 'preprocessed.jpg');
      let imagePath = fs.existsSync(preprocPath) ? preprocPath : (fs.existsSync(altPreprocPath) ? altPreprocPath : null);

      // Try to find preprocessed image from page DB record
      if (!imagePath) {
        const { resolveChurchDb: rcd } = require('./helpers');
        const pool = rcd(churchId);
        const [pages] = await pool.execute(
          `SELECT preproc_path, input_path FROM ocr_feeder_pages WHERE job_id = ? AND page_index = ? LIMIT 1`,
          [jobId, pageIndex]
        );
        if ((pages as any[]).length > 0) {
          const pp = (pages as any[])[0];
          imagePath = pp.preproc_path || pp.input_path;
        }
      }

      if (imagePath && fs.existsSync(imagePath)) {
        const { getCanonicalDims, overrideVisionDims } = require('../../ocr/preprocessing/canonicalDims');
        const canonical = await getCanonicalDims(imagePath);
        const overridden = overrideVisionDims(visionResultJson, canonical);

        // Save corrected vision result back to disk
        if (overridden) {
          fs.writeFileSync(visionPath, JSON.stringify(visionResultJson, null, 2));
          console.log(`[OCR Replay] Job ${jobId} page ${pageIndex}: Corrected vision dims to ${canonical.width}x${canonical.height}`);
        }
      }

      // Re-run template extraction
      const { selectTemplate, resolveTemplate, extractWithTemplate } = require('../../ocr/preprocessing/templateSpec');
      const { extractGenericTable, autoDetectHeaderY, extractWordTokens, clusterIntoRows } = require('../../ocr/layouts/generic_table');
      const { extractRecordCandidates } = require('../../ocr/columnMapper');

      // Determine record type from job
      const { getAppPool } = require('../../config/db');
      const appPool = getAppPool();
      const [jobRows] = await appPool.execute(
        `SELECT record_type, extractor_id FROM ocr_jobs WHERE id = ?`, [jobId]
      );
      const recordType = (jobRows as any[])[0]?.record_type || 'baptism';
      const extractorId = (jobRows as any[])[0]?.extractor_id;

      let extractorRow = null;
      if (extractorId) {
        const [extRows] = await appPool.execute(`SELECT * FROM ocr_extractors WHERE id = ?`, [extractorId]);
        if ((extRows as any[]).length > 0) extractorRow = (extRows as any[])[0];
      }

      // Template extraction
      const templateMatchResult = selectTemplate(recordType, extractorRow);
      const resolvedTemplate = resolveTemplate(templateMatchResult, extractorRow, recordType);

      let tableExtractionResult;
      if (resolvedTemplate) {
        // Adaptive header detection
        try {
          const allTokens = extractWordTokens(visionResultJson, 0);
          const textRows = clusterIntoRows(allTokens);
          const detectedHeaderY = autoDetectHeaderY(textRows);
          if (detectedHeaderY != null && detectedHeaderY > resolvedTemplate.headerCutNorm) {
            resolvedTemplate.headerCutNorm = detectedHeaderY;
          }
        } catch {}

        tableExtractionResult = extractWithTemplate(visionResultJson, resolvedTemplate, { pageIndex: 0 });
      } else {
        tableExtractionResult = extractGenericTable(visionResultJson, { pageIndex: 0 });
      }

      // Save updated table extraction
      const tableExtPath = path.join(pageDir, 'table_extraction.json');
      fs.writeFileSync(tableExtPath, JSON.stringify(tableExtractionResult, null, 2));

      // Re-run record candidates extraction
      let recordCandidates;
      try {
        recordCandidates = extractRecordCandidates(tableExtractionResult, recordType);
      } catch {
        recordCandidates = {
          candidates: [],
          detectedType: recordType,
          typeConfidence: 0,
          parsedAt: new Date().toISOString(),
        };
      }

      const recordCandPath = path.join(pageDir, 'record_candidates.json');
      fs.writeFileSync(recordCandPath, JSON.stringify(recordCandidates, null, 2));

      res.json({
        success: true,
        jobId,
        pageIndex,
        tableExtraction: {
          dataRows: tableExtractionResult.data_rows,
          columnsDetected: tableExtractionResult.columns_detected,
        },
        recordCandidates: {
          count: recordCandidates.candidates?.length || 0,
          detectedType: recordCandidates.detectedType,
        },
        replayedAt: new Date().toISOString(),
      });
    } catch (error: any) {
      console.error('[OCR Replay] Error:', error);
      res.status(500).json({ error: 'Replay failed', details: error.message });
    }
  });

  // -----------------------------------------------------------------------
  // 5. PATCH /jobs/:jobId — Update job metadata
  // -----------------------------------------------------------------------
  churchJobsRouter.patch('/jobs/:jobId', async (req: any, res: any) => {
    try {
      const churchId = parseInt(req.params.churchId);
      const jobId = parseInt(req.params.jobId);
      const { record_type, priority } = req.body;

      // Build update query dynamically
      const updates: string[] = [];
      const values: any[] = [];

      if (record_type) {
        updates.push('record_type = ?');
        values.push(record_type);
      }

      if (priority !== undefined) {
        const p = Math.min(9, Math.max(1, parseInt(priority)));
        if (!isNaN(p)) {
          updates.push('priority = ?');
          values.push(p);
        }
      }

      if (updates.length === 0) {
        return res.status(400).json({ error: 'No valid fields to update' });
      }

      values.push(jobId, churchId);
      // Update PLATFORM DB — ocr_jobs lives in orthodoxmetrics_db
      await promisePool.query(`UPDATE ocr_jobs SET ${updates.join(', ')} WHERE id = ? AND church_id = ?`, values);

      res.json({ success: true, message: 'Job updated' });
    } catch (error: any) {
      console.error('[OCR Job PATCH] Error:', error);
      res.status(500).json({ error: 'Failed to update job', message: error.message });
    }
  });

  // -----------------------------------------------------------------------
  // 6. POST /jobs/:jobId/retry — Retry a failed job
  // -----------------------------------------------------------------------
  churchJobsRouter.post('/jobs/:jobId/retry', async (req: any, res: any) => {
    try {
      const churchId = parseInt(req.params.churchId);
      const jobId = parseInt(req.params.jobId);

      const [churchRows] = await promisePool.query('SELECT database_name FROM churches WHERE id = ?', [churchId]);
      if (!churchRows.length) {
        return res.status(404).json({ error: 'Church not found' });
      }

      console.log(`OCR_RETRY ${JSON.stringify({ churchId, jobId })}`);

      // Query job from PLATFORM DB (global queue)
      const [jobs] = await promisePool.query(
        'SELECT id, church_id, filename, status FROM ocr_jobs WHERE id = ? AND church_id = ?',
        [jobId, churchId]
      );
      if (!jobs.length) {
        return res.status(404).json({ error: 'Job not found' });
      }

      const job = (jobs as any[])[0];
      const retriableStatuses = ['pending', 'error', 'complete', 'processing'];
      if (!retriableStatuses.includes(job.status)) {
        return res.status(400).json({ error: `Cannot retry job with status '${job.status}'. Accepted: ${retriableStatuses.join(', ')}` });
      }

      // Try to resolve file path from stored artifact first, fall back to filename
      const UPLOADS_ROOT = '/var/www/orthodoxmetrics/prod/uploads';
      let resolvedFilePath: string | null = null;

      // Check for stored source_image artifact (re-run without re-upload)
      try {
        const { getTenantPool } = require('../../config/db');
        const tenantPool = getTenantPool(churchId);
        const [artifacts] = await tenantPool.query(
          `SELECT a.storage_path FROM ocr_feeder_artifacts a
           JOIN ocr_feeder_pages p ON a.page_id = p.id
           WHERE p.job_id = ? AND a.type = 'source_image'
           ORDER BY a.created_at DESC LIMIT 1`,
          [jobId]
        );
        if (artifacts.length > 0 && artifacts[0].storage_path && fs.existsSync(artifacts[0].storage_path)) {
          resolvedFilePath = artifacts[0].storage_path;
          console.log(`OCR_RETRY_ARTIFACT ${JSON.stringify({ jobId, artifactPath: resolvedFilePath })}`);
        }
      } catch (_: any) { /* artifact lookup failed, fall back to filename */ }

      // Fall back to resolving from filename
      if (!resolvedFilePath) {
        if (job.filename.startsWith('/uploads/')) {
          resolvedFilePath = path.join('/var/www/orthodoxmetrics/prod', job.filename);
        } else {
          resolvedFilePath = path.join(UPLOADS_ROOT, `om_church_${churchId}`, 'uploaded', job.filename);
        }
      }

      // Hard guard: no server/ paths
      if (resolvedFilePath.includes('/server/')) {
        return res.status(500).json({ error: `Resolved path contains /server/ — regression: ${resolvedFilePath}` });
      }

      const fileExists = fs.existsSync(resolvedFilePath);
      console.log(`OCR_RETRY_JOB ${JSON.stringify({ filename: job.filename, resolvedFilePath, exists: fileExists })}`);

      if (!fileExists) {
        await promisePool.query(
          `UPDATE ocr_jobs SET status = 'error', error_regions = ? WHERE id = ?`,
          [`File not found: ${resolvedFilePath}`, jobId]
        );
        return res.status(404).json({ error: 'Source image file not found on disk', resolvedFilePath });
      }

      // Reset to pending — clear prior outputs, let worker pick it up
      await promisePool.query(`
        UPDATE ocr_jobs SET
          status = 'pending',
          ocr_text = NULL, ocr_result = NULL,
          confidence_score = NULL, error_regions = NULL
        WHERE id = ?
      `, [jobId]);

      res.json({ ok: true, jobId, status: 'pending', message: 'Job re-queued for processing (worker will pick it up)' });
    } catch (error: any) {
      console.error('[OCR Job Retry] Error:', error);
      res.status(500).json({ error: 'Failed to retry job', message: error.message });
    }
  });

  // -----------------------------------------------------------------------
  // 6b. GET /jobs/:jobId/history — Job pipeline stage history
  // -----------------------------------------------------------------------
  churchJobsRouter.get('/jobs/:jobId/history', async (req: any, res: any) => {
    try {
      const churchId = parseInt(req.params.churchId);
      const jobId = parseInt(req.params.jobId);

      // Verify job belongs to this church
      const [jobs] = await promisePool.query(
        'SELECT id FROM ocr_jobs WHERE id = ? AND church_id = ?',
        [jobId, churchId]
      );
      if (!(jobs as any[]).length) {
        return res.status(404).json({ error: 'Job not found' });
      }

      const [rows] = await promisePool.query(
        `SELECT id, job_id, stage, status, message, duration_ms, created_at
         FROM ocr_job_history WHERE job_id = ? ORDER BY created_at ASC`,
        [jobId]
      );

      res.json({ history: rows });
    } catch (error: any) {
      console.error('[OCR Jobs] getJobHistory error:', error);
      res.status(500).json({ error: 'Failed to fetch job history', message: error.message });
    }
  });

  // -----------------------------------------------------------------------
  // 6c. POST /jobs/:jobId/resume — Resume a failed job from last completed stage
  // -----------------------------------------------------------------------
  churchJobsRouter.post('/jobs/:jobId/resume', async (req: any, res: any) => {
    try {
      const churchId = parseInt(req.params.churchId);
      const jobId = parseInt(req.params.jobId);

      const [jobs] = await promisePool.query(
        `SELECT id, status, current_stage, filename, church_id
         FROM ocr_jobs WHERE id = ? AND church_id = ?`,
        [jobId, churchId]
      );
      if (!(jobs as any[]).length) {
        return res.status(404).json({ error: 'Job not found' });
      }

      const job = (jobs as any[])[0];
      if (job.status !== 'failed' && job.status !== 'error') {
        return res.status(400).json({ error: `Cannot resume job with status '${job.status}'. Only failed jobs can be resumed.` });
      }

      // Find last completed stage from history
      const PIPELINE_STAGES = ['intake', 'preprocessing', 'ocr_processing', 'extracting', 'validating', 'committing'];
      const [historyRows] = await promisePool.query(
        `SELECT stage FROM ocr_job_history
         WHERE job_id = ? AND status = 'completed'
         ORDER BY created_at DESC LIMIT 1`,
        [jobId]
      );

      const lastCompletedStage = (historyRows as any[]).length > 0 ? (historyRows as any[])[0].stage : null;
      const resumeFromIndex = lastCompletedStage ? PIPELINE_STAGES.indexOf(lastCompletedStage) + 1 : 0;
      const resumeStage = PIPELINE_STAGES[resumeFromIndex] || 'intake';

      const resumeToken = crypto.randomBytes(16).toString('hex');

      await promisePool.query(
        `UPDATE ocr_jobs SET
          status = 'pending',
          current_stage = ?,
          resume_token = ?,
          error_regions = NULL,
          last_activity_at = NOW()
         WHERE id = ?`,
        [resumeStage, resumeToken, jobId]
      );

      console.log(`[OCR Jobs] Job ${churchId}/${jobId} resumed from stage '${resumeStage}'`);
      res.json({
        success: true,
        message: `Job resumed from '${resumeStage}'`,
        resumeStage,
        resumeToken
      });
    } catch (error: any) {
      console.error('[OCR Jobs] resumeJob error:', error);
      res.status(500).json({ error: 'Failed to resume job', message: error.message });
    }
  });

  // -----------------------------------------------------------------------
  // 6d. POST /jobs/:jobId/cancel — Cancel a pending or processing job
  // -----------------------------------------------------------------------
  churchJobsRouter.post('/jobs/:jobId/cancel', async (req: any, res: any) => {
    try {
      const churchId = parseInt(req.params.churchId);
      const jobId = parseInt(req.params.jobId);
      const { reason } = req.body || {};

      const [jobs] = await promisePool.query(
        `SELECT id, status, filename, church_id
         FROM ocr_jobs WHERE id = ? AND church_id = ?`,
        [jobId, churchId]
      );
      if (!(jobs as any[]).length) {
        return res.status(404).json({ error: 'Job not found' });
      }

      const job = (jobs as any[])[0];
      const cancellableStatuses = ['pending', 'processing'];
      if (!cancellableStatuses.includes(job.status)) {
        return res.status(400).json({
          error: `Cannot cancel job with status '${job.status}'. Only pending or processing jobs can be cancelled.`
        });
      }

      await promisePool.query(
        `UPDATE ocr_jobs SET
          status = 'failed',
          current_stage = 'cancelled',
          last_activity_at = NOW()
         WHERE id = ?`,
        [jobId]
      );

      // Record cancellation in job history
      await promisePool.query(
        `INSERT INTO ocr_job_history (job_id, stage, status, message, created_at)
         VALUES (?, 'cancelled', 'cancelled', ?, NOW())`,
        [jobId, JSON.stringify({ action: 'user_cancelled', reason: reason || null, cancelled_by: req.user?.id || null })]
      );

      console.log(`[OCR Jobs] Job ${churchId}/${jobId} cancelled by user ${req.user?.id}`);
      res.json({
        success: true,
        message: `Job ${jobId} cancelled`,
        previous_status: job.status
      });
    } catch (error: any) {
      console.error('[OCR Jobs] cancelJob error:', error);
      res.status(500).json({ error: 'Failed to cancel job', message: error.message });
    }
  });

  // -----------------------------------------------------------------------
  // 6e. POST /jobs/batch-status — Get status of multiple jobs at once
  // -----------------------------------------------------------------------
  churchJobsRouter.post('/jobs/batch-status', async (req: any, res: any) => {
    try {
      const churchId = parseInt(req.params.churchId);
      const { jobIds } = req.body;

      if (!Array.isArray(jobIds) || jobIds.length === 0) {
        return res.status(400).json({ error: 'jobIds array is required' });
      }

      if (jobIds.length > 100) {
        return res.status(400).json({ error: 'Maximum 100 job IDs per request' });
      }

      const placeholders = jobIds.map(() => '?').join(',');
      const [rows] = await promisePool.query(
        `SELECT id, status, review_status, record_type, filename,
                confidence_score, current_stage, progress_percent,
                created_at, started_at, completed_at
         FROM ocr_jobs
         WHERE id IN (${placeholders}) AND church_id = ?
         ORDER BY created_at DESC`,
        [...jobIds.map((id: any) => parseInt(id)), churchId]
      );

      res.json({
        jobs: rows,
        requested: jobIds.length,
        found: (rows as any[]).length
      });
    } catch (error: any) {
      console.error('[OCR Jobs] batchStatus error:', error);
      res.status(500).json({ error: 'Failed to get batch status', message: error.message });
    }
  });

  // -----------------------------------------------------------------------
  // 7. DELETE /jobs — Bulk delete jobs
  // -----------------------------------------------------------------------
  churchJobsRouter.delete('/jobs', async (req: any, res: any) => {
    try {
      const churchId = parseInt(req.params.churchId);
      const { jobIds } = req.body; // Array of job IDs to delete

      if (!Array.isArray(jobIds) || jobIds.length === 0) {
        return res.status(400).json({ error: 'jobIds array is required' });
      }

      const resolved = await resolveChurchDb(churchId);
      if (!resolved) {
        return res.status(404).json({ error: 'Church not found' });
      }
      const { db: tenantDb } = resolved;

      const fsPromises = require('fs').promises;
      const placeholders = jobIds.map(() => '?').join(',');

      // Get filenames from PLATFORM DB (that's where jobs are listed from)
      const [jobs] = await promisePool.query(
        `SELECT id, filename, church_id FROM ocr_jobs WHERE id IN (${placeholders}) AND church_id = ?`,
        [...jobIds, churchId]
      );

      // Delete uploaded files from disk
      const UPLOADS_ROOT = '/var/www/orthodoxmetrics/prod/uploads';
      for (const job of (jobs as any[])) {
        if (job.filename) {
          try {
            let absPath: string;
            const jChurchId = job.church_id || churchId;
            if (job.filename.startsWith('/uploads/')) {
              absPath = path.join('/var/www/orthodoxmetrics/prod', job.filename);
            } else {
              absPath = path.join(UPLOADS_ROOT, `om_church_${jChurchId}`, 'uploaded', job.filename);
            }
            if (fs.existsSync(absPath)) {
              await fsPromises.unlink(absPath);
              // Delete OCR sidecar files
              const dir = path.dirname(absPath);
              const base = path.parse(path.basename(absPath)).name;
              await fsPromises.unlink(path.join(dir, `${base}_ocr.txt`)).catch(() => {});
              await fsPromises.unlink(path.join(dir, `${base}_ocr.json`)).catch(() => {});
            }
          } catch (e) {
            // File may not exist
          }
        }

        // Delete feeder storage directory (server/storage/feeder/job_{id}/)
        try {
          const storageDir = path.resolve(__dirname, '../../storage/feeder', `job_${job.id}`);
          if (fs.existsSync(storageDir)) {
            await fsPromises.rm(storageDir, { recursive: true, force: true });
          }
        } catch (e) {
          // Non-blocking
        }
      }

      // Delete from PLATFORM DB (where GET /jobs reads from)
      await promisePool.query(
        `DELETE FROM ocr_jobs WHERE id IN (${placeholders}) AND church_id = ?`,
        [...jobIds, churchId]
      );

      // Delete from platform ocr_job_history
      try {
        await promisePool.query(
          `DELETE FROM ocr_job_history WHERE job_id IN (${placeholders})`,
          jobIds
        );
      } catch (e) {
        // Table may not exist or no rows
      }

      // Delete feeder data from TENANT DB
      try {
        // Get page IDs for these jobs
        const [pages] = await tenantDb.query(
          `SELECT id FROM ocr_feeder_pages WHERE job_id IN (${placeholders})`,
          jobIds
        );
        const pageIds = (pages as any[]).map((p: any) => p.id);

        if (pageIds.length > 0) {
          const pagePlaceholders = pageIds.map(() => '?').join(',');
          await tenantDb.query(
            `DELETE FROM ocr_feeder_artifacts WHERE page_id IN (${pagePlaceholders})`,
            pageIds
          );
          await tenantDb.query(
            `DELETE FROM ocr_feeder_pages WHERE id IN (${pagePlaceholders})`,
            pageIds
          );
        }
      } catch (e) {
        // Tables may not exist
      }

      // Delete from tenant ocr_jobs (if it exists there too)
      try {
        await tenantDb.query(`DELETE FROM ocr_jobs WHERE id IN (${placeholders})`, jobIds);
      } catch (e) {
        // May not exist in tenant DB
      }

      // Delete tenant mappings
      try {
        await tenantDb.query(`DELETE FROM ocr_mappings WHERE ocr_job_id IN (${placeholders})`, jobIds);
      } catch (e) {
        // Table may not exist
      }

      // Delete tenant draft records
      try {
        await tenantDb.query(`DELETE FROM ocr_draft_records WHERE job_id IN (${placeholders})`, jobIds);
      } catch (e) {
        // Table may not exist
      }

      console.log(`[OCR Delete] Deleted ${jobIds.length} jobs for church ${churchId}: [${jobIds.join(', ')}]`);
      res.json({ success: true, deleted: jobIds.length });
    } catch (error: any) {
      console.error('[OCR Bulk Delete] Error:', error);
      res.status(500).json({ error: 'Failed to delete jobs', message: error.message });
    }
  });


  // -----------------------------------------------------------------------
  // 8. POST /jobs/:jobId/finalize — Church-scoped: write mapped fields into tenant record table
  // -----------------------------------------------------------------------
  churchJobsRouter.post('/jobs/:jobId/finalize', async (req: any, res: any) => {
    try {
      const churchId = parseInt(req.params.churchId);
      const jobId = parseInt(req.params.jobId);
      const { record_type, mappedFields } = req.body;

      if (!record_type || !mappedFields) {
        return res.status(400).json({ error: 'record_type and mappedFields are required' });
      }

      console.log(`[OCR Finalize] POST /api/church/${churchId}/ocr/jobs/${jobId}/finalize`);

      const resolved = await resolveChurchDb(churchId);
      if (!resolved) return res.status(404).json({ error: 'Church not found' });
      const { db } = resolved;

      const userEmail = req.session?.user?.email || req.user?.email || 'system';
      let recordId: number | null = null;

      const tableMap: Record<string, string> = { baptism: 'baptism_records', marriage: 'marriage_records', funeral: 'funeral_records' };
      const table = tableMap[record_type];
      if (!table) return res.status(400).json({ error: `Unsupported record_type: ${record_type}` });

      const mapped = mapFieldsToDbColumns(record_type, mappedFields);
      const { sql, params } = buildInsertQuery(table, churchId, mapped);
      const [result] = await db.query(sql, params);
      recordId = result.insertId;

      // Update the job's ocr_result with finalization metadata
      const finalizeMeta = {
        finalizedAt: new Date().toISOString(),
        finalizedBy: userEmail,
        recordType: record_type,
        createdRecordId: recordId,
      };
      try {
        await db.query(
          `UPDATE ocr_jobs SET ocr_result = ? WHERE id = ? AND church_id = ?`,
          [JSON.stringify(finalizeMeta), jobId, churchId]
        );
      } catch (_: any) {
        // Non-blocking — finalize metadata save failure doesn't affect record creation
      }

      // Non-blocking: log corrections
      (async () => {
        try {
          const original = req.body.originalFields || {};
          const [jobMeta] = await promisePool.query(
            'SELECT layout_template_id FROM ocr_jobs WHERE id = ?', [jobId]
          ) as any[];
          const extractorId = jobMeta[0]?.layout_template_id || null;

          for (const key of Object.keys(mappedFields)) {
            const extractedVal = (original[key] || '').toString().trim();
            const correctedVal = (mappedFields[key] || '').toString().trim();
            if (extractedVal !== correctedVal && (extractedVal || correctedVal)) {
              await promisePool.query(
                `INSERT INTO ocr_correction_log
                 (church_id, job_id, extractor_id, record_type, field_key, extracted_value, corrected_value)
                 VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [churchId, jobId, extractorId, record_type, key, extractedVal || null, correctedVal || null]
              );
            }
          }
        } catch (_: any) { /* swallowed */ }
      })();

      console.log(`OCR_FINALIZE_OK ${JSON.stringify({ jobId, churchId, record_type, recordId })}`);
      res.json({ ok: true, jobId, createdRecordId: recordId, record_type, church_id: churchId });
    } catch (error: any) {
      console.error('[OCR Finalize Church] Error:', error);
      res.status(500).json({ error: 'Failed to finalize job', message: error.message });
    }
  });


  // -----------------------------------------------------------------------
  // 9. POST /jobs/:jobId/finalize-batch — Batch finalize: create multiple records in one transaction
  // -----------------------------------------------------------------------
  churchJobsRouter.post('/jobs/:jobId/finalize-batch', async (req: any, res: any) => {
    try {
      const churchId = parseInt(req.params.churchId);
      const jobId = parseInt(req.params.jobId);
      const { records } = req.body;

      if (!Array.isArray(records) || records.length === 0) {
        return res.status(400).json({ error: 'records array is required and must not be empty' });
      }

      // Validate each record has record_type and mappedFields
      const validTypes = ['baptism', 'marriage', 'funeral'];
      for (let i = 0; i < records.length; i++) {
        const r = records[i];
        if (!r.record_type || !r.mappedFields) {
          return res.status(400).json({ error: `records[${i}] missing record_type or mappedFields` });
        }
        if (!validTypes.includes(r.record_type)) {
          return res.status(400).json({ error: `records[${i}] has unsupported record_type: ${r.record_type}` });
        }
      }

      console.log(`[OCR Finalize-Batch] POST /api/church/${churchId}/ocr/jobs/${jobId}/finalize-batch — ${records.length} record(s)`);

      const resolved = await resolveChurchDb(churchId);
      if (!resolved) return res.status(404).json({ error: 'Church not found' });
      const { db } = resolved;

      const userEmail = req.session?.user?.email || req.user?.email || 'system';
      const conn = await db.getConnection();
      const createdRecords: any[] = [];
      const tableMap: Record<string, string> = { baptism: 'baptism_records', marriage: 'marriage_records', funeral: 'funeral_records' };

      try {
        await conn.beginTransaction();

        for (const rec of records) {
          const table = tableMap[rec.record_type];
          const mapped = mapFieldsToDbColumns(rec.record_type, rec.mappedFields);
          const { sql, params } = buildInsertQuery(table, churchId, mapped);
          const [result] = await conn.query(sql, params);
          createdRecords.push({ recordId: result.insertId, recordType: rec.record_type });
        }

        await conn.commit();
      } catch (txErr: any) {
        await conn.rollback();
        throw txErr;
      } finally {
        conn.release();
      }

      // Save finalization metadata to platform DB
      const finalizeMeta = {
        finalizedAt: new Date().toISOString(),
        finalizedBy: userEmail,
        batchSize: createdRecords.length,
        records: createdRecords,
      };
      try {
        await promisePool.query(
          `UPDATE ocr_jobs SET ocr_result = ? WHERE id = ? AND church_id = ?`,
          [JSON.stringify(finalizeMeta), jobId, churchId]
        );
      } catch (_: any) {
        // Non-blocking
      }

      // Non-blocking: log corrections to ocr_correction_log for learning
      (async () => {
        try {
          // Look up the extractor used for this job
          const [jobMeta] = await promisePool.query(
            'SELECT layout_template_id, record_type FROM ocr_jobs WHERE id = ?', [jobId]
          ) as any[];
          const extractorId = jobMeta[0]?.layout_template_id || null;

          for (const rec of records) {
            const original = rec.originalFields || {};
            const corrected = rec.mappedFields || {};
            const allKeys = new Set([...Object.keys(original), ...Object.keys(corrected)]);

            for (const key of allKeys) {
              const extractedVal = (original[key] || '').toString().trim();
              const correctedVal = (corrected[key] || '').toString().trim();
              // Only log if there's a meaningful difference
              if (extractedVal !== correctedVal && (extractedVal || correctedVal)) {
                await promisePool.query(
                  `INSERT INTO ocr_correction_log
                   (church_id, job_id, extractor_id, record_type, field_key, extracted_value, corrected_value)
                   VALUES (?, ?, ?, ?, ?, ?, ?)`,
                  [churchId, jobId, extractorId, rec.record_type, key, extractedVal || null, correctedVal || null]
                );
              }
            }
          }
        } catch (corrErr: any) {
          console.warn('[OCR Correction Log] Non-blocking error:', corrErr.message);
        }
      })();

      console.log(`OCR_FINALIZE_BATCH_OK ${JSON.stringify({ jobId, churchId, created_count: createdRecords.length })}`);
      res.json({ ok: true, created_count: createdRecords.length, created_records: createdRecords });
    } catch (error: any) {
      console.error('[OCR Finalize-Batch] Error:', error);
      res.status(500).json({ error: 'Batch finalize failed', message: error.message });
    }
  });

  // -----------------------------------------------------------------------
  // POST /jobs/:jobId/autocommit — Partial auto-commit of eligible rows
  // -----------------------------------------------------------------------
  churchJobsRouter.post('/jobs/:jobId/autocommit', async (req: any, res: any) => {
    try {
      const churchId = parseInt(req.params.churchId);
      const jobId = parseInt(req.params.jobId);
      const { forceIndices, thresholdOverrides } = req.body || {};

      console.log(`[OCR Autocommit] POST /api/church/${churchId}/ocr/jobs/${jobId}/autocommit`);

      const resolved = await resolveChurchDb(churchId);
      if (!resolved) return res.status(404).json({ error: 'Church not found' });
      const { db: tenantPool } = resolved;

      const userEmail = req.session?.user?.email || req.user?.email || 'system';

      // 1. Locate feeder page for this job
      const [pageRows] = await tenantPool.query(
        `SELECT id, page_index, job_id FROM ocr_feeder_pages WHERE job_id = ? ORDER BY page_index ASC LIMIT 1`,
        [jobId],
      );
      if (!pageRows.length) {
        return res.status(404).json({ error: 'No feeder page found for this job' });
      }
      const page = pageRows[0];
      const pageDir = path.join(__dirname, '../../../storage/feeder', `job_${jobId}`, `page_${page.page_index}`);

      // 2. Load artifacts from disk
      const loadJson = (filename: string): any => {
        const p = path.join(pageDir, filename);
        if (fs.existsSync(p)) {
          try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return null; }
        }
        return null;
      };

      const scoringV2 = loadJson('scoring_v2.json');
      const recordCandidates = loadJson('record_candidates.json');
      const candProvenance = loadJson('record_candidates_provenance.json');
      const metricsData = loadJson('metrics.json');

      if (!recordCandidates?.candidates?.length) {
        return res.status(400).json({ error: 'No record candidates found for this job' });
      }

      const recordType = recordCandidates.detectedType || 'unknown';
      if (!['baptism', 'marriage', 'funeral'].includes(recordType)) {
        return res.status(400).json({ error: `Cannot auto-commit: unsupported record type "${recordType}"` });
      }

      const structureScore = metricsData?.structure_score ?? null;
      const templateUsed = !!(metricsData?.template_id || recordCandidates?.template_id);

      // 3. Build artifact SHA256 refs
      const sha256File = (filename: string): string | null => {
        const p = path.join(pageDir, filename);
        if (!fs.existsSync(p)) return null;
        return crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
      };
      const artifactRefs: Record<string, string | null> = {
        scoring_v2: sha256File('scoring_v2.json'),
        record_candidates: sha256File('record_candidates.json'),
        record_candidates_provenance: sha256File('record_candidates_provenance.json'),
        metrics: sha256File('metrics.json'),
      };

      // 4. Build autocommit plan
      // Import eligibility gate
      const { buildAutocommitPlan, buildAutocommitResults } = require('../../ocr/preprocessing/autocommit');

      const plan = buildAutocommitPlan(
        scoringV2,
        candProvenance,
        structureScore,
        templateUsed,
        artifactRefs,
        thresholdOverrides,
      );

      // Allow user-forced indices to override eligibility
      const forceSet = new Set<number>(forceIndices || []);
      const eligibleIndices = new Set<number>(plan.eligible_rows.map((r: any) => r.candidateIndex));

      // Merge: eligible + forced
      for (const fi of forceSet) {
        if (!eligibleIndices.has(fi)) {
          eligibleIndices.add(fi);
          // Move from skipped to eligible in plan
          const skippedIdx = plan.skipped_rows.findIndex((r: any) => r.candidateIndex === fi);
          if (skippedIdx >= 0) {
            const moved = plan.skipped_rows.splice(skippedIdx, 1)[0];
            moved.reasons = ['USER_FORCED'];
            plan.eligible_rows.push(moved);
          }
        }
      }

      plan.eligible_count = plan.eligible_rows.length;
      plan.skipped_count = plan.skipped_rows.length;

      // 5. Write autocommit_plan.json artifact (ALWAYS, before commit)
      const planJson = JSON.stringify(plan, null, 2);
      const planPath = path.join(pageDir, 'autocommit_plan.json');
      const planTmp = planPath + '.tmp';
      fs.writeFileSync(planTmp, planJson);
      fs.renameSync(planTmp, planPath);

      const planSha = crypto.createHash('sha256').update(planJson).digest('hex');
      await tenantPool.query(
        `INSERT INTO ocr_feeder_artifacts (page_id, type, storage_path, sha256, bytes, mime_type, created_at)
         VALUES (?, 'autocommit_plan', ?, ?, ?, 'application/json', NOW())`,
        [page.id, planPath, planSha, Buffer.byteLength(planJson)],
      );

      // 6. Execute partial commit
      const tableMap: Record<string, string> = {
        baptism: 'baptism_records',
        marriage: 'marriage_records',
        funeral: 'funeral_records',
      };
      const table = tableMap[recordType];
      const candidates: any[] = recordCandidates.candidates;

      const rowResults: any[] = [];
      const conn = await tenantPool.getConnection();

      try {
        await conn.beginTransaction();

        for (let ci = 0; ci < candidates.length; ci++) {
          if (!eligibleIndices.has(ci)) {
            // Skip this row
            rowResults.push({
              candidateIndex: ci,
              sourceRowIndex: candidates[ci].sourceRowIndex ?? -1,
              outcome: 'skipped',
              recordId: null,
              recordType: null,
              table: null,
              error: null,
            });
            continue;
          }

          try {
            const cand = candidates[ci];
            const mapped = mapFieldsToDbColumns(recordType, cand.fields || {});
            const { sql, params } = buildInsertQuery(table, churchId, mapped);
            const [result] = await conn.query(sql, params);
            rowResults.push({
              candidateIndex: ci,
              sourceRowIndex: cand.sourceRowIndex ?? -1,
              outcome: 'committed',
              recordId: result.insertId,
              recordType,
              table,
              error: null,
            });
          } catch (rowErr: any) {
            rowResults.push({
              candidateIndex: ci,
              sourceRowIndex: candidates[ci].sourceRowIndex ?? -1,
              outcome: 'error',
              recordId: null,
              recordType,
              table,
              error: rowErr.message,
            });
          }
        }

        await conn.commit();
      } catch (txErr: any) {
        await conn.rollback();
        throw txErr;
      } finally {
        conn.release();
      }

      // 7. Build and write autocommit_results.json
      const results = buildAutocommitResults(plan.batch_id, jobId, churchId, rowResults);
      const resultsJson = JSON.stringify(results, null, 2);
      const resultsPath = path.join(pageDir, 'autocommit_results.json');
      const resultsTmp = resultsPath + '.tmp';
      fs.writeFileSync(resultsTmp, resultsJson);
      fs.renameSync(resultsTmp, resultsPath);

      const resultsSha = crypto.createHash('sha256').update(resultsJson).digest('hex');
      await tenantPool.query(
        `INSERT INTO ocr_feeder_artifacts (page_id, type, storage_path, sha256, bytes, mime_type, created_at)
         VALUES (?, 'autocommit_results', ?, ?, ?, 'application/json', NOW())`,
        [page.id, resultsPath, resultsSha, Buffer.byteLength(resultsJson)],
      );

      // 8. Update ocr_jobs finalization metadata (non-blocking)
      const committedRows = rowResults.filter((r: any) => r.outcome === 'committed');
      if (committedRows.length > 0) {
        const finalizeMeta = {
          finalizedAt: new Date().toISOString(),
          finalizedBy: userEmail,
          method: 'autocommit_v1',
          batch_id: plan.batch_id,
          batchSize: committedRows.length,
          totalCandidates: candidates.length,
          records: committedRows.map((r: any) => ({ recordId: r.recordId, recordType: r.recordType })),
          skippedCount: results.skipped_count,
        };
        try {
          await promisePool.query(
            `UPDATE ocr_jobs SET ocr_result = ? WHERE id = ? AND church_id = ?`,
            [JSON.stringify(finalizeMeta), jobId, churchId],
          );
        } catch (_: any) { /* non-blocking */ }
      }

      // 9. Append to audit history (ocr_job_history in platform DB)
      try {
        await promisePool.query(
          `INSERT INTO ocr_job_history (job_id, stage, status, message, created_at)
           VALUES (?, 'autocommit', 'completed', ?, NOW())`,
          [jobId, JSON.stringify({
            action: 'AUTOCOMMIT_PARTIAL',
            batch_id: plan.batch_id,
            committed: results.committed_count,
            skipped: results.skipped_count,
            errors: results.error_count,
            page_score: scoringV2?.page_score_v2 ?? null,
          })],
        );
      } catch (_: any) { /* non-blocking */ }

      // 10. Merge metrics
      try {
        const metricsPath = path.join(pageDir, 'metrics.json');
        let metrics: Record<string, any> = {};
        if (fs.existsSync(metricsPath)) {
          try { metrics = JSON.parse(fs.readFileSync(metricsPath, 'utf8')); } catch {}
        }
        Object.assign(metrics, {
          autocommit_batch_id: plan.batch_id,
          autocommit_committed: results.committed_count,
          autocommit_skipped: results.skipped_count,
          autocommit_at: results.created_at,
        });
        const mTmp = metricsPath + '.tmp';
        fs.writeFileSync(mTmp, JSON.stringify(metrics, null, 2));
        fs.renameSync(mTmp, metricsPath);
      } catch (_: any) { /* non-blocking */ }

      console.log(`OCR_AUTOCOMMIT_OK ${JSON.stringify({
        jobId, churchId, batch_id: plan.batch_id,
        committed: results.committed_count, skipped: results.skipped_count,
      })}`);

      res.json({
        ok: true,
        batch_id: plan.batch_id,
        committed_count: results.committed_count,
        skipped_count: results.skipped_count,
        error_count: results.error_count,
        committed_records: committedRows.map((r: any) => ({ recordId: r.recordId, recordType: r.recordType })),
        plan_summary: {
          eligible: plan.eligible_count,
          skipped: plan.skipped_count,
          thresholds: plan.thresholds,
        },
      });
    } catch (error: any) {
      console.error('[OCR Autocommit] Error:', error);
      res.status(500).json({ error: 'Autocommit failed', message: error.message });
    }
  });

  // -----------------------------------------------------------------------
  // GET /jobs/:jobId/review/corrections — Retrieve field correction log
  // -----------------------------------------------------------------------
  churchJobsRouter.get('/jobs/:jobId/review/corrections', async (req: any, res: any) => {
    try {
      const jobId = parseInt(req.params.jobId);
      const limit = Math.min(parseInt(req.query.limit as string) || 100, 1000);
      const offset = parseInt(req.query.offset as string) || 0;

      console.log(`[OCR Corrections] GET /jobs/${jobId}/review/corrections limit=${limit} offset=${offset}`);

      const { loadCorrections, buildCorrectionsSummary, correctionsLogPath } = require('../../ocr/preprocessing/correctionLog');
      const logPath = correctionsLogPath(jobId);
      const allEvents = loadCorrections(logPath);
      const summary = buildCorrectionsSummary(jobId, allEvents);

      // Paginate (most recent first)
      const reversed = [...allEvents].reverse();
      const page = reversed.slice(offset, offset + limit);

      res.json({
        ok: true,
        job_id: jobId,
        summary,
        events: page,
        pagination: {
          total: allEvents.length,
          offset,
          limit,
          has_more: offset + limit < allEvents.length,
        },
      });
    } catch (error: any) {
      console.error('[OCR Corrections] Error:', error);
      res.status(500).json({ error: 'Failed to load corrections', message: error.message });
    }
  });

  // -----------------------------------------------------------------------
  // GET /jobs/:jobId/review/commit-batches — List commit batches for a job
  // (super_admin only)
  // -----------------------------------------------------------------------
  churchJobsRouter.get('/jobs/:jobId/review/commit-batches', async (req: any, res: any) => {
    try {
      const churchId = parseInt(req.params.churchId);
      const jobId = parseInt(req.params.jobId);
      const user = req.session?.user;
      if (!user || user.role !== 'super_admin') {
        return res.status(403).json({ error: 'super_admin required' });
      }

      console.log(`[OCR Batches] GET /jobs/${jobId}/review/commit-batches (church ${churchId})`);

      const resolved = await resolveChurchDb(churchId);
      if (!resolved) return res.status(404).json({ error: 'Church not found' });
      const { db: tenantPool } = resolved;

      // Find all autocommit_plan + autocommit_results artifacts for this job
      const [artifacts] = await tenantPool.query(
        `SELECT a.id, a.type, a.storage_path, a.json_blob, a.created_at, a.sha256, a.bytes
         FROM ocr_feeder_artifacts a
         JOIN ocr_feeder_pages p ON a.page_id = p.id
         WHERE p.job_id = ? AND a.type IN ('autocommit_plan', 'autocommit_results', 'rollback_results')
         ORDER BY a.created_at ASC`,
        [jobId],
      );

      // Group by batch_id
      const batchMap = new Map<string, any>();

      for (const art of artifacts as any[]) {
        let data: any = null;
        try {
          if (art.storage_path && fs.existsSync(art.storage_path)) {
            data = JSON.parse(fs.readFileSync(art.storage_path, 'utf8'));
          } else if (art.json_blob) {
            data = typeof art.json_blob === 'string' ? JSON.parse(art.json_blob) : art.json_blob;
          }
        } catch (_) {}

        if (!data?.batch_id) continue;
        const batchId = data.batch_id;

        if (!batchMap.has(batchId)) {
          batchMap.set(batchId, {
            batch_id: batchId,
            created_at: null,
            plan: null,
            results: null,
            rollback: null,
            rolled_back: false,
          });
        }

        const entry = batchMap.get(batchId)!;

        if (art.type === 'autocommit_plan') {
          entry.plan = {
            eligible_count: data.eligible_count ?? 0,
            skipped_count: data.skipped_count ?? 0,
            total_candidates: data.total_candidates ?? 0,
            thresholds: data.thresholds ?? null,
            structure_score: data.structure_score ?? null,
            template_used: data.template_used ?? false,
            method: data.method ?? 'unknown',
          };
          entry.created_at = data.created_at || art.created_at;
        } else if (art.type === 'autocommit_results') {
          entry.results = {
            committed_count: data.committed_count ?? 0,
            skipped_count: data.skipped_count ?? 0,
            error_count: data.error_count ?? 0,
            rows: (data.rows || []).map((r: any) => ({
              candidateIndex: r.candidateIndex,
              outcome: r.outcome,
              recordId: r.recordId,
              recordType: r.recordType,
              table: r.table,
            })),
          };
        } else if (art.type === 'rollback_results') {
          entry.rollback = {
            deleted: data.deleted ?? {},
            missing: data.missing ?? {},
            rolled_back_at: data.rolled_back_at ?? art.created_at,
            rolled_back_by: data.rolled_back_by ?? 'unknown',
          };
          entry.rolled_back = true;
        }
      }

      const batches = Array.from(batchMap.values()).sort(
        (a: any, b: any) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime(),
      );

      res.json({ ok: true, job_id: jobId, church_id: churchId, batches });
    } catch (error: any) {
      console.error('[OCR Batches] Error:', error);
      res.status(500).json({ error: 'Failed to list batches', message: error.message });
    }
  });

  // -----------------------------------------------------------------------
  // POST /jobs/:jobId/review/rollback-batch — Rollback an autocommit batch
  // (super_admin only)
  // -----------------------------------------------------------------------
  churchJobsRouter.post('/jobs/:jobId/review/rollback-batch', async (req: any, res: any) => {
    try {
      const churchId = parseInt(req.params.churchId);
      const jobId = parseInt(req.params.jobId);
      const user = req.session?.user;
      if (!user || user.role !== 'super_admin') {
        return res.status(403).json({ error: 'super_admin required' });
      }

      const { batch_id, dry_run, force } = req.body || {};
      if (!batch_id || typeof batch_id !== 'string') {
        return res.status(400).json({ error: 'batch_id is required' });
      }

      const isDryRun = dry_run === true;
      const userEmail = user.email || 'system';

      console.log(`[OCR Rollback] POST /jobs/${jobId}/review/rollback-batch batch=${batch_id} dry_run=${isDryRun}`);

      const resolved = await resolveChurchDb(churchId);
      if (!resolved) return res.status(404).json({ error: 'Church not found' });
      const { db: tenantPool } = resolved;

      // 1. Locate autocommit_results artifact for this batch
      const [resultArts] = await tenantPool.query(
        `SELECT a.id, a.storage_path, a.json_blob, a.page_id
         FROM ocr_feeder_artifacts a
         JOIN ocr_feeder_pages p ON a.page_id = p.id
         WHERE p.job_id = ? AND a.type = 'autocommit_results'
         ORDER BY a.created_at DESC`,
        [jobId],
      );

      let resultsData: any = null;
      let artifactPageId: number | null = null;
      for (const art of resultArts as any[]) {
        let data: any = null;
        try {
          if (art.storage_path && fs.existsSync(art.storage_path)) {
            data = JSON.parse(fs.readFileSync(art.storage_path, 'utf8'));
          } else if (art.json_blob) {
            data = typeof art.json_blob === 'string' ? JSON.parse(art.json_blob) : art.json_blob;
          }
        } catch (_) {}
        if (data?.batch_id === batch_id) {
          resultsData = data;
          artifactPageId = art.page_id;
          break;
        }
      }

      if (!resultsData) {
        return res.status(404).json({ error: `No autocommit_results found for batch_id=${batch_id}` });
      }

      // 2. Check if already rolled back
      const [rollbackArts] = await tenantPool.query(
        `SELECT a.id FROM ocr_feeder_artifacts a
         JOIN ocr_feeder_pages p ON a.page_id = p.id
         WHERE p.job_id = ? AND a.type = 'rollback_results'`,
        [jobId],
      );
      for (const ra of rollbackArts as any[]) {
        // Check if this rollback is for our batch
        // We'll check by artifact content — but since we're here, just check existence
      }
      // More precise: check rollback artifact content
      let alreadyRolledBack = false;
      for (const ra of rollbackArts as any[]) {
        // We'd need to read each one — but for efficiency, we'll use a simpler approach
        // The rollback_results artifact stores batch_id in its content
      }
      // Simplified: check via audit history
      const [historyRows] = await promisePool.query(
        `SELECT message FROM ocr_job_history WHERE job_id = ? AND stage = 'rollback' AND status = 'completed'`,
        [jobId],
      );
      for (const hr of historyRows as any[]) {
        try {
          const msg = typeof hr.message === 'string' ? JSON.parse(hr.message) : hr.message;
          if (msg?.batch_id === batch_id) {
            alreadyRolledBack = true;
            break;
          }
        } catch (_) {}
      }

      if (alreadyRolledBack && !force) {
        return res.status(409).json({
          error: 'Batch already rolled back',
          hint: 'Pass force=true to rollback again (may find 0 rows to delete)',
        });
      }

      // 3. Parse committed rows from results
      const committedRows: Array<{ recordId: number; table: string; recordType: string }> = [];
      for (const row of resultsData.rows || []) {
        if (row.outcome === 'committed' && row.recordId && row.table) {
          committedRows.push({
            recordId: row.recordId,
            table: row.table,
            recordType: row.recordType || 'unknown',
          });
        }
      }

      if (committedRows.length === 0) {
        return res.json({
          ok: true,
          dry_run: isDryRun,
          batch_id,
          deleted: {},
          missing: {},
          message: 'No committed rows found in batch — nothing to rollback',
        });
      }

      // 4. Group by table for batch deletion
      const byTable = new Map<string, number[]>();
      for (const r of committedRows) {
        if (!byTable.has(r.table)) byTable.set(r.table, []);
        byTable.get(r.table)!.push(r.recordId);
      }

      // 5. Verify which rows still exist (for both dry run and real rollback)
      const deleted: Record<string, number> = {};
      const missing: Record<string, number> = {};
      const existingIds: Map<string, number[]> = new Map();
      const missingIds: Map<string, number[]> = new Map();

      for (const [table, ids] of byTable) {
        const placeholders = ids.map(() => '?').join(',');
        const [rows] = await tenantPool.query(
          `SELECT id FROM \`${table}\` WHERE id IN (${placeholders}) AND church_id = ?`,
          [...ids, churchId],
        );
        const foundIds = new Set((rows as any[]).map((r: any) => r.id));
        const found = ids.filter(id => foundIds.has(id));
        const notFound = ids.filter(id => !foundIds.has(id));

        existingIds.set(table, found);
        missingIds.set(table, notFound);
        deleted[table] = found.length;
        missing[table] = notFound.length;
      }

      // 6. Dry run — just return counts
      if (isDryRun) {
        return res.json({
          ok: true,
          dry_run: true,
          batch_id,
          deleted,
          missing,
          total_would_delete: Object.values(deleted).reduce((a, b) => a + b, 0),
          total_missing: Object.values(missing).reduce((a, b) => a + b, 0),
          details: {
            existing_ids: Object.fromEntries(existingIds),
            missing_ids: Object.fromEntries(missingIds),
          },
        });
      }

      // 7. Real rollback — delete in transaction
      const conn = await tenantPool.getConnection();
      try {
        await conn.beginTransaction();

        for (const [table, ids] of existingIds) {
          if (ids.length === 0) continue;
          const placeholders = ids.map(() => '?').join(',');
          await conn.query(
            `DELETE FROM \`${table}\` WHERE id IN (${placeholders}) AND church_id = ?`,
            [...ids, churchId],
          );
        }

        await conn.commit();
      } catch (txErr: any) {
        await conn.rollback();
        throw txErr;
      } finally {
        conn.release();
      }

      // 8. Write rollback_results.json artifact
      const rollbackResult = {
        method: 'autocommit_rollback_v1',
        batch_id,
        job_id: jobId,
        church_id: churchId,
        deleted,
        missing,
        deleted_ids: Object.fromEntries(existingIds),
        missing_ids: Object.fromEntries(missingIds),
        total_deleted: Object.values(deleted).reduce((a, b) => a + b, 0),
        total_missing: Object.values(missing).reduce((a, b) => a + b, 0),
        rolled_back_by: userEmail,
        rolled_back_at: new Date().toISOString(),
        force: !!force,
      };

      // Find page dir from artifact path
      let pageDir: string | null = null;
      if (artifactPageId) {
        const [pageRows] = await tenantPool.query(
          `SELECT page_index FROM ocr_feeder_pages WHERE id = ?`, [artifactPageId],
        );
        if ((pageRows as any[]).length > 0) {
          const pageIndex = (pageRows as any[])[0].page_index;
          pageDir = path.join(__dirname, '../../../storage/feeder', `job_${jobId}`, `page_${pageIndex}`);
        }
      }

      if (pageDir && fs.existsSync(pageDir)) {
        const rollbackJson = JSON.stringify(rollbackResult, null, 2);
        const rollbackPath = path.join(pageDir, 'rollback_results.json');
        const tmpPath = rollbackPath + '.tmp';
        fs.writeFileSync(tmpPath, rollbackJson);
        fs.renameSync(tmpPath, rollbackPath);

        const rollbackSha = crypto.createHash('sha256').update(rollbackJson).digest('hex');
        await tenantPool.query(
          `INSERT INTO ocr_feeder_artifacts (page_id, type, storage_path, sha256, bytes, mime_type, created_at)
           VALUES (?, 'rollback_results', ?, ?, ?, 'application/json', NOW())`,
          [artifactPageId, rollbackPath, rollbackSha, Buffer.byteLength(rollbackJson)],
        );
      }

      // 9. Audit history
      await promisePool.query(
        `INSERT INTO ocr_job_history (job_id, stage, status, message, created_at)
         VALUES (?, 'rollback', 'completed', ?, NOW())`,
        [jobId, JSON.stringify({
          action: 'AUTOCOMMIT_ROLLBACK',
          batch_id,
          deleted,
          missing,
          total_deleted: rollbackResult.total_deleted,
          rolled_back_by: userEmail,
          force: !!force,
        })],
      );

      console.log(`[OCR Rollback] Batch ${batch_id} rolled back: ${rollbackResult.total_deleted} deleted, ${rollbackResult.total_missing} missing`);

      res.json({
        ok: true,
        dry_run: false,
        batch_id,
        deleted,
        missing,
        total_deleted: rollbackResult.total_deleted,
        total_missing: rollbackResult.total_missing,
      });
    } catch (error: any) {
      console.error('[OCR Rollback] Error:', error);
      res.status(500).json({ error: 'Rollback failed', message: error.message });
    }
  });

  // -----------------------------------------------------------------------
  // POST /jobs/:jobId/save-draft — Auto-save field edits without finalizing
  // -----------------------------------------------------------------------
  churchJobsRouter.post('/jobs/:jobId/save-draft', async (req: any, res: any) => {
    try {
      const churchId = parseInt(req.params.churchId);
      const jobId = parseInt(req.params.jobId);
      const { records, recordType } = req.body;

      if (!churchId || !jobId) return res.status(400).json({ error: 'churchId and jobId required' });
      if (!records || !Array.isArray(records)) return res.status(400).json({ error: 'records array required' });

      const resolved = await resolveChurchDb(churchId);
      if (!resolved) return res.status(404).json({ error: 'Church not found' });
      const { db } = resolved;

      const userEmail = req.session?.user?.email || req.user?.email || 'system';
      const validType = ['baptism', 'marriage', 'funeral'].includes(recordType) ? recordType : 'baptism';

      // Upsert into ocr_mappings (one row per job)
      await db.query(`
        INSERT INTO ocr_mappings (ocr_job_id, church_id, record_type, mapping_json, status, created_by, created_at, updated_at)
        VALUES (?, ?, ?, ?, 'draft', ?, NOW(), NOW())
        ON DUPLICATE KEY UPDATE
          mapping_json = VALUES(mapping_json),
          record_type = VALUES(record_type),
          status = 'draft',
          updated_at = NOW()
      `, [jobId, churchId, validType, JSON.stringify(records), userEmail]);

      res.json({ ok: true, savedAt: new Date().toISOString() });
    } catch (error: any) {
      console.error('[OCR Save Draft] Error:', error);
      res.status(500).json({ error: 'Failed to save draft', message: error.message });
    }
  });

  // -----------------------------------------------------------------------
  // POST /jobs/:jobId/apply-template — Apply a saved layout template to a job
  // -----------------------------------------------------------------------
  churchJobsRouter.post('/jobs/:jobId/apply-template', async (req: any, res: any) => {
    try {
      const churchId = parseInt(req.params.churchId);
      const jobId = parseInt(req.params.jobId);
      const templateId = parseInt(req.body.template_id);

      if (!churchId || !jobId) return res.status(400).json({ error: 'churchId and jobId required' });
      if (!templateId) return res.status(400).json({ error: 'template_id required in body' });

      // 1. Load template column_bands and header_y_threshold from ocr_extractors
      const [tplRows] = await promisePool.query(
        'SELECT column_bands, header_y_threshold FROM ocr_extractors WHERE id = ?',
        [templateId]
      );
      if (!(tplRows as any[]).length) return res.status(404).json({ error: 'Template not found' });

      let columnBands = (tplRows as any[])[0].column_bands;
      if (typeof columnBands === 'string') columnBands = JSON.parse(columnBands);
      const headerY = (tplRows as any[])[0].header_y_threshold || 0.15;

      // 2. Load existing Vision JSON (DB ocr_result or feeder disk file)
      const [jobRows] = await promisePool.query('SELECT ocr_result, ocr_text, record_type FROM ocr_jobs WHERE id = ?', [jobId]);
      if (!(jobRows as any[]).length) return res.status(404).json({ error: 'Job not found' });

      let visionJsonStr = (jobRows as any[])[0].ocr_result;
      const recordType = (jobRows as any[])[0].record_type || 'unknown';
      const ocrText = (jobRows as any[])[0].ocr_text || '';

      // Fallback to disk
      if (!visionJsonStr) {
        const feederPath = path.join(
          '/var/www/orthodoxmetrics/prod/server/storage/feeder',
          `job_${jobId}`, 'page_0', 'vision_result.json'
        );
        if (fs.existsSync(feederPath)) {
          visionJsonStr = fs.readFileSync(feederPath, 'utf8');
        }
      }

      if (!visionJsonStr) {
        return res.status(400).json({ error: 'No OCR result available for this job' });
      }

      const visionJson = typeof visionJsonStr === 'string' ? JSON.parse(visionJsonStr) : visionJsonStr;

      // 3. Run extractGenericTable with template bands
      const { extractGenericTable, tableToStructuredText } = require('../../ocr/layouts/generic_table');
      const tableExtractionResult = extractGenericTable(visionJson, {
        pageIndex: 0,
        headerY,
        columnBands,
      });

      // 4. Run extractRecordCandidates
      const { extractRecordCandidates } = require('../../ocr/columnMapper');
      const rawText = ocrText || '';
      const rcResult = extractRecordCandidates(tableExtractionResult, rawText, recordType);

      console.log(`[ApplyTemplate] Job ${jobId}: template ${templateId} → ${tableExtractionResult.data_rows} rows, ${rcResult.candidates.length} candidates`);

      // 5. Save artifacts to disk + ocr_feeder_artifacts table
      const timestamp = Date.now();
      const resolvedTenant = await resolveChurchDb(churchId);
      if (!resolvedTenant) return res.status(404).json({ error: 'Church not found' });
      const tenantPool = resolvedTenant.db;

      // Find feeder page ID for this job
      const [pageRows] = await tenantPool.query(
        `SELECT fp.id AS page_id, fp.storage_dir FROM ocr_feeder_pages fp
         JOIN ocr_feeder_jobs fj ON fp.feeder_job_id = fj.id
         WHERE fj.platform_job_id = ? LIMIT 1`,
        [jobId]
      );

      if ((pageRows as any[]).length > 0) {
        const pageId = (pageRows as any[])[0].page_id;
        const pageStorageDir = (pageRows as any[])[0].storage_dir;

        if (pageStorageDir && fs.existsSync(pageStorageDir)) {
          // Save table extraction artifact
          const structuredText = tableToStructuredText(tableExtractionResult);
          const tableJsonPath = path.join(pageStorageDir, `table_extraction_template_${timestamp}.json`);
          fs.writeFileSync(tableJsonPath, JSON.stringify(tableExtractionResult, null, 2));

          if (structuredText) {
            const structuredTxtPath = path.join(pageStorageDir, `_structured_template_${timestamp}.txt`);
            fs.writeFileSync(structuredTxtPath, structuredText);

            await tenantPool.query(
              `INSERT INTO ocr_feeder_artifacts (page_id, type, storage_path, meta_json, created_at)
               VALUES (?, 'table_extraction', ?, ?, NOW())`,
              [pageId, structuredTxtPath, JSON.stringify({
                layout_id: tableExtractionResult.layout_id,
                data_rows: tableExtractionResult.data_rows,
                columns_detected: tableExtractionResult.columns_detected,
                template_id: templateId,
                appliedAt: new Date().toISOString(),
              })]
            );
          }

          // Save record candidates artifact
          const rcPath = path.join(pageStorageDir, `record_candidates_template_${timestamp}.json`);
          fs.writeFileSync(rcPath, JSON.stringify(rcResult, null, 2));

          await tenantPool.query(
            `INSERT INTO ocr_feeder_artifacts (page_id, type, storage_path, json_blob, meta_json, created_at)
             VALUES (?, 'record_candidates', ?, ?, ?, NOW())`,
            [pageId, rcPath, JSON.stringify(rcResult), JSON.stringify({
              candidateCount: rcResult.candidates.length,
              detectedType: rcResult.detectedType,
              typeConfidence: rcResult.typeConfidence,
              template_id: templateId,
              appliedAt: new Date().toISOString(),
            })]
          );
        }
      }

      // 6. Update ocr_jobs.layout_template_id
      try {
        await promisePool.query(
          `UPDATE ocr_jobs SET layout_template_id = ? WHERE id = ?`,
          [templateId, jobId]
        );
      } catch (_: any) { /* best effort — column may not exist yet */ }

      // 7. Return results
      res.json({
        success: true,
        template_id: templateId,
        tableExtraction: tableExtractionResult,
        recordCandidates: rcResult,
      });
    } catch (error: any) {
      console.error('[ApplyTemplate] Error:', error);
      res.status(500).json({ error: 'Apply template failed', message: error.message });
    }
  });

  // POST /jobs/:jobId/re-extract — Re-run extraction with custom column bands directly
  churchJobsRouter.post('/jobs/:jobId/re-extract', async (req: any, res: any) => {
    try {
      const churchId = parseInt(req.params.churchId);
      const jobId = parseInt(req.params.jobId);
      const { columnBands, headerYThreshold } = req.body;

      if (!churchId || !jobId) return res.status(400).json({ error: 'churchId and jobId required' });
      if (!columnBands) return res.status(400).json({ error: 'columnBands required in body' });

      // 1. Resolve column bands
      let bands = columnBands;
      if (typeof bands === 'string') bands = JSON.parse(bands);
      // If bands is an array (which custom extractors sometimes save), convert to record format
      let bandsObj: any = {};
      if (Array.isArray(bands)) {
        bands.forEach((b: any, i: number) => {
          bandsObj[b.key || `col_${i}`] = b;
        });
      } else {
        bandsObj = bands;
      }

      const headerY = headerYThreshold !== undefined ? Number(headerYThreshold) : 0.15;

      // 2. Load existing Vision JSON (DB ocr_result or feeder disk file)
      const [jobRows] = await promisePool.query('SELECT ocr_result, ocr_text, record_type FROM ocr_jobs WHERE id = ?', [jobId]);
      if (!(jobRows as any[]).length) return res.status(404).json({ error: 'Job not found' });

      let visionJsonStr = (jobRows as any[])[0].ocr_result;
      const recordType = (jobRows as any[])[0].record_type || 'unknown';
      const ocrText = (jobRows as any[])[0].ocr_text || '';

      // Fallback to disk
      if (!visionJsonStr) {
        const feederPath = path.join(
          '/var/www/orthodoxmetrics/prod/server/storage/feeder',
          `job_${jobId}`, 'page_0', 'vision_result.json'
        );
        if (fs.existsSync(feederPath)) {
          visionJsonStr = fs.readFileSync(feederPath, 'utf8');
        }
      }

      if (!visionJsonStr) {
        return res.status(400).json({ error: 'No OCR result available for this job' });
      }

      const visionJson = typeof visionJsonStr === 'string' ? JSON.parse(visionJsonStr) : visionJsonStr;

      // 3. Run extractGenericTable with custom bands
      const { extractGenericTable, tableToStructuredText } = require('../../ocr/layouts/generic_table');
      const tableExtractionResult = extractGenericTable(visionJson, {
        pageIndex: 0,
        headerY,
        columnBands: bandsObj,
      });

      // 4. Run extractRecordCandidates
      const { extractRecordCandidates } = require('../../ocr/columnMapper');
      const rawText = ocrText || '';
      const rcResult = extractRecordCandidates(tableExtractionResult, rawText, recordType);

      console.log(`[ReExtract] Job ${jobId} with custom bands → ${tableExtractionResult.data_rows} rows, ${rcResult.candidates.length} candidates`);

      // 5. Save artifacts to disk + ocr_feeder_artifacts table
      const timestamp = Date.now();
      const resolvedTenant = await resolveChurchDb(churchId);
      if (!resolvedTenant) return res.status(404).json({ error: 'Church not found' });
      const tenantPool = resolvedTenant.db;

      // Find page row
      const [pageRows] = await tenantPool.query(
        `SELECT id AS page_id, storage_dir FROM ocr_feeder_pages WHERE job_id = ? LIMIT 1`,
        [jobId]
      );

      if ((pageRows as any[]).length > 0) {
        const pageId = (pageRows as any[])[0].page_id;
        const pageStorageDir = (pageRows as any[])[0].storage_dir;

        if (pageStorageDir && fs.existsSync(pageStorageDir)) {
          // Save table extraction JSON
          const tableJsonPath = path.join(pageStorageDir, `table_extraction_custom_${timestamp}.json`);
          fs.writeFileSync(tableJsonPath, JSON.stringify(tableExtractionResult, null, 2));

          const structuredText = tableToStructuredText(tableExtractionResult);
          if (structuredText) {
            const structuredTxtPath = path.join(pageStorageDir, `_structured_custom_${timestamp}.txt`);
            fs.writeFileSync(structuredTxtPath, structuredText);

            await tenantPool.query(
              `INSERT INTO ocr_feeder_artifacts (page_id, type, storage_path, meta_json, created_at)
               VALUES (?, 'table_extraction', ?, ?, NOW())`,
              [pageId, structuredTxtPath, JSON.stringify({
                layout_id: tableExtractionResult.layout_id,
                data_rows: tableExtractionResult.data_rows,
                columns_detected: tableExtractionResult.columns_detected,
                custom_bands: true,
                appliedAt: new Date().toISOString(),
              })]
            );
          }

          // Save record candidates JSON
          const candidatesPath = path.join(pageStorageDir, `record_candidates_custom_${timestamp}.json`);
          fs.writeFileSync(candidatesPath, JSON.stringify(rcResult, null, 2));

          await tenantPool.query(
            `INSERT INTO ocr_feeder_artifacts (page_id, type, storage_path, json_blob, meta_json, created_at)
             VALUES (?, 'record_candidates', ?, ?, ?, NOW())`,
            [
              pageId,
              candidatesPath,
              JSON.stringify(rcResult),
              JSON.stringify({
                candidateCount: rcResult.candidates.length,
                custom_bands: true,
                appliedAt: new Date().toISOString(),
              })
            ]
          );
        }
      }

      res.json({
        success: true,
        tableExtraction: tableExtractionResult,
        recordCandidates: rcResult
      });
    } catch (error: any) {
      console.error('[ReExtract] Error:', error);
      res.status(500).json({ error: 'Re-extraction failed', message: error.message });
    }
  });

  // -----------------------------------------------------------------------
  // POST /jobs/:jobId/auto-extract — Auto-detect records without a template
  // -----------------------------------------------------------------------
  churchJobsRouter.post('/jobs/:jobId/auto-extract', async (req: any, res: any) => {
    try {
      const churchId = parseInt(req.params.churchId);
      const jobId = parseInt(req.params.jobId);

      if (!churchId || !jobId) return res.status(400).json({ error: 'churchId and jobId required' });

      // Check for existing record_candidates artifact (idempotency)
      const resolvedTenant = await resolveChurchDb(churchId);
      if (!resolvedTenant) return res.status(404).json({ error: 'Church not found' });
      const tenantPool = resolvedTenant.db;

      let pageRows: any[] = [];
      try {
        const [rows] = await tenantPool.query(
          `SELECT fp.id AS page_id, fp.storage_dir FROM ocr_feeder_pages fp
           JOIN ocr_feeder_jobs fj ON fp.feeder_job_id = fj.id
           WHERE fj.platform_job_id = ? LIMIT 1`,
          [jobId]
        );
        pageRows = rows as any[];

        if (pageRows.length > 0) {
          const pageId = (pageRows as any[])[0].page_id;
          // Check if record_candidates artifact already exists for this page
          const [existingArt] = await tenantPool.query(
            `SELECT json_blob FROM ocr_feeder_artifacts
             WHERE page_id = ? AND type = 'record_candidates'
             ORDER BY created_at DESC LIMIT 1`,
            [pageId]
          );
          if ((existingArt as any[]).length > 0) {
            const cached = (existingArt as any[])[0].json_blob;
            const rcResult = typeof cached === 'string' ? JSON.parse(cached) : cached;
            // Also load table extraction artifact
            const [teArt] = await tenantPool.query(
              `SELECT storage_path FROM ocr_feeder_artifacts
               WHERE page_id = ? AND type = 'table_extraction'
               ORDER BY created_at DESC LIMIT 1`,
              [pageId]
            );
            let tableExtraction = null;
            if ((teArt as any[]).length > 0) {
              const tePath = (teArt as any[])[0].storage_path;
              if (tePath && fs.existsSync(tePath)) {
                try { tableExtraction = JSON.parse(fs.readFileSync(tePath, 'utf8')); } catch {}
              }
            }
            console.log(`[AutoExtract] Job ${jobId}: returning cached ${rcResult?.candidates?.length || 0} candidates`);
            return res.json({ success: true, cached: true, tableExtraction, recordCandidates: rcResult });
          }
        }
      } catch (cacheErr: any) {
        // Feeder tables may not exist for this church — skip cache check
        console.log(`[AutoExtract] Job ${jobId}: cache check skipped (${cacheErr.code || cacheErr.message})`);
      }

      // 1. Load existing Vision JSON (DB ocr_result or feeder disk file)
      const [jobRows] = await promisePool.query('SELECT ocr_result, ocr_text, record_type FROM ocr_jobs WHERE id = ?', [jobId]);
      if (!(jobRows as any[]).length) return res.status(404).json({ error: 'Job not found' });

      let visionJsonStr = (jobRows as any[])[0].ocr_result;
      const recordType = (jobRows as any[])[0].record_type || 'unknown';
      const ocrText = (jobRows as any[])[0].ocr_text || '';

      // Fallback to disk
      if (!visionJsonStr) {
        const feederPath = path.join(
          '/var/www/orthodoxmetrics/prod/server/storage/feeder',
          `job_${jobId}`, 'page_0', 'vision_result.json'
        );
        if (fs.existsSync(feederPath)) {
          visionJsonStr = fs.readFileSync(feederPath, 'utf8');
        }
      }

      if (!visionJsonStr) {
        // No vision JSON — return text-only result with auto-detected record type
        const { extractRecordCandidates: extractRC } = require('../../ocr/columnMapper');
        const textOnlyResult = extractRC(null, ocrText, recordType);
        console.log(`[AutoExtract] Job ${jobId}: no vision JSON, text-only fallback, detected type: ${textOnlyResult.detectedType}`);
        return res.json({
          success: true,
          cached: false,
          textOnly: true,
          tableExtraction: null,
          recordCandidates: textOnlyResult,
        });
      }

      const visionJson = typeof visionJsonStr === 'string' ? JSON.parse(visionJsonStr) : visionJsonStr;

      // 2. Check for learned headerY threshold
      const resolvedForExtractor = await resolveChurchDb(churchId);
      let learnedHeaderY: number | undefined;
      try {
        const [extractorRows] = await resolvedForExtractor!.db.query(
          `SELECT header_y_threshold FROM ocr_extractors WHERE church_id = ? AND record_type = ? LIMIT 1`,
          [churchId, recordType]
        );
        if ((extractorRows as any[]).length > 0 && (extractorRows as any[])[0].header_y_threshold) {
          learnedHeaderY = parseFloat((extractorRows as any[])[0].header_y_threshold);
          console.log(`[AutoExtract] Job ${jobId}: using learned headerY=${learnedHeaderY} for church ${churchId}, type ${recordType}`);
        }
      } catch {
        // ocr_extractors table may not exist yet — that's OK
      }

      // Run extractGenericTable (with learned headerY if available)
      const { extractGenericTable, tableToStructuredText } = require('../../ocr/layouts/generic_table');
      const extractOpts: any = { pageIndex: 0 };
      if (learnedHeaderY) extractOpts.headerY = learnedHeaderY;
      const tableExtractionResult = extractGenericTable(visionJson, extractOpts);

      // 3. Run extractRecordCandidates
      const { extractRecordCandidates } = require('../../ocr/columnMapper');
      const rawText = ocrText || '';
      const rcResult = extractRecordCandidates(tableExtractionResult, rawText, recordType);

      console.log(`[AutoExtract] Job ${jobId}: auto-detected ${tableExtractionResult.columns_detected} cols, ${tableExtractionResult.data_rows} rows, ${rcResult.candidates.length} candidates`);

      // 4. Save artifacts to disk + ocr_feeder_artifacts table
      if ((pageRows as any[]).length > 0) {
        const pageId = (pageRows as any[])[0].page_id;
        const pageStorageDir = (pageRows as any[])[0].storage_dir;
        const timestamp = Date.now();

        if (pageStorageDir && fs.existsSync(pageStorageDir)) {
          // Save table extraction artifact
          const structuredText = tableToStructuredText(tableExtractionResult);
          const tableJsonPath = path.join(pageStorageDir, `table_extraction_auto_${timestamp}.json`);
          fs.writeFileSync(tableJsonPath, JSON.stringify(tableExtractionResult, null, 2));

          if (structuredText) {
            const structuredTxtPath = path.join(pageStorageDir, `_structured_auto_${timestamp}.txt`);
            fs.writeFileSync(structuredTxtPath, structuredText);

            await tenantPool.query(
              `INSERT INTO ocr_feeder_artifacts (page_id, type, storage_path, meta_json, created_at)
               VALUES (?, 'table_extraction', ?, ?, NOW())`,
              [pageId, structuredTxtPath, JSON.stringify({
                layout_id: tableExtractionResult.layout_id,
                data_rows: tableExtractionResult.data_rows,
                columns_detected: tableExtractionResult.columns_detected,
                auto_extracted: true,
                appliedAt: new Date().toISOString(),
              })]
            );
          }

          // Save record candidates artifact
          const rcPath = path.join(pageStorageDir, `record_candidates_auto_${timestamp}.json`);
          fs.writeFileSync(rcPath, JSON.stringify(rcResult, null, 2));

          await tenantPool.query(
            `INSERT INTO ocr_feeder_artifacts (page_id, type, storage_path, json_blob, meta_json, created_at)
             VALUES (?, 'record_candidates', ?, ?, ?, NOW())`,
            [pageId, rcPath, JSON.stringify(rcResult), JSON.stringify({
              candidateCount: rcResult.candidates.length,
              detectedType: rcResult.detectedType,
              typeConfidence: rcResult.typeConfidence,
              auto_extracted: true,
              appliedAt: new Date().toISOString(),
            })]
          );
        }
      }

      // 5. Return results
      res.json({
        success: true,
        cached: false,
        tableExtraction: tableExtractionResult,
        recordCandidates: rcResult,
      });
    } catch (error: any) {
      console.error('[AutoExtract] Error:', error);
      res.status(500).json({ error: 'Auto-extract failed', message: error.message });
    }
  });

  // -----------------------------------------------------------------------
  // POST /jobs/:jobId/reject-row — Mark a row as "not a record" and re-extract
  // -----------------------------------------------------------------------
  churchJobsRouter.post('/jobs/:jobId/reject-row', async (req: any, res: any) => {
    try {
      const churchId = parseInt(req.params.churchId);
      const jobId = parseInt(req.params.jobId);
      const { rowIndex, recordType: reqRecordType, tableExtraction: clientTableExtraction } = req.body;

      console.log(`[RejectRow] churchId=${churchId}, jobId=${jobId}, rowIndex=${rowIndex} (type: ${typeof rowIndex})`);
      if (!churchId || !jobId) return res.status(400).json({ error: 'churchId and jobId required' });
      if (rowIndex == null || typeof rowIndex !== 'number') {
        console.log(`[RejectRow] REJECTED: rowIndex validation failed. Body:`, JSON.stringify(req.body));
        return res.status(400).json({ error: 'rowIndex (number) required' });
      }

      const resolvedTenant = await resolveChurchDb(churchId);
      if (!resolvedTenant) return res.status(404).json({ error: 'Church not found' });
      const tenantPool = resolvedTenant.db;

      // 1. Load Vision JSON
      const [jobRows] = await promisePool.query('SELECT ocr_result, ocr_text, record_type FROM ocr_jobs WHERE id = ?', [jobId]);
      if (!(jobRows as any[]).length) return res.status(404).json({ error: 'Job not found' });

      let visionJsonStr = (jobRows as any[])[0].ocr_result;
      const recordType = reqRecordType || (jobRows as any[])[0].record_type || 'unknown';
      const ocrText = (jobRows as any[])[0].ocr_text || '';

      if (!visionJsonStr) {
        const feederPath = path.join(
          '/var/www/orthodoxmetrics/prod/server/storage/feeder',
          `job_${jobId}`, 'page_0', 'vision_result.json'
        );
        if (fs.existsSync(feederPath)) {
          visionJsonStr = fs.readFileSync(feederPath, 'utf8');
        }
      }

      if (!visionJsonStr) {
        return res.status(400).json({ error: 'No OCR result available for this job' });
      }

      const visionJson = typeof visionJsonStr === 'string' ? JSON.parse(visionJsonStr) : visionJsonStr;

      // 2. Find the rejected row — prefer saved table extraction, fall back to re-extracting
      const { extractGenericTable, tableToStructuredText } = require('../../ocr/layouts/generic_table');

      let initialExtraction: any = null;

      // Try client-sent table extraction first (most reliable — matches what user sees)
      if (clientTableExtraction?.tables?.length > 0) {
        initialExtraction = clientTableExtraction;
        console.log(`[RejectRow] Using client-sent table extraction`);
      }

      // Try loading saved table extraction artifact from disk
      if (!initialExtraction) {
        const storageDir = path.join('/var/www/orthodoxmetrics/prod/server/storage/feeder', `job_${jobId}`, 'page_0');
        if (fs.existsSync(storageDir)) {
          // Find the most recent table_extraction JSON
          const files = fs.readdirSync(storageDir).filter((f: string) => f.startsWith('table_extraction') && f.endsWith('.json'));
          if (files.length > 0) {
            files.sort().reverse(); // Most recent first
            try {
              const savedExtraction = JSON.parse(fs.readFileSync(path.join(storageDir, files[0]), 'utf8'));
              if (savedExtraction?.tables?.length > 0) {
                initialExtraction = savedExtraction;
                console.log(`[RejectRow] Using saved extraction from ${files[0]}`);
              }
            } catch (e) { /* ignore parse errors */ }
          }
        }
      }

      // Fall back to fresh extraction
      if (!initialExtraction) {
        initialExtraction = extractGenericTable(visionJson, { pageIndex: 0 });
        console.log(`[RejectRow] Using fresh extraction`);
      }

      // Find the rejected row in the extraction
      const table = initialExtraction.tables?.[0];
      if (!table) {
        console.log(`[RejectRow] No table found. tables count: ${initialExtraction.tables?.length}, total_tokens: ${initialExtraction.total_tokens}`);
        return res.status(400).json({ error: 'No table found in extraction' });
      }

      const rejectedRow = table.rows?.find((r: any) => r.row_index === rowIndex);
      if (!rejectedRow) return res.status(400).json({ error: `Row ${rowIndex} not found in extraction` });

      // Get the y_max of the rejected row's cells
      let rejectedYMax = 0;
      for (const cell of (rejectedRow.cells || [])) {
        if (cell.bbox && cell.bbox.length >= 4) {
          rejectedYMax = Math.max(rejectedYMax, cell.bbox[3]); // bbox[3] = y_max (fractional)
        }
      }

      if (rejectedYMax <= 0) {
        return res.status(400).json({ error: 'Could not determine rejected row bounds' });
      }

      // 3. Re-extract with new headerY threshold
      const newHeaderY = rejectedYMax + 0.01;
      const tableExtractionResult = extractGenericTable(visionJson, { pageIndex: 0, headerY: newHeaderY });

      // 4. Re-run record candidate extraction
      const { extractRecordCandidates } = require('../../ocr/columnMapper');
      const rcResult = extractRecordCandidates(tableExtractionResult, ocrText, recordType);

      console.log(`[RejectRow] Job ${jobId}: rejected row ${rowIndex}, new headerY=${newHeaderY.toFixed(3)}, ${rcResult.candidates.length} candidates`);

      // 5. Save updated artifacts
      const [pageRows] = await tenantPool.query(
        `SELECT fp.id AS page_id, fp.storage_dir FROM ocr_feeder_pages fp
         JOIN ocr_feeder_jobs fj ON fp.feeder_job_id = fj.id
         WHERE fj.platform_job_id = ? LIMIT 1`,
        [jobId]
      );

      if ((pageRows as any[]).length > 0) {
        const pageId = (pageRows as any[])[0].page_id;
        const pageStorageDir = (pageRows as any[])[0].storage_dir;
        const timestamp = Date.now();

        if (pageStorageDir && fs.existsSync(pageStorageDir)) {
          // Save table extraction
          const tableJsonPath = path.join(pageStorageDir, `table_extraction_reject_${timestamp}.json`);
          fs.writeFileSync(tableJsonPath, JSON.stringify(tableExtractionResult, null, 2));

          const structuredText = tableToStructuredText(tableExtractionResult);
          if (structuredText) {
            const structuredTxtPath = path.join(pageStorageDir, `_structured_reject_${timestamp}.txt`);
            fs.writeFileSync(structuredTxtPath, structuredText);

            // Update/insert table_extraction artifact
            await tenantPool.query(
              `INSERT INTO ocr_feeder_artifacts (page_id, type, storage_path, meta_json, created_at)
               VALUES (?, 'table_extraction', ?, ?, NOW())`,
              [pageId, structuredTxtPath, JSON.stringify({
                layout_id: tableExtractionResult.layout_id,
                data_rows: tableExtractionResult.data_rows,
                columns_detected: tableExtractionResult.columns_detected,
                header_y_threshold: newHeaderY,
                rejected_row_index: rowIndex,
                appliedAt: new Date().toISOString(),
              })]
            );
          }

          // Save record candidates
          const rcPath = path.join(pageStorageDir, `record_candidates_reject_${timestamp}.json`);
          fs.writeFileSync(rcPath, JSON.stringify(rcResult, null, 2));

          await tenantPool.query(
            `INSERT INTO ocr_feeder_artifacts (page_id, type, storage_path, json_blob, meta_json, created_at)
             VALUES (?, 'record_candidates', ?, ?, ?, NOW())`,
            [pageId, rcPath, JSON.stringify(rcResult), JSON.stringify({
              candidateCount: rcResult.candidates.length,
              detectedType: rcResult.detectedType,
              header_y_threshold: newHeaderY,
              rejected_row_index: rowIndex,
              appliedAt: new Date().toISOString(),
            })]
          );
        }

        // 6. Store learned headerY in ocr_extractors for this church+recordType
        try {
          await tenantPool.query(
            `CREATE TABLE IF NOT EXISTS ocr_extractors (
              id INT AUTO_INCREMENT PRIMARY KEY,
              church_id INT NOT NULL,
              record_type VARCHAR(50) NOT NULL,
              header_y_threshold DECIMAL(6,4),
              meta_json JSON,
              updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
              UNIQUE KEY uq_church_type (church_id, record_type)
            )`
          );

          await tenantPool.query(
            `INSERT INTO ocr_extractors (church_id, record_type, header_y_threshold, meta_json, updated_at)
             VALUES (?, ?, ?, ?, NOW())
             ON DUPLICATE KEY UPDATE header_y_threshold = VALUES(header_y_threshold), meta_json = VALUES(meta_json), updated_at = NOW()`,
            [churchId, recordType, newHeaderY, JSON.stringify({ learned_from_job: jobId, rejected_row: rowIndex })]
          );
          console.log(`[RejectRow] Saved learned headerY=${newHeaderY.toFixed(3)} for church ${churchId}, type ${recordType}`);
        } catch (extractorErr: any) {
          console.warn('[RejectRow] Failed to save to ocr_extractors:', extractorErr.message);
        }
      }

      res.json({
        success: true,
        headerY: newHeaderY,
        tableExtraction: tableExtractionResult,
        recordCandidates: rcResult,
      });
    } catch (error: any) {
      console.error('[RejectRow] Error:', error);
      res.status(500).json({ error: 'Reject-row failed', message: error.message });
    }
  });

  // -----------------------------------------------------------------------
  // POST /jobs/:jobId/reextract-row — Re-extract a single record from adjusted bbox
  // -----------------------------------------------------------------------
  churchJobsRouter.post('/jobs/:jobId/reextract-row', async (req: any, res: any) => {
    try {
      const churchId = parseInt(req.params.churchId);
      const jobId = parseInt(req.params.jobId);
      const { recordIndex, bbox } = req.body;

      if (!jobId) return res.status(400).json({ error: 'jobId required' });
      if (bbox == null || typeof bbox.x_min !== 'number' || typeof bbox.y_min !== 'number'
        || typeof bbox.x_max !== 'number' || typeof bbox.y_max !== 'number') {
        return res.status(400).json({ error: 'bbox with x_min, y_min, x_max, y_max (fractional 0..1) required' });
      }

      // 1. Load Vision JSON
      const [jobRows] = await promisePool.query('SELECT ocr_result, record_type FROM ocr_jobs WHERE id = ?', [jobId]);
      if (!(jobRows as any[]).length) return res.status(404).json({ error: 'Job not found' });

      let visionJsonStr = (jobRows as any[])[0].ocr_result;
      const recordType = (jobRows as any[])[0].record_type || 'unknown';

      if (!visionJsonStr) {
        const feederPath = path.join(
          '/var/www/orthodoxmetrics/prod/server/storage/feeder',
          `job_${jobId}`, 'page_0', 'vision_result.json'
        );
        if (fs.existsSync(feederPath)) {
          visionJsonStr = fs.readFileSync(feederPath, 'utf8');
        }
      }

      if (!visionJsonStr) {
        return res.status(400).json({ error: 'No OCR result available for this job' });
      }

      const visionJson = typeof visionJsonStr === 'string' ? JSON.parse(visionJsonStr) : visionJsonStr;

      // 2. Extract all word tokens
      const { extractWordTokens } = require('../../ocr/layouts/generic_table');
      const allTokens = extractWordTokens(visionJson, 0);

      // 3. Filter tokens within the adjusted bbox (using x_center, y_center)
      const filteredTokens = allTokens.filter((t: any) =>
        t.x_center >= bbox.x_min && t.x_center <= bbox.x_max &&
        t.y_center >= bbox.y_min && t.y_center <= bbox.y_max
      );

      // 4. Load column_bands from the most recent table extraction artifact
      const resolvedTenant = await resolveChurchDb(churchId);
      if (!resolvedTenant) return res.status(404).json({ error: 'Church not found' });
      const tenantPool = resolvedTenant.db;

      const [pageRows] = await tenantPool.query(
        `SELECT fp.id AS page_id FROM ocr_feeder_pages fp
         JOIN ocr_feeder_jobs fj ON fp.feeder_job_id = fj.id
         WHERE fj.platform_job_id = ? LIMIT 1`,
        [jobId]
      );

      let columnBands: Record<string, number[]> = {};
      let columnMapping: Record<string, string> = {};

      if ((pageRows as any[]).length > 0) {
        const pageId = (pageRows as any[])[0].page_id;

        // Load table extraction for column_bands
        const [teArt] = await tenantPool.query(
          `SELECT storage_path FROM ocr_feeder_artifacts
           WHERE page_id = ? AND type = 'table_extraction'
           ORDER BY created_at DESC LIMIT 1`,
          [pageId]
        );
        if ((teArt as any[]).length > 0) {
          const tePath = (teArt as any[])[0].storage_path;
          if (tePath && fs.existsSync(tePath)) {
            try {
              const teJson = JSON.parse(fs.readFileSync(tePath, 'utf8'));
              columnBands = teJson.column_bands || {};
            } catch {}
          }
        }

        // Load record_candidates for columnMapping
        const [rcArt] = await tenantPool.query(
          `SELECT json_blob FROM ocr_feeder_artifacts
           WHERE page_id = ? AND type = 'record_candidates'
           ORDER BY created_at DESC LIMIT 1`,
          [pageId]
        );
        if ((rcArt as any[]).length > 0) {
          try {
            const rcJson = typeof (rcArt as any[])[0].json_blob === 'string'
              ? JSON.parse((rcArt as any[])[0].json_blob)
              : (rcArt as any[])[0].json_blob;
            columnMapping = rcJson.columnMapping || {};
          } catch {}
        }
      }

      // 5. For each column band, extract cell text from filtered tokens
      const fields: Record<string, string> = {};
      const bandEntries = Object.entries(columnBands);

      for (const [colKey, band] of bandEntries) {
        const [bandStart, bandEnd] = band as unknown as [number, number];
        const cellTokens = filteredTokens.filter((t: any) =>
          t.x_center >= bandStart && t.x_center <= bandEnd
        );
        // Sort by y then x for reading order
        cellTokens.sort((a: any, b: any) => a.y_center - b.y_center || a.x_center - b.x_center);
        const cellText = cellTokens.map((t: any) => t.text).join(' ').trim();

        // Map column key to field key
        const fieldKey = columnMapping[colKey];
        if (fieldKey && cellText) {
          fields[fieldKey] = cellText;
        } else if (cellText) {
          // Store under column key if no mapping exists
          fields[colKey] = cellText;
        }
      }

      res.json({
        success: true,
        recordIndex: recordIndex ?? null,
        fields,
        bbox,
        tokenCount: filteredTokens.length,
      });
    } catch (error: any) {
      console.error('[ReextractRow] Error:', error);
      res.status(500).json({ error: 'Re-extract row failed', message: error.message });
    }
  });

  // -----------------------------------------------------------------------
  // POST /jobs/:jobId/crop-reocr — Crop a region and re-OCR with Vision API
  // -----------------------------------------------------------------------
  churchJobsRouter.post('/jobs/:jobId/crop-reocr', async (req: any, res: any) => {
    try {
      const churchId = parseInt(req.params.churchId);
      const jobId = parseInt(req.params.jobId);
      const { bbox } = req.body;

      if (!jobId) return res.status(400).json({ error: 'jobId required' });
      if (!bbox || typeof bbox.x_min !== 'number' || typeof bbox.y_min !== 'number'
        || typeof bbox.x_max !== 'number' || typeof bbox.y_max !== 'number') {
        return res.status(400).json({ error: 'bbox with x_min, y_min, x_max, y_max (fractional 0..1) required' });
      }

      console.log(`[CropReOCR] Job ${jobId}, bbox: ${JSON.stringify(bbox)}`);

      // 1. Locate source image (same resolution logic as /jobs/:jobId/image)
      const [rows] = await promisePool.query('SELECT filename, record_type FROM ocr_jobs WHERE id = ? AND church_id = ?', [jobId, churchId]);
      if (!(rows as any[]).length) return res.status(404).json({ error: 'Job not found' });

      const jobFilename = (rows as any[])[0].filename;
      const recordType = (rows as any[])[0].record_type || 'unknown';

      // Try preprocessed image first
      let imagePath: string | null = null;
      const preprocPath = path.join(__dirname, '..', '..', '..', 'storage', 'feeder', `job_${jobId}`, 'page_0', 'preprocessed.jpg');
      if (fs.existsSync(preprocPath)) {
        imagePath = preprocPath;
      }

      if (!imagePath) {
        // Search standard upload locations
        if (jobFilename.startsWith('/') && !jobFilename.startsWith('/uploads/') && !jobFilename.startsWith('/server/uploads/')) {
          if (fs.existsSync(jobFilename)) imagePath = jobFilename;
        }
        if (!imagePath && (jobFilename.startsWith('/uploads/') || jobFilename.startsWith('/server/uploads/'))) {
          const abs = path.join('/var/www/orthodoxmetrics/prod', jobFilename);
          if (fs.existsSync(abs)) imagePath = abs;
        }
        if (!imagePath) {
          const baseDirs = [
            path.join('/var/www/orthodoxmetrics/prod/uploads', `om_church_${churchId}`),
            path.join('/var/www/orthodoxmetrics/prod/server/uploads', `om_church_${churchId}`),
          ];
          for (const base of baseDirs) {
            for (const sub of ['uploaded', 'processed']) {
              const candidate = path.join(base, sub, jobFilename);
              if (fs.existsSync(candidate)) { imagePath = candidate; break; }
            }
            if (imagePath) break;
          }
          if (!imagePath) {
            const ocrCandidate = path.join('/var/www/orthodoxmetrics/prod/server/uploads', 'ocr', `church_${churchId}`, jobFilename);
            if (fs.existsSync(ocrCandidate)) imagePath = ocrCandidate;
          }
        }
      }

      if (!imagePath) {
        return res.status(404).json({ error: 'Source image not found on disk' });
      }

      // 2. Crop the image using sharp
      const sharp = require('sharp');
      const metadata = await sharp(imagePath).metadata();
      const imgW = metadata.width!;
      const imgH = metadata.height!;

      const left = Math.round(Math.max(0, bbox.x_min) * imgW);
      const top = Math.round(Math.max(0, bbox.y_min) * imgH);
      const cropW = Math.round(Math.min(1, bbox.x_max) * imgW) - left;
      const cropH = Math.round(Math.min(1, bbox.y_max) * imgH) - top;

      if (cropW < 10 || cropH < 10) {
        return res.status(400).json({ error: 'Crop region too small (min 10px)' });
      }

      const croppedBuffer = await sharp(imagePath)
        .extract({ left, top, width: cropW, height: cropH })
        .toBuffer();

      console.log(`[CropReOCR] Cropped ${imgW}x${imgH} → ${cropW}x${cropH} from (${left},${top})`);

      // 3. Send cropped image to Google Vision API
      const vision = require('@google-cloud/vision');
      const visionConfig: any = { projectId: process.env.GOOGLE_CLOUD_PROJECT_ID };
      if (process.env.GOOGLE_VISION_KEY_PATH) visionConfig.keyFilename = process.env.GOOGLE_VISION_KEY_PATH;
      else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) visionConfig.keyFilename = process.env.GOOGLE_APPLICATION_CREDENTIALS;
      const client = new vision.ImageAnnotatorClient(visionConfig);

      const VISION_TIMEOUT_MS = 60000;
      const visionPromise = client.annotateImage({
        image: { content: croppedBuffer },
        imageContext: { languageHints: ['el', 'ru', 'en'] },
        features: [{ type: 'DOCUMENT_TEXT_DETECTION' }],
      });
      const timeoutPromise = new Promise((_: any, reject: any) =>
        setTimeout(() => reject(new Error(`Vision API timed out after ${VISION_TIMEOUT_MS / 1000}s`)), VISION_TIMEOUT_MS)
      );
      const [visionResult] = await Promise.race([visionPromise, timeoutPromise]) as any[];

      const document = visionResult.fullTextAnnotation;
      const fullText = document?.text || '';

      // 4. Extract word-level tokens with positions relative to crop
      const visionPages = document?.pages || [];
      const tokens: Array<{ text: string; x_frac: number; y_frac: number }> = [];
      for (const page of visionPages) {
        for (const block of (page.blocks || [])) {
          for (const para of (block.paragraphs || [])) {
            for (const word of (para.words || [])) {
              const wordText = (word.symbols || []).map((s: any) => s.text).join('');
              const verts = word.boundingBox?.vertices || [];
              if (verts.length >= 4) {
                const cx = (verts[0].x + verts[2].x) / 2;
                const cy = (verts[0].y + verts[2].y) / 2;
                tokens.push({
                  text: wordText,
                  x_frac: cx / cropW,
                  y_frac: cy / cropH,
                });
              }
            }
          }
        }
      }

      // 5. Map tokens to column bands if available
      const fields: Record<string, string> = {};

      // Load table_extraction.json for column bands
      const tePath = path.join(
        '/var/www/orthodoxmetrics/prod/server/storage/feeder',
        `job_${jobId}`, 'page_0', 'table_extraction.json'
      );
      let columnBands: Record<string, number[]> = {};
      if (fs.existsSync(tePath)) {
        try {
          const teJson = JSON.parse(fs.readFileSync(tePath, 'utf8'));
          columnBands = teJson.column_bands || {};
        } catch {}
      }

      if (Object.keys(columnBands).length > 0) {
        // Map crop-relative x positions back to full-image x positions
        for (const [colKey, band] of Object.entries(columnBands)) {
          const [bandStart, bandEnd] = band as unknown as [number, number];
          const colTokens = tokens.filter((t) => {
            // Convert crop-relative x_frac to full-image fractional x
            const fullX = bbox.x_min + t.x_frac * (bbox.x_max - bbox.x_min);
            return fullX >= bandStart && fullX <= bandEnd;
          });
          colTokens.sort((a, b) => a.y_frac - b.y_frac || a.x_frac - b.x_frac);
          const cellText = colTokens.map((t) => t.text).join(' ').trim();
          if (cellText) fields[colKey] = cellText;
        }
      }

      // 6. Save result to storage
      const timestamp = Date.now();
      const storageDir = path.join(
        '/var/www/orthodoxmetrics/prod/server/storage/feeder',
        `job_${jobId}`, 'page_0'
      );
      fs.mkdirSync(storageDir, { recursive: true });

      const cropResultPath = path.join(storageDir, `crop_vision_${timestamp}.json`);
      const cropResult = {
        bbox,
        text: fullText,
        fields,
        tokenCount: tokens.length,
        cropDimensions: { width: cropW, height: cropH },
        timestamp: new Date().toISOString(),
      };
      fs.writeFileSync(cropResultPath, JSON.stringify(cropResult, null, 2));

      console.log(`[CropReOCR] Done. ${tokens.length} tokens, ${Object.keys(fields).length} fields mapped, saved to ${cropResultPath}`);

      res.json({
        success: true,
        text: fullText,
        fields,
        bbox,
        tokenCount: tokens.length,
      });
    } catch (error: any) {
      console.error('[CropReOCR] Error:', error);
      res.status(500).json({ error: 'Crop re-OCR failed', message: error.message });
    }
  });

  // -----------------------------------------------------------------------
  // POST /jobs/:jobId/learn-from-confirmations — Learn extraction params from user-confirmed records
  // -----------------------------------------------------------------------
  churchJobsRouter.post('/jobs/:jobId/learn-from-confirmations', async (req: any, res: any) => {
    try {
      const churchId = parseInt(req.params.churchId);
      const jobId = parseInt(req.params.jobId);
      const { confirmedRecords, rejectedRowIndices } = req.body;

      if (!churchId || !jobId) return res.status(400).json({ error: 'churchId and jobId required' });
      if (!confirmedRecords || !Array.isArray(confirmedRecords) || confirmedRecords.length === 0) {
        return res.status(400).json({ error: 'confirmedRecords array required (non-empty)' });
      }

      // 1. Load Vision JSON (same pattern)
      const [jobRows] = await promisePool.query('SELECT ocr_result, ocr_text, record_type FROM ocr_jobs WHERE id = ?', [jobId]);
      if (!(jobRows as any[]).length) return res.status(404).json({ error: 'Job not found' });

      let visionJsonStr = (jobRows as any[])[0].ocr_result;
      const recordType = (jobRows as any[])[0].record_type || 'unknown';
      const ocrText = (jobRows as any[])[0].ocr_text || '';

      if (!visionJsonStr) {
        const feederPath = path.join(
          '/var/www/orthodoxmetrics/prod/server/storage/feeder',
          `job_${jobId}`, 'page_0', 'vision_result.json'
        );
        if (fs.existsSync(feederPath)) {
          visionJsonStr = fs.readFileSync(feederPath, 'utf8');
        }
      }
      if (!visionJsonStr) {
        return res.status(400).json({ error: 'No OCR result available for this job' });
      }
      const visionJson = typeof visionJsonStr === 'string' ? JSON.parse(visionJsonStr) : visionJsonStr;

      // 2. Compute learned parameters from confirmed records
      const heights = confirmedRecords.map((r: any) => r.bbox.y_max - r.bbox.y_min);
      const avgRowHeight = heights.reduce((s: number, h: number) => s + h, 0) / heights.length;

      // Sort by y_min for spacing calculation
      const sortedConfirmed = [...confirmedRecords].sort((a: any, b: any) => a.bbox.y_min - b.bbox.y_min);
      let avgRowSpacing = avgRowHeight; // fallback
      if (sortedConfirmed.length > 1) {
        const spacings: number[] = [];
        for (let i = 1; i < sortedConfirmed.length; i++) {
          const yCenterPrev = (sortedConfirmed[i - 1].bbox.y_min + sortedConfirmed[i - 1].bbox.y_max) / 2;
          const yCenterCurr = (sortedConfirmed[i].bbox.y_min + sortedConfirmed[i].bbox.y_max) / 2;
          spacings.push(yCenterCurr - yCenterPrev);
        }
        avgRowSpacing = spacings.reduce((s, v) => s + v, 0) / spacings.length;
      }

      // Header Y = just above the first confirmed record
      const headerYThreshold = Math.max(0.01, sortedConfirmed[0].bbox.y_min - avgRowHeight * 0.5);
      const mergeThreshold = avgRowHeight * 1.2;

      console.log(`[LearnFromConfirmations] Job ${jobId}: ${confirmedRecords.length} confirmed, avgRowHeight=${avgRowHeight.toFixed(4)}, spacing=${avgRowSpacing.toFixed(4)}, headerY=${headerYThreshold.toFixed(4)}, mergeThreshold=${mergeThreshold.toFixed(4)}`);

      // 3. Re-run extraction with learned parameters
      const { extractGenericTable, tableToStructuredText } = require('../../ocr/layouts/generic_table');
      const tableExtractionResult = extractGenericTable(visionJson, {
        pageIndex: 0,
        headerY: headerYThreshold,
        mergeThreshold,
      });

      // 4. Run extractRecordCandidates on new extraction
      const { extractRecordCandidates } = require('../../ocr/columnMapper');
      const rcResult = extractRecordCandidates(tableExtractionResult, ocrText || '', recordType);

      // 5. Filter out rejected rows
      const rejected = new Set(rejectedRowIndices || []);
      if (rejected.size > 0) {
        rcResult.candidates = rcResult.candidates.filter((c: any) => !rejected.has(c.sourceRowIndex));
      }

      // 6. Save updated artifacts
      const resolvedTenant = await resolveChurchDb(churchId);
      if (!resolvedTenant) return res.status(404).json({ error: 'Church not found' });
      const tenantPool = resolvedTenant.db;
      const [pageRows] = await tenantPool.query(
        `SELECT fp.id AS page_id, fp.storage_dir FROM ocr_feeder_pages fp
         JOIN ocr_feeder_jobs fj ON fp.feeder_job_id = fj.id
         WHERE fj.platform_job_id = ? LIMIT 1`,
        [jobId]
      );

      if ((pageRows as any[]).length > 0) {
        const pageId = (pageRows as any[])[0].page_id;
        const pageStorageDir = (pageRows as any[])[0].storage_dir;
        const timestamp = Date.now();

        if (pageStorageDir && fs.existsSync(pageStorageDir)) {
          const structuredText = tableToStructuredText(tableExtractionResult);
          const tableJsonPath = path.join(pageStorageDir, `table_extraction_learned_${timestamp}.json`);
          fs.writeFileSync(tableJsonPath, JSON.stringify(tableExtractionResult, null, 2));

          if (structuredText) {
            const structuredTxtPath = path.join(pageStorageDir, `_structured_learned_${timestamp}.txt`);
            fs.writeFileSync(structuredTxtPath, structuredText);
            await tenantPool.query(
              `INSERT INTO ocr_feeder_artifacts (page_id, type, storage_path, meta_json, created_at)
               VALUES (?, 'table_extraction', ?, ?, NOW())`,
              [pageId, structuredTxtPath, JSON.stringify({
                layout_id: tableExtractionResult.layout_id,
                data_rows: tableExtractionResult.data_rows,
                columns_detected: tableExtractionResult.columns_detected,
                learned: true,
                appliedAt: new Date().toISOString(),
              })]
            );
          }

          const rcPath = path.join(pageStorageDir, `record_candidates_learned_${timestamp}.json`);
          fs.writeFileSync(rcPath, JSON.stringify(rcResult, null, 2));
          await tenantPool.query(
            `INSERT INTO ocr_feeder_artifacts (page_id, type, storage_path, json_blob, meta_json, created_at)
             VALUES (?, 'record_candidates', ?, ?, ?, NOW())`,
            [pageId, rcPath, JSON.stringify(rcResult), JSON.stringify({
              candidateCount: rcResult.candidates.length,
              detectedType: rcResult.detectedType,
              typeConfidence: rcResult.typeConfidence,
              learned: true,
              confirmedCount: confirmedRecords.length,
              appliedAt: new Date().toISOString(),
            })]
          );
        }
      }

      // 7. Return results
      const learnedParams = {
        avgRowHeight,
        avgRowSpacing,
        headerYThreshold,
        mergeThreshold,
        columnBands: tableExtractionResult.column_bands || {},
        confidence: confirmedRecords.length >= 3 ? 0.85 : 0.6,
      };

      res.json({
        success: true,
        learnedParams,
        tableExtraction: tableExtractionResult,
        recordCandidates: rcResult,
      });
    } catch (error: any) {
      console.error('[LearnFromConfirmations] Error:', error);
      res.status(500).json({ error: 'Learn from confirmations failed', message: error.message });
    }
  });

  // -----------------------------------------------------------------------
  // POST /jobs/:jobId/finalize-review — Save confirmed records + optionally create template
  // -----------------------------------------------------------------------
  churchJobsRouter.post('/jobs/:jobId/finalize-review', async (req: any, res: any) => {
    try {
      const churchId = parseInt(req.params.churchId);
      const jobId = parseInt(req.params.jobId);
      const { confirmedIndices, rejectedIndices, learnedParams, saveAsTemplate, templateName } = req.body;

      if (!churchId || !jobId) return res.status(400).json({ error: 'churchId and jobId required' });
      if (!confirmedIndices || !Array.isArray(confirmedIndices)) {
        return res.status(400).json({ error: 'confirmedIndices array required' });
      }

      // 1. Load current record_candidates from artifacts
      const resolvedTenant = await resolveChurchDb(churchId);
      if (!resolvedTenant) return res.status(404).json({ error: 'Church not found' });
      const tenantPool = resolvedTenant.db;

      const [pageRows] = await tenantPool.query(
        `SELECT fp.id AS page_id, fp.storage_dir FROM ocr_feeder_pages fp
         JOIN ocr_feeder_jobs fj ON fp.feeder_job_id = fj.id
         WHERE fj.platform_job_id = ? LIMIT 1`,
        [jobId]
      );

      let rcResult: any = null;
      let pageId: number | null = null;
      let pageStorageDir: string | null = null;

      if ((pageRows as any[]).length > 0) {
        pageId = (pageRows as any[])[0].page_id;
        pageStorageDir = (pageRows as any[])[0].storage_dir;

        const [rcArt] = await tenantPool.query(
          `SELECT json_blob FROM ocr_feeder_artifacts
           WHERE page_id = ? AND type = 'record_candidates'
           ORDER BY created_at DESC LIMIT 1`,
          [pageId]
        );
        if ((rcArt as any[]).length > 0) {
          rcResult = typeof (rcArt as any[])[0].json_blob === 'string'
            ? JSON.parse((rcArt as any[])[0].json_blob)
            : (rcArt as any[])[0].json_blob;
        }
      }

      if (!rcResult) {
        return res.status(400).json({ error: 'No record candidates found for this job' });
      }

      // 2. Filter to confirmed-only candidates
      const confirmedSet = new Set(confirmedIndices);
      const confirmedCandidates = rcResult.candidates.filter((_: any, idx: number) => confirmedSet.has(idx));
      const updatedResult = { ...rcResult, candidates: confirmedCandidates };

      // 3. Save updated artifact
      if (pageId && pageStorageDir && fs.existsSync(pageStorageDir)) {
        const timestamp = Date.now();
        const rcPath = path.join(pageStorageDir, `record_candidates_reviewed_${timestamp}.json`);
        fs.writeFileSync(rcPath, JSON.stringify(updatedResult, null, 2));
        await tenantPool.query(
          `INSERT INTO ocr_feeder_artifacts (page_id, type, storage_path, json_blob, meta_json, created_at)
           VALUES (?, 'record_candidates', ?, ?, ?, NOW())`,
          [pageId, rcPath, JSON.stringify(updatedResult), JSON.stringify({
            candidateCount: confirmedCandidates.length,
            reviewed: true,
            confirmedCount: confirmedIndices.length,
            rejectedCount: (rejectedIndices || []).length,
            appliedAt: new Date().toISOString(),
          })]
        );
      }

      // 4. Optionally save as template
      let templateId: number | null = null;
      if (saveAsTemplate && learnedParams) {
        const [jobRows] = await promisePool.query('SELECT record_type FROM ocr_jobs WHERE id = ?', [jobId]);
        const recordType = (jobRows as any[])[0]?.record_type || 'unknown';

        // Convert column_bands object to array format for ocr_extractors
        const columnBandsArr = Object.entries(learnedParams.columnBands || {}).map(([, band]: [string, any]) => band);

        const [insertResult] = await promisePool.query(
          `INSERT INTO ocr_extractors (name, record_type, church_id, column_bands, header_y_threshold, learned_params, is_default, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, 0, NOW(), NOW())`,
          [
            templateName || `${recordType} learned layout`,
            recordType,
            churchId,
            JSON.stringify(columnBandsArr),
            learnedParams.headerYThreshold || 0.15,
            JSON.stringify(learnedParams),
          ]
        );
        templateId = (insertResult as any).insertId;
        console.log(`[FinalizeReview] Created template #${templateId} for church ${churchId}`);
      }

      console.log(`[FinalizeReview] Job ${jobId}: ${confirmedCandidates.length} confirmed, ${(rejectedIndices || []).length} rejected, template=${templateId}`);

      res.json({
        success: true,
        recordCandidates: updatedResult,
        confirmedCount: confirmedCandidates.length,
        templateId,
      });
    } catch (error: any) {
      console.error('[FinalizeReview] Error:', error);
      res.status(500).json({ error: 'Finalize review failed', message: error.message });
    }
  });

  // =========================================================================
  // PLATFORM-SCOPED ROUTER  (mounted at /api/ocr)
  // =========================================================================
  const platformJobsRouter = express.Router();

  // -----------------------------------------------------------------------
  // 1. GET /jobs — Platform-only job status (fast, safe to poll)
  // -----------------------------------------------------------------------
  platformJobsRouter.get('/jobs', async (req: any, res: any) => {
    try {
      // Accept both church_id and churchId for compatibility
      const churchId = parseInt((req.query.church_id || req.query.churchId) as string);
      if (!churchId) return res.status(400).json({ error: 'church_id query param required', jobs: [] });

      const [rows] = await promisePool.query(`
        SELECT id, church_id, filename, status, record_type, language,
               confidence_score, error_regions, created_at,
               classifier_suggested_type, classifier_confidence, layout_classification_json
        FROM ocr_jobs
        WHERE church_id = ?
        ORDER BY created_at DESC
        LIMIT 200
      `, [churchId]);

      const jobs = (rows as any[]).map((r: any) => {
        const extractionPath = path.join('/var/www/orthodoxmetrics/prod/server/var/ocr_artifacts', String(r.id), 'table_extraction.json');
        let parsedLayout = null;
        if (r.layout_classification_json) {
          try {
            parsedLayout = typeof r.layout_classification_json === 'string'
              ? JSON.parse(r.layout_classification_json)
              : r.layout_classification_json;
          } catch (e) {
            console.warn('[Jobs API] Failed to parse layout_classification_json:', e);
          }
        }
        return {
          id: r.id,
          filename: r.filename,
          status: r.status,
          record_type: r.record_type,
          language: r.language,
          confidence_score: r.confidence_score,
          error_regions: r.error_regions,
          created_at: r.created_at,
          has_table_extraction: fs.existsSync(extractionPath),
          classifier_suggested_type: r.classifier_suggested_type || null,
          classifier_confidence: r.classifier_confidence || null,
          layout_classification_json: parsedLayout,
        };
      });

      res.json({ jobs });
    } catch (error: any) {
      console.error('[OCR Jobs Poll] Error:', error.message);
      res.status(500).json({ error: 'Failed to fetch jobs', jobs: [] });
    }
  });

  // -----------------------------------------------------------------------
  // 2. GET /jobs/:jobId — Platform-only job detail
  // -----------------------------------------------------------------------
  platformJobsRouter.get('/jobs/:jobId', async (req: any, res: any) => {
    try {
      const jobId = parseInt(req.params.jobId);
      if (!jobId) return res.status(400).json({ error: 'Invalid jobId' });

      const [rows] = await promisePool.query(
        `SELECT id, church_id, filename, status, record_type, language,
                confidence_score, error_regions, ocr_text, ocr_result, created_at,
                classifier_suggested_type, classifier_confidence, layout_classification_json
         FROM ocr_jobs WHERE id = ?`, [jobId]
      );
      if (!(rows as any[]).length) return res.status(404).json({ error: 'Job not found' });

      const job = (rows as any[])[0];
      let ocrResult = null;
      if (job.ocr_result) {
        try { ocrResult = typeof job.ocr_result === 'string' ? JSON.parse(job.ocr_result) : job.ocr_result; }
        catch { ocrResult = job.ocr_result; }
      }

      let parsedLayout = null;
      if (job.layout_classification_json) {
        try {
          parsedLayout = typeof job.layout_classification_json === 'string'
            ? JSON.parse(job.layout_classification_json)
            : job.layout_classification_json;
        } catch (e) {
          console.warn('[Job Detail API] Failed to parse layout_classification_json:', e);
        }
      }

      // Check for table extraction artifact
      const artifactDir = path.join('/var/www/orthodoxmetrics/prod/server/var/ocr_artifacts', String(jobId));
      const extractionPath = path.join(artifactDir, 'table_extraction.json');
      let tableExtraction = null;
      let hasTableExtraction = false;
      if (fs.existsSync(extractionPath)) {
        hasTableExtraction = true;
        try {
          tableExtraction = JSON.parse(fs.readFileSync(extractionPath, 'utf8'));
        } catch { /* ignore parse errors */ }
      }

      // List available artifacts
      let artifacts: string[] = [];
      if (fs.existsSync(artifactDir)) {
        artifacts = fs.readdirSync(artifactDir).filter((f: string) => !f.startsWith('.'));
      }

      res.json({
        id: job.id,
        church_id: job.church_id,
        filename: job.filename,
        status: job.status,
        record_type: job.record_type || null,
        language: job.language || 'en',
        confidence_score: job.confidence_score,
        error_regions: job.error_regions,
        ocr_text: job.ocr_text || null,
        ocr_result: ocrResult,
        created_at: job.created_at,
        has_table_extraction: hasTableExtraction,
        table_extraction: tableExtraction,
        artifacts,
        classifier_suggested_type: job.classifier_suggested_type || null,
        classifier_confidence: job.classifier_confidence || null,
        layout_classification_json: parsedLayout,
      });
    } catch (error: any) {
      console.error('[OCR Job Detail] Error:', error.message);
      res.status(500).json({ error: 'Failed to fetch job', message: error.message });
    }
  });

  // -----------------------------------------------------------------------
  // 3. PATCH /jobs/:jobId — Update job metadata in platform DB
  // -----------------------------------------------------------------------
  platformJobsRouter.patch('/jobs/:jobId', async (req: any, res: any) => {
    try {
      const jobId = parseInt(req.params.jobId);
      if (!jobId) return res.status(400).json({ error: 'Invalid jobId' });

      const { record_type, layout_classification_json } = req.body;

      const updates: string[] = [];
      const values: any[] = [];

      if (record_type) {
        const valid = ['baptism', 'marriage', 'funeral', 'custom', 'unknown'];
        if (!valid.includes(record_type)) {
          return res.status(400).json({ error: `Invalid record_type. Must be one of: ${valid.join(', ')}` });
        }
        updates.push('record_type = ?');
        values.push(record_type);
      }

      if (layout_classification_json) {
        updates.push('layout_classification_json = ?');
        values.push(typeof layout_classification_json === 'string' ? layout_classification_json : JSON.stringify(layout_classification_json));
      }

      if (updates.length === 0) {
        return res.status(400).json({ error: 'No valid fields to update' });
      }

      values.push(jobId);
      const [result] = await promisePool.query(
        `UPDATE ocr_jobs SET ${updates.join(', ')}, updated_at = NOW() WHERE id = ?`,
        values
      );

      if ((result as any).affectedRows === 0) {
        return res.status(404).json({ error: 'Job not found' });
      }

      res.json({ success: true, message: 'Job updated', record_type, layout_classification_json });
    } catch (error: any) {
      console.error('[OCR Job PATCH Platform] Error:', error);
      res.status(500).json({ error: 'Failed to update job', message: error.message });
    }
  });

  // -----------------------------------------------------------------------
  // 4. GET /extractors — List OCR extractors
  // -----------------------------------------------------------------------
  platformJobsRouter.get('/extractors', async (req: any, res: any) => {
    try {
      const recordType = req.query.record_type as string | undefined;

      let extractors: any[];
      if (recordType) {
        const [rows] = await promisePool.query(
          'SELECT * FROM ocr_extractors WHERE record_type = ? ORDER BY created_at DESC', [recordType]
        );
        extractors = rows as any[];
      } else {
        const [rows] = await promisePool.query('SELECT * FROM ocr_extractors ORDER BY created_at DESC');
        extractors = rows as any[];
      }

      // For each extractor, load its fields
      const result = [];
      for (const ext of extractors) {
        const [fields] = await promisePool.query(
          'SELECT * FROM ocr_extractor_fields WHERE extractor_id = ? ORDER BY parent_field_id ASC, sort_order ASC',
          [ext.id]
        );
        result.push({ ...ext, fields });
      }

      res.json({ extractors: result });
    } catch (error: any) {
      console.error('[OCR Extractors] Error:', error.message);
      res.status(500).json({ error: 'Failed to fetch extractors', message: error.message });
    }
  });

  // -----------------------------------------------------------------------
  // 5. POST /jobs/:jobId/finalize — Write mapped fields into tenant record table
  // -----------------------------------------------------------------------
  platformJobsRouter.post('/jobs/:jobId/finalize', async (req: any, res: any) => {
    try {
      const jobId = parseInt(req.params.jobId);
      const { record_type, extractor_id, mappedFields } = req.body;
      if (!jobId || !record_type || !mappedFields) {
        return res.status(400).json({ error: 'jobId, record_type, and mappedFields are required' });
      }

      // Validate job exists in platform DB
      const [jobs] = await promisePool.query(
        'SELECT id, church_id, filename, status FROM ocr_jobs WHERE id = ?', [jobId]
      );
      if (!(jobs as any[]).length) return res.status(404).json({ error: 'Job not found' });
      const job = (jobs as any[])[0];
      const churchId = job.church_id;

      // Get tenant DB connection via resolveChurchDb
      const resolved = await resolveChurchDb(churchId);
      if (!resolved) return res.status(404).json({ error: 'Church not found' });
      const { db } = resolved;

      const userEmail = req.session?.user?.email || req.user?.email || 'system';

      const tableMap: Record<string, string> = { baptism: 'baptism_records', marriage: 'marriage_records', funeral: 'funeral_records' };
      const table = tableMap[record_type];
      if (!table) return res.status(400).json({ error: `Unsupported record_type: ${record_type}` });

      const mapped = mapFieldsToDbColumns(record_type, mappedFields);
      const { sql, params } = buildInsertQuery(table, churchId, mapped);
      const [result] = await db.query(sql, params);
      const recordId = result.insertId;

      // Save finalization metadata into platform job ocr_result
      const [churchRows] = await promisePool.query('SELECT database_name FROM churches WHERE id = ?', [churchId]);
      const tenantDbName = (churchRows as any[]).length ? (churchRows as any[])[0].database_name : null;
      const finalizeMeta = {
        finalizedAt: new Date().toISOString(),
        finalizedBy: userEmail,
        recordType: record_type,
        extractorId: extractor_id || null,
        createdRecordId: recordId,
        tenantDb: tenantDbName,
      };
      await promisePool.query(
        `UPDATE ocr_jobs SET ocr_result = ? WHERE id = ?`,
        [JSON.stringify(finalizeMeta), jobId]
      );

      console.log(`OCR_FINALIZE_OK ${JSON.stringify({ jobId, churchId, record_type, recordId, tenant: tenantDbName })}`);
      res.json({ ok: true, jobId, createdRecordId: recordId, record_type, church_id: churchId });
    } catch (error: any) {
      console.error('[OCR Finalize] Error:', error);
      res.status(500).json({ error: 'Failed to finalize job', message: error.message });
    }
  });

  // -----------------------------------------------------------------------
  // 6. POST /jobs/upload — File upload endpoint
  // -----------------------------------------------------------------------
  platformJobsRouter.post('/jobs/upload', upload.array('files', 50), async (req: any, res: any) => {
    try {
      const files = req.files as any[];
      if (!files || files.length === 0) {
        return res.status(400).json({ error: 'No files uploaded', jobs: [] });
      }

      const churchId = parseInt(req.body.churchId);
      const validTypes = ['baptism', 'marriage', 'funeral', 'custom'];
      const rawType = req.body.recordType || 'custom';
      const recordType = validTypes.includes(rawType) ? rawType : 'custom';
      const language = req.body.language || 'en';

      if (!churchId) {
        return res.status(400).json({ error: 'churchId is required', jobs: [] });
      }

      // Use PLATFORM pool — ocr_jobs is the global queue in orthodoxmetrics_db
      const { promisePool: platformPool, tenantSchema: ts, assertTenantOcrTablesExist } = require('../../config/db');
      const ocrPaths = require('../../utils/ocrPaths');

      // Sanity-check: confirm pool is connected to orthodoxmetrics_db
      const [[dbRow]] = await platformPool.query('SELECT DATABASE() AS db');
      const currentDb = dbRow?.db;
      console.log(`OCR_DB_TARGET ${JSON.stringify({ db: currentDb })}`);
      if (currentDb !== 'orthodoxmetrics_db') {
        const msg = `[OCR Upload] FATAL: platform pool connected to '${currentDb}' instead of 'orthodoxmetrics_db'`;
        console.error(msg);
        return res.status(500).json({ error: msg, jobs: [] });
      }

      // Validate church exists
      const [churchRows] = await platformPool.query('SELECT database_name FROM churches WHERE id = ?', [churchId]);
      if (!(churchRows as any[]).length) {
        return res.status(404).json({ error: 'Church not found', jobs: [] });
      }

      // Assert tenant feeder tables exist before creating any jobs
      await assertTenantOcrTablesExist(churchId);

      const uploadDir = ocrPaths.getOcrUploadDir(churchId);
      const filenames = files.map((f: any) => f.originalname);

      console.log(`OCR_UPLOAD_CTX ${JSON.stringify({ churchId, tenantSchema: ts(churchId), uploadDir, filesCount: files.length, filenames })}`);

      // Verify multer wrote each temp file to disk
      for (const file of files) {
        if (!fs.existsSync(file.path)) {
          console.error(`[OCR Upload] Uploaded file missing on disk: ${file.path} (original: ${file.originalname})`);
          return res.status(500).json({ error: `Uploaded file missing on disk: ${file.originalname}`, jobs: [] });
        }
      }

      const createdJobs: any[] = [];
      let lastSqlError: any = null;

      for (const file of files) {
        try {
          const timestamp = Date.now();
          const ext = path.extname(file.originalname);
          const baseName = path.basename(file.originalname, ext);
          const uniqueFilename = `${baseName}_${timestamp}${ext}`;
          const finalPath = path.join(uploadDir, uniqueFilename);
          const dbPath = ocrPaths.getOcrDbPath(churchId, uniqueFilename);

          // Move file from temp to final location
          fs.renameSync(file.path, finalPath);

          // Verify file landed
          if (!fs.existsSync(finalPath)) {
            throw new Error(`File move failed: ${file.path} -> ${finalPath}`);
          }

          // Compute sha256 hash + file stats for artifact tracking
          const fileBuffer = fs.readFileSync(finalPath);
          const sha256Hash = crypto.createHash('sha256').update(fileBuffer).digest('hex');
          const fileStats = fs.statSync(finalPath);
          const fileMimeType = file.mimetype || 'image/jpeg';

          const uploadedBy = req.session?.user?.id || null;
          const insertParams = [
            churchId,
            uploadedBy,
            uniqueFilename,
            recordType,
            language
          ];

          // Priority: 1=urgent, 5=normal (default), 9=low
          const jobPriority = Math.min(9, Math.max(1, parseInt(req.body.priority) || 5));
          const insertSql = `INSERT INTO ocr_jobs (church_id, uploaded_by, filename, status, priority, review_status, record_type, language, created_at, source_pipeline) VALUES (?, ?, ?, 'pending', ?, 'uploaded', ?, ?, NOW(), 'uploader')`;
          insertParams.splice(3, 0, jobPriority); // insert priority after filename

          console.log(`OCR_INSERT_PRE ${JSON.stringify({ pool: 'platformPool', db: currentDb, file: file.originalname, storedFilename: uniqueFilename, paramCount: insertParams.length })}`);

          // Insert job into PLATFORM DB (global queue)
          const [result] = await platformPool.query(insertSql, insertParams);

          const jobId = result.insertId;
          const affectedRows = result.affectedRows;

          console.log(`OCR_INSERT_POST ${JSON.stringify({ insertId: jobId, affectedRows, file: file.originalname })}`);

          if (!affectedRows || affectedRows === 0) {
            throw new Error(`INSERT returned 0 affectedRows for ${file.originalname}`);
          }

          // Create source_image artifact in tenant DB for re-run capability
          try {
            const tenantPool = require('../../config/db').getTenantPool(churchId);

            // Ensure sha256/bytes/mime_type columns exist on ocr_feeder_artifacts
            try {
              await tenantPool.query(`ALTER TABLE ocr_feeder_artifacts ADD COLUMN IF NOT EXISTS sha256 VARCHAR(64) NULL`);
              await tenantPool.query(`ALTER TABLE ocr_feeder_artifacts ADD COLUMN IF NOT EXISTS bytes BIGINT NULL`);
              await tenantPool.query(`ALTER TABLE ocr_feeder_artifacts ADD COLUMN IF NOT EXISTS mime_type VARCHAR(100) NULL`);
            } catch (_: any) { /* columns may already exist */ }

            // Create a feeder page row to anchor the artifact
            const [pageResult] = await tenantPool.query(
              `INSERT INTO ocr_feeder_pages (job_id, page_index, status, input_path, created_at, updated_at)
               VALUES (?, 0, 'queued', ?, NOW(), NOW())`,
              [jobId, finalPath]
            );
            const pageId = (pageResult as any).insertId;

            // Create source_image artifact with sha256, bytes, mime_type
            await tenantPool.query(
              `INSERT INTO ocr_feeder_artifacts (page_id, type, storage_path, meta_json, sha256, bytes, mime_type, created_at)
               VALUES (?, 'source_image', ?, ?, ?, ?, ?, NOW())`,
              [pageId, finalPath, JSON.stringify({ original_filename: file.originalname, upload_timestamp: timestamp }), sha256Hash, fileStats.size, fileMimeType]
            );

            console.log(`OCR_ARTIFACT_CREATED ${JSON.stringify({ jobId, pageId, sha256: sha256Hash.substring(0, 8), bytes: fileStats.size, mime: fileMimeType })}`);
          } catch (artifactErr: any) {
            // Non-blocking — artifact creation failure doesn't prevent job processing
            console.warn(`[OCR Upload] Artifact creation failed for job ${jobId}: ${artifactErr.message}`);
          }

          createdJobs.push({
            id: jobId,
            church_id: churchId,
            filename: uniqueFilename,
            status: 'pending',
            record_type: recordType,
            language: language,
            created_at: new Date().toISOString()
          });
        } catch (fileError: any) {
          // Surface full SQL error detail, never swallow
          lastSqlError = {
            message: fileError.message,
            code: fileError.code || null,
            errno: fileError.errno || null,
            sqlState: fileError.sqlState || null,
            sqlMessage: fileError.sqlMessage || null,
            sql: fileError.sql ? String(fileError.sql).substring(0, 500) : null,
          };
          console.error(`[OCR Upload] SQL/FILE ERROR for ${file.originalname}: ${JSON.stringify(lastSqlError)}`);
          console.error(`[OCR Upload] Stack:`, fileError.stack);
        }
      }

      if (createdJobs.length === 0) {
        const detail = { churchId, uploadDir, filenames, sqlError: lastSqlError };
        console.error(`[OCR Upload] ZERO jobs created. Detail: ${JSON.stringify(detail)}`);
        return res.status(500).json({
          error: `Failed to create any OCR jobs for church ${churchId}`,
          detail,
          jobs: []
        });
      }

      const jobIds = createdJobs.map((j: any) => j.id);
      console.log(`OCR_JOBS_CREATED ${JSON.stringify({ churchId, insertedCount: createdJobs.length, jobIds })}`);

      res.json({
        success: true,
        jobs: createdJobs,
        message: `Successfully uploaded ${createdJobs.length} file(s)`
      });
    } catch (error: any) {
      // Surface full error detail in outer catch too
      const sqlDetail = {
        message: error.message,
        code: error.code || null,
        errno: error.errno || null,
        sqlState: error.sqlState || null,
        sqlMessage: error.sqlMessage || null,
      };
      console.error(`[OCR Upload] OUTER ERROR: ${JSON.stringify(sqlDetail)}`);
      console.error(`[OCR Upload] Stack:`, error.stack);
      res.status(500).json({ error: error.message || 'Failed to upload files', detail: sqlDetail, jobs: [] });
    }
  });

  // -----------------------------------------------------------------------
  // PLATFORM: POST /batch-import — Create OCR jobs from a local directory of images
  // -----------------------------------------------------------------------
  platformJobsRouter.post('/batch-import', async (req: any, res: any) => {
    try {
      const { directory, churchId: rawChurchId, recordType: rawType, limit: rawLimit, language = 'en' } = req.body;
      const churchId = parseInt(rawChurchId);
      const validTypes = ['baptism', 'marriage', 'funeral', 'custom'];
      const recordType = validTypes.includes(rawType) ? rawType : null;

      if (!directory || typeof directory !== 'string') {
        return res.status(400).json({ error: 'directory is required' });
      }
      if (!churchId) {
        return res.status(400).json({ error: 'churchId is required' });
      }
      if (!recordType) {
        return res.status(400).json({ error: `recordType must be one of: ${validTypes.join(', ')}` });
      }

      // Validate directory exists
      if (!fs.existsSync(directory) || !fs.statSync(directory).isDirectory()) {
        return res.status(400).json({ error: `Directory not found: ${directory}` });
      }

      const { promisePool: platformPool, assertTenantOcrTablesExist, getTenantPool } = require('../../config/db');

      // Validate church exists
      const [churchRows] = await platformPool.query('SELECT id FROM churches WHERE id = ?', [churchId]);
      if (!(churchRows as any[]).length) {
        return res.status(404).json({ error: 'Church not found' });
      }

      await assertTenantOcrTablesExist(churchId);

      // Scan for image files
      const imageExts = ['.jpg', '.jpeg', '.png'];
      let imageFiles = fs.readdirSync(directory)
        .filter((f: string) => imageExts.includes(path.extname(f).toLowerCase()))
        .sort();

      const limit = rawLimit ? parseInt(rawLimit) : 0;
      if (limit > 0) {
        imageFiles = imageFiles.slice(0, limit);
      }

      if (imageFiles.length === 0) {
        return res.status(400).json({ error: 'No image files found in directory' });
      }

      console.log(`[Batch Import] Processing ${imageFiles.length} images from ${directory} for church ${churchId}`);

      const tenantPool = getTenantPool(churchId);
      const createdJobIds: number[] = [];

      for (const filename of imageFiles) {
        const absPath = path.join(directory, filename);

        // Platform DB: create ocr_jobs row
        const [result] = await platformPool.query(
          `INSERT INTO ocr_jobs (church_id, filename, status, record_type, language, created_at, source_pipeline)
           VALUES (?, ?, 'pending', ?, ?, NOW(), 'batch_import')`,
          [churchId, absPath, recordType, language]
        );
        const jobId = (result as any).insertId;

        // Tenant DB: create feeder page
        const [pageResult] = await tenantPool.query(
          `INSERT INTO ocr_feeder_pages (job_id, page_index, status, input_path, created_at, updated_at)
           VALUES (?, 0, 'queued', ?, NOW(), NOW())`,
          [jobId, absPath]
        );
        const pageId = (pageResult as any).insertId;

        // Tenant DB: create source_image artifact
        const fileStats = fs.statSync(absPath);
        const fileBuffer = fs.readFileSync(absPath);
        const sha256Hash = crypto.createHash('sha256').update(fileBuffer).digest('hex');
        const ext = path.extname(filename).toLowerCase();
        const mimeType = ext === '.png' ? 'image/png' : 'image/jpeg';

        await tenantPool.query(
          `INSERT INTO ocr_feeder_artifacts (page_id, type, storage_path, meta_json, sha256, bytes, mime_type, created_at)
           VALUES (?, 'source_image', ?, ?, ?, ?, ?, NOW())`,
          [pageId, absPath, JSON.stringify({ original_filename: filename, source: 'batch_import' }), sha256Hash, fileStats.size, mimeType]
        );

        createdJobIds.push(jobId);
        console.log(`[Batch Import] Created job ${jobId} for ${filename}`);
      }

      res.json({
        created: createdJobIds.length,
        jobIds: createdJobIds,
        directory,
        recordType
      });
    } catch (error: any) {
      console.error(`[Batch Import] Error:`, error.message, error.stack);
      res.status(500).json({ error: error.message || 'Batch import failed' });
    }
  });

  // -----------------------------------------------------------------------
  // 7. GET /jobs/:jobId/download — Download OCR results as TXT or JSON
  // -----------------------------------------------------------------------
  churchJobsRouter.get('/jobs/:jobId/download', async (req: any, res: any) => {
    try {
      const churchId = parseInt(req.params.churchId);
      const jobId = parseInt(req.params.jobId);
      const format = (req.query.format || 'txt') as string;

      const resolved = await resolveChurchDb(churchId);
      if (!resolved) return res.status(404).json({ error: 'Church not found' });
      const { db } = resolved;

      // Get job data
      const [rows] = await db.query(
        `SELECT id, filename, status, record_type, ocr_text, confidence_score, created_at FROM ocr_jobs WHERE id = ? AND church_id = ?`,
        [jobId, churchId]
      );
      if (!rows.length) return res.status(404).json({ error: 'Job not found' });
      const job = rows[0];

      // Get sha256 prefix for filename
      let hash8 = '00000000';
      try {
        const tenantPool = require('../../config/db').getTenantPool(churchId);
        const [artifacts] = await tenantPool.query(
          `SELECT sha256 FROM ocr_feeder_artifacts WHERE type = 'source_image' AND sha256 IS NOT NULL ORDER BY created_at DESC LIMIT 1`
        );
        if (artifacts.length > 0 && artifacts[0].sha256) {
          hash8 = artifacts[0].sha256.substring(0, 8);
        }
      } catch (_: any) { /* best effort */ }

      const createdAt = job.created_at ? new Date(job.created_at) : new Date();
      const dateStr = createdAt.toISOString().replace(/[-:T]/g, '').substring(0, 15).replace(/(\d{8})(\d{6})/, '$1_$2');
      const recordType = job.record_type || 'unknown';
      const baseFilename = `orthodoxmetrics_ocr_church${churchId}_job${jobId}_${recordType}_${dateStr}_${hash8}`;

      if (format === 'json') {
        // Structured JSON download
        let mappings = null;
        try {
          const [mapRows] = await db.query('SELECT * FROM ocr_mappings WHERE ocr_job_id = ? ORDER BY updated_at DESC LIMIT 1', [jobId]);
          if (mapRows.length > 0) {
            mappings = typeof mapRows[0].mapping_json === 'string' ? JSON.parse(mapRows[0].mapping_json) : mapRows[0].mapping_json;
          }
        } catch (_: any) { /* table may not exist */ }

        let drafts: any[] = [];
        try {
          const [draftRows] = await db.query('SELECT * FROM ocr_fused_drafts WHERE ocr_job_id = ? ORDER BY entry_index ASC', [jobId]);
          drafts = draftRows.map((d: any) => ({
            ...d,
            payload_json: typeof d.payload_json === 'string' ? JSON.parse(d.payload_json) : d.payload_json,
          }));
        } catch (_: any) { /* table may not exist */ }

        const payload = {
          job: { id: job.id, church_id: churchId, filename: job.filename, status: job.status, record_type: recordType, confidence_score: job.confidence_score, created_at: job.created_at },
          ocr_text: job.ocr_text || null,
          mappings,
          drafts,
          exported_at: new Date().toISOString(),
        };

        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="${baseFilename}.json"`);
        return res.send(JSON.stringify(payload, null, 2));
      }

      // Default: TXT download
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${baseFilename}.txt"`);
      return res.send(job.ocr_text || '(No OCR text available)');
    } catch (error: any) {
      console.error('[OCR Download] Error:', error);
      res.status(500).json({ error: 'Download failed', message: error.message });
    }
  });

  // -----------------------------------------------------------------------
  // 8. GET /feeder/artifacts/:artifactId/download — Download raw OCR text artifact
  // -----------------------------------------------------------------------
  churchJobsRouter.get('/feeder/artifacts/:artifactId/download', async (req: any, res: any) => {
    try {
      const churchId = parseInt(req.params.churchId);
      const artifactId = parseInt(req.params.artifactId);
      if (!churchId || !artifactId) {
        return res.status(400).json({ error: 'Invalid churchId or artifactId' });
      }

      const { getTenantPool } = require('../../config/db');
      const tenantPool = getTenantPool(churchId);

      // Get artifact + page + verify ownership via job
      const [rows] = await tenantPool.query(
        `SELECT a.*, p.job_id
         FROM ocr_feeder_artifacts a
         JOIN ocr_feeder_pages p ON p.id = a.page_id
         WHERE a.id = ?`,
        [artifactId]
      );

      if (!(rows as any[]).length) {
        return res.status(404).json({ error: 'Artifact not found' });
      }

      const artifact = (rows as any[])[0];
      const jobId = artifact.job_id;

      // Verify job belongs to this church via PLATFORM DB (ocr_jobs lives there)
      const [jobRows] = await promisePool.query(
        `SELECT id, record_type, created_at FROM ocr_jobs WHERE id = ? AND church_id = ?`,
        [jobId, churchId]
      );
      if (!(jobRows as any[]).length) {
        return res.status(403).json({ error: 'Artifact does not belong to this church' });
      }
      const job = (jobRows as any[])[0];

      // Read content: prefer file on disk, fall back to json_blob
      let content: string;
      if (artifact.storage_path && fs.existsSync(artifact.storage_path)) {
        content = fs.readFileSync(artifact.storage_path, 'utf8');
      } else if (artifact.json_blob) {
        content = typeof artifact.json_blob === 'string' ? artifact.json_blob : JSON.stringify(artifact.json_blob);
      } else {
        return res.status(404).json({ error: 'Artifact content not found' });
      }

      // Build descriptive filename
      const recordType = job.record_type || 'unknown';
      const createdAt = job.created_at ? new Date(job.created_at) : new Date();
      const dateStr = createdAt.toISOString().replace(/[-:T]/g, '').substring(0, 15).replace(/(\d{8})(\d{6})/, '$1_$2');
      const filename = `church${churchId}_job${jobId}_${recordType}_${dateStr}.txt`;

      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(content);
    } catch (error: any) {
      console.error('[OCR Artifact Download] Error:', error);
      res.status(500).json({ error: 'Download failed', message: error.message });
    }
  });

  // -----------------------------------------------------------------------
  // 9. POST /feeder/pages/:pageId/rerun — Re-run OCR on existing source image
  // -----------------------------------------------------------------------
  churchJobsRouter.post('/feeder/pages/:pageId/rerun', async (req: any, res: any) => {
    try {
      const churchId = parseInt(req.params.churchId);
      const pageId = parseInt(req.params.pageId);
      if (!churchId || !pageId) {
        return res.status(400).json({ error: 'Invalid churchId or pageId' });
      }

      const { getTenantPool } = require('../../config/db');
      const tenantPool = getTenantPool(churchId);

      // Get feeder page
      const [pageRows] = await tenantPool.query(
        `SELECT * FROM ocr_feeder_pages WHERE id = ?`, [pageId]
      );
      if (!(pageRows as any[]).length) {
        return res.status(404).json({ error: 'Feeder page not found' });
      }
      const page = (pageRows as any[])[0];
      const jobId = page.job_id;

      // Find source_image artifact
      const [imgArtifacts] = await tenantPool.query(
        `SELECT storage_path FROM ocr_feeder_artifacts
         WHERE page_id = ? AND type = 'source_image'
         ORDER BY created_at DESC LIMIT 1`,
        [pageId]
      );

      let imagePath: string | null = null;
      if ((imgArtifacts as any[]).length > 0 && fs.existsSync((imgArtifacts as any[])[0].storage_path)) {
        imagePath = (imgArtifacts as any[])[0].storage_path;
      } else if (page.input_path && fs.existsSync(page.input_path)) {
        imagePath = page.input_path;
      }

      if (!imagePath) {
        return res.status(404).json({ error: 'Source image file not found on disk' });
      }

      // Call Google Vision API (reuse pattern from ocrFeederWorker.ts)
      const vision = require('@google-cloud/vision');
      const visionConfig: any = { projectId: process.env.GOOGLE_CLOUD_PROJECT_ID };
      if (process.env.GOOGLE_VISION_KEY_PATH) visionConfig.keyFilename = process.env.GOOGLE_VISION_KEY_PATH;
      else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) visionConfig.keyFilename = process.env.GOOGLE_APPLICATION_CREDENTIALS;
      const client = new vision.ImageAnnotatorClient(visionConfig);

      const imageBuffer = fs.readFileSync(imagePath);
      const VISION_TIMEOUT_MS = 60000;

      const visionPromise = client.annotateImage({
        image: { content: imageBuffer },
        imageContext: { languageHints: ['el', 'ru', 'en'] },
        features: [{ type: 'DOCUMENT_TEXT_DETECTION' }],
      });
      const timeoutPromise = new Promise((_: any, reject: any) =>
        setTimeout(() => reject(new Error(`Vision API timed out after ${VISION_TIMEOUT_MS / 1000}s`)), VISION_TIMEOUT_MS)
      );
      const [result] = await Promise.race([visionPromise, timeoutPromise]) as any[];

      const document = result.fullTextAnnotation;
      const fullText = document?.text || '';
      let confidence = 0;
      const visionPages = document?.pages || [];
      if (visionPages.length > 0 && visionPages[0].confidence !== undefined) {
        confidence = visionPages[0].confidence;
      }

      // Build structured Vision JSON with bounding boxes
      const visionResultJson: any = {
        text: fullText,
        pages: visionPages.map((vp: any, vpIdx: number) => ({
          pageIndex: vpIdx,
          width: vp.width,
          height: vp.height,
          blocks: (vp.blocks || []).map((block: any) => ({
            blockType: block.blockType,
            confidence: block.confidence,
            boundingBox: block.boundingBox,
            paragraphs: (block.paragraphs || []).map((p: any) => ({
              confidence: p.confidence,
              boundingBox: p.boundingBox,
              words: (p.words || []).map((w: any) => ({
                text: (w.symbols || []).map((s: any) => s.text).join(''),
                confidence: w.confidence,
                boundingBox: w.boundingBox,
              })),
            })),
          })),
        })),
      };

      // Write artifacts to page storage dir
      const pageStorageDir = path.join(__dirname, '../../storage/feeder', `job_${jobId}`, `page_${page.page_index}`);
      fs.mkdirSync(pageStorageDir, { recursive: true });
      const timestamp = Date.now();

      // Save raw_text
      const artifactPath = path.join(pageStorageDir, `raw_text_rerun_${timestamp}.txt`);
      fs.writeFileSync(artifactPath, fullText);

      const [insertResult] = await tenantPool.query(
        `INSERT INTO ocr_feeder_artifacts (page_id, type, storage_path, meta_json, created_at)
         VALUES (?, 'raw_text', ?, ?, NOW())`,
        [pageId, artifactPath, JSON.stringify({ confidence, rerunAt: new Date().toISOString(), source: 'manual_rerun' })]
      );
      const newArtifactId = (insertResult as any).insertId;

      // Save Vision JSON
      const visionJsonPath = path.join(pageStorageDir, `vision_result_rerun_${timestamp}.json`);
      fs.writeFileSync(visionJsonPath, JSON.stringify(visionResultJson));

      await tenantPool.query(
        `INSERT INTO ocr_feeder_artifacts (page_id, type, storage_path, meta_json, created_at)
         VALUES (?, 'vision_json', ?, ?, NOW())`,
        [pageId, visionJsonPath, JSON.stringify({ pages: visionResultJson.pages.length, totalChars: fullText.length, rerunAt: new Date().toISOString() })]
      );

      // Run table extraction
      let structuredText: string | null = null;
      let tableArtifactId: number | null = null;
      let tableExtractionResult: any = null;
      try {
        // Look up job's record_type
        let recordType = 'unknown';
        try {
          const [jtRows] = await promisePool.query(
            `SELECT record_type FROM ocr_jobs WHERE id = ?`, [jobId]
          );
          if ((jtRows as any[]).length > 0 && (jtRows as any[])[0].record_type) {
            recordType = (jtRows as any[])[0].record_type;
          }
        } catch (_: any) {}

        // Auto-detect record type from OCR text when job type is custom/unknown
        if (recordType === 'custom' || recordType === 'unknown') {
          try {
            const { classifyRecordType } = require('../../utils/ocrClassifier');
            const classResult = classifyRecordType(fullText);
            if (classResult.confidence > 0.3 && classResult.suggested_type !== 'unknown' && classResult.suggested_type !== 'custom') {
              console.log(`[AutoDetect][Rerun] Page ${pageId}: Detected '${classResult.suggested_type}' (conf: ${classResult.confidence}) — overriding '${recordType}'`);
              recordType = classResult.suggested_type;
              try {
                await promisePool.query(`UPDATE ocr_jobs SET record_type = ? WHERE id = ?`, [recordType, jobId]);
              } catch (_: any) {}
            }
          } catch (_: any) {}
        }

        if (recordType === 'marriage') {
          const { extractMarriageLedgerTable } = require('../../ocr/layouts/marriage_ledger_v1');
          tableExtractionResult = extractMarriageLedgerTable(visionResultJson, { pageIndex: 0 });
          console.log(`[TableExtract][Rerun] Page ${pageId}: Marriage ledger -> ${tableExtractionResult.data_rows} rows`);
        } else {
          const { extractGenericTable } = require('../../ocr/layouts/generic_table');
          tableExtractionResult = extractGenericTable(visionResultJson, { pageIndex: 0 });
          console.log(`[TableExtract][Rerun] Page ${pageId}: Generic -> ${tableExtractionResult.data_rows} rows, ${tableExtractionResult.columns_detected} cols`);
        }

        const { tableToStructuredText } = require('../../ocr/layouts/generic_table');
        structuredText = tableToStructuredText(tableExtractionResult);

        if (structuredText) {
          const tableJsonPath = path.join(pageStorageDir, `table_extraction_rerun_${timestamp}.json`);
          fs.writeFileSync(tableJsonPath, JSON.stringify(tableExtractionResult, null, 2));

          const structuredTxtPath = path.join(pageStorageDir, `_structured_rerun_${timestamp}.txt`);
          fs.writeFileSync(structuredTxtPath, structuredText);

          const [tableInsert] = await tenantPool.query(
            `INSERT INTO ocr_feeder_artifacts (page_id, type, storage_path, meta_json, created_at)
             VALUES (?, 'table_extraction', ?, ?, NOW())`,
            [pageId, structuredTxtPath, JSON.stringify({
              layout_id: tableExtractionResult.layout_id,
              data_rows: tableExtractionResult.data_rows,
              columns_detected: tableExtractionResult.columns_detected || tableExtractionResult.tables?.[0]?.column_count,
              chars: structuredText.length,
              rerunAt: new Date().toISOString(),
            })]
          );
          tableArtifactId = (tableInsert as any).insertId;
          console.log(`[TableExtract][Rerun] Page ${pageId}: Structured text saved (${structuredText.length} chars)`);
        }
      } catch (tableErr: any) {
        console.warn(`[TableExtract][Rerun] Page ${pageId}: Table extraction failed (non-blocking): ${tableErr.message}`);
      }

      // Generate record candidates from table extraction
      let recordCandidatesArtifactId: number | null = null;
      try {
        if (tableExtractionResult && tableExtractionResult.data_rows > 0) {
          const { extractRecordCandidates } = require('../../ocr/columnMapper');
          // Look up the (possibly updated) record_type
          let finalRecordType = 'unknown';
          try {
            const [rtRows] = await promisePool.query(`SELECT record_type FROM ocr_jobs WHERE id = ?`, [jobId]);
            if ((rtRows as any[]).length > 0) finalRecordType = (rtRows as any[])[0].record_type;
          } catch (_: any) {}

          const rcResult = extractRecordCandidates(tableExtractionResult, fullText, finalRecordType);
          console.log(`[ColumnMapper][Rerun] Page ${pageId}: ${rcResult.candidates.length} record(s) detected (type: ${rcResult.detectedType})`);

          const rcPath = path.join(pageStorageDir, `record_candidates_rerun_${timestamp}.json`);
          fs.writeFileSync(rcPath, JSON.stringify(rcResult, null, 2));

          const [rcInsert] = await tenantPool.query(
            `INSERT INTO ocr_feeder_artifacts (page_id, type, storage_path, json_blob, meta_json, created_at)
             VALUES (?, 'record_candidates', ?, ?, ?, NOW())`,
            [pageId, rcPath, JSON.stringify(rcResult), JSON.stringify({
              candidateCount: rcResult.candidates.length,
              detectedType: rcResult.detectedType,
              typeConfidence: rcResult.typeConfidence,
              rerunAt: new Date().toISOString(),
            })]
          );
          recordCandidatesArtifactId = (rcInsert as any).insertId;
        }
      } catch (rcErr: any) {
        console.warn(`[ColumnMapper][Rerun] Page ${pageId}: Record candidate generation failed (non-blocking): ${rcErr.message}`);
      }

      // Update page confidence
      await tenantPool.query(
        `UPDATE ocr_feeder_pages SET ocr_confidence = ?, updated_at = NOW() WHERE id = ?`,
        [confidence, pageId]
      );

      // Update ocr_jobs.ocr_text — prefer structured text
      const bestText = structuredText || fullText;
      try {
        await promisePool.query(
          `UPDATE ocr_jobs SET ocr_text = ?, confidence_score = ? WHERE id = ?`,
          [bestText.substring(0, 65000), confidence, jobId]
        );
      } catch (_: any) { /* best effort platform DB update */ }

      console.log(`OCR_RERUN_OK ${JSON.stringify({ churchId, pageId, jobId, artifactId: newArtifactId, tableArtifactId, confidence, textLen: fullText.length, structuredLen: structuredText?.length || 0 })}`);

      res.json({
        success: true,
        rawText: (structuredText || fullText).substring(0, 500),
        confidence,
        artifactId: tableArtifactId || newArtifactId,
        fullTextLength: fullText.length,
        structuredTextLength: structuredText?.length || 0,
      });
    } catch (error: any) {
      console.error('[OCR Rerun] Error:', error);
      res.status(500).json({ error: 'Re-run OCR failed', message: error.message });
    }
  });

  // -----------------------------------------------------------------------
  // PLATFORM: POST /batch-reprocess — Re-queue multiple jobs for worker processing
  // -----------------------------------------------------------------------
  platformJobsRouter.post('/batch-reprocess', async (req: any, res: any) => {
    try {
      const { jobIds, templateId } = req.body;
      if (!Array.isArray(jobIds) || jobIds.length === 0) {
        return res.status(400).json({ error: 'jobIds array is required' });
      }
      if (jobIds.length > 500) {
        return res.status(400).json({ error: 'Maximum 500 jobs per batch' });
      }

      const ids = jobIds.map((id: any) => parseInt(id)).filter((id: number) => id > 0);
      if (ids.length === 0) {
        return res.status(400).json({ error: 'No valid job IDs provided' });
      }

      // Optionally validate template exists
      if (templateId) {
        const [tplRows] = await promisePool.query('SELECT id FROM ocr_extractors WHERE id = ?', [templateId]);
        if (!(tplRows as any[]).length) {
          return res.status(404).json({ error: `Template ${templateId} not found` });
        }
      }

      // Reset jobs to pending, optionally assign template
      const placeholders = ids.map(() => '?').join(',');
      const templateClause = templateId ? ', layout_template_id = ?' : '';
      const params = templateId
        ? [...ids, templateId]
        : [...ids];

      const [result] = await promisePool.query(
        `UPDATE ocr_jobs
         SET status = 'pending',
             ocr_text = NULL, ocr_result = NULL,
             confidence_score = NULL, error_regions = NULL
             ${templateClause}
         WHERE id IN (${placeholders})`,
        templateId ? [templateId, ...ids] : ids
      );

      // Clean up old feeder artifacts for each job
      const FEEDER_ROOT = path.join('/var/www/orthodoxmetrics/prod/server/storage/feeder');
      let cleanedCount = 0;
      for (const jobId of ids) {
        const jobDir = path.join(FEEDER_ROOT, `job_${jobId}`);
        if (fs.existsSync(jobDir)) {
          try {
            fs.rmSync(jobDir, { recursive: true, force: true });
            cleanedCount++;
          } catch (e: any) {
            console.warn(`[Batch Reprocess] Failed to clean ${jobDir}: ${e.message}`);
          }
        }
      }

      console.log(`OCR_BATCH_REPROCESS ${JSON.stringify({ jobCount: ids.length, templateId: templateId || null, cleanedDirs: cleanedCount })}`);
      res.json({
        ok: true,
        requeued: (result as any).affectedRows || ids.length,
        templateId: templateId || null,
        cleanedDirs: cleanedCount,
        message: `${ids.length} job(s) re-queued for processing`,
      });
    } catch (error: any) {
      console.error('[Batch Reprocess] Error:', error);
      res.status(500).json({ error: 'Batch reprocess failed', message: error.message });
    }
  });

  // -----------------------------------------------------------------------
  // PLATFORM: GET /structure-clusters — Group jobs by structural fingerprint
  // -----------------------------------------------------------------------
  platformJobsRouter.get('/structure-clusters', async (req: any, res: any) => {
    try {
      const recordType = req.query.recordType as string;
      const churchId = parseInt(req.query.churchId as string);

      if (!churchId) return res.status(400).json({ error: 'churchId query param required' });

      // Get all completed jobs with their extraction artifacts
      let query = `SELECT id, filename, record_type, status FROM ocr_jobs WHERE church_id = ? AND status IN ('complete', 'completed')`;
      const params: any[] = [churchId];
      if (recordType) {
        query += ' AND record_type = ?';
        params.push(recordType);
      }
      query += ' ORDER BY id ASC';

      const [rows] = await promisePool.query(query, params);
      const jobs = rows as any[];

      // Build fingerprints from table_extraction artifacts
      const clusters: Record<string, { fingerprint: string; columnCount: number; orientation: string; jobIds: number[]; sampleHeaders: string[]; recordType: string }> = {};

      for (const job of jobs) {
        // Try feeder artifact path
        const feederDir = path.join('/var/www/orthodoxmetrics/prod/server/storage/feeder', `job_${job.id}`, 'page_0');
        const jsonFiles = fs.existsSync(feederDir)
          ? fs.readdirSync(feederDir).filter((f: string) => f.includes('table_extraction') && f.endsWith('.json'))
          : [];

        let extraction: any = null;
        if (jsonFiles.length > 0) {
          try {
            extraction = JSON.parse(fs.readFileSync(path.join(feederDir, jsonFiles[jsonFiles.length - 1]), 'utf8'));
          } catch { /* skip */ }
        }

        if (!extraction || !extraction.column_bands) continue;

        // Build fingerprint: column count + rounded band widths + page orientation
        const bands = extraction.column_bands;
        const bandKeys = Object.keys(bands).sort();
        const colCount = bandKeys.length;
        const dims = extraction.page_dimensions;
        const orientation = dims && dims.width > dims.height ? 'landscape' : 'portrait';
        const bandWidths = bandKeys.map(k => {
          const b = bands[k];
          return Math.round((b[1] - b[0]) * 20) / 20; // Round to 0.05
        });
        const fingerprint = `${colCount}c_${orientation}_${bandWidths.join('_')}`;

        if (!clusters[fingerprint]) {
          // Extract sample headers from first table
          let sampleHeaders: string[] = [];
          if (extraction.tables?.[0]?.rows?.[0]?.cells) {
            sampleHeaders = extraction.tables[0].rows[0].cells
              .map((c: any) => c.content || '')
              .filter((s: string) => s.trim())
              .slice(0, 5);
          }
          clusters[fingerprint] = {
            fingerprint,
            columnCount: colCount,
            orientation,
            jobIds: [],
            sampleHeaders,
            recordType: job.record_type || 'unknown',
          };
        }
        clusters[fingerprint].jobIds.push(job.id);
      }

      const result = Object.values(clusters)
        .sort((a, b) => b.jobIds.length - a.jobIds.length)
        .map(c => ({
          ...c,
          jobCount: c.jobIds.length,
          sampleJobIds: c.jobIds.slice(0, 5),
          jobIds: undefined, // Don't send full list for large clusters
          allJobIds: c.jobIds,
        }));

      res.json({ clusters: result, totalJobs: jobs.length });
    } catch (error: any) {
      console.error('[Structure Clusters] Error:', error);
      res.status(500).json({ error: 'Failed to compute clusters', message: error.message });
    }
  });

  // -----------------------------------------------------------------------
  // PATCH /jobs/:jobId/review-status — Admin: update review status
  // -----------------------------------------------------------------------
  churchJobsRouter.patch('/jobs/:jobId/review-status', async (req: any, res: any) => {
    try {
      const jobId = parseInt(req.params.jobId);
      const userRole = req.session?.user?.role;
      if (!['super_admin', 'admin'].includes(userRole)) {
        return res.status(403).json({ error: 'Only admins can update review status' });
      }
      const { review_status, review_notes } = req.body;
      const validStatuses = [
        'uploaded', 'pending_review', 'in_review', 'processed', 'returned',
        'ocr_complete', 'agent_extracted', 'human_confirmed', 'ready_to_seed', 'seeded',
      ];
      if (!review_status || !validStatuses.includes(review_status)) {
        return res.status(400).json({ error: `review_status must be one of: ${validStatuses.join(', ')}` });
      }
      const updates: string[] = ['review_status = ?'];
      const params: any[] = [review_status];
      if (review_notes !== undefined) {
        updates.push('review_notes = ?');
        params.push(review_notes);
      }
      params.push(jobId);
      await promisePool.query(`UPDATE ocr_jobs SET ${updates.join(', ')} WHERE id = ?`, params);
      res.json({ success: true, jobId, review_status });
    } catch (error: any) {
      console.error('[OCR] Error updating review status:', error);
      res.status(500).json({ error: 'Failed to update review status' });
    }
  });

  return { churchJobsRouter, platformJobsRouter };
}

module.exports = createRouters;
