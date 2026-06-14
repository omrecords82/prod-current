/**
 * OCR Analyze routes — pre-upload classification without creating jobs.
 */
const express = require('express');
const nodeCrypto = require('crypto');
const path = require('path');

function createAnalyzeRouter(upload) {
  const router = express.Router({ mergeParams: true });

  router.post('/analyze', upload.array('files', 25), async (req, res) => {
    try {
      const churchId = parseInt(req.params.churchId, 10);
      const files = req.files;
      if (!churchId || !files?.length) {
        return res.status(400).json({ error: 'churchId and files are required' });
      }

      const {
        createAnalyzeSession,
        analyzeImageFile,
        loadAnalyzeSession,
        saveAnalyzeSession,
      } = require('../../services/ocrAnalyzeService');

      let sessionId = String(req.body.sessionId || '').trim();
      let manifest = sessionId ? loadAnalyzeSession(churchId, sessionId) : null;
      if (!manifest) {
        sessionId = createAnalyzeSession(churchId);
        manifest = loadAnalyzeSession(churchId, sessionId);
      }

      const results = [];
      for (const file of files) {
        const fileId = `af_${nodeCrypto.randomBytes(6).toString('hex')}`;
        const result = await analyzeImageFile(
          churchId,
          sessionId,
          fileId,
          file.path,
          file.originalname,
        );
        manifest.files.push(result);
        results.push(result);
        try {
          const fs = require('fs');
          if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
        } catch {
          /* temp cleanup best-effort */
        }
      }

      saveAnalyzeSession(manifest);
      console.log(`OCR_ANALYZE ${JSON.stringify({ churchId, sessionId, added: results.length, total: manifest.files.length })}`);

      res.json({
        success: true,
        sessionId,
        files: results,
        total: manifest.files.length,
      });
    } catch (err) {
      console.error('[OCR Analyze] POST failed:', err);
      res.status(500).json({ error: 'Analyze failed', message: err.message });
    }
  });

  router.get('/analyze/:sessionId', async (req, res) => {
    try {
      const churchId = parseInt(req.params.churchId, 10);
      const { loadAnalyzeSession } = require('../../services/ocrAnalyzeService');
      const manifest = loadAnalyzeSession(churchId, req.params.sessionId);
      if (!manifest) return res.status(404).json({ error: 'Session not found' });
      res.json({ success: true, ...manifest });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  router.get('/analyze/:sessionId/:fileId/preview', async (req, res) => {
    try {
      const churchId = parseInt(req.params.churchId, 10);
      const variant = req.query.variant === 'original' ? 'original' : 'optimized';
      const { getAnalyzePreviewPath } = require('../../services/ocrAnalyzeService');
      const previewPath = getAnalyzePreviewPath(
        churchId,
        req.params.sessionId,
        req.params.fileId,
        variant,
      );
      if (!previewPath) return res.status(404).json({ error: 'Preview not found' });
      res.sendFile(path.resolve(previewPath));
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  router.post('/analyze/:sessionId/commit', async (req, res) => {
    try {
      const churchId = parseInt(req.params.churchId, 10);
      const items = req.body?.items;
      if (!Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ error: 'items array is required' });
      }
      const uploadedBy = req.session?.user?.id || req.user?.id || null;
      const { commitAnalyzeSession, deleteAnalyzeSession } = require('../../services/ocrAnalyzeService');
      const { jobs } = await commitAnalyzeSession(churchId, req.params.sessionId, items, uploadedBy);
      deleteAnalyzeSession(churchId, req.params.sessionId);
      res.json({ success: true, jobs, message: `Created ${jobs.length} OCR job(s)` });
    } catch (err) {
      console.error('[OCR Analyze] commit failed:', err);
      res.status(500).json({ error: 'Commit failed', message: err.message });
    }
  });

  router.delete('/analyze/:sessionId', async (req, res) => {
    try {
      const churchId = parseInt(req.params.churchId, 10);
      const { deleteAnalyzeSession } = require('../../services/ocrAnalyzeService');
      deleteAnalyzeSession(churchId, req.params.sessionId);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  return router;
}

module.exports = createAnalyzeRouter;
