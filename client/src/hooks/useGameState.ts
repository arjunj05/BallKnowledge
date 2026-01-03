import { useState, useCallback } from "react";
import type { PlayerId, GamePhase, BetAction } from "shared";
import * as Shared from "shared/dist";
const { GAME_CONFIG } = Shared;

export interface GameState {
  phase: GamePhase;
  questionIndex: number;
  category: string;
  balances: Record<PlayerId, number>;
  foldsRemaining: Record<PlayerId, number>;
  pot: number;
  clue: string;
  revealIndex: number;
  awaitingAction: PlayerId | null;
  availableActions: BetAction[];
  betOptions: number[];
  currentBet: number | null;
  deadline: number | null;
  currentlyAnswering: PlayerId | null;
  answerDeadline: number | null;
  opponentTyping: string | null;
  lastOutcome: {
    outcome: string;
    correctAnswer: string;
    P1Answer: string | null;
    P2Answer: string | null;
    balanceChanges: Record<PlayerId, number>;
  } | null;
  winner: "P1" | "P2" | "TIE" | null;
  finalBalances: Record<PlayerId, number> | null;
}

const initialGameState: GameState = {
  phase: "WAITING",
  questionIndex: 0,
  category: "",
  balances: { P1: GAME_CONFIG.startingBalance, P2: GAME_CONFIG.startingBalance },
  foldsRemaining: { P1: GAME_CONFIG.foldsPerPlayer, P2: GAME_CONFIG.foldsPerPlayer },
  pot: 0,
  clue: "",
  revealIndex: 0,
  awaitingAction: null,
  availableActions: [],
  betOptions: [],
  currentBet: null,
  deadline: null,
  currentlyAnswering: null,
  answerDeadline: null,
  opponentTyping: null,
  lastOutcome: null,
  winner: null,
  finalBalances: null,
};

export function useGameState() {
  const [gameState, setGameState] = useState<GameState>(initialGameState);

  const resetGame = useCallback(() => {
    setGameState(initialGameState);
  }, []);

  return { gameState, setGameState, resetGame };
}
