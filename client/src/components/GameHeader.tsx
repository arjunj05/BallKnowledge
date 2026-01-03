import type { PlayerId } from "shared";

interface GameHeaderProps {
  playerId: PlayerId | null;
  balances: Record<PlayerId, number>;
  questionIndex: number;
  pot: number;
}

export function GameHeader({ playerId, balances, questionIndex, pot }: GameHeaderProps) {
  return (
    <div className="bg-gray-800 p-4 flex justify-between items-center">
      <div className="text-center">
        <div className={`text-2xl font-bold ${playerId === "P1" ? "text-blue-400" : ""}`}>
          {balances.P1}
        </div>
        <div className="text-xs text-gray-400">
          {playerId === "P1" ? "You" : "Opponent"}
        </div>
      </div>
      <div className="text-center">
        <div className="text-sm text-gray-400">Question {questionIndex + 1}/3</div>
        <div className="text-xl font-bold text-yellow-400">Pot: {pot}</div>
      </div>
      <div className="text-center">
        <div className={`text-2xl font-bold ${playerId === "P2" ? "text-blue-400" : ""}`}>
          {balances.P2}
        </div>
        <div className="text-xs text-gray-400">
          {playerId === "P2" ? "You" : "Opponent"}
        </div>
      </div>
    </div>
  );
}
