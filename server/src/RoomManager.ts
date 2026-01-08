import { Server, Socket } from "socket.io";
import {
  PlayerId,
  SocketEvents,
  RoomCreatedResponse,
  JoinRoomResponse,
  RoomStateMessage,
  PlayerJoinedMessage,
  GAME_CONFIG,
} from "shared";
import { GameRoom } from "./GameRoom";
import type { AuthenticatedSocket } from "./middleware/auth";

interface PlayerConnection {
  socketId: string;
  playerId: PlayerId;
}

interface Room {
  roomId: string;
  players: Map<PlayerId, PlayerConnection>;
  createdAt: number;
  gameRoom: GameRoom | null;
}

function generateRoomId(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let result = "";
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export class RoomManager {
  private rooms: Map<string, Room> = new Map();
  private socketToRoom: Map<string, string> = new Map();
  private io: Server;

  constructor(io: Server) {
    this.io = io;
  }

  createRoom(socket: Socket): RoomCreatedResponse {
    let roomId = generateRoomId();
    while (this.rooms.has(roomId)) {
      roomId = generateRoomId();
    }

    const room: Room = {
      roomId,
      players: new Map(),
      createdAt: Date.now(),
      gameRoom: null,
    };

    room.players.set("P1", { socketId: socket.id, playerId: "P1" });
    this.rooms.set(roomId, room);
    this.socketToRoom.set(socket.id, roomId);

    socket.join(roomId);

    console.log(`[RoomManager] Room ${roomId} created by ${socket.id} as P1`);

    const roomState: RoomStateMessage = {
      type: "ROOM_STATE",
      roomId,
      you: "P1",
      phase: "WAITING",
      balances: { P1: GAME_CONFIG.startingBalance, P2: GAME_CONFIG.startingBalance },
      foldsRemaining: { P1: GAME_CONFIG.foldsPerPlayer, P2: GAME_CONFIG.foldsPerPlayer },
      questionIndex: 0,
      config: {
        revealRateCharsPerSec: GAME_CONFIG.revealRateCharsPerSec,
        postClueTimeoutSec: GAME_CONFIG.postClueTimeoutSec,
        answerTimeLimitSec: GAME_CONFIG.answerTimeLimitSec,
        categoryRevealSec: GAME_CONFIG.categoryRevealSec,
        betTimeLimitSec: GAME_CONFIG.betTimeLimitSec,
        foldsPerPlayer: GAME_CONFIG.foldsPerPlayer,
      },
      opponentAlias: "Waiting for opponent...",
      opponentElo: 1200,
    };

    socket.emit(SocketEvents.ROOM_STATE, roomState);

    return { roomId, playerId: "P1" };
  }

  joinRoom(socket: Socket, roomId: string): JoinRoomResponse {
    const room = this.rooms.get(roomId.toUpperCase());

    if (!room) {
      console.log(`[RoomManager] Room ${roomId} not found`);
      return { success: false, error: "Room not found" };
    }

    if (room.players.size >= 2) {
      console.log(`[RoomManager] Room ${roomId} is full`);
      return { success: false, error: "Room is full" };
    }

    room.players.set("P2", { socketId: socket.id, playerId: "P2" });
    this.socketToRoom.set(socket.id, room.roomId);

    socket.join(room.roomId);

    console.log(`[RoomManager] ${socket.id} joined room ${room.roomId} as P2`);

    const roomStateP2: RoomStateMessage = {
      type: "ROOM_STATE",
      roomId: room.roomId,
      you: "P2",
      phase: "WAITING",
      balances: { P1: GAME_CONFIG.startingBalance, P2: GAME_CONFIG.startingBalance },
      foldsRemaining: { P1: GAME_CONFIG.foldsPerPlayer, P2: GAME_CONFIG.foldsPerPlayer },
      questionIndex: 0,
      config: {
        revealRateCharsPerSec: GAME_CONFIG.revealRateCharsPerSec,
        postClueTimeoutSec: GAME_CONFIG.postClueTimeoutSec,
        answerTimeLimitSec: GAME_CONFIG.answerTimeLimitSec,
        categoryRevealSec: GAME_CONFIG.categoryRevealSec,
        betTimeLimitSec: GAME_CONFIG.betTimeLimitSec,
        foldsPerPlayer: GAME_CONFIG.foldsPerPlayer,
      },
      opponentAlias: "Loading...",
      opponentElo: 1200,
    };

    socket.emit(SocketEvents.ROOM_STATE, roomStateP2);

    // Notify P1 that P2 joined
    const playerJoinedForP1: PlayerJoinedMessage = {
      type: "PLAYER_JOINED",
      player: "P2",
    };
    socket.to(room.roomId).emit(SocketEvents.PLAYER_JOINED, playerJoinedForP1);

    // Notify P2 that P1 is already connected (so countdown shows for both)
    const playerJoinedForP2: PlayerJoinedMessage = {
      type: "PLAYER_JOINED",
      player: "P1",
    };
    socket.emit(SocketEvents.PLAYER_JOINED, playerJoinedForP2);

    // Both players are now connected - start the game
    this.startGame(room);

    return { success: true, playerId: "P2" };
  }

  private async startGame(room: Room): Promise<void> {
    console.log(`[RoomManager] Starting game in room ${room.roomId}`);
    room.gameRoom = new GameRoom(this.io, room.roomId);

    // Set player database IDs and register sockets from authenticated sockets
    for (const [playerId, connection] of room.players) {
      const socket = this.io.sockets.sockets.get(connection.socketId) as AuthenticatedSocket;
      if (socket?.dbUserId) {
        await room.gameRoom.setPlayerDbId(playerId, socket.dbUserId);
        console.log(`[RoomManager] Set ${playerId} dbUserId: ${socket.dbUserId}`);
      }
      // Register socket for player identity validation
      room.gameRoom.registerSocket(connection.socketId, playerId);
    }

    // Load questions for the match from DB before starting
    try {
      await room.gameRoom.loadQuestions();
      console.log(`[RoomManager] Loaded questions for room ${room.roomId}`);
    } catch (err) {
      console.error(`[RoomManager] Error loading questions for room ${room.roomId}:`, err);
    }

    // Send updated room state with opponent info to both players
    for (const [playerId, connection] of room.players) {
      const socket = this.io.sockets.sockets.get(connection.socketId);
      if (socket) {
        const opponentId: PlayerId = playerId === "P1" ? "P2" : "P1";
        const opponentMetadata = room.gameRoom.getPlayerMetadata(opponentId);

        const roomState: RoomStateMessage = {
          type: "ROOM_STATE",
          roomId: room.roomId,
          you: playerId,
          phase: "WAITING",
          balances: { P1: GAME_CONFIG.startingBalance, P2: GAME_CONFIG.startingBalance },
          foldsRemaining: { P1: GAME_CONFIG.foldsPerPlayer, P2: GAME_CONFIG.foldsPerPlayer },
          questionIndex: 0,
          config: {
            revealRateCharsPerSec: GAME_CONFIG.revealRateCharsPerSec,
            postClueTimeoutSec: GAME_CONFIG.postClueTimeoutSec,
            answerTimeLimitSec: GAME_CONFIG.answerTimeLimitSec,
            categoryRevealSec: GAME_CONFIG.categoryRevealSec,
            betTimeLimitSec: GAME_CONFIG.betTimeLimitSec,
            foldsPerPlayer: GAME_CONFIG.foldsPerPlayer,
          },
          opponentAlias: opponentMetadata?.alias || "Opponent",
          opponentElo: opponentMetadata?.elo || 1200,
        };

        socket.emit(SocketEvents.ROOM_STATE, roomState);
      }
    }

    // Small delay to let the client process room state update
    setTimeout(() => {
      room.gameRoom?.startGame();
    }, 500);
  }

  handleDisconnect(socket: Socket): void {
    const roomId = this.socketToRoom.get(socket.id);
    if (!roomId) return;

    const room = this.rooms.get(roomId);
    if (!room) return;

    let disconnectedPlayer: PlayerId | null = null;
    for (const [playerId, connection] of room.players) {
      if (connection.socketId === socket.id) {
        disconnectedPlayer = playerId;
        room.players.delete(playerId);
        // Unregister socket from game room
        if (room.gameRoom) {
          room.gameRoom.unregisterSocket(socket.id);
        }
        break;
      }
    }

    this.socketToRoom.delete(socket.id);

    console.log(`[RoomManager] ${socket.id} (${disconnectedPlayer}) left room ${roomId}`);

    if (room.players.size === 0) {
      room.gameRoom?.destroy();
      this.rooms.delete(roomId);
      console.log(`[RoomManager] Room ${roomId} deleted (empty)`);
    } else if (disconnectedPlayer) {
      this.io.to(roomId).emit(SocketEvents.PLAYER_LEFT, {
        type: "PLAYER_LEFT",
        player: disconnectedPlayer,
      });
    }
  }

  getRoom(roomId: string): Room | undefined {
    return this.rooms.get(roomId);
  }

  getGameRoom(roomId: string): GameRoom | undefined {
    return this.rooms.get(roomId)?.gameRoom ?? undefined;
  }

  getRoomBySocket(socketId: string): Room | undefined {
    const roomId = this.socketToRoom.get(socketId);
    if (!roomId) return undefined;
    return this.rooms.get(roomId);
  }

  getGameRoomBySocket(socketId: string): GameRoom | undefined {
    return this.getRoomBySocket(socketId)?.gameRoom ?? undefined;
  }

  getPlayerBySocket(socketId: string): PlayerId | undefined {
    const room = this.getRoomBySocket(socketId);
    if (!room) return undefined;

    for (const [playerId, connection] of room.players) {
      if (connection.socketId === socketId) {
        return playerId;
      }
    }
    return undefined;
  }

  isRoomFull(roomId: string): boolean {
    const room = this.rooms.get(roomId);
    return room ? room.players.size === 2 : false;
  }
}
