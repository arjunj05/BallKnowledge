interface TimerProps {
  timeRemaining: number | null;
  label?: string;
}

export function Timer({ timeRemaining, label = "Time remaining" }: TimerProps) {
  if (timeRemaining === null) return null;

  return (
    <p className="text-center text-gray-400">
      {label}: {timeRemaining}s
    </p>
  );
}
