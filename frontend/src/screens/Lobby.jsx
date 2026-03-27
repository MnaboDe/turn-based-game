import { useEffect, useRef, useState } from "react";
import { getTokens } from "../api/authStorage";
import {
  joinMatchmaking,
  getMatchmakingStatus,
  cancelMatchmaking,
} from "../api/matchmaking";

function Lobby({ user, onFindMatch, onBackToHome }) {
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState("");
  const pollingRef = useRef(null);

  function stopPolling() {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  }

  async function handleFindMatch() {
    if (isSearching) {
      return;
    }
    try {
      setError("");

      const tokens = getTokens();
      const accessToken = tokens?.access_token;

      if (!accessToken) {
        throw new Error("Missing access token");
      }

      const joinResult = await joinMatchmaking(accessToken);

      if (joinResult.status === "matched" && joinResult.matchId) {
        onFindMatch(joinResult.matchId);
        return;
      }

      setIsSearching(true);

      stopPolling();

      pollingRef.current = setInterval(async () => {
        try {
          const statusResult = await getMatchmakingStatus(accessToken);

          if (statusResult.status === "matched" && statusResult.matchId) {
            stopPolling();
            setIsSearching(false);
            onFindMatch(statusResult.matchId);
          }
        } catch (pollError) {
          console.error("Matchmaking polling failed:", pollError);
          stopPolling();
          setIsSearching(false);
          setError("Failed to check matchmaking status.");
        }
      }, 2000);
    } catch (joinError) {
      console.error("Join matchmaking failed:", joinError);
      setIsSearching(false);
      setError("Failed to start matchmaking.");
    }
  }

  async function handleCancelSearch() {
    if (!isSearching) {
      return;
    }
    try {
      setError("");

      const tokens = getTokens();
      const accessToken = tokens?.access_token;

      if (!accessToken) {
        throw new Error("Missing access token");
      }

      await cancelMatchmaking(accessToken);

      stopPolling();
      setIsSearching(false);
    } catch (cancelError) {
      console.error("Cancel matchmaking failed:", cancelError);
      setError("Failed to cancel matchmaking.");
    }
  }

  useEffect(() => {
    return () => {
      stopPolling();
    };
  }, []);

  return (
    <div>
      <h2>Lobby</h2>
      <p>Welcome, {user?.username}</p>

      {error && <p>{error}</p>}

      {!isSearching && <button onClick={handleFindMatch}>Find Match</button>}

      {isSearching && (
        <>
          <p>Searching for a match...</p>
          <button onClick={handleCancelSearch}>Cancel Search</button>
        </>
      )}

      <button onClick={onBackToHome}>Sign Out</button>
    </div>
  );
}

export default Lobby;
