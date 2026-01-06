import "dotenv/config";
import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import cors from "cors";
import { SocketEvents, type ProfileData } from "shared";
import { RoomManager } from "./RoomManager";
import { authenticateSocket, type AuthenticatedSocket } from "./middleware/auth";
import { requireAdmin } from "./middleware/adminAuth";
import { UserService } from "./services/UserService";
import { rateLimiter, RATE_LIMITS } from "./middleware/rateLimiter";
import {
  validatePayload,
  BetSchema,
  RaiseSchema,
  AnswerSchema,
  AnswerTypingSchema,
  JoinRoomSchema,
  UpdateAliasSchema,
} from "./validation/socketSchemas";
import adminRouter from "./routes/admin";

const app = express();

// CORS configuration for REST API
const CORS_ORIGIN = process.env.CORS_ORIGIN || "http://localhost:5173";
app.use(cors({ origin: CORS_ORIGIN }));
app.use(express.json()); // Parse JSON request bodies for REST API

const httpServer = createServer(app);

// CORS configuration for Socket.IO
const io = new Server(httpServer, {
  cors: {
    origin: CORS_ORIGIN,
    methods: ["GET", "POST"],
  },
});

// Apply authentication middleware
io.use(authenticateSocket);

const PORT = process.env.PORT || 3001;

const roomManager = new RoomManager(io);

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

// Admin API routes (protected by requireAdmin middleware)
app.use("/api/admin", requireAdmin, adminRouter);

io.on("connection", (socket) => {
  console.log(`[Socket] Client connected: ${socket.id}`);

  // Room management
  socket.on(SocketEvents.CREATE_ROOM, (callback) => {
    const result = roomManager.createRoom(socket);
    callback(result);
  });

  socket.on(SocketEvents.JOIN_ROOM, (data: { roomId: string }, callback) => {
    // Rate limiting
    if (!rateLimiter.checkLimit(socket.id, RATE_LIMITS.ROOM_ACTION.maxRequests, RATE_LIMITS.ROOM_ACTION.windowMs)) {
      console.log(`[RateLimit] JOIN_ROOM blocked for ${socket.id}`);
      callback({ success: false, error: "Too many requests. Please slow down." });
      return;
    }

    // Input validation
    const validation = validatePayload(JoinRoomSchema, data);
    if (!validation.success) {
      console.log(`[Validation] JOIN_ROOM failed for ${socket.id}: ${validation.error}`);
      callback({ success: false, error: "Invalid room code" });
      return;
    }

    const result = roomManager.joinRoom(socket, validation.data.roomId);
    callback(result);
  });

  // Betting actions
  socket.on(SocketEvents.BET, (data: { amount: number }) => {
    // Rate limiting
    if (!rateLimiter.checkLimit(socket.id, RATE_LIMITS.GAME_ACTION.maxRequests, RATE_LIMITS.GAME_ACTION.windowMs)) {
      console.log(`[RateLimit] BET blocked for ${socket.id}`);
      return;
    }

    // Input validation
    const validation = validatePayload(BetSchema, data);
    if (!validation.success) {
      console.log(`[Validation] BET failed for ${socket.id}: ${validation.error}`);
      return;
    }

    const gameRoom = roomManager.getGameRoomBySocket(socket.id);
    const player = roomManager.getPlayerBySocket(socket.id);
    if (gameRoom && player) {
      gameRoom.handleBet(socket.id, player, validation.data.amount);
    }
  });

  socket.on(SocketEvents.MATCH, () => {
    // Rate limiting
    if (!rateLimiter.checkLimit(socket.id, RATE_LIMITS.GAME_ACTION.maxRequests, RATE_LIMITS.GAME_ACTION.windowMs)) {
      console.log(`[RateLimit] MATCH blocked for ${socket.id}`);
      return;
    }

    const gameRoom = roomManager.getGameRoomBySocket(socket.id);
    const player = roomManager.getPlayerBySocket(socket.id);
    if (gameRoom && player) {
      gameRoom.handleMatch(socket.id, player);
    }
  });

  socket.on(SocketEvents.RAISE, (data: { amount: number }) => {
    // Rate limiting
    if (!rateLimiter.checkLimit(socket.id, RATE_LIMITS.GAME_ACTION.maxRequests, RATE_LIMITS.GAME_ACTION.windowMs)) {
      console.log(`[RateLimit] RAISE blocked for ${socket.id}`);
      return;
    }

    // Input validation
    const validation = validatePayload(RaiseSchema, data);
    if (!validation.success) {
      console.log(`[Validation] RAISE failed for ${socket.id}: ${validation.error}`);
      return;
    }

    const gameRoom = roomManager.getGameRoomBySocket(socket.id);
    const player = roomManager.getPlayerBySocket(socket.id);
    if (gameRoom && player) {
      gameRoom.handleRaise(socket.id, player, validation.data.amount);
    }
  });

  socket.on(SocketEvents.FOLD, () => {
    // Rate limiting
    if (!rateLimiter.checkLimit(socket.id, RATE_LIMITS.GAME_ACTION.maxRequests, RATE_LIMITS.GAME_ACTION.windowMs)) {
      console.log(`[RateLimit] FOLD blocked for ${socket.id}`);
      return;
    }

    const gameRoom = roomManager.getGameRoomBySocket(socket.id);
    const player = roomManager.getPlayerBySocket(socket.id);
    if (gameRoom && player) {
      gameRoom.handleFold(socket.id, player);
    }
  });

  // Clue/Answer actions
  socket.on(SocketEvents.BUZZ, () => {
    // Rate limiting
    if (!rateLimiter.checkLimit(socket.id, RATE_LIMITS.GAME_ACTION.maxRequests, RATE_LIMITS.GAME_ACTION.windowMs)) {
      console.log(`[RateLimit] BUZZ blocked for ${socket.id}`);
      return;
    }

    const gameRoom = roomManager.getGameRoomBySocket(socket.id);
    const player = roomManager.getPlayerBySocket(socket.id);
    if (gameRoom && player) {
      gameRoom.handleBuzz(socket.id, player);
    }
  });

  socket.on(SocketEvents.ANSWER, (data: { text: string }) => {
    // Rate limiting
    if (!rateLimiter.checkLimit(socket.id, RATE_LIMITS.GAME_ACTION.maxRequests, RATE_LIMITS.GAME_ACTION.windowMs)) {
      console.log(`[RateLimit] ANSWER blocked for ${socket.id}`);
      return;
    }

    // Input validation
    const validation = validatePayload(AnswerSchema, data);
    if (!validation.success) {
      console.log(`[Validation] ANSWER failed for ${socket.id}: ${validation.error}`);
      return;
    }

    const gameRoom = roomManager.getGameRoomBySocket(socket.id);
    const player = roomManager.getPlayerBySocket(socket.id);
    if (gameRoom && player) {
      gameRoom.handleAnswer(socket.id, player, validation.data.text);
    }
  });

  socket.on(SocketEvents.ANSWER_TYPING, (data: { text: string }) => {
    // Rate limiting (less strict for typing)
    if (!rateLimiter.checkLimit(socket.id, RATE_LIMITS.GAME_ACTION.maxRequests, RATE_LIMITS.GAME_ACTION.windowMs)) {
      return; // Silently drop typing events if rate limited
    }

    // Input validation
    const validation = validatePayload(AnswerTypingSchema, data);
    if (!validation.success) {
      return; // Silently drop invalid typing events
    }

    const gameRoom = roomManager.getGameRoomBySocket(socket.id);
    const player = roomManager.getPlayerBySocket(socket.id);
    if (gameRoom && player) {
      gameRoom.handleAnswerTyping(socket.id, player, validation.data.text);
    }
  });

  // Profile actions
  socket.on(SocketEvents.GET_PROFILE, async () => {
    // Rate limiting
    if (!rateLimiter.checkLimit(socket.id, RATE_LIMITS.PROFILE_ACTION.maxRequests, RATE_LIMITS.PROFILE_ACTION.windowMs)) {
      console.log(`[RateLimit] GET_PROFILE blocked for ${socket.id}`);
      socket.emit(SocketEvents.ERROR, {
        code: "RATE_LIMIT",
        message: "Too many requests. Please slow down.",
      });
      return;
    }

    const authSocket = socket as AuthenticatedSocket;
    const dbUserId = authSocket.dbUserId;

    if (!dbUserId) {
      socket.emit(SocketEvents.ERROR, {
        code: "NO_USER_ID",
        message: "User not authenticated",
      });
      return;
    }

    try {
      const profileResult = await UserService.getUserProfile(dbUserId);

      if (!profileResult) {
        socket.emit(SocketEvents.ERROR, {
          code: "PROFILE_NOT_FOUND",
          message: "Profile not found",
        });
        return;
      }

      const { user, recentGames } = profileResult;

      const profileData: ProfileData = {
        alias: user.alias || user.username || user.email.split("@")[0],
        email: user.email,
        username: user.username,
        createdAt: user.createdAt.toISOString(),
        stats: {
          eloRating: user.stats?.eloRating || 1200,
          gamesPlayed: user.stats?.gamesPlayed || 0,
          gamesWon: user.stats?.gamesWon || 0,
          gamesLost: user.stats?.gamesLost || 0,
          gamesTied: user.stats?.gamesTied || 0,
          questionsAnswered: user.stats?.questionsAnswered || 0,
          questionsCorrect: user.stats?.questionsCorrect || 0,
          questionsIncorrect: user.stats?.questionsIncorrect || 0,
          totalWinnings: user.stats?.totalWinnings || 0,
          highestBalance: user.stats?.highestBalance || 0,
          winStreak: user.stats?.winStreak || 0,
          bestWinStreak: user.stats?.bestWinStreak || 0,
        },
        recentGames: recentGames.map((game) => {
          const opponentName =
            game.opponent.alias ||
            game.opponent.username ||
            game.opponent.email.split("@")[0];

          let result: "WIN" | "LOSS" | "TIE";
          let yourBalance: number;
          let opponentBalance: number;
          let eloChange: number;

          if (game.isP1) {
            yourBalance = game.player1FinalBalance;
            opponentBalance = game.player2FinalBalance;
            eloChange = game.player1EloChange;

            if (game.winnerId === user.id) result = "WIN";
            else if (game.winnerId === null) result = "TIE";
            else result = "LOSS";
          } else {
            yourBalance = game.player2FinalBalance;
            opponentBalance = game.player1FinalBalance;
            eloChange = game.player2EloChange;

            if (game.winnerId === user.id) result = "WIN";
            else if (game.winnerId === null) result = "TIE";
            else result = "LOSS";
          }

          return {
            id: game.id,
            opponentName,
            result,
            yourBalance,
            opponentBalance,
            eloChange,
            playedAt: game.startedAt.toISOString(),
          };
        }),
      };

      socket.emit(SocketEvents.PROFILE_DATA, profileData);
    } catch (error) {
      console.error("[Profile] Error fetching profile:", error);
      socket.emit(SocketEvents.ERROR, {
        code: "PROFILE_ERROR",
        message: "Failed to fetch profile",
      });
    }
  });

  socket.on(SocketEvents.UPDATE_ALIAS, async (data: { alias: string }, callback) => {
    // Rate limiting
    if (!rateLimiter.checkLimit(socket.id, RATE_LIMITS.PROFILE_ACTION.maxRequests, RATE_LIMITS.PROFILE_ACTION.windowMs)) {
      console.log(`[RateLimit] UPDATE_ALIAS blocked for ${socket.id}`);
      callback({ success: false, error: "Too many requests. Please slow down." });
      return;
    }

    // Input validation
    const validation = validatePayload(UpdateAliasSchema, data);
    if (!validation.success) {
      console.log(`[Validation] UPDATE_ALIAS failed for ${socket.id}: ${validation.error}`);
      callback({ success: false, error: "Invalid alias" });
      return;
    }

    const authSocket = socket as AuthenticatedSocket;
    const dbUserId = authSocket.dbUserId;

    if (!dbUserId) {
      callback({ success: false, error: "User not authenticated" });
      return;
    }

    try {
      await UserService.updateUserAlias(dbUserId, validation.data.alias);
      callback({ success: true });
      socket.emit(SocketEvents.ALIAS_UPDATED, { alias: validation.data.alias });
    } catch (error) {
      console.error("[Profile] Error updating alias:", error);
      callback({ success: false, error: "Failed to update alias" });
    }
  });

  socket.on("disconnect", (reason) => {
    console.log(`[Socket] Client disconnected: ${socket.id} (${reason})`);
    roomManager.handleDisconnect(socket);
  });
});

httpServer.listen(PORT, () => {
  console.log(`[Server] Running on http://localhost:${PORT}`);
});
