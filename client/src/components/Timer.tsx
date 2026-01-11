interface TimerProps {
  timeRemaining: number | null;
  label?: string;
  urgent?: boolean;
}

export function Timer({ timeRemaining, label = "Time remaining", urgent }: TimerProps) {
  if (timeRemaining === null) return null;

  const isLow = timeRemaining <= 5;
  const isUrgent = urgent || isLow;

  return (
    <div className="flex items-center justify-center gap-3 mt-4">
      <span className="text-metal text-sm uppercase tracking-wider font-sans">
        {label}
      </span>
      <div
        className={`
          font-score text-2xl font-bold px-4 py-1 rounded
          score-display min-w-[80px] text-center
          ${isUrgent ? "text-live animate-pulse" : "text-espn-yellow"}
        `}
      >
        {timeRemaining}s
      </div>
      {isUrgent && (
        <div className="w-2 h-2 rounded-full bg-live animate-pulse-live" />
      )}
    </div>
  );
}
