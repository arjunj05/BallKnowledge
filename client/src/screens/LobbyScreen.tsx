import { useState } from "react";

interface LobbyScreenProps {
  connected: boolean;
  error: string | null;
  onCreateRoom: () => void;
  onJoinRoom: (roomId: string) => void;
}

export function LobbyScreen({ connected, error, onCreateRoom, onJoinRoom }: LobbyScreenProps) {
  const [joinRoomId, setJoinRoomId] = useState<string>("");

  const handleJoinClick = () => {
    onJoinRoom(joinRoomId);
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center p-4">
      <h1 className="text-5xl font-bold mb-2">Ball Knowledge</h1>
      <p className="text-gray-400 mb-12">Head-to-head trivia betting</p>

      <div className="w-full max-w-md space-y-8">
        <div className="bg-gray-800 rounded-xl p-6">
          <h2 className="text-xl font-semibold mb-4">Create a Game</h2>
          <button
            onClick={onCreateRoom}
            disabled={!connected}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed py-3 rounded-lg font-medium transition-colors"
          >
            Create Room
          </button>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex-1 h-px bg-gray-700" />
          <span className="text-gray-500">or</span>
          <div className="flex-1 h-px bg-gray-700" />
        </div>

        <div className="bg-gray-800 rounded-xl p-6">
          <h2 className="text-xl font-semibold mb-4">Join a Game</h2>
          <input
            type="text"
            value={joinRoomId}
            onChange={(e) => setJoinRoomId(e.target.value.toUpperCase())}
            placeholder="Enter room code"
            maxLength={6}
            className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 mb-4 text-center text-2xl tracking-widest uppercase focus:outline-none focus:border-blue-500"
          />
          <button
            onClick={handleJoinClick}
            disabled={!connected || !joinRoomId.trim()}
            className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed py-3 rounded-lg font-medium transition-colors"
          >
            Join Room
          </button>
        </div>

        {error && (
          <div className="bg-red-900/50 border border-red-500 rounded-lg p-4 text-center">
            {error}
          </div>
        )}

        <div className="text-center text-gray-500 text-sm">
          {connected ? (
            <span className="text-green-400">Connected to server</span>
          ) : (
            <span className="text-red-400">Connecting...</span>
          )}
        </div>
      </div>
    </div>
  );
}
