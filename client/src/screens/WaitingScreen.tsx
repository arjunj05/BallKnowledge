import type { PlayerId } from "shared";
import { PlayerAvatar } from "../components/PlayerAvatar";

interface WaitingScreenProps {
  roomId: string;
  playerId: PlayerId | null;
  opponentConnected: boolean;
}

export function WaitingScreen({ roomId, playerId, opponentConnected }: WaitingScreenProps) {
  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center p-4">
      <h1 className="text-3xl font-bold mb-8">Waiting for Opponent</h1>

      <div className="bg-gray-800 rounded-xl p-8 text-center">
        <p className="text-gray-400 mb-4">Share this room code:</p>
        <div className="text-5xl font-mono font-bold tracking-widest mb-6 text-blue-400">
          {roomId}
        </div>

        <div className="flex justify-center gap-8 mb-6">
          <PlayerAvatar
            player="P1"
            isYou={playerId === "P1"}
            isConnected={playerId === "P2" && opponentConnected}
          />
          <PlayerAvatar
            player="P2"
            isYou={playerId === "P2"}
            isConnected={playerId === "P1" && opponentConnected}
          />
        </div>

        {opponentConnected && (
          <p className="text-green-400 animate-pulse">
            Both players connected! Game starting...
          </p>
        )}
      </div>
    </div>
  );
}
