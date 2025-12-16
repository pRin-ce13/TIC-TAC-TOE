import{
    createEmptyBoard,
    checkWinner,
    applyMove,
    isMoveValid
} from "./gameService.js";

import { findBestMove } from "../ai/minimax.js";

// GameManager keeps the board state, advances turns, and bridges human moves with the AI.
export class GameManager {
  constructor(mode = "ai") {
    this.board = createEmptyBoard();
    this.currentPlayer = "X";
    this.winner = null;
    this.mode = mode;
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
    // TODO
    if(this.winner) return false;
    const bestMove = findBestMove(this.board, "O","X");
    this.board = applyMove(this.board, bestMove, "O");
    this.winner = checkWinner(this.board);
    if(!this.winner) {
     this.currentPlayer = "X";
    }
    return true;
  }
}
