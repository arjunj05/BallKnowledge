import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import cors from "cors";
import { SocketEvents } from "shared";
import { RoomManager } from "./RoomManager";

const app = express();
app.use(cors());

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"],
  },
});

const PORT = process.env.PORT || 3001;

const roomManager = new RoomManager(io);

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

io.on("connection", (socket) => {
  console.log(`[Socket] Client connected: ${socket.id}`);

  // Room management
  socket.on(SocketEvents.CREATE_ROOM, (callback) => {
    const result = roomManager.createRoom(socket);
    callback(result);
  });

  socket.on(SocketEvents.JOIN_ROOM, (data: { roomId: string }, callback) => {
    const result = roomManager.joinRoom(socket, data.roomId);
    callback(result);
  });

  // Betting actions
  socket.on(SocketEvents.BET, (data: { amount: number }) => {
    const gameRoom = roomManager.getGameRoomBySocket(socket.id);
    const player = roomManager.getPlayerBySocket(socket.id);
    if (gameRoom && player) {
      gameRoom.handleBet(player, data.amount);
    }
  });

  socket.on(SocketEvents.MATCH, () => {
    const gameRoom = roomManager.getGameRoomBySocket(socket.id);
    const player = roomManager.getPlayerBySocket(socket.id);
    if (gameRoom && player) {
      gameRoom.handleMatch(player);
    }
  });

  socket.on(SocketEvents.RAISE, (data: { amount: number }) => {
    const gameRoom = roomManager.getGameRoomBySocket(socket.id);
    const player = roomManager.getPlayerBySocket(socket.id);
    if (gameRoom && player) {
      gameRoom.handleRaise(player, data.amount);
    }
  });

  socket.on(SocketEvents.FOLD, () => {
    const gameRoom = roomManager.getGameRoomBySocket(socket.id);
    const player = roomManager.getPlayerBySocket(socket.id);
    if (gameRoom && player) {
      gameRoom.handleFold(player);
    }
  });

  // Clue/Answer actions
  socket.on(SocketEvents.BUZZ, () => {
    const gameRoom = roomManager.getGameRoomBySocket(socket.id);
    const player = roomManager.getPlayerBySocket(socket.id);
    if (gameRoom && player) {
      gameRoom.handleBuzz(player);
    }
  });

  socket.on(SocketEvents.ANSWER, (data: { text: string }) => {
    const gameRoom = roomManager.getGameRoomBySocket(socket.id);
    const player = roomManager.getPlayerBySocket(socket.id);
    if (gameRoom && player) {
      gameRoom.handleAnswer(player, data.text);
    }
  });

  socket.on(SocketEvents.ANSWER_TYPING, (data: { text: string }) => {
    const gameRoom = roomManager.getGameRoomBySocket(socket.id);
    const player = roomManager.getPlayerBySocket(socket.id);
    if (gameRoom && player) {
      gameRoom.handleAnswerTyping(player, data.text);
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
