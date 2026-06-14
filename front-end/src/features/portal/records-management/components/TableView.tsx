import { agGridIconMap } from "@/ui/agGridIcons";
import { Download, Eye, FileText, History, LayoutList, MoreHorizontal, Pencil, Users } from "@/ui/icons";
import { Menu, MenuItem } from "@mui/material";
import type { ColDef, GridReadyEvent, ICellRendererParams } from "ag-grid-community";
import { themeQuartz } from "ag-grid-community";
import { AgGridReact } from "ag-grid-react";
import React, { createElement, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { PortalRecordsThemeStyle } from "@/features/portal/themes/records/portalRecordsTheme";
import { useRecordsThemeColors } from "../useRecordsThemeColors";
import type { AnyRecord, Density, GridLayoutPreset, RecordType } from "../types";
import { ROW_NUMBER_COLUMN, STATUS_COLUMN } from "@/features/account/parish-management/recordFieldMapping";
import { StatusBadge } from "./StatusBadge";

interface Props {
  records: AnyRecord[];
  recordType: RecordType;
  fieldConfig?: { column: string; displayName: string; sortable: boolean }[];
  mappingFields?: { column: string; visible?: boolean }[];
  rowNumberBase?: number;
  highlight?: string;
  density: Density;
  standard: boolean;
  visibleCols: Record<string, boolean>;
  recordsTheme: PortalRecordsThemeStyle;
  onOpen: (r: AnyRecord) => void;
  onEdit: (r: AnyRecord) => void;
  onAudit: (r: AnyRecord) => void;
  onExport: () => void;
  onCertificate?: (r: AnyRecord) => void;
}

const GRID_PRESETS: { id: GridLayoutPreset; label: string; Icon: typeof LayoutList }[] = [
  { id: "full", label: "Full details", Icon: LayoutList },
  { id: "summary", label: "Summary", Icon: LayoutList },
  { id: "clergy", label: "Clergy & dates", Icon: Users },
  { id: "compact", label: "Compact", Icon: LayoutList },
];

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
    summary: ["__row_number__", "Row #", "first_name", "last_name", "name", "Name", "birth_date", "Date of Birth", "reception_date", "Baptism Date", "baptismDate", "dob", "status", "Status"],
    clergy: ["__row_number__", "Row #", "clergy", "Clergy", "priest", "reception_date", "Baptism Date", "baptismDate", "first_name", "last_name", "name", "Name", "status", "Status"],
    compact: ["__row_number__", "Row #", "first_name", "last_name", "name", "Name", "reception_date", "Baptism Date", "baptismDate", "clergy", "Clergy", "status", "Status"],
  },
  marriage: {
    summary: ["__row_number__", "Row #", "fname_bride", "lname_bride", "Bride", "bride", "fname_groom", "lname_groom", "Groom", "groom", "mdate", "Marriage Date", "marriageDate", "status", "Status"],
    clergy: ["__row_number__", "Row #", "clergy", "Celebrant", "celebrant", "mdate", "Marriage Date", "marriageDate", "Bride", "bride", "Groom", "groom", "status", "Status"],
    compact: ["__row_number__", "Row #", "Bride", "bride", "Groom", "groom", "Marriage Date", "marriageDate", "Celebrant", "celebrant", "status", "Status"],
  },
  funeral: {
    summary: ["__row_number__", "Row #", "name", "Name", "lastname", "deceased_date", "Date of Death", "dod", "burial_date", "Funeral Date", "funeralDate", "status", "Status"],
    clergy: ["__row_number__", "Row #", "clergy", "Clergy", "deceased_date", "burial_date", "Funeral Date", "funeralDate", "name", "Name", "status", "Status"],
    compact: ["__row_number__", "Row #", "name", "Name", "Funeral Date", "funeralDate", "burial_date", "clergy", "Clergy", "status", "Status"],
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

export function TableView({ records, recordType, fieldConfig, mappingFields, rowNumberBase = 0, highlight, density, standard, visibleCols, recordsTheme, onOpen, onEdit, onAudit, onExport, onCertificate }: Props) {
  const surface = useRecordsThemeColors(recordsTheme, recordsTheme.recordsClass);
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
  const headerHeight = 40;
  const floatingFiltersHeight = 34;

  const filledHeader = recordsTheme.table.headerMode === 'filled';
  const headerBg = filledHeader ? surface.accentDark : surface.headerBg;
  const headerFg = filledHeader ? '#ffffff' : surface.accentDark;
  const accent = surface.accent;

  const gridTheme = useMemo(() => themeQuartz.withParams(isDark ? {
    headerBackgroundColor: headerBg,
    headerTextColor: headerFg,
    headerFontWeight: 600,
    foregroundColor: surface.foreground,
    backgroundColor: surface.surfaceAlt,
    oddRowBackgroundColor: surface.surface,
    rowHoverColor: `${accent}30`,
    selectedRowBackgroundColor: `${accent}22`,
    borderColor: surface.border,
    fontSize: 13,
    headerFontSize: 12,
    cellHorizontalPaddingScale: 1.1,
    rowBorder: { color: surface.border, style: "solid", width: 1 },
    wrapperBorder: false,
  } : {
    headerBackgroundColor: headerBg,
    headerTextColor: headerFg,
    headerFontWeight: 600,
    foregroundColor: surface.foreground,
    backgroundColor: surface.surface,
    oddRowBackgroundColor: surface.surfaceAlt,
    rowHoverColor: `${accent}14`,
    selectedRowBackgroundColor: `${accent}18`,
    borderColor: surface.border,
    fontSize: 13,
    headerFontSize: 12,
    cellHorizontalPaddingScale: 1.1,
    rowBorder: { color: surface.border, style: "solid", width: 1 },
    wrapperBorder: false,
  }), [isDark, surface, headerBg, headerFg, accent]);

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
          const preset = gridPreset as Exclude<GridLayoutPreset, "full">;
          const show = columnInPreset(presetKeys[preset] ?? [], d.column, d.column, d.displayName, gridPreset);

          if (d.column === ROW_NUMBER_COLUMN) {
            return {
              colId: ROW_NUMBER_COLUMN,
              headerName: d.displayName,
              hide: !show,
              flex: 0,
              minWidth: 72,
              maxWidth: 96,
              sortable: false,
              filter: false,
              floatingFilter: false,
              pinned: pinFirst && idx === 0 && show ? ("left" as const) : undefined,
              valueGetter: (p: any) => {
                const api = p.api;
                const pageSize = api?.paginationGetPageSize?.() ?? 25;
                const currentPage = api?.paginationGetCurrentPage?.() ?? 0;
                const rowIdx = p.node?.rowIndex ?? 0;
                return String(rowNumberBase + currentPage * pageSize + rowIdx + 1);
              },
            } as ColDef;
          }

          if (d.column === STATUS_COLUMN) {
            return {
              colId: STATUS_COLUMN,
              headerName: d.displayName,
              field: "status",
              hide: !show,
              flex: show ? 1 : 0,
              minWidth: 118,
              maxWidth: 140,
              sortable: d.sortable,
              filter: "agTextColumnFilter",
              floatingFilter: true,
              cellRenderer: statusRenderer,
              pinned: pinFirst && idx === 0 && show ? ("left" as const) : undefined,
            } as ColDef;
          }

          const isDate = dateCols.includes(d.column);
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

      // Pre-virtual-column mappings had no status field — keep a single status column.
      const statusMapping = mappingFields?.find((f) => f.column === STATUS_COLUMN);
      const statusShownViaConfig = fieldConfig.some((d) => d.column === STATUS_COLUMN);
      if (!statusShownViaConfig && statusMapping === undefined) {
        cols.push({
          headerName: "Status",
          field: "status",
          minWidth: 118,
          maxWidth: 140,
          sortable: true,
          filter: "agTextColumnFilter",
          floatingFilter: true,
          cellRenderer: statusRenderer,
        });
      }
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
    }

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
  }, [recordType, fieldConfig, mappingFields, rowNumberBase, visibleCols, statusRenderer, actionsRenderer, gridPreset, presetKeys]);

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

  const gridHeight = density === "comfortable" ? "min(70vh, 640px)" : density === "compact" ? "min(60vh, 520px)" : "min(65vh, 580px)";

  const radiusClass = standard ? "rounded-none" : "rounded-xl";

  return (
    <div
      className={`rm-ag-grid rm-ag-theme-${recordsTheme.id} border border-[var(--rm-border)] bg-[var(--rm-card)] ${radiusClass} overflow-hidden shadow-sm w-full min-w-0`}
      style={{ borderRadius: standard ? 0 : recordsTheme.table.radius, fontFamily: recordsTheme.table.fontFamily }}
    >
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

      <div style={{ height: gridHeight, width: "100%", minWidth: 0 }} className="rm-ag-grid-host">
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
