import { useEffect, useRef, useState } from "react";
import {
  exchangeCodeForToken,
  parseJwt,
  saveTokens,
  getTokens,
  clearTokens,
  signOut,
  validateCallbackState,
  validateIdTokenNonce,
} from "./api/auth";
import Login from "./screens/Login";
import Lobby from "./screens/Lobby";
import Game from "./screens/Game";
import Loading from "./screens/Loading";

function App() {
  const hasAuthCode = new URLSearchParams(window.location.search).has("code");

  const [screen, setScreen] = useState(hasAuthCode ? "callback" : "login");
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(hasAuthCode);
  const processed = useRef(false);

  useEffect(() => {
    const existingTokens = getTokens();

    if (existingTokens) {
      try {
        const userData = parseJwt(existingTokens.id_token);

        setUser({
          username: userData.email || userData["cognito:username"],
          userId: userData.sub,
        });

        setScreen("lobby");
        setIsLoading(false);
        return;
      } catch (error) {
        console.error("Failed to restore user from stored token:", error);
        clearTokens();
      }
    }

    const handleCognitoCallback = async () => {
      if (processed.current) {
        return;
      }

      const params = new URLSearchParams(window.location.search);
      const code = params.get("code");
      const state = params.get("state");

      if (!code) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      processed.current = true;

      try {
        validateCallbackState(state);

        const tokens = await exchangeCodeForToken(code);
        console.log("Tokens:", tokens);

        saveTokens(tokens);

        const userData = validateIdTokenNonce(tokens.id_token);

        setUser({
          username: userData.email || userData["cognito:username"],
          userId: userData.sub,
        });

        setScreen("lobby");
        window.history.replaceState({}, document.title, "/");
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