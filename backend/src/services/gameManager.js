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
  constructor(mode = "ai", players = {}) {
    this.board = createEmptyBoard();
    this.currentPlayer = "X";
    this.winner = null;
    this.mode = mode;
    const defaults = mode === "ai" ? DEFAULT_AI_PLAYERS : DEFAULT_PVP_PLAYERS;
    this.players = { ...defaults, ...players };
  }

  setPlayerName(symbol, name) {
    if (!isValidSymbol(symbol)) return;
    const trimmed = typeof name === "string" ? name.trim() : "";
    if (!trimmed) return;
    this.players[symbol] = trimmed;
  }

  playHumanMove(index) {
    if(this.winner || !isMoveValid(this.board, index)) return false;
    this.board = applyMove(this.board, index, this.currentPlayer);
    this.winner = checkWinner(this.board);
    if(!this.winner) {

        if(this.currentPlayer === "X") this.currentPlayer = "O";
        else this.currentPlayer = "X";
    }
    return true;
    }

  playAIMove() {
    if(this.winner) return false;
    const bestMove = findBestMove(this.board, "O","X");
    this.board = applyMove(this.board, bestMove, "O");
    this.winner = checkWinner(this.board);
    if(!this.winner) {
     this.currentPlayer = "X";
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
