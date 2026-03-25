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
  const [isLoading, setIsLoading] = useState(hasAuthCode);
  const processed = useRef(false);

  useEffect(() => {
    const restoredSession = restoreUserFromStoredTokens();

    if (restoredSession) {
      setUser(restoredSession.user);
      setScreen("lobby");
      setIsLoading(false);
      return;
    }

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
    setScreen("login");
    signOut();
  };

  return (
    <main>
      <h1>Turn-Based Game</h1>

      {isLoading && <Loading />}

      {!isLoading && screen === "login" && <Login />}

      {screen === "lobby" && (
        <Lobby
          user={user}
          onFindMatch={() => setScreen("game")}
          onBackToHome={handleSignOut}
        />
      )}

      {screen === "game" && (
        <Game user={user} onBackToLobby={() => setScreen("lobby")} />
      )}
    </main>
  );
}

export default App;