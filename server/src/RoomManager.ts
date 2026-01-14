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
import { GameRoom } from "./GameRoom.js";
import type { AuthenticatedSocket } from "./middleware/auth.js";

interface PlayerConnection {
  socketId: string | null; // null when disconnected
  playerId: PlayerId;
  dbUserId: string; // Database user ID for identity validation
  connected: boolean;
}

interface Room {
  roomId: string;
  players: Map<PlayerId, PlayerConnection>;
  createdAt: number;
  gameRoom: GameRoom | null;
  gameStarted: boolean;
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
  private userToRoom: Map<string, string> = new Map(); // dbUserId -> roomId for quick lookup
  private io: Server;

  constructor(io: Server) {
    this.io = io;
  }

  createRoom(socket: Socket): RoomCreatedResponse {
    const authSocket = socket as AuthenticatedSocket;
    const dbUserId = authSocket.dbUserId;

    if (!dbUserId) {
      console.log(`[RoomManager] Cannot create room - user not authenticated`);
      return { roomId: "", playerId: "P1", error: "Not authenticated" };
    }

    // Check if user is already in a room
    const existingRoomId = this.userToRoom.get(dbUserId);
    if (existingRoomId) {
      const existingRoom = this.rooms.get(existingRoomId);
      if (existingRoom) {
        // User is already in a game - attempt to rejoin
        console.log(`[RoomManager] User ${dbUserId} already in room ${existingRoomId}, attempting rejoin`);
        const rejoinResult = this.rejoinRoom(socket, existingRoomId);
        if (rejoinResult.success) {
          return { roomId: existingRoomId, playerId: rejoinResult.playerId! };
        }
      }
    }

    let roomId = generateRoomId();
    while (this.rooms.has(roomId)) {
      roomId = generateRoomId();
    }

    const room: Room = {
      roomId,
      players: new Map(),
      createdAt: Date.now(),
      gameRoom: null,
      gameStarted: false,
    };

    room.players.set("P1", {
      socketId: socket.id,
      playerId: "P1",
      dbUserId,
      connected: true,
    });
    this.rooms.set(roomId, room);
    this.socketToRoom.set(socket.id, roomId);
    this.userToRoom.set(dbUserId, roomId);

    socket.join(roomId);

    console.log(`[RoomManager] Room ${roomId} created by ${socket.id} (user: ${dbUserId}) as P1`);

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
    const authSocket = socket as AuthenticatedSocket;
    const dbUserId = authSocket.dbUserId;

    if (!dbUserId) {
      console.log(`[RoomManager] Cannot join room - user not authenticated`);
      return { success: false, error: "Not authenticated" };
    }

    const room = this.rooms.get(roomId.toUpperCase());

    if (!room) {
      console.log(`[RoomManager] Room ${roomId} not found`);
      return { success: false, error: "Room not found" };
    }

    // Check if this user is already in this room (rejoin case)
    for (const [playerId, connection] of room.players) {
      if (connection.dbUserId === dbUserId) {
        console.log(`[RoomManager] User ${dbUserId} rejoining room ${roomId} as ${playerId}`);
        return this.rejoinRoom(socket, room.roomId);
      }
    }

    // Check for self-play: is the joining user the same as P1?
    const p1Connection = room.players.get("P1");
    if (p1Connection && p1Connection.dbUserId === dbUserId) {
      console.log(`[RoomManager] Self-play rejected: user ${dbUserId} tried to join own game`);
      return { success: false, error: "Cannot play against yourself" };
    }

    // Check if game already started - only allow rejoins, not new players
    if (room.gameStarted) {
      // Check if P2 slot exists and is reserved for someone else
      const p2Connection = room.players.get("P2");
      if (p2Connection && p2Connection.dbUserId !== dbUserId) {
        console.log(`[RoomManager] Room ${roomId} game in progress, slot reserved for original player`);
        return { success: false, error: "Game in progress - only original players can rejoin" };
      }
    }

    // Check if room is full (both players connected)
    const connectedPlayers = Array.from(room.players.values()).filter(p => p.connected);
    if (connectedPlayers.length >= 2) {
      console.log(`[RoomManager] Room ${roomId} is full`);
      return { success: false, error: "Room is full" };
    }

    // Check if user is already in another room
    const existingRoomId = this.userToRoom.get(dbUserId);
    if (existingRoomId && existingRoomId !== room.roomId) {
      console.log(`[RoomManager] User ${dbUserId} already in room ${existingRoomId}`);
      return { success: false, error: "Already in another game" };
    }

    // New player joining as P2
    room.players.set("P2", {
      socketId: socket.id,
      playerId: "P2",
      dbUserId,
      connected: true,
    });
    this.socketToRoom.set(socket.id, room.roomId);
    this.userToRoom.set(dbUserId, room.roomId);

    socket.join(room.roomId);

    console.log(`[RoomManager] ${socket.id} (user: ${dbUserId}) joined room ${room.roomId} as P2`);

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

  private rejoinRoom(socket: Socket, roomId: string): JoinRoomResponse {
    const authSocket = socket as AuthenticatedSocket;
    const dbUserId = authSocket.dbUserId;

    if (!dbUserId) {
      return { success: false, error: "Not authenticated" };
    }

    const room = this.rooms.get(roomId);
    if (!room) {
      return { success: false, error: "Room not found" };
    }

    // Find which player slot belongs to this user
    let playerSlot: PlayerId | null = null;
    for (const [playerId, connection] of room.players) {
      if (connection.dbUserId === dbUserId) {
        playerSlot = playerId;
        break;
      }
    }

    if (!playerSlot) {
      return { success: false, error: "Not a member of this game" };
    }

    const connection = room.players.get(playerSlot)!;

    // Update connection with new socket
    connection.socketId = socket.id;
    connection.connected = true;

    this.socketToRoom.set(socket.id, roomId);
    socket.join(roomId);

    // Re-register socket with game room
    if (room.gameRoom) {
      room.gameRoom.registerSocket(socket.id, playerSlot);
    }

    console.log(`[RoomManager] User ${dbUserId} rejoined room ${roomId} as ${playerSlot}`);

    // Send current game state to the reconnecting player
    if (room.gameRoom && room.gameStarted) {
      const opponentId: PlayerId = playerSlot === "P1" ? "P2" : "P1";
      const opponentMetadata = room.gameRoom.getPlayerMetadata(opponentId);
      const gameState = room.gameRoom.getFullGameState();

      const roomState: RoomStateMessage = {
        type: "ROOM_STATE",
        roomId: room.roomId,
        you: playerSlot,
        phase: gameState.phase,
        balances: gameState.balances,
        foldsRemaining: gameState.foldsRemaining,
        questionIndex: gameState.questionIndex,
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
        // Include additional state for mid-game rejoin
        currentState: gameState,
      };

      socket.emit(SocketEvents.ROOM_STATE, roomState);

      // Notify other player that this player reconnected
      const opponentConnection = room.players.get(opponentId);
      if (opponentConnection?.connected && opponentConnection.socketId) {
        this.io.to(opponentConnection.socketId).emit(SocketEvents.PLAYER_JOINED, {
          type: "PLAYER_JOINED",
          player: playerSlot,
        });
      }
    } else {
      // Game not started yet - send waiting state
      const roomState: RoomStateMessage = {
        type: "ROOM_STATE",
        roomId: room.roomId,
        you: playerSlot,
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
    }

    return { success: true, playerId: playerSlot };
  }

  private async startGame(room: Room): Promise<void> {
    console.log(`[RoomManager] Starting game in room ${room.roomId}`);
    room.gameRoom = new GameRoom(this.io, room.roomId);
    room.gameStarted = true;

    // Set player database IDs and register sockets from authenticated sockets
    for (const [playerId, connection] of room.players) {
      if (connection.dbUserId) {
        await room.gameRoom.setPlayerDbId(playerId, connection.dbUserId);
        console.log(`[RoomManager] Set ${playerId} dbUserId: ${connection.dbUserId}`);
      }
      // Register socket for player identity validation
      if (connection.socketId) {
        room.gameRoom.registerSocket(connection.socketId, playerId);
      }
    }

    // Load questions for the match from DB before starting
    try {
      await room.gameRoom.loadQuestions();
      console.log(`[RoomManager] Loaded questions for room ${room.roomId}`);
    } catch (err) {
      console.error(`[RoomManager] Error loading questions for room ${room.roomId}:`, err);
      // Notify both players of the error and clean up the room
      this.io.to(room.roomId).emit(SocketEvents.ERROR, {
        code: "QUESTION_LOAD_FAILED",
        message: "Failed to load questions. Please try again.",
      });
      // Clean up the room
      for (const [, connection] of room.players) {
        if (connection.socketId) {
          const socket = this.io.sockets.sockets.get(connection.socketId);
          if (socket) {
            socket.leave(room.roomId);
          }
          this.socketToRoom.delete(connection.socketId);
        }
        this.userToRoom.delete(connection.dbUserId);
      }
      room.gameRoom?.destroy();
      this.rooms.delete(room.roomId);
      console.log(`[RoomManager] Room ${room.roomId} cleaned up due to question load failure`);
      return;
    }

    // Send updated room state with opponent info to both players
    for (const [playerId, connection] of room.players) {
      if (connection.socketId) {
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
    let disconnectedUserId: string | null = null;

    for (const [playerId, connection] of room.players) {
      if (connection.socketId === socket.id) {
        disconnectedPlayer = playerId;
        disconnectedUserId = connection.dbUserId;

        // Mark as disconnected but keep the slot reserved
        connection.socketId = null;
        connection.connected = false;

        // Unregister socket from game room
        if (room.gameRoom) {
          room.gameRoom.unregisterSocket(socket.id);
        }
        break;
      }
    }

    // Clean up Socket.IO room membership
    socket.leave(roomId);
    this.socketToRoom.delete(socket.id);

    console.log(`[RoomManager] ${socket.id} (${disconnectedPlayer}, user: ${disconnectedUserId}) disconnected from room ${roomId}`);

    // Check if both players are disconnected
    const connectedPlayers = Array.from(room.players.values()).filter(p => p.connected);

    if (connectedPlayers.length === 0 && !room.gameStarted) {
      // No game started and no one connected - clean up
      for (const [, connection] of room.players) {
        this.userToRoom.delete(connection.dbUserId);
      }
      room.gameRoom?.destroy();
      this.rooms.delete(roomId);
      console.log(`[RoomManager] Room ${roomId} deleted (no players, game not started)`);
    } else if (disconnectedPlayer) {
      // Notify remaining player that opponent disconnected
      this.io.to(roomId).emit(SocketEvents.PLAYER_LEFT, {
        type: "PLAYER_LEFT",
        player: disconnectedPlayer,
      });
    }
  }

  /**
   * Clean up a room completely (called when game ends)
   */
  cleanupRoom(roomId: string): void {
    const room = this.rooms.get(roomId);
    if (!room) return;

    for (const [, connection] of room.players) {
      if (connection.socketId) {
        this.socketToRoom.delete(connection.socketId);
      }
      this.userToRoom.delete(connection.dbUserId);
    }

    room.gameRoom?.destroy();
    this.rooms.delete(roomId);
    console.log(`[RoomManager] Room ${roomId} cleaned up after game end`);
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
    if (!room) return false;
    const connectedPlayers = Array.from(room.players.values()).filter(p => p.connected);
    return connectedPlayers.length === 2;
  }

  /**
   * Get room by user's database ID
   */
  getRoomByUserId(dbUserId: string): Room | undefined {
    const roomId = this.userToRoom.get(dbUserId);
    if (!roomId) return undefined;
    return this.rooms.get(roomId);
  }

  /**
   * Auto-rejoin a user to their active game on socket connection
   * Called when server detects user has an active game
   */
  autoRejoin(socket: Socket, roomId: string): void {
    const result = this.rejoinRoom(socket, roomId);
    if (result.success) {
      console.log(`[RoomManager] Auto-rejoin successful for room ${roomId}`);
    } else {
      console.log(`[RoomManager] Auto-rejoin failed for room ${roomId}: ${result.error}`);
    }
  }
}
