import type { PlayerId } from "shared";
import { GameHeader } from "../components/GameHeader";
import { Timer } from "../components/Timer";

interface ClueScreenProps {
  playerId: PlayerId | null;
  balances: Record<PlayerId, number>;
  questionIndex: number;
  pot: number;
  category: string;
  clue: string;
  revealIndex: number;
  timeRemaining: number | null;
  opponentAlias?: string;
  opponentElo?: number;
  onBuzz: () => void;
}

export function ClueScreen({
  playerId,
  balances,
  questionIndex,
  pot,
  category,
  clue,
  revealIndex,
  timeRemaining,
  opponentAlias,
  opponentElo,
  onBuzz,
}: ClueScreenProps) {
  const revealedClue = clue.substring(0, revealIndex);
  const isClueComplete = revealIndex >= clue.length;

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col">
      <GameHeader playerId={playerId} balances={balances} questionIndex={questionIndex} pot={pot} opponentAlias={opponentAlias} opponentElo={opponentElo} />
      <div className="flex-1 flex flex-col items-center justify-center p-4">
        <div className="bg-gray-800 rounded-xl p-6 w-full max-w-2xl">
          <p className="text-sm text-gray-400 mb-2 text-center">{category}</p>
          <div className="min-h-[120px] text-xl leading-relaxed mb-6 font-mono">
            {revealedClue}
            {!isClueComplete && <span className="animate-pulse">|</span>}
          </div>

          <button
            onClick={onBuzz}
            className="w-full bg-red-600 hover:bg-red-700 py-4 rounded-xl text-2xl font-bold transition-colors animate-pulse"
          >
            BUZZ!
          </button>

          {isClueComplete && <Timer timeRemaining={timeRemaining} label="Time to buzz" />}
        </div>
      </div>
    </div>
  );
}
