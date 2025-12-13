import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";

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

// Handle socket connections
io.on("connection", (socket) => {
  console.log("A user connected:", socket.id);

  socket.on("disconnect", () => {
    console.log("A user disconnected:", socket.id);
  });
});

// Start server
server.listen(3000, () => {
  console.log("Server running on port 3000");
});
    