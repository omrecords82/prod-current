import { ChevronLeft, ChevronRight, Save, X, XCircle } from "@/ui/icons";
import { Drawer } from "@mui/material";
import React, { useEffect, useState } from "react";
import type { AnyRecord, RecordType } from "../types";
import { recordPrimaryName } from "../types";

interface Props {
  record: AnyRecord | null;
  recordType: RecordType;
  clergyList: string[];
  onClose: () => void;
  onSave: (id: string, data: any) => void;
  onPrev: () => void;
  onNext: () => void;
  currentIndex: number;
  totalCount: number;
}

export function EditRecordDrawer({ record, recordType, clergyList, onClose, onSave, onPrev, onNext, currentIndex, totalCount }: Props) {
  const [form, setForm] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!record) return;
    if (record.type === "baptism") {
      const parts = record.name.split(" ");
      const firstName = parts[0] || "";
      const lastName = parts.slice(1).join(" ") || "";
      setForm({
        firstName, lastName,
        dob: parseDateForInput(record.dob),
        birthplace: record.birthplace || "",
        fatherName: "",
        motherName: "",
        baptismDate: parseDateForInput(record.baptismDate),
        receivedBy: "Baptism",
        godparentNames: "",
        clergy: record.clergy || "",
        church: record.church || "",
        registryNumber: record.recordNo || "",
      });
    } else if (record.type === "marriage") {
      const brideParts = record.bride.split(" ");
      const groomParts = record.groom.split(" ");
      setForm({
        groomFirstName: groomParts[0] || "",
        groomLastName: groomParts.slice(1).join(" ") || "",
        groomParents: "",
        brideFirstName: brideParts[0] || "",
        brideLastName: brideParts.slice(1).join(" ") || "",
        brideParents: "",
        marriageDate: parseDateForInput(record.marriageDate),
        marriageLocation: "",
        witness1: record.witnesses?.split(",")[0]?.trim() || "",
        witness2: record.witnesses?.split(",")[1]?.trim() || "",
        celebrant: record.celebrant || "",
        church: record.church || "",
        registryNumber: record.recordNo || "",
      });
    } else {
      const parts = record.name.split(" ");
      const firstName = parts[0] || "";
      const lastName = parts.slice(1).join(" ") || "";
      setForm({
        firstName, lastName,
        ageAtDeath: "",
        dod: parseDateForInput(record.dod),
        burialDate: parseDateForInput(record.funeralDate),
        burialLocation: record.burialPlace || "",
        clergy: record.clergy || "",
        church: record.church || "",
        registryNumber: record.recordNo || "",
      });
    }
  }, [record]);

  if (!record) return null;

  const typeLabel = recordType === "baptism" ? "BAPTISM RECORD" : recordType === "marriage" ? "MARRIAGE RECORD" : "FUNERAL RECORD";
  const displayName = recordPrimaryName(record);

  function set(key: string, val: string) {
    setForm((f) => ({ ...f, [key]: val }));
  }

  return (
    <Drawer
      anchor="right"
      open={!!record}
      onClose={onClose}
      slotProps={{ backdrop: { sx: { backgroundColor: "rgba(0,0,0,0.25)" } } }}
      PaperProps={{ sx: { width: { xs: "100%", sm: 480 }, bgcolor: "transparent" } }}
    >
      <div className="rm-scope h-full flex flex-col" style={{ background: "var(--rm-bg)" }}>
        {/* Header */}
        <div className="relative text-white p-5 shrink-0" style={{ background: 'linear-gradient(to bottom right, var(--rm-accent-dark), var(--rm-accent))' }}>
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <div className="text-[11px] uppercase tracking-widest opacity-80">{typeLabel}</div>
              <div className="text-lg font-semibold truncate">{displayName}</div>
            </div>
            <div className="flex items-center gap-1 ml-3">
              <span className="text-xs opacity-70">{currentIndex + 1}/{totalCount}</span>
              <button onClick={onPrev} className="w-7 h-7 rounded-full hover:bg-white/20 flex items-center justify-center"><ChevronLeft className="w-4 h-4" /></button>
              <button onClick={onNext} className="w-7 h-7 rounded-full hover:bg-white/20 flex items-center justify-center"><ChevronRight className="w-4 h-4" /></button>
              <button onClick={onClose} className="w-7 h-7 rounded-full hover:bg-white/20 flex items-center justify-center"><X className="w-4 h-4" /></button>
            </div>
          </div>
        </div>

        {/* Scrollable form body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {recordType === "baptism" && (
            <>
              <FormSection title="Personal Information">
                <div className="grid grid-cols-2 gap-3">
                  <FormField label="First Name *" value={form.firstName} onChange={(v) => set("firstName", v)} />
                  <FormField label="Last Name *" value={form.lastName} onChange={(v) => set("lastName", v)} />
                  <FormField label="Date of Birth" value={form.dob} onChange={(v) => set("dob", v)} type="date" />
                  <FormField label="Place of Birth" value={form.birthplace} onChange={(v) => set("birthplace", v)} />
                  <FormField label="Father's Name" value={form.fatherName} onChange={(v) => set("fatherName", v)} />
                  <FormField label="Mother's Name" value={form.motherName} onChange={(v) => set("motherName", v)} />
                </div>
              </FormSection>

              <FormSection title="Baptism Details">
                <div className="grid grid-cols-2 gap-3">
                  <FormField label="Date of Baptism *" value={form.baptismDate} onChange={(v) => set("baptismDate", v)} type="date" />
                  <FormSelect label="Received By" value={form.receivedBy} onChange={(v) => set("receivedBy", v)} options={["Baptism", "Chrismation", "Both"]} />
                </div>
                <FormField label="Godparent Names" value={form.godparentNames} onChange={(v) => set("godparentNames", v)} full />
              </FormSection>

              <FormSection title="Church & Registry Information">
                <div className="grid grid-cols-2 gap-3">
                  <FormSelect label="Priest" value={form.clergy} onChange={(v) => set("clergy", v)} options={clergyList} />
                  <FormField label="Church" value={form.church} onChange={(v) => set("church", v)} />
                </div>
                <FormField label="Registry Number" value={form.registryNumber} onChange={(v) => set("registryNumber", v)} full />
              </FormSection>
            </>
          )}

          {recordType === "marriage" && (
            <>
              <FormSection title="Groom Information">
                <div className="grid grid-cols-2 gap-3">
                  <FormField label="First Name *" value={form.groomFirstName} onChange={(v) => set("groomFirstName", v)} />
                  <FormField label="Last Name *" value={form.groomLastName} onChange={(v) => set("groomLastName", v)} />
                </div>
                <FormField label="Groom's Parents" value={form.groomParents} onChange={(v) => set("groomParents", v)} full />
              </FormSection>

              <FormSection title="Bride Information">
                <div className="grid grid-cols-2 gap-3">
                  <FormField label="First Name *" value={form.brideFirstName} onChange={(v) => set("brideFirstName", v)} />
                  <FormField label="Last Name *" value={form.brideLastName} onChange={(v) => set("brideLastName", v)} />
                </div>
                <FormField label="Bride's Parents" value={form.brideParents} onChange={(v) => set("brideParents", v)} full />
              </FormSection>

              <FormSection title="Marriage Details">
                <div className="grid grid-cols-2 gap-3">
                  <FormField label="Marriage Date *" value={form.marriageDate} onChange={(v) => set("marriageDate", v)} type="date" />
                  <FormField label="Marriage Location" value={form.marriageLocation} onChange={(v) => set("marriageLocation", v)} />
                  <FormField label="Witness 1" value={form.witness1} onChange={(v) => set("witness1", v)} />
                  <FormField label="Witness 2" value={form.witness2} onChange={(v) => set("witness2", v)} />
                </div>
                <div className="grid grid-cols-2 gap-3 mt-3">
                  <FormSelect label="Celebrant" value={form.celebrant} onChange={(v) => set("celebrant", v)} options={clergyList} />
                  <FormField label="Church" value={form.church} onChange={(v) => set("church", v)} />
                </div>
              </FormSection>
            </>
          )}

          {recordType === "funeral" && (
            <>
              <FormSection title="Deceased Information">
                <div className="grid grid-cols-2 gap-3">
                  <FormField label="First Name *" value={form.firstName} onChange={(v) => set("firstName", v)} />
                  <FormField label="Last Name *" value={form.lastName} onChange={(v) => set("lastName", v)} />
                </div>
                <FormField label="Age at Death" value={form.ageAtDeath} onChange={(v) => set("ageAtDeath", v)} full />
              </FormSection>

              <FormSection title="Funeral Details">
                <div className="grid grid-cols-2 gap-3">
                  <FormField label="Date of Death *" value={form.dod} onChange={(v) => set("dod", v)} type="date" />
                  <FormField label="Burial Date" value={form.burialDate} onChange={(v) => set("burialDate", v)} type="date" />
                </div>
                <FormField label="Burial Location" value={form.burialLocation} onChange={(v) => set("burialLocation", v)} full />
                <div className="grid grid-cols-2 gap-3 mt-3">
                  <FormSelect label="Priest" value={form.clergy} onChange={(v) => set("clergy", v)} options={clergyList} />
                  <FormField label="Church" value={form.church} onChange={(v) => set("church", v)} />
                </div>
              </FormSection>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="shrink-0 flex items-center justify-end gap-3 px-5 py-3 border-t border-[var(--rm-border)]">
          <button onClick={onClose} className="inline-flex items-center gap-1.5 px-4 py-2 text-sm text-[var(--rm-fg)] hover:bg-[var(--rm-muted)] rounded-md transition-all">
            <XCircle className="w-4 h-4" /> Cancel
          </button>
          <button
            onClick={() => onSave(record.id, form)}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm text-white bg-green-700 hover:bg-green-800 rounded-md transition-all"
          >
            <Save className="w-4 h-4" /> Save
          </button>
        </div>
      </div>
    </Drawer>
  );
}

function FormSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-base font-medium text-[var(--rm-fg)] mb-1">{title}</div>
      <div className="h-0.5 w-16 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full mb-4" />
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function FormField({ label, value, onChange, type = "text", full }: { label: string; value: string; onChange: (v: string) => void; type?: string; full?: boolean }) {
  return (
    <label className={`relative block ${full ? "col-span-2" : ""}`}>
      <input
        type={type}
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        placeholder=" "
        className="peer w-full px-3 py-2.5 rounded-md border border-gray-300 bg-transparent text-sm text-[var(--rm-fg)] outline-none focus:border-[var(--rm-accent)] focus:ring-1 focus:ring-[var(--rm-accent)] transition-all"
      />
      <span className="absolute -top-2 left-3 px-1 bg-[var(--rm-bg)] text-[11px] text-gray-500 pointer-events-none">{label}</span>
    </label>
  );
}

function FormSelect({ label, value, onChange, options, full }: { label: string; value: string; onChange: (v: string) => void; options: string[]; full?: boolean }) {
  return (
    <label className={`relative block ${full ? "col-span-2" : ""}`}>
      <select
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2.5 rounded-md border border-gray-300 bg-transparent text-sm text-[var(--rm-fg)] outline-none focus:border-[var(--rm-accent)] focus:ring-1 focus:ring-[var(--rm-accent)] transition-all appearance-none"
      >
        <option value="">{label}</option>
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
      <span className="absolute -top-2 left-3 px-1 bg-[var(--rm-bg)] text-[11px] text-gray-500 pointer-events-none">{label}</span>
    </label>
  );
}

function parseDateForInput(dateStr: string | undefined): string {
  if (!dateStr || dateStr === "—") return "";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "";
    return d.toISOString().split("T")[0];
  } catch {
    return "";
  }
}
