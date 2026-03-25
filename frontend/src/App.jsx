import { useEffect, useRef, useState } from "react";
import { signOut } from "./api/auth";
import { clearTokens } from "./api/authStorage";
import {
  hasAuthCodeInUrl,
  restoreUserFromStoredTokens,
  processCognitoCallback,
} from "./app/initAuth";
import Login from "./screens/Login";
import Lobby from "./screens/Lobby";
import Game from "./screens/Game";
import Loading from "./screens/Loading";

function App() {
  const hasAuthCode = hasAuthCodeInUrl();

  const [screen, setScreen] = useState(hasAuthCode ? "callback" : "login");
  const [user, setUser] = useState(null);
  const [matchId, setMatchId] = useState(null);
  const [isLoading, setIsLoading] = useState(hasAuthCode);
  const processed = useRef(false);

  useEffect(() => {
    const initializeApp = async () => {
      const restoredSession = await restoreUserFromStoredTokens();

      if (restoredSession) {
        setUser(restoredSession.user);
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

    const handleCognitoCallback = async () => {
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

    handleCognitoCallback();
  }, []);

  const handleSignOut = () => {
    clearTokens();
    setUser(null);
    setMatchId(null);
    setScreen("login");
    signOut();
  };

  const handleMatchFound = (newMatchId) => {
    setMatchId(newMatchId);
    setScreen("game");
  };

  const handleBackToLobby = () => {
    setMatchId(null);
    setScreen("lobby");
  };

  return (
    <main>
      <h1>Turn-Based Game</h1>

      {isLoading && <Loading />}

      {!isLoading && screen === "login" && <Login />}

      {!isLoading && screen === "lobby" && (
        <Lobby
          user={user}
          onFindMatch={handleMatchFound}
          onBackToHome={handleSignOut}
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