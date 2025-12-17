import{
  createEmptyBoard,
  checkWinner,
  applyMove,
  isMoveValid
} from "./gameService.js";

import { findBestMove } from "../ai/minimax.js";

const DEFAULT_AI_PLAYERS = { X: "Player", O: "AI" };
const DEFAULT_PVP_PLAYERS = { X: "Player X", O: "Player O" };

const isValidSymbol = (symbol) => symbol === "X" || symbol === "O";

// GameManager keeps the board state, advances turns, and bridges human moves with the AI or a second player.
export class GameManager {
  constructor(mode = "ai", players = {}, symbols = {}, startPlayer = "X") {
    this.board = createEmptyBoard();
    this.currentPlayer = startPlayer === "O" ? "O" : "X";
    this.winner = null;
    this.mode = mode;
    const defaults = mode === "ai" ? DEFAULT_AI_PLAYERS : DEFAULT_PVP_PLAYERS;
    this.players = { ...defaults, ...players };
    const humanSymbol = symbols.humanSymbol === "O" ? "O" : "X";
    const aiSymbol = humanSymbol === "X" ? "O" : "X";
    this.humanSymbol = mode === "ai" ? humanSymbol : null;
    this.aiSymbol = mode === "ai" ? aiSymbol : null;
  }

  setPlayerName(symbol, name) {
    if (!isValidSymbol(symbol)) return;
    const trimmed = typeof name === "string" ? name.trim() : "";
    if (!trimmed) return;
    this.players[symbol] = trimmed;
  }

  playHumanMove(index) {
    if (this.winner || !isMoveValid(this.board, index)) return false;
    if (this.mode === "ai" && this.currentPlayer !== this.humanSymbol) return false;
    this.board = applyMove(this.board, index, this.currentPlayer);
    this.winner = checkWinner(this.board);
    if(!this.winner) {
      this.currentPlayer = this.currentPlayer === "X" ? "O" : "X";
    }
    return true;
  }

  playAIMove() {
    if (this.winner || this.mode !== "ai") return false;
    if (this.currentPlayer !== this.aiSymbol) return false;
    const bestMove = findBestMove(this.board, this.aiSymbol, this.humanSymbol);
    this.board = applyMove(this.board, bestMove, this.aiSymbol);
    this.winner = checkWinner(this.board);
    if(!this.winner) {
      this.currentPlayer = this.currentPlayer === "X" ? "O" : "X";
    }
    return true;
  }

  playPvPMove(index, playerSymbol) {
    if(this.winner) return false;
    if(!isValidSymbol(playerSymbol) || playerSymbol !== this.currentPlayer) return false;
    if(!isMoveValid(this.board, index)) return false;

    this.board = applyMove(this.board, index, playerSymbol);
    this.winner = checkWinner(this.board);
    if(!this.winner) {
      this.currentPlayer = this.currentPlayer === "X" ? "O" : "X";
    }
    return true;
  }
}
