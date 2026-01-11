import type { PlayerId } from "shared";
import * as Shared from "shared/dist";
const { GAME_CONFIG } = Shared;
import { GameHeader } from "../components/GameHeader";
import { Timer } from "../components/Timer";

interface CategoryScreenProps {
  playerId: PlayerId | null;
  balances: Record<PlayerId, number>;
  questionIndex: number;
  pot: number;
  category: string;
  timeRemaining: number | null;
  opponentAlias?: string;
  opponentElo?: number;
}

export function CategoryScreen({
  playerId,
  balances,
  questionIndex,
  pot,
  category,
  timeRemaining,
  opponentAlias,
  opponentElo,
}: CategoryScreenProps) {
  return (
    <div className="min-h-screen bg-broadcast-dark text-white flex flex-col">
      <GameHeader playerId={playerId} balances={balances} questionIndex={questionIndex} pot={pot} opponentAlias={opponentAlias} opponentElo={opponentElo} />

      <div className="flex-1 flex flex-col items-center justify-center p-4 relative">
        {/* Background pattern */}
        <div className="absolute inset-0 bg-diagonal-stripes opacity-10 pointer-events-none" />

        <div className="relative z-10 text-center">
          {/* Question indicator */}
          <div className="inline-block mb-6 animate-slide-in-down">
            <div className="lower-third px-6 py-2">
              <span className="font-sans text-sm uppercase tracking-widest">
                Question {questionIndex + 1} of {GAME_CONFIG.questionsPerMatch}
              </span>
            </div>
          </div>

          {/* Category display - Lower third style */}
          <div className="animate-slide-in-right">
            <div className="broadcast-card rounded-lg overflow-hidden max-w-2xl mx-auto">
              {/* Category label bar */}
              <div className="bg-gradient-to-r from-espn-red to-espn-darkRed px-6 py-2">
                <span className="font-sans text-sm uppercase tracking-widest text-white/80">
                  Category
                </span>
              </div>

              {/* Category name */}
              <div className="px-8 py-8">
                <h2 className="font-display text-4xl md:text-5xl uppercase tracking-wide text-espn-yellow">
                  {category}
                </h2>
              </div>

              {/* Bottom accent */}
              <div className="h-1 bg-gradient-to-r from-transparent via-espn-yellow to-transparent" />
            </div>
          </div>

          {/* Timer */}
          <div className="mt-8 animate-slide-in-up">
            <Timer timeRemaining={timeRemaining} label="Betting starts in" />
          </div>
        </div>
      </div>
    </div>
  );
}
