export type RecordStatus = "Recorded" | "Verified" | "Awaiting Clergy";
export type RecordType = "baptism" | "marriage" | "funeral";
export type ViewMode = "table" | "cards" | "timeline" | "analytics";
export type Density = "compact" | "default" | "comfortable";
/** AG Grid column layout presets inside the Table view */
export type GridLayoutPreset = "full" | "summary" | "clergy" | "compact";

/** Visual table chrome — independent of column presets; styled per portal theme. */
export type TableDisplayStyle = "default" | "registry" | "ledger";

export interface BaptismRecord {
  id: string;
  type: "baptism";
  name: string;
  dob: string;
  baptismDate: string;
  // Raw (unformatted) date values used for correct chronological sorting in
  // the table. `dob`/`baptismDate` carry the human-readable display strings.
  dobRaw?: string | null;
  baptismDateRaw?: string | null;
  church: string;
  birthplace: string;
  address: string;
  clergy: string;
  status: RecordStatus;
  /** The raw DB row, keyed by column name — used to render config-driven columns. */
  raw?: Record<string, any>;
}

export interface MarriageRecord {
  id: string;
  type: "marriage";
  bride: string;
  groom: string;
  marriageDate: string;
  marriageDateRaw?: string | null;
  church: string;
  celebrant: string;
  witnesses: string;
  status: RecordStatus;
  /** The raw DB row, keyed by column name — used to render config-driven columns. */
  raw?: Record<string, any>;
}

export interface FuneralRecord {
  id: string;
  type: "funeral";
  name: string;
  dod: string;
  funeralDate: string;
  dodRaw?: string | null;
  funeralDateRaw?: string | null;
  church: string;
  burialPlace: string;
  clergy: string;
  status: RecordStatus;
  /** The raw DB row, keyed by column name — used to render config-driven columns. */
  raw?: Record<string, any>;
}

export type AnyRecord = BaptismRecord | MarriageRecord | FuneralRecord;

export function recordPrimaryName(r: AnyRecord): string {
  if (r.type === "marriage") return `${r.bride} & ${r.groom}`;
  return r.name;
}

export function recordPrimaryDate(r: AnyRecord): string {
  if (r.type === "baptism") return r.baptismDate;
  if (r.type === "marriage") return r.marriageDate;
  return r.funeralDate;
}

export function recordClergy(r: AnyRecord): string {
  if (r.type === "marriage") return r.celebrant;
  return r.clergy;
}

export function densityClasses(density: Density) {
  if (density === "compact") return { row: "py-1.5 text-[13px]", card: "p-3", gap: "gap-2", section: "space-y-3" };
  if (density === "comfortable") return { row: "py-4", card: "p-6", gap: "gap-5", section: "space-y-7" };
  return { row: "py-3", card: "p-5", gap: "gap-4", section: "space-y-5" };
}
