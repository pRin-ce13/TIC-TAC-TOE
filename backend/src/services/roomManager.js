import { randomBytes } from "crypto";
import { GameManager } from "./gameManager.js";

const rooms = new Map();

const sanitizeName = (name, fallback) => {
  if (typeof name === "string") {
    const trimmed = name.trim();
    if (trimmed.length > 0) {
      return trimmed.slice(0, 40);
    }
  }
  return fallback;
};

const generateRoomId = () => randomBytes(3).toString("hex").toUpperCase();

export function createRoom(playerName, socketId) {
  const roomId = generateRoomId();
  const normalizedName = sanitizeName(playerName, "Player X");
  const game = new GameManager("pvp", { X: normalizedName, O: "Waiting" });
  const room = {
    roomId,
    game,
    players: {
      X: { socketId, name: normalizedName },
      O: null
    }
  };

  rooms.set(roomId, room);
  return room;
}

export function joinRoom(roomId, playerName, socketId) {
  const room = rooms.get(roomId);
  if (!room) {
    return { error: "Room not found" };
  }

  if (room.players.O) {
    return { error: "Room already full" };
  }

  const normalizedName = sanitizeName(playerName, "Player O");
  room.players.O = { socketId, name: normalizedName };
  room.game.setPlayerName("O", normalizedName);

  return { room };
}

export function getRoom(roomId) {
  return rooms.get(roomId);
}

export function removeRoom(roomId) {
  rooms.delete(roomId);
}

export function removePlayer(socketId) {
  for (const [roomId, room] of rooms.entries()) {
    if (room.players.X?.socketId === socketId || room.players.O?.socketId === socketId) {
      return { roomId, room };
    }
  }
  return null;
}

export function getPlayerSymbol(room, socketId) {
  if (room.players.X?.socketId === socketId) return "X";
  if (room.players.O?.socketId === socketId) return "O";
  return null;
}
