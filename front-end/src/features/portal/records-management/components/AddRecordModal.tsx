import { Button, Dialog, DialogActions, DialogContent, DialogTitle } from "@mui/material";
import { useState } from "react";
import type { RecordType } from "../types";

interface Props {
  open: boolean;
  recordType: RecordType;
  clergyList: string[];
  onClose: () => void;
  onSave: (data: any) => void;
}

const STATUSES = ["Recorded", "Verified", "Awaiting Clergy"] as const;

const TITLES: Record<RecordType, string> = {
  baptism: "Add Baptism Record",
  marriage: "Add Marriage Record",
  funeral: "Add Funeral Record",
};

export function AddRecordModal({ open, recordType, clergyList, onClose, onSave }: Props) {
  const [form, setForm] = useState({
    name: "", dob: "", baptismDate: "", church: "St. Peter & Paul",
    birthplace: "", address: "", clergy: clergyList[0] || "", status: "Recorded",
  });

  const inputCls = "w-full px-2.5 py-2 rounded-md border border-gray-200 bg-white text-sm text-gray-900 outline-none focus:border-[#11307a] focus:ring-2 focus:ring-[rgba(17,48,122,0.12)] transition-all";

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth PaperProps={{ sx: { bgcolor: '#ffffff', color: '#1a1a2e' } }}>
      <DialogTitle sx={{ color: '#1a1a2e' }}>{TITLES[recordType]}</DialogTitle>
      <DialogContent>
        <div className="rm-scope grid grid-cols-2 gap-3 pt-2">
          {recordType === "baptism" && (
            <>
              <Field label="Name" col={2}>
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputCls} placeholder="Full name" />
              </Field>
              <Field label="Date of Birth"><input type="date" value={form.dob} onChange={(e) => setForm({ ...form, dob: e.target.value })} className={inputCls} /></Field>
              <Field label="Baptism Date"><input type="date" value={form.baptismDate} onChange={(e) => setForm({ ...form, baptismDate: e.target.value })} className={inputCls} /></Field>
              <Field label="Church" col={2}><input value={form.church} onChange={(e) => setForm({ ...form, church: e.target.value })} className={inputCls} /></Field>
              <Field label="Birthplace"><input value={form.birthplace} onChange={(e) => setForm({ ...form, birthplace: e.target.value })} className={inputCls} placeholder="City, State" /></Field>
              <Field label="Address"><input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className={inputCls} /></Field>
            </>
          )}
          {recordType === "marriage" && (
            <>
              <Field label="Bride" col={2}><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputCls} placeholder="Bride's full name" /></Field>
              <Field label="Groom" col={2}><input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className={inputCls} placeholder="Groom's full name" /></Field>
              <Field label="Marriage Date" col={2}><input type="date" value={form.baptismDate} onChange={(e) => setForm({ ...form, baptismDate: e.target.value })} className={inputCls} /></Field>
              <Field label="Church" col={2}><input value={form.church} onChange={(e) => setForm({ ...form, church: e.target.value })} className={inputCls} /></Field>
              <Field label="Witnesses" col={2}><input value={form.birthplace} onChange={(e) => setForm({ ...form, birthplace: e.target.value })} className={inputCls} placeholder="Witness names" /></Field>
            </>
          )}
          {recordType === "funeral" && (
            <>
              <Field label="Name" col={2}><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputCls} placeholder="Full name" /></Field>
              <Field label="Date of Death"><input type="date" value={form.dob} onChange={(e) => setForm({ ...form, dob: e.target.value })} className={inputCls} /></Field>
              <Field label="Funeral Date"><input type="date" value={form.baptismDate} onChange={(e) => setForm({ ...form, baptismDate: e.target.value })} className={inputCls} /></Field>
              <Field label="Church" col={2}><input value={form.church} onChange={(e) => setForm({ ...form, church: e.target.value })} className={inputCls} /></Field>
              <Field label="Burial Place" col={2}><input value={form.birthplace} onChange={(e) => setForm({ ...form, birthplace: e.target.value })} className={inputCls} placeholder="Cemetery or location" /></Field>
            </>
          )}
          <Field label={recordType === "marriage" ? "Celebrant" : "Clergy"}>
            <select value={form.clergy} onChange={(e) => setForm({ ...form, clergy: e.target.value })} className={inputCls}>
              {clergyList.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </Field>
          <Field label="Status">
            <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className={inputCls}>
              {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </Field>
        </div>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} sx={{ textTransform: 'none' }}>Cancel</Button>
        <Button onClick={() => onSave(form)} variant="contained" sx={{ textTransform: 'none', bgcolor: '#11307a', '&:hover': { bgcolor: '#0e2865' } }}>Save Record</Button>
      </DialogActions>
    </Dialog>
  );
}

function Field({ label, children, col = 1 }: any) {
  return (
    <label className={`space-y-1 ${col === 2 ? "col-span-2" : ""}`}>
      <div className="text-xs text-gray-500">{label}</div>
      {children}
    </label>
  );
}
