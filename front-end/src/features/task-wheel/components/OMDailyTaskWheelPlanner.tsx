import { useState } from 'react';
import { DaySelector } from './DaySelector';
import { CapacityRulesPanel } from './CapacityRulesPanel';
import { DailyTaskWheel } from './DailyTaskWheel';
import { AssignedTasksPanel } from './AssignedTasksPanel';
import { TaskPoolTable } from './TaskPoolTable';
import { AuditTrailPanel } from './AuditTrailPanel';
import { Calendar, RotateCcw } from 'lucide-react';
import { format } from 'date-fns';

export type Difficulty = 'Difficult' | 'Medium' | 'Easy';
export type TaskStatus = 'Ready' | 'In Progress' | 'Blocked' | 'Pending';
export type TaskSystem = 'OM' | 'OMAI' | 'OMStudio' | 'OM-Workshop' | 'Infra';
export type Priority = 'High' | 'Medium' | 'Low';

export interface Task {
  id: string;
  title: string;
  difficulty: Difficulty;
  system: TaskSystem;
  effort: string;
  priority: Priority;
  status: TaskStatus;
  dueDate?: string;
}

export interface DayCapacity {
  maxTasks: number;
  difficultCap: number;
  mediumCap: number;
  easyCap: number;
}

export interface DifficultyMix {
  difficult: number;
  medium: number;
  easy: number;
}

export interface AuditEntry {
  timestamp: Date;
  step: number;
  action: string;
  result: string;
  reasoning: string;
}

const DAY_CAPACITIES: Record<string, DayCapacity> = {
  Monday: { maxTasks: 12, difficultCap: 3, mediumCap: 7, easyCap: 2 },
  Tuesday: { maxTasks: 12, difficultCap: 3, mediumCap: 7, easyCap: 2 },
  Wednesday: { maxTasks: 12, difficultCap: 3, mediumCap: 7, easyCap: 2 },
  Thursday: { maxTasks: 12, difficultCap: 3, mediumCap: 7, easyCap: 2 },
  Friday: { maxTasks: 12, difficultCap: 3, mediumCap: 7, easyCap: 2 },
  Saturday: { maxTasks: 6, difficultCap: 1, mediumCap: 3, easyCap: 2 },
  Sunday: { maxTasks: 3, difficultCap: 0, mediumCap: 1, easyCap: 2 },
};

// Mock task pool
const MOCK_TASKS: Task[] = [
  { id: '1', title: 'Implement authentication service', difficulty: 'Difficult', system: 'OMAI', effort: '4h', priority: 'High', status: 'Ready' },
  { id: '2', title: 'Fix database migration scripts', difficulty: 'Difficult', system: 'Infra', effort: '3h', priority: 'High', status: 'Ready' },
  { id: '3', title: 'Optimize API query performance', difficulty: 'Difficult', system: 'OM', effort: '5h', priority: 'Medium', status: 'Ready' },
  { id: '4', title: 'Build user dashboard component', difficulty: 'Medium', system: 'OM-Workshop', effort: '2h', priority: 'High', status: 'Ready' },
  { id: '5', title: 'Refactor task management logic', difficulty: 'Medium', system: 'OM', effort: '3h', priority: 'Medium', status: 'Ready' },
  { id: '6', title: 'Add unit tests for task service', difficulty: 'Medium', system: 'OMAI', effort: '2h', priority: 'Medium', status: 'Ready' },
  { id: '7', title: 'Create API documentation', difficulty: 'Medium', system: 'OM', effort: '2h', priority: 'Low', status: 'Ready' },
  { id: '8', title: 'Update deployment scripts', difficulty: 'Medium', system: 'Infra', effort: '1h', priority: 'Medium', status: 'Ready' },
  { id: '9', title: 'Design new feature mockups', difficulty: 'Medium', system: 'OMStudio', effort: '3h', priority: 'High', status: 'Ready' },
  { id: '10', title: 'Review pull requests', difficulty: 'Easy', system: 'OM', effort: '1h', priority: 'Medium', status: 'Ready' },
  { id: '11', title: 'Update README documentation', difficulty: 'Easy', system: 'OM-Workshop', effort: '30m', priority: 'Low', status: 'Ready' },
  { id: '12', title: 'Fix UI button styling', difficulty: 'Easy', system: 'OMStudio', effort: '30m', priority: 'Low', status: 'Ready' },
  { id: '13', title: 'Architect microservices structure', difficulty: 'Difficult', system: 'OMAI', effort: '6h', priority: 'High', status: 'Ready' },
  { id: '14', title: 'Implement caching layer', difficulty: 'Medium', system: 'OM', effort: '3h', priority: 'High', status: 'Ready' },
  { id: '15', title: 'Configure monitoring alerts', difficulty: 'Medium', system: 'Infra', effort: '2h', priority: 'High', status: 'Ready' },
  { id: '16', title: 'Add form validation', difficulty: 'Easy', system: 'OM-Workshop', effort: '1h', priority: 'Medium', status: 'Ready' },
  { id: '17', title: 'Update package dependencies', difficulty: 'Easy', system: 'Infra', effort: '30m', priority: 'Low', status: 'Ready' },
  { id: '18', title: 'Write integration tests', difficulty: 'Medium', system: 'OMAI', effort: '3h', priority: 'Medium', status: 'Ready' },
];

export function OMDailyTaskWheelPlanner() {
  const [selectedDay, setSelectedDay] = useState<string>('Monday');
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);
  const [taskCount, setTaskCount] = useState<number | null>(null);
  const [difficultyMix, setDifficultyMix] = useState<DifficultyMix | null>(null);
  const [assignedTasks, setAssignedTasks] = useState<Task[]>([]);
  const [auditTrail, setAuditTrail] = useState<AuditEntry[]>([]);
  const [isSpinning, setIsSpinning] = useState(false);

  const capacity = DAY_CAPACITIES[selectedDay];
  const availableTasks = MOCK_TASKS.filter(task => !assignedTasks.find(at => at.id === task.id));

  const handleDayChange = (day: string) => {
    setSelectedDay(day);
    handleReset();
  };

  const handleReset = () => {
    setCurrentStep(1);
    setTaskCount(null);
    setDifficultyMix(null);
    setAssignedTasks([]);
    setAuditTrail([]);
  };

  const handleTaskCountSpin = (count: number) => {
    setTaskCount(count);
    setCurrentStep(2);
    
    const entry: AuditEntry = {
      timestamp: new Date(),
      step: 1,
      action: 'Spin for Task Count',
      result: `${count} tasks`,
      reasoning: `Selected ${count} tasks for ${selectedDay} (max: ${capacity.maxTasks})`,
    };
    setAuditTrail(prev => [...prev, entry]);
  };

  const handleDifficultyMixSpin = (mix: DifficultyMix) => {
    setDifficultyMix(mix);
    setCurrentStep(3);
    
    const entry: AuditEntry = {
      timestamp: new Date(),
      step: 2,
      action: 'Spin for Difficulty Mix',
      result: `${mix.difficult} Difficult, ${mix.medium} Medium, ${mix.easy} Easy`,
      reasoning: `Mix within capacity caps: ${capacity.difficultCap} Difficult, ${capacity.mediumCap} Medium, ${capacity.easyCap} Easy`,
    };
    setAuditTrail(prev => [...prev, entry]);
  };

  const handleTaskAssignment = (tasks: Task[]) => {
    setAssignedTasks(tasks);
    
    const difficultCount = tasks.filter(t => t.difficulty === 'Difficult').length;
    const mediumCount = tasks.filter(t => t.difficulty === 'Medium').length;
    const easyCount = tasks.filter(t => t.difficulty === 'Easy').length;
    
    const entry: AuditEntry = {
      timestamp: new Date(),
      step: 3,
      action: 'Assign Tasks',
      result: `${tasks.length} tasks assigned`,
      reasoning: `Assigned from eligible pool with priority High/Medium and status Ready. Distribution: ${difficultCount} Difficult, ${mediumCount} Medium, ${easyCount} Easy`,
    };
    setAuditTrail(prev => [...prev, entry]);
  };

  const getModeType = () => {
    if (['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'].includes(selectedDay)) return 'Weekday';
    if (selectedDay === 'Saturday') return 'Saturday';
    return 'Sunday';
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-[1600px] mx-auto px-6 py-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-slate-900 mb-1">Daily Task Wheel</h1>
              <p className="text-sm text-slate-600">
                Generate today's workload based on capacity and difficulty limits
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <Calendar className="w-4 h-4" />
                <span>{format(new Date(), 'EEEE, MMMM d, yyyy')}</span>
              </div>
              <div className={`px-3 py-1.5 rounded-full text-xs font-medium ${
                getModeType() === 'Weekday' 
                  ? 'bg-blue-100 text-blue-700'
                  : getModeType() === 'Saturday'
                  ? 'bg-amber-100 text-amber-700'
                  : 'bg-green-100 text-green-700'
              }`}>
                {getModeType()}
              </div>
            </div>
          </div>
          <DaySelector selectedDay={selectedDay} onDayChange={handleDayChange} />
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-[1600px] mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Panel - Rules & Capacity */}
          <div className="lg:col-span-3">
            <CapacityRulesPanel
              selectedDay={selectedDay}
              capacity={capacity}
              assignedTasks={assignedTasks}
            />
          </div>

          {/* Center Panel - Wheel */}
          <div className="lg:col-span-6">
            <DailyTaskWheel
              currentStep={currentStep}
              capacity={capacity}
              selectedDay={selectedDay}
              assignedTaskCount={assignedTasks.length}
              taskCount={taskCount}
              difficultyMix={difficultyMix}
              availableTasks={availableTasks}
              isSpinning={isSpinning}
              setIsSpinning={setIsSpinning}
              onTaskCountSpin={handleTaskCountSpin}
              onDifficultyMixSpin={handleDifficultyMixSpin}
              onTaskAssignment={handleTaskAssignment}
            />

            <div className="mt-6">
              <button
                onClick={handleReset}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
              >
                <RotateCcw className="w-4 h-4" />
                Reset Plan
              </button>
            </div>

            {/* Audit Trail */}
            <div className="mt-6">
              <AuditTrailPanel auditTrail={auditTrail} />
            </div>
          </div>

          {/* Right Panel - Assigned Tasks */}
          <div className="lg:col-span-3">
            <AssignedTasksPanel
              assignedTasks={assignedTasks}
              capacity={capacity}
            />
          </div>
        </div>

        {/* Bottom Section - Task Pool */}
        <div className="mt-8">
          <TaskPoolTable
            availableTasks={availableTasks}
            difficultyMix={difficultyMix}
          />
        </div>
      </main>
    </div>
  );
}
