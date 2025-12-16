import { checkWinner } from "../services/gameService.js";

// Evaluate board score
export function evaluateBoard(board, aiPlayer, humanPlayer) {
  if(checkWinner(board) === aiPlayer)  return 10;
  else if(checkWinner(board) === humanPlayer) return -10;
  else return 0;
}

// Minimax algorithm
function minimax(board, depth, isMaximizing, aiPlayer, humanPlayer) {

  // 1. BASE CASE:
  const result = checkWinner(board);
  if (result !== null) {
    return evaluateBoard(board, aiPlayer, humanPlayer);
  }

  // 2. AI TURN (MAXIMIZING)
  if (isMaximizing) {
    let bestScore = -Infinity;

    // Loop through all cells
    for (let i = 0; i < 9; i++) {
      if (board[i] === "") {

        // Simulate move
        board[i] = aiPlayer;

        // Recursively evaluate
        const score = minimax(board, depth + 1, false, aiPlayer, humanPlayer);

        // Undo move
        board[i] = "";

        // Choose max score
        bestScore = Math.max(score, bestScore);
      }
    }

    return bestScore;
  }

  // 3. HUMAN TURN (MINIMIZING)
  else {
    let bestScore = Infinity;

    for (let i = 0; i < 9; i++) {
      if (board[i] === "") {

        // Simulate move
        board[i] = humanPlayer;

        // Recursively evaluate
        const score = minimax(board, depth + 1, true, aiPlayer, humanPlayer);

        // Undo move
        board[i] = "";

        // Choose min score
        bestScore = Math.min(score, bestScore);
      }
    }

    return bestScore;
  }
}


// Find best move for AI player
export function findBestMove(board, aiPlayer, humanPlayer) {
  // Hint:
  // Loop through 0..8
  // For each empty cell:
  //    simulate AI move
  //    call minimax()
  //    track best score + best index
  // Return the best index
   let bestScore = -Infinity;
   let bestMove = -1;

   for(let i=0;i<9;i++){
      if(board[i] === ""){
        board[i] = aiPlayer;
        let score  = minimax(board, 0, false, aiPlayer, humanPlayer);
        
        board[i] ="";
        if(score > bestScore){
         bestScore = score;
         bestMove = i;
        }
   }

} 
return bestMove;
}
