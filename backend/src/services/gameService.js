// ------------------------------
// Tic Tac Toe Game Engine
// ------------------------------

export function createEmptyBoard() {
  return ["", "", "", "", "", "", "", "", ""];
}

export function isMoveValid(board, index) {
  return (
    Array.isArray(board) &&
    Number.isInteger(index) &&
    index >= 0 &&
    index < board.length &&
    board[index] === ""
  );
}

export function applyMove(board, index, player) {
  if (!isMoveValid(board, index)) {
    throw new Error("Cannot apply move to invalid cell");
  }

  const newBoard = [...board];
  newBoard[index] = player;
  return newBoard;
}

export function checkWinner(board) {
  const winPatterns = [
    [0,1,2],
    [3,4,5],
    [6,7,8],
    [0,3,6],
    [1,4,7],
    [2,5,8],
    [0,4,8],
    [2,4,6]
  ];

  for (const pattern of winPatterns) {
    const [a, b, c] = pattern;
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return board[a];   // return 'X' or 'O'
    }
  }

  if (board.every(cell => cell !== "")) {
    return "draw";
  }

  return null; // game still going
}
