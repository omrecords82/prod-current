// Extracted from server/src/routes/ocrLegacy.js on 2026-05-02 (OMD-1374).
// The legacy router that surrounded this function is now disposed.
// Consumed by server/src/workers/ocrFeederWorker.ts.

const path = require('path');
const fs = require('fs').promises;

// Detect compiled (dist) context for module loading inside the function
const isDist = __dirname.includes(path.sep + 'dist' + path.sep);

/**
 * Process OCR job asynchronously with Google Vision AI.
 * Updates ocr_jobs row with status, confidence, extracted text, and Vision JSON result.
 * Writes artifacts to /uploads/om_church_<id>/processed/ on disk.
 *
 * @param {object} db        — DB pool (platform pool typically)
 * @param {number} jobId     — ocr_jobs.id
 * @param {string} imagePath — absolute path to the image file
 * @param {object} options   — { language, recordType, engine, churchId, preProcessingScript }
 */
async function processOcrJobAsync(db, jobId, imagePath, options = {}) {
  const startTime = Date.now();
  const { language = 'en', recordType = 'baptism', engine = 'google-vision' } = options;
  
  try {
    console.log(`🔍 Processing OCR job ${jobId} with ${engine}: ${imagePath}`);
    
    // Update job status to processing in DB (best-effort)
    try {
      await db.query('UPDATE ocr_jobs SET status = ?, processing_started_at = NOW() WHERE id = ?', ['processing', jobId]);
    } catch (dbError) {
      // Fallback without processing_started_at for older schemas
      try {
        await db.query('UPDATE ocr_jobs SET status = ? WHERE id = ?', ['processing', jobId]);
      } catch (dbError2) {
        console.warn(`[OCR Processing] DB status update to 'processing' failed (non-blocking):`, dbError2.message);
      }
    }
    
    // Update Job Bundle manifest to processing (best-effort, non-blocking)
    try {
      let jobBundleModule;
      try {
        jobBundleModule = require('../utils/jobBundle');
      } catch (e) {
        try {
          jobBundleModule = require('../utils/jobBundle');
        } catch (e2) {
          jobBundleModule = null;
        }
      }
      
      if (jobBundleModule) {
        const { writeManifest } = jobBundleModule;
        await writeManifest(options.churchId || 46, String(jobId), {
          status: 'processing',
        });
        console.log(`[JobBundle] Updated manifest status to 'processing' for job ${jobId}`);
      }
    } catch (bundleError) {
      console.warn(`[JobBundle] Could not update manifest to 'processing' for job ${jobId} (non-blocking):`, bundleError.message);
    }
    
    // Only process with Google Vision AI if engine is set to google-vision
    if (engine === 'google-vision') {
      const vision = require('@google-cloud/vision');
      
      // Initialize client with credentials from environment
      const visionClientConfig = {
        projectId: process.env.GOOGLE_CLOUD_PROJECT_ID
      };
      
      if (process.env.GOOGLE_VISION_KEY_PATH) {
        visionClientConfig.keyFilename = process.env.GOOGLE_VISION_KEY_PATH;
      } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
        visionClientConfig.keyFilename = process.env.GOOGLE_APPLICATION_CREDENTIALS;
      }
      
      const client = new vision.ImageAnnotatorClient(visionClientConfig);
      
      // Read the image file
      const imageBuffer = await fs.readFile(imagePath);
      
      // Configure OCR request with language hints
      const request = {
        image: { content: imageBuffer },
        imageContext: {
          languageHints: [language, 'en'], // Always include English as fallback
        },
        features: [
          { type: 'TEXT_DETECTION' },
          { type: 'DOCUMENT_TEXT_DETECTION' }
        ]
      };
      
      console.log(`🌐 Calling Google Vision API with language: ${language}`);
      
      // Call Google Vision API
      const [result] = await client.annotateImage(request);
      
      const textAnnotations = result.textAnnotations || [];
      const fullTextAnnotation = result.fullTextAnnotation || {};
      
      // Extract text and confidence
      const extractedText = textAnnotations.length > 0 ? textAnnotations[0].description : '';
      
      // Calculate average confidence from pages if available
      let totalConfidence = 0;
      let count = 0;
      
      // Try to get confidence from fullTextAnnotation pages
      if (fullTextAnnotation.pages) {
        fullTextAnnotation.pages.forEach(page => {
          if (page.confidence !== undefined) {
            totalConfidence += page.confidence;
            count++;
          }
          // Also check blocks for confidence
          (page.blocks || []).forEach(block => {
            if (block.confidence !== undefined) {
              totalConfidence += block.confidence;
              count++;
            }
          });
        });
      }
      
      // Fallback to textAnnotations confidence
      if (count === 0) {
        textAnnotations.forEach(annotation => {
          if (annotation.confidence !== undefined) {
            totalConfidence += annotation.confidence;
            count++;
          }
        });
      }
      
      const confidence = count > 0 ? totalConfidence / count : 0.85;
      
      console.log(`📝 OCR completed: ${extractedText.length} characters extracted`);
      console.log(`🎯 Confidence score: ${(confidence * 100).toFixed(1)}%`);
      
      const processingTime = Date.now() - startTime;
      
      // Prepare Vision result JSON for bounding box overlay support
      // Include textAnnotations (words with bboxes) and fullTextAnnotation (structured data)
      const visionResultJson = {
        textAnnotations: textAnnotations.map(a => ({
          description: a.description,
          boundingPoly: a.boundingPoly,
          confidence: a.confidence
        })),
        fullTextAnnotation: fullTextAnnotation
      };
      const visionResultJsonStr = JSON.stringify(visionResultJson);
      
      const path = require('path');
      
      // Get churchId from options
      const churchId = options.churchId || 46;
      // Use absolute path: /var/www/orthodoxmetrics/prod/server/uploads/om_church_##/processed
      const baseUploadPath = process.env.UPLOAD_BASE_PATH || '/var/www/orthodoxmetrics/prod/server/uploads';
      const baseUploadDir = path.join(baseUploadPath, `om_church_${churchId}`);
      const processedDir = path.join(baseUploadDir, 'processed');
      
      console.log(`📁 Base upload path: ${baseUploadPath}`);
      console.log(`📁 Processed dir: ${processedDir}`);
      
      // Ensure processed directory exists
      await fs.mkdir(processedDir, { recursive: true });
      
      // Get original filename from path
      const originalFilename = path.basename(imagePath);
      const filenameWithoutExt = path.parse(originalFilename).name;
      
      // Write OCR text result to file
      const textFilePath = path.join(processedDir, `${filenameWithoutExt}_ocr.txt`);
      const ocrOutput = [
        `=== OCR Result for Job ${jobId} ===`,
        `File: ${originalFilename}`,
        `Processed: ${new Date().toISOString()}`,
        `Confidence: ${(confidence * 100).toFixed(1)}%`,
        `Processing Time: ${processingTime}ms`,
        ``,
        `=== Extracted Text ===`,
        extractedText,
        ``,
        `=== End ===`
      ].join('\n');
      
      await fs.writeFile(textFilePath, ocrOutput, 'utf8');
      console.log(`📄 OCR result written to: ${textFilePath}`);
      
      // Write full Vision JSON result to separate file (for bounding boxes)
      const jsonFilePath = path.join(processedDir, `${filenameWithoutExt}_ocr.json`);
      await fs.writeFile(jsonFilePath, visionResultJsonStr, 'utf8');
      console.log(`📄 OCR JSON written to: ${jsonFilePath}`);
      
      // Move image from uploaded to processed
      const processedImagePath = path.join(processedDir, originalFilename);
      try {
        await fs.rename(imagePath, processedImagePath);
        console.log(`📁 Image moved to: ${processedImagePath}`);
      } catch (moveError) {
        // If rename fails (cross-device), try copy then delete
        if (moveError.code === 'EXDEV') {
          await fs.copyFile(imagePath, processedImagePath);
          await fs.unlink(imagePath);
          console.log(`📁 Image copied to: ${processedImagePath}`);
        } else {
          console.warn(`⚠️ Could not move image: ${moveError.message}`);
        }
      }
      
      // ============================================================================
      // PRE-PROCESSING SCRIPT HOOK
      // ============================================================================
      // Run custom script before finalizing processing (if configured)
      // This runs after OCR is complete but before database update
      const preProcessingScript = process.env.OCR_PRE_PROCESSING_SCRIPT || options.preProcessingScript;
      if (preProcessingScript) {
        try {
          console.log(`🔧 Running pre-processing script: ${preProcessingScript}`);
          const { exec } = require('child_process');
          const { promisify } = require('util');
          const execAsync = promisify(exec);
          
          // Prepare environment variables for the script
          const scriptEnv = {
            ...process.env,
            OCR_JOB_ID: String(jobId),
            OCR_CHURCH_ID: String(churchId),
            OCR_IMAGE_PATH: processedImagePath,
            OCR_TEXT_FILE: textFilePath,
            OCR_JSON_FILE: jsonFilePath,
            OCR_EXTRACTED_TEXT: extractedText,
            OCR_CONFIDENCE: String(confidence),
            OCR_RECORD_TYPE: recordType || 'baptism',
            OCR_LANGUAGE: language || 'en',
            OCR_PROCESSING_TIME: String(processingTime),
          };
          
          // Execute the script with a timeout (5 minutes max)
          const { stdout, stderr } = await execAsync(preProcessingScript, {
            env: scriptEnv,
            timeout: 300000, // 5 minutes
            cwd: path.dirname(preProcessingScript) || process.cwd(),
          });
          
          if (stdout) {
            console.log(`[Pre-Processing Script] stdout:`, stdout);
          }
          if (stderr) {
            console.warn(`[Pre-Processing Script] stderr:`, stderr);
          }
          
          console.log(`✅ Pre-processing script completed successfully`);
        } catch (scriptError) {
          // Log error but don't fail the OCR job
          console.error(`❌ Pre-processing script failed (non-blocking):`, scriptError.message);
          console.error(`   Script: ${preProcessingScript}`);
          console.error(`   Error:`, scriptError);
        }
      }
      
      // Update job status and file path in database (check columns dynamically)
      let dbUpdateSuccess = false;
      try {
        // Check which columns exist in the table
        const [columns] = await db.query(`SHOW COLUMNS FROM ocr_jobs`);
        const columnNames = new Set(columns.map(c => c.Field));
        
        // Build UPDATE statement dynamically based on available columns
        const updateParts = [];
        const updateValues = [];
        
        // Always try these columns
        if (columnNames.has('status')) {
          updateParts.push('status = ?');
          updateValues.push('completed');
        }
        if (columnNames.has('file_path')) {
          updateParts.push('file_path = ?');
          updateValues.push(processedImagePath);
        }
        if (columnNames.has('confidence_score')) {
          updateParts.push('confidence_score = ?');
          updateValues.push(confidence);
        }
        if (columnNames.has('ocr_text') && extractedText) {
          updateParts.push('ocr_text = ?');
          updateValues.push(extractedText);
        }
        if (columnNames.has('ocr_result_json') && visionResultJsonStr) {
          updateParts.push('ocr_result_json = ?');
          updateValues.push(visionResultJsonStr);
        }
        if (columnNames.has('updated_at')) {
          updateParts.push('updated_at = NOW()');
        }
        
        if (updateParts.length > 0) {
          updateValues.push(jobId);
          await db.query(`
            UPDATE ocr_jobs SET 
              ${updateParts.join(', ')}
            WHERE id = ?
          `, updateValues);
          dbUpdateSuccess = true;
          console.log(`[OCR Processing] DB updated successfully for job ${jobId} with ${updateParts.length} fields`);
        } else {
          console.warn(`[OCR Processing] No updatable columns found for job ${jobId}`);
        }
      } catch (dbError) {
        console.warn(`[OCR Processing] DB update failed, trying minimal update:`, dbError.message);
        // Try with minimal columns (status, file_path, confidence_score only)
        try {
          await db.query(`
            UPDATE ocr_jobs SET 
              status = 'completed',
              file_path = ?,
              confidence_score = ?,
              updated_at = NOW()
            WHERE id = ?
          `, [processedImagePath, confidence, jobId]);
          dbUpdateSuccess = true;
          console.log(`[OCR Processing] Minimal DB update succeeded for job ${jobId}`);
        } catch (dbError2) {
          // Try with 'complete' status if 'completed' fails (for older schemas)
          try {
            await db.query(`
              UPDATE ocr_jobs SET 
                status = 'complete',
                file_path = ?,
                confidence_score = ?,
                updated_at = NOW()
              WHERE id = ?
            `, [processedImagePath, confidence, jobId]);
            dbUpdateSuccess = true;
            console.log(`[OCR Processing] DB updated with 'complete' status for job ${jobId}`);
          } catch (dbError3) {
            console.warn(`[OCR Processing] All DB update attempts failed (non-blocking):`, dbError3.message);
          }
        }
      }
      
      // Update Job Bundle manifest to completed (if module exists)
      try {
        let jobBundleModule;
        const fs = require('fs');
        const path = require('path');
        
        // Use context detection instead of file existence check
        if (isDist) {
          try {
            jobBundleModule = require('../utils/jobBundle');
          } catch (e) {
            // Module exists but failed to load
            console.warn(`[JobBundle] Module found but failed to load:`, e.message);
          }
        } else {
          try {
            jobBundleModule = require('../utils/jobBundle');
          } catch (e) {
            try {
              jobBundleModule = require('../utils/jobBundle');
            } catch (e2) {
              console.warn(`[JobBundle] Module found but failed to load:`, e.message);
            }
          }
        }
        
        if (jobBundleModule && jobBundleModule.writeManifest) {
          const { writeManifest } = jobBundleModule;
          await writeManifest(options.churchId || 46, String(jobId), {
            status: 'completed',
          });
          console.log(`[JobBundle] ✅ Updated manifest status to 'completed' for job ${jobId}`);
        } else {
          // JobBundle module is optional - not all deployments have it
          console.log(`[JobBundle] Module not available (optional) - using DB status only for job ${jobId}`);
        }
      } catch (bundleError) {
        // Non-critical - DB update already succeeded
        console.warn(`[JobBundle] Could not update manifest for job ${jobId} (non-critical):`, bundleError.message);
      }
      
      console.log(`✅ OCR job ${jobId} completed successfully in ${processingTime}ms`);
      
      return {
        success: true,
        jobId,
        extractedText,
        confidence,
        processingTime
      };
    } else {
      // For other engines (tesseract, etc.), mark as completed with placeholder
      // TODO: Implement other OCR engines if needed
      console.log(`⚠️ OCR engine "${engine}" not yet implemented, marking as completed`);
      await db.query('UPDATE ocr_jobs SET status = ? WHERE id = ?', ['completed', jobId]);
      return { success: true, jobId, message: `Engine ${engine} not implemented` };
    }
    
  } catch (error) {
    console.error(`❌ OCR processing failed for job ${jobId}:`, error);
    
    const processingTime = Date.now() - startTime;
    
    // Update job with error status (best-effort DB write)
    try {
      await db.query(`
        UPDATE ocr_jobs SET 
          status = 'failed',
          error = ?,
          updated_at = NOW()
        WHERE id = ?
      `, [
        error.message || 'OCR processing failed',
        jobId
      ]);
    } catch (updateError) {
      // If error column doesn't exist, try without it
      try {
        await db.query('UPDATE ocr_jobs SET status = ? WHERE id = ?', ['failed', jobId]);
      } catch (dbError2) {
        console.warn(`[OCR Processing] DB error update failed (non-blocking):`, dbError2.message);
      }
    }
    
    // Update Job Bundle manifest (best-effort, non-blocking)
    try {
      let jobBundleModule;
      try {
        jobBundleModule = require('../utils/jobBundle');
      } catch (e) {
        try {
          jobBundleModule = require('../utils/jobBundle');
        } catch (e2) {
          jobBundleModule = null;
        }
      }
      
      if (jobBundleModule) {
        const { writeManifest } = jobBundleModule;
        await writeManifest(options.churchId || 46, String(jobId), {
          status: 'failed',
        });
        console.log(`[JobBundle] Updated manifest status to 'failed' for job ${jobId}`);
      }
    } catch (bundleError) {
      console.warn(`[JobBundle] Could not update manifest for job ${jobId} (non-blocking):`, bundleError.message);
    }
    
    throw error;
  }
}

module.exports = { processOcrJobAsync };
