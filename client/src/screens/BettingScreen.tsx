import type { PlayerId, BetAction } from "shared";
import { GameHeader } from "../components/GameHeader";
import { Timer } from "../components/Timer";

interface BettingScreenProps {
  playerId: PlayerId | null;
  balances: Record<PlayerId, number>;
  questionIndex: number;
  pot: number;
  category: string;
  awaitingAction: PlayerId | null;
  availableActions: BetAction[];
  betOptions: number[];
  currentBet: number | null;
  foldsRemaining: Record<PlayerId, number>;
  timeRemaining: number | null;
  opponentAlias?: string;
  opponentElo?: number;
  onBet: (amount: number) => void;
  onMatch: () => void;
  onRaise: (amount: number) => void;
  onFold: () => void;
}

export function BettingScreen({
  playerId,
  balances,
  questionIndex,
  pot,
  category,
  awaitingAction,
  availableActions,
  betOptions,
  currentBet,
  foldsRemaining,
  timeRemaining,
  opponentAlias,
  opponentElo,
  onBet,
  onMatch,
  onRaise,
  onFold,
}: BettingScreenProps) {
  const isMyTurn = awaitingAction === playerId;
  const canFold = availableActions.includes("FOLD");
  const canBet = availableActions.includes("BET");
  const canMatch = availableActions.includes("MATCH");
  const canRaise = availableActions.includes("RAISE");

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col">
      <GameHeader playerId={playerId} balances={balances} questionIndex={questionIndex} pot={pot} opponentAlias={opponentAlias} opponentElo={opponentElo} />
      <div className="flex-1 flex flex-col items-center justify-center p-4">
        <div className="bg-gray-800 rounded-xl p-6 w-full max-w-md">
          <div className="text-center mb-6">
            <p className="text-gray-400 mb-2">{category}</p>
            {isMyTurn ? (
              <p className="text-xl font-bold text-green-400">Your turn to bet!</p>
            ) : (
              <p className="text-xl text-gray-300">
                Waiting for {awaitingAction === "P1" ? (playerId === "P1" ? "you" : "opponent") : (playerId === "P2" ? "you" : "opponent")}...
              </p>
            )}
            {currentBet && (
              <p className="mt-2 text-yellow-400">Current bet: {currentBet}</p>
            )}
          </div>

          {isMyTurn && (
            <div className="space-y-4">
              {canBet && (
                <div>
                  <p className="text-sm text-gray-400 mb-2">Place your bet:</p>
                  <div className="grid grid-cols-5 gap-2">
                    {betOptions.map((amount) => (
                      <button
                        key={amount}
                        onClick={() => onBet(amount)}
                        className="bg-blue-600 hover:bg-blue-700 py-2 rounded-lg font-bold transition-colors"
                      >
                        {amount}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {canMatch && currentBet && (
                <button
                  onClick={onMatch}
                  className="w-full bg-green-600 hover:bg-green-700 py-3 rounded-lg font-bold transition-colors"
                >
                  Match ({currentBet})
                </button>
              )}

              {canRaise && (
                <div>
                  <p className="text-sm text-gray-400 mb-2">Or raise to:</p>
                  <div className="grid grid-cols-5 gap-2">
                    {betOptions
                      .filter((a) => a > (currentBet || 0))
                      .map((amount) => (
                        <button
                          key={amount}
                          onClick={() => onRaise(amount)}
                          className="bg-yellow-600 hover:bg-yellow-700 py-2 rounded-lg font-bold transition-colors"
                        >
                          {amount}
                        </button>
                      ))}
                  </div>
                </div>
              )}

              {canFold && (
                <button
                  onClick={onFold}
                  className="w-full bg-red-600 hover:bg-red-700 py-3 rounded-lg font-bold transition-colors mt-4"
                >
                  Fold ({foldsRemaining[playerId!]} left)
                </button>
              )}
            </div>
          )}

          <div className="mt-4">
            <Timer timeRemaining={timeRemaining} />
          </div>
        </div>
      </div>
    </div>
  );
}
