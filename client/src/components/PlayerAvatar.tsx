import type { PlayerId } from "shared";

interface PlayerAvatarProps {
  player: PlayerId;
  isYou: boolean;
  isConnected: boolean;
}

export function PlayerAvatar({ player, isYou, isConnected }: PlayerAvatarProps) {
  const getBgColor = () => {
    if (isYou) return "bg-blue-600";
    if (isConnected) return "bg-green-600";
    return "bg-gray-700";
  };

  const getLabel = () => {
    if (isYou) return "You";
    if (isConnected) return "Ready";
    return "Waiting...";
  };

  return (
    <div className="text-center">
      <div
        className={`w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold ${getBgColor()}`}
      >
        {player}
      </div>
      <p className="mt-2 text-sm text-gray-400">{getLabel()}</p>
    </div>
  );
}
