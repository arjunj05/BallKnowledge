// ============================================================================
// GAME CONSTANTS
// ============================================================================

export const GAME_CONFIG = {
  startingBalance: 500,
  questionsPerMatch: 3,
  revealRateCharsPerSec: 12,
  postClueTimeoutSec: 5,
  answerTimeLimitSec: 5,
  categoryRevealSec: 3,
  betTimeLimitSec: 15,
  foldsPerPlayer: 2,
  betTiers: [5, 10, 25, 50, 100] as const,
  clueTickIntervalMs: 500,
  resolutionDisplaySec: 3,
} as const;

// ============================================================================
// CORE TYPES
// ============================================================================

export type PlayerId = "P1" | "P2";

export type GamePhase =
  | "WAITING"
  | "CATEGORY"
  | "BETTING"
  | "CLUE"
  | "ANSWER"
  | "RESOLUTION"
  | "COMPLETE";

export type BuzzerState = "AVAILABLE" | "BUZZED" | "FAILED";

export type BetAction = "BET" | "MATCH" | "RAISE" | "FOLD";

export type ResolutionOutcome =
  | "P1_WIN"
  | "P2_WIN"
  | "DRAW"
  | "P1_FOLD"
  | "P2_FOLD";

export type MatchResult = "P1" | "P2" | "TIE";

// ============================================================================
// QUESTION DATA
// ============================================================================

export interface Question {
  id: string;
  category: string;
  clue: string;
  acceptedAnswers: string[];
  displayAnswer: string;
}

// ============================================================================
// GAME STATE (Server-side, shared for reference)
// ============================================================================

export interface BettingState {
  firstActor: PlayerId;
  bets: Record<PlayerId, number | null>;
  contributions: Record<PlayerId, number>;
  raises: number;
  awaitingAction: PlayerId | null;
  pot: number;
}

export interface ClueState {
  revealIndex: number;
  clueComplete: boolean;
  clueCompleteAt: number | null;
}

export interface BuzzerStateMap {
  P1: BuzzerState;
  P2: BuzzerState;
  currentlyAnswering: PlayerId | null;
  answerDeadline: number | null;
}

export interface RoomConfig {
  revealRateCharsPerSec: number;
  postClueTimeoutSec: number;
  answerTimeLimitSec: number;
  categoryRevealSec: number;
  betTimeLimitSec: number;
  foldsPerPlayer: number;
}

// ============================================================================
// SERVER -> CLIENT MESSAGES
// ============================================================================

export interface RoomStateMessage {
  type: "ROOM_STATE";
  roomId: string;
  you: PlayerId;
  phase: GamePhase;
  balances: Record<PlayerId, number>;
  foldsRemaining: Record<PlayerId, number>;
  questionIndex: number;
  config: RoomConfig;
  opponentAlias: string;
  opponentElo: number;
}

export interface PlayerJoinedMessage {
  type: "PLAYER_JOINED";
  player: PlayerId;
}

export interface PlayerLeftMessage {
  type: "PLAYER_LEFT";
  player: PlayerId;
}

export interface PhaseCategoryMessage {
  type: "PHASE_CATEGORY";
  questionIndex: number;
  category: string;
  endsAt: number;
}

export interface PhaseBettingMessage {
  type: "PHASE_BETTING";
  firstActor: PlayerId;
  awaitingAction: PlayerId;
  availableActions: BetAction[];
  betOptions: number[];
  currentBet: number | null;
  pot: number;
  deadline: number;
}

export interface PhaseClueMessage {
  type: "PHASE_CLUE";
  clue: string;
  revealRate: number;
  pot: number;
}

export interface PhaseResolutionMessage {
  type: "PHASE_RESOLUTION";
  outcome: ResolutionOutcome;
  correctAnswer: string;
  P1Answer: string | null;
  P2Answer: string | null;
  balanceChanges: Record<PlayerId, number>;
  newBalances: Record<PlayerId, number>;
  nextPhaseAt: number;
}

export interface PhaseCompleteMessage {
  type: "PHASE_COMPLETE";
  winner: MatchResult;
  finalBalances: Record<PlayerId, number>;
}

export interface BetPlacedMessage {
  type: "BET_PLACED";
  player: PlayerId;
  action: BetAction;
  amount: number;
  pot: number;
  awaitingAction: PlayerId | null;
  availableActions: BetAction[];
  currentBet: number | null;
  deadline: number | null;
}

export interface ClueTickMessage {
  type: "CLUE_TICK";
  revealIndex: number;
}

export interface ClueCompleteMessage {
  type: "CLUE_COMPLETE";
  deadline: number;
}

export interface BuzzedMessage {
  type: "BUZZED";
  player: PlayerId;
  answerDeadline: number;
}

export interface AnswerSubmittedMessage {
  type: "ANSWER_SUBMITTED";
  player: PlayerId;
  answer: string;
  correct: boolean;
}

export interface AnswerTypingMessage {
  type: "ANSWER_TYPING";
  player: PlayerId;
  text: string;
}

export interface ClueResumedMessage {
  type: "CLUE_RESUMED";
  revealIndex: number;
  deadline: number | null;
}

export interface ErrorMessage {
  type: "ERROR";
  code: string;
  message: string;
}

export type ServerToClientMessage =
  | RoomStateMessage
  | PlayerJoinedMessage
  | PlayerLeftMessage
  | PhaseCategoryMessage
  | PhaseBettingMessage
  | PhaseClueMessage
  | PhaseResolutionMessage
  | PhaseCompleteMessage
  | BetPlacedMessage
  | ClueTickMessage
  | ClueCompleteMessage
  | BuzzedMessage
  | AnswerSubmittedMessage
  | AnswerTypingMessage
  | ClueResumedMessage
  | ErrorMessage;

// ============================================================================
// CLIENT -> SERVER MESSAGES
// ============================================================================

export interface JoinRoomMessage {
  type: "JOIN_ROOM";
  roomId: string;
  playerId: string;
}

export interface CreateRoomMessage {
  type: "CREATE_ROOM";
  playerId: string;
}

export interface BetMessage {
  type: "BET";
  amount: number;
}

export interface MatchMessage {
  type: "MATCH";
}

export interface RaiseMessage {
  type: "RAISE";
  amount: number;
}

export interface FoldMessage {
  type: "FOLD";
}

export interface BuzzMessage {
  type: "BUZZ";
}

export interface AnswerMessage {
  type: "ANSWER";
  text: string;
}

export interface AnswerTypingClientMessage {
  type: "ANSWER_TYPING";
  text: string;
}

export type ClientToServerMessage =
  | JoinRoomMessage
  | CreateRoomMessage
  | BetMessage
  | MatchMessage
  | RaiseMessage
  | FoldMessage
  | BuzzMessage
  | AnswerMessage
  | AnswerTypingClientMessage;

// ============================================================================
// SOCKET EVENT NAMES
// ============================================================================

export const SocketEvents = {
  // Client -> Server
  CREATE_ROOM: "create_room",
  JOIN_ROOM: "join_room",
  BET: "bet",
  MATCH: "match",
  RAISE: "raise",
  FOLD: "fold",
  BUZZ: "buzz",
  ANSWER: "answer",
  ANSWER_TYPING: "answer_typing",
  GET_PROFILE: "get_profile",
  UPDATE_ALIAS: "update_alias",

  // Server -> Client
  ROOM_STATE: "room_state",
  PLAYER_JOINED: "player_joined",
  PLAYER_LEFT: "player_left",
  PHASE_CATEGORY: "phase_category",
  PHASE_BETTING: "phase_betting",
  PHASE_CLUE: "phase_clue",
  PHASE_RESOLUTION: "phase_resolution",
  PHASE_COMPLETE: "phase_complete",
  BET_PLACED: "bet_placed",
  CLUE_TICK: "clue_tick",
  CLUE_COMPLETE: "clue_complete",
  BUZZED: "buzzed",
  ANSWER_SUBMITTED: "answer_submitted",
  CLUE_RESUMED: "clue_resumed",
  ERROR: "error",
  PROFILE_DATA: "profile_data",
  ALIAS_UPDATED: "alias_updated",
} as const;

// ============================================================================
// HELPER TYPES
// ============================================================================

export interface RoomCreatedResponse {
  roomId: string;
  playerId: PlayerId;
}

export interface JoinRoomResponse {
  success: boolean;
  playerId?: PlayerId;
  error?: string;
}

export interface ProfileData {
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
