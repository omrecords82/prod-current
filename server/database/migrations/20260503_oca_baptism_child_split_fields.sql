-- OCA baptism_child certificate template — replace single-field date and
-- combined parent_line with split fields that match the actual artwork:
--
--   "CHILD OF ___ AND ___"          → father_name + mother_name (separate spots)
--   "ON _________________, 20___"   → birth_date_md + birth_date_yy
--   "ON _________________, 20___"   → baptism_date_md + baptism_date_yy
--
-- Coordinates derived from the actual baptism-child.pdf bbox extraction:
-- pdftotext -layout -bbox storage/certificates/templates/OCA/baptism-child.pdf
-- pdf-lib uses bottom-left origin, so y = (792 - top_down_yMax_of_underline).
--
-- Idempotent: deletes the obsolete fields and INSERT IGNOREs on the unique
-- (template_id, field_key) constraint.

-- Resolve the baptism_child template id once. Stored in a session var to
-- keep the migration readable and DRY.
SET @oca_child_tpl := (
  SELECT t.id
    FROM certificate_template_groups g
    JOIN certificate_templates t ON t.template_group_id = g.id
   WHERE g.jurisdiction_code = 'OCA' AND g.template_type = 'baptism_child'
   ORDER BY t.id
   LIMIT 1
);

-- ─── 1. Reset the field set for this template ──────────────────────
-- Wipe ALL existing fields for the template so updated coordinates take
-- effect on every field — INSERT IGNORE on uq_template_field would skip
-- coordinate updates on existing rows. Migration is idempotent: re-running
-- produces the exact same final state.
DELETE FROM certificate_template_fields WHERE template_id = @oca_child_tpl;

-- ─── 2. Insert the full field set ───────────────────────────────────
-- All sort_order values renumbered so the final field set reads top-down.
INSERT INTO certificate_template_fields
  (template_id, field_key, label, source_type, source_path,
   x, y, width, height, font_family, font_size, font_weight, text_align,
   color, text_transform, is_required, is_multiline, sort_order)
VALUES
  -- Child name (centered on the long underline) — keep existing if present;
  -- this row is here so re-running the migration on a fresh DB still seeds it.
  (@oca_child_tpl, 'child_full_name', 'Child Name',         'computed', 'first_name+last_name',
   304, 346, 305, NULL, 'TimesRoman', 18.0, 'normal', 'center', '#000000', 'none', 1, 0, 10),

  -- CHILD OF ___ AND ___
  (@oca_child_tpl, 'father_name',     'Father Name',         'computed', 'parents|first',
   250, 324, 135, NULL, 'TimesRoman', 13.0, 'normal', 'center', '#000000', 'none', 0, 0, 20),
  (@oca_child_tpl, 'mother_name',     'Mother Name',         'computed', 'parents|second',
   422, 324, 135, NULL, 'TimesRoman', 13.0, 'normal', 'center', '#000000', 'none', 0, 0, 21),

  -- WHO WAS BORN IN ___
  (@oca_child_tpl, 'birthplace',      'Birthplace',          'record',   'birthplace',
   368, 302, 226, NULL, 'TimesRoman', 13.0, 'normal', 'center', '#000000', 'none', 0, 0, 30),

  -- ON _________________, 20___
  (@oca_child_tpl, 'birth_date_md',   'Birth Date (Month/Day)', 'computed', 'birth_date|md',
   291, 280, 194, NULL, 'TimesRoman', 13.0, 'normal', 'center', '#000000', 'none', 0, 0, 40),
  (@oca_child_tpl, 'birth_date_yy',   'Birth Date (YY)',     'computed', 'birth_date|yy',
   425, 280,  26, NULL, 'TimesRoman', 13.0, 'normal', 'center', '#000000', 'none', 0, 0, 41),

  -- BY ___
  (@oca_child_tpl, 'clergy_name',     'Officiating Clergy',  'record',   'clergy',
   316, 212, 282, NULL, 'TimesRoman', 13.0, 'normal', 'center', '#000000', 'none', 0, 0, 50),

  -- AT THE CHURCH OF ___
  (@oca_child_tpl, 'church_name',     'Church Name',         'church',   'name',
   372, 190, 226, NULL, 'TimesRoman', 13.0, 'normal', 'center', '#000000', 'none', 0, 0, 60),

  -- ON _________________, 20___
  (@oca_child_tpl, 'baptism_date_md', 'Baptism Date (Month/Day)', 'computed', 'reception_date|md',
   291, 168, 194, NULL, 'TimesRoman', 13.0, 'normal', 'center', '#000000', 'none', 0, 0, 70),
  (@oca_child_tpl, 'baptism_date_yy', 'Baptism Date (YY)',   'computed', 'reception_date|yy',
   425, 168,  26, NULL, 'TimesRoman', 13.0, 'normal', 'center', '#000000', 'none', 0, 0, 71),

  -- SPONSORS ___
  (@oca_child_tpl, 'sponsors',        'Sponsors',            'record',   'sponsors',
   338, 146, 281, NULL, 'TimesRoman', 12.0, 'normal', 'center', '#000000', 'none', 0, 0, 80),

  -- THIS IS A TRUE EXTRACT ... CHURCH OF ___ (small repeat near footer)
  (@oca_child_tpl, 'church_name_short','Church Name (footer)', 'church',  'name',
   400, 114, 149, NULL, 'TimesRoman', 11.0, 'normal', 'center', '#000000', 'none', 0, 0, 90),

  -- Rector signature line (lower-left)
  (@oca_child_tpl, 'rector_name',     'Rector',              'church',   'rector_name',
   202, 101, 130, NULL, 'TimesRoman', 11.0, 'normal', 'center', '#000000', 'none', 0, 0, 100);

-- ─── 3. Verification ────────────────────────────────────────────────
SELECT field_key, source_type, source_path, x, y, font_size, sort_order
  FROM certificate_template_fields
 WHERE template_id = @oca_child_tpl
 ORDER BY sort_order;
