import { formatDbDate } from '../../../routes/ocr/helpers';

/**
 * Resolves the primary event date from a record's fields based on the record type.
 * This is used for tenure checking and date validations.
 *
 * Models:
 * - baptism: primary event date = baptism_date if present; fallback reception_date only if entry_type indicates reception/chrismation and baptism_date is missing
 * - marriage: primary event date = marriage_date
 * - funeral: primary event date = burial_date or funeral_date, depending on existing field naming; death date is for validation, not primary officiant tenure unless no funeral/burial date exists
 * - chrismation: primary event date = chrismation_date or reception_date
 */
export function resolvePrimaryEventDate(recordType: string, fields: Record<string, any>): string | null {
  const cleanDate = (val: any): string | null => {
    return formatDbDate(val);
  };

  const rType = String(recordType).toLowerCase();

  if (rType === 'baptism') {
    // Check direct baptism date fields first
    const baptDate = fields.baptism_date || fields.date_of_baptism || fields.reception_date;
    const resolvedBapt = cleanDate(baptDate);
    if (resolvedBapt) return resolvedBapt;

    // Check entry type for chrismation/reception fallback
    const entryType = String(fields.entry_type || fields.entry_type_label || '').toLowerCase();
    const isReception = entryType.includes('reception') || entryType.includes('chrismation');
    if (isReception) {
      const recepDate = fields.reception_date || fields.date_of_baptism;
      const resolvedRecep = cleanDate(recepDate);
      if (resolvedRecep) return resolvedRecep;
    }
    return null;
  }

  if (rType === 'marriage') {
    const marriageDate = fields.marriage_date || fields.date_of_marriage || fields.mdate;
    return cleanDate(marriageDate);
  }

  if (rType === 'funeral') {
    // Primary event is burial or funeral date
    const burialDate = fields.burial_date || fields.date_of_burial || fields.funeral_date || fields.date_of_funeral;
    const resolvedBurial = cleanDate(burialDate);
    if (resolvedBurial) return resolvedBurial;

    // Fallback to death date only if no funeral/burial date exists
    const deathDate = fields.deceased_date || fields.date_of_death;
    return cleanDate(deathDate);
  }

  if (rType === 'chrismation') {
    const chrismationDate = fields.chrismation_date || fields.reception_date || fields.date_of_baptism;
    return cleanDate(chrismationDate);
  }

  return null;
}
