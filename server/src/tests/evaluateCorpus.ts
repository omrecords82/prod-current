import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env') });

const { getAppPool, getTenantPool } = require('../config/db');
const { processJob } = require('../workers/ocrFeederWorker');
const { extractAgentFieldsForJob } = require('../utils/ocrClassifier');

const CORPUS_BASE = '/var/omai-ops/data/orthodoxmetrics/ocr-corpus/sample_records';
const CACHE_DIR = '/var/www/orthodoxmetrics/prod/server/storage/test_cache';
const CHURCH_ID = 278; // Test Church

interface CorpusItem {
  name: string;
  relativePath: string;
  absolutePath?: string;
  recordType: 'baptism' | 'marriage' | 'funeral';
  layoutGroup: string; // 'layout1' | 'layout2' | 'layout3' | 'layout4'
  expectedLayoutType: 'tabular' | 'form' | 'narrative';
}

const TEST_CORPUS: CorpusItem[] = [
  {
    name: 'Baptism Tabular Spread',
    relativePath: 'baptism/layout1/IMG_2024_10_18_11_04_55S.jpg',
    recordType: 'baptism',
    layoutGroup: 'layout1',
    expectedLayoutType: 'tabular'
  },
  {
    name: 'Baptism Narrative Journal',
    relativePath: 'baptism/layout2/IMG_2024_10_25_12_30_55S.jpg',
    recordType: 'baptism',
    layoutGroup: 'layout2',
    expectedLayoutType: 'narrative'
  },
  {
    name: 'Baptism Printed Form',
    relativePath: 'baptism/layout3/IMG_2025_03_05_10_05_50S.jpg',
    recordType: 'baptism',
    layoutGroup: 'layout3',
    expectedLayoutType: 'form'
  },
  {
    name: 'Baptism Multi-Doc Composite',
    relativePath: 'baptism/layout4/IMG_2025_03_05_10_22_06S.jpg',
    recordType: 'baptism',
    layoutGroup: 'layout4',
    expectedLayoutType: 'form' // each document is a form
  },
  {
    name: 'Funeral Tabular Ledger',
    relativePath: 'funeral/layout1/IMG_2024_10_22_11_39_09S.jpg',
    recordType: 'funeral',
    layoutGroup: 'layout1',
    expectedLayoutType: 'tabular'
  },
  {
    name: 'Funeral Narrative Paragraphs',
    relativePath: 'funeral/layout2/IMG_2024_10_24_04_47_33S.jpg',
    recordType: 'funeral',
    layoutGroup: 'layout2',
    expectedLayoutType: 'narrative'
  },
  {
    name: 'Funeral Composite Cards',
    relativePath: 'funeral/layout4/IMG_2025_03_28_12_51_55S.jpg',
    recordType: 'funeral',
    layoutGroup: 'layout4',
    expectedLayoutType: 'form'
  },
  {
    name: 'Marriage Tabular Ledger',
    relativePath: 'marriage/layout1/IMG_2024_10_22_11_27_20S.jpg',
    recordType: 'marriage',
    layoutGroup: 'layout1',
    expectedLayoutType: 'tabular'
  },
  {
    name: 'Marriage Narrative Paragraphs',
    relativePath: 'marriage/layout2/IMG_2024_10_25_12_34_52S.jpg',
    recordType: 'marriage',
    layoutGroup: 'layout2',
    expectedLayoutType: 'narrative'
  },
  {
    name: 'Marriage Printed Forms',
    relativePath: 'marriage/layout3/IMG_2025_03_12_12_37_53S.jpg',
    recordType: 'marriage',
    layoutGroup: 'layout3',
    expectedLayoutType: 'form'
  }
];

function getFileMd5(filePath: string): string {
  const content = fs.readFileSync(filePath);
  return crypto.createHash('md5').update(content).digest('hex');
}

async function cleanPreviousTestJobs(platformPool: any, tenantPool: any) {
  console.log('[Harness] Cleaning up previous test jobs for church 278...');
  const [jobs] = await platformPool.query(
    `SELECT id FROM ocr_jobs WHERE church_id = ? AND filename LIKE '%sample_records%'`,
    [CHURCH_ID]
  );
  
  const jobIds = jobs.map((j: any) => j.id);
  if (jobIds.length === 0) return;

  console.log(`[Harness] Deleting ${jobIds.length} old test jobs...`);
  const placeholders = jobIds.map(() => '?').join(',');

  // Delete tenant artifacts & pages
  await tenantPool.query(`DELETE FROM ocr_feeder_artifacts WHERE page_id IN (SELECT id FROM ocr_feeder_pages WHERE job_id IN (${placeholders}))`, jobIds);
  await tenantPool.query(`DELETE FROM ocr_feeder_pages WHERE job_id IN (${placeholders})`, jobIds);
  
  // Delete platform jobs
  await platformPool.query(`DELETE FROM ocr_jobs WHERE id IN (${placeholders})`, jobIds);
}

async function setupPageCache(tenantPool: any, jobId: number, md5: string, imagePath: string) {
  const cachePath = path.join(CACHE_DIR, md5);
  if (!fs.existsSync(cachePath)) {
    return false;
  }

  const visionJsonCached = path.join(cachePath, 'vision_result.json');
  const preprocCached = path.join(cachePath, 'preprocessed.jpg');
  const rawTextCached = path.join(cachePath, 'raw_text.txt');

  if (!fs.existsSync(visionJsonCached) || !fs.existsSync(preprocCached)) {
    return false;
  }

  console.log(`[Cache] Found cached OCR files for ${md5}. Restoring...`);

  // Create page folder under server/storage/feeder/job_{jobId}/page_0/
  const pageDir = path.join('/var/www/orthodoxmetrics/prod/server/storage/feeder', `job_${jobId}`, 'page_0');
  fs.mkdirSync(pageDir, { recursive: true });

  // Copy files
  fs.copyFileSync(preprocCached, path.join(pageDir, 'preprocessed.jpg'));
  fs.copyFileSync(visionJsonCached, path.join(pageDir, 'vision_result.json'));
  if (fs.existsSync(rawTextCached)) {
    fs.copyFileSync(rawTextCached, path.join(pageDir, 'raw_text.txt'));
  }

  // Insert page in tenant DB with status 'parsing'
  const [insPageResult] = await tenantPool.query(
    `INSERT INTO ocr_feeder_pages (job_id, page_index, status, input_path, preproc_path, ocr_confidence, created_at, updated_at)
     VALUES (?, 0, 'parsing', ?, ?, 0.95, NOW(), NOW())`,
    [jobId, imagePath, path.join(pageDir, 'preprocessed.jpg')]
  );
  const pageId = insPageResult.insertId;

  // Insert raw_text & vision_json artifacts
  await tenantPool.query(
    `INSERT INTO ocr_feeder_artifacts (page_id, type, storage_path, meta_json)
     VALUES (?, 'raw_text', ?, ?)`,
    [pageId, path.join(pageDir, 'raw_text.txt'), JSON.stringify({ confidence: 0.95, cached: true })]
  );

  const visionJsonContent = fs.readFileSync(visionJsonCached, 'utf8');
  const visionJson = JSON.parse(visionJsonContent);
  await tenantPool.query(
    `INSERT INTO ocr_feeder_artifacts (page_id, type, storage_path, meta_json)
     VALUES (?, 'vision_json', ?, ?)`,
    [
      pageId,
      path.join(pageDir, 'vision_result.json'),
      JSON.stringify({
        pages: visionJson.pages?.length || 1,
        totalChars: visionJson.text?.length || 0,
        cached: true
      })
    ]
  );

  return true;
}

async function savePageToCache(jobId: number, md5: string) {
  const pageDir = path.join('/var/www/orthodoxmetrics/prod/server/storage/feeder', `job_${jobId}`, 'page_0');
  const visionJsonPath = path.join(pageDir, 'vision_result.json');
  const preprocPath = path.join(pageDir, 'preprocessed.jpg');
  const rawTextPath = path.join(pageDir, 'raw_text.txt');

  if (fs.existsSync(visionJsonPath) && fs.existsSync(preprocPath)) {
    const cachePath = path.join(CACHE_DIR, md5);
    fs.mkdirSync(cachePath, { recursive: true });
    fs.copyFileSync(preprocPath, path.join(cachePath, 'preprocessed.jpg'));
    fs.copyFileSync(visionJsonPath, path.join(cachePath, 'vision_result.json'));
    if (fs.existsSync(rawTextPath)) {
      fs.copyFileSync(rawTextPath, path.join(cachePath, 'raw_text.txt'));
    }
    console.log(`[Cache] Saved OCR results to cache for md5 ${md5}`);
  }
}

async function evaluateAll() {
  const platformPool = getAppPool();
  const tenantPool = getTenantPool(CHURCH_ID);

  await cleanPreviousTestJobs(platformPool, tenantPool);

  const results = [];

  for (const item of TEST_CORPUS) {
    const absolutePath = path.join(CORPUS_BASE, item.relativePath);
    if (!fs.existsSync(absolutePath)) {
      console.error(`[Harness] File not found: ${absolutePath}`);
      continue;
    }

    console.log(`\n======================================================`);
    console.log(`[Harness] Running test for: ${item.name} (${item.relativePath})`);
    
    const md5 = getFileMd5(absolutePath);
    const start = Date.now();

    // 1. Create job in platform database
    const [insJobResult] = await platformPool.query(
      `INSERT INTO ocr_jobs (church_id, filename, record_type, status, review_status, uploaded_by, created_at)
       VALUES (?, ?, ?, 'pending', 'uploaded', 1, NOW())`,
      [CHURCH_ID, absolutePath, item.recordType]
    );
    const jobId = insJobResult.insertId;

    // 2. Set up page cache if available
    const isCached = await setupPageCache(tenantPool, jobId, md5, absolutePath);

    // 3. Process the job via worker processJob
    try {
      const [jobRows] = await platformPool.query(`SELECT * FROM ocr_jobs WHERE id = ?`, [jobId]);
      await processJob(jobRows[0]);

      // If we processed from scratch, save to cache
      if (!isCached) {
        await savePageToCache(jobId, md5);
      }

      // 4. Retrieve job outcomes
      const [jobResult] = await platformPool.query(
        `SELECT status, review_status, record_type, layout_classification_json, agent_extract_json FROM ocr_jobs WHERE id = ?`,
        [jobId]
      );
      
      const row = jobResult[0];
      const durationMs = Date.now() - start;

      const layoutClass = row.layout_classification_json 
        ? (typeof row.layout_classification_json === 'string' ? JSON.parse(row.layout_classification_json) : row.layout_classification_json)
        : null;

      const agentExtract = row.agent_extract_json
        ? (typeof row.agent_extract_json === 'string' ? JSON.parse(row.agent_extract_json) : row.agent_extract_json)
        : null;

      const recordsDetected = agentExtract?.records?.length || 0;
      let nonKeysSum = 0;
      let fieldsCount = 0;
      if (agentExtract?.records) {
        for (const rec of agentExtract.records) {
          const keys = Object.keys(rec);
          fieldsCount += keys.length;
          nonKeysSum += keys.filter(k => rec[k] && rec[k].toString().trim().length > 0).length;
        }
      }

      const fillRate = fieldsCount > 0 ? (nonKeysSum / fieldsCount) : 0;
      const layoutMatches = layoutClass?.detectedLayoutType === item.expectedLayoutType;

      const result = {
        name: item.name,
        file: item.relativePath,
        recordType: item.recordType,
        expectedLayoutType: item.expectedLayoutType,
        detectedLayoutType: layoutClass?.detectedLayoutType || 'unknown',
        layoutMatches,
        layoutConfidence: layoutClass?.layoutConfidence ?? 0,
        recordsDetected,
        fieldFillRate: parseFloat((fillRate * 100).toFixed(1)),
        durationMs,
        status: row.status,
        reviewStatus: row.review_status,
        cached: isCached
      };

      console.log(`[Result] Records: ${recordsDetected}, Fill Rate: ${result.fieldFillRate}%, Layout Detected: ${result.detectedLayoutType} (Matches expected: ${layoutMatches}), Duration: ${durationMs}ms`);
      results.push(result);

    } catch (err: any) {
      console.error(`[Error] Failed to process ${item.name}:`, err.message);
      results.push({
        name: item.name,
        file: item.relativePath,
        recordType: item.recordType,
        expectedLayoutType: item.expectedLayoutType,
        detectedLayoutType: 'error',
        layoutMatches: false,
        layoutConfidence: 0,
        recordsDetected: 0,
        fieldFillRate: 0,
        durationMs: Date.now() - start,
        status: 'failed',
        reviewStatus: 'failed',
        error: err.message
      });
    }
  }

  // Summarize overall results
  const total = results.length;
  const layoutCorrect = results.filter(r => r.layoutMatches).length;
  const layoutAcc = total > 0 ? (layoutCorrect / total) * 100 : 0;
  const avgFillRate = total > 0 ? results.reduce((sum, r) => sum + r.fieldFillRate, 0) / total : 0;
  const totalRecords = results.reduce((sum, r) => sum + r.recordsDetected, 0);
  const avgDuration = total > 0 ? results.reduce((sum, r) => sum + r.durationMs, 0) / total : 0;

  const summary = {
    timestamp: new Date().toISOString(),
    totalJobs: total,
    layoutAccuracy: parseFloat(layoutAcc.toFixed(1)),
    averageFieldFillRate: parseFloat(avgFillRate.toFixed(1)),
    totalRecordsDetected: totalRecords,
    averageDurationMs: Math.round(avgDuration),
    results
  };

  console.log(`\n======================================================`);
  console.log(`[Summary] Layout Accuracy: ${summary.layoutAccuracy}%`);
  console.log(`[Summary] Average Field Fill Rate: ${summary.averageFieldFillRate}%`);
  console.log(`[Summary] Total Records: ${summary.totalRecordsDetected}`);
  console.log(`[Summary] Average Duration: ${summary.averageDurationMs}ms`);
  console.log(`======================================================`);

  return summary;
}

if (require.main === module) {
  evaluateAll().then((summary) => {
    const reportPath = path.join(__dirname, 'evaluate_report.json');
    fs.writeFileSync(reportPath, JSON.stringify(summary, null, 2));
    console.log(`[Harness] Report written to ${reportPath}`);
    process.exit(0);
  }).catch((err) => {
    console.error('[Harness] Evaluation execution failed:', err);
    process.exit(1);
  });
}

export { evaluateAll };
