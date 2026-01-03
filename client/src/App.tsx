import { useState } from "react";
import { useGameState } from "./hooks/useGameState";
import { useSocket } from "./hooks/useSocket";
import { useTimer } from "./hooks/useTimer";
import { LobbyScreen } from "./screens/LobbyScreen";
import { WaitingScreen } from "./screens/WaitingScreen";
import { CategoryScreen } from "./screens/CategoryScreen";
import { BettingScreen } from "./screens/BettingScreen";
import { ClueScreen } from "./screens/ClueScreen";
import { AnswerScreen } from "./screens/AnswerScreen";
import { ResolutionScreen } from "./screens/ResolutionScreen";
import { CompleteScreen } from "./screens/CompleteScreen";

function App() {
  const { gameState, setGameState, resetGame } = useGameState();
  const {
    connected,
    roomId,
    playerId,
    opponentConnected,
    error,
    handleCreateRoom,
    handleJoinRoom,
    handleBet,
    handleMatch,
    handleRaise,
    handleFold,
    handleBuzz,
    handleSubmitAnswer,
    handleTyping,
  } = useSocket(setGameState, resetGame);

  const [answerInput, setAnswerInput] = useState("");

  const deadline = gameState.answerDeadline || gameState.deadline;
  const timeRemaining = useTimer(deadline);

  const handleAnswerSubmit = () => {
    handleSubmitAnswer(answerInput);
    setAnswerInput("");
  };

  if (!roomId) {
    return (
      <LobbyScreen
        connected={connected}
        error={error}
        onCreateRoom={handleCreateRoom}
        onJoinRoom={handleJoinRoom}
      />
    );
  }

  if (gameState.phase === "WAITING") {
    return (
      <WaitingScreen
        roomId={roomId}
        playerId={playerId}
        opponentConnected={opponentConnected}
      />
    );
  }

  if (gameState.phase === "CATEGORY") {
    return (
      <CategoryScreen
        playerId={playerId}
        balances={gameState.balances}
        questionIndex={gameState.questionIndex}
        pot={gameState.pot}
        category={gameState.category}
        timeRemaining={timeRemaining}
      />
    );
  }

  if (gameState.phase === "BETTING") {
    return (
      <BettingScreen
        playerId={playerId}
        balances={gameState.balances}
        questionIndex={gameState.questionIndex}
        pot={gameState.pot}
        category={gameState.category}
        awaitingAction={gameState.awaitingAction}
        availableActions={gameState.availableActions}
        betOptions={gameState.betOptions}
        currentBet={gameState.currentBet}
        foldsRemaining={gameState.foldsRemaining}
        timeRemaining={timeRemaining}
        onBet={handleBet}
        onMatch={handleMatch}
        onRaise={handleRaise}
        onFold={handleFold}
      />
    );
  }

  if (gameState.phase === "CLUE") {
    return (
      <ClueScreen
        playerId={playerId}
        balances={gameState.balances}
        questionIndex={gameState.questionIndex}
        pot={gameState.pot}
        category={gameState.category}
        clue={gameState.clue}
        revealIndex={gameState.revealIndex}
        timeRemaining={timeRemaining}
        onBuzz={handleBuzz}
      />
    );
  }

  if (gameState.phase === "ANSWER") {
    return (
      <AnswerScreen
        playerId={playerId}
        balances={gameState.balances}
        questionIndex={gameState.questionIndex}
        pot={gameState.pot}
        category={gameState.category}
        clue={gameState.clue}
        revealIndex={gameState.revealIndex}
        currentlyAnswering={gameState.currentlyAnswering}
        answerInput={answerInput}
        opponentTyping={gameState.opponentTyping}
        timeRemaining={timeRemaining}
        onAnswerChange={setAnswerInput}
        onSubmitAnswer={handleAnswerSubmit}
        onTyping={handleTyping}
      />
    );
  }

  if (gameState.phase === "RESOLUTION" && gameState.lastOutcome) {
    return (
      <ResolutionScreen
        playerId={playerId}
        balances={gameState.balances}
        questionIndex={gameState.questionIndex}
        pot={gameState.pot}
        outcome={gameState.lastOutcome.outcome}
        correctAnswer={gameState.lastOutcome.correctAnswer}
        P1Answer={gameState.lastOutcome.P1Answer}
        P2Answer={gameState.lastOutcome.P2Answer}
        balanceChanges={gameState.lastOutcome.balanceChanges}
        timeRemaining={timeRemaining}
      />
    );
  }

  if (gameState.phase === "COMPLETE") {
    return (
      <CompleteScreen
        playerId={playerId}
        winner={gameState.winner}
        balances={gameState.balances}
        finalBalances={gameState.finalBalances}
      />
    );
  }

  return null;
}

export default App;
