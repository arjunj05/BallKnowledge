import type { PlayerId } from "shared";
import { GameHeader } from "../components/GameHeader";
import { Timer } from "../components/Timer";

interface ResolutionScreenProps {
  playerId: PlayerId | null;
  balances: Record<PlayerId, number>;
  questionIndex: number;
  pot: number;
  outcome: string;
  correctAnswer: string;
  P1Answer: string | null;
  P2Answer: string | null;
  balanceChanges: Record<PlayerId, number>;
  timeRemaining: number | null;
  opponentAlias?: string;
  opponentElo?: number;
}

export function ResolutionScreen({
  playerId,
  balances,
  questionIndex,
  pot,
  outcome,
  correctAnswer,
  P1Answer,
  P2Answer,
  balanceChanges,
  timeRemaining,
  opponentAlias,
  opponentElo,
}: ResolutionScreenProps) {
  const myAnswer = playerId === "P1" ? P1Answer : P2Answer;

  // Determine what happened this round
  const iAnsweredCorrectly =
    (outcome === "P1_WIN" && playerId === "P1") ||
    (outcome === "P2_WIN" && playerId === "P2");
  const opponentAnsweredCorrectly =
    (outcome === "P1_WIN" && playerId === "P2") ||
    (outcome === "P2_WIN" && playerId === "P1");
  const iFolded =
    (outcome === "P1_FOLD" && playerId === "P1") ||
    (outcome === "P2_FOLD" && playerId === "P2");
  const opponentFolded =
    (outcome === "P1_FOLD" && playerId === "P2") ||
    (outcome === "P2_FOLD" && playerId === "P1");
  const isDraw = outcome === "DRAW";

  const getOutcomeGradient = () => {
    if (iAnsweredCorrectly || opponentFolded) return "from-score-green to-green-700";
    if (isDraw) return "from-espn-yellow to-yellow-600";
    return "from-espn-red to-espn-darkRed";
  };

  const getOutcomeText = () => {
    // You buzzed and got it right
    if (iAnsweredCorrectly) return "Correct!";

    // Opponent buzzed and got it right (you were too slow or didn't buzz)
    if (opponentAnsweredCorrectly) return "Too Slow!";

    // You folded during betting
    if (iFolded) return "You Folded";

    // Opponent folded during betting
    if (opponentFolded) return "Opponent Folded";

    // Draw scenarios - neither wins, pot returned
    if (isDraw) {
      // Neither player buzzed
      if (!P1Answer && !P2Answer) return "Time's Up!";
      // Both buzzed and both wrong
      if (P1Answer && P2Answer) return "Both Wrong!";
      // One buzzed and got it wrong, other didn't buzz
      if (myAnswer) return "Incorrect!";
      return "No Answer";
    }

    return "Round Over";
  };

  return (
    <div className="min-h-screen bg-broadcast-dark text-white flex flex-col">
      <GameHeader playerId={playerId} balances={balances} questionIndex={questionIndex} pot={pot} opponentAlias={opponentAlias} opponentElo={opponentElo} />

      <div className="flex-1 flex flex-col items-center justify-center p-4 relative">
        {/* Background */}
        <div className="absolute inset-0 bg-diagonal-stripes opacity-10 pointer-events-none" />

        <div className="broadcast-card rounded-lg w-full max-w-lg relative z-10 overflow-hidden">
          {/* Outcome banner - like a highlight reel graphic */}
          <div className={`bg-gradient-to-r ${getOutcomeGradient()} px-6 py-4 text-center animate-slide-in-down`}>
            <div className="font-display text-4xl uppercase tracking-wider drop-shadow-lg animate-score-pop">
              {getOutcomeText()}
            </div>
          </div>

          <div className="p-6">
            {/* Correct answer reveal */}
            <div className="text-center mb-6 animate-slide-in-up">
              <div className="font-sans text-xs uppercase tracking-widest text-metal-silver mb-2">
                Correct Answer
              </div>
              <div className="score-display inline-block px-6 py-3 rounded-lg">
                <span className="font-display text-2xl text-espn-yellow">{correctAnswer}</span>
              </div>
            </div>

            {/* Player answers comparison - like a sports stat comparison */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              {/* P1 */}
              <div className={`
                broadcast-card rounded-lg p-4 text-center
                ${playerId === "P1" ? "ring-2 ring-espn-yellow" : ""}
              `}>
                <div className="font-sans text-xs uppercase tracking-widest text-metal-silver mb-2">
                  {playerId === "P1" ? "You" : opponentAlias || "Opponent"}
                </div>
                <div className="font-mono text-lg text-white mb-3 min-h-[28px]">
                  {P1Answer || <span className="text-metal-steel italic">No answer</span>}
                </div>
                <div
                  className={`
                    font-score text-2xl font-bold animate-score-pop
                    ${balanceChanges.P1 > 0 ? "text-score-green" : balanceChanges.P1 < 0 ? "text-score-red" : "text-metal-silver"}
                  `}
                >
                  {balanceChanges.P1 > 0 ? "+" : ""}
                  {balanceChanges.P1}
                </div>
              </div>

              {/* P2 */}
              <div className={`
                broadcast-card rounded-lg p-4 text-center
                ${playerId === "P2" ? "ring-2 ring-espn-yellow" : ""}
              `}>
                <div className="font-sans text-xs uppercase tracking-widest text-metal-silver mb-2">
                  {playerId === "P2" ? "You" : opponentAlias || "Opponent"}
                </div>
                <div className="font-mono text-lg text-white mb-3 min-h-[28px]">
                  {P2Answer || <span className="text-metal-steel italic">No answer</span>}
                </div>
                <div
                  className={`
                    font-score text-2xl font-bold animate-score-pop delay-200
                    ${balanceChanges.P2 > 0 ? "text-score-green" : balanceChanges.P2 < 0 ? "text-score-red" : "text-metal-silver"}
                  `}
                >
                  {balanceChanges.P2 > 0 ? "+" : ""}
                  {balanceChanges.P2}
                </div>
              </div>
            </div>

            <Timer timeRemaining={timeRemaining} label="Next question in" />
          </div>

          {/* Bottom accent */}
          <div className="swoosh-line" />
        </div>
      </div>
    </div>
  );
}
