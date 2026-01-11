import { useRef, useEffect } from "react";
import type { PlayerId } from "shared";
import { GameHeader } from "../components/GameHeader";
import { Timer } from "../components/Timer";
import { getOtherPlayer } from "../utils/playerHelpers";

interface AnswerScreenProps {
  playerId: PlayerId | null;
  balances: Record<PlayerId, number>;
  questionIndex: number;
  pot: number;
  category: string;
  clue: string;
  revealIndex: number;
  currentlyAnswering: PlayerId | null;
  answerInput: string;
  opponentTyping: string | null;
  timeRemaining: number | null;
  opponentAlias?: string;
  opponentElo?: number;
  onAnswerChange: (value: string) => void;
  onSubmitAnswer: () => void;
  onTyping: (text: string) => void;
  submittingAnswer: boolean;
}

export function AnswerScreen({
  playerId,
  balances,
  questionIndex,
  pot,
  category,
  clue,
  revealIndex,
  currentlyAnswering,
  answerInput,
  opponentTyping,
  timeRemaining,
  opponentAlias,
  opponentElo,
  onAnswerChange,
  onSubmitAnswer,
  onTyping,
  submittingAnswer,
}: AnswerScreenProps) {
  const answerInputRef = useRef<HTMLInputElement>(null);
  const isMyTurn = currentlyAnswering === playerId;
  const revealedClue = clue.substring(0, revealIndex);

  useEffect(() => {
    if (isMyTurn && answerInputRef.current) {
      answerInputRef.current.focus();
    }
  }, [isMyTurn]);

  const handleAnswerChange = (value: string) => {
    onAnswerChange(value);
    onTyping(value);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      onSubmitAnswer();
    }
  };

  return (
    <div className="min-h-screen bg-broadcast-dark text-white flex flex-col">
      <GameHeader playerId={playerId} balances={balances} questionIndex={questionIndex} pot={pot} opponentAlias={opponentAlias} opponentElo={opponentElo} />

      <div className="flex-1 flex flex-col items-center justify-center p-4 relative">
        {/* Background */}
        <div className="absolute inset-0 bg-diagonal-stripes opacity-10 pointer-events-none" />

        <div className="broadcast-card rounded-lg w-full max-w-2xl relative z-10 overflow-hidden animate-scale-in">
          {/* Category header with answering indicator */}
          <div className="bg-gradient-to-r from-espn-red to-espn-darkRed px-6 py-3 flex items-center justify-between">
            <span className="font-sans text-sm uppercase tracking-widest text-white/80">{category}</span>
            {isMyTurn ? (
              <div className="live-badge px-3 py-1 rounded text-xs font-bold uppercase tracking-wider animate-pulse-live">
                Your Turn
              </div>
            ) : (
              <div className="bg-espn-yellow/20 px-3 py-1 rounded text-xs font-bold uppercase tracking-wider text-espn-yellow">
                Watching
              </div>
            )}
          </div>

          <div className="p-6">
            {/* Clue display */}
            <div className="min-h-[120px] text-xl leading-relaxed mb-6 font-mono text-white bg-broadcast-900 rounded-lg p-4 border border-white/10">
              {revealedClue}
            </div>

            {isMyTurn ? (
              <div className="space-y-4">
                {/* Answer input */}
                <input
                  ref={answerInputRef}
                  type="text"
                  value={answerInput}
                  onChange={(e) => handleAnswerChange(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Type your answer..."
                  className="input-broadcast w-full px-4 py-4 text-xl rounded text-white placeholder:text-metal-steel"
                  autoFocus
                />

                {/* Submit button */}
                <button
                  onClick={onSubmitAnswer}
                  disabled={!answerInput.trim() || submittingAnswer}
                  className="
                    w-full py-4 rounded font-sans text-xl font-bold uppercase tracking-wide transition-all
                    bg-gradient-to-b from-score-green to-green-700
                    hover:from-green-500 hover:to-green-600
                    disabled:from-broadcast-600 disabled:to-broadcast-800 disabled:cursor-not-allowed
                    shadow-broadcast
                  "
                >
                  {submittingAnswer ? "Submitting..." : "Submit Answer"}
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Watching opponent answer */}
                <div className="text-center">
                  <div className="inline-block lower-third px-6 py-2 mb-4">
                    <span className="font-sans text-sm uppercase tracking-widest">
                      {getOtherPlayer(playerId)} is answering...
                    </span>
                  </div>
                </div>

                {/* Opponent's typing preview */}
                {opponentTyping && (
                  <div className="bg-broadcast-900 rounded-lg p-4 border-2 border-espn-yellow/30">
                    <div className="font-sans text-xs uppercase tracking-widest text-metal-silver mb-2">
                      Their Answer
                    </div>
                    <div className="font-mono text-xl text-espn-yellow">
                      {opponentTyping}
                      <span className="inline-block w-2 h-5 bg-espn-yellow/50 ml-1 animate-pulse" />
                    </div>
                  </div>
                )}
              </div>
            )}

            <Timer timeRemaining={timeRemaining} urgent />
          </div>

          {/* Bottom accent */}
          <div className="swoosh-line" />
        </div>
      </div>
    </div>
  );
}
