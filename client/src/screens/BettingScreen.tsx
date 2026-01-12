import { useEffect, useRef, useState } from "react";
import type { PlayerId, BetAction } from "shared";
import { Timer } from "../components/Timer";
import * as Shared from "shared/dist";
const { GAME_CONFIG } = Shared;

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

  // Track pot changes for animation
  const [isPotAnimating, setIsPotAnimating] = useState(false);
  const [potDelta, setPotDelta] = useState<number | null>(null);
  const prevPotRef = useRef(pot);

  useEffect(() => {
    if (pot > prevPotRef.current) {
      const delta = pot - prevPotRef.current;
      setPotDelta(delta);
      setIsPotAnimating(true);
      const timer = setTimeout(() => {
        setIsPotAnimating(false);
        setPotDelta(null);
      }, 1000);
      prevPotRef.current = pot;
      return () => clearTimeout(timer);
    }
    prevPotRef.current = pot;
  }, [pot]);

  return (
    <div className="min-h-screen bg-broadcast-dark text-white flex flex-col">
      {/* Simplified header - just balances, no pot (shown prominently below) */}
      <div className="score-panel">
        <div className="h-1 bg-gradient-to-r from-espn-red via-espn-yellow to-espn-red" />
        <div className="px-4 py-3 flex justify-between items-center">
          {/* P1 Balance */}
          <div className="flex items-center gap-3">
            <div className={`score-display px-4 py-2 rounded ${playerId === "P1" ? "ring-2 ring-espn-yellow" : ""}`}>
              <div className="font-score text-2xl font-bold text-white">{balances.P1}</div>
            </div>
            <div className="text-left">
              <div className={`font-sans text-sm uppercase tracking-wide ${playerId === "P1" ? "text-espn-yellow" : "text-metal-silver"}`}>
                {playerId === "P1" ? "You" : opponentAlias || "Opponent"}
              </div>
              {playerId === "P2" && opponentElo && (
                <div className="text-xs text-metal-steel font-mono">{opponentElo} ELO</div>
              )}
            </div>
          </div>

          {/* Center - Question indicator & Betting label */}
          <div className="text-center">
            <div className="live-badge px-3 py-1 rounded text-xs font-bold uppercase tracking-wider mb-1">
              Betting
            </div>
            <span className="text-metal-silver text-xs font-sans uppercase tracking-wider">
              Q{questionIndex + 1}/{GAME_CONFIG.questionsPerMatch}
            </span>
          </div>

          {/* P2 Balance */}
          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className={`font-sans text-sm uppercase tracking-wide ${playerId === "P2" ? "text-espn-yellow" : "text-metal-silver"}`}>
                {playerId === "P2" ? "You" : opponentAlias || "Opponent"}
              </div>
              {playerId === "P1" && opponentElo && (
                <div className="text-xs text-metal-steel font-mono">{opponentElo} ELO</div>
              )}
            </div>
            <div className={`score-display px-4 py-2 rounded ${playerId === "P2" ? "ring-2 ring-espn-yellow" : ""}`}>
              <div className="font-score text-2xl font-bold text-white">{balances.P2}</div>
            </div>
          </div>
        </div>
        <div className="swoosh-line" />
      </div>

      <div className="flex-1 flex flex-col items-center justify-center p-4 relative">
        {/* Background */}
        <div className="absolute inset-0 bg-diagonal-stripes opacity-10 pointer-events-none" />

        {/* Prominent Pot Display - THE main pot indicator */}
        <div className="relative z-10 mb-6 animate-slide-in-down">
          <div className={`
            relative px-12 py-5 rounded-lg text-center
            bg-gradient-to-b from-broadcast-700 to-broadcast-900
            border-2 ${isPotAnimating ? 'border-score-green' : 'border-espn-yellow/50'}
            shadow-[0_0_30px_rgba(255,204,0,0.3)]
            transition-all duration-300
            ${isPotAnimating ? 'scale-110 shadow-[0_0_50px_rgba(0,204,102,0.5)]' : 'scale-100'}
          `}>
            {/* Pot label */}
            <div className="font-sans text-sm uppercase tracking-[0.3em] text-metal-silver mb-1">
              Total Pot
            </div>

            {/* Pot amount */}
            <div className={`
              font-score text-6xl font-bold transition-all duration-300
              ${isPotAnimating ? 'text-score-green' : 'text-espn-yellow'}
            `}>
              {pot}
            </div>

            {/* Animated delta indicator */}
            {isPotAnimating && potDelta && (
              <div className="absolute -top-4 -right-4 animate-score-pop">
                <div className="bg-score-green text-white font-score font-bold text-xl px-3 py-1 rounded-lg shadow-glow-green">
                  +{potDelta}
                </div>
              </div>
            )}

            {/* Glow effect when animating */}
            {isPotAnimating && (
              <div className="absolute inset-0 rounded-lg bg-score-green/20 animate-pulse pointer-events-none" />
            )}
          </div>
        </div>

        <div className="broadcast-card rounded-lg w-full max-w-lg relative z-10 overflow-hidden animate-scale-in">
          {/* Category header bar - simplified, no redundant bet info */}
          <div className="bg-gradient-to-r from-espn-red to-espn-darkRed px-6 py-3">
            <span className="font-sans text-sm uppercase tracking-widest text-white">{category}</span>
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
