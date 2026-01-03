import type { PlayerId } from "shared";

interface CompleteScreenProps {
  playerId: PlayerId | null;
  winner: "P1" | "P2" | "TIE" | null;
  balances: Record<PlayerId, number>;
  finalBalances: Record<PlayerId, number> | null;
}

export function CompleteScreen({ playerId, winner, balances, finalBalances }: CompleteScreenProps) {
  const isWinner =
    (winner === "P1" && playerId === "P1") ||
    (winner === "P2" && playerId === "P2");
  const isTie = winner === "TIE";

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center p-4">
      <div className="bg-gray-800 rounded-xl p-8 w-full max-w-md text-center">
        <div
          className={`text-5xl font-bold mb-4 ${
            isWinner ? "text-green-400" : isTie ? "text-yellow-400" : "text-red-400"
          }`}
        >
          {isWinner ? "Victory!" : isTie ? "Tie Game" : "Defeat"}
        </div>

        <div className="text-gray-400 mb-6">Final Scores</div>

        <div className="grid grid-cols-2 gap-4 mb-8">
          <div
            className={`rounded-lg p-6 ${
              playerId === "P1" ? "bg-blue-900/50" : "bg-gray-700"
            }`}
          >
            <div className="text-sm text-gray-400 mb-2">
              {playerId === "P1" ? "You" : "Opponent"}
            </div>
            <div className="text-4xl font-bold">
              {finalBalances?.P1 || balances.P1}
            </div>
          </div>
          <div
            className={`rounded-lg p-6 ${
              playerId === "P2" ? "bg-blue-900/50" : "bg-gray-700"
            }`}
          >
            <div className="text-sm text-gray-400 mb-2">
              {playerId === "P2" ? "You" : "Opponent"}
            </div>
            <div className="text-4xl font-bold">
              {finalBalances?.P2 || balances.P2}
            </div>
          </div>
        </div>

        <button
          onClick={() => window.location.reload()}
          className="w-full bg-blue-600 hover:bg-blue-700 py-3 rounded-lg font-bold transition-colors"
        >
          Play Again
        </button>
      </div>
    </div>
  );
}
