import { BarChart3, ChevronDown, Columns3, Download, FileText, GitBranch, LayoutGrid, Link2, MoreHorizontal, Plus, Rows, Search, Table2, Upload, X } from "@/ui/icons";
import { CircularProgress, Divider, Menu, MenuItem } from "@mui/material";
import React, { useState } from "react";
import type { RecordType, ViewMode } from "../types";

export type MoreAction = "export" | "import" | "report" | "collab" | "grid" | "standard";

interface Props {
  view: ViewMode;
  onView: (v: ViewMode) => void;
  search: string;
  onSearch: (s: string) => void;
  searchLoading: boolean;
  setDebouncedSearch: (s: string) => void;
  searchDebounceRef: React.MutableRefObject<ReturnType<typeof setTimeout> | null>;
  priest: string;
  onPriest: (s: string) => void;
  recordType: RecordType;
  onRecordType: (t: RecordType) => void;
  totalShown: number;
  totalAll: number;
  onAdd: () => void;
  onClear: () => void;
  onMore: (a: MoreAction) => void;
  standardTable: boolean;
  clergyList: string[];
  sortField: string;
  sortDir: "asc" | "desc";
  onSort: (field: string, dir: "asc" | "desc") => void;
  useDefaultSort: boolean;
  onToggleDefaultSort: () => void;
  defaultSortLabel: string;
}

const TABS: { id: ViewMode; label: string; Icon: any }[] = [
  { id: "table", label: "Table", Icon: Table2 },
  { id: "cards", label: "Cards", Icon: LayoutGrid },
  { id: "timeline", label: "Timeline", Icon: GitBranch },
  { id: "analytics", label: "Analytics", Icon: BarChart3 },
];

const RECORD_TYPE_LABEL: Record<RecordType, string> = {
  baptism: "Baptism Records",
  marriage: "Marriage Records",
  funeral: "Funeral Records",
};

const SORT_OPTIONS: Record<RecordType, { field: string; label: string }[]> = {
  baptism: [
    { field: "id", label: "Record #" },
    { field: "first_name", label: "Name" },
    { field: "birth_date", label: "Date of Birth" },
    { field: "reception_date", label: "Baptism Date" },
    { field: "clergy", label: "Clergy" },
  ],
  marriage: [
    { field: "id", label: "Record #" },
    { field: "fname_bride", label: "Bride" },
    { field: "fname_groom", label: "Groom" },
    { field: "mdate", label: "Marriage Date" },
    { field: "clergy", label: "Celebrant" },
  ],
  funeral: [
    { field: "id", label: "Record #" },
    { field: "name", label: "Name" },
    { field: "deceased_date", label: "Date of Death" },
    { field: "burial_date", label: "Burial Date" },
    { field: "clergy", label: "Clergy" },
  ],
};

export function Toolbar({ view, onView, search, onSearch, searchLoading, setDebouncedSearch, searchDebounceRef, priest, onPriest, recordType, onRecordType, totalShown, totalAll, onAdd, onClear, onMore, standardTable, clergyList, sortField, sortDir, onSort, useDefaultSort, onToggleDefaultSort, defaultSortLabel }: Props) {
  const [typeAnchor, setTypeAnchor] = useState<null | HTMLElement>(null);
  const [moreAnchor, setMoreAnchor] = useState<null | HTMLElement>(null);
  const [priestAnchor, setPriestAnchor] = useState<null | HTMLElement>(null);
  const [sortAnchor, setSortAnchor] = useState<null | HTMLElement>(null);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        {/* Record type dropdown */}
        <button
          onClick={(e) => setTypeAnchor(e.currentTarget)}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-md border border-[var(--rm-border)] bg-[var(--rm-card)] hover:bg-[var(--rm-muted)] text-sm text-[var(--rm-fg)] transition-all"
        >
          {RECORD_TYPE_LABEL[recordType]} <ChevronDown className="w-3.5 h-3.5" />
        </button>
        <Menu anchorEl={typeAnchor} open={Boolean(typeAnchor)} onClose={() => setTypeAnchor(null)}>
          <MenuItem onClick={() => { onRecordType("baptism"); setTypeAnchor(null); }}>Baptism Records</MenuItem>
          <MenuItem onClick={() => { onRecordType("marriage"); setTypeAnchor(null); }}>Marriage Records</MenuItem>
          <MenuItem onClick={() => { onRecordType("funeral"); setTypeAnchor(null); }}>Funeral Records</MenuItem>
        </Menu>

        {/* Search */}
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--rm-muted-fg)]" />
          <input
            value={search}
            onChange={(e) => onSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
                setDebouncedSearch(search);
              }
            }}
            placeholder="Search by name, record #, date, clergy..."
            className="w-full pl-9 pr-16 py-2 rounded-md border border-[var(--rm-border)] bg-[var(--rm-card)] text-sm text-[var(--rm-fg)] outline-none focus:border-[var(--rm-accent)] focus:ring-2 focus:ring-[var(--rm-accent-soft)] transition-all"
          />
          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
            {searchLoading && <CircularProgress size={14} sx={{ color: 'var(--rm-accent)' }} />}
            {search && !searchLoading && (
              <button onClick={() => { onSearch(""); setDebouncedSearch(""); }} className="text-[var(--rm-muted-fg)] hover:text-[var(--rm-fg)]">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Add Record */}
        <button
          onClick={onAdd}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-md text-white text-sm shadow-sm hover:shadow-md hover:-translate-y-px transition-all bg-[var(--rm-accent)] hover:bg-[var(--rm-accent-hover)]"
        >
          <Plus className="w-4 h-4" /> Add Record
        </button>

        {/* More menu */}
        <button
          onClick={(e) => setMoreAnchor(e.currentTarget)}
          className="p-2 rounded-md border border-[var(--rm-border)] bg-[var(--rm-card)] hover:bg-[var(--rm-muted)] transition-all"
        >
          <MoreHorizontal className="w-4 h-4 text-[var(--rm-muted-fg)]" />
        </button>
        <Menu anchorEl={moreAnchor} open={Boolean(moreAnchor)} onClose={() => setMoreAnchor(null)}>
          <MenuItem onClick={() => { onMore("export"); setMoreAnchor(null); }}><Download className="w-4 h-4 mr-2" /> Export Records</MenuItem>
          <MenuItem onClick={() => { onMore("import"); setMoreAnchor(null); }}><Upload className="w-4 h-4 mr-2" /> Import Records</MenuItem>
          <MenuItem onClick={() => { onMore("report"); setMoreAnchor(null); }}><FileText className="w-4 h-4 mr-2" /> Generate Report</MenuItem>
          <MenuItem onClick={() => { onMore("collab"); setMoreAnchor(null); }}><Link2 className="w-4 h-4 mr-2" /> Collaboration Link</MenuItem>
          <Divider />
          <MenuItem onClick={() => { onMore("grid"); setMoreAnchor(null); }}><Columns3 className="w-4 h-4 mr-2" /> Grid Options</MenuItem>
          <MenuItem onClick={() => { onMore("standard"); setMoreAnchor(null); }}><Rows className="w-4 h-4 mr-2" /> {standardTable ? "Use Enhanced Table" : "Use Standard Table"}</MenuItem>
        </Menu>

        {/* View tabs */}
        <div className="ml-auto inline-flex rounded-md border border-[var(--rm-border)] bg-[var(--rm-card)] p-0.5">
          {TABS.map(({ id, label, Icon }) => (
            <button
              key={id}
              onClick={() => onView(id)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[6px] text-sm transition-all ${
                view === id ? "text-white shadow bg-[var(--rm-accent)]" : "text-[var(--rm-muted-fg)] hover:text-[var(--rm-fg)] hover:bg-[var(--rm-muted)]"
              }`}
            >
              <Icon className="w-3.5 h-3.5" /> <span className="hidden sm:inline">{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Filter row */}
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <button
          onClick={(e) => setPriestAnchor(e.currentTarget)}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md border border-[var(--rm-border)] bg-[var(--rm-card)] hover:bg-[var(--rm-muted)] text-[var(--rm-fg)] transition-all"
        >
          <span className="text-[var(--rm-muted-fg)]">Filter by priest:</span> <span>{priest}</span>
          <ChevronDown className="w-3.5 h-3.5" />
        </button>
        <Menu anchorEl={priestAnchor} open={Boolean(priestAnchor)} onClose={() => setPriestAnchor(null)}>
          {["All priests", ...clergyList].map((p) => (
            <MenuItem key={p} onClick={() => { onPriest(p); setPriestAnchor(null); }}>{p}</MenuItem>
          ))}
        </Menu>

        {/* Default Sort toggle */}
        <button
          onClick={onToggleDefaultSort}
          className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-md border text-sm transition-all ${
            useDefaultSort
              ? "border-[var(--rm-accent)] bg-[var(--rm-accent-soft)] text-[var(--rm-accent)]"
              : "border-[var(--rm-border)] bg-[var(--rm-card)] hover:bg-[var(--rm-muted)] text-[var(--rm-muted-fg)]"
          }`}
        >
          <span className="w-3 h-3 rounded-sm border flex items-center justify-center" style={{
            borderColor: useDefaultSort ? "var(--rm-accent)" : "var(--rm-muted-fg)",
            backgroundColor: useDefaultSort ? "var(--rm-accent)" : "transparent",
          }}>
            {useDefaultSort && <span className="text-white text-[10px] leading-none">✓</span>}
          </span>
          <span>Default Sort</span>
          {useDefaultSort && (
            <span className="font-medium text-[var(--rm-fg)]">
              ({SORT_OPTIONS[recordType].find((o) => o.field === defaultSortLabel)?.label || defaultSortLabel})
            </span>
          )}
        </button>

        {/* Sort field control — only active when Default Sort is OFF */}
        <button
          onClick={(e) => { if (!useDefaultSort) setSortAnchor(e.currentTarget); }}
          className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-md border border-[var(--rm-border)] transition-all ${
            useDefaultSort
              ? "bg-[var(--rm-muted)] text-[var(--rm-muted-fg)] opacity-50 cursor-not-allowed"
              : "bg-[var(--rm-card)] hover:bg-[var(--rm-muted)] text-[var(--rm-fg)]"
          }`}
        >
          <span className="text-[var(--rm-muted-fg)]">Sort:</span>
          <span>{SORT_OPTIONS[recordType].find((o) => o.field === sortField)?.label || "Record #"}</span>
          <ChevronDown className="w-3.5 h-3.5" />
        </button>
        <Menu anchorEl={sortAnchor} open={Boolean(sortAnchor)} onClose={() => setSortAnchor(null)}>
          {SORT_OPTIONS[recordType].map((opt) => (
            <MenuItem
              key={opt.field}
              selected={sortField === opt.field}
              onClick={() => {
                onSort(opt.field, sortDir);
                setSortAnchor(null);
              }}
            >
              {opt.label} {sortField === opt.field && "✓"}
            </MenuItem>
          ))}
        </Menu>

        {/* Sort direction toggle — only active when Default Sort is OFF */}
        <button
          onClick={() => { if (!useDefaultSort) onSort(sortField, sortDir === "asc" ? "desc" : "asc"); }}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-[var(--rm-border)] transition-all ${
            useDefaultSort
              ? "bg-[var(--rm-muted)] text-[var(--rm-muted-fg)] opacity-50 cursor-not-allowed"
              : "bg-[var(--rm-card)] hover:bg-[var(--rm-muted)] text-[var(--rm-fg)]"
          }`}
        >
          <ChevronDown className={`w-3.5 h-3.5 transition-transform ${sortDir === "asc" ? "rotate-180" : ""}`} />
          <span>{sortDir === "asc" ? "Asc" : "Desc"}</span>
        </button>

        <div className="text-[var(--rm-muted-fg)]">{totalShown} of {totalAll} records</div>
        <button onClick={onClear} className="ml-auto hover:underline text-[var(--rm-accent)]">Clear Selection</button>
      </div>
    </div>
  );
}
