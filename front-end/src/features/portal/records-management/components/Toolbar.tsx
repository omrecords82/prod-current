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
  recordType: RecordType;
  onRecordType: (t: RecordType) => void;
  onAdd: () => void;
  onMore: (a: MoreAction) => void;
  standardTable: boolean;
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

export function Toolbar({ view, onView, search, onSearch, searchLoading, setDebouncedSearch, searchDebounceRef, recordType, onRecordType, onAdd, onMore, standardTable }: Props) {
  const [typeAnchor, setTypeAnchor] = useState<null | HTMLElement>(null);
  const [moreAnchor, setMoreAnchor] = useState<null | HTMLElement>(null);

  return (
    <div>
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
            placeholder="Search — try a name, 2011, clergy:nicholas, year:2011…"
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
    </div>
  );
}
