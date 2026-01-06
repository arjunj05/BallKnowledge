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
import { GameService } from "./services/GameService";
import { UserService } from "./services/UserService";

interface PlayerState {
  balance: number;
  balanceAtQuestionStart: number;
  foldsRemaining: number;
  answer: string | null;
}

interface RoundData {
  roundNumber: number;
  category: string;
  clue: string;
  correctAnswer: string;
  potAmount: number;
  player1Bet: number;
  player2Bet: number;
  player1Answer: string | null;
  player2Answer: string | null;
  player1Correct: boolean | null;
  player2Correct: boolean | null;
  winner: string | null;
  player1BalanceAfter: number;
  player2BalanceAfter: number;
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

  // Database tracking
  private playerDbIds: Record<PlayerId, string | null> = { P1: null, P2: null };
  private playerMetadata: Record<PlayerId, { alias: string; elo: number } | null> = { P1: null, P2: null };
  private roundHistory: RoundData[] = [];
  private currentRoundData: Partial<RoundData> | null = null;

  // Socket tracking for player identity validation
  private socketPlayerMap: Map<string, PlayerId> = new Map();

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
  }

  /**
   * Load questions for this match from the database via GameService.
   * Must be called before `startGame()`.
   */
  async loadQuestions(): Promise<void> {
    const qs = await GameService.getRandomQuestions(GAME_CONFIG.questionsPerMatch);
    // ensure we have a local copy
    this.questions = [...qs];
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

  /**
   * Register a socket ID with a player ID for identity validation
   */
  public registerSocket(socketId: string, player: PlayerId): void {
    this.socketPlayerMap.set(socketId, player);
    console.log(`[GameRoom ${this.roomId}] Registered socket ${socketId} as ${player}`);
  }

  /**
   * Unregister a socket when it disconnects
   */
  public unregisterSocket(socketId: string): void {
    this.socketPlayerMap.delete(socketId);
  }

  /**
   * Validate that the socket making a request matches the expected player
   * @returns The player ID if valid, null if invalid
   */
  private validateSocketPlayer(socketId: string, expectedPlayer: PlayerId): boolean {
    const player = this.socketPlayerMap.get(socketId);
    if (!player) {
      console.error(`[GameRoom ${this.roomId}] Socket ${socketId} not registered to any player`);
      return false;
    }
    if (player !== expectedPlayer) {
      console.error(`[GameRoom ${this.roomId}] Socket ${socketId} is ${player} but tried to act as ${expectedPlayer}`);
      return false;
    }
    return true;
  }

  // ============================================================================
  // GAME START
  // ============================================================================

  async setPlayerDbId(player: PlayerId, dbUserId: string): Promise<void> {
    this.playerDbIds[player] = dbUserId;

    // Fetch player metadata from database using the database ID
    const user = await UserService.getUserById(dbUserId);
    if (user) {
      this.playerMetadata[player] = {
        alias: user.alias || user.username || user.email.split('@')[0],
        elo: user.stats?.eloRating || 1200,
      };
      console.log(`[GameRoom ${this.roomId}] Set ${player} metadata: ${user.alias || user.username || user.email.split('@')[0]} (ELO: ${user.stats?.eloRating || 1200})`);
    }
  }

  getPlayerMetadata(player: PlayerId): { alias: string; elo: number } | null {
    return this.playerMetadata[player];
  }

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

    // Initialize round data tracking
    this.currentRoundData = {
      roundNumber: this.questionIndex,
      category: question.category,
      clue: question.clue,
      correctAnswer: question.displayAnswer,
      player1Answer: null,
      player2Answer: null,
      player1Correct: null,
      player2Correct: null,
    };

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

  handleBet(socketId: string, player: PlayerId, amount: number): void {
    // Validate socket identity
    if (!this.validateSocketPlayer(socketId, player)) {
      return;
    }
    this.handleBetInternal(player, amount);
  }

  private handleBetInternal(player: PlayerId, amount: number): void {
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

  handleMatch(socketId: string, player: PlayerId): void {
    // Validate socket identity
    if (!this.validateSocketPlayer(socketId, player)) {
      return;
    }
    this.handleMatchInternal(player);
  }

  private handleMatchInternal(player: PlayerId): void {
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

  handleRaise(socketId: string, player: PlayerId, amount: number): void {
    // Validate socket identity
    if (!this.validateSocketPlayer(socketId, player)) {
      return;
    }
    this.handleRaiseInternal(player, amount);
  }

  private handleRaiseInternal(player: PlayerId, amount: number): void {
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

  handleFold(socketId: string, player: PlayerId): void {
    // Validate socket identity
    if (!this.validateSocketPlayer(socketId, player)) {
      return;
    }
    this.handleFoldInternal(player);
  }

  private handleFoldInternal(player: PlayerId): void {
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
    // Auto-fold if out of time (internal call, bypass socket validation)
    if (this.players[player].foldsRemaining > 0) {
      this.handleFoldInternal(player);
    } else {
      // If no folds left, auto-match or minimum bet
      const otherBet = this.bettingState.bets[this.getOtherPlayer(player)];
      if (otherBet !== null) {
        this.handleMatchInternal(player);
      } else {
        // First actor with no folds - force minimum bet
        const minBet = GAME_CONFIG.betTiers.find((t) => t <= this.players[player].balance);
        if (minBet) {
          this.handleBetInternal(player, minBet);
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

    // Track betting results for this round
    if (this.currentRoundData) {
      this.currentRoundData.potAmount = this.bettingState.pot;
      this.currentRoundData.player1Bet = this.bettingState.contributions.P1;
      this.currentRoundData.player2Bet = this.bettingState.contributions.P2;
    }

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

  handleBuzz(socketId: string, player: PlayerId): void {
    // Validate socket identity
    if (!this.validateSocketPlayer(socketId, player)) {
      return;
    }
    this.handleBuzzInternal(player);
  }

  private handleBuzzInternal(player: PlayerId): void {
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

  handleAnswer(socketId: string, player: PlayerId, text: string): void {
    // Validate socket identity
    if (!this.validateSocketPlayer(socketId, player)) {
      return;
    }
    this.handleAnswerInternal(player, text);
  }

  private handleAnswerInternal(player: PlayerId, text: string): void {
    if (this.phase !== "ANSWER") return;
    if (this.buzzerState.currentlyAnswering !== player) return;

    this.clearTimer("answer");

    const question = this.getCurrentQuestion();
    const normalized = text.trim().toLowerCase();
    const correct = question.acceptedAnswers.includes(normalized);

    this.players[player].answer = text;

    // Track answer in round data
    if (this.currentRoundData) {
      if (player === "P1") {
        this.currentRoundData.player1Answer = text;
        this.currentRoundData.player1Correct = correct;
      } else {
        this.currentRoundData.player2Answer = text;
        this.currentRoundData.player2Correct = correct;
      }
    }

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

  handleAnswerTyping(socketId: string, player: PlayerId, text: string): void {
    // Validate socket identity
    if (!this.validateSocketPlayer(socketId, player)) {
      return;
    }

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
    this.handleAnswerInternal(player, "");
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

    if (!question) {
      console.error(`[GameRoom ${this.roomId}] Question is undefined at index ${this.questionIndex}`);
      return;
    }

    const nextPhaseAt = Date.now() + GAME_CONFIG.resolutionDisplaySec * 1000;

    // Calculate per-question change using saved start balance
    const balanceChanges: Record<PlayerId, number> = {
      P1: this.players.P1.balance - this.players.P1.balanceAtQuestionStart,
      P2: this.players.P2.balance - this.players.P2.balanceAtQuestionStart,
    };

    // Complete round data and save to history
    if (this.currentRoundData) {
      // Determine winner based on outcome
      let winner: string | null = null;
      if (outcome === "P1_WIN") winner = "P1";
      else if (outcome === "P2_WIN") winner = "P2";
      else if (outcome === "P1_FOLD") winner = "P2";
      else if (outcome === "P2_FOLD") winner = "P1";
      // DRAW means both wrong, winner stays null

      this.currentRoundData.winner = winner;
      this.currentRoundData.player1BalanceAfter = this.players.P1.balance;
      this.currentRoundData.player2BalanceAfter = this.players.P2.balance;

      // Save completed round to history
      this.roundHistory.push(this.currentRoundData as RoundData);
      this.currentRoundData = null;
    }

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

  private async endGame(): Promise<void> {
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

    // Save game to database
    await this.saveGameToDatabase(winner);
  }

  private async saveGameToDatabase(winner: "P1" | "P2" | "TIE"): Promise<void> {
    try {
      const player1DbId = this.playerDbIds.P1;
      const player2DbId = this.playerDbIds.P2;

      // Only save if both players have database IDs
      if (!player1DbId || !player2DbId) {
        console.log(`[GameRoom ${this.roomId}] Skipping game save - missing player database IDs`);
        return;
      }

      // Get current player stats for ELO calculation
      const player1Stats = await UserService.getUserById(player1DbId);
      const player2Stats = await UserService.getUserById(player2DbId);

      if (!player1Stats?.stats || !player2Stats?.stats) {
        console.log(`[GameRoom ${this.roomId}] Skipping game save - missing player stats`);
        return;
      }

      // Calculate ELO changes
      const player1EloChange = GameService.calculateEloChange(
        player1Stats.stats.eloRating,
        player2Stats.stats.eloRating,
        winner === "P1",
        winner === "TIE"
      );
      const player2EloChange = GameService.calculateEloChange(
        player2Stats.stats.eloRating,
        player1Stats.stats.eloRating,
        winner === "P2",
        winner === "TIE"
      );

      // Save game record with all rounds
      const outcome = winner === "TIE" ? "TIE" : winner === "P1" ? "P1_WIN" : "P2_WIN";
      const winnerId = winner === "TIE" ? null : (winner === "P1" ? player1DbId : player2DbId);

      await GameService.createGame(
        player1DbId,
        player2DbId,
        winnerId,
        outcome,
        this.players.P1.balance,
        this.players.P2.balance,
        player1EloChange,
        player2EloChange,
        this.roundHistory
      );

      // Update user statistics
      await this.updatePlayerStats(player1DbId, player1Stats.stats, winner === "P1", winner === "TIE", player1EloChange);
      await this.updatePlayerStats(player2DbId, player2Stats.stats, winner === "P2", winner === "TIE", player2EloChange);

      console.log(`[GameRoom ${this.roomId}] Game saved to database successfully`);
    } catch (error) {
      console.error(`[GameRoom ${this.roomId}] Error saving game to database:`, error);
    }
  }

  private async updatePlayerStats(
    userId: string,
    currentStats: any,
    won: boolean,
    tied: boolean,
    eloChange: number
  ): Promise<void> {
    const questionsAnswered = this.roundHistory.filter(r =>
      (r.player1Answer !== null && userId === this.playerDbIds.P1) ||
      (r.player2Answer !== null && userId === this.playerDbIds.P2)
    ).length;

    const questionsCorrect = this.roundHistory.filter(r =>
      (r.player1Correct === true && userId === this.playerDbIds.P1) ||
      (r.player2Correct === true && userId === this.playerDbIds.P2)
    ).length;

    const finalBalance = userId === this.playerDbIds.P1 ? this.players.P1.balance : this.players.P2.balance;
    const winnings = finalBalance - GAME_CONFIG.startingBalance;

    const newWinStreak = won ? currentStats.winStreak + 1 : 0;

    await UserService.updateUserStats(userId, {
      gamesPlayed: currentStats.gamesPlayed + 1,
      gamesWon: won ? currentStats.gamesWon + 1 : currentStats.gamesWon,
      gamesLost: !won && !tied ? currentStats.gamesLost + 1 : currentStats.gamesLost,
      gamesTied: tied ? currentStats.gamesTied + 1 : currentStats.gamesTied,
      questionsAnswered: currentStats.questionsAnswered + questionsAnswered,
      questionsCorrect: currentStats.questionsCorrect + questionsCorrect,
      questionsIncorrect: currentStats.questionsIncorrect + (questionsAnswered - questionsCorrect),
      totalWinnings: currentStats.totalWinnings + winnings,
      highestBalance: Math.max(currentStats.highestBalance, finalBalance),
      eloRating: currentStats.eloRating + eloChange,
      winStreak: newWinStreak,
      bestWinStreak: Math.max(currentStats.bestWinStreak, newWinStreak),
    });
  }

  // ============================================================================
  // CLEANUP
  // ============================================================================

  destroy(): void {
    this.clearAllTimers();
  }
}
