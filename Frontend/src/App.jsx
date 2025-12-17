import { useEffect, useMemo, useRef, useState } from "react";
import "./App.css";

const API_BASE = (import.meta.env?.VITE_API_BASE_URL || "http://localhost:3000/api/game").replace(/\/$/, "");

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
  const endpointPath = (endpoint || "").toString().replace(/^\//, "");
  if (!endpointPath) {
    throw new Error("Endpoint path is required for POST request");
  }
  const response = await fetch(`${API_BASE}/${endpointPath}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body ?? {}),
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
  const [status, setStatus] = useState("Select a mode, enter names, then Start Game.");
  const [isLoading, setIsLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [mode, setMode] = useState(null); // "ai" or "pvp"
  const [isModeSelected, setIsModeSelected] = useState(false);
  const [isGameActive, setIsGameActive] = useState(false);
  const [isPlayerTurn, setIsPlayerTurn] = useState(false);
  const [hoverMode, setHoverMode] = useState(null);
  const [gameStatus, setGameStatus] = useState("idle"); // idle | playing | win | draw | closed
  const [nameInputs, setNameInputs] = useState({ human: "", ai: "Computer", p1: "", p2: "" });
  const [playerNames, setPlayerNames] = useState({ X: "", O: "" });
  const [symbolChoice, setSymbolChoice] = useState(null); // "X" | "O" | null
  const resultTimer = useRef(null);
  const aiTimer = useRef(null);
  const lastModeRef = useRef(null);
  const lastNamesRef = useRef({}); // { human, ai } or { p1, p2 }

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

  const resetBoard = (statusMessage = "Select a mode, enter names, then Start Game.") => {
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

  const validateNames = (selectedMode) => {
    if (!selectedMode) return { ok: false, message: "Select a mode first." };
    if (selectedMode === "ai") {
      const human = nameInputs.human.trim();
      const aiName = nameInputs.ai.trim() || "Computer";
      if (!human) return { ok: false, message: "Enter your name to start." };
      if (human === aiName) return { ok: false, message: "Names must differ." };
      return { ok: true, names: { human, ai: aiName } };
    }
    const p1 = nameInputs.p1.trim();
    const p2 = nameInputs.p2.trim();
    if (!p1 || !p2) return { ok: false, message: "Enter both player names." };
    if (p1 === p2) return { ok: false, message: "Player names must differ." };
    return { ok: true, names: { p1, p2 } };
  };

  const validateSymbol = () => {
    if (!symbolChoice) return { ok: false, message: "Choose your symbol (X or O)." };
    return { ok: true };
  };

  const startGameForMode = async (selectedMode, names, symbol) => {
    setGameStatus("playing");
    setIsGameActive(true);
    setWinner(null);
    setBoard(initialBoard());
    setCurrentPlayer("X");
    setShowModal(false);
    setStatus("Starting new game...");

    if (selectedMode === "pvp") {
      lastNamesRef.current = names;
      const playerX = symbol === "X" ? names.p1 : names.p2;
      const playerO = symbol === "X" ? names.p2 : names.p1;
      setPlayerNames({ X: playerX, O: playerO });
      const startPlayer = Math.random() < 0.5 ? "X" : "O";
      setCurrentPlayer(startPlayer);
      setIsPlayerTurn(true);
      setStatus(`${(startPlayer === "X" ? playerX : playerO)}'s turn (${startPlayer})`);
      return;
    }

    const humanSymbol = symbol;
    const aiSymbol = humanSymbol === "X" ? "O" : "X";
    const humanName = names.human;
    const aiName = names.ai;
    lastNamesRef.current = names;
    setPlayerNames({ X: humanSymbol === "X" ? humanName : aiName, O: humanSymbol === "O" ? humanName : aiName });
    setStatus("Starting new game vs AI...");
    const startPlayer = Math.random() < 0.5 ? humanSymbol : aiSymbol;

    try {
      setIsLoading(true);
      const result = await postJSON("new-game", { playerName: humanName, playerSymbol: humanSymbol, startPlayer });
      const data = result.data;
      setBoard(data.board);
      setCurrentPlayer(data.currentPlayer);
      setWinner(data.winner);
      if (data.currentPlayer === humanSymbol) {
        setIsPlayerTurn(true);
        setStatus(`${humanName}'s turn (${humanSymbol})`);
        setIsLoading(false);
      } else {
        setIsPlayerTurn(false);
        setStatus(`${aiName} is thinking...`);
        const thinkDelay = 800 + Math.floor(Math.random() * 200);
        if (aiTimer.current) clearTimeout(aiTimer.current);
        aiTimer.current = setTimeout(async () => {
          try {
            const aiResult = await postJSON("ai-move", {});
            const aiData = aiResult.data;
            setBoard(aiData.board);
            setCurrentPlayer(aiData.currentPlayer);
            setWinner(aiData.winner);
            if (aiData.winner) {
              const winnerName = aiData.winner === "X" ? (humanSymbol === "X" ? humanName : aiName) : (humanSymbol === "O" ? humanName : aiName);
              showResultWithDelay(
                aiData.winner,
                aiData.winner === "draw" ? "Match draw" : `${winnerName || aiData.winner} wins!`
              );
            } else {
              setIsPlayerTurn(true);
              setStatus(`${humanName}'s turn (${humanSymbol === "X" ? "X" : "O"})`);
              setGameStatus("playing");
            }
          } catch (error) {
            setStatus("Server is waking up. Please wait a moment…");
            setIsPlayerTurn(true);
            setGameStatus("playing");
          } finally {
            setIsLoading(false);
            aiTimer.current = null;
          }
        }, thinkDelay);
        return;
      }
    } catch (error) {
      setStatus("Server is waking up. Please wait a moment…");
      setIsGameActive(false);
      setIsModeSelected(false);
      setGameStatus("idle");
      setIsLoading(false);
    }
  };

  const handleModeSelect = (selectedMode) => {
    resetBoard("Mode selected. Enter names, then Start Game.");
    setMode(selectedMode);
    lastModeRef.current = selectedMode;
    setIsModeSelected(true);
    setPlayerNames({ X: "", O: "" });
    setSymbolChoice(null);
    setNameInputs((prev) => (
      selectedMode === "ai"
        ? { ...prev, human: "", ai: "Computer", p1: "", p2: "" }
        : { ...prev, p1: "", p2: "", human: "", ai: "Computer" }
    ));
    setStatus("Enter player names, then Start Game.");
  };

  const handleStartGame = async () => {
    const activeMode = mode || lastModeRef.current;
    const hasMode = Boolean(activeMode);
    if (!hasMode) {
      setStatus("Select a mode first.");
      return;
    }
    const validation = validateNames(activeMode);
    if (!validation.ok) {
      setStatus(validation.message);
      return;
    }
    const symbolValidation = validateSymbol();
    if (!symbolValidation.ok) {
      setStatus(symbolValidation.message);
      return;
    }
    setStatus("Starting new game...");
    setIsModeSelected(true);
    await startGameForMode(activeMode, validation.names, symbolChoice);
  };

  const handleNewGame = async () => {
    const activeMode = mode || lastModeRef.current;
    if (!activeMode || !symbolChoice) {
      setStatus("Select mode, names, and symbol, then Start Game.");
      return;
    }
    if (activeMode === "ai") {
      const names = lastNamesRef.current?.human ? lastNamesRef.current : null;
      if (!names) {
        setStatus("Enter names and start once before restarting.");
        return;
      }
      await startGameForMode(activeMode, names, symbolChoice);
      return;
    }
    const names = lastNamesRef.current?.p1 ? lastNamesRef.current : null;
    if (!names) {
      setStatus("Enter names and start once before restarting.");
      return;
    }
    await startGameForMode(activeMode, names, symbolChoice);
  };

  const handleCellClick = async (index) => {
    if (!isGameActive || !isModeSelected || gameStatus !== "playing") {
      setStatus("Start the game first.");
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
        const winnerName = result.winner === "X" ? playerNames.X : playerNames.O;
        showResultWithDelay(
          result.winner,
          result.winner === "draw" ? "Match draw" : `${winnerName || result.winner} wins!`
        );
        return;
      }
      const nextPlayer = currentPlayer === "X" ? "O" : "X";
      setCurrentPlayer(nextPlayer);
      setStatus(`${playerNames[nextPlayer]}'s turn (${nextPlayer})`);
      return;
    }

    // AI mode: apply human move visually, then call backend after a think delay
    const optimisticBoard = board.slice();
    optimisticBoard[index] = currentPlayer; // human symbol
    setBoard(optimisticBoard);
    setIsPlayerTurn(false);
    const aiName = symbolChoice === "X" ? playerNames.O : playerNames.X;
    setStatus(`${aiName} is thinking...`);
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
          const winnerName = data.winner === "X" ? playerNames.X : playerNames.O;
          showResultWithDelay(
            data.winner,
            data.winner === "draw" ? "Match draw" : `${winnerName || data.winner} wins!`
          );
        } else {
          const humanSymbol = symbolChoice;
          if (data.currentPlayer === humanSymbol) {
            setIsPlayerTurn(true);
            const humanName = humanSymbol === "X" ? playerNames.X : playerNames.O;
            setStatus(`${humanName}'s turn (${humanSymbol})`);
          } else {
            setIsPlayerTurn(false);
            const aiName = humanSymbol === "X" ? playerNames.O : playerNames.X;
            setStatus(`${aiName} is thinking...`);
          }
          setGameStatus("playing");
        }
      } catch (error) {
        // Retry once after a short delay to allow backend cold start; if fails, revert to server-wake message.
        setStatus("Server is waking up. Please wait a moment…");
        const retryDelay = 3500;
        setTimeout(async () => {
          try {
            const retryResult = await postJSON("move", { index });
            const retryData = retryResult.data;
            if (!isGameActive || mode !== "ai" || gameStatus !== "playing") {
              return;
            }
            setBoard(retryData.board);
            setCurrentPlayer(retryData.currentPlayer);
            setWinner(retryData.winner);
            if (retryData.winner) {
              const winnerName = retryData.winner === "X" ? playerNames.X : playerNames.O;
              showResultWithDelay(
                retryData.winner,
                retryData.winner === "draw" ? "Match draw" : `${winnerName || retryData.winner} wins!`
              );
            } else {
              const humanSymbol = symbolChoice;
              if (retryData.currentPlayer === humanSymbol) {
                setIsPlayerTurn(true);
                const humanName = humanSymbol === "X" ? playerNames.X : playerNames.O;
                setStatus(`${humanName}'s turn (${humanSymbol})`);
              } else {
                setIsPlayerTurn(false);
                const aiNameRetry = humanSymbol === "X" ? playerNames.O : playerNames.X;
                setStatus(`${aiNameRetry} is thinking...`);
              }
              setGameStatus("playing");
            }
          } catch (retryError) {
            // Final fallback: keep user-informed but do not desync board; allow another user action.
            setIsPlayerTurn(true);
            setGameStatus("playing");
            setStatus("Server is waking up. Please wait a moment…");
          } finally {
            setIsLoading(false);
            aiTimer.current = null;
          }
        }, retryDelay);
      } finally {
        // If retry succeeds, loading resets there; otherwise ensure we clear loading if no retry timer is pending.
        if (!aiTimer.current) {
          setIsLoading(false);
          aiTimer.current = null;
        }
      }
    }, thinkDelay);
  };

  const handleCloseGame = () => {
    const activeMode = mode || lastModeRef.current;
    resetBoard("Game closed. Start a new game or change mode.");
    setIsModeSelected(Boolean(activeMode));
    setMode(activeMode || null);
    setGameStatus("closed");
    setStatus("Game closed. Start a new game or change mode.");
  };

  const handleChangeMode = () => {
    resetBoard("Select a mode, enter names, then Start Game.");
    setMode(null);
    setIsModeSelected(false);
    setPlayerNames({ X: "", O: "" });
    setNameInputs({ human: "", ai: "Computer", p1: "", p2: "" });
    setGameStatus("idle");
    lastModeRef.current = null;
    setSymbolChoice(null);
    lastNamesRef.current = {};
  };

  const gameOverText = winner
    ? winner === "draw"
      ? "Match Draw"
      : `${(winner === "X" ? playerNames.X : playerNames.O) || winner} wins!`
    : "";

  const turnLabel = winner
    ? ""
    : !isModeSelected
      ? ""
      : gameStatus !== "playing"
        ? ""
        : mode === "pvp"
          ? `${playerNames[currentPlayer] || currentPlayer}'s turn (${currentPlayer})`
          : `${currentPlayer === symbolChoice ? (playerNames[currentPlayer] || "You") : playerNames[currentPlayer] || "AI"}'s turn (${currentPlayer})`;

  const boardBlocked =
    isLoading || !isPlayerTurn || !!winner || !isModeSelected || !isGameActive || gameStatus !== "playing";

  useEffect(() => {
    // Warm-up: attempt a silent call to wake the backend; ignore failures.
    (async () => {
      try {
        await postJSON("new-game", { playerName: "warmup", playerSymbol: "X", startPlayer: "X" });
      } catch (err) {
        // ignore
      }
    })();

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
          className={`mode-button ${mode === "ai" ? "active ai-active" : ""} ${hoverMode === "ai" ? "hovered" : ""} ${hoverMode === "pvp" ? "faded" : ""}`}
          onMouseEnter={() => setHoverMode("ai")}
          onMouseLeave={() => setHoverMode(null)}
          onClick={() => handleModeSelect("ai")}
          disabled={isLoading}
        >
          Play vs AI
        </button>
        <button
          className={`mode-button ${mode === "pvp" ? "active pvp-active" : ""} ${hoverMode === "pvp" ? "hovered" : ""} ${hoverMode === "ai" ? "faded" : ""}`}
          onMouseEnter={() => setHoverMode("pvp")}
          onMouseLeave={() => setHoverMode(null)}
          onClick={() => handleModeSelect("pvp")}
          disabled={isLoading}
        >
          Play vs Person
        </button>
      </div>

      {mode && (
        <div className="symbol-panel">
          <p className="panel-title">Choose your symbol</p>
          <div className="symbol-buttons">
            <button
              className={`symbol-button ${symbolChoice === "X" ? "active" : ""}`}
              onClick={() => setSymbolChoice("X")}
              disabled={isLoading || gameStatus === "playing"}
            >
              X
            </button>
            <button
              className={`symbol-button ${symbolChoice === "O" ? "active" : ""}`}
              onClick={() => setSymbolChoice("O")}
              disabled={isLoading || gameStatus === "playing"}
            >
              O
            </button>
          </div>
        </div>
      )}

      {mode && (
        <div className="name-panel">
          {mode === "ai" ? (
            <>
              <label>
                Player Name (X)
                <input
                  type="text"
                  value={nameInputs.human}
                  onChange={(e) => setNameInputs((prev) => ({ ...prev, human: e.target.value }))}
                  placeholder="Your name"
                  disabled={isLoading || gameStatus === "playing"}
                />
              </label>
              <label>
                AI Name (O)
                <input
                  type="text"
                  value={nameInputs.ai}
                  onChange={(e) => setNameInputs((prev) => ({ ...prev, ai: e.target.value }))}
                  disabled
                />
              </label>
            </>
          ) : (
            <>
              <label>
                Player 1 Name (X)
                <input
                  type="text"
                  value={nameInputs.p1}
                  onChange={(e) => setNameInputs((prev) => ({ ...prev, p1: e.target.value }))}
                  placeholder="Player X"
                  disabled={isLoading || gameStatus === "playing"}
                />
              </label>
              <label>
                Player 2 Name (O)
                <input
                  type="text"
                  value={nameInputs.p2}
                  onChange={(e) => setNameInputs((prev) => ({ ...prev, p2: e.target.value }))}
                  placeholder="Player O"
                  disabled={isLoading || gameStatus === "playing"}
                />
              </label>
            </>
          )}
        </div>
      )}

      <div className="controls">
        <button className="btn-primary" onClick={handleStartGame} disabled={isLoading || gameStatus === "playing" || !symbolChoice}>
          {isLoading ? "Working..." : "Start Game"}
        </button>
        {(gameStatus === "win" || gameStatus === "draw" || gameStatus === "closed") && (
          <button className="btn-primary" onClick={handleNewGame} disabled={isLoading}>
            {isLoading ? "Working..." : "New Game"}
          </button>
        )}
        <button className="btn-neutral" onClick={handleCloseGame} disabled={isLoading || gameStatus === "closed"}>
          Close Game
        </button>
        <button className="btn-secondary" onClick={handleChangeMode} disabled={isLoading}>
          Change Mode
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
              className={`cell ${isWinCell ? "win" : ""} ${cell === "X" ? "cell-x" : cell === "O" ? "cell-o" : ""}`}
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
              <button className="btn-primary" onClick={handleNewGame}>New Game</button>
              <button className="btn-neutral" onClick={handleCloseGame}>Close</button>
              <button className="btn-secondary" onClick={handleChangeMode}>Change Mode</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
