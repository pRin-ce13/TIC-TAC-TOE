import { useEffect, useMemo, useRef, useState } from "react";
import "./App.css";

const API_BASE = "http://localhost:3000/api/game";

const WIN_PATTERNS = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
];

const initialBoard = () => Array(9).fill("");

async function postJSON(endpoint, body) {
  const response = await fetch(`${API_BASE}/${endpoint}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    throw new Error("Request failed");
  }
  return response.json();
}

function evaluateBoard(board) {
  for (const line of WIN_PATTERNS) {
    const [a, b, c] = line;
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return { winner: board[a], line };
    }
  }
  if (board.every((cell) => cell)) {
    return { winner: "draw", line: [] };
  }
  return { winner: null, line: [] };
}

export default function App() {
  const [board, setBoard] = useState(initialBoard);
  const [currentPlayer, setCurrentPlayer] = useState("X");
  const [winner, setWinner] = useState(null);
  const [status, setStatus] = useState("Select a mode to begin");
  const [isLoading, setIsLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [mode, setMode] = useState(null); // "ai" or "pvp"
  const [isModeSelected, setIsModeSelected] = useState(false);
  const [isGameActive, setIsGameActive] = useState(false);
  const [isPlayerTurn, setIsPlayerTurn] = useState(false);
  const [hoverMode, setHoverMode] = useState(null);
  const [gameStatus, setGameStatus] = useState("idle"); // idle | playing | win | draw
  const resultTimer = useRef(null);
  const aiTimer = useRef(null);
  const lastModeRef = useRef(null);

  const winningLine = useMemo(() => {
    if (!winner || winner === "draw") return [];
    for (const line of WIN_PATTERNS) {
      const [a, b, c] = line;
      if (board[a] && board[a] === board[b] && board[a] === board[c]) {
        return line;
      }
    }
    return [];
  }, [board, winner]);

  const resetBoard = (statusMessage = "Select a mode to begin") => {
    setBoard(initialBoard());
    setCurrentPlayer("X");
    setWinner(null);
    setStatus(statusMessage);
    setShowModal(false);
    setIsGameActive(false);
    setIsPlayerTurn(false);
    setGameStatus("idle");
    if (resultTimer.current) {
      clearTimeout(resultTimer.current);
      resultTimer.current = null;
    }
    if (aiTimer.current) {
      clearTimeout(aiTimer.current);
      aiTimer.current = null;
    }
  };

  const showResultWithDelay = (outcome, text) => {
    setWinner(outcome);
    setStatus(text);
    setIsGameActive(false);
    setIsPlayerTurn(false);
    setGameStatus(outcome === "draw" ? "draw" : "win");
    const delay = outcome === "draw" ? 1000 : 1300;
    if (resultTimer.current) clearTimeout(resultTimer.current);
    resultTimer.current = setTimeout(() => {
      setShowModal(true);
      resultTimer.current = null;
    }, delay);
  };

  const startGameForMode = async (selectedMode) => {
    setGameStatus("playing");
    setIsGameActive(true);

    if (selectedMode === "pvp") {
      setStatus("Player X turn");
      setIsPlayerTurn(true);
      return;
    }

    try {
      setIsLoading(true);
      setStatus("Starting new game vs AI...");
      const result = await postJSON("new-game", { playerName: "Player" });
      const data = result.data;
      setBoard(data.board);
      setCurrentPlayer(data.currentPlayer);
      setWinner(data.winner);
      setIsPlayerTurn(true);
      setStatus("Your turn: click any empty square");
    } catch (error) {
      setStatus("Could not start game. Is backend running?");
      setIsGameActive(false);
      setIsModeSelected(false);
      setGameStatus("idle");
    } finally {
      setIsLoading(false);
    }
  };

  const handleNewGame = () => {
    const activeMode = mode || lastModeRef.current;
    const hasMode = Boolean(activeMode);
    resetBoard(hasMode ? "Starting new game..." : "Select a mode to begin");
    if (!hasMode) {
      setIsModeSelected(false);
      return;
    }
    setMode(activeMode);
    lastModeRef.current = activeMode;
    setIsModeSelected(true);
    startGameForMode(activeMode);
  };

  const handleModeSelect = async (selectedMode) => {
    resetBoard("Starting new game...");
    setMode(selectedMode);
    lastModeRef.current = selectedMode;
    setIsModeSelected(true);
    await startGameForMode(selectedMode);
  };

  const handleCellClick = async (index) => {
    if (!isGameActive || !isModeSelected) {
      setStatus("Start a game and select a mode first.");
      return;
    }
    if (isLoading || winner) return;
    if (!isPlayerTurn) return;
    if (!board || board[index]) {
      setStatus("Please choose an empty cell");
      return;
    }

    if (mode === "pvp") {
      const nextBoard = board.slice();
      nextBoard[index] = currentPlayer;
      setBoard(nextBoard);
      const result = evaluateBoard(nextBoard);
      if (result.winner) {
        showResultWithDelay(
          result.winner,
          result.winner === "draw" ? "Match draw" : `${result.winner} wins!`
        );
        return;
      }
      const nextPlayer = currentPlayer === "X" ? "O" : "X";
      setCurrentPlayer(nextPlayer);
      setStatus(`Player ${nextPlayer} turn`);
      return;
    }

    // AI mode: apply human move visually, then call backend after a think delay
    const optimisticBoard = board.slice();
    optimisticBoard[index] = currentPlayer; // human is X
    setBoard(optimisticBoard);
    setIsPlayerTurn(false);
    setStatus("Opponent is thinking...");
    setIsLoading(true);
    const thinkDelay = 800 + Math.floor(Math.random() * 200);

    if (aiTimer.current) {
      clearTimeout(aiTimer.current);
    }

    aiTimer.current = setTimeout(async () => {
      try {
        const result = await postJSON("move", { index });
        const data = result.data;
        // Ignore late AI responses if the game/mode has changed or ended.
        if (!isGameActive || mode !== "ai" || gameStatus !== "playing") {
          setIsLoading(false);
          aiTimer.current = null;
          return;
        }
        setBoard(data.board);
        setCurrentPlayer(data.currentPlayer);
        setWinner(data.winner);
        if (data.winner) {
          showResultWithDelay(
            data.winner,
            data.winner === "draw" ? "Match draw" : `${data.winner} wins!`
          );
        } else {
          setIsPlayerTurn(true);
          setStatus(`Your turn (${data.currentPlayer})`);
          setGameStatus("playing");
        }
      } catch (error) {
        setStatus("Move blocked. Maybe backend stopped?");
        setIsPlayerTurn(true);
        setGameStatus("playing");
      } finally {
        setIsLoading(false);
        aiTimer.current = null;
      }
    }, thinkDelay);
  };

  const handleCloseGame = () => {
    resetBoard("Game closed. Click New Game to play again.");
    const activeMode = mode || lastModeRef.current;
    setIsModeSelected(Boolean(activeMode));
    setStatus("Game closed. Click New Game to play again.");
  };

  const handleBackToMode = (selectedMode) => {
    setMode(selectedMode);
    resetBoard();
    setStatus("Select a mode and start a new game.");
  };

  const gameOverText = winner
    ? winner === "draw"
      ? "Match Draw"
      : `${winner} wins!`
    : "";

  const turnLabel = winner
    ? ""
    : !isModeSelected
      ? ""
      : mode === "pvp"
        ? `Turn: ${currentPlayer}`
        : `You are X`; // backend keeps player as X

  const boardBlocked =
    isLoading || !isPlayerTurn || !!winner || !isModeSelected || !isGameActive || gameStatus !== "playing";

  useEffect(() => {
    return () => {
      if (resultTimer.current) {
        clearTimeout(resultTimer.current);
      }
      if (aiTimer.current) {
        clearTimeout(aiTimer.current);
      }
    };
  }, []);

  return (
    <div className="app">
      <h1>Tic Tac Toe</h1>

      <div className="mode-toggle">
        <button
          className={`mode-button ${mode === "ai" ? "active" : ""} ${hoverMode === "ai" ? "hovered" : ""} ${hoverMode === "pvp" ? "faded" : ""}`}
          onMouseEnter={() => setHoverMode("ai")}
          onMouseLeave={() => setHoverMode(null)}
          onClick={() => handleModeSelect("ai")}
          disabled={isLoading}
        >
          Play vs AI
        </button>
        <button
          className={`mode-button ${mode === "pvp" ? "active" : ""} ${hoverMode === "pvp" ? "hovered" : ""} ${hoverMode === "ai" ? "faded" : ""}`}
          onMouseEnter={() => setHoverMode("pvp")}
          onMouseLeave={() => setHoverMode(null)}
          onClick={() => handleModeSelect("pvp")}
          disabled={isLoading}
        >
          Play vs Person
        </button>
      </div>

      <div className="controls">
        <button onClick={handleNewGame} disabled={isLoading}>
          {isLoading ? "Working..." : "New Game"}
        </button>
        <button onClick={handleCloseGame} disabled={isLoading}>
          Close Game
        </button>
      </div>

      <div className="info-row">
        <p className="status">{winner ? `Game Over - ${status}` : status}</p>
        <p className="turn">{turnLabel}</p>
      </div>

      <div className={`board ${boardBlocked ? "blocked" : ""}`}>
        {board.map((cell, index) => {
          const isWinCell = winningLine.includes(index);
          return (
            <div
              key={index}
              className={`cell ${isWinCell ? "win" : ""}`}
              onClick={() => handleCellClick(index)}
              aria-disabled={boardBlocked}
            >
              {cell}
            </div>
          );
        })}
      </div>

      {showModal && (
        <div className="modal-backdrop">
          <div className="modal">
            <h2>{gameOverText}</h2>
            <p>{winner === "draw" ? "No more moves left." : "Congrats to the winner!"}</p>
            <div className="modal-actions">
              <button onClick={handleNewGame}>New Game</button>
              <button onClick={handleCloseGame}>Close</button>
              <button onClick={() => handleBackToMode("ai")}>
                Back to mode select
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
