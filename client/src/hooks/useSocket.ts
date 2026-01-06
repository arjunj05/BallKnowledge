import { useEffect, useState, useCallback } from "react";
import type { Dispatch, SetStateAction } from "react";
import { io } from "socket.io-client";
import type { Socket } from "socket.io-client";
import { useAuth } from "@clerk/clerk-react";
import * as Shared from "shared/dist";
const { SocketEvents } = Shared;
import type {
  PlayerId,
  RoomStateMessage,
  PlayerJoinedMessage,
  PlayerLeftMessage,
  PhaseCategoryMessage,
  PhaseBettingMessage,
  BetPlacedMessage,
  PhaseClueMessage,
  ClueTickMessage,
  ClueCompleteMessage,
  BuzzedMessage,
  AnswerSubmittedMessage,
  AnswerTypingMessage,
  ClueResumedMessage,
  PhaseResolutionMessage,
  PhaseCompleteMessage,
  RoomCreatedResponse,
  JoinRoomResponse,
  ProfileData,
} from "shared";
import type { GameState } from "./useGameState";

let socket: Socket | null = null;

interface UseSocketReturn {
  socket: Socket;
  connected: boolean;
  roomId: string;
  playerId: PlayerId | null;
  opponentConnected: boolean;
  opponentAlias: string;
  opponentElo: number;
  error: string | null;
  profileData: ProfileData | null;
  profileLoading: boolean;
  submittingAnswer: boolean;
  setError: (error: string | null) => void;
  handleCreateRoom: () => void;
  handleJoinRoom: (joinRoomId: string) => void;
  handleBet: (amount: number) => void;
  handleMatch: () => void;
  handleRaise: (amount: number) => void;
  handleFold: () => void;
  handleBuzz: () => void;
  handleSubmitAnswer: (answerInput: string) => void;
  handleTyping: (text: string) => void;
  handleGetProfile: () => void;
  handleUpdateAlias: (newAlias: string) => Promise<void>;
}

export function useSocket(
  setGameState: Dispatch<SetStateAction<GameState>>,
  resetGame: () => void
): UseSocketReturn {
  const { getToken, isSignedIn } = useAuth();
  const [connected, setConnected] = useState(false);
  const [roomId, setRoomId] = useState<string>("");
  const [playerId, setPlayerId] = useState<PlayerId | null>(null);
  const [opponentConnected, setOpponentConnected] = useState(false);
  const [opponentAlias, setOpponentAlias] = useState<string>("");
  const [opponentElo, setOpponentElo] = useState<number>(1200);
  const [error, setError] = useState<string | null>(null);
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [submittingAnswer, setSubmittingAnswer] = useState(false);

  useEffect(() => {
    if (!isSignedIn) {
      if (socket) {
        socket.disconnect();
        socket = null;
      }
      return;
    }

    const initSocket = async () => {
      const token = await getToken();

      if (!socket) {
        const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";
        console.log("[Socket] Connecting to:", API_URL);

        socket = io(API_URL, {
          auth: {
            token
          }
        });
      }

      socket.on("connect", () => {
        console.log("[Socket] Connected:", socket!.id);
        setConnected(true);
      });

    socket.on("disconnect", () => {
      console.log("[Socket] Disconnected");
      setConnected(false);
      resetGame();
    });

    socket.on(SocketEvents.ROOM_STATE, (data: RoomStateMessage) => {
      console.log("[Socket] Room state:", data);
      setRoomId(data.roomId);
      setPlayerId(data.you);
      setOpponentAlias(data.opponentAlias);
      setOpponentElo(data.opponentElo);
      setGameState((prev) => ({
        ...prev,
        phase: data.phase,
        balances: data.balances,
        foldsRemaining: data.foldsRemaining,
        questionIndex: data.questionIndex,
      }));
    });

    socket.on(SocketEvents.PLAYER_JOINED, (data: PlayerJoinedMessage) => {
      console.log("[Socket] Player joined:", data.player);
      setOpponentConnected(true);
    });

    socket.on(SocketEvents.PLAYER_LEFT, (data: PlayerLeftMessage) => {
      console.log("[Socket] Player left:", data.player);
      setOpponentConnected(false);
    });

    socket.on(SocketEvents.PHASE_CATEGORY, (data: PhaseCategoryMessage) => {
      console.log("[Socket] Phase category:", data);
      setGameState((prev) => ({
        ...prev,
        phase: "CATEGORY",
        questionIndex: data.questionIndex,
        category: data.category,
        deadline: data.endsAt,
        pot: 0,
        clue: "",
        revealIndex: 0,
        lastOutcome: null,
      }));
    });

    socket.on(SocketEvents.PHASE_BETTING, (data: PhaseBettingMessage) => {
      console.log("[Socket] Phase betting:", data);
      setGameState((prev) => ({
        ...prev,
        phase: "BETTING",
        awaitingAction: data.awaitingAction,
        availableActions: data.availableActions,
        betOptions: data.betOptions,
        currentBet: data.currentBet,
        pot: data.pot,
        deadline: data.deadline,
      }));
    });

    socket.on(SocketEvents.BET_PLACED, (data: BetPlacedMessage) => {
      console.log("[Socket] Bet placed:", data);
      setGameState((prev) => ({
        ...prev,
        pot: data.pot,
        awaitingAction: data.awaitingAction,
        availableActions: data.availableActions,
        currentBet: data.currentBet,
        deadline: data.deadline,
      }));
    });

    socket.on(SocketEvents.PHASE_CLUE, (data: PhaseClueMessage) => {
      console.log("[Socket] Phase clue:", data);
      setGameState((prev) => ({
        ...prev,
        phase: "CLUE",
        clue: data.clue,
        revealIndex: 0,
        pot: data.pot,
        deadline: null,
        currentlyAnswering: null,
        answerDeadline: null,
        opponentTyping: null,
      }));
    });

    socket.on(SocketEvents.CLUE_TICK, (data: ClueTickMessage) => {
      setGameState((prev) => ({
        ...prev,
        revealIndex: data.revealIndex,
      }));
    });

    socket.on(SocketEvents.CLUE_COMPLETE, (data: ClueCompleteMessage) => {
      console.log("[Socket] Clue complete:", data);
      setGameState((prev) => ({
        ...prev,
        deadline: data.deadline,
      }));
    });

    socket.on(SocketEvents.BUZZED, (data: BuzzedMessage) => {
      console.log("[Socket] Buzzed:", data);
      setGameState((prev) => ({
        ...prev,
        phase: "ANSWER",
        currentlyAnswering: data.player,
        answerDeadline: data.answerDeadline,
        deadline: null,
      }));
    });

    socket.on(SocketEvents.ANSWER_SUBMITTED, (data: AnswerSubmittedMessage) => {
      console.log("[Socket] Answer submitted:", data);
    });

    socket.on(SocketEvents.ANSWER_TYPING, (data: AnswerTypingMessage) => {
      setGameState((prev) => ({
        ...prev,
        opponentTyping: data.player !== playerId ? data.text : prev.opponentTyping,
      }));
    });

    socket.on(SocketEvents.CLUE_RESUMED, (data: ClueResumedMessage) => {
      console.log("[Socket] Clue resumed:", data);
      setGameState((prev) => ({
        ...prev,
        phase: "CLUE",
        revealIndex: data.revealIndex,
        deadline: data.deadline,
        currentlyAnswering: null,
        answerDeadline: null,
        opponentTyping: null,
      }));
    });

    socket.on(SocketEvents.PHASE_RESOLUTION, (data: PhaseResolutionMessage) => {
      console.log("[Socket] Phase resolution:", data);
      setSubmittingAnswer(false); // Clear submitting state when answer is processed
      setGameState((prev) => ({
        ...prev,
        phase: "RESOLUTION",
        balances: data.newBalances,
        deadline: data.nextPhaseAt,
        lastOutcome: {
          outcome: data.outcome,
          correctAnswer: data.correctAnswer,
          P1Answer: data.P1Answer,
          P2Answer: data.P2Answer,
          balanceChanges: data.balanceChanges,
        },
        currentlyAnswering: null,
        answerDeadline: null,
      }));
    });

    socket.on(SocketEvents.PHASE_COMPLETE, (data: PhaseCompleteMessage) => {
      console.log("[Socket] Phase complete:", data);
      setGameState((prev) => ({
        ...prev,
        phase: "COMPLETE",
        winner: data.winner,
        finalBalances: data.finalBalances,
        deadline: null,
      }));
    });

    socket.on(SocketEvents.PROFILE_DATA, (data: ProfileData) => {
      console.log("[Socket] Profile data received:", data);
      setProfileData(data);
      setProfileLoading(false);
    });

    socket.on(SocketEvents.ALIAS_UPDATED, (data: { alias: string }) => {
      console.log("[Socket] Alias updated:", data.alias);
      setProfileData((prev) => prev ? { ...prev, alias: data.alias } : null);
    });

    };

    initSocket();

    return () => {
      if (socket) {
        socket.off("connect");
        socket.off("disconnect");
        socket.off(SocketEvents.ROOM_STATE);
        socket.off(SocketEvents.PLAYER_JOINED);
        socket.off(SocketEvents.PLAYER_LEFT);
        socket.off(SocketEvents.PHASE_CATEGORY);
        socket.off(SocketEvents.PHASE_BETTING);
        socket.off(SocketEvents.BET_PLACED);
        socket.off(SocketEvents.PHASE_CLUE);
        socket.off(SocketEvents.CLUE_TICK);
        socket.off(SocketEvents.CLUE_COMPLETE);
        socket.off(SocketEvents.BUZZED);
        socket.off(SocketEvents.ANSWER_SUBMITTED);
        socket.off(SocketEvents.ANSWER_TYPING);
        socket.off(SocketEvents.CLUE_RESUMED);
        socket.off(SocketEvents.PHASE_RESOLUTION);
        socket.off(SocketEvents.PHASE_COMPLETE);
        socket.off(SocketEvents.PROFILE_DATA);
        socket.off(SocketEvents.ALIAS_UPDATED);

        // Disconnect socket to prevent memory leaks
        socket.disconnect();
        socket = null;
      }
    };
  }, [setGameState, resetGame, isSignedIn, getToken]);

  const handleCreateRoom = useCallback(() => {
    if (!socket) return;
    setError(null);
    socket.emit(SocketEvents.CREATE_ROOM, (response: RoomCreatedResponse) => {
      console.log("[Socket] Room created:", response);
    });
  }, []);

  const handleJoinRoom = useCallback((joinRoomId: string) => {
    if (!socket) return;
    if (!joinRoomId.trim()) {
      setError("Please enter a room code");
      return;
    }
    setError(null);
    socket.emit(
      SocketEvents.JOIN_ROOM,
      { roomId: joinRoomId.toUpperCase() },
      (response: JoinRoomResponse) => {
        console.log("[Socket] Join response:", response);
        if (!response.success) {
          setError(response.error || "Failed to join room");
        }
      }
    );
  }, []);

  const handleBet = useCallback((amount: number) => {
    if (!socket) return;
    socket.emit(SocketEvents.BET, { amount });
  }, []);

  const handleMatch = useCallback(() => {
    if (!socket) return;
    socket.emit(SocketEvents.MATCH);
  }, []);

  const handleRaise = useCallback((amount: number) => {
    if (!socket) return;
    socket.emit(SocketEvents.RAISE, { amount });
  }, []);

  const handleFold = useCallback(() => {
    if (!socket) return;
    socket.emit(SocketEvents.FOLD);
  }, []);

  const handleBuzz = useCallback(() => {
    if (!socket) return;
    socket.emit(SocketEvents.BUZZ);
  }, []);

  const handleSubmitAnswer = useCallback((answerInput: string) => {
    if (!socket) return;
    if (answerInput.trim()) {
      setSubmittingAnswer(true);
      socket.emit(SocketEvents.ANSWER, { text: answerInput.trim() });
    }
  }, []);

  const handleTyping = useCallback((text: string) => {
    if (!socket) return;
    socket.emit(SocketEvents.ANSWER_TYPING, { text });
  }, []);

  const handleGetProfile = useCallback(() => {
    if (!socket) return;
    setProfileLoading(true);
    socket.emit(SocketEvents.GET_PROFILE);
  }, []);

  const handleUpdateAlias = useCallback(async (newAlias: string): Promise<void> => {
    if (!socket) return Promise.reject(new Error("Not connected"));

    return new Promise((resolve, reject) => {
      socket!.emit(SocketEvents.UPDATE_ALIAS, { alias: newAlias }, (response: { success: boolean; error?: string }) => {
        if (response.success) {
          resolve();
        } else {
          reject(new Error(response.error || "Failed to update alias"));
        }
      });
    });
  }, []);

  return {
    socket: socket!,
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
    setError,
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
  };
}
