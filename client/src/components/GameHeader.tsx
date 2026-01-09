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
    <div className="bg-gray-800 p-4 flex justify-between items-center">
      <div className="text-center">
        <div className={`text-2xl font-bold ${playerId === "P1" ? "text-blue-400" : ""}`}>
          {balances.P1}
        </div>
        <div className="text-xs text-gray-400">
          {playerId === "P1" ? "You" : opponentAlias || "Opponent"}
        </div>
        {playerId === "P2" && opponentElo && (
          <div className="text-xs text-gray-500">ELO: {opponentElo}</div>
        )}
      </div>
      <div className="text-center">
        <div className="text-sm text-gray-400">Question {questionIndex + 1}/{GAME_CONFIG.questionsPerMatch}</div>
        <div
          className={`text-xl font-bold text-yellow-400 transition-all duration-300 ${
            isPotAnimating ? "scale-125 text-green-400" : "scale-100"
          }`}
        >
          Pot: {pot}
        </div>
      </div>
      <div className="text-center">
        <div className={`text-2xl font-bold ${playerId === "P2" ? "text-blue-400" : ""}`}>
          {balances.P2}
        </div>
        <div className="text-xs text-gray-400">
          {playerId === "P2" ? "You" : opponentAlias || "Opponent"}
        </div>
        {playerId === "P1" && opponentElo && (
          <div className="text-xs text-gray-500">ELO: {opponentElo}</div>
        )}
      </div>
    </div>
  );
}
