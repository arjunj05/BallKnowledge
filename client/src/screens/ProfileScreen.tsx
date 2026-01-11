import { useState } from "react";

interface ProfileData {
  alias: string;
  email: string;
  username: string | null;
  createdAt: string;
  stats: {
    eloRating: number;
    gamesPlayed: number;
    gamesWon: number;
    gamesLost: number;
    gamesTied: number;
    questionsAnswered: number;
    questionsCorrect: number;
    questionsIncorrect: number;
    totalWinnings: number;
    highestBalance: number;
    winStreak: number;
    bestWinStreak: number;
  };
  recentGames: Array<{
    id: string;
    opponentName: string;
    result: "WIN" | "LOSS" | "TIE";
    yourBalance: number;
    opponentBalance: number;
    eloChange: number;
    playedAt: string;
  }>;
}

interface ProfileScreenProps {
  onBack: () => void;
  onUpdateAlias: (newAlias: string) => Promise<void>;
  profileData: ProfileData | null;
  loading: boolean;
}

export function ProfileScreen({ onBack, onUpdateAlias, profileData, loading }: ProfileScreenProps) {
  const [isEditingAlias, setIsEditingAlias] = useState(false);
  const [aliasInput, setAliasInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleEditClick = () => {
    setAliasInput(profileData?.alias || "");
    setIsEditingAlias(true);
  };

  const handleSaveAlias = async () => {
    if (!aliasInput.trim()) return;
    setSaving(true);
    setError(null);
    try {
      await onUpdateAlias(aliasInput.trim());
      setIsEditingAlias(false);
      setError(null);
    } catch (err: any) {
      console.error("Failed to update alias:", err);
      setError(err.message || "Failed to update alias. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setIsEditingAlias(false);
    setAliasInput("");
  };

  if (loading || !profileData) {
    return (
      <div className="min-h-screen bg-broadcast-dark text-white flex items-center justify-center relative overflow-hidden">
        <div className="absolute inset-0 bg-diagonal-stripes opacity-20 pointer-events-none" />
        <div className="flex flex-col items-center gap-4 relative z-10">
          <div className="w-16 h-16 rounded-full border-4 border-espn-red border-t-transparent animate-spin" />
          <div className="font-sans text-xl uppercase tracking-widest text-metal-silver">Loading Profile...</div>
        </div>
      </div>
    );
  }

  const winRate = profileData.stats.gamesPlayed > 0
    ? ((profileData.stats.gamesWon / profileData.stats.gamesPlayed) * 100).toFixed(1)
    : "0.0";

  const accuracy = profileData.stats.questionsAnswered > 0
    ? ((profileData.stats.questionsCorrect / profileData.stats.questionsAnswered) * 100).toFixed(1)
    : "0.0";

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffHours < 1) return "Just now";
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="min-h-screen bg-broadcast-dark text-white relative">
      {/* Background pattern */}
      <div className="absolute inset-0 bg-diagonal-stripes opacity-10 pointer-events-none" />

      {/* Header */}
      <div className="score-panel relative z-10">
        <div className="h-1 bg-gradient-to-r from-espn-red via-espn-yellow to-espn-red" />
        <div className="px-4 py-4 flex items-center justify-between">
          <button
            onClick={onBack}
            className="btn-secondary px-4 py-2 rounded text-sm flex items-center gap-2"
          >
            <span>←</span> Back
          </button>
          <h1 className="font-display text-2xl uppercase tracking-wider">Player Profile</h1>
          <div className="w-20" />
        </div>
        <div className="swoosh-line" />
      </div>

      <div className="max-w-4xl mx-auto p-4 space-y-6 relative z-10">
        {/* Identity Section - Like a player card */}
        <div className="broadcast-card rounded-lg overflow-hidden animate-slide-in-down">
          <div className="bg-gradient-to-r from-espn-red to-espn-darkRed px-6 py-3">
            <span className="font-sans text-sm uppercase tracking-widest text-white/80">Player Card</span>
          </div>

          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              {isEditingAlias ? (
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <input
                      type="text"
                      value={aliasInput}
                      onChange={(e) => setAliasInput(e.target.value)}
                      className="input-broadcast flex-1 px-4 py-3 text-2xl font-display uppercase rounded text-white"
                      placeholder="Enter display name"
                      maxLength={20}
                      autoFocus
                    />
                    <button
                      onClick={handleSaveAlias}
                      disabled={saving || !aliasInput.trim()}
                      className="bg-gradient-to-b from-score-green to-green-700 hover:from-green-500 hover:to-green-600 disabled:from-broadcast-600 disabled:to-broadcast-800 px-6 py-3 rounded font-sans font-bold uppercase tracking-wide transition-all"
                    >
                      {saving ? "..." : "Save"}
                    </button>
                    <button
                      onClick={handleCancelEdit}
                      disabled={saving}
                      className="btn-secondary px-6 py-3 rounded"
                    >
                      Cancel
                    </button>
                  </div>
                  {error && (
                    <div className="mt-3 breaking-bar rounded px-4 py-2 text-sm">
                      {error}
                    </div>
                  )}
                </div>
              ) : (
                <>
                  <div>
                    <h2 className="font-display text-4xl uppercase tracking-wide text-espn-yellow mb-1">
                      {profileData.alias}
                    </h2>
                    <p className="font-mono text-sm text-metal-silver">{profileData.email}</p>
                  </div>
                  <button
                    onClick={handleEditClick}
                    className="btn-secondary px-4 py-2 rounded text-sm"
                  >
                    Edit Name
                  </button>
                </>
              )}
            </div>

            {/* Featured Stats */}
            <div className="grid grid-cols-2 gap-4">
              <div className="score-display rounded-lg p-5 text-center">
                <div className="font-score text-5xl font-bold text-espn-yellow animate-score-pop">
                  {profileData.stats.eloRating}
                </div>
                <div className="font-sans text-sm uppercase tracking-widest text-metal-silver mt-2">ELO Rating</div>
              </div>
              <div className="score-display rounded-lg p-5 text-center">
                <div className="font-score text-5xl font-bold">
                  {profileData.stats.winStreak > 0 ? (
                    <span className="text-espn-orange">{profileData.stats.winStreak}</span>
                  ) : (
                    <span className="text-metal-silver">{profileData.stats.winStreak}</span>
                  )}
                </div>
                <div className="font-sans text-sm uppercase tracking-widest text-metal-silver mt-2">
                  {profileData.stats.winStreak > 0 ? "Win Streak" : "Win Streak"}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Grid - Like sports stats comparison */}
        <div className="grid grid-cols-2 gap-6">
          {/* Left Column - Game Stats */}
          <div className="broadcast-card rounded-lg overflow-hidden animate-slide-in-left">
            <div className="bg-gradient-to-r from-score-blue to-blue-700 px-6 py-3">
              <span className="font-sans text-sm uppercase tracking-widest text-white/80">Game Stats</span>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex justify-between items-center">
                <span className="font-sans text-sm uppercase tracking-wide text-metal-silver">Games Played</span>
                <span className="font-score text-xl font-bold">{profileData.stats.gamesPlayed}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="font-sans text-sm uppercase tracking-wide text-metal-silver">Wins</span>
                <span className="font-score text-xl font-bold text-score-green">{profileData.stats.gamesWon}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="font-sans text-sm uppercase tracking-wide text-metal-silver">Losses</span>
                <span className="font-score text-xl font-bold text-score-red">{profileData.stats.gamesLost}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="font-sans text-sm uppercase tracking-wide text-metal-silver">Ties</span>
                <span className="font-score text-xl font-bold text-metal-silver">{profileData.stats.gamesTied}</span>
              </div>
              <div className="h-px bg-gradient-to-r from-transparent via-metal-steel to-transparent" />
              <div className="flex justify-between items-center">
                <span className="font-sans text-sm uppercase tracking-wide text-metal-silver">Win Rate</span>
                <span className="font-score text-xl font-bold text-espn-yellow">{winRate}%</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="font-sans text-sm uppercase tracking-wide text-metal-silver">Best Streak</span>
                <span className="font-score text-xl font-bold text-espn-orange">{profileData.stats.bestWinStreak}</span>
              </div>
            </div>
          </div>

          {/* Right Column - Performance */}
          <div className="broadcast-card rounded-lg overflow-hidden animate-slide-in-right">
            <div className="bg-gradient-to-r from-espn-red to-espn-darkRed px-6 py-3">
              <span className="font-sans text-sm uppercase tracking-widest text-white/80">Performance</span>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex justify-between items-center">
                <span className="font-sans text-sm uppercase tracking-wide text-metal-silver">Accuracy</span>
                <span className="font-score text-xl font-bold text-espn-yellow">{accuracy}%</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="font-sans text-sm uppercase tracking-wide text-metal-silver">Questions</span>
                <span className="font-score text-xl font-bold">{profileData.stats.questionsAnswered}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="font-sans text-sm uppercase tracking-wide text-metal-silver">Correct</span>
                <span className="font-score text-xl font-bold text-score-green">{profileData.stats.questionsCorrect}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="font-sans text-sm uppercase tracking-wide text-metal-silver">Incorrect</span>
                <span className="font-score text-xl font-bold text-score-red">{profileData.stats.questionsIncorrect}</span>
              </div>
              <div className="h-px bg-gradient-to-r from-transparent via-metal-steel to-transparent" />
              <div className="flex justify-between items-center">
                <span className="font-sans text-sm uppercase tracking-wide text-metal-silver">Total Winnings</span>
                <span className={`font-score text-xl font-bold ${profileData.stats.totalWinnings >= 0 ? 'text-score-green' : 'text-score-red'}`}>
                  {profileData.stats.totalWinnings >= 0 ? '+' : ''}{profileData.stats.totalWinnings}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="font-sans text-sm uppercase tracking-wide text-metal-silver">Highest Balance</span>
                <span className="font-score text-xl font-bold text-espn-yellow">{profileData.stats.highestBalance}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Games - Like a match history ticker */}
        <div className="broadcast-card rounded-lg overflow-hidden animate-slide-in-up">
          <div className="bg-gradient-to-r from-broadcast-700 to-broadcast-800 px-6 py-3 flex items-center justify-between">
            <span className="font-sans text-sm uppercase tracking-widest text-white/80">Recent Matches</span>
            <div className="live-badge px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wider">
              History
            </div>
          </div>

          {profileData.recentGames.length === 0 ? (
            <div className="p-8 text-center">
              <div className="font-sans text-lg uppercase tracking-wide text-metal-steel">
                No games played yet
              </div>
            </div>
          ) : (
            <div className="divide-y divide-broadcast-700">
              {profileData.recentGames.map((game, index) => (
                <div
                  key={game.id}
                  className={`
                    p-4 flex items-center justify-between
                    ${index % 2 === 0 ? 'bg-broadcast-800/50' : 'bg-broadcast-900/50'}
                    hover:bg-broadcast-700/50 transition-colors
                  `}
                >
                  {/* Result indicator */}
                  <div className={`
                    w-1 h-12 rounded-full mr-4
                    ${game.result === "WIN" ? "bg-score-green" : game.result === "LOSS" ? "bg-score-red" : "bg-metal-steel"}
                  `} />

                  {/* Match info */}
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      <span className="font-sans text-xs uppercase tracking-wide text-metal-silver">vs</span>
                      <span className="font-sans text-lg font-bold text-white">{game.opponentName}</span>
                      <span className={`
                        font-sans text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded
                        ${game.result === "WIN"
                          ? "bg-score-green/20 text-score-green"
                          : game.result === "LOSS"
                          ? "bg-score-red/20 text-score-red"
                          : "bg-metal-steel/20 text-metal-silver"
                        }
                      `}>
                        {game.result}
                      </span>
                    </div>
                    <div className="font-mono text-sm text-metal-silver">
                      {game.yourBalance} - {game.opponentBalance}
                    </div>
                  </div>

                  {/* ELO change */}
                  <div className="text-right">
                    <div className={`
                      font-score text-2xl font-bold
                      ${game.eloChange > 0 ? "text-score-green" : "text-score-red"}
                    `}>
                      {game.eloChange > 0 ? "+" : ""}{game.eloChange}
                    </div>
                    <div className="font-mono text-xs text-metal-steel">{formatDate(game.playedAt)}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Bottom accent */}
      <div className="fixed bottom-0 left-0 right-0 swoosh-line" />
    </div>
  );
}
