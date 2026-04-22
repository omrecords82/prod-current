/**
 * Record field definitions for OCR field mapping.
 * Shared between OcrReviewDrawer, FieldMappingPanel, and OcrWorkbench.
 * headerHints used by columnMapper for generic column inference.
 */

export interface RecordField {
  key: string;
  label: string;
  required?: boolean;
  headerHints?: string[];
}

export const BAPTISM_FIELDS: RecordField[] = [
  { key: 'child_name', label: 'Name', required: true, headerHints: ['child', 'name of child', 'infant', 'baptized', 'christened', 'first name', 'full name', 'name'] },
  { key: 'date_of_birth', label: 'Date of Birth', headerHints: ['birth', 'born', 'date of birth'] },
  { key: 'place_of_birth', label: 'Place of Birth', headerHints: ['birthplace', 'place of birth', 'born at'] },
  { key: 'father_name', label: 'Father Name', headerHints: ['father', 'parent'] },
  { key: 'mother_name', label: 'Mother Name', headerHints: ['mother'] },
  { key: 'address', label: 'Address', headerHints: ['address', 'residence', 'domicile'] },
  { key: 'date_of_baptism', label: 'Date of Baptism', headerHints: ['baptism', 'baptized', 'christened', 'reception'] },
  { key: 'godparents', label: 'Godparents / Sponsors', headerHints: ['godparent', 'sponsor', 'sponsors', 'godmother', 'godfather'] },
  { key: 'performed_by', label: "Priest's Name", headerHints: ['priest', 'clergy', 'officiant', 'performed', 'administered'] },
  { key: 'notes', label: 'Notes' },
];

export const MARRIAGE_FIELDS: RecordField[] = [
  { key: 'groom_name', label: 'Groom Name', required: true, headerHints: ['groom', 'husband', 'bridegroom'] },
  { key: 'groom_parents', label: 'Groom Parents', headerHints: ['groom parents', "groom's parents", 'parents'] },
  { key: 'bride_name', label: 'Bride Name', required: true, headerHints: ['bride', 'wife'] },
  { key: 'bride_parents', label: 'Bride Parents', headerHints: ['bride parents', "bride's parents"] },
  { key: 'date_of_marriage', label: 'Date of Marriage', headerHints: ['date', 'marriage date', 'wedding'] },
  { key: 'place_of_marriage', label: 'Place of Marriage', headerHints: ['place', 'location', 'venue'] },
  { key: 'witnesses', label: 'Witnesses', headerHints: ['witness', 'best man', 'maid'] },
  { key: 'officiant', label: 'Officiant', headerHints: ['priest', 'clergy', 'officiant', 'performed', 'administered'] },
  { key: 'license', label: 'License', headerHints: ['license', 'certificate'] },
  { key: 'notes', label: 'Notes' },
];

export const FUNERAL_FIELDS: RecordField[] = [
  { key: 'deceased_name', label: 'Deceased Name', required: true, headerHints: ['deceased', 'name', 'decedent', 'full name'] },
  { key: 'date_of_death', label: 'Date of Death', headerHints: ['death', 'died', 'date of death'] },
  { key: 'date_of_funeral', label: 'Date of Funeral', headerHints: ['funeral'] },
  { key: 'date_of_burial', label: 'Date of Burial', headerHints: ['burial', 'interment', 'buried'] },
  { key: 'place_of_burial', label: 'Place of Burial', headerHints: ['place of burial', 'cemetery', 'interment place'] },
  { key: 'age_at_death', label: 'Age at Death', headerHints: ['age'] },
  { key: 'cause_of_death', label: 'Cause of Death', headerHints: ['cause', 'cause of death'] },
  { key: 'next_of_kin', label: 'Next of Kin', headerHints: ['kin', 'relative', 'family'] },
  { key: 'officiant', label: 'Officiant', headerHints: ['priest', 'clergy', 'officiant', 'performed'] },
  { key: 'notes', label: 'Notes' },
];

export const getFieldsForType = (rt: string): RecordField[] => {
  if (rt === 'marriage') return MARRIAGE_FIELDS;
  if (rt === 'funeral') return FUNERAL_FIELDS;
  return BAPTISM_FIELDS;
};
