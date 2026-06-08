# OCR Worker Pipeline

**Task 3 reference** — layout/structure identification path (not auto-learning).

```
Upload (uploader / batch import)
    ↓
ocr_jobs created (status: pending, review_status: uploaded)
    ↓
Preprocessing (rotation, snippets toggle, page split)
    ↓
Layout detection → column bands / header_y_threshold
    ↓
Extractor selection (ocr_extractors: approved/default only in production worker)
    ↓
Extraction (Vision / tabular / agent_extract)
    ↓
record_candidates.json + table assembly
    ↓
ParishRulesEngine evaluation (global → diocesan → church)
    ↓
Human review (OcrReviewPage) → seed / commit
    ↓
Tenant records saved
```

## Layout lifecycle

1. **Unknown layout** → candidate extractor (`status: candidate`)
2. **Operator review** → approve → `status: approved`, optional `is_default`
3. **Production worker** uses only `approved` or legacy NULL status templates

## Adding a new parish ledger layout

1. Upload sample page(s)
2. Unknown layout generates candidate template with column bands + headers
3. Review candidate in layout template UI (source page, bands, sample rows)
4. Approve template
5. Run `node server/scripts/ocr-regression-runner.js --fixtures ./server/test-fixtures/ocr`
6. Mark approved template default for church + record_type

## Failure categories (error field prefix)

| Prefix | Meaning |
|--------|---------|
| `[image_quality]` | Unreadable scan, rotation failure |
| `[unknown_layout]` | No matching approved extractor |
| `[rule_blocker]` | Rules engine blocked completion |
| `[vision_api]` | Vision/Gemini API failure |
| `[worker_error]` | Internal worker exception |
