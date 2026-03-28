import { useEffect, useRef, useState } from "react";
import { getTokens } from "../api/authStorage";
import { getCurrentMatch, makeMove } from "../api/matchmaking";
import "./Game.css";

function Game({ user, matchId, onBackToLobby }) {
  const [matchInfo, setMatchInfo] = useState(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmittingMove, setIsSubmittingMove] = useState(false);
  const pollingRef = useRef(null);

  function stopPolling() {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  }

  async function loadMatch(showError = true) {
    try {
      const tokens = getTokens();
      const accessToken = tokens?.access_token;

      if (!accessToken) {
        throw new Error("Missing access token");
      }

      const result = await getCurrentMatch(accessToken);
      setMatchInfo(result);

      if (showError) {
        setError("");
      }
    } catch (loadError) {
      console.error("Failed to load current match:", loadError);

      if (showError) {
        setError("Failed to load match information.");
      }
    }
  }

  useEffect(() => {
    const initialize = async () => {
      setIsLoading(true);
      await loadMatch();
      setIsLoading(false);
    };

    initialize();

    pollingRef.current = setInterval(() => {
      loadMatch(false);
    }, 2000);

    return () => {
      stopPolling();
    };
  }, []);

  async function handleMakeMove() {
    try {
      setError("");
      setIsSubmittingMove(true);

      const tokens = getTokens();
      const accessToken = tokens?.access_token;

      if (!accessToken) {
        throw new Error("Missing access token");
      }

      const updatedMatch = await makeMove(accessToken);
      setMatchInfo(updatedMatch);
    } catch (moveError) {
      console.error("Failed to make move:", moveError);
      setError(moveError.message || "Failed to make move.");
      await loadMatch(false);
    } finally {
      setIsSubmittingMove(false);
    }
  }

  const isYourTurn = matchInfo?.isYourTurn ?? false;
  const opponentName = matchInfo?.opponentUsername || "Unknown opponent";
  const nextMoveNumber = matchInfo?.nextMoveNumber ?? 1;
  const turnLabel = isYourTurn ? "Your turn" : "Opponent's turn";

  return (
    <div className="game-container">
      <h2>Game</h2>

      {user && <p>Player: {user.username} (ID: {user.userId})</p>}
      {matchId && <p>Match ID: {matchId}</p>}

      {isLoading && <p>Loading match information...</p>}

      {!isLoading && error && <p>{error}</p>}

      {!isLoading && matchInfo && (
        <>
          <p>Opponent: {opponentName}</p>
          <p>{turnLabel}</p>
          <p>Move number: {nextMoveNumber}</p>

          <button
            onClick={handleMakeMove}
            disabled={!isYourTurn || isSubmittingMove}
          >
            {isSubmittingMove ? "Making move..." : "Make Move"}
          </button>

          <p>Game screen is under construction.</p>
        </>
      )}

      <button onClick={onBackToLobby}>Back to Lobby</button>
    </div>
  );
}

export default Game;