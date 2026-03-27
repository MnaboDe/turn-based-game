import { useEffect, useState } from "react";
import { getTokens } from "../api/authStorage";
import { getCurrentMatch } from "../api/matchmaking";
import "./Game.css";

function Game({ user, matchId, onBackToLobby }) {
  const [matchInfo, setMatchInfo] = useState(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadMatch = async () => {
      try {
        setError("");
        setIsLoading(true);

        const tokens = getTokens();
        const accessToken = tokens?.access_token;

        if (!accessToken) {
          throw new Error("Missing access token");
        }

        const result = await getCurrentMatch(accessToken);
        setMatchInfo(result);
      } catch (loadError) {
        console.error("Failed to load current match:", loadError);
        setError("Failed to load match information.");
      } finally {
        setIsLoading(false);
      }
    };

    loadMatch();
  }, []);

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

      {!isLoading && !error && matchInfo && (
        <>
          <p>Opponent: {opponentName}</p>
          <p>{turnLabel}</p>
          <p>Move number: {nextMoveNumber}</p>

          <button disabled={!isYourTurn}>Make Move</button>

          <p>Game screen is under construction.</p>
        </>
      )}

      <button onClick={onBackToLobby}>Back to Lobby</button>
    </div>
  );
}

export default Game;