/**
 * Shared helpers for OCR route handlers.
 * Eliminates the repeated church-lookup + db-switcher boilerplate.
 */

const { promisePool } = require('../../config/db');

let _dbSwitcherModule: any;
function getDbSwitcher() {
  if (!_dbSwitcherModule) {
    _dbSwitcherModule = require('../../utils/dbSwitcher');
  }
  return _dbSwitcherModule;
}

/**
 * Resolve church database name from churchId.
 * Returns null if church not found.
 */
export async function resolveChurchDb(churchId: number): Promise<{ dbName: string; db: any } | null> {
  const [churchRows] = await promisePool.query('SELECT database_name FROM churches WHERE id = ?', [churchId]);
  if (!churchRows.length) return null;
  const dbName = churchRows[0].database_name;
  const { getChurchDbConnection } = getDbSwitcher();
  const db = await getChurchDbConnection(dbName);
  return { dbName, db };
}

/**
 * Validate that the current user has access to the specified churchId.
 * SuperAdmins can access all churches. Regular users must match church_id.
 * Returns true if authorized, false otherwise.
 */
export function validateChurchAccess(req: any, churchId: number): boolean {
  const user = req.session?.user || req.user;
  if (!user) return false;
  // SuperAdmin/admin roles can access all churches
  if (user.role === 'superadmin' || user.role === 'admin') return true;
  // Regular users must match their assigned church
  return user.church_id === churchId;
}

/**
 * Split a compound name into first + last.
 * "John Smith" → { first: "John", last: "Smith" }
 * "John" → { first: "John", last: null }
 */
function splitName(name: string | null | undefined): { first: string | null; last: string | null } {
  if (!name || !name.trim()) return { first: null, last: null };
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return { first: parts[0], last: null };
  const last = parts.pop()!;
  return { first: parts.join(' '), last };
}

function resolvePersonName(
  combined?: string | null,
  first?: string | null,
  last?: string | null,
): { first: string | null; last: string | null } {
  if (first?.trim() || last?.trim()) {
    return { first: first?.trim() || null, last: last?.trim() || null };
  }
  return splitName(combined);
}

function composeNotes(entryType?: string, notes?: string): string | null {
  const parts = [
    entryType?.trim() ? `Entry: ${entryType.trim()}` : '',
    notes?.trim() || '',
  ].filter(Boolean);
  return parts.length ? parts.join('. ') : null;
}

/**
 * Map OCR field names (from recordFields.ts) to actual DB column names.
 * Handles name splitting for compound name fields.
 */
export function mapFieldsToDbColumns(recordType: string, f: Record<string, any>): Record<string, any> {
  if (recordType === 'baptism') {
    const child = resolvePersonName(f.child_name, f.child_first_name, f.child_last_name);
    return {
      first_name: child.first,
      last_name: child.last,
      birth_date: f.date_of_birth || null,
      reception_date: f.date_of_baptism || null,
      birthplace: f.place_of_birth || null,
      parents: f.parents || [f.father_name, f.mother_name].filter(Boolean).join(', ') || null,
      sponsors: f.godparents || null,
      clergy: f.performed_by || f.officiant || null,
      notes: composeNotes(f.entry_type, f.notes),
    };
  }

  if (recordType === 'marriage') {
    const groom = resolvePersonName(f.groom_name, f.groom_first_name, f.groom_last_name);
    const bride = resolvePersonName(f.bride_name, f.bride_first_name, f.bride_last_name);
    return {
      mdate: f.date_of_marriage || null,
      fname_groom: groom.first,
      lname_groom: groom.last,
      parentsg: f.groom_parents || null,
      fname_bride: bride.first,
      lname_bride: bride.last,
      parentsb: f.bride_parents || null,
      witness: f.witnesses || null,
      mlicense: f.marriage_license || f.mlicense || f.license || null,
      clergy: f.officiant || f.priest || f.performed_by || null,
      notes: f.notes || null,
    };
  }

  if (recordType === 'funeral') {
    const deceased = resolvePersonName(f.deceased_name, f.deceased_first_name, f.deceased_last_name);
    return {
      name: deceased.first,
      lastname: deceased.last,
      deceased_date: f.date_of_death || null,
      burial_date: f.date_of_burial || f.date_of_funeral || null,
      age: f.age_at_death ? parseInt(f.age_at_death, 10) || null : null,
      clergy: f.officiant || f.performed_by || null,
      burial_location: f.place_of_burial || null,
      notes: f.notes || null,
    };
  }

  return f;
}

/**
 * Build an INSERT query from mapped field values.
 */
export function buildInsertQuery(table: string, churchId: number, mapped: Record<string, any>): { sql: string; params: any[] } {
  const cols = ['church_id', ...Object.keys(mapped)];
  const placeholders = cols.map(() => '?').join(', ');
  const values = [churchId, ...Object.values(mapped)];
  return {
    sql: `INSERT INTO ${table} (${cols.join(', ')}) VALUES (${placeholders})`,
    params: values,
  };
}

export { promisePool };

// ── Test-only exports (private helpers exposed for unit tests) ────────────
export const __test__ = {
  splitName,
};
