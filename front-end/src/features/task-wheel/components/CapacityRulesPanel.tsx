import type { DayCapacity, Task } from './OMDailyTaskWheelPlanner';
import { AlertCircle } from 'lucide-react';

interface CapacityRulesPanelProps {
  selectedDay: string;
  capacity: DayCapacity;
  assignedTasks: Task[];
}

export function CapacityRulesPanel({ selectedDay, capacity, assignedTasks }: CapacityRulesPanelProps) {
  const assignedDifficult = assignedTasks.filter(t => t.difficulty === 'Difficult').length;
  const assignedMedium = assignedTasks.filter(t => t.difficulty === 'Medium').length;
  const assignedEasy = assignedTasks.filter(t => t.difficulty === 'Easy').length;
  const totalAssigned = assignedTasks.length;

  const difficultyStats = [
    {
      label: 'Difficult',
      assigned: assignedDifficult,
      cap: capacity.difficultCap,
      color: 'rose',
      bgColor: 'bg-rose-100',
      textColor: 'text-rose-700',
      progressColor: 'bg-rose-500',
    },
    {
      label: 'Medium',
      assigned: assignedMedium,
      cap: capacity.mediumCap,
      color: 'amber',
      bgColor: 'bg-amber-100',
      textColor: 'text-amber-700',
      progressColor: 'bg-amber-500',
    },
    {
      label: 'Easy',
      assigned: assignedEasy,
      cap: capacity.easyCap,
      color: 'teal',
      bgColor: 'bg-teal-100',
      textColor: 'text-teal-700',
      progressColor: 'bg-teal-500',
    },
  ];

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
      <h3 className="text-sm font-semibold text-slate-900 mb-4">Capacity Rules</h3>
      
      {/* Selected Day */}
      <div className="mb-6">
        <div className="text-xs text-slate-500 mb-1">Selected Day</div>
        <div className="font-semibold text-slate-900">{selectedDay}</div>
      </div>

      {/* Max Total Tasks */}
      <div className="mb-6">
        <div className="text-xs text-slate-500 mb-2">Total Task Capacity</div>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold text-slate-900">{totalAssigned}</span>
          <span className="text-sm text-slate-500">/ {capacity.maxTasks}</span>
        </div>
        <div className="mt-2 h-2 bg-slate-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-slate-900 transition-all duration-500"
            style={{ width: `${(totalAssigned / capacity.maxTasks) * 100}%` }}
          />
        </div>
      </div>

      {/* Difficulty Caps */}
      <div className="space-y-4 mb-6">
        <div className="text-xs font-medium text-slate-700 mb-3">Difficulty Limits</div>
        {difficultyStats.map(stat => (
          <div key={stat.label} className="space-y-2">
            <div className="flex items-center justify-between">
              <span className={`text-xs font-medium px-2 py-1 rounded ${stat.bgColor} ${stat.textColor}`}>
                {stat.label}
              </span>
              <span className="text-sm font-medium text-slate-700">
                {stat.assigned} / {stat.cap}
              </span>
            </div>
            <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div
                className={`h-full ${stat.progressColor} transition-all duration-500`}
                style={{ width: `${stat.cap > 0 ? (stat.assigned / stat.cap) * 100 : 0}%` }}
              />
            </div>
            {stat.cap === 0 && (
              <div className="flex items-center gap-1.5 text-xs text-slate-500">
                <AlertCircle className="w-3 h-3" />
                <span>Not allowed on {selectedDay}</span>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Explanation */}
      <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
        <p className="text-xs text-slate-600 leading-relaxed">
          Assignments cannot exceed today's capacity rules. The wheel will only select from eligible tasks that fit within these limits.
        </p>
      </div>
    </div>
  );
}
