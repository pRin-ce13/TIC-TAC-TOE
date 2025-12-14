import { GameManager } from "../services/gameManager.js";

let game = null;

// Start a new game
export const newGame = (req, res) => {
  game = new GameManager("ai");

  res.json({
    board: game.board,
    currentPlayer: game.currentPlayer,
    winner: game.winner
  });
};

// Human plays a move
export const playMove = (req, res) => {
  if (!game) {
    return res.status(400).json({ error: "Game not started" });
  }

  const { index } = req.body;

  const success = game.playHumanMove(index);

   // TODO: call game.playHumanMove()
  // TODO: call game.playAIMove()
  // TODO: return updated game state
    

  if(!success){
    return res.status(400).json({ error: "Invalid move" });
  }

  if(!game.winner){
    game.playAIMove();
  }

  res.json({
    board: game.board,
    currentPlayer: game.currentPlayer,
    winner: game.winner
  });


  
};
