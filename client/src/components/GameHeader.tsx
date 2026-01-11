import { useEffect, useRef, useState } from "react";
import type { PlayerId } from "shared";
import * as Shared from "shared/dist";
const { GAME_CONFIG } = Shared;

interface GameHeaderProps {
  playerId: PlayerId | null;
  balances: Record<PlayerId, number>;
  questionIndex: number;
  pot: number;
  opponentAlias?: string;
  opponentElo?: number;
}

export function GameHeader({ playerId, balances, questionIndex, pot, opponentAlias, opponentElo }: GameHeaderProps) {
  const [isPotAnimating, setIsPotAnimating] = useState(false);
  const prevPotRef = useRef(pot);

  useEffect(() => {
    if (pot > prevPotRef.current) {
      setIsPotAnimating(true);
      const timer = setTimeout(() => setIsPotAnimating(false), 600);
      prevPotRef.current = pot;
      return () => clearTimeout(timer);
    }
    prevPotRef.current = pot;
  }, [pot]);

  return (
    <div className="score-panel">
      {/* Top accent bar */}
      <div className="h-1 bg-gradient-to-r from-espn-red via-espn-yellow to-espn-red" />

      <div className="px-4 py-3 flex justify-between items-center">
        {/* P1 Score Box */}
        <div className="flex items-center gap-3">
          <div className={`
            score-display px-4 py-2 rounded
            ${playerId === "P1" ? "ring-2 ring-espn-yellow" : ""}
          `}>
            <div className="font-score text-3xl font-bold text-white">
              {balances.P1}
            </div>
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

        {/* Center - Question & Pot */}
        <div className="text-center">
          <div className="flex items-center justify-center gap-2 mb-1">
            <div className="live-badge px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wider">
              Live
            </div>
            <span className="text-metal-silver text-xs font-sans uppercase tracking-wider">
              Q{questionIndex + 1}/{GAME_CONFIG.questionsPerMatch}
            </span>
          </div>
          <div
            className={`
              font-score text-2xl font-bold transition-all duration-300
              ${isPotAnimating ? "scale-125 text-score-green animate-score-pop" : "text-espn-yellow"}
            `}
          >
            <span className="text-metal-silver text-sm mr-1">POT</span>
            {pot}
          </div>
        </div>

        {/* P2 Score Box */}
        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className={`font-sans text-sm uppercase tracking-wide ${playerId === "P2" ? "text-espn-yellow" : "text-metal-silver"}`}>
              {playerId === "P2" ? "You" : opponentAlias || "Opponent"}
            </div>
            {playerId === "P1" && opponentElo && (
              <div className="text-xs text-metal-steel font-mono">{opponentElo} ELO</div>
            )}
          </div>
          <div className={`
            score-display px-4 py-2 rounded
            ${playerId === "P2" ? "ring-2 ring-espn-yellow" : ""}
          `}>
            <div className="font-score text-3xl font-bold text-white">
              {balances.P2}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom swoosh accent */}
      <div className="swoosh-line" />
    </div>
  );
}
