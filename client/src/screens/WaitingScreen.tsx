import { useEffect, useState } from "react";
import type { PlayerId } from "shared";
import { PlayerAvatar } from "../components/PlayerAvatar";

interface WaitingScreenProps {
  roomId: string;
  playerId: PlayerId | null;
  opponentConnected: boolean;
  opponentAlias?: string;
  playerAlias?: string;
}

export function WaitingScreen({ roomId, playerId, opponentConnected, opponentAlias, playerAlias }: WaitingScreenProps) {
  const [countdown, setCountdown] = useState<number | null>(null);
  const [hasStartedCountdown, setHasStartedCountdown] = useState(false);

  useEffect(() => {
    if (opponentConnected && !hasStartedCountdown) {
      setHasStartedCountdown(true);
      setCountdown(3);
      const interval = setInterval(() => {
        setCountdown((prev) => {
          if (prev === null || prev <= 1) {
            clearInterval(interval);
            return null;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [opponentConnected, hasStartedCountdown]);

  return (
    <div className="min-h-screen bg-broadcast-dark text-white flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Background pattern */}
      <div className="absolute inset-0 bg-diagonal-stripes opacity-20 pointer-events-none" />

      {/* Top accent */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-espn-red via-espn-yellow to-espn-red" />

      <div className="relative z-10 w-full max-w-2xl">
        {/* Pre-game graphic header */}
        <div className="text-center mb-8 animate-slide-in-down">
          <div className="inline-block lower-third px-6 py-2 mb-4">
            <span className="font-sans text-sm uppercase tracking-widest">Pre-Game</span>
          </div>
          <h1 className="font-display text-4xl md:text-5xl uppercase tracking-wide text-white">
            Waiting for Opponent
          </h1>
        </div>

        {/* Room code card - like a matchup graphic */}
        <div className="broadcast-card rounded-lg p-8 text-center animate-scale-in">
          <p className="font-sans text-sm uppercase tracking-widest text-metal-silver mb-3">
            Share Room Code
          </p>
          <div className="score-display inline-block px-8 py-4 rounded-lg mb-8">
            <span className="font-score text-5xl md:text-6xl font-bold tracking-[0.2em] text-espn-yellow">
              {roomId}
            </span>
          </div>

          {/* VS Matchup graphic */}
          <div className="flex items-center justify-center gap-6 md:gap-12 mb-8">
            {/* Player 1 */}
            <div className="flex flex-col items-center animate-slide-in-left">
              <PlayerAvatar
                player="P1"
                isYou={playerId === "P1"}
                isConnected={playerId === "P2" && opponentConnected}
                size="lg"
              />
              <p className="mt-3 font-sans text-sm uppercase tracking-wide text-metal-silver">
                {playerId === "P1" ? playerAlias || "You" : opponentAlias || "Waiting..."}
              </p>
            </div>

            {/* VS Badge */}
            <div className="relative">
              <div className="w-16 h-16 rounded-full bg-gradient-to-b from-espn-red to-espn-darkRed flex items-center justify-center shadow-glow-red">
                <span className="font-display text-2xl text-white">VS</span>
              </div>
              {!opponentConnected && (
                <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-espn-yellow animate-pulse" />
              )}
            </div>

            {/* Player 2 */}
            <div className="flex flex-col items-center animate-slide-in-right">
              <PlayerAvatar
                player="P2"
                isYou={playerId === "P2"}
                isConnected={playerId === "P1" && opponentConnected}
                size="lg"
              />
              <p className="mt-3 font-sans text-sm uppercase tracking-wide text-metal-silver">
                {playerId === "P2" ? playerAlias || "You" : opponentAlias || "Waiting..."}
              </p>
            </div>
          </div>

          {/* Countdown */}
          {opponentConnected && countdown !== null && (
            <div className="animate-countdown">
              <div className="live-badge inline-block px-4 py-2 rounded mb-2">
                <span className="font-display text-lg uppercase tracking-wider">Match Starting</span>
              </div>
              <div className="font-score text-6xl font-bold text-espn-yellow animate-pulse">
                {countdown}
              </div>
            </div>
          )}
          {opponentConnected && countdown === null && (
            <div className="breaking-bar inline-block px-6 py-3 rounded animate-breaking">
              <span className="font-display text-2xl uppercase tracking-wider">GO!</span>
            </div>
          )}
        </div>
      </div>

      {/* Bottom swoosh */}
      <div className="absolute bottom-0 left-0 right-0 swoosh-line" />
    </div>
  );
}
