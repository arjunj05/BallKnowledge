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
  playerContribution: number;
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
  playerContribution,
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
    <div className="min-h-screen bg-broadcast-dark text-white flex flex-col">
      <GameHeader playerId={playerId} balances={balances} questionIndex={questionIndex} pot={pot} opponentAlias={opponentAlias} opponentElo={opponentElo} />

      <div className="flex-1 flex flex-col items-center justify-center p-4 relative">
        {/* Background */}
        <div className="absolute inset-0 bg-diagonal-stripes opacity-10 pointer-events-none" />

        <div className="broadcast-card rounded-lg w-full max-w-lg relative z-10 overflow-hidden animate-scale-in">
          {/* Category header bar */}
          <div className="bg-gradient-to-r from-espn-red to-espn-darkRed px-6 py-3 flex items-center justify-between">
            <span className="font-sans text-sm uppercase tracking-widest text-white/80">{category}</span>
            {currentBet && (
              <div className="flex items-center gap-2">
                <span className="text-xs uppercase text-white/60">Current Bet</span>
                <span className="font-score text-xl font-bold text-espn-yellow">{currentBet}</span>
              </div>
            )}
          </div>

          <div className="p-6">
            {/* Turn indicator */}
            <div className="text-center mb-6">
              {isMyTurn ? (
                <div className="inline-block">
                  <div className="live-badge px-4 py-2 rounded animate-pulse-live">
                    <span className="font-display text-xl uppercase tracking-wider">Your Turn</span>
                  </div>
                </div>
              ) : (
                <div className="font-sans text-lg uppercase tracking-wide text-metal-silver">
                  Waiting for {awaitingAction === "P1" ? (playerId === "P1" ? "you" : opponentAlias || "opponent") : (playerId === "P2" ? "you" : opponentAlias || "opponent")}...
                </div>
              )}
            </div>

            {isMyTurn && (
              <div className="space-y-5">
                {/* Bet options */}
                {canBet && (
                  <div>
                    <p className="font-sans text-sm uppercase tracking-widest text-metal-silver mb-3">Place Bet</p>
                    <div className="grid grid-cols-5 gap-2">
                      {betOptions.map((amount) => {
                        const playerBalance = playerId ? balances[playerId] : 0;
                        const isAllIn = amount === playerBalance;
                        return (
                          <button
                            key={amount}
                            onClick={() => onBet(amount)}
                            className={`
                              py-3 rounded font-score font-bold text-lg transition-all
                              ${isAllIn
                                ? "bg-gradient-to-b from-espn-orange to-orange-700 ring-2 ring-espn-yellow shadow-glow-red"
                                : "bg-gradient-to-b from-score-blue to-blue-700 hover:from-blue-500 hover:to-blue-600"
                              }
                            `}
                          >
                            <div>{amount}</div>
                            {isAllIn && <div className="text-[10px] uppercase tracking-wider">All-In</div>}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Match button */}
                {canMatch && currentBet && (
                  <button
                    onClick={onMatch}
                    className="w-full bg-gradient-to-b from-score-green to-green-700 hover:from-green-500 hover:to-green-600 py-4 rounded font-sans text-xl font-bold uppercase tracking-wide transition-all shadow-broadcast"
                  >
                    {(() => {
                      const amountToMatch = currentBet - playerContribution;
                      const playerBalance = playerId ? balances[playerId] : 0;
                      const canAffordFullMatch = playerBalance >= amountToMatch;
                      return canAffordFullMatch
                        ? `Match (${amountToMatch})`
                        : `All-In Match (${playerBalance})`;
                    })()}
                  </button>
                )}

                {/* Raise options */}
                {canRaise && (
                  <div>
                    <p className="font-sans text-sm uppercase tracking-widest text-metal-silver mb-3">Or Raise To</p>
                    <div className="grid grid-cols-5 gap-2">
                      {betOptions
                        .filter((a) => a > (currentBet || 0))
                        .map((amount) => {
                          const playerBalance = playerId ? balances[playerId] : 0;
                          const isAllIn = amount === playerBalance;
                          return (
                            <button
                              key={amount}
                              onClick={() => onRaise(amount)}
                              className={`
                                py-3 rounded font-score font-bold text-lg transition-all
                                ${isAllIn
                                  ? "bg-gradient-to-b from-espn-orange to-orange-700 ring-2 ring-espn-yellow shadow-glow-red"
                                  : "bg-gradient-to-b from-espn-yellow to-yellow-600 hover:from-yellow-400 hover:to-yellow-500 text-broadcast-dark"
                                }
                              `}
                            >
                              <div>{amount}</div>
                              {isAllIn && <div className="text-[10px] uppercase tracking-wider">All-In</div>}
                            </button>
                          );
                        })}
                    </div>
                  </div>
                )}

                {/* Fold button */}
                {canFold && (
                  <button
                    onClick={onFold}
                    className="w-full btn-espn py-4 rounded text-xl mt-4"
                  >
                    Fold ({foldsRemaining[playerId!]} left)
                  </button>
                )}
              </div>
            )}

            <Timer timeRemaining={timeRemaining} />
          </div>

          {/* Bottom accent */}
          <div className="swoosh-line" />
        </div>
      </div>
    </div>
  );
}
