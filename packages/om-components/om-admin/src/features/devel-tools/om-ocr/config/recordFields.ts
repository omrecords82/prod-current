/**
 * Record Fields Configuration
 * Field definitions for each record type (extracted from types/fusion to avoid circular dependencies)
 */

export interface FieldDefinition {
  name: string;
  label: string;
  required: boolean;
  type: 'text' | 'date' | 'textarea';
}

export const RECORD_FIELDS: Record<string, FieldDefinition[]> = {
  baptism: [
    { name: 'record_number', label: 'Record #', required: false, type: 'text' },
    { name: 'child_name', label: 'Name of Child', required: true, type: 'text' },
    { name: 'date_of_birth', label: 'Date of Birth', required: false, type: 'date' },
    { name: 'place_of_birth', label: 'Place of Birth', required: false, type: 'text' },
    { name: 'father_name', label: "Father's Name", required: false, type: 'text' },
    { name: 'mother_name', label: "Mother's Name", required: false, type: 'text' },
    { name: 'parents_name', label: 'Parents Name', required: false, type: 'text' },
    { name: 'address', label: 'Address', required: false, type: 'text' },
    { name: 'date_of_baptism', label: 'Date of Baptism', required: false, type: 'date' },
    { name: 'godparents', label: 'Godparents', required: false, type: 'text' },
    { name: 'performed_by', label: 'Performed By', required: false, type: 'text' },
    { name: 'church', label: 'Church', required: false, type: 'text' },
    { name: 'notes', label: 'Notes', required: false, type: 'textarea' },
  ],
  marriage: [
    { name: 'record_number', label: 'Record #', required: false, type: 'text' },
    { name: 'groom_name', label: 'Groom Name', required: true, type: 'text' },
    { name: 'bride_name', label: 'Bride Name', required: true, type: 'text' },
    { name: 'date_of_marriage', label: 'Date of Marriage', required: false, type: 'date' },
    { name: 'place_of_marriage', label: 'Place of Marriage', required: false, type: 'text' },
    { name: 'witnesses', label: 'Witnesses', required: false, type: 'text' },
    { name: 'best_man', label: 'Best Man', required: false, type: 'text' },
    { name: 'maid_of_honor', label: 'Maid of Honor', required: false, type: 'text' },
    { name: 'officiant', label: 'Officiant', required: false, type: 'text' },
    { name: 'church', label: 'Church', required: false, type: 'text' },
    { name: 'notes', label: 'Notes', required: false, type: 'textarea' },
  ],
  funeral: [
    { name: 'record_number', label: 'Record #', required: false, type: 'text' },
    { name: 'deceased_name', label: 'Name of Deceased', required: true, type: 'text' },
    { name: 'date_of_death', label: 'Date of Death', required: false, type: 'date' },
    { name: 'date_of_funeral', label: 'Date of Funeral', required: false, type: 'date' },
    { name: 'date_of_burial', label: 'Date of Burial', required: false, type: 'date' },
    { name: 'place_of_burial', label: 'Place of Burial', required: false, type: 'text' },
    { name: 'age_at_death', label: 'Age at Death', required: false, type: 'text' },
    { name: 'cause_of_death', label: 'Cause of Death', required: false, type: 'text' },
    { name: 'next_of_kin', label: 'Next of Kin', required: false, type: 'text' },
    { name: 'officiant', label: 'Officiant', required: false, type: 'text' },
    { name: 'church', label: 'Church', required: false, type: 'text' },
    { name: 'notes', label: 'Notes', required: false, type: 'textarea' },
  ],
};

