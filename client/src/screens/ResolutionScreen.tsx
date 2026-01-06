import type { PlayerId } from "shared";
import { GameHeader } from "../components/GameHeader";
import { Timer } from "../components/Timer";

interface ResolutionScreenProps {
  playerId: PlayerId | null;
  balances: Record<PlayerId, number>;
  questionIndex: number;
  pot: number;
  outcome: string;
  correctAnswer: string;
  P1Answer: string | null;
  P2Answer: string | null;
  balanceChanges: Record<PlayerId, number>;
  timeRemaining: number | null;
  opponentAlias?: string;
  opponentElo?: number;
}

export function ResolutionScreen({
  playerId,
  balances,
  questionIndex,
  pot,
  outcome,
  correctAnswer,
  P1Answer,
  P2Answer,
  balanceChanges,
  timeRemaining,
  opponentAlias,
  opponentElo,
}: ResolutionScreenProps) {
  const isWinner =
    (outcome === "P1_WIN" && playerId === "P1") ||
    (outcome === "P2_WIN" && playerId === "P2") ||
    (outcome === "P1_FOLD" && playerId === "P2") ||
    (outcome === "P2_FOLD" && playerId === "P1");
  const isDraw = outcome === "DRAW";
  const isFold = outcome.includes("FOLD");

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col">
      <GameHeader playerId={playerId} balances={balances} questionIndex={questionIndex} pot={pot} opponentAlias={opponentAlias} opponentElo={opponentElo} />
      <div className="flex-1 flex flex-col items-center justify-center p-4">
        <div className="bg-gray-800 rounded-xl p-8 w-full max-w-md text-center">
          <div
            className={`text-4xl font-bold mb-4 ${
              isWinner ? "text-green-400" : isDraw ? "text-gray-400" : "text-red-400"
            }`}
          >
            {isWinner ? "You Win!" : isDraw ? "Draw" : isFold ? "Fold" : "Wrong!"}
          </div>

          <div className="text-gray-400 mb-4">Correct answer:</div>
          <div className="text-2xl font-bold mb-6 text-blue-400">{correctAnswer}</div>

          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-gray-700 rounded-lg p-4">
              <div className="text-sm text-gray-400">{playerId === "P1" ? "You" : "Opponent"}</div>
              <div className="text-lg">{P1Answer || "(no answer)"}</div>
              <div
                className={`text-lg font-bold ${
                  balanceChanges.P1 > 0
                    ? "text-green-400"
                    : balanceChanges.P1 < 0
                    ? "text-red-400"
                    : "text-gray-400"
                }`}
              >
                {balanceChanges.P1 > 0 ? "+" : ""}
                {balanceChanges.P1}
              </div>
            </div>
            <div className="bg-gray-700 rounded-lg p-4">
              <div className="text-sm text-gray-400">{playerId === "P2" ? "You" : "Opponent"}</div>
              <div className="text-lg">{P2Answer || "(no answer)"}</div>
              <div
                className={`text-lg font-bold ${
                  balanceChanges.P2 > 0
                    ? "text-green-400"
                    : balanceChanges.P2 < 0
                    ? "text-red-400"
                    : "text-gray-400"
                }`}
              >
                {balanceChanges.P2 > 0 ? "+" : ""}
                {balanceChanges.P2}
              </div>
            </div>
          </div>

          <Timer timeRemaining={timeRemaining} label="Next question in" />
        </div>
      </div>
    </div>
  );
}
