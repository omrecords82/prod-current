/**
 * Record field definitions for OCR field mapping.
 * Header hints align with parish Records DB columns
 * (prod/docs/sample_records/{baptism,marriage,funeral}/header_fields.png).
 */

export interface RecordField {
  key: string;
  label: string;
  required?: boolean;
  headerHints?: string[];
}

export const BAPTISM_FIELDS: RecordField[] = [
  { key: 'child_first_name', label: 'First Name', required: true, headerHints: ['first name', 'given name', 'child first'] },
  { key: 'child_last_name', label: 'Last Name', required: true, headerHints: ['last name', 'surname', 'child last'] },
  { key: 'date_of_birth', label: 'Date of Birth', headerHints: ['date of birth', 'birth', 'born'] },
  { key: 'date_of_baptism', label: 'Baptism Date', required: true, headerHints: ['baptism date', 'baptism', 'baptized', 'reception'] },
  { key: 'place_of_birth', label: 'Birthplace', headerHints: ['birthplace', 'place of birth', 'city of birth', 'born at'] },
  { key: 'entry_type', label: 'Entry Type', headerHints: ['entry type', 'baptism', 'chrismation', 'type'] },
  { key: 'godparents', label: 'Sponsors', headerHints: ['sponsor', 'sponsors', 'godparent', 'godmother', 'godfather'] },
  { key: 'parents', label: 'Parents', headerHints: ['parents', 'father', 'mother', 'parent'] },
  { key: 'performed_by', label: 'Officiating Priest', headerHints: ['officiating priest', 'priest', 'clergy', 'officiant', 'performed'] },
  { key: 'notes', label: 'Notes', headerHints: ['notes', 'remarks'] },
  { key: 'child_name', label: 'Name (combined)', headerHints: ['child', 'name of child', 'infant', 'name'] },
  { key: 'father_name', label: 'Father', headerHints: ['father'] },
  { key: 'mother_name', label: 'Mother', headerHints: ['mother'] },
  { key: 'record_number', label: 'Record #', headerHints: ['number', 'no', '#', 'record'] },
];

export const MARRIAGE_FIELDS: RecordField[] = [
  { key: 'date_of_marriage', label: 'Marriage Date', required: true, headerHints: ['marriage date', 'date of marriage', 'wedding', 'married'] },
  { key: 'groom_first_name', label: "Groom's First Name", required: true, headerHints: ["groom's first", 'groom first name', 'groom given'] },
  { key: 'groom_last_name', label: "Groom's Last Name", required: true, headerHints: ["groom's last", 'groom last name', 'groom surname'] },
  { key: 'groom_parents', label: "Groom's Parents", headerHints: ["groom's parents", 'groom parents', 'parents of groom'] },
  { key: 'bride_first_name', label: "Bride's First Name", required: true, headerHints: ["bride's first", 'bride first name', 'bride given'] },
  { key: 'bride_last_name', label: "Bride's Last Name", required: true, headerHints: ["bride's last", 'bride last name', 'bride surname'] },
  { key: 'bride_parents', label: "Bride's Parents", headerHints: ["bride's parents", 'bride parents', 'parents of bride'] },
  { key: 'witnesses', label: 'Witnesses', headerHints: ['witness', 'witnesses', 'best man', 'maid'] },
  { key: 'marriage_license', label: 'Marriage License', headerHints: ['marriage license', 'license', 'certificate'] },
  { key: 'officiant', label: 'Officiating Priest', headerHints: ['officiating priest', 'priest', 'clergy', 'officiant', 'bishop'] },
  { key: 'notes', label: 'Notes', headerHints: ['notes', 'remarks'] },
  { key: 'groom_name', label: 'Groom (combined)', headerHints: ['groom', 'bridegroom', 'husband'] },
  { key: 'bride_name', label: 'Bride (combined)', headerHints: ['bride', 'wife'] },
  { key: 'record_number', label: 'Record #', headerHints: ['number', 'no', '#'] },
];

export const FUNERAL_FIELDS: RecordField[] = [
  { key: 'date_of_death', label: 'Date of Death', headerHints: ['date of death', 'death', 'died'] },
  { key: 'date_of_burial', label: 'Burial Date', headerHints: ['burial date', 'date of burial', 'buried', 'interment'] },
  { key: 'deceased_first_name', label: "Deceased's First Name", required: true, headerHints: ["deceased's first", 'deceased first name', 'first name'] },
  { key: 'deceased_last_name', label: "Deceased's Last Name", required: true, headerHints: ["deceased's last", 'deceased last name', 'last name', 'surname'] },
  { key: 'age_at_death', label: 'Age at Death', headerHints: ['age at death', 'age'] },
  { key: 'officiant', label: 'Officiating Priest', headerHints: ['officiating priest', 'priest', 'clergy', 'officiant'] },
  { key: 'place_of_burial', label: 'Burial Location', headerHints: ['burial location', 'place of burial', 'cemetery', 'interment place'] },
  { key: 'notes', label: 'Notes', headerHints: ['notes', 'remarks'] },
  { key: 'deceased_name', label: 'Deceased (combined)', headerHints: ['deceased', 'name of deceased', 'decedent', 'name'] },
  { key: 'cause_of_death', label: 'Cause of Death', headerHints: ['cause', 'cause of death'] },
  { key: 'record_number', label: 'Record #', headerHints: ['number', 'no', '#'] },
];

export const getFieldsForType = (rt: string): RecordField[] => {
  if (rt === 'marriage') return MARRIAGE_FIELDS;
  if (rt === 'funeral') return FUNERAL_FIELDS;
  return BAPTISM_FIELDS;
};
