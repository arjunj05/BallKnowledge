import { useEffect, useRef } from "react";
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
  hasBuzzed: boolean;
  opponentWasWrong: boolean;
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
  hasBuzzed,
  opponentWasWrong,
  onBuzz,
}: ClueScreenProps) {
  const revealedClue = clue.substring(0, revealIndex);
  const isClueComplete = revealIndex >= clue.length;
  const clueRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom as clue reveals (for mobile when text overflows)
  useEffect(() => {
    if (clueRef.current) {
      clueRef.current.scrollTop = clueRef.current.scrollHeight;
    }
  }, [revealIndex]);

  return (
    <div className="min-h-screen bg-broadcast-dark text-white flex flex-col">
      <GameHeader playerId={playerId} balances={balances} questionIndex={questionIndex} pot={pot} opponentAlias={opponentAlias} opponentElo={opponentElo} />

      <div className="flex-1 flex flex-col items-center justify-center p-4 relative">
        {/* Background */}
        <div className="absolute inset-0 bg-diagonal-stripes opacity-10 pointer-events-none" />

        <div className={`broadcast-card rounded-lg w-full max-w-2xl relative z-10 overflow-hidden animate-slide-in-up ${opponentWasWrong ? 'animate-wrong-answer' : ''}`}>
          {/* Category header */}
          <div className="bg-gradient-to-r from-espn-red to-espn-darkRed px-6 py-3 flex items-center justify-between">
            <span className="font-sans text-sm uppercase tracking-widest text-white/80">{category}</span>
            <div className="live-badge px-3 py-1 rounded text-xs font-bold uppercase tracking-wider">
              Live
            </div>
          </div>

          {/* Clue display */}
          <div className="p-6">
            <div
              ref={clueRef}
              className="min-h-[140px] max-h-[40vh] overflow-y-auto text-xl leading-relaxed mb-6 font-mono text-white bg-broadcast-900 rounded-lg p-4 border border-white/10"
            >
              {revealedClue}
              {!isClueComplete && (
                <span className="inline-block w-2 h-5 bg-espn-yellow ml-1 animate-pulse" />
              )}
            </div>

            {/* Massive BUZZ button */}
            <button
              onClick={onBuzz}
              disabled={hasBuzzed}
              className={`
                w-full py-6 rounded-lg text-3xl font-display uppercase tracking-wider
                transition-all relative overflow-hidden
                ${hasBuzzed
                  ? "bg-gradient-to-b from-gray-600 to-gray-700 shadow-[0_4px_0_#333] cursor-not-allowed opacity-60"
                  : `bg-gradient-to-b from-live to-espn-darkRed
                     hover:from-red-500 hover:to-espn-red
                     shadow-[0_6px_0_#660000,0_8px_30px_rgba(255,0,0,0.4)]
                     hover:shadow-[0_8px_0_#660000,0_10px_40px_rgba(255,0,0,0.5)]
                     active:shadow-[0_2px_0_#660000,0_4px_20px_rgba(255,0,0,0.3)]
                     active:translate-y-1
                     animate-pulse`
                }
              `}
            >
              {/* Shine effect - only when not buzzed */}
              {!hasBuzzed && (
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full animate-[shine_2s_ease-in-out_infinite]" />
              )}
              <span className="relative z-10 drop-shadow-lg">
                {hasBuzzed ? "BUZZED" : "BUZZ!"}
              </span>
            </button>

            {isClueComplete && (
              <div className="mt-4">
                <Timer timeRemaining={timeRemaining} label="Time to buzz" urgent />
              </div>
            )}
          </div>

          {/* Bottom accent */}
          <div className="swoosh-line" />
        </div>
      </div>
    </div>
  );
}
