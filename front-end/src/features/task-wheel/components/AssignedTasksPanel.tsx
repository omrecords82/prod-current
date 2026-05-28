import type { DayCapacity, Task } from './OMDailyTaskWheelPlanner';
import { CheckCircle2, Clock, AlertTriangle } from 'lucide-react';

interface AssignedTasksPanelProps {
  assignedTasks: Task[];
  capacity: DayCapacity;
}

export function AssignedTasksPanel({ assignedTasks, capacity }: AssignedTasksPanelProps) {
  const difficultCount = assignedTasks.filter(t => t.difficulty === 'Difficult').length;
  const mediumCount = assignedTasks.filter(t => t.difficulty === 'Medium').length;
  const easyCount = assignedTasks.filter(t => t.difficulty === 'Easy').length;
  const totalCount = assignedTasks.length;

  const isWithinCapacity = 
    totalCount <= capacity.maxTasks &&
    difficultCount <= capacity.difficultCap &&
    mediumCount <= capacity.mediumCap &&
    easyCount <= capacity.easyCap;

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'Difficult':
        return 'bg-rose-100 text-rose-700';
      case 'Medium':
        return 'bg-amber-100 text-amber-700';
      case 'Easy':
        return 'bg-teal-100 text-teal-700';
      default:
        return 'bg-slate-100 text-slate-700';
    }
  };

  const getSystemColor = (system: string) => {
    const colors: Record<string, string> = {
      'OM': 'bg-blue-100 text-blue-700',
      'OMAI': 'bg-purple-100 text-purple-700',
      'OMStudio': 'bg-pink-100 text-pink-700',
      'OM-Workshop': 'bg-indigo-100 text-indigo-700',
      'Infra': 'bg-slate-100 text-slate-700',
    };
    return colors[system] || 'bg-slate-100 text-slate-700';
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'High':
        return <AlertTriangle className="w-3 h-3 text-red-500" />;
      case 'Medium':
        return <Clock className="w-3 h-3 text-amber-500" />;
      case 'Low':
        return <CheckCircle2 className="w-3 h-3 text-green-500" />;
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
      <h3 className="text-sm font-semibold text-slate-900 mb-4">Today's Assigned Tasks</h3>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="p-3 bg-slate-50 rounded-lg">
          <div className="text-xs text-slate-500 mb-1">Total</div>
          <div className="text-xl font-bold text-slate-900">{totalCount}</div>
        </div>
        <div className="p-3 bg-slate-50 rounded-lg">
          <div className="text-xs text-slate-500 mb-1">Status</div>
          <div className={`text-xs font-semibold ${isWithinCapacity ? 'text-green-600' : 'text-red-600'}`}>
            {isWithinCapacity ? 'Within Capacity' : 'Over Capacity'}
          </div>
        </div>
      </div>

      {/* Difficulty Breakdown */}
      <div className="mb-6 p-4 bg-slate-50 rounded-lg">
        <div className="text-xs font-medium text-slate-700 mb-3">Difficulty Breakdown</div>
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-600">Difficult</span>
            <span className="font-semibold text-slate-900">{difficultCount}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-600">Medium</span>
            <span className="font-semibold text-slate-900">{mediumCount}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-600">Easy</span>
            <span className="font-semibold text-slate-900">{easyCount}</span>
          </div>
        </div>
      </div>

      {/* Task Cards */}
      <div className="space-y-3 max-h-[600px] overflow-y-auto">
        {assignedTasks.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-slate-400 mb-2">
              <CheckCircle2 className="w-12 h-12 mx-auto" />
            </div>
            <p className="text-sm text-slate-500">No tasks assigned yet</p>
            <p className="text-xs text-slate-400 mt-1">Use the wheel to assign tasks</p>
          </div>
        ) : (
          assignedTasks.map(task => (
            <div
              key={task.id}
              className="p-4 border border-slate-200 rounded-lg hover:border-slate-300 transition-colors"
            >
              <div className="flex items-start gap-2 mb-3">
                {getPriorityIcon(task.priority)}
                <h4 className="text-sm font-medium text-slate-900 flex-1 leading-snug">
                  {task.title}
                </h4>
              </div>
              
              <div className="flex flex-wrap gap-2 mb-2">
                <span className={`text-xs px-2 py-1 rounded font-medium ${getDifficultyColor(task.difficulty)}`}>
                  {task.difficulty}
                </span>
                <span className={`text-xs px-2 py-1 rounded font-medium ${getSystemColor(task.system)}`}>
                  {task.system}
                </span>
              </div>

              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>{task.effort}</span>
                <span className="capitalize">{task.status}</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
