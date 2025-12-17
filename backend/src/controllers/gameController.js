import { GameManager } from "../services/gameManager.js";

const sanitizeName = (name, fallback) => {
  if (typeof name === "string") {
    const trimmed = name.trim();
    if (trimmed.length > 0) {
      return trimmed.slice(0, 40);
    }
  }
  return fallback;
};

let game = null;

// newGame starts a fresh match against the AI and returns the opening state with player names.
export const newGame = (req, res) => {
  const { playerName, playerSymbol, startPlayer } = req.body ?? {};
  const humanName = sanitizeName(playerName, "Player");
  const humanSymbol = playerSymbol === "O" ? "O" : "X";
  const aiSymbol = humanSymbol === "X" ? "O" : "X";
  const players = humanSymbol === "X"
    ? { X: humanName, O: "AI" }
    : { X: "AI", O: humanName };
  const start = startPlayer === "O" ? "O" : "X";
  game = new GameManager("ai", players, { humanSymbol }, start);

  return res.status(200).json({
    success: true,
    message: "New game started",
    data: {
      board: game.board,
      currentPlayer: game.currentPlayer,
      winner: game.winner,
      players: game.players,
      humanSymbol,
      aiSymbol
    }
  });
};

// playMove validates the incoming move, lets the AI respond, and returns the updated board.
export const playMove = (req, res) => {
  if (!game) {
    return res.status(400).json({ success: false, message: "Game has not been started yet" });
  }

  if (game.winner) {
    return res.status(400).json({ success: false, message: "Game already finished. Start a new game." });
  }

  const { index } = req.body ?? {};

  if (index === undefined || index === null) {
    return res.status(400).json({ success: false, message: "Move index is required" });
  }

  if (typeof index !== "number" || Number.isNaN(index)) {
    return res.status(400).json({ success: false, message: "Move index must be a number" });
  }

  if (!Number.isInteger(index)) {
    return res.status(400).json({ success: false, message: "Move index must be an integer" });
  }

  if (index < 0 || index > 8) {
    return res.status(400).json({ success: false, message: "Move index must be between 0 and 8" });
  }

  const moveApplied = game.playHumanMove(index);

  if (!moveApplied) {
    return res.status(400).json({ success: false, message: "Move rejected. Check turn and cell." });
  }

  if (!game.winner) {
    game.playAIMove();
  }

  return res.status(200).json({
    success: true,
    message: game.winner ? "Game concluded" : "Moves applied",
    data: {
      board: game.board,
      currentPlayer: game.currentPlayer,
      winner: game.winner,
      players: game.players,
      humanSymbol: game.humanSymbol,
      aiSymbol: game.aiSymbol
    }
  });
};

export const aiMove = (req, res) => {
  if (!game) {
    return res.status(400).json({ success: false, message: "Game has not been started yet" });
  }

  if (game.winner) {
    return res.status(400).json({ success: false, message: "Game already finished. Start a new game." });
  }

  const moved = game.playAIMove();
  if (!moved) {
    return res.status(400).json({ success: false, message: "Not AI turn" });
  }

  return res.status(200).json({
    success: true,
    message: game.winner ? "Game concluded" : "AI moved",
    data: {
      board: game.board,
      currentPlayer: game.currentPlayer,
      winner: game.winner,
      players: game.players,
      humanSymbol: game.humanSymbol,
      aiSymbol: game.aiSymbol
    }
  });
};
