/**
 * OCR Routes Aggregator
 * Mounts all extracted OCR sub-routers onto the Express app.
 *
 * Usage in main index.ts:
 *   const { mountOcrRoutes } = require('./routes/ocr');
 *   mountOcrRoutes(app, upload);
 */
const express = require('express');
const rateLimit = require('express-rate-limit');

// OCR-specific rate limiters
const ocrUploadLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10,             // 10 uploads per minute per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many OCR uploads. Please wait before uploading more files.' },
});

const ocrApiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 120,            // 120 API calls per minute per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many OCR API requests. Please slow down.' },
});

export function mountOcrRoutes(app: any, upload: any) {
  // Apply rate limiting to all OCR endpoints
  app.use('/api/church/:churchId/ocr', ocrApiLimiter);
  app.use('/api/ocr', ocrApiLimiter);
  // Stricter limit on upload/ingest endpoints (applied in feeder.js too)
  app.use('/api/feeder/ingest', ocrUploadLimiter);
  // -------------------------------------------------------------------------
  // 1. Admin OCR Monitor (mounted at /api — routes include /admin/ocr/... paths)
  // -------------------------------------------------------------------------
  const adminMonitorRouter = require('./adminMonitor');
  app.use('/api', adminMonitorRouter);

  // -------------------------------------------------------------------------
  // 2. Church-scoped OCR settings
  // -------------------------------------------------------------------------
  const settingsRouter = require('./settings');
  app.use('/api/church/:churchId/ocr', settingsRouter);

  // -------------------------------------------------------------------------
  // 3. Church-scoped OCR setup wizard
  // -------------------------------------------------------------------------
  const setupWizardRouter = require('./setupWizard');
  app.use('/api/church/:churchId/ocr', setupWizardRouter);

  // -------------------------------------------------------------------------
  // 4. Church-scoped & platform-scoped OCR jobs
  // -------------------------------------------------------------------------
  const createJobRouters = require('./jobs');
  const { churchJobsRouter, platformJobsRouter } = createJobRouters(upload);
  app.use('/api/church/:churchId/ocr', churchJobsRouter);
  app.use('/api/ocr', platformJobsRouter);

  // -------------------------------------------------------------------------
  // 5. OCR mapping (platform DB)
  // -------------------------------------------------------------------------
  const mappingRouter = require('./mapping');
  app.use('/api/church/:churchId/ocr', mappingRouter);

  // -------------------------------------------------------------------------
  // 6. OCR fusion workflow
  // -------------------------------------------------------------------------
  const fusionRouter = require('./fusion');
  app.use('/api/church/:churchId/ocr', fusionRouter);

  // -------------------------------------------------------------------------
  // 7. OCR review & commit
  // -------------------------------------------------------------------------
  const reviewRouter = require('./review');
  app.use('/api/church/:churchId/ocr', reviewRouter);

  // -------------------------------------------------------------------------
  // 8. Church OCR statistics (dashboard widget)
  // -------------------------------------------------------------------------
  const statsRouter = require('./stats');
  app.use('/api/church/:churchId/ocr', statsRouter);

  console.log('✅ [OCR] All OCR routes mounted (admin + 7 church-scoped modules)');
}
