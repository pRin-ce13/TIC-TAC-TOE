import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";
import gameRoutes from "./routes/gameRoutes.js";
import {
  createRoom,
  joinRoom,
  getRoom,
  removeRoom,
  removePlayer,
  getPlayerSymbol
} from "./services/roomManager.js";


const app = express();
app.use(cors());
app.use(express.json());

// Basic API route
app.get("/", (req, res) => {
  res.send("Tic Tac Toe Backend Running");
});

// Create HTTP server
const server = http.createServer(app);

// Setup WebSocket server
const io = new Server(server, {
  cors: {
    origin: "*",
  },
});


io.on("connection", (socket) => {
  console.log("A user connected:", socket.id);

  socket.on("create_room", ({ playerName }) => {
    const room = createRoom(playerName, socket.id);
    socket.join(room.roomId);
    socket.emit("room_created", {
      roomId: room.roomId,
      players: room.game.players
    });
  });

  socket.on("join_room", ({ roomId, playerName }) => {
    const result = joinRoom(roomId, playerName, socket.id);
    if (result?.error) {
      socket.emit("room_error", { message: result.error });
      return;
    }

    const { room } = result;
    socket.join(roomId);
    io.to(roomId).emit("game_start", {
      roomId,
      board: room.game.board,
      currentPlayer: room.game.currentPlayer,
      players: room.game.players
    });
  });

  socket.on("player_move", ({ roomId, index }) => {
    const room = getRoom(roomId);
    if (!room) {
      socket.emit("room_error", { message: "Room not found" });
      return;
    }

    if (!Number.isInteger(index) || index < 0 || index > 8) {
      socket.emit("room_error", { message: "Invalid move index" });
      return;
    }

    const symbol = getPlayerSymbol(room, socket.id);
    if (!symbol) {
      socket.emit("room_error", { message: "Player not part of this room" });
      return;
    }

    const moveApplied = room.game.playPvPMove(index, symbol);
    if (!moveApplied) {
      socket.emit("room_error", { message: "Move rejected" });
      return;
    }

    const state = {
      board: room.game.board,
      currentPlayer: room.game.currentPlayer,
      winner: room.game.winner,
      players: room.game.players
    };

    io.to(roomId).emit("board_update", state);

    if (room.game.winner) {
      io.to(roomId).emit("game_over", {
        winner: room.game.winner,
        board: room.game.board,
        players: room.game.players
      });
    }
  });

  socket.on("disconnect", () => {
    const removal = removePlayer(socket.id);
    if (removal?.roomId) {
      io.to(removal.roomId).emit("room_error", { message: "A player disconnected" });
      removeRoom(removal.roomId);
    }
    console.log("A user disconnected:", socket.id);
  });
});

// Use game routes
app.use("/api/game", gameRoutes);


// Start server
server.listen(3000, () => {
  console.log("Server running on port 3000");
});
    