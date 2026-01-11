import { useState } from "react";
import { SignedIn, SignedOut, SignInButton, UserButton, useUser } from "@clerk/clerk-react";

interface LobbyScreenProps {
  connected: boolean;
  error: string | null;
  onCreateRoom: () => void;
  onJoinRoom: (roomId: string) => void;
  onOpenProfile: () => void;
  onOpenAdmin?: () => void;
}

export function LobbyScreen({ connected, error, onCreateRoom, onJoinRoom, onOpenProfile, onOpenAdmin }: LobbyScreenProps) {
  const { user } = useUser();
  const [joinRoomId, setJoinRoomId] = useState<string>("");

  const handleJoinClick = () => {
    onJoinRoom(joinRoomId);
  };

  // Check if user is admin
  const isAdmin = user?.publicMetadata?.role === "admin";

  return (
    <div className="min-h-screen bg-broadcast-dark text-white flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Background diagonal stripes */}
      <div className="absolute inset-0 bg-diagonal-stripes opacity-30 pointer-events-none" />

      {/* Top bar with gradient */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-espn-red via-espn-yellow to-espn-red" />

      {/* Nav bar */}
      <div className="absolute top-4 right-4 flex items-center gap-3 z-10">
        <SignedIn>
          {isAdmin && onOpenAdmin && (
            <button
              onClick={onOpenAdmin}
              className="btn-secondary px-4 py-2 rounded text-sm"
            >
              Admin Panel
            </button>
          )}
          <button
            onClick={onOpenProfile}
            className="btn-secondary px-4 py-2 rounded text-sm"
          >
            Profile
          </button>
          <UserButton afterSignOutUrl="/" />
        </SignedIn>
      </div>

      {/* Main content */}
      <div className="relative z-10 text-center animate-slide-in-up">
        {/* Logo/Title */}
        <div className="mb-8">
          <h1 className="font-display text-7xl md:text-8xl tracking-tight text-white mb-2 drop-shadow-lg">
            BALL KNOWLEDGE
          </h1>
          <div className="lower-third inline-block px-8 py-2">
            <p className="font-sans text-lg uppercase tracking-widest text-white">
              Head-to-Head Trivia Showdown
            </p>
          </div>
        </div>

        <SignedOut>
          <div className="broadcast-card rounded-lg p-8 text-center max-w-md mx-auto animate-scale-in">
            <p className="font-sans text-xl uppercase tracking-wide mb-6 text-metal-silver">Sign in to play</p>
            <SignInButton mode="modal">
              <button className="btn-espn px-10 py-4 rounded text-xl">
                Sign In
              </button>
            </SignInButton>
          </div>
        </SignedOut>

        <SignedIn>
          <div className="w-full max-w-md space-y-6 mx-auto">
            {/* Create Game Card */}
            <div className="broadcast-card rounded-lg p-6 animate-slide-in-left">
              <h2 className="font-display text-2xl uppercase tracking-wide mb-4 text-espn-yellow">
                Create Match
              </h2>
              <button
                onClick={onCreateRoom}
                disabled={!connected}
                className="w-full btn-espn py-4 rounded text-xl disabled:opacity-50 disabled:cursor-not-allowed"
              >
                New Game
              </button>
            </div>

            {/* Divider */}
            <div className="flex items-center gap-4">
              <div className="flex-1 h-px bg-gradient-to-r from-transparent via-metal-steel to-transparent" />
              <span className="font-sans text-metal-steel uppercase text-sm tracking-widest">or</span>
              <div className="flex-1 h-px bg-gradient-to-r from-transparent via-metal-steel to-transparent" />
            </div>

            {/* Join Game Card */}
            <div className="broadcast-card rounded-lg p-6 animate-slide-in-right">
              <h2 className="font-display text-2xl uppercase tracking-wide mb-4 text-espn-yellow">
                Join Match
              </h2>
              <input
                type="text"
                value={joinRoomId}
                onChange={(e) => setJoinRoomId(e.target.value.toUpperCase())}
                placeholder="ROOM CODE"
                maxLength={6}
                className="input-broadcast w-full px-4 py-3 mb-4 text-center text-2xl tracking-[0.3em] uppercase rounded font-mono text-white placeholder:text-metal-steel"
              />
              <button
                onClick={handleJoinClick}
                disabled={!connected || !joinRoomId.trim()}
                className="w-full bg-gradient-to-b from-score-green to-green-700 hover:from-green-500 hover:to-green-600 py-4 rounded font-sans text-xl font-bold uppercase tracking-wide transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-broadcast"
              >
                Join Game
              </button>
            </div>

            {/* Error display */}
            {error && (
              <div className="breaking-bar rounded-lg p-4 text-center animate-flash">
                <span className="font-sans font-bold uppercase tracking-wide">{error}</span>
              </div>
            )}

            {/* Connection status */}
            <div className="text-center">
              {connected ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-score-green animate-pulse" />
                  <span className="font-sans text-sm uppercase tracking-wider text-score-green">Connected</span>
                </div>
              ) : (
                <div className="flex items-center justify-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-espn-red animate-pulse" />
                  <span className="font-sans text-sm uppercase tracking-wider text-espn-red">Connecting...</span>
                </div>
              )}
            </div>
          </div>
        </SignedIn>
      </div>

      {/* Bottom swoosh accent */}
      <div className="absolute bottom-0 left-0 right-0 swoosh-line" />
    </div>
  );
}
