import { useEffect, useRef, useState } from "react";
import {
  exchangeCodeForToken,
  parseJwt,
  saveTokens,
  getTokens,
  clearTokens,
  signOut,
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
      const userData = parseJwt(existingTokens.id_token);

      setUser({
        username: userData.email || userData["cognito:username"],
        userId: userData.sub,
      });

      setScreen("lobby");
      return;
    }

    const handleCognitoCallback = async () => {
      if (processed.current) {
        return;
      }

      const params = new URLSearchParams(window.location.search);
      const code = params.get("code");

      if (!code) {
        return;
      }

      setIsLoading(true);
      processed.current = true;

      try {
        const tokens = await exchangeCodeForToken(code);
        console.log("Tokens:", tokens);

        saveTokens(tokens);

        const userData = parseJwt(tokens.id_token);

        setUser({
          username: userData.email || userData["cognito:username"],
          userId: userData.sub,
        });

        setScreen("lobby");
        window.history.replaceState({}, document.title, "/");
      } catch (error) {
        console.error("Token exchange failed:", error);
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
