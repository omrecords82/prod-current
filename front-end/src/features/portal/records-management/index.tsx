import { metricsAPI } from "@/api/metrics.api";
import { useChurch } from "@/context/ChurchContext";
import { Alert, Box, CircularProgress, Snackbar } from "@mui/material";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AddRecordModal } from "./components/AddRecordModal";
import { AnalyticsView } from "./components/AnalyticsView";
import { CardsView } from "./components/CardsView";
import { EditRecordDrawer } from "./components/EditRecordDrawer";
import { MoreModals, type MoreAction } from "./components/MoreModals";
import { RecordDrawer } from "./components/RecordDrawer";
import { TableView } from "./components/TableView";
import { TimelineView } from "./components/TimelineView";
import { Toolbar, type MoreAction as ToolbarMore } from "./components/Toolbar";
import "./theme.css";
import type { AnyRecord, Density, RecordType, ViewMode } from "./types";
import { recordClergy } from "./types";

const COL_KEYS_BY_TYPE: Record<RecordType, string[]> = {
  baptism: ["Name", "Record No.", "Date of Birth", "Baptism Date", "Church", "Birthplace", "Clergy"],
  marriage: ["Bride", "Groom", "Record No.", "Marriage Date", "Church", "Celebrant", "Witnesses"],
  funeral: ["Name", "Record No.", "Date of Death", "Funeral Date", "Church", "Burial Place", "Clergy"],
};

function formatDate(d: string | null | undefined): string {
  if (!d) return "—";
  try {
    const date = new Date(d);
    if (isNaN(date.getTime())) return d;
    return date.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  } catch { return d; }
}

function mapBaptismRecords(rows: any[], churchName: string): AnyRecord[] {
  return rows.map((r: any) => ({
    id: String(r.id),
    type: "baptism" as const,
    recordNo: r.registryNumber || r.record_no || r.recordNo || String(r.id),
    name: [r.first_name, r.last_name].filter(Boolean).join(" ") || r.child_name || r.name || "—",
    dob: formatDate(r.birth_date || r.dateOfBirth || r.child_birth_date),
    baptismDate: formatDate(r.reception_date || r.dateOfBaptism || r.baptism_date),
    church: r.churchName || r.church || churchName,
    birthplace: r.birthplace || r.placeOfBirth || "—",
    address: r.address || r.birthplace || "—",
    clergy: r.clergy || r.priest || r.priest_name || "—",
    status: r.status || "Recorded",
  }));
}

function mapMarriageRecords(rows: any[], churchName: string): AnyRecord[] {
  return rows.map((r: any) => ({
    id: String(r.id),
    type: "marriage" as const,
    recordNo: r.registryNumber || r.record_no || r.recordNo || String(r.id),
    bride: [r.fname_bride || r.brideFirstName, r.lname_bride || r.brideLastName].filter(Boolean).join(" ") || r.bride_name || "—",
    groom: [r.fname_groom || r.groomFirstName, r.lname_groom || r.groomLastName].filter(Boolean).join(" ") || r.groom_name || "—",
    marriageDate: formatDate(r.mdate || r.marriageDate || r.marriage_date),
    church: r.churchName || r.church || churchName,
    celebrant: r.clergy || r.priest || r.priest_name || "—",
    witnesses: r.witness || r.witnesses || "—",
    status: r.status || "Recorded",
  }));
}

function mapFuneralRecords(rows: any[], churchName: string): AnyRecord[] {
  return rows.map((r: any) => ({
    id: String(r.id),
    type: "funeral" as const,
    recordNo: r.registryNumber || r.record_no || r.recordNo || String(r.id),
    name: [r.name, r.lastname].filter(Boolean).join(" ") || r.deceased_name || "—",
    dod: formatDate(r.deceased_date || r.dateOfDeath || r.death_date),
    funeralDate: formatDate(r.burial_date || r.funeralDate || r.dateOfFuneral),
    church: r.churchName || r.church || churchName,
    burialPlace: r.burial_location || r.burialLocation || "—",
    clergy: r.clergy || r.priest || r.priest_name || "—",
    status: r.status || "Recorded",
  }));
}

const RecordsManagement: React.FC = () => {
  const { churchMetadata, activeChurchId } = useChurch();
  const churchName = churchMetadata?.church_name_display || churchMetadata?.church_name || "St. Peter & Paul";
  const churchId = activeChurchId || churchMetadata?.church_id || 46;

  const [recordType, setRecordType] = useState<RecordType>("baptism");
  const [view, setView] = useState<ViewMode>("table");
  const [search, setSearch] = useState("");
  const [priest, setPriest] = useState("All priests");
  const [density] = useState<Density>("default");
  const [drawerIdx, setDrawerIdx] = useState<number | null>(null);
  const [drawerAudit, setDrawerAudit] = useState(false);
  const [editIdx, setEditIdx] = useState<number | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [moreAction, setMoreAction] = useState<MoreAction>(null);
  const [standardTable, setStandardTable] = useState(false);
  const [visibleCols, setVisibleCols] = useState<Record<string, boolean>>({});
  const [toast, setToast] = useState<string | null>(null);

  const [records, setRecords] = useState<AnyRecord[]>([]);
  const [totalRecords, setTotalRecords] = useState(0);
  const [loading, setLoading] = useState(true);
  const [clergyList, setClergyList] = useState<string[]>([]);

  const loadRecords = useCallback(async (type: RecordType) => {
    setLoading(true);
    try {
      let res: any;
      if (type === "baptism") {
        res = await metricsAPI.records.getBaptismRecords({ limit: 100, search: search || undefined });
      } else if (type === "marriage") {
        res = await metricsAPI.records.getMarriageRecords({ limit: 100, search: search || undefined });
      } else {
        res = await metricsAPI.records.getFuneralRecords({ limit: 100, search: search || undefined });
      }

      const data = res?.data ?? res;
      const rows = data?.records ?? data?.data ?? (Array.isArray(data) ? data : []);
      const total = data?.totalRecords ?? data?.total ?? data?.pagination?.total ?? rows.length;

      let mapped: AnyRecord[];
      if (type === "baptism") mapped = mapBaptismRecords(rows, churchName);
      else if (type === "marriage") mapped = mapMarriageRecords(rows, churchName);
      else mapped = mapFuneralRecords(rows, churchName);

      setRecords(mapped);
      setTotalRecords(total);

      // Extract unique clergy names
      const clergy = new Set<string>();
      mapped.forEach((r) => {
        const c = recordClergy(r);
        if (c && c !== "—") clergy.add(c);
      });
      setClergyList(Array.from(clergy).sort());
    } catch (err) {
      console.error("Failed to load records:", err);
      setRecords([]);
      setTotalRecords(0);
    } finally {
      setLoading(false);
    }
  }, [churchName, search]);

  useEffect(() => { loadRecords(recordType); }, [recordType, loadRecords]);

  const filtered = useMemo(() => {
    return records.filter((r) => {
      const matchesPriest = priest === "All priests" || recordClergy(r) === priest;
      return matchesPriest;
    });
  }, [records, priest]);

  const drawerRecord = drawerIdx !== null ? filtered[drawerIdx] ?? null : null;
  const shown = view === "table" ? Math.min(filtered.length, 10) : view === "cards" ? Math.min(filtered.length, 3) : filtered.length;

  function openRecord(r: AnyRecord) {
    const i = filtered.findIndex((x) => x.id === r.id);
    setDrawerIdx(i >= 0 ? i : 0);
    setDrawerAudit(false);
  }

  function openAudit(r: AnyRecord) {
    openRecord(r);
    setDrawerAudit(true);
  }

  function openEdit(r: AnyRecord) {
    const i = filtered.findIndex((x) => x.id === r.id);
    setEditIdx(i >= 0 ? i : 0);
    setDrawerIdx(null);
  }

  const editRecord = editIdx !== null ? filtered[editIdx] ?? null : null;
  const cols = COL_KEYS_BY_TYPE[recordType];

  return (
    <div className="rm-scope">
      <main className="space-y-5">
        <div>
          <div className="text-[15px] text-[var(--rm-fg)] font-medium tracking-tight">Records Management</div>
          <p className="text-xs text-[var(--rm-muted-fg)] mt-0.5">Church Sacramental Records · {churchName}</p>
        </div>

        <Toolbar
          view={view}
          onView={setView}
          search={search}
          onSearch={setSearch}
          priest={priest}
          onPriest={setPriest}
          recordType={recordType}
          onRecordType={(t) => { setRecordType(t); setDrawerIdx(null); setSearch(""); }}
          totalShown={shown}
          totalAll={totalRecords}
          onAdd={() => setAddOpen(true)}
          onClear={() => { setSearch(""); setPriest("All priests"); setDrawerIdx(null); setToast("Selection cleared"); }}
          onMore={(a: ToolbarMore) => {
            if (a === "standard") { setStandardTable((s) => !s); setToast(standardTable ? "Switched to enhanced table" : "Switched to standard table"); return; }
            setMoreAction(a);
          }}
          standardTable={standardTable}
          clergyList={clergyList}
        />

        {loading ? (
          <Box display="flex" justifyContent="center" py={6}>
            <CircularProgress size={32} />
          </Box>
        ) : (
          <div>
            {view === "table" && (
              <TableView
                records={filtered}
                recordType={recordType}
                highlight={search}
                density={density}
                standard={standardTable}
                visibleCols={visibleCols}
                onOpen={openRecord}
                onEdit={openEdit}
                onCertificate={(r) => { window.open(`/portal/certificates/generate?recordType=${recordType}&recordId=${r.id}&churchId=${churchId}`, '_blank'); }}
                onAudit={openAudit}
                onExport={() => setMoreAction("export")}
              />
            )}
            {view === "cards" && <CardsView records={filtered} highlight={search} density={density} onOpen={openRecord} />}
            {view === "timeline" && <TimelineView records={filtered} highlight={search} density={density} onOpen={openRecord} />}
            {view === "analytics" && <AnalyticsView records={filtered} recordType={recordType} totalRecords={totalRecords} onOpen={openRecord} />}
          </div>
        )}
      </main>

      <RecordDrawer
        record={drawerRecord}
        focusAudit={drawerAudit}
        onClose={() => setDrawerIdx(null)}
        onPrev={() => setDrawerIdx((i) => (i === null ? null : (i - 1 + filtered.length) % filtered.length))}
        onNext={() => setDrawerIdx((i) => (i === null ? null : (i + 1) % filtered.length))}
        onEdit={() => { if (drawerRecord) openEdit(drawerRecord); }}
        onExport={() => setMoreAction("export")}
        onCertificate={() => { if (drawerRecord) window.open(`/portal/certificates/generate?recordType=${recordType}&recordId=${drawerRecord.id}&churchId=${churchId}`, '_blank'); }}
      />

      <EditRecordDrawer
        record={editRecord}
        recordType={recordType}
        clergyList={clergyList.length > 0 ? clergyList : ["Rev. Nicholas Kryluk"]}
        onClose={() => setEditIdx(null)}
        onSave={(id, data) => { setEditIdx(null); setToast("Record updated successfully"); loadRecords(recordType); }}
        onPrev={() => setEditIdx((i) => (i === null ? null : (i - 1 + filtered.length) % filtered.length))}
        onNext={() => setEditIdx((i) => (i === null ? null : (i + 1) % filtered.length))}
        currentIndex={editIdx ?? 0}
        totalCount={filtered.length}
      />

      <AddRecordModal
        open={addOpen}
        recordType={recordType}
        clergyList={clergyList.length > 0 ? clergyList : ["Rev. Nicholas Kryluk"]}
        onClose={() => setAddOpen(false)}
        onSave={(d) => {
          setToast(`${recordType[0].toUpperCase()}${recordType.slice(1)} record saved (demo)`);
          loadRecords(recordType);
        }}
      />

      <MoreModals
        action={moreAction}
        onClose={() => setMoreAction(null)}
        columns={cols}
        visibleCols={visibleCols}
        onToggleCol={(c) => setVisibleCols((p) => ({ ...p, [c]: !(p[c] ?? true) }))}
        onToast={setToast}
      />

      <Snackbar
        open={!!toast}
        autoHideDuration={3000}
        onClose={() => setToast(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert severity="success" onClose={() => setToast(null)} sx={{ width: "100%" }}>
          {toast}
        </Alert>
      </Snackbar>
    </div>
  );
};

export default RecordsManagement;
