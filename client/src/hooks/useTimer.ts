import { useEffect, useState } from "react";

export function useTimer(deadline: number | null): number | null {
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);

  useEffect(() => {
    if (!deadline) {
      setTimeRemaining(null);
      return;
    }

    const updateTimer = () => {
      const remaining = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
      setTimeRemaining(remaining);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 100);
    return () => clearInterval(interval);
  }, [deadline]);

  return timeRemaining;
}
