// Constants for records-centralized features
// Defines table columns and form fields for each sacrament record type
// Based on Saints Peter & Paul default column definitions
//
// ⚠️ IMPORTANT: If adding new DB columns, you must:
// 1. Add the column to the appropriate tableColumns array below
// 2. Add a case handler in BaptismRecordsPage.tsx getCellValue() function
// 3. Update the backend transformer in server/src/utils/dateFormatter.js
// 4. Ensure the backend API returns the new field (SELECT * handles this automatically)

export const RECORD_TYPES = {
  BAPTISM: 'baptism',
  MARRIAGE: 'marriage',
  FUNERAL: 'funeral'
};

export const FIELD_DEFINITIONS: Record<string, {
  tableColumns: Array<{ field: string; headerName: string; width?: number }>;
  formFields: Array<{ id: string; label: string; type: string; required: boolean }>;
  sortFields: Array<{ field: string; label: string }>;
}> = {
  // ═══════════════════════════════════════════════════════════════
  // BAPTISM RECORDS - Saints Peter & Paul Default Columns
  // ═══════════════════════════════════════════════════════════════
  baptism: {
    tableColumns: [
      { field: 'first_name', headerName: 'First Name', width: 120 },
      { field: 'last_name', headerName: 'Last Name', width: 120 },
      { field: 'birth_date', headerName: 'Birth Date', width: 110 },
      { field: 'reception_date', headerName: 'Baptism Date', width: 110 },
      { field: 'birthplace', headerName: 'Birthplace', width: 150 },
      { field: 'entry_type', headerName: 'Entry Type', width: 120 },
      { field: 'sponsors', headerName: 'Godparents', width: 150 },
      { field: 'parents', headerName: 'Parents', width: 150 },
      { field: 'clergy', headerName: 'Clergy', width: 130 },
    ],
    formFields: [
      { id: 'first_name', label: 'First Name', type: 'text', required: true },
      { id: 'last_name', label: 'Last Name', type: 'text', required: true },
      { id: 'birth_date', label: 'Birth Date', type: 'date', required: false },
      { id: 'reception_date', label: 'Date of Baptism/Chrismation', type: 'date', required: true },
      { id: 'birthplace', label: 'Birthplace (Town/City, State)', type: 'text', required: false },
      { id: 'entry_type', label: 'Entry Type (Baptism or Chrismation)', type: 'text', required: true },
      { id: 'sponsors', label: 'Godparents', type: 'text', required: false },
      { id: 'parents', label: 'Parents', type: 'text', required: false },
      { id: 'clergy', label: 'Clergy', type: 'text', required: true },
    ],
    sortFields: [
      { field: 'last_name', label: 'Last Name' },
      { field: 'first_name', label: 'First Name' },
      { field: 'birth_date', label: 'Birth Date' },
      { field: 'reception_date', label: 'Baptism Date' },
    ],
  },

  // ═══════════════════════════════════════════════════════════════
  // MARRIAGE RECORDS - Saints Peter & Paul Default Columns
  // ═══════════════════════════════════════════════════════════════
  marriage: {
    tableColumns: [
      { field: 'fname_groom', headerName: 'Groom First Name', width: 130 },
      { field: 'lname_groom', headerName: 'Groom Last Name', width: 130 },
      { field: 'fname_bride', headerName: 'Bride First Name', width: 130 },
      { field: 'lname_bride', headerName: 'Bride Last Name', width: 130 },
      { field: 'mdate', headerName: 'Marriage Date', width: 110 },
      { field: 'parentsg', headerName: "Groom's Parents", width: 150 },
      { field: 'parentsb', headerName: "Bride's Parents", width: 150 },
      { field: 'witness', headerName: 'Witnesses', width: 150 },
      { field: 'mlicense', headerName: 'Marriage License', width: 120 },
      { field: 'clergy', headerName: 'Clergy', width: 130 },
    ],
    formFields: [
      { id: 'fname_groom', label: "Groom's First Name", type: 'text', required: true },
      { id: 'lname_groom', label: "Groom's Last Name", type: 'text', required: true },
      { id: 'parentsg', label: "Groom's Parents", type: 'text', required: false },
      { id: 'fname_bride', label: "Bride's First Name", type: 'text', required: false },
      { id: 'lname_bride', label: "Bride's Last Name", type: 'text', required: true },
      { id: 'parentsb', label: "Bride's Parents", type: 'text', required: false },
      { id: 'mdate', label: 'Marriage Date', type: 'date', required: true },
      { id: 'witness', label: 'Witnesses', type: 'text', required: false },
      { id: 'mlicense', label: 'Marriage License', type: 'text', required: false },
      { id: 'clergy', label: 'Clergy', type: 'text', required: true },
    ],
    sortFields: [
      { field: 'lname_groom', label: 'Groom Last Name' },
      { field: 'lname_bride', label: 'Bride Last Name' },
      { field: 'mdate', label: 'Marriage Date' },
    ],
  },

  // ═══════════════════════════════════════════════════════════════
  // FUNERAL RECORDS - Saints Peter & Paul (actual MySQL column names)
  // Table: funeral_records
  // Columns: id, name, lastname, deceased_date, burial_date, age, 
  //          clergy, burial_location, church_id
  // ═══════════════════════════════════════════════════════════════
  funeral: {
    tableColumns: [
      { field: 'name', headerName: 'First Name', width: 120 },
      { field: 'lastname', headerName: 'Last Name', width: 120 },
      { field: 'deceased_date', headerName: 'Date of Death', width: 110 },
      { field: 'burial_date', headerName: 'Burial Date', width: 110 },
      { field: 'age', headerName: 'Age', width: 60 },
      { field: 'clergy', headerName: 'Clergy', width: 150 },
      { field: 'burial_location', headerName: 'Burial Location', width: 200 },
    ],
    formFields: [
      { id: 'name', label: "Deceased's First Name", type: 'text', required: false },
      { id: 'lastname', label: "Deceased's Last Name", type: 'text', required: true },
      { id: 'deceased_date', label: 'Date of Passing', type: 'date', required: true },
      { id: 'burial_date', label: 'Date of Burial/Funeral Service', type: 'date', required: true },
      { id: 'age', label: 'Age at Time of Death', type: 'number', required: false },
      { id: 'clergy', label: 'Clergy', type: 'text', required: true },
      { id: 'burial_location', label: 'Burial Location', type: 'text', required: false },
    ],
    sortFields: [
      { field: 'lastname', label: 'Last Name' },
      { field: 'name', label: 'First Name' },
      { field: 'deceased_date', label: 'Date of Death' },
      { field: 'burial_date', label: 'Burial Date' },
    ],
  },
};
