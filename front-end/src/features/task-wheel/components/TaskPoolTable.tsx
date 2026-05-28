import { useState } from 'react';
import type { Task, DifficultyMix } from './OMDailyTaskWheelPlanner';
import { Filter, Search } from 'lucide-react';

interface TaskPoolTableProps {
  availableTasks: Task[];
  difficultyMix: DifficultyMix | null;
}

export function TaskPoolTable({ availableTasks, difficultyMix }: TaskPoolTableProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [difficultyFilter, setDifficultyFilter] = useState<string>('All');
  const [systemFilter, setSystemFilter] = useState<string>('All');
  const [statusFilter, setStatusFilter] = useState<string>('All');

  const filteredTasks = availableTasks.filter(task => {
    const matchesSearch = task.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesDifficulty = difficultyFilter === 'All' || task.difficulty === difficultyFilter;
    const matchesSystem = systemFilter === 'All' || task.system === systemFilter;
    const matchesStatus = statusFilter === 'All' || task.status === statusFilter;
    
    return matchesSearch && matchesDifficulty && matchesSystem && matchesStatus;
  });

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

  const hasInsufficientTasks = difficultyMix && (
    availableTasks.filter(t => t.difficulty === 'Difficult' && t.status === 'Ready').length < difficultyMix.difficult ||
    availableTasks.filter(t => t.difficulty === 'Medium' && t.status === 'Ready').length < difficultyMix.medium ||
    availableTasks.filter(t => t.difficulty === 'Easy' && t.status === 'Ready').length < difficultyMix.easy
  );

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-sm font-semibold text-slate-900 mb-1">Task Pool</h3>
          <p className="text-xs text-slate-500">
            {filteredTasks.length} available tasks
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400" />
        </div>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search tasks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent"
          />
        </div>

        {/* Difficulty Filter */}
        <select
          value={difficultyFilter}
          onChange={(e) => setDifficultyFilter(e.target.value)}
          className="px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent"
        >
          <option value="All">All Difficulties</option>
          <option value="Difficult">Difficult</option>
          <option value="Medium">Medium</option>
          <option value="Easy">Easy</option>
        </select>

        {/* System Filter */}
        <select
          value={systemFilter}
          onChange={(e) => setSystemFilter(e.target.value)}
          className="px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent"
        >
          <option value="All">All Systems</option>
          <option value="OM">OM</option>
          <option value="OMAI">OMAI</option>
          <option value="OMStudio">OMStudio</option>
          <option value="OM-Workshop">OM-Workshop</option>
          <option value="Infra">Infra</option>
        </select>

        {/* Status Filter */}
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent"
        >
          <option value="All">All Statuses</option>
          <option value="Ready">Ready</option>
          <option value="In Progress">In Progress</option>
          <option value="Blocked">Blocked</option>
          <option value="Pending">Pending</option>
        </select>
      </div>

      {/* Insufficient Tasks Warning */}
      {hasInsufficientTasks && (
        <div className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <div className="text-sm font-medium text-amber-900 mb-1">Insufficient Eligible Tasks</div>
          <p className="text-xs text-amber-700">
            There are not enough Ready tasks in one or more difficulty categories to fulfill the selected mix.
            Please adjust the mix or add more tasks to the pool.
          </p>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-200">
              <th className="text-left py-3 px-4 text-xs font-semibold text-slate-700">Task</th>
              <th className="text-left py-3 px-4 text-xs font-semibold text-slate-700">Difficulty</th>
              <th className="text-left py-3 px-4 text-xs font-semibold text-slate-700">System</th>
              <th className="text-left py-3 px-4 text-xs font-semibold text-slate-700">Effort</th>
              <th className="text-left py-3 px-4 text-xs font-semibold text-slate-700">Priority</th>
              <th className="text-left py-3 px-4 text-xs font-semibold text-slate-700">Status</th>
            </tr>
          </thead>
          <tbody>
            {filteredTasks.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-12 text-center">
                  <p className="text-sm text-slate-500">No tasks found</p>
                  <p className="text-xs text-slate-400 mt-1">Try adjusting your filters</p>
                </td>
              </tr>
            ) : (
              filteredTasks.map(task => (
                <tr key={task.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                  <td className="py-3 px-4">
                    <div className="text-sm text-slate-900 font-medium">{task.title}</div>
                  </td>
                  <td className="py-3 px-4">
                    <span className={`text-xs px-2 py-1 rounded font-medium ${getDifficultyColor(task.difficulty)}`}>
                      {task.difficulty}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <span className={`text-xs px-2 py-1 rounded font-medium ${getSystemColor(task.system)}`}>
                      {task.system}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-sm text-slate-600">{task.effort}</td>
                  <td className="py-3 px-4 text-sm text-slate-600">{task.priority}</td>
                  <td className="py-3 px-4 text-sm text-slate-600">{task.status}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
