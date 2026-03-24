import { useState } from "react";
import Login from "./screens/Login";
import Lobby from "./screens/Lobby";
import Game from "./screens/Game";

function App() {
  const [screen, setScreen] = useState("login");
  const [user, setUser] = useState(null);

  const handleAuthSuccess = (authenticatedUser) => {
    setUser(authenticatedUser);
    setScreen("lobby");
  };

  const handleSignOut = () => {
    setUser(null);
    setScreen("login");
  };

  return (
    <main>
      <h1>Turn-Based Game</h1>

      {screen === "login" && <Login onAuthSuccess={handleAuthSuccess} />}

      {screen === "lobby" && (
        <Lobby
          user={user}
          onFindMatch={() => setScreen("game")}
          onBackToHome={handleSignOut}
        />
      )}

      {screen === "game" && <Game onBackToLobby={() => setScreen("lobby")} />}
    </main>
  );
}

export default App;
