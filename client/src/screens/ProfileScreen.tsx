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
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          <div className="text-xl text-gray-400">Loading profile...</div>
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
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <div className="bg-gray-800 p-4 flex items-center justify-between border-b border-gray-700">
        <button
          onClick={onBack}
          className="text-gray-400 hover:text-white transition-colors"
        >
          ← Back
        </button>
        <h1 className="text-xl font-bold">PROFILE</h1>
        <div className="w-16"></div> {/* Spacer for centering */}
      </div>

      <div className="max-w-4xl mx-auto p-4 space-y-6">
        {/* Identity Section */}
        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
          <div className="flex items-center justify-between mb-4">
            {isEditingAlias ? (
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={aliasInput}
                    onChange={(e) => setAliasInput(e.target.value)}
                    className="flex-1 bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-xl font-bold focus:outline-none focus:border-blue-500"
                    placeholder="Enter display name"
                    maxLength={20}
                    autoFocus
                  />
                  <button
                    onClick={handleSaveAlias}
                    disabled={saving || !aliasInput.trim()}
                    className="bg-green-600 hover:bg-green-700 disabled:bg-gray-600 px-4 py-2 rounded-lg font-medium transition-colors"
                  >
                    {saving ? "..." : "Save"}
                  </button>
                  <button
                    onClick={handleCancelEdit}
                    disabled={saving}
                    className="bg-gray-600 hover:bg-gray-700 px-4 py-2 rounded-lg font-medium transition-colors"
                  >
                    Cancel
                  </button>
                </div>
                {error && (
                  <div className="mt-2 text-red-400 text-sm">
                    {error}
                  </div>
                )}
              </div>
            ) : (
              <>
                <div>
                  <h2 className="text-3xl font-bold mb-1">{profileData.alias}</h2>
                  <p className="text-sm text-gray-400">{profileData.email}</p>
                </div>
                <button
                  onClick={handleEditClick}
                  className="bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded-lg font-medium transition-colors text-sm"
                >
                  Edit ✏️
                </button>
              </>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-700 rounded-lg p-4 text-center">
              <div className="text-4xl font-bold text-yellow-400">{profileData.stats.eloRating}</div>
              <div className="text-sm text-gray-400">ELO Rating</div>
            </div>
            <div className="bg-gray-700 rounded-lg p-4 text-center">
              <div className="text-3xl font-bold">
                {profileData.stats.winStreak > 0 ? (
                  <span className="text-orange-400">🔥 {profileData.stats.winStreak}</span>
                ) : (
                  <span className="text-gray-400">{profileData.stats.winStreak}</span>
                )}
              </div>
              <div className="text-sm text-gray-400">Win Streak</div>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-6">
          {/* Left Column - Game Stats */}
          <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
            <h3 className="text-lg font-bold mb-4 text-gray-300">GAME STATS</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-400">Games Played</span>
                <span className="font-bold">{profileData.stats.gamesPlayed}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Wins</span>
                <span className="font-bold text-green-400">{profileData.stats.gamesWon}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Losses</span>
                <span className="font-bold text-red-400">{profileData.stats.gamesLost}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Ties</span>
                <span className="font-bold text-gray-400">{profileData.stats.gamesTied}</span>
              </div>
              <div className="border-t border-gray-700 pt-3 flex justify-between">
                <span className="text-gray-400">Win Rate</span>
                <span className="font-bold text-blue-400">{winRate}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Best Streak</span>
                <span className="font-bold">{profileData.stats.bestWinStreak}</span>
              </div>
            </div>
          </div>

          {/* Right Column - Performance */}
          <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
            <h3 className="text-lg font-bold mb-4 text-gray-300">PERFORMANCE</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-400">Accuracy</span>
                <span className="font-bold text-purple-400">{accuracy}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Questions</span>
                <span className="font-bold">{profileData.stats.questionsAnswered}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Correct</span>
                <span className="font-bold text-green-400">{profileData.stats.questionsCorrect}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Incorrect</span>
                <span className="font-bold text-red-400">{profileData.stats.questionsIncorrect}</span>
              </div>
              <div className="border-t border-gray-700 pt-3 flex justify-between">
                <span className="text-gray-400">Total Winnings</span>
                <span className={`font-bold ${profileData.stats.totalWinnings >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {profileData.stats.totalWinnings >= 0 ? '+' : ''}{profileData.stats.totalWinnings}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Highest Balance</span>
                <span className="font-bold text-yellow-400">{profileData.stats.highestBalance}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Games */}
        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
          <h3 className="text-lg font-bold mb-4 text-gray-300">RECENT GAMES</h3>
          {profileData.recentGames.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              No games played yet
            </div>
          ) : (
            <div className="space-y-2">
              {profileData.recentGames.map((game) => (
                <div
                  key={game.id}
                  className={`bg-gray-700 rounded-lg p-4 border-l-4 ${
                    game.result === "WIN"
                      ? "border-green-500"
                      : game.result === "LOSS"
                      ? "border-red-500"
                      : "border-gray-500"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-gray-400">vs</span>
                        <span className="font-medium">{game.opponentName}</span>
                        <span
                          className={`text-sm font-bold ${
                            game.result === "WIN"
                              ? "text-green-400"
                              : game.result === "LOSS"
                              ? "text-red-400"
                              : "text-gray-400"
                          }`}
                        >
                          {game.result}
                        </span>
                      </div>
                      <div className="text-sm text-gray-400">
                        {game.yourBalance} - {game.opponentBalance}
                      </div>
                    </div>
                    <div className="text-right">
                      <div
                        className={`font-bold ${
                          game.eloChange > 0 ? "text-green-400" : "text-red-400"
                        }`}
                      >
                        {game.eloChange > 0 ? "+" : ""}
                        {game.eloChange}
                      </div>
                      <div className="text-xs text-gray-500">{formatDate(game.playedAt)}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
