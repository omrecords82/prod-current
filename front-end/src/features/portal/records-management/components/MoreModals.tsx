import { Check, Copy, FileText, Upload } from "@/ui/icons";
import { Button, Dialog, DialogActions, DialogContent, DialogTitle } from "@mui/material";
import { useState } from "react";

export type MoreAction = "export" | "import" | "report" | "collab" | "grid" | null;

interface Props {
  action: MoreAction;
  onClose: () => void;
  columns: string[];
  visibleCols: Record<string, boolean>;
  onToggleCol: (c: string) => void;
  onToast: (msg: string) => void;
}

export function MoreModals({ action, onClose, columns, visibleCols, onToggleCol, onToast }: Props) {
  const [format, setFormat] = useState("PDF");
  const [reportType, setReportType] = useState("Summary");
  const [copied, setCopied] = useState(false);
  const link = "https://orthodox-metrics.com/share/parish/ss-peter-paul/r/collab";

  const inputCls = "w-full px-3 py-2 rounded-md border border-[var(--rm-border)] bg-[var(--rm-card)] text-sm text-[var(--rm-fg)]";
  const dialogPaper = { className: 'rm-scope' as const, sx: { bgcolor: 'var(--rm-card)', color: 'var(--rm-fg)' } };
  const accentBtnSx = { textTransform: 'none' as const, bgcolor: 'var(--rm-accent)', '&:hover': { bgcolor: 'var(--rm-accent-hover)' } };
  const selectedChip = "text-white border-transparent bg-[var(--rm-accent)]";
  const chip = "border-[var(--rm-border)] text-[var(--rm-fg)] hover:bg-[var(--rm-muted)]";

  return (
    <>
      {/* Export */}
      <Dialog open={action === "export"} onClose={onClose} maxWidth="xs" fullWidth PaperProps={dialogPaper}>
        <DialogTitle sx={{ color: 'var(--rm-fg)' }}>Export Records</DialogTitle>
        <DialogContent>
          <div className="rm-scope space-y-2">
            <div className="text-xs text-gray-500">Export format</div>
            <div className="grid grid-cols-2 gap-2">
              {["PDF", "DOCX", "CSV", "Excel"].map((f) => (
                <button
                  key={f}
                  onClick={() => setFormat(f)}
                  className={`px-3 py-2 rounded-md border text-sm transition-all ${format === f ? selectedChip : chip}`}
                >{f}</button>
              ))}
            </div>
          </div>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={onClose} sx={{ textTransform: 'none', color: 'var(--rm-accent)' }}>Cancel</Button>
          <Button onClick={() => { onToast(`Exporting as ${format}…`); onClose(); }} variant="contained" sx={accentBtnSx}>Export</Button>
        </DialogActions>
      </Dialog>

      {/* Import */}
      <Dialog open={action === "import"} onClose={onClose} maxWidth="xs" fullWidth PaperProps={dialogPaper}>
        <DialogTitle sx={{ color: 'var(--rm-fg)' }}>Import Records</DialogTitle>
        <DialogContent>
          <div className="rm-scope">
            <label className="block border-2 border-dashed border-gray-200 rounded-xl p-8 text-center hover:bg-gray-50 cursor-pointer transition-all">
              <Upload className="w-8 h-8 mx-auto text-gray-500 mb-2" />
              <div className="text-sm text-gray-900">Drag &amp; drop a file here</div>
              <div className="text-xs text-gray-500 mt-1">or click to browse</div>
              <input type="file" className="hidden" />
            </label>
            <div className="flex items-center justify-center gap-2 text-xs text-gray-500 mt-3">
              <span className="px-2 py-0.5 rounded border border-gray-200">CSV</span>
              <span className="px-2 py-0.5 rounded border border-gray-200">XLSX</span>
              <span className="px-2 py-0.5 rounded border border-gray-200">PDF</span>
            </div>
          </div>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={onClose} sx={{ textTransform: 'none', color: 'var(--rm-accent)' }}>Cancel</Button>
          <Button onClick={() => { onToast("Records imported"); onClose(); }} variant="contained" sx={accentBtnSx}>Upload</Button>
        </DialogActions>
      </Dialog>

      {/* Report */}
      <Dialog open={action === "report"} onClose={onClose} maxWidth="xs" fullWidth PaperProps={dialogPaper}>
        <DialogTitle sx={{ color: 'var(--rm-fg)' }}>Generate Records Report</DialogTitle>
        <DialogContent>
          <div className="rm-scope space-y-3 pt-1">
            <label className="block space-y-1">
              <div className="text-xs text-gray-500">Report type</div>
              <select value={reportType} onChange={(e) => setReportType(e.target.value)} className={inputCls}>
                <option>Summary</option>
                <option>Detailed</option>
                <option>Clergy Activity</option>
                <option>Year-over-Year</option>
              </select>
            </label>
            <div className="grid grid-cols-2 gap-2">
              <label className="space-y-1"><div className="text-xs text-gray-500">From</div><input type="date" className={inputCls} /></label>
              <label className="space-y-1"><div className="text-xs text-gray-500">To</div><input type="date" className={inputCls} /></label>
            </div>
          </div>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={onClose} sx={{ textTransform: 'none', color: 'var(--rm-accent)' }}>Cancel</Button>
          <Button onClick={() => { onToast(`Generating ${reportType} report`); onClose(); }} variant="contained" sx={accentBtnSx}>
            <FileText className="w-4 h-4 mr-1" /> Generate
          </Button>
        </DialogActions>
      </Dialog>

      {/* Collab */}
      <Dialog open={action === "collab"} onClose={onClose} maxWidth="xs" fullWidth PaperProps={dialogPaper}>
        <DialogTitle sx={{ color: 'var(--rm-fg)' }}>Collaboration Link</DialogTitle>
        <DialogContent>
          <div className="rm-scope">
          <div className="text-xs text-gray-500 mb-3">Anyone with this link can view this record set.</div>
          <div className="flex items-center gap-2">
            <input readOnly value={link} className="flex-1 px-3 py-2 rounded-md border border-gray-200 bg-gray-50 text-xs text-gray-900" />
            <button
              onClick={() => { navigator.clipboard?.writeText(link); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
              className="inline-flex items-center gap-1 px-3 py-2 rounded-md text-white text-sm bg-[var(--rm-accent)] hover:bg-[var(--rm-accent-hover)]"
            >
              {copied ? <><Check className="w-4 h-4" /> Copied</> : <><Copy className="w-4 h-4" /> Copy</>}
            </button>
          </div>
          </div>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={onClose} sx={{ textTransform: 'none' }}>Done</Button>
        </DialogActions>
      </Dialog>

      {/* Grid Options */}
      <Dialog open={action === "grid"} onClose={onClose} maxWidth="xs" fullWidth PaperProps={dialogPaper}>
        <DialogTitle sx={{ color: 'var(--rm-fg)' }}>Grid Options</DialogTitle>
        <DialogContent>
          <div className="rm-scope space-y-2">
            <div className="text-xs text-gray-500">Visible columns</div>
            {columns.map((c) => (
              <label key={c} className="flex items-center gap-2 text-sm text-gray-900 cursor-pointer">
                <input type="checkbox" checked={visibleCols[c] ?? true} onChange={() => onToggleCol(c)} />
                {c}
              </label>
            ))}
          </div>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={onClose} variant="contained" sx={accentBtnSx}>Done</Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
