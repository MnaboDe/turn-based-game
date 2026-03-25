import { useEffect, useRef, useState } from "react";
import { joinMatchmaking, getMatchmakingStatus } from "../api/matchmaking";
import { getTokens } from "../api/authStorage";
import "./Lobby.css";

function Lobby({ user, onFindMatch, onBackToHome }) {
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState("");
  const pollingRef = useRef(null);

  useEffect(() => {
    return () => {
      stopPolling();
    };
  }, []);

  const stopPolling = () => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  };

  const startPolling = (accessToken) => {
    stopPolling();

    pollingRef.current = setInterval(async () => {
      try {
        const result = await getMatchmakingStatus(accessToken);

        if (result.status === "matched" && result.matchId) {
          stopPolling();
          setSearching(false);
          onFindMatch(result.matchId);
        }
      } catch (pollingError) {
        console.error("Matchmaking polling failed:", pollingError);
        stopPolling();
        setSearching(false);
        setError("Failed to check matchmaking status.");
      }
    }, 3000);
  };

  const handleFindMatch = async () => {
    setError("");
    setSearching(true);

    try {
      const tokens = getTokens();
      const accessToken = tokens?.access_token;

      if (!accessToken) {
        throw new Error("Missing access token");
      }

      const result = await joinMatchmaking(accessToken);

      if (result.status === "matched" && result.matchId) {
        setSearching(false);
        onFindMatch(result.matchId);
        return;
      }

      if (result.status === "waiting") {
        startPolling(accessToken);
        return;
      }

      throw new Error("Unexpected matchmaking response");
    } catch (joinError) {
      console.error("Matchmaking failed:", joinError);
      setSearching(false);
      setError("Failed to start matchmaking.");
    }
  };

  return (
    <div className="lobby-container">
      <h2>Lobby</h2>
      {user && <p>Welcome, {user.username} (ID: {user.userId})</p>}

      {!searching && (
        <div className="lobby-actions">
          <button onClick={handleFindMatch}>Find Match</button>
          <button onClick={onBackToHome}>Sign Out</button>
        </div>
      )}

      {searching && <p>Searching for opponent...</p>}
      {error && <p>{error}</p>}
    </div>
  );
}

export default Lobby;