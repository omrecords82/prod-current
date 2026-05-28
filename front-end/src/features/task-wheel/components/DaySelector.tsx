interface DaySelectorProps {
  selectedDay: string;
  onDayChange: (day: string) => void;
}

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export function DaySelector({ selectedDay, onDayChange }: DaySelectorProps) {
  return (
    <div className="flex gap-2 flex-wrap">
      {DAYS.map(day => (
        <button
          key={day}
          onClick={() => onDayChange(day)}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            selectedDay === day
              ? 'bg-slate-900 text-white shadow-md'
              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
          }`}
        >
          {day.slice(0, 3)}
        </button>
      ))}
    </div>
  );
}
