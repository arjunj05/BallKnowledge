import { useEffect, useState } from "react";

interface NotificationProps {
  message: string;
  onDismiss: () => void;
}

export function Notification({ message, onDismiss }: NotificationProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onDismiss, 300);
    }, 3000); // Increased to 3 seconds for better visibility

    return () => clearTimeout(timer);
  }, [onDismiss]);

  return (
    <div
      className={`fixed top-24 left-1/2 transform -translate-x-1/2 z-50 transition-all duration-300 ${
        isVisible ? "opacity-100 translate-y-0 scale-100" : "opacity-0 -translate-y-4 scale-95"
      }`}
    >
      <div className="relative">
        {/* Glow effect */}
        <div className="absolute inset-0 bg-espn-yellow/30 blur-xl rounded-lg" />

        {/* Main notification */}
        <div className="relative lower-third px-8 py-4 rounded-lg shadow-[0_0_30px_rgba(204,0,0,0.5)] animate-slide-in-down">
          <div className="font-display text-xl uppercase tracking-wide text-white text-center">
            {message}
          </div>
        </div>
      </div>
    </div>
  );
}
