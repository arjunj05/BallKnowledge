import type { PlayerId } from "shared";

interface CompleteScreenProps {
  playerId: PlayerId | null;
  winner: "P1" | "P2" | "TIE" | null;
  balances: Record<PlayerId, number>;
  finalBalances: Record<PlayerId, number> | null;
  opponentAlias?: string;
}

export function CompleteScreen({ playerId, winner, balances, finalBalances, opponentAlias }: CompleteScreenProps) {
  const isWinner =
    (winner === "P1" && playerId === "P1") ||
    (winner === "P2" && playerId === "P2");
  const isTie = winner === "TIE";

  const getOutcomeGradient = () => {
    if (isWinner) return "from-score-green via-green-600 to-score-green";
    if (isTie) return "from-espn-yellow via-yellow-500 to-espn-yellow";
    return "from-espn-red via-red-600 to-espn-red";
  };

  const getOutcomeText = () => {
    if (isWinner) return "Victory!";
    if (isTie) return "Tie Game";
    return "Defeat";
  };

  return (
    <div className="min-h-screen bg-broadcast-dark text-white flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Animated background */}
      <div className="absolute inset-0 bg-diagonal-stripes opacity-20 pointer-events-none" />

      {/* Top accent bar */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-espn-red via-espn-yellow to-espn-red" />

      <div className="relative z-10 w-full max-w-lg">
        {/* Final score graphic - like end of game broadcast */}
        <div className="broadcast-card rounded-lg overflow-hidden animate-scale-in">
          {/* Victory/Defeat banner */}
          <div className={`bg-gradient-to-r ${getOutcomeGradient()} px-8 py-6 text-center relative overflow-hidden`}>
            {/* Shine effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-[shine_3s_ease-in-out_infinite]" />

            <div className="relative z-10">
              <div className="font-sans text-sm uppercase tracking-widest text-white/80 mb-2">
                Final Result
              </div>
              <div className="font-display text-5xl md:text-6xl uppercase tracking-wider drop-shadow-lg animate-score-pop">
                {getOutcomeText()}
              </div>
            </div>
          </div>

          <div className="p-6">
            {/* Final Scores header */}
            <div className="text-center mb-6">
              <div className="lower-third inline-block px-6 py-2">
                <span className="font-sans text-sm uppercase tracking-widest">Final Scores</span>
              </div>
            </div>

            {/* Score comparison - like sports final score graphic */}
            <div className="grid grid-cols-2 gap-4 mb-8">
              {/* P1 Score */}
              <div className={`
                relative overflow-hidden rounded-lg
                ${playerId === "P1" ? "ring-2 ring-espn-yellow" : ""}
              `}>
                <div className="absolute inset-0 bg-diagonal-stripes pointer-events-none" />
                <div className={`
                  relative z-10 p-6 text-center
                  ${playerId === "P1"
                    ? "bg-gradient-to-b from-espn-red/30 to-broadcast-800"
                    : "bg-gradient-to-b from-broadcast-700 to-broadcast-800"
                  }
                `}>
                  <div className="font-sans text-sm uppercase tracking-widest text-metal-silver mb-3">
                    {playerId === "P1" ? "You" : opponentAlias || "Opponent"}
                  </div>
                  <div className="font-score text-5xl font-bold text-white animate-score-pop">
                    {finalBalances?.P1 || balances.P1}
                  </div>
                  {playerId === "P1" && (
                    <div className="mt-2 inline-block live-badge px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wider">
                      You
                    </div>
                  )}
                </div>
              </div>

              {/* P2 Score */}
              <div className={`
                relative overflow-hidden rounded-lg
                ${playerId === "P2" ? "ring-2 ring-espn-yellow" : ""}
              `}>
                <div className="absolute inset-0 bg-diagonal-stripes pointer-events-none" />
                <div className={`
                  relative z-10 p-6 text-center
                  ${playerId === "P2"
                    ? "bg-gradient-to-b from-espn-red/30 to-broadcast-800"
                    : "bg-gradient-to-b from-broadcast-700 to-broadcast-800"
                  }
                `}>
                  <div className="font-sans text-sm uppercase tracking-widest text-metal-silver mb-3">
                    {playerId === "P2" ? "You" : opponentAlias || "Opponent"}
                  </div>
                  <div className="font-score text-5xl font-bold text-white animate-score-pop delay-200">
                    {finalBalances?.P2 || balances.P2}
                  </div>
                  {playerId === "P2" && (
                    <div className="mt-2 inline-block live-badge px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wider">
                      You
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Play Again button */}
            <button
              onClick={() => window.location.reload()}
              className="w-full btn-espn py-4 rounded text-xl"
            >
              Play Again
            </button>
          </div>

          {/* Bottom swoosh */}
          <div className="swoosh-line" />
        </div>
      </div>

      {/* Bottom accent */}
      <div className="absolute bottom-0 left-0 right-0 swoosh-line" />
    </div>
  );
}
