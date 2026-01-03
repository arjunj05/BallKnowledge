import type { PlayerId } from "shared";
import { GameHeader } from "../components/GameHeader";
import { Timer } from "../components/Timer";

interface CategoryScreenProps {
  playerId: PlayerId | null;
  balances: Record<PlayerId, number>;
  questionIndex: number;
  pot: number;
  category: string;
  timeRemaining: number | null;
}

export function CategoryScreen({
  playerId,
  balances,
  questionIndex,
  pot,
  category,
  timeRemaining,
}: CategoryScreenProps) {
  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col">
      <GameHeader playerId={playerId} balances={balances} questionIndex={questionIndex} pot={pot} />
      <div className="flex-1 flex flex-col items-center justify-center p-4">
        <p className="text-gray-400 mb-2">Question {questionIndex + 1} of 3</p>
        <div className="text-4xl font-bold mb-8 text-center px-4 py-6 bg-gray-800 rounded-xl">
          {category}
        </div>
        <Timer timeRemaining={timeRemaining} label="Betting starts in" />
      </div>
    </div>
  );
}
