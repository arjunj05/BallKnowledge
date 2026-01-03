import { Server } from "socket.io";
import {
  PlayerId,
  GamePhase,
  Question,
  BettingState,
  ClueState,
  BuzzerState,
  BuzzerStateMap,
  GAME_CONFIG,
  SocketEvents,
  PhaseCategoryMessage,
  PhaseBettingMessage,
  PhaseClueMessage,
  PhaseResolutionMessage,
  PhaseCompleteMessage,
  BetPlacedMessage,
  ClueTickMessage,
  ClueCompleteMessage,
  BuzzedMessage,
  AnswerSubmittedMessage,
  ClueResumedMessage,
  ResolutionOutcome,
  BetAction,
} from "shared";
import questions from "./data/questions.json";

interface PlayerState {
  balance: number;
  balanceAtQuestionStart: number;
  foldsRemaining: number;
  answer: string | null;
}

export class GameRoom {
  private io: Server;
  private roomId: string;
  private phase: GamePhase = "WAITING";
  private questionIndex: number = 0;
  private questions: Question[] = [];
  private players: Record<PlayerId, PlayerState> = {
    P1: { balance: GAME_CONFIG.startingBalance, balanceAtQuestionStart: GAME_CONFIG.startingBalance, foldsRemaining: GAME_CONFIG.foldsPerPlayer, answer: null },
    P2: { balance: GAME_CONFIG.startingBalance, balanceAtQuestionStart: GAME_CONFIG.startingBalance, foldsRemaining: GAME_CONFIG.foldsPerPlayer, answer: null },
  };

  private bettingState: BettingState = {
    firstActor: "P1",
    bets: { P1: null, P2: null },
    contributions: { P1: 0, P2: 0 },
    raises: 0,
    awaitingAction: null,
    pot: 0,
  };

  private clueState: ClueState = {
    revealIndex: 0,
    clueComplete: false,
    clueCompleteAt: null,
  };

  private buzzerState: BuzzerStateMap = {
    P1: "AVAILABLE",
    P2: "AVAILABLE",
    currentlyAnswering: null,
    answerDeadline: null,
  };

  private timers: {
    category?: NodeJS.Timeout;
    betting?: NodeJS.Timeout;
    clueTick?: NodeJS.Timeout;
    postClue?: NodeJS.Timeout;
    answer?: NodeJS.Timeout;
    resolution?: NodeJS.Timeout;
  } = {};

  constructor(io: Server, roomId: string) {
    this.io = io;
    this.roomId = roomId;
    this.selectQuestions();
  }

  private selectQuestions(): void {
    const shuffled = [...questions].sort(() => Math.random() - 0.5);
    this.questions = shuffled.slice(0, GAME_CONFIG.questionsPerMatch) as Question[];
  }

  private emit(event: string, data: unknown): void {
    this.io.to(this.roomId).emit(event, data);
  }

  private clearAllTimers(): void {
    Object.values(this.timers).forEach((timer) => {
      if (timer) clearTimeout(timer);
    });
    this.timers = {};
  }

  private getCurrentQuestion(): Question {
    return this.questions[this.questionIndex];
  }

  private getOtherPlayer(player: PlayerId): PlayerId {
    return player === "P1" ? "P2" : "P1";
  }

  // ============================================================================
  // GAME START
  // ============================================================================

  startGame(): void {
    console.log(`[GameRoom ${this.roomId}] Starting game`);
    this.phase = "CATEGORY";
    this.startCategoryPhase();
  }

  // ============================================================================
  // CATEGORY PHASE
  // ============================================================================

  private startCategoryPhase(): void {
    this.phase = "CATEGORY";
    const question = this.getCurrentQuestion();
    const endsAt = Date.now() + GAME_CONFIG.categoryRevealSec * 1000;

    // Save balances at start of question for accurate change calculation
    this.players.P1.balanceAtQuestionStart = this.players.P1.balance;
    this.players.P2.balanceAtQuestionStart = this.players.P2.balance;

    const message: PhaseCategoryMessage = {
      type: "PHASE_CATEGORY",
      questionIndex: this.questionIndex,
      category: question.category,
      endsAt,
    };

    this.emit(SocketEvents.PHASE_CATEGORY, message);

    this.timers.category = setTimeout(() => {
      this.startBettingPhase();
    }, GAME_CONFIG.categoryRevealSec * 1000);
  }

  // ============================================================================
  // BETTING PHASE
  // ============================================================================

  private startBettingPhase(): void {
    this.phase = "BETTING";

    // Alternate first actor each question
    this.bettingState = {
      firstActor: this.questionIndex % 2 === 0 ? "P1" : "P2",
      bets: { P1: null, P2: null },
      contributions: { P1: 0, P2: 0 },
      raises: 0,
      awaitingAction: this.questionIndex % 2 === 0 ? "P1" : "P2",
      pot: 0,
    };

    this.sendBettingState();
  }

  private sendBettingState(): void {
    const player = this.bettingState.awaitingAction;
    if (!player) return;

    const availableActions = this.getAvailableActions(player);
    const betOptions = GAME_CONFIG.betTiers.filter(
      (tier) => tier <= this.players[player].balance
    );

    const currentBet = this.bettingState.bets[this.getOtherPlayer(player)];
    const deadline = Date.now() + GAME_CONFIG.betTimeLimitSec * 1000;

    const message: PhaseBettingMessage = {
      type: "PHASE_BETTING",
      firstActor: this.bettingState.firstActor,
      awaitingAction: player,
      availableActions,
      betOptions,
      currentBet,
      pot: this.bettingState.pot,
      deadline,
    };

    this.emit(SocketEvents.PHASE_BETTING, message);

    this.clearTimer("betting");
    this.timers.betting = setTimeout(() => {
      this.handleBetTimeout(player);
    }, GAME_CONFIG.betTimeLimitSec * 1000);
  }

  private getAvailableActions(player: PlayerId): BetAction[] {
    const actions: BetAction[] = [];
    const otherBet = this.bettingState.bets[this.getOtherPlayer(player)];

    if (otherBet === null) {
      // First to act
      actions.push("BET");
    } else {
      // Responding to a bet
      actions.push("MATCH");
      if (this.bettingState.raises < 1) {
        actions.push("RAISE");
      }
    }

    if (this.players[player].foldsRemaining > 0) {
      actions.push("FOLD");
    }

    return actions;
  }

  private clearTimer(name: keyof typeof this.timers): void {
    if (this.timers[name]) {
      clearTimeout(this.timers[name]);
      delete this.timers[name];
    }
  }

  handleBet(player: PlayerId, amount: number): void {
    if (this.phase !== "BETTING" || this.bettingState.awaitingAction !== player) {
      return;
    }

    const otherBet = this.bettingState.bets[this.getOtherPlayer(player)];
    if (otherBet !== null) {
      // Can't BET if other player already bet
      return;
    }

    if (amount > this.players[player].balance) return;
    if (!GAME_CONFIG.betTiers.includes(amount as typeof GAME_CONFIG.betTiers[number])) return;

    this.clearTimer("betting");

    this.bettingState.bets[player] = amount;
    this.bettingState.contributions[player] = amount;
    this.players[player].balance -= amount;
    this.bettingState.pot = amount;
    this.bettingState.awaitingAction = this.getOtherPlayer(player);

    this.broadcastBetPlaced(player, "BET", amount);
    this.sendBettingState();
  }

  handleMatch(player: PlayerId): void {
    if (this.phase !== "BETTING" || this.bettingState.awaitingAction !== player) {
      return;
    }

    const otherPlayer = this.getOtherPlayer(player);
    const amountToMatch = this.bettingState.contributions[otherPlayer] - this.bettingState.contributions[player];

    if (amountToMatch <= 0 || amountToMatch > this.players[player].balance) return;

    this.clearTimer("betting");

    this.bettingState.contributions[player] += amountToMatch;
    this.players[player].balance -= amountToMatch;
    this.bettingState.pot += amountToMatch;
    this.bettingState.awaitingAction = null;

    this.broadcastBetPlaced(player, "MATCH", amountToMatch);
    this.startCluePhase();
  }

  handleRaise(player: PlayerId, amount: number): void {
    if (this.phase !== "BETTING" || this.bettingState.awaitingAction !== player) {
      return;
    }

    if (this.bettingState.raises >= 1) return;

    const otherPlayer = this.getOtherPlayer(player);
    const currentBet = this.bettingState.contributions[otherPlayer];

    if (amount <= currentBet || amount > this.players[player].balance) return;

    this.clearTimer("betting");

    const contribution = amount;
    this.bettingState.bets[player] = amount;
    this.bettingState.contributions[player] = contribution;
    this.players[player].balance -= contribution;
    this.bettingState.pot += contribution;
    this.bettingState.raises++;
    this.bettingState.awaitingAction = otherPlayer;

    this.broadcastBetPlaced(player, "RAISE", amount);
    this.sendBettingState();
  }

  handleFold(player: PlayerId): void {
    if (this.phase !== "BETTING" || this.bettingState.awaitingAction !== player) {
      return;
    }

    if (this.players[player].foldsRemaining <= 0) return;

    this.clearTimer("betting");
    this.players[player].foldsRemaining--;

    const otherPlayer = this.getOtherPlayer(player);

    // Return pot to other player (they get their own money back plus folder's contribution)
    this.players[otherPlayer].balance += this.bettingState.pot;

    this.broadcastBetPlaced(player, "FOLD", 0);

    // Go to resolution
    this.handleFoldResolution(player);
  }

  private handleBetTimeout(player: PlayerId): void {
    console.log(`[GameRoom ${this.roomId}] Bet timeout for ${player}`);
    // Auto-fold if out of time
    if (this.players[player].foldsRemaining > 0) {
      this.handleFold(player);
    } else {
      // If no folds left, auto-match or minimum bet
      const otherBet = this.bettingState.bets[this.getOtherPlayer(player)];
      if (otherBet !== null) {
        this.handleMatch(player);
      } else {
        // First actor with no folds - force minimum bet
        const minBet = GAME_CONFIG.betTiers.find((t) => t <= this.players[player].balance);
        if (minBet) {
          this.handleBet(player, minBet);
        }
      }
    }
  }

  private broadcastBetPlaced(player: PlayerId, action: BetAction, amount: number): void {
    const message: BetPlacedMessage = {
      type: "BET_PLACED",
      player,
      action,
      amount,
      pot: this.bettingState.pot,
      awaitingAction: this.bettingState.awaitingAction,
      availableActions: this.bettingState.awaitingAction
        ? this.getAvailableActions(this.bettingState.awaitingAction)
        : [],
      currentBet:
        this.bettingState.awaitingAction
          ? this.bettingState.bets[this.getOtherPlayer(this.bettingState.awaitingAction)]
          : null,
      deadline: this.bettingState.awaitingAction
        ? Date.now() + GAME_CONFIG.betTimeLimitSec * 1000
        : null,
    };

    this.emit(SocketEvents.BET_PLACED, message);
  }

  // ============================================================================
  // CLUE PHASE
  // ============================================================================

  private startCluePhase(): void {
    this.phase = "CLUE";
    const question = this.getCurrentQuestion();

    this.clueState = {
      revealIndex: 0,
      clueComplete: false,
      clueCompleteAt: null,
    };

    this.buzzerState = {
      P1: "AVAILABLE",
      P2: "AVAILABLE",
      currentlyAnswering: null,
      answerDeadline: null,
    };

    this.players.P1.answer = null;
    this.players.P2.answer = null;

    const message: PhaseClueMessage = {
      type: "PHASE_CLUE",
      clue: question.clue,
      revealRate: GAME_CONFIG.revealRateCharsPerSec,
      pot: this.bettingState.pot,
    };

    this.emit(SocketEvents.PHASE_CLUE, message);

    this.startClueReveal();
  }

  private startClueReveal(): void {
    const question = this.getCurrentQuestion();
    const charsPerTick = Math.ceil(
      (GAME_CONFIG.revealRateCharsPerSec * GAME_CONFIG.clueTickIntervalMs) / 1000
    );

    this.timers.clueTick = setInterval(() => {
      if (this.buzzerState.currentlyAnswering) {
        // Pause reveal while someone is answering
        return;
      }

      this.clueState.revealIndex = Math.min(
        this.clueState.revealIndex + charsPerTick,
        question.clue.length
      );

      const tick: ClueTickMessage = {
        type: "CLUE_TICK",
        revealIndex: this.clueState.revealIndex,
      };
      this.emit(SocketEvents.CLUE_TICK, tick);

      if (this.clueState.revealIndex >= question.clue.length && !this.clueState.clueComplete) {
        this.handleClueComplete();
      }
    }, GAME_CONFIG.clueTickIntervalMs);
  }

  private handleClueComplete(): void {
    this.clueState.clueComplete = true;
    this.clueState.clueCompleteAt = Date.now();

    if (this.timers.clueTick) {
      clearInterval(this.timers.clueTick);
      delete this.timers.clueTick;
    }

    const deadline = Date.now() + GAME_CONFIG.postClueTimeoutSec * 1000;

    const message: ClueCompleteMessage = {
      type: "CLUE_COMPLETE",
      deadline,
    };
    this.emit(SocketEvents.CLUE_COMPLETE, message);

    this.timers.postClue = setTimeout(() => {
      this.handleNoBuzz();
    }, GAME_CONFIG.postClueTimeoutSec * 1000);
  }

  // ============================================================================
  // BUZZ + ANSWER PHASE
  // ============================================================================

  handleBuzz(player: PlayerId): void {
    if (this.phase !== "CLUE") return;
    if (this.buzzerState[player] !== "AVAILABLE") return;
    if (this.buzzerState.currentlyAnswering) return;

    this.clearTimer("postClue");

    this.buzzerState[player] = "BUZZED";
    this.buzzerState.currentlyAnswering = player;
    this.buzzerState.answerDeadline = Date.now() + GAME_CONFIG.answerTimeLimitSec * 1000;

    this.phase = "ANSWER";

    const message: BuzzedMessage = {
      type: "BUZZED",
      player,
      answerDeadline: this.buzzerState.answerDeadline,
    };
    this.emit(SocketEvents.BUZZED, message);

    this.timers.answer = setTimeout(() => {
      this.handleAnswerTimeout(player);
    }, GAME_CONFIG.answerTimeLimitSec * 1000);
  }

  handleAnswer(player: PlayerId, text: string): void {
    if (this.phase !== "ANSWER") return;
    if (this.buzzerState.currentlyAnswering !== player) return;

    this.clearTimer("answer");

    const question = this.getCurrentQuestion();
    const normalized = text.trim().toLowerCase();
    const correct = question.acceptedAnswers.includes(normalized);

    this.players[player].answer = text;

    const message: AnswerSubmittedMessage = {
      type: "ANSWER_SUBMITTED",
      player,
      answer: text,
      correct,
    };
    this.emit(SocketEvents.ANSWER_SUBMITTED, message);

    if (correct) {
      this.handleCorrectAnswer(player);
    } else {
      this.handleWrongAnswer(player);
    }
  }

  handleAnswerTyping(player: PlayerId, text: string): void {
    if (this.phase !== "ANSWER") return;
    if (this.buzzerState.currentlyAnswering !== player) return;

    const message = {
      type: "ANSWER_TYPING",
      player,
      text,
    };
    this.emit(SocketEvents.ANSWER_TYPING, message);
  }

  private handleAnswerTimeout(player: PlayerId): void {
    console.log(`[GameRoom ${this.roomId}] Answer timeout for ${player}`);
    this.handleAnswer(player, "");
  }

  private handleCorrectAnswer(player: PlayerId): void {
    // Winner takes the pot
    this.players[player].balance += this.bettingState.pot;
    this.goToResolution(player === "P1" ? "P1_WIN" : "P2_WIN");
  }

  private handleWrongAnswer(player: PlayerId): void {
    this.buzzerState[player] = "FAILED";
    this.buzzerState.currentlyAnswering = null;
    this.buzzerState.answerDeadline = null;

    const otherPlayer = this.getOtherPlayer(player);

    if (this.buzzerState[otherPlayer] === "AVAILABLE") {
      // Other player can still buzz
      this.phase = "CLUE";
      this.resumeClue();
    } else {
      // Both players failed
      this.handleBothWrong();
    }
  }

  private resumeClue(): void {
    const deadline = this.clueState.clueComplete
      ? Date.now() + GAME_CONFIG.postClueTimeoutSec * 1000
      : null;

    const message: ClueResumedMessage = {
      type: "CLUE_RESUMED",
      revealIndex: this.clueState.revealIndex,
      deadline,
    };
    this.emit(SocketEvents.CLUE_RESUMED, message);

    if (!this.clueState.clueComplete) {
      this.startClueReveal();
    } else {
      this.timers.postClue = setTimeout(() => {
        this.handleNoBuzz();
      }, GAME_CONFIG.postClueTimeoutSec * 1000);
    }
  }

  private handleNoBuzz(): void {
    // No one buzzed - pot returned
    this.handleBothWrong();
  }

  private handleBothWrong(): void {
    // Return contributions to each player
    this.players.P1.balance += this.bettingState.contributions.P1;
    this.players.P2.balance += this.bettingState.contributions.P2;
    this.goToResolution("DRAW");
  }

  private handleFoldResolution(folder: PlayerId): void {
    this.goToResolution(folder === "P1" ? "P1_FOLD" : "P2_FOLD");
  }

  // ============================================================================
  // RESOLUTION PHASE
  // ============================================================================

  private goToResolution(outcome: ResolutionOutcome): void {
    this.clearAllTimers();
    this.phase = "RESOLUTION";

    const question = this.getCurrentQuestion();
    const nextPhaseAt = Date.now() + GAME_CONFIG.resolutionDisplaySec * 1000;

    // Calculate per-question change using saved start balance
    const balanceChanges: Record<PlayerId, number> = {
      P1: this.players.P1.balance - this.players.P1.balanceAtQuestionStart,
      P2: this.players.P2.balance - this.players.P2.balanceAtQuestionStart,
    };

    const message: PhaseResolutionMessage = {
      type: "PHASE_RESOLUTION",
      outcome,
      correctAnswer: question.displayAnswer,
      P1Answer: this.players.P1.answer,
      P2Answer: this.players.P2.answer,
      balanceChanges,
      newBalances: {
        P1: this.players.P1.balance,
        P2: this.players.P2.balance,
      },
      nextPhaseAt,
    };

    this.emit(SocketEvents.PHASE_RESOLUTION, message);

    this.timers.resolution = setTimeout(() => {
      this.advanceToNextQuestion();
    }, GAME_CONFIG.resolutionDisplaySec * 1000);
  }

  private advanceToNextQuestion(): void {
    this.questionIndex++;

    if (this.questionIndex >= GAME_CONFIG.questionsPerMatch) {
      this.endGame();
    } else {
      this.startCategoryPhase();
    }
  }

  // ============================================================================
  // GAME COMPLETE
  // ============================================================================

  private endGame(): void {
    this.phase = "COMPLETE";
    this.clearAllTimers();

    let winner: "P1" | "P2" | "TIE";
    if (this.players.P1.balance > this.players.P2.balance) {
      winner = "P1";
    } else if (this.players.P2.balance > this.players.P1.balance) {
      winner = "P2";
    } else {
      winner = "TIE";
    }

    const message: PhaseCompleteMessage = {
      type: "PHASE_COMPLETE",
      winner,
      finalBalances: {
        P1: this.players.P1.balance,
        P2: this.players.P2.balance,
      },
    };

    this.emit(SocketEvents.PHASE_COMPLETE, message);
    console.log(`[GameRoom ${this.roomId}] Game complete. Winner: ${winner}`);
  }

  // ============================================================================
  // CLEANUP
  // ============================================================================

  destroy(): void {
    this.clearAllTimers();
  }
}
