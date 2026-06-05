#!/usr/bin/env npx tsx
/**
 * columnMapper Tests
 *
 * Run:  npx tsx server/src/ocr/__tests__/columnMapper.test.ts
 *
 * Exits non-zero on any failure (CI-friendly).
 */

import { extractRecordCandidates, clusterTokensIntoLines, assignDefaultSuggestedFields } from '../columnMapper';

let passed = 0;
let failed = 0;

function assert(condition: boolean, message: string): void {
  if (!condition) {
    console.error(`  FAIL: ${message}`);
    failed++;
  } else {
    console.log(`  PASS: ${message}`);
    passed++;
  }
}

function assertEq<T>(actual: T, expected: T, message: string): void {
  if (actual !== expected) {
    console.error(`  FAIL: ${message}\n    expected: ${JSON.stringify(expected)}\n    actual:   ${JSON.stringify(actual)}`);
    failed++;
  } else {
    console.log(`  PASS: ${message}`);
    passed++;
  }
}

// ── Synthetic table builders ──────────────────────────────────────────────────

interface BuildCellOpts {
  column_index?: number;
  column_key?: string;
  content: string;
  confidence?: number;
}

function cell(opts: BuildCellOpts): any {
  return {
    column_index: opts.column_index,
    column_key: opts.column_key,
    content: opts.content,
    confidence: opts.confidence ?? 0.95,
  };
}

function row(row_index: number, cells: any[], type: 'header' | 'data' = 'data'): any {
  return { row_index, type, cells };
}

// Marriage ledger v1: cells use column_index (no column_key)
// Table 0 = [number, date, groom, groom_parents, bride, bride_parents]
// Table 1 = [priest, witnesses, license]
function marriageLedgerFixture(): any {
  return {
    layout_id: 'marriage_ledger_v1',
    tables: [
      {
        rows: [
          // Header rows (row_index 0-1)
          row(0, [
            cell({ column_index: 0, content: '#' }),
            cell({ column_index: 1, content: 'Date' }),
            cell({ column_index: 2, content: 'Groom' }),
          ], 'header'),
          row(1, [], 'header'),
          // Data row 1
          row(2, [
            cell({ column_index: 0, content: '1', confidence: 0.9 }),
            cell({ column_index: 1, content: '1945-08-20', confidence: 0.95 }),
            cell({ column_index: 2, content: 'Nicholas Petros', confidence: 0.92 }),
            cell({ column_index: 3, content: 'John & Mary Petros', confidence: 0.88 }),
            cell({ column_index: 4, content: 'Anna Mihail', confidence: 0.94 }),
            cell({ column_index: 5, content: 'George & Eleni Mihail', confidence: 0.86 }),
          ]),
          // Data row 2 - missing bride
          row(3, [
            cell({ column_index: 0, content: '2', confidence: 0.9 }),
            cell({ column_index: 1, content: '1945-09-15', confidence: 0.93 }),
            cell({ column_index: 2, content: 'Demetrios Konstantinou' }),
          ]),
          // Empty row - should be skipped
          row(4, [
            cell({ column_index: 0, content: '' }),
            cell({ column_index: 1, content: '' }),
          ]),
        ],
      },
      {
        rows: [
          row(0, [], 'header'),
          row(1, [], 'header'),
          row(2, [
            cell({ column_index: 0, content: 'Fr. Theodore', confidence: 0.91 }),
            cell({ column_index: 1, content: 'Peter, Maria', confidence: 0.87 }),
            cell({ column_index: 2, content: 'L-1234' }),
          ]),
          row(3, [
            cell({ column_index: 0, content: 'Fr. Theodore' }),
            cell({ column_index: 1, content: 'Stavros' }),
          ]),
        ],
      },
    ],
  };
}

// Generic baptism table with column_key headers
function genericBaptismFixture(): any {
  return {
    layout_id: 'generic_table_v1',
    tables: [
      {
        rows: [
          row(0, [
            cell({ column_key: 'col_a', content: 'Child Name' }),
            cell({ column_key: 'col_b', content: 'Date of Birth' }),
            cell({ column_key: 'col_c', content: 'Father' }),
            cell({ column_key: 'col_d', content: 'Mother' }),
            cell({ column_key: 'col_e', content: 'Sponsor' }),
            cell({ column_key: 'col_f', content: 'Random Header Stuff' }),
          ], 'header'),
          row(1, [
            cell({ column_key: 'col_a', content: 'John Smith', confidence: 0.93 }),
            cell({ column_key: 'col_b', content: '1923-05-12' }),
            cell({ column_key: 'col_c', content: 'Peter Smith' }),
            cell({ column_key: 'col_d', content: 'Mary Smith' }),
            cell({ column_key: 'col_e', content: 'Theodore' }),
            cell({ column_key: 'col_f', content: 'extra-data' }),
          ]),
        ],
      },
    ],
  };
}

// ── Tests: marriage ledger ────────────────────────────────────────────────────

function testMarriageLedgerBasic(): void {
  console.log('\n[marriage ledger — basic]');

  const result = extractRecordCandidates(marriageLedgerFixture(), '', 'marriage');

  assertEq(result.detectedType, 'marriage', 'detectedType is marriage');
  // Should produce 2 candidates (rows 2 and 3); row 4 was empty
  assertEq(result.candidates.length, 2, 'produces 2 candidates');

  const c1 = result.candidates[0];
  assertEq(c1.recordType, 'marriage', 'candidate[0] recordType is marriage');
  assertEq(c1.fields.groom_name, 'Nicholas Petros', 'candidate[0] maps groom column');
  assertEq(c1.fields.bride_name, 'Anna Mihail', 'candidate[0] maps bride column');
  assertEq(c1.fields.date_of_marriage, '1945-08-20', 'candidate[0] maps date column');
  assertEq(c1.fields.officiant, 'Fr. Theodore', 'candidate[0] merges priest from second table');
  assertEq(c1.fields.witnesses, 'Peter, Maria', 'candidate[0] merges witnesses from second table');
  assert(
    !!c1.fields.notes && c1.fields.notes.includes('groom_parents'),
    'candidate[0] notes contains groom_parents overflow'
  );
  assert(
    !!c1.fields.notes && c1.fields.notes.includes('license'),
    'candidate[0] notes contains license overflow'
  );
  assertEq(c1.needsReview, false, 'candidate[0] does not need review');
  assert(c1.confidence > 0 && c1.confidence <= 1, `candidate[0] confidence in (0,1] (got ${c1.confidence})`);

  const c2 = result.candidates[1];
  assertEq(c2.fields.groom_name, 'Demetrios Konstantinou', 'candidate[1] maps groom');
  assertEq(c2.fields.bride_name as any, undefined, 'candidate[1] missing bride');
  assertEq(c2.needsReview, true, 'candidate[1] needs review (missing bride)');
}

function testMarriageLedgerForcesType(): void {
  console.log('\n[marriage ledger — layout forces type]');

  // Pass jobRecordType=baptism but layout is marriage_ledger_v1 — layout wins
  const result = extractRecordCandidates(marriageLedgerFixture(), '', 'baptism');
  assertEq(result.detectedType, 'marriage', 'marriage_ledger_v1 layout overrides job type');
}

function testMarriageLedgerColumnMapping(): void {
  console.log('\n[marriage ledger — column mapping export]');

  const result = extractRecordCandidates(marriageLedgerFixture(), '', 'marriage');
  assert('groom' in result.columnMapping, 'columnMapping has groom');
  assert('bride' in result.columnMapping, 'columnMapping has bride');
  assertEq(result.columnMapping.groom, 'groom_name', 'groom maps to groom_name');
  assertEq(result.columnMapping.bride, 'bride_name', 'bride maps to bride_name');
}

// ── Tests: generic table ──────────────────────────────────────────────────────

function testGenericBaptismHeaderInference(): void {
  console.log('\n[generic baptism — header inference]');

  const result = extractRecordCandidates(genericBaptismFixture(), '', 'baptism');

  assertEq(result.detectedType, 'baptism', 'detectedType is baptism');
  assertEq(result.candidates.length, 1, 'produces 1 candidate');

  const c = result.candidates[0];
  assertEq(c.fields.child_name, 'John Smith', 'maps Child Name → child_name');
  assertEq(c.fields.date_of_birth, '1923-05-12', 'maps Date of Birth → date_of_birth');
  assertEq(c.fields.father_name, 'Peter Smith', 'maps Father → father_name');
  assertEq(c.fields.mother_name, 'Mary Smith', 'maps Mother → mother_name');
  assertEq(c.fields.godparents, 'Theodore', 'maps Sponsor → godparents');
  assert(
    !!c.fields.notes && c.fields.notes.includes('extra-data'),
    'notes contains unmapped column data'
  );
}

function testGenericTableUnmappedColumns(): void {
  console.log('\n[generic table — unmappedColumns reported]');

  const result = extractRecordCandidates(genericBaptismFixture(), '', 'baptism');
  assert(
    result.unmappedColumns.includes('col_f'),
    `unmappedColumns includes col_f (got ${JSON.stringify(result.unmappedColumns)})`
  );
}

// ── Tests: text-based detection ──────────────────────────────────────────────

function testTextDetectionOverridesJobType(): void {
  console.log('\n[text detection — strong signal overrides job type]');

  const fixture = genericBaptismFixture();
  // Strong baptism keywords in raw text
  const result = extractRecordCandidates(
    fixture,
    'baptism baptism godparent godmother godfather christening sponsor',
    'unknown'
  );
  assertEq(result.detectedType, 'baptism', 'classifier detects baptism from raw text');
  assert(result.typeConfidence > 0.3, `typeConfidence > 0.3 (got ${result.typeConfidence})`);
}

function testJobTypeFallback(): void {
  console.log('\n[fallback — job type used when classifier returns unknown]');

  const fixture = genericBaptismFixture();
  const result = extractRecordCandidates(fixture, '', 'baptism');
  assertEq(result.detectedType, 'baptism', 'falls back to job record type');
  assertEq(result.typeConfidence, 0, 'typeConfidence is 0 when only fallback');
}

function testUnknownTypePassthrough(): void {
  console.log('\n[unknown — no signal anywhere]');

  const fixture = genericBaptismFixture();
  const result = extractRecordCandidates(fixture, '', 'unknown');
  // Without classifier signal AND without a meaningful job type, type stays unknown
  assertEq(result.detectedType, 'unknown', 'detectedType remains unknown');
}

// ── Tests: edge cases ─────────────────────────────────────────────────────────

function testNullTableInput(): void {
  console.log('\n[edge — null/missing table input]');

  const result = extractRecordCandidates(null, '', 'baptism');
  assertEq(result.candidates.length, 0, 'no candidates from null input');
  assertEq(result.detectedType, 'baptism', 'detectedType still set from job type');
  assertEq(result.unmappedColumns.length, 0, 'no unmapped columns');
  assert(typeof result.parsedAt === 'string' && result.parsedAt.length > 0, 'parsedAt is set');
}

function testEmptyTablesArray(): void {
  console.log('\n[edge — empty tables array]');

  const result = extractRecordCandidates({ tables: [] }, '', 'baptism');
  assertEq(result.candidates.length, 0, 'no candidates from empty tables');
}

function testEmptyRowsSkipped(): void {
  console.log('\n[edge — entirely empty data rows are skipped]');

  const fixture = {
    layout_id: 'generic_table_v1',
    tables: [
      {
        rows: [
          row(0, [
            cell({ column_key: 'col_a', content: 'Child Name' }),
          ], 'header'),
          row(1, [
            cell({ column_key: 'col_a', content: '' }),
          ]),
          row(2, [
            cell({ column_key: 'col_a', content: 'Real Name' }),
          ]),
        ],
      },
    ],
  };

  const result = extractRecordCandidates(fixture, '', 'baptism');
  assertEq(result.candidates.length, 1, 'only the non-empty data row produces a candidate');
  assertEq(result.candidates[0].fields.child_name, 'Real Name', 'kept the right row');
}

function testParsedAtFormat(): void {
  console.log('\n[parsedAt format]');

  const result = extractRecordCandidates(genericBaptismFixture(), '', 'baptism');
  // ISO 8601 format check
  assert(
    /^\d{4}-\d{2}-\d{2}T/.test(result.parsedAt),
    `parsedAt is ISO 8601 (got ${result.parsedAt})`
  );
}

function testTokenLineClustering(): void {
  console.log('\n[Token Line Clustering]');

  // 1. One-line column
  const oneLineTokens = [
    { text: 'John', x_min: 0.1, y_min: 0.2, x_max: 0.15, y_max: 0.22, x_center: 0.125, y_center: 0.21, height: 0.02, confidence: 0.95 },
    { text: 'Smith', x_min: 0.16, y_min: 0.2, x_max: 0.22, y_max: 0.22, x_center: 0.19, y_center: 0.21, height: 0.02, confidence: 0.97 }
  ];
  const oneLineRes = clusterTokensIntoLines(oneLineTokens);
  assertEq(oneLineRes.length, 1, 'One-line column produces 1 line');
  assertEq(oneLineRes[0].text, 'John Smith', 'Tokens merged in reading order');
  assert(Math.abs(oneLineRes[0].confidence! - 0.96) < 0.001, 'Confidence averaged');

  // 2. Two clearly stacked lines
  const twoLineTokens = [
    { text: 'Line1', x_min: 0.1, y_min: 0.2, x_max: 0.2, y_max: 0.22, x_center: 0.15, y_center: 0.21, height: 0.02, confidence: 0.9 },
    { text: 'Line2', x_min: 0.1, y_min: 0.25, x_max: 0.2, y_max: 0.27, x_center: 0.15, y_center: 0.26, height: 0.02, confidence: 0.8 }
  ];
  const twoLineRes = clusterTokensIntoLines(twoLineTokens);
  assertEq(twoLineRes.length, 2, 'Two clearly stacked lines produces 2 lines');
  assertEq(twoLineRes[0].text, 'Line1', 'First line is top');
  assertEq(twoLineRes[1].text, 'Line2', 'Second line is bottom');

  // 3. Multiline wrapped name
  const wrappedNameTokens = [
    { text: 'First', x_min: 0.1, y_min: 0.2, x_max: 0.15, y_max: 0.22, x_center: 0.125, y_center: 0.21, height: 0.02 },
    { text: 'Middle', x_min: 0.16, y_min: 0.2, x_max: 0.22, y_max: 0.22, x_center: 0.19, y_center: 0.21, height: 0.02 },
    { text: 'Lastname', x_min: 0.1, y_min: 0.24, x_max: 0.25, y_max: 0.26, x_center: 0.175, y_center: 0.25, height: 0.02 }
  ];
  const wrappedRes = clusterTokensIntoLines(wrappedNameTokens);
  assertEq(wrappedRes.length, 2, 'Wrapped name produces 2 lines');
  assertEq(wrappedRes[0].text, 'First Middle', 'First line contains First Middle');
  assertEq(wrappedRes[1].text, 'Lastname', 'Second line contains Lastname');

  // 4. Uneven token heights
  const unevenTokens = [
    { text: 'HugeText', x_min: 0.1, y_min: 0.2, x_max: 0.25, y_max: 0.25, x_center: 0.175, y_center: 0.225, height: 0.05 },
    { text: 'TinySub', x_min: 0.1, y_min: 0.27, x_max: 0.15, y_max: 0.28, x_center: 0.125, y_center: 0.275, height: 0.01 }
  ];
  const unevenRes = clusterTokensIntoLines(unevenTokens);
  assertEq(unevenRes.length, 2, 'Uneven token heights produces 2 lines');
  assertEq(unevenRes[0].text, 'HugeText', 'Huge text line');
  assertEq(unevenRes[1].text, 'TinySub', 'Tiny sub text line');

  // 5. Closely spaced lines
  const closeTokens = [
    { text: 'Top', x_min: 0.1, y_min: 0.2, x_max: 0.2, y_max: 0.22, x_center: 0.15, y_center: 0.21, height: 0.02 },
    { text: 'Mid', x_min: 0.1, y_min: 0.23, x_max: 0.2, y_max: 0.25, x_center: 0.15, y_center: 0.24, height: 0.02 }
  ];
  const closeRes = clusterTokensIntoLines(closeTokens);
  assertEq(closeRes.length, 2, 'Closely spaced lines resolved as 2 lines');

  // 6. Empty column
  const emptyRes = clusterTokensIntoLines([]);
  assertEq(emptyRes.length, 0, 'Empty token list produces 0 lines');

  // 7. Tokens near neighboring row boundaries
  const cell1Tokens = [{ text: 'Row1', x_center: 0.1, y_center: 0.2, height: 0.02, x_min: 0.1, y_min: 0.19, x_max: 0.2, y_max: 0.21 }];
  const cell2Tokens = [{ text: 'Row2', x_center: 0.1, y_center: 0.3, height: 0.02, x_min: 0.1, y_min: 0.29, x_max: 0.2, y_max: 0.31 }];
  const cell1Res = clusterTokensIntoLines(cell1Tokens);
  const cell2Res = clusterTokensIntoLines(cell2Tokens);
  assertEq(cell1Res[0].text, 'Row1', 'Row 1 isolated');
  assertEq(cell2Res[0].text, 'Row2', 'Row 2 isolated');

  // 8. Ambiguous three-line content
  const threeLineTokens = [
    { text: 'Line1', x_center: 0.15, y_center: 0.21, height: 0.02, x_min: 0.1, y_min: 0.2, x_max: 0.2, y_max: 0.22 },
    { text: 'Line2', x_center: 0.15, y_center: 0.26, height: 0.02, x_min: 0.1, y_min: 0.25, x_max: 0.2, y_max: 0.27 },
    { text: 'Line3', x_center: 0.15, y_center: 0.31, height: 0.02, x_min: 0.1, y_min: 0.3, x_max: 0.2, y_max: 0.32 }
  ];
  const threeLineRes = clusterTokensIntoLines(threeLineTokens);
  assertEq(threeLineRes.length, 3, 'Ambiguous 3 lines detected correctly');

  // 9. Baptism date and parent default mappings
  assignDefaultSuggestedFields(twoLineRes, 'date_of_birth', 'baptism');
  assertEq(twoLineRes[0].suggested_field, 'date_of_birth', 'Line 0 -> date_of_birth');
  assertEq(twoLineRes[1].suggested_field, 'date_of_baptism', 'Line 1 -> date_of_baptism');

  const parentLines: CellLine[] = [
    { line_index: 0, text: 'Father', bbox: [], confidence: null, suggested_field: null },
    { line_index: 1, text: 'Mother', bbox: [], confidence: null, suggested_field: null }
  ];
  assignDefaultSuggestedFields(parentLines, 'father_name', 'baptism');
  assertEq(parentLines[0].suggested_field, 'father_name', 'Line 0 -> father_name');
  assertEq(parentLines[1].suggested_field, 'mother_name', 'Line 1 -> mother_name');

  // 10. Funeral date default mappings
  const funeralDateLines: CellLine[] = [
    { line_index: 0, text: 'Died', bbox: [], confidence: null, suggested_field: null },
    { line_index: 1, text: 'Buried', bbox: [], confidence: null, suggested_field: null }
  ];
  assignDefaultSuggestedFields(funeralDateLines, 'deceased_date', 'funeral');
  assertEq(funeralDateLines[0].suggested_field, 'deceased_date', 'Line 0 -> deceased_date');
  assertEq(funeralDateLines[1].suggested_field, 'burial_date', 'Line 1 -> burial_date');

  // Check ambiguity
  assignDefaultSuggestedFields(threeLineRes, 'date_of_birth', 'baptism');
  assertEq(threeLineRes[0].suggested_field, null, '3-line DOB is ambiguous (Line 0)');
  assertEq(threeLineRes[1].suggested_field, null, '3-line DOB is ambiguous (Line 1)');
  assertEq(threeLineRes[2].suggested_field, null, '3-line DOB is ambiguous (Line 2)');
}

// ── Main runner ──────────────────────────────────────────────────────────────

function main(): void {
  console.log('=== columnMapper tests ===');

  testMarriageLedgerBasic();
  testMarriageLedgerForcesType();
  testMarriageLedgerColumnMapping();
  testGenericBaptismHeaderInference();
  testGenericTableUnmappedColumns();
  testTextDetectionOverridesJobType();
  testJobTypeFallback();
  testUnknownTypePassthrough();
  testNullTableInput();
  testEmptyTablesArray();
  testEmptyRowsSkipped();
  testParsedAtFormat();
  testTokenLineClustering();

  console.log(`\n=== Results: ${passed} passed, ${failed} failed ===`);
  process.exit(failed > 0 ? 1 : 0);
}

main();
