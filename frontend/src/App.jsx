import { useEffect, useRef, useState } from "react";
import { signOutEverywhere, getCurrentUserProfile } from "./api/auth";
import { clearTokens } from "./api/authStorage";
import { getMatchmakingStatus } from "./api/matchmaking";
import {
  hasAuthCodeInUrl,
  restoreUserFromStoredTokens,
  processCognitoCallback,
} from "./app/initAuth";
import Login from "./screens/Login";
import Lobby from "./screens/Lobby";
import Game from "./screens/Game";
import Loading from "./screens/Loading";
import CompleteProfile from "./screens/CompleteProfile";

function App() {
  const hasAuthCode = hasAuthCodeInUrl();

  const [screen, setScreen] = useState(hasAuthCode ? "callback" : "login");
  const [user, setUser] = useState(null);
  const [matchId, setMatchId] = useState(null);
  const [isLoading, setIsLoading] = useState(hasAuthCode);
  const processed = useRef(false);

  useEffect(() => {
    const restoreActiveMatch = async (accessToken) => {
      if (!accessToken) {
        return null;
      }

      const statusResult = await getMatchmakingStatus(accessToken);

      if (statusResult.status === "matched" && statusResult.matchId) {
        return statusResult.matchId;
      }

      return null;
    };

    const ensureDisplayName = async (accessToken) => {
      if (!accessToken) {
        return { hasDisplayName: false, displayName: null };
      }

      const profile = await getCurrentUserProfile(accessToken);
      const displayName = profile.attributes["custom:displayName"] || null;

      return {
        hasDisplayName: Boolean(displayName),
        displayName,
      };
    };

    const initializeApp = async () => {
      const restoredSession = await restoreUserFromStoredTokens();

      if (restoredSession) {
        setUser(restoredSession.user);

        try {
          const profileState = await ensureDisplayName(
            restoredSession.tokens?.access_token,
          );

          if (!profileState.hasDisplayName) {
            setScreen("complete-profile");
            setIsLoading(false);
            return;
          }

          setUser((currentUser) => ({
            ...currentUser,
            username: profileState.displayName,
          }));

          const restoredMatchId = await restoreActiveMatch(
            restoredSession.tokens?.access_token,
          );

          if (restoredMatchId) {
            setMatchId(restoredMatchId);
            setScreen("game");
            setIsLoading(false);
            return;
          }
        } catch (error) {
          console.error("Failed to restore user profile or active match:", error);
        }

        setScreen("lobby");
        setIsLoading(false);
        return;
      }

      if (processed.current) {
        return;
      }

      if (!hasAuthCodeInUrl()) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      processed.current = true;

      try {
        const callbackSession = await processCognitoCallback();

        if (!callbackSession) {
          setScreen("login");
          return;
        }

        setUser(callbackSession.user);

        try {
          const profileState = await ensureDisplayName(
            callbackSession.tokens?.access_token,
          );

          if (!profileState.hasDisplayName) {
            setScreen("complete-profile");
            return;
          }

          setUser((currentUser) => ({
            ...currentUser,
            username: profileState.displayName,
          }));

          const restoredMatchId = await restoreActiveMatch(
            callbackSession.tokens?.access_token,
          );

          if (restoredMatchId) {
            setMatchId(restoredMatchId);
            setScreen("game");
            return;
          }
        } catch (error) {
          console.error(
            "Failed to restore user profile or active match after callback:",
            error,
          );
        }

        setScreen("lobby");
      } catch (error) {
        console.error("Authentication callback failed:", error);
        clearTokens();
        setUser(null);
        setMatchId(null);
        setScreen("login");
      } finally {
        setIsLoading(false);
      }
    };

    initializeApp();
  }, []);

  const handleSignOut = async () => {
    setUser(null);
    setMatchId(null);
    setScreen("login");

    try {
      await signOutEverywhere();
    } catch (error) {
      console.error("Sign out failed:", error);
    }
  };

  const handleMatchFound = (newMatchId) => {
    setMatchId(newMatchId);
    setScreen("game");
  };

  const handleBackToLobby = () => {
    setMatchId(null);
    setScreen("lobby");
  };

  const handleProfileCompleted = (displayName) => {
    setUser((currentUser) => ({
      ...currentUser,
      username: displayName,
    }));
    setScreen("lobby");
  };

  return (
    <main>
      <h1>Turn-Based Game</h1>

      {isLoading && <Loading />}

      {!isLoading && screen === "login" && <Login />}

      {!isLoading && screen === "complete-profile" && (
        <CompleteProfile onComplete={handleProfileCompleted} />
      )}

      {!isLoading && screen === "lobby" && (
        <Lobby
          user={user}
          onFindMatch={handleMatchFound}
          onSignOut={handleSignOut}
        />
      )}

      {!isLoading && screen === "game" && (
        <Game
          user={user}
          matchId={matchId}
          onBackToLobby={handleBackToLobby}
        />
      )}
    </main>
  );
}

export default App;