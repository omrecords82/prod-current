export interface BaptismRecord {
  id: string;
  // Production schema fields (person_*)
  person_first?: string;
  person_middle?: string;
  person_last?: string;
  person_full?: string;
  // Legacy field names for backwards compatibility
  firstName?: string;
  lastName?: string;
  first_name?: string;
  last_name?: string;
  // Date fields
  birth_date?: string;
  baptism_date?: string;
  dateOfBirth?: string;
  dateOfBaptism?: string;
  reception_date?: string;
  // Location fields
  place_name?: string;
  placeOfBirth?: string;
  placeOfBaptism?: string;
  birthplace?: string;
  // Parent fields
  father_name?: string;
  mother_name?: string;
  fatherName?: string;
  motherName?: string;
  // Godparents - JSON in production, string in legacy
  godparents?: string | string[];
  godparentNames?: string;
  sponsors?: string;
  // Officiant field
  officiant_name?: string;
  priest?: string;
  clergy?: string;
  // Registry fields
  certificate_no?: string;
  book_no?: string;
  page_no?: string;
  entry_no?: string;
  registryNumber?: string;
  // Metadata fields (production schema)
  source_system?: string;
  source_row_id?: string;
  source_hash?: string;
  // Church fields
  churchId?: string;
  church_id?: number;
  churchName?: string;
  notes?: string;
  // Marriage record fields
  groom_first?: string;
  groom_middle?: string;
  groom_last?: string;
  groom_full?: string;
  fname_groom?: string;
  lname_groom?: string;
  bride_first?: string;
  bride_middle?: string;
  bride_last?: string;
  bride_full?: string;
  fname_bride?: string;
  lname_bride?: string;
  marriage_date?: string;
  mdate?: string;
  parentsg?: string;
  parentsb?: string;
  witness?: string;
  witnesses?: string | string[];
  mlicense?: string;
  // Additional marriage fields for form
  groomFirstName?: string;
  groomLastName?: string;
  brideFirstName?: string;
  brideLastName?: string;
  marriageDate?: string;
  marriageLocation?: string;
  witness1?: string;
  witness2?: string;
  // Funeral record fields (production: deceased_*)
  deceased_first?: string;
  deceased_middle?: string;
  deceased_last?: string;
  deceased_full?: string;
  death_date?: string;
  funeral_date?: string;
  burial_place?: string;
  cause_of_death?: string;
  dateOfDeath?: string;
  burialDate?: string;
  burial_date?: string;
  age?: string;
  burialLocation?: string;
  burial_location?: string;
  name?: string;
  lastname?: string;
  // Timestamps
  createdAt?: string;
  updatedAt?: string;
  created_at?: string;
  updated_at?: string;
  createdBy?: string;
  // Search ranking metadata (from server)
  _matchScore?: number;
  _matchedFields?: string[];
  _matchSummary?: string;
}

export type SortDirection = 'asc' | 'desc';

export interface SortConfig {
  key: keyof BaptismRecord;
  direction: SortDirection;
}

export interface RecordsPageProps {
  defaultRecordType?: string;
}
