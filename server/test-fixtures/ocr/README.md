# OCR regression fixtures

Add one directory per case with `fixture.json`:

```json
{
  "name": "baptism_sample_church_1",
  "church_id": 1,
  "record_type": "baptism",
  "job_id": 12345,
  "notes": "Approved layout baseline"
}
```

Required coverage (task 3):

- baptism
- marriage
- funeral
- sideways (rotation case)
- snippets_disabled

Run: `node server/scripts/ocr-regression-runner.js --fixtures ./server/test-fixtures/ocr`

See also: `server/docs/ocr/pipeline.md`
