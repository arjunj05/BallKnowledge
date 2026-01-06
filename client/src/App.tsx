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
import { ProfileScreen } from "./screens/ProfileScreen";
import { AdminScreen } from "./screens/AdminScreen";

function App() {
  const { gameState, setGameState, resetGame } = useGameState();
  const {
    connected,
    roomId,
    playerId,
    opponentConnected,
    opponentAlias,
    opponentElo,
    error,
    profileData,
    profileLoading,
    submittingAnswer,
    handleCreateRoom,
    handleJoinRoom,
    handleBet,
    handleMatch,
    handleRaise,
    handleFold,
    handleBuzz,
    handleSubmitAnswer,
    handleTyping,
    handleGetProfile,
    handleUpdateAlias,
  } = useSocket(setGameState, resetGame);

  const [answerInput, setAnswerInput] = useState("");
  const [showProfile, setShowProfile] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);

  const deadline = gameState.answerDeadline || gameState.deadline;
  const timeRemaining = useTimer(deadline);

  const handleAnswerSubmit = () => {
    handleSubmitAnswer(answerInput);
    setAnswerInput("");
  };

  const handleOpenProfile = () => {
    setShowProfile(true);
    handleGetProfile();
  };

  const handleCloseProfile = () => {
    setShowProfile(false);
  };

  const handleOpenAdmin = () => {
    setShowAdmin(true);
  };

  const handleCloseAdmin = () => {
    setShowAdmin(false);
  };

  if (showAdmin) {
    return <AdminScreen onBack={handleCloseAdmin} />;
  }

  if (showProfile) {
    return (
      <ProfileScreen
        onBack={handleCloseProfile}
        onUpdateAlias={handleUpdateAlias}
        profileData={profileData}
        loading={profileLoading}
      />
    );
  }

  if (!roomId) {
    return (
      <LobbyScreen
        connected={connected}
        error={error}
        onCreateRoom={handleCreateRoom}
        onJoinRoom={handleJoinRoom}
        onOpenProfile={handleOpenProfile}
        onOpenAdmin={handleOpenAdmin}
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
        opponentAlias={opponentAlias}
        opponentElo={opponentElo}
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
        opponentAlias={opponentAlias}
        opponentElo={opponentElo}
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
        opponentAlias={opponentAlias}
        opponentElo={opponentElo}
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
        opponentAlias={opponentAlias}
        opponentElo={opponentElo}
        onAnswerChange={setAnswerInput}
        onSubmitAnswer={handleAnswerSubmit}
        onTyping={handleTyping}
        submittingAnswer={submittingAnswer}
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
        opponentAlias={opponentAlias}
        opponentElo={opponentElo}
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
