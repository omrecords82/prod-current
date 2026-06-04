import { CustomizerContext } from "@/context/CustomizerContext";
import { agGridIconMap } from "@/ui/agGridIcons";
import { Download, Eye, FileText, History, LayoutList, MoreHorizontal, Pencil, Users } from "@/ui/icons";
import { Menu, MenuItem } from "@mui/material";
import type { ColDef, GridReadyEvent, ICellRendererParams } from "ag-grid-community";
import { themeQuartz } from "ag-grid-community";
import { AgGridReact } from "ag-grid-react";
import React, { createElement, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { AnyRecord, Density, GridLayoutPreset, RecordType } from "../types";
import { StatusBadge } from "./StatusBadge";

const THEME_COLORS: Record<string, { main: string; dark: string }> = {
  WHITE_THEME: { main: "#11307a", dark: "#0a1e52" },
  GREEN_THEME: { main: "#2E7D32", dark: "#1B5E20" },
  PURPLE_THEME: { main: "#6B2D75", dark: "#4a1f52" },
  RED_THEME: { main: "#B22234", dark: "#7a1824" },
  BLUE_THEME: { main: "#00838F", dark: "#005662" },
  GOLD_THEME: { main: "#C9A227", dark: "#9a7b1b" },
  LENT_THEME: { main: "#1a1a1a", dark: "#000000" },
};

const GRID_PRESETS: { id: GridLayoutPreset; label: string; Icon: typeof LayoutList }[] = [
  { id: "full", label: "Full details", Icon: LayoutList },
  { id: "summary", label: "Summary", Icon: LayoutList },
  { id: "clergy", label: "Clergy & dates", Icon: Users },
  { id: "compact", label: "Compact", Icon: LayoutList },
];

interface Props {
  records: AnyRecord[];
  recordType: RecordType;
  fieldConfig?: { column: string; displayName: string; sortable: boolean }[];
  highlight?: string;
  density: Density;
  standard: boolean;
  visibleCols: Record<string, boolean>;
  onOpen: (r: AnyRecord) => void;
  onEdit: (r: AnyRecord) => void;
  onAudit: (r: AnyRecord) => void;
  onExport: () => void;
  onCertificate?: (r: AnyRecord) => void;
}

type ColDefSpec = { field: string; headerName: string; valueGetter?: (r: any) => string; rawField?: string };

const COL_DEFS: Record<RecordType, ColDefSpec[]> = {
  baptism: [
    { field: "name", headerName: "Name" },
    { field: "dob", headerName: "Date of Birth", rawField: "dobRaw" },
    { field: "baptismDate", headerName: "Baptism Date", rawField: "baptismDateRaw" },
    { field: "church", headerName: "Church" },
    { field: "birthplace", headerName: "Birthplace" },
    { field: "clergy", headerName: "Clergy" },
  ],
  marriage: [
    { field: "bride", headerName: "Bride" },
    { field: "groom", headerName: "Groom" },
    { field: "marriageDate", headerName: "Marriage Date", rawField: "marriageDateRaw" },
    { field: "church", headerName: "Church" },
    { field: "celebrant", headerName: "Celebrant" },
    { field: "witnesses", headerName: "Witnesses" },
  ],
  funeral: [
    { field: "name", headerName: "Name" },
    { field: "dod", headerName: "Date of Death", rawField: "dodRaw" },
    { field: "funeralDate", headerName: "Funeral Date", rawField: "funeralDateRaw" },
    { field: "church", headerName: "Church" },
    { field: "burialPlace", headerName: "Burial Place" },
    { field: "clergy", headerName: "Clergy" },
  ],
};

/** Keys used to decide if a column appears in a layout preset (colId, field, or header label). */
const PRESET_KEYS: Record<RecordType, Record<Exclude<GridLayoutPreset, "full">, string[]>> = {
  baptism: {
    summary: ["first_name", "last_name", "name", "Name", "birth_date", "Date of Birth", "reception_date", "Baptism Date", "baptismDate", "dob", "status", "Status"],
    clergy: ["clergy", "Clergy", "priest", "reception_date", "Baptism Date", "baptismDate", "first_name", "last_name", "name", "Name", "status", "Status"],
    compact: ["first_name", "last_name", "name", "Name", "reception_date", "Baptism Date", "baptismDate", "clergy", "Clergy", "status", "Status"],
  },
  marriage: {
    summary: ["fname_bride", "lname_bride", "Bride", "bride", "fname_groom", "lname_groom", "Groom", "groom", "mdate", "Marriage Date", "marriageDate", "status", "Status"],
    clergy: ["clergy", "Celebrant", "celebrant", "mdate", "Marriage Date", "marriageDate", "Bride", "bride", "Groom", "groom", "status", "Status"],
    compact: ["Bride", "bride", "Groom", "groom", "Marriage Date", "marriageDate", "Celebrant", "celebrant", "status", "Status"],
  },
  funeral: {
    summary: ["name", "Name", "lastname", "deceased_date", "Date of Death", "dod", "burial_date", "Funeral Date", "funeralDate", "status", "Status"],
    clergy: ["clergy", "Clergy", "deceased_date", "burial_date", "Funeral Date", "funeralDate", "name", "Name", "status", "Status"],
    compact: ["name", "Name", "Funeral Date", "funeralDate", "burial_date", "clergy", "Clergy", "status", "Status"],
  },
};

function columnInPreset(
  keys: string[],
  colId: string,
  field: string | undefined,
  headerName: string,
  preset: GridLayoutPreset,
): boolean {
  if (preset === "full") return true;
  const allowed = new Set(keys);
  return allowed.has(colId) || (field != null && allowed.has(field)) || allowed.has(headerName);
}

function parseTs(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const t = new Date(v as string).getTime();
  return isNaN(t) ? null : t;
}

function makeDateComparator(rawField: string) {
  return (_a: unknown, _b: unknown, nodeA: any, nodeB: any, isDescending: boolean): number => {
    const ta = parseTs(nodeA?.data?.[rawField]);
    const tb = parseTs(nodeB?.data?.[rawField]);
    if (ta === null && tb === null) return 0;
    if (ta === null) return isDescending ? -1 : 1;
    if (tb === null) return isDescending ? 1 : -1;
    return ta - tb;
  };
}

const DATE_COLUMNS_BY_TYPE: Record<RecordType, string[]> = {
  baptism: ["birth_date", "reception_date"],
  marriage: ["mdate"],
  funeral: ["deceased_date", "burial_date"],
};

function formatCellDate(v: unknown): string {
  if (v === null || v === undefined || v === "") return "—";
  const t = new Date(v as string);
  if (isNaN(t.getTime())) return String(v);
  return t.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

function makeRawDateComparator(column: string) {
  return (_a: unknown, _b: unknown, nodeA: any, nodeB: any, isDescending: boolean): number => {
    const ta = parseTs(nodeA?.data?.raw?.[column]);
    const tb = parseTs(nodeB?.data?.raw?.[column]);
    if (ta === null && tb === null) return 0;
    if (ta === null) return isDescending ? -1 : 1;
    if (tb === null) return isDescending ? 1 : -1;
    return ta - tb;
  };
}

function presetStorageKey(recordType: RecordType) {
  return `rm-ag-preset-${recordType}`;
}

export function TableView({ records, recordType, fieldConfig, highlight, density, standard, visibleCols, onOpen, onEdit, onAudit, onExport, onCertificate }: Props) {
  const { activeTheme } = useContext(CustomizerContext);
  const gridRef = useRef<AgGridReact<AnyRecord>>(null);
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const [menuRecord, setMenuRecord] = useState<AnyRecord | null>(null);
  const [isDark, setIsDark] = useState(() => document.documentElement.classList.contains("dark"));
  const [gridPreset, setGridPreset] = useState<GridLayoutPreset>(() => {
    try {
      const saved = localStorage.getItem(presetStorageKey(recordType));
      if (saved === "full" || saved === "summary" || saved === "clergy" || saved === "compact") return saved;
    } catch { /* ignore */ }
    return "full";
  });

  useEffect(() => {
    try {
      const saved = localStorage.getItem(presetStorageKey(recordType));
      if (saved === "full" || saved === "summary" || saved === "clergy" || saved === "compact") setGridPreset(saved);
      else setGridPreset("full");
    } catch { setGridPreset("full"); }
  }, [recordType]);

  useEffect(() => {
    try {
      localStorage.setItem(presetStorageKey(recordType), gridPreset);
    } catch { /* ignore */ }
  }, [gridPreset, recordType]);

  useEffect(() => {
    const observer = new MutationObserver(() => {
      setIsDark(document.documentElement.classList.contains("dark"));
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  const rowHeight = density === "compact" ? 36 : density === "comfortable" ? 48 : 42;
  const headerHeight = 44;
  const floatingFiltersHeight = 36;

  const themeColor = THEME_COLORS[activeTheme] || THEME_COLORS.WHITE_THEME;

  const gridTheme = useMemo(() => themeQuartz.withParams(isDark ? {
    headerBackgroundColor: themeColor.main,
    headerTextColor: "#ffffff",
    headerFontWeight: 600,
    foregroundColor: "#e8e9ed",
    backgroundColor: "#0f1117",
    oddRowBackgroundColor: "#1a1d27",
    rowHoverColor: `${themeColor.main}40`,
    selectedRowBackgroundColor: `${themeColor.main}28`,
    borderColor: "#2d3140",
    fontSize: 13,
    headerFontSize: 13,
    cellHorizontalPaddingScale: 1.15,
    rowBorder: { color: "#2d3140", style: "solid", width: 1 },
    wrapperBorder: true,
  } : {
    headerBackgroundColor: themeColor.main,
    headerTextColor: "#ffffff",
    headerFontWeight: 600,
    foregroundColor: "#1a1a2e",
    backgroundColor: "#ffffff",
    oddRowBackgroundColor: "#f8f9fa",
    rowHoverColor: `${themeColor.main}12`,
    selectedRowBackgroundColor: `${themeColor.main}20`,
    borderColor: "#e5e7eb",
    fontSize: 13,
    headerFontSize: 13,
    cellHorizontalPaddingScale: 1.15,
    rowBorder: { color: "#e5e7eb", style: "solid", width: 1 },
    wrapperBorder: true,
  }), [isDark, themeColor]);

  const statusRenderer = useCallback((params: ICellRendererParams) => {
    if (!params.data) return null;
    return createElement(StatusBadge, { status: params.data.status });
  }, []);

  const actionsRenderer = useCallback((params: ICellRendererParams) => {
    if (!params.data) return null;
    const record = params.data as AnyRecord;
    return createElement("button", {
      type: "button",
      className: "p-1.5 rounded-md hover:bg-[var(--rm-muted)] text-[var(--rm-muted-fg)] hover:text-[var(--rm-fg)] transition-colors",
      onClick: (e: React.MouseEvent<HTMLButtonElement>) => {
        e.stopPropagation();
        setMenuAnchor(e.currentTarget);
        setMenuRecord(record);
      },
    }, createElement(MoreHorizontal, { className: "w-4 h-4" }));
  }, []);

  const presetKeys = PRESET_KEYS[recordType];

  const columnDefs = useMemo((): ColDef[] => {
    const textFilter = { filter: "agTextColumnFilter", floatingFilter: true };
    let cols: ColDef[];
    let pinFirst = true;

    if (fieldConfig && fieldConfig.length > 0) {
      const dateCols = DATE_COLUMNS_BY_TYPE[recordType];
      cols = fieldConfig
        .filter((d) => visibleCols[d.displayName] ?? true)
        .map((d, idx) => {
          const isDate = dateCols.includes(d.column);
          const show = columnInPreset(presetKeys[gridPreset as Exclude<GridLayoutPreset, "full">] ?? [], d.column, d.column, d.displayName, gridPreset);
          return {
            colId: d.column,
            headerName: d.displayName,
            field: d.column,
            hide: !show,
            flex: show ? 1 : 0,
            minWidth: isDate ? 130 : 120,
            sortable: d.sortable,
            ...textFilter,
            pinned: pinFirst && idx === 0 && show ? ("left" as const) : undefined,
            valueGetter: (p: any) => {
              const v = p.data?.raw?.[d.column];
              return isDate ? formatCellDate(v) : (v === null || v === undefined || v === "" ? "—" : String(v));
            },
            ...(isDate ? { comparator: makeRawDateComparator(d.column) } : {}),
          } as ColDef;
        });
    } else {
      const defs = COL_DEFS[recordType];
      cols = defs
        .filter((d) => visibleCols[d.headerName] ?? true)
        .map((d, idx) => {
          const show = columnInPreset(presetKeys[gridPreset as Exclude<GridLayoutPreset, "full">] ?? [], d.field, d.field, d.headerName, gridPreset);
          return {
            field: d.field,
            headerName: d.headerName,
            hide: !show,
            flex: show ? 1 : 0,
            minWidth: d.rawField ? 130 : 120,
            sortable: true,
            ...textFilter,
            pinned: pinFirst && idx === 0 && show ? ("left" as const) : undefined,
            ...(d.rawField ? { comparator: makeDateComparator(d.rawField) } : {}),
          } as ColDef;
        });
    }

    cols.push({
      headerName: "Status",
      field: "status",
      minWidth: 118,
      maxWidth: 140,
      sortable: true,
      filter: "agTextColumnFilter",
      floatingFilter: true,
      cellRenderer: statusRenderer,
      pinned: undefined,
    });

    cols.push({
      headerName: "",
      colId: "actions",
      field: "id",
      minWidth: 52,
      maxWidth: 52,
      sortable: false,
      filter: false,
      floatingFilter: false,
      cellRenderer: actionsRenderer,
      pinned: "right",
      suppressHeaderMenuButton: true,
    });

    return cols;
  }, [recordType, fieldConfig, visibleCols, statusRenderer, actionsRenderer, gridPreset, presetKeys]);

  const defaultColDef = useMemo((): ColDef => ({
    resizable: true,
    sortable: true,
    suppressMovable: false,
    wrapHeaderText: true,
    autoHeaderHeight: true,
  }), []);

  const statusBar = useMemo(() => ({
    statusPanels: [
      { statusPanel: "agTotalAndFilteredRowCountComponent", align: "left" as const },
      { statusPanel: "agSelectedRowCountComponent", align: "right" as const },
    ],
  }), []);

  const localeText = useMemo(() => ({
    page: "Page",
    of: "of",
    to: "to",
    pageSizeSelectorLabel: "Rows per page",
    noRowsToShow: "No records match your filters",
    filterOoo: "Filter…",
  }), []);

  const onGridReady = useCallback((e: GridReadyEvent) => {
    if (gridPreset === "summary" || gridPreset === "compact") {
      window.setTimeout(() => e.api.sizeColumnsToFit(), 0);
    }
  }, [gridPreset]);

  useEffect(() => {
    const api = gridRef.current?.api;
    if (!api) return;
    if (gridPreset === "summary" || gridPreset === "compact") {
      api.sizeColumnsToFit();
    }
  }, [gridPreset, columnDefs]);

  const gridHeight = density === "comfortable" ? 580 : density === "compact" ? 480 : 540;

  return (
    <div className={`rm-ag-grid ${isDark ? "bg-[#0f1117] border-[#2d3140]" : "bg-white border-[#e5e7eb]"} border ${standard ? "rounded-none" : "rounded-xl"} overflow-hidden shadow-sm`}>
      <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5 border-b border-[var(--rm-border)] bg-[var(--rm-muted)]/60">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs font-medium uppercase tracking-wide text-[var(--rm-muted-fg)] mr-1">Grid layout</span>
          {GRID_PRESETS.map(({ id, label, Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setGridPreset(id)}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                gridPreset === id
                  ? "text-white bg-[var(--rm-accent)] shadow-sm"
                  : "text-[var(--rm-muted-fg)] border border-[var(--rm-border)] bg-[var(--rm-card)] hover:bg-[var(--rm-muted)] hover:text-[var(--rm-fg)]"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
            </button>
          ))}
        </div>
        <p className="text-xs text-[var(--rm-muted-fg)]">
          Column filters below headers · Click a row to open the record
        </p>
      </div>

      <div style={{ height: gridHeight, width: "100%" }} className="rm-ag-grid-host">
        <AgGridReact<AnyRecord>
          ref={gridRef}
          theme={gridTheme}
          rowData={records}
          columnDefs={columnDefs}
          defaultColDef={defaultColDef}
          icons={agGridIconMap}
          localeText={localeText}
          getRowId={(params) => String(params.data.id)}
          rowHeight={rowHeight}
          headerHeight={headerHeight}
          floatingFiltersHeight={floatingFiltersHeight}
          pagination={true}
          paginationAutoPageSize={false}
          paginationPageSize={25}
          paginationPageSizeSelector={[10, 25, 50, 100]}
          animateRows={true}
          domLayout="normal"
          quickFilterText={highlight?.trim() || undefined}
          rowSelection={{ mode: "singleRow", checkboxes: false, enableClickSelection: true }}
          statusBar={statusBar}
          suppressCellFocus={true}
          enableCellTextSelection={true}
          onGridReady={onGridReady}
          onRowClicked={(event) => {
            if (event.data) onOpen(event.data);
          }}
          noRowsOverlayComponent={() => createElement("div", { className: "text-[var(--rm-muted-fg)] py-10 text-sm" }, "No records found")}
        />
      </div>

      <Menu anchorEl={menuAnchor} open={Boolean(menuAnchor)} onClose={() => setMenuAnchor(null)}>
        <MenuItem onClick={() => { if (menuRecord) onOpen(menuRecord); setMenuAnchor(null); }}><Eye className="w-4 h-4 mr-2" /> View Details</MenuItem>
        <MenuItem onClick={() => { if (menuRecord) onEdit(menuRecord); setMenuAnchor(null); }}><Pencil className="w-4 h-4 mr-2" /> Edit Record</MenuItem>
        <MenuItem onClick={() => { if (menuRecord) onAudit(menuRecord); setMenuAnchor(null); }}><History className="w-4 h-4 mr-2" /> Audit Trail</MenuItem>
        <MenuItem onClick={() => { onExport(); setMenuAnchor(null); }}><Download className="w-4 h-4 mr-2" /> Export Record</MenuItem>
        {(recordType === "baptism" || recordType === "marriage") && (
          <MenuItem onClick={() => { if (menuRecord && onCertificate) onCertificate(menuRecord); setMenuAnchor(null); }}><FileText className="w-4 h-4 mr-2" /> Generate Certificate</MenuItem>
        )}
      </Menu>
    </div>
  );
}
