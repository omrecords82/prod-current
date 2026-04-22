# Schema Registry Implementation Summary

## Branch
`feat/schema-registry-fields`

## Problem: Field Name/Label Mismatch

### Prior Mismatch Cause

**Two separate field definition sources** caused inconsistencies:

1. **FusionTab** (`components/FusionTab.tsx`):
   - Used `RECORD_FIELDS` from `config/recordFields.ts`
   - Field keys: `child_name`, `date_of_birth`, `date_of_baptism`, `godparents`, `performed_by`
   - These keys matched `LABEL_DICTIONARIES` canonical fields

2. **MappingTab** (`components/MappingTab.tsx`):
   - Used hardcoded `FIELD_DEFINITIONS` array
   - Field keys: `first_name`, `last_name`, `dob`, `baptism_date`, `reception_date`, `godparents`, `priest`
   - Different keys entirely!

3. **autoMapFields** (`utils/visionParser.ts`):
   - Used `fieldNameMapping` to convert label dictionary fields to DB columns
   - Returned DB column names like `first_name`, `birth_date`, `reception_date`
   - Mismatch with both UI components!

### Result
- FusionTab expected `child_name`, but autoMapFields returned `first_name`
- MappingTab expected `dob`, but autoMapFields returned `birth_date`
- Labels like "Child:" were being mapped into `first_name` field
- Inconsistent field keys across components

## Solution: Canonical Schema Registry

### New Module: `src/shared/recordSchemas/registry.ts`

**Single source of truth** for field definitions:
- Canonical field keys (match `LABEL_DICTIONARIES`)
- Database column mappings
- UI labels
- Data types, required flags, display order
- Dev-only validation

**Key Features**:
- `getRecordSchema(recordType, options)` - Get fields for a record type
- `validateFieldKeys(recordType, keys)` - Dev-only validation
- `mapFieldKeyToDbColumn(recordType, key)` - Map canonical key to DB column
- `mapDbColumnToFieldKey(recordType, column)` - Reverse mapping

### Schema Keys (Canonical)

**Baptism**:
- `child_name` (not `first_name`/`last_name`)
- `date_of_birth` (not `dob`)
- `date_of_baptism` (not `reception_date`)
- `godparents` (not `sponsors`)
- `performed_by` (not `clergy`)

**Marriage**:
- `groom_name`, `bride_name` (not `groom_first`/`groom_last`)
- `date_of_marriage` (not `marriage_date`)
- `officiant` (not `priest`)

**Funeral**:
- `deceased_name` (not `first_name`/`last_name`)
- `date_of_death`, `date_of_funeral`, `date_of_burial`
- `officiant` (not `priest`)

## Files Changed

### 1. **`src/shared/recordSchemas/registry.ts`** (NEW)
- Canonical schema registry
- Field definitions with keys, labels, DB columns
- Validation functions
- Mapping functions

### 2. **`components/FusionTab.tsx`** (MODIFIED)
- **Before**: Used `RECORD_FIELDS` from `config/recordFields.ts`
- **After**: Uses `getRecordSchema()` from registry
- Added dev-only validation in `useEffect`
- Converts schema to `RECORD_FIELDS` format for backward compatibility

**Changes**:
- Import: Added `getRecordSchema`, `validateFieldKeys`
- `currentFields` useMemo: Now uses `getRecordSchema()` instead of `RECORD_FIELDS`
- Added validation effect for `mappedFields` keys

### 3. **`components/MappingTab.tsx`** (MODIFIED)
- **Before**: Used hardcoded `FIELD_DEFINITIONS` array
- **After**: Uses `getRecordSchema()` from registry
- Removed `FIELD_DEFINITIONS` constant
- Removed `FIELD_TO_COLUMN_MAP` (uses `mapFieldKeyToDbColumn()` instead)
- Updated `handleTokenClick` to use canonical key `child_name` instead of `first_name`
- Added dev-only validation

**Changes**:
- Import: Added `getRecordSchema`, `validateFieldKeys`, `mapFieldKeyToDbColumn`
- Removed `FIELD_DEFINITIONS` constant
- Removed `FIELD_TO_COLUMN_MAP` constant
- `fields` useMemo: Now uses `getRecordSchema()` instead of `FIELD_DEFINITIONS`
- `handleTokenClick`: Uses `child_name` canonical key
- Field rendering: Uses `field.dbColumn` from schema instead of `FIELD_TO_COLUMN_MAP`
- Added validation effects

### 4. **`utils/visionParser.ts`** (MODIFIED)
- **Before**: Used `fieldNameMapping` to convert to DB column names
- **After**: Uses canonical schema keys directly
- Removed complex `fieldNameMapping` logic
- Returns canonical keys (e.g., `child_name`, `date_of_birth`)
- Added dev-only validation

**Changes**:
- Import: Added `getRecordSchema`, `validateFieldKeys` (dynamic require to avoid circular deps)
- Removed `fieldNameMapping` object
- Uses `label.canonicalField` directly (already matches schema keys)
- Added validation for result keys

### 5. **`utils/recordFieldMapper.ts`** (MODIFIED)
- **Before**: Mapped to form field keys like `first_name`, `birth_date`
- **After**: Maps to canonical schema keys like `child_name`, `date_of_birth`
- Updated field mappings to use canonical keys

**Changes**:
- Import: Added `getRecordSchema`, `mapFieldKeyToDbColumn`
- Updated `fieldMapping` to use canonical keys
- `child_name_raw` → `child_name` (not `first_name`)
- `birth_date_raw` → `date_of_birth` (not `birth_date`)
- `reception_date_raw` → `date_of_baptism` (not `reception_date`)
- `sponsors_raw` → `godparents` (not `sponsors`)
- `clergy_raw` → `performed_by` (not `clergy`)

## How Registry Fixes the Mismatch

1. **Single Source**: All components use `getRecordSchema()` - no duplicate definitions
2. **Canonical Keys**: Keys match `LABEL_DICTIONARIES` canonical fields
3. **Consistent Mapping**: Auto-mapping returns canonical keys, UI components expect canonical keys
4. **DB Mapping**: Registry provides `mapFieldKeyToDbColumn()` for DB operations
5. **Validation**: Dev-only validation catches mismatches early

## Migration Notes

- **Breaking Change**: Field keys changed from DB column names to canonical keys
- **DB Commit**: Must map canonical keys to DB columns at commit time (not in UI)
- **Backward Compatibility**: FusionTab converts schema to `RECORD_FIELDS` format for existing code

## Testing

1. **Dev Mode Validation**: Check browser console for validation warnings
2. **Field Keys**: Verify both FusionTab and MappingTab show same field keys
3. **Auto-Map**: Verify auto-mapping populates fields correctly
4. **DB Commit**: Verify canonical keys are mapped to DB columns correctly

## Next Steps

1. Update DB commit logic to map canonical keys to DB columns
2. Add migration for existing drafts/mappings
3. Add more field definitions as needed
4. Consider adding field validation rules to registry

