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
    <div className="min-h-screen bg-gray-900 text-white flex flex-col">
      <GameHeader playerId={playerId} balances={balances} questionIndex={questionIndex} pot={pot} opponentAlias={opponentAlias} opponentElo={opponentElo} />
      <div className="flex-1 flex flex-col items-center justify-center p-4">
        <div className="bg-gray-800 rounded-xl p-6 w-full max-w-2xl">
          <p className="text-sm text-gray-400 mb-2 text-center">{category}</p>
          <div className="min-h-[120px] text-xl leading-relaxed mb-6 font-mono">
            {revealedClue}
          </div>

          {isMyTurn ? (
            <div className="space-y-4">
              <input
                ref={answerInputRef}
                type="text"
                value={answerInput}
                onChange={(e) => handleAnswerChange(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type your answer..."
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-xl focus:outline-none focus:border-blue-500"
                autoFocus
              />
              <button
                onClick={onSubmitAnswer}
                disabled={!answerInput.trim() || submittingAnswer}
                className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-600 py-3 rounded-lg font-bold transition-colors"
              >
                {submittingAnswer ? "Submitting..." : "Submit Answer"}
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="text-center">
                <p className="text-xl text-yellow-400 mb-4">
                  {getOtherPlayer(playerId)} is answering...
                </p>
              </div>
              {opponentTyping && (
                <div className="bg-gray-700 rounded-lg px-4 py-3 text-xl border border-gray-600">
                  <div className="text-gray-400 text-sm mb-1">Their answer:</div>
                  <div className="font-mono text-blue-300">{opponentTyping}</div>
                </div>
              )}
            </div>
          )}

          <div className="mt-4">
            <Timer timeRemaining={timeRemaining} />
          </div>
        </div>
      </div>
    </div>
  );
}
