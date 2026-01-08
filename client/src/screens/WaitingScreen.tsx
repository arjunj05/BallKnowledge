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
    <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center p-4">
      <h1 className="text-3xl font-bold mb-8">Waiting for Opponent</h1>

      <div className="bg-gray-800 rounded-xl p-8 text-center">
        <p className="text-gray-400 mb-4">Share this room code:</p>
        <div className="text-5xl font-mono font-bold tracking-widest mb-6 text-blue-400">
          {roomId}
        </div>

        <div className="flex justify-center gap-8 mb-6">
          <div className="flex flex-col items-center">
            <PlayerAvatar
              player="P1"
              isYou={playerId === "P1"}
              isConnected={playerId === "P2" && opponentConnected}
            />
            <p className="mt-2 text-sm text-gray-400">
              {playerId === "P1" ? `You: ${playerAlias || "Player"}` : opponentAlias || "Waiting..."}
            </p>
          </div>
          <div className="flex flex-col items-center">
            <PlayerAvatar
              player="P2"
              isYou={playerId === "P2"}
              isConnected={playerId === "P1" && opponentConnected}
            />
            <p className="mt-2 text-sm text-gray-400">
              {playerId === "P2" ? `You: ${playerAlias || "Player"}` : opponentAlias || "Waiting..."}
            </p>
          </div>
        </div>

        {opponentConnected && countdown !== null && (
          <p className="text-green-400 text-2xl font-bold">
            Game starting in {countdown}...
          </p>
        )}
        {opponentConnected && countdown === null && (
          <p className="text-green-400 animate-pulse">
            Starting now!
          </p>
        )}
      </div>
    </div>
  );
}
