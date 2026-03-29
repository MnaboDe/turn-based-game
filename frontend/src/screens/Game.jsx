import { useEffect, useRef, useState } from "react";
import { getTokens } from "../api/authStorage";
import { getCurrentMatch, makeMove } from "../api/matchmaking";
import "./Game.css";

function Game({ user, matchId, onBackToLobby }) {
  const [matchInfo, setMatchInfo] = useState(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmittingMove, setIsSubmittingMove] = useState(false);
  const [selectedPitIndex, setSelectedPitIndex] = useState(null);
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

  useEffect(() => {
    setSelectedPitIndex(null);
  }, [matchInfo?.matchId, matchInfo?.movesCount, matchInfo?.state]);

  function canSelectPit(pitIndex) {
    if (!matchInfo) {
      return false;
    }

    if (matchInfo.state !== "active") {
      return false;
    }

    if (!matchInfo.isYourTurn) {
      return false;
    }

    if (isSubmittingMove) {
      return false;
    }

    const stones = matchInfo.playerPits?.[pitIndex] ?? 0;
    return stones > 0;
  }

  async function handleMakeMove() {
    if (selectedPitIndex === null) {
      return;
    }

    try {
      setError("");
      setIsSubmittingMove(true);

      const tokens = getTokens();
      const accessToken = tokens?.access_token;

      if (!accessToken) {
        throw new Error("Missing access token");
      }

      const updatedMatch = await makeMove(accessToken, selectedPitIndex);
      setMatchInfo(updatedMatch);
      setSelectedPitIndex(null);
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
  const moveNumber = (matchInfo?.movesCount ?? 0) + 1;

  let turnLabel = "Loading...";

  if (matchInfo?.state === "finished") {
    if (matchInfo.winner === "draw") {
      turnLabel = "Draw";
    } else {
      turnLabel = "Game finished";
    }
  } else {
    turnLabel = isYourTurn ? "Your turn" : "Opponent's turn";
  }

  const canSubmitMove =
    matchInfo?.state === "active" &&
    isYourTurn &&
    selectedPitIndex !== null &&
    !isSubmittingMove;

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
          <p>Move number: {moveNumber}</p>

          <div className="kalah-board">
            <div className="kalah-store">
              {matchInfo.opponentStore}
            </div>

            <div className="kalah-middle">
              <div className="kalah-row">
                {matchInfo.opponentPits.map((stones, index) => (
                  <button
                    key={`opponent-${index}`}
                    type="button"
                    disabled
                    className="kalah-pit kalah-pit-opponent"
                  >
                    {stones}
                  </button>
                ))}
              </div>

              <div className="kalah-row">
                {matchInfo.playerPits.map((stones, index) => {
                  const isSelectable = canSelectPit(index);
                  const isSelected = selectedPitIndex === index;

                  let className = "kalah-pit kalah-pit-player";

                  if (!isSelectable) {
                    className += " kalah-pit-disabled";
                  }

                  if (isSelected) {
                    className += " kalah-pit-selected";
                  }

                  return (
                    <button
                      key={`player-${index}`}
                      type="button"
                      disabled={!isSelectable}
                      className={className}
                      onClick={() => setSelectedPitIndex(index)}
                    >
                      {stones}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="kalah-store">
              {matchInfo.playerStore}
            </div>
          </div>

          <p>
            Selected pit: {selectedPitIndex !== null ? selectedPitIndex + 1 : "None"}
          </p>

          <button onClick={handleMakeMove} disabled={!canSubmitMove}>
            {isSubmittingMove ? "Making move..." : "Move"}
          </button>
        </>
      )}

      <button onClick={onBackToLobby}>Back to Lobby</button>
    </div>
  );
}

export default Game;