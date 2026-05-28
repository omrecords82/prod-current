import type { AuditEntry } from './OMDailyTaskWheelPlanner';
import { FileText, Clock } from 'lucide-react';
import { format } from 'date-fns';

interface AuditTrailPanelProps {
  auditTrail: AuditEntry[];
}

export function AuditTrailPanel({ auditTrail }: AuditTrailPanelProps) {
  if (auditTrail.length === 0) {
    return null;
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
      <div className="flex items-center gap-2 mb-4">
        <FileText className="w-4 h-4 text-slate-600" />
        <h3 className="text-sm font-semibold text-slate-900">Audit Trail</h3>
      </div>

      <div className="space-y-4">
        {auditTrail.map((entry, index) => (
          <div
            key={index}
            className="pb-4 border-b border-slate-100 last:border-b-0 last:pb-0"
          >
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-slate-900 text-white flex items-center justify-center text-xs font-bold">
                {entry.step}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-medium text-slate-900">{entry.action}</span>
                  <span className="text-xs text-slate-500 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {format(entry.timestamp, 'HH:mm:ss')}
                  </span>
                </div>
                <div className="text-sm text-slate-700 mb-2">
                  <span className="font-semibold">Result:</span> {entry.result}
                </div>
                <div className="text-xs text-slate-600 bg-slate-50 rounded p-2 leading-relaxed">
                  {entry.reasoning}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
