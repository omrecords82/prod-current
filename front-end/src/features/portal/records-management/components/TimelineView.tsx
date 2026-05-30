import { Calendar, Cross, Droplet, Heart, MapPin, User2 } from "@/ui/icons";
import { Skeleton } from "@mui/material";
import { useMemo } from "react";
import type { AnyRecord, Density, RecordType } from "../types";
import { recordClergy, recordPrimaryDate, recordPrimaryName } from "../types";
import { StatusBadge } from "./StatusBadge";

const SACRAMENT_CONFIG: Record<RecordType, { Icon: any; color: string; label: string }> = {
  baptism: { Icon: Droplet, color: "#1e88e5", label: "Baptism" },
  marriage: { Icon: Heart, color: "#e91e63", label: "Marriage" },
  funeral: { Icon: Cross, color: "#7b1fa2", label: "Funeral" },
};

const SORT_OPTIONS: Record<RecordType, { key: string; label: string; getter: (r: AnyRecord) => string }[]> = {
  baptism: [
    { key: "date", label: "Baptism Date", getter: (r) => recordPrimaryDate(r) },
    { key: "name", label: "Name", getter: (r) => recordPrimaryName(r) },
    { key: "dob", label: "Date of Birth", getter: (r) => r.type === "baptism" ? r.dob : "" },
    { key: "recordNo", label: "Record #", getter: (r) => r.recordNo },
    { key: "clergy", label: "Clergy", getter: (r) => recordClergy(r) },
  ],
  marriage: [
    { key: "date", label: "Marriage Date", getter: (r) => recordPrimaryDate(r) },
    { key: "name", label: "Bride & Groom", getter: (r) => recordPrimaryName(r) },
    { key: "recordNo", label: "Record #", getter: (r) => r.recordNo },
    { key: "clergy", label: "Celebrant", getter: (r) => recordClergy(r) },
  ],
  funeral: [
    { key: "date", label: "Funeral Date", getter: (r) => recordPrimaryDate(r) },
    { key: "name", label: "Name", getter: (r) => recordPrimaryName(r) },
    { key: "dod", label: "Date of Death", getter: (r) => r.type === "funeral" ? r.dod : "" },
    { key: "recordNo", label: "Record #", getter: (r) => r.recordNo },
    { key: "clergy", label: "Clergy", getter: (r) => recordClergy(r) },
  ],
};

const DB_FIELD_TO_KEY: Record<string, string> = {
  id: "recordNo",
  first_name: "name",
  birth_date: "dob",
  reception_date: "date",
  fname_bride: "name",
  fname_groom: "name",
  mdate: "date",
  name: "name",
  deceased_date: "dod",
  burial_date: "date",
  clergy: "clergy",
};

interface TimelineGroup {
  label: string;
  sortKey: string;
  records: AnyRecord[];
}

function parseDate(dateStr: string): Date | null {
  if (!dateStr || dateStr === "—") return null;
  try {
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) return d;
  } catch { /* ignore */ }
  return null;
}

interface Props {
  records: AnyRecord[];
  recordType: RecordType;
  highlight?: string;
  density: Density;
  loading?: boolean;
  sortField?: string;
  sortDir?: "asc" | "desc";
  onOpen: (r: AnyRecord) => void;
}

export function TimelineView({ records, recordType, highlight, density, loading, sortField, sortDir, onOpen }: Props) {
  const config = SACRAMENT_CONFIG[recordType];
  const SacramentIcon = config.Icon;
  const sortOptions = SORT_OPTIONS[recordType];

  const resolvedKey = sortField ? (DB_FIELD_TO_KEY[sortField] || sortField) : "date";
  const activeOpt = sortOptions.find((o) => o.key === resolvedKey) || sortOptions[0];
  const isDateSort = ["date", "dob", "dod"].includes(activeOpt.key);

  const sortedRecords = useMemo(() => {
    const dir = sortDir === "asc" ? 1 : -1;
    const sorted = [...records].sort((a, b) => {
      const va = activeOpt.getter(a);
      const vb = activeOpt.getter(b);
      if (isDateSort) {
        const da = parseDate(va);
        const db = parseDate(vb);
        if (da && db) return (da.getTime() - db.getTime()) * dir;
        if (da) return -1;
        if (db) return 1;
        return 0;
      }
      if (activeOpt.key === "recordNo") {
        const na = parseInt(va, 10);
        const nb = parseInt(vb, 10);
        if (!isNaN(na) && !isNaN(nb)) return (na - nb) * dir;
      }
      return va.localeCompare(vb) * dir;
    });
    return sorted;
  }, [records, sortDir, activeOpt, isDateSort]);

  const groups = useMemo((): TimelineGroup[] => {
    const map = new Map<string, AnyRecord[]>();

    for (const r of sortedRecords) {
      let sortKey: string;

      if (isDateSort) {
        const dateStr = activeOpt.getter(r);
        sortKey = "0000-00";
        const d = parseDate(dateStr);
        if (d) {
          sortKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        }
      } else {
        const val = activeOpt.getter(r).trim();
        sortKey = val ? val.charAt(0).toUpperCase() : "#";
      }

      if (!map.has(sortKey)) map.set(sortKey, []);
      map.get(sortKey)!.push(r);
    }

    return Array.from(map.entries())
      .sort(([a], [b]) => sortDir === "asc" ? a.localeCompare(b) : b.localeCompare(a))
      .map(([sortKey, recs]) => {
        let label: string;
        if (isDateSort) {
          if (sortKey === "0000-00") {
            label = "Unknown Date";
          } else {
            const [y, m] = sortKey.split("-");
            const d = new Date(Number(y), Number(m) - 1);
            label = d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
          }
        } else {
          label = sortKey;
        }
        return { label, sortKey, records: recs };
      });
  }, [sortedRecords, sortDir, isDateSort, activeOpt]);

  if (loading) {
    return (
      <div className="bg-[var(--rm-card)] border border-[var(--rm-border)] rounded-xl p-6 space-y-6">
        {[1, 2, 3].map((i) => (
          <div key={i}>
            <Skeleton variant="text" width={160} height={28} sx={{ mb: 1 }} />
            <Skeleton variant="rounded" height={56} sx={{ borderRadius: 2 }} />
            <Skeleton variant="rounded" height={56} sx={{ borderRadius: 2, mt: 1 }} />
          </div>
        ))}
      </div>
    );
  }

  if (records.length === 0) {
    return (
      <div className="bg-[var(--rm-card)] border border-[var(--rm-border)] rounded-xl p-6">
        <div className="py-12 text-center">
          <Calendar className="w-12 h-12 mx-auto mb-3 opacity-30 text-[var(--rm-muted-fg)]" />
          <div className="text-base font-medium text-[var(--rm-fg)] mb-1">
            {highlight ? "No matching records" : "No records yet"}
          </div>
          <div className="text-sm text-[var(--rm-muted-fg)]">
            {highlight
              ? `No ${config.label.toLowerCase()} records match "${highlight}"`
              : `${config.label} records will appear here in chronological order.`}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[var(--rm-card)] border border-[var(--rm-border)] rounded-xl p-6">
      {/* Record count */}
      <div className="flex items-center mb-4">
        <div className="text-sm text-[var(--rm-muted-fg)]">
          {records.length} record{records.length !== 1 ? "s" : ""} · grouped by month
        </div>
      </div>

      {/* Timeline */}
      <div className="relative">
        {/* Vertical timeline line */}
        <div
          className="absolute top-0 bottom-0 w-0.5 rounded-full left-[17px] sm:left-[21px]"
          style={{ backgroundColor: `${config.color}20` }}
        />

        <div className="space-y-8">
          {groups.map((group) => (
            <div key={group.sortKey}>
              {/* Month/Year group header */}
              <div className="flex items-center gap-3 mb-3">
                <div
                  className="w-[36px] h-[36px] sm:w-[42px] sm:h-[42px] rounded-full flex items-center justify-center shrink-0 z-[1] bg-[var(--rm-card)]"
                  style={{ border: `2px solid ${config.color}40` }}
                >
                  <Calendar className="w-4 h-4" style={{ color: config.color }} />
                </div>
                <span className="text-sm font-bold tracking-wide" style={{ color: config.color }}>
                  {group.label}
                </span>
                <span
                  className="inline-flex items-center justify-center px-2 py-0.5 rounded-full text-[11px] font-semibold"
                  style={{ backgroundColor: `${config.color}15`, color: config.color }}
                >
                  {group.records.length}
                </span>
              </div>

              {/* Records in this group */}
              <div className="space-y-1.5 pl-[44px] sm:pl-[56px]">
                {group.records.map((r) => {
                  const name = recordPrimaryName(r);
                  const date = recordPrimaryDate(r);
                  const clergy = recordClergy(r);
                  const place = r.type === "baptism" ? r.birthplace : r.type === "funeral" ? r.burialPlace : r.church;
                  const isHi = highlight && name.toLowerCase().includes(highlight.toLowerCase());

                  return (
                    <button
                      key={r.id}
                      onClick={() => onOpen(r)}
                      className="w-full text-left flex items-center gap-3 px-3 py-2.5 rounded-lg border transition-all cursor-pointer"
                      style={{
                        borderColor: isHi ? config.color : "var(--rm-border)",
                        backgroundColor: isHi ? `${config.color}08` : "transparent",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = `${config.color}50`;
                        e.currentTarget.style.backgroundColor = `${config.color}06`;
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = isHi ? config.color : "var(--rm-border)";
                        e.currentTarget.style.backgroundColor = isHi ? `${config.color}08` : "transparent";
                      }}
                    >
                      <SacramentIcon className="w-4 h-4 shrink-0" style={{ color: config.color }} />

                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold text-[var(--rm-fg)] truncate">{name}</div>
                        <div className="text-xs text-[var(--rm-muted-fg)]">Record No. {r.recordNo}</div>
                      </div>

                      <div className="hidden sm:flex items-center gap-4 shrink-0 text-xs">
                        {place && place !== "—" && (
                          <span className="hidden lg:flex items-center gap-1 text-[var(--rm-muted-fg)]">
                            <MapPin className="w-3 h-3" /> {place}
                          </span>
                        )}
                        {clergy && clergy !== "—" && (
                          <span className="hidden md:flex items-center gap-1 text-[var(--rm-muted-fg)]">
                            <User2 className="w-3 h-3" /> {clergy.replace("Rev. ", "")}
                          </span>
                        )}
                        <span className="font-medium text-[var(--rm-muted-fg)]">{date}</span>
                      </div>

                      <div className="shrink-0">
                        <StatusBadge status={r.status} />
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
