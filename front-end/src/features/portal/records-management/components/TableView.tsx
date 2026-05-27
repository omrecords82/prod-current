import { CustomizerContext } from "@/context/CustomizerContext";
import { agGridIconMap } from "@/ui/agGridIcons";
import { Download, Eye, FileText, History, MoreHorizontal, Pencil } from "@/ui/icons";
import { Menu, MenuItem } from "@mui/material";
import { ColDef, ICellRendererParams, themeQuartz } from "ag-grid-community";
import { AgGridReact } from "ag-grid-react";
import React, { createElement, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { AnyRecord, Density, RecordType } from "../types";
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

interface Props {
  records: AnyRecord[];
  recordType: RecordType;
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

const COL_DEFS: Record<RecordType, { field: string; headerName: string; valueGetter?: (r: any) => string }[]> = {
  baptism: [
    { field: "name", headerName: "Name" },
    { field: "recordNo", headerName: "Record No." },
    { field: "dob", headerName: "Date of Birth" },
    { field: "baptismDate", headerName: "Baptism Date" },
    { field: "church", headerName: "Church" },
    { field: "birthplace", headerName: "Birthplace" },
    { field: "clergy", headerName: "Clergy" },
  ],
  marriage: [
    { field: "bride", headerName: "Bride" },
    { field: "groom", headerName: "Groom" },
    { field: "recordNo", headerName: "Record No." },
    { field: "marriageDate", headerName: "Marriage Date" },
    { field: "church", headerName: "Church" },
    { field: "celebrant", headerName: "Celebrant" },
    { field: "witnesses", headerName: "Witnesses" },
  ],
  funeral: [
    { field: "name", headerName: "Name" },
    { field: "recordNo", headerName: "Record No." },
    { field: "dod", headerName: "Date of Death" },
    { field: "funeralDate", headerName: "Funeral Date" },
    { field: "church", headerName: "Church" },
    { field: "burialPlace", headerName: "Burial Place" },
    { field: "clergy", headerName: "Clergy" },
  ],
};

export function TableView({ records, recordType, highlight, density, standard, visibleCols, onOpen, onEdit, onAudit, onExport, onCertificate }: Props) {
  const { activeTheme } = useContext(CustomizerContext);
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const [menuRecord, setMenuRecord] = useState<AnyRecord | null>(null);
  const [isDark, setIsDark] = useState(() => document.documentElement.classList.contains('dark'));

  useEffect(() => {
    const observer = new MutationObserver(() => {
      setIsDark(document.documentElement.classList.contains('dark'));
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  const rowHeight = density === "compact" ? 36 : density === "comfortable" ? 52 : 44;

  const themeColor = THEME_COLORS[activeTheme] || THEME_COLORS.WHITE_THEME;

  const gridTheme = useMemo(() => themeQuartz.withParams(isDark ? {
    headerBackgroundColor: themeColor.main,
    headerTextColor: "#ffffff",
    foregroundColor: "#e8e9ed",
    backgroundColor: "#0f1117",
    oddRowBackgroundColor: "#1a1d27",
    rowHoverColor: `${themeColor.main}59`,
    selectedRowBackgroundColor: `${themeColor.main}33`,
    borderColor: "#2d3140",
    fontSize: 13,
    headerFontSize: 13,
    rowBorder: { color: "#2d3140", style: "solid", width: 1 },
  } : {
    headerBackgroundColor: themeColor.main,
    headerTextColor: "#ffffff",
    foregroundColor: "#1a1a2e",
    backgroundColor: "#ffffff",
    oddRowBackgroundColor: "#f8f9fa",
    rowHoverColor: `${themeColor.main}14`,
    selectedRowBackgroundColor: `${themeColor.main}24`,
    borderColor: "#e5e7eb",
    fontSize: 13,
    headerFontSize: 13,
    rowBorder: { color: "#e5e7eb", style: "solid", width: 1 },
  }), [isDark, themeColor]);

  const statusRenderer = useCallback((params: ICellRendererParams) => {
    if (!params.data) return null;
    return createElement(StatusBadge, { status: params.data.status });
  }, []);

  const actionsRenderer = useCallback((params: ICellRendererParams) => {
    if (!params.data) return null;
    const record = params.data as AnyRecord;
    return createElement("button", {
      className: "p-1.5 rounded-md hover:bg-gray-100",
      onClick: (e: React.MouseEvent<HTMLButtonElement>) => {
        e.stopPropagation();
        setMenuAnchor(e.currentTarget);
        setMenuRecord(record);
      },
    }, createElement(MoreHorizontal, { className: "w-4 h-4" }));
  }, []);

  const columnDefs = useMemo((): ColDef[] => {
    const defs = COL_DEFS[recordType];
    const cols: ColDef[] = defs
      .filter((d) => visibleCols[d.headerName] ?? true)
      .map((d) => ({
        field: d.field,
        headerName: d.headerName,
        flex: 1,
        minWidth: 120,
        sortable: true,
        filter: false,
      }));

    cols.push({
      headerName: "Status",
      field: "status",
      minWidth: 110,
      maxWidth: 130,
      sortable: false,
      filter: false,
      cellRenderer: statusRenderer,
    });

    cols.push({
      headerName: "",
      field: "id",
      minWidth: 60,
      maxWidth: 60,
      sortable: false,
      filter: false,
      cellRenderer: actionsRenderer,
      pinned: "right",
    });

    return cols;
  }, [recordType, visibleCols, statusRenderer, actionsRenderer]);

  const defaultColDef = useMemo((): ColDef => ({
    resizable: true,
    sortable: true,
    filter: false,
  }), []);

  return (
    <div className={`${isDark ? "bg-[#0f1117] border-[#2d3140]" : "bg-white border-[#e5e7eb]"} border ${standard ? "rounded-none" : "rounded-xl"} overflow-hidden`}>
      <div style={{ height: 520, width: "100%" }}>
        <AgGridReact
          theme={gridTheme}
          rowData={records}
          columnDefs={columnDefs}
          defaultColDef={defaultColDef}
          icons={agGridIconMap}
          getRowId={(params) => String(params.data.id)}
          rowHeight={rowHeight}
          headerHeight={40}
          pagination={true}
          paginationAutoPageSize={false}
          paginationPageSize={10}
          paginationPageSizeSelector={[10, 25, 50]}
          animateRows={true}
          domLayout="normal"
          onRowClicked={(event) => { if (event.data) onOpen(event.data); }}
          noRowsOverlayComponent={() => createElement("div", { className: "text-gray-400 py-8" }, "No records found")}
        />
      </div>

      {/* Row action menu */}
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
