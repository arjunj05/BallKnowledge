import type { PlayerId } from "shared";

interface PlayerAvatarProps {
  player: PlayerId;
  isYou: boolean;
  isConnected: boolean;
  size?: "sm" | "md" | "lg";
}

export function PlayerAvatar({ player, isYou, isConnected, size = "md" }: PlayerAvatarProps) {
  const sizeClasses = {
    sm: "w-12 h-12 text-lg",
    md: "w-16 h-16 text-2xl",
    lg: "w-24 h-24 text-4xl",
  };

  const getBgColor = () => {
    if (isYou) return "bg-gradient-to-b from-espn-red to-espn-darkRed";
    if (isConnected) return "bg-gradient-to-b from-score-green to-green-700";
    return "bg-gradient-to-b from-broadcast-600 to-broadcast-800";
  };

  const getLabel = () => {
    if (isYou) return "You";
    if (isConnected) return "Ready";
    return "Waiting...";
  };

  return (
    <div className="text-center">
      <div
        className={`
          ${sizeClasses[size]}
          rounded-lg flex items-center justify-center font-display font-bold
          ${getBgColor()}
          border-2 border-white/20
          shadow-broadcast
          relative overflow-hidden
        `}
      >
        {/* Diagonal stripes overlay */}
        <div className="absolute inset-0 bg-diagonal-stripes pointer-events-none" />
        <span className="relative z-10 text-white drop-shadow-lg">{player}</span>

        {/* Connected indicator */}
        {isConnected && !isYou && (
          <div className="absolute -top-1 -right-1 w-4 h-4 bg-score-green rounded-full border-2 border-broadcast-dark animate-pulse" />
        )}
      </div>
      <p className={`mt-2 text-sm font-sans uppercase tracking-wider ${isYou ? "text-espn-yellow" : isConnected ? "text-score-green" : "text-metal-steel"}`}>
        {getLabel()}
      </p>
    </div>
  );
}
