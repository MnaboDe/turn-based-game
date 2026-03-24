import { useState } from "react";
import Login from "./screens/Login";
import Lobby from "./screens/Lobby";
import Game from "./screens/Game";

function App() {
  const [screen, setScreen] = useState("login");

  return (
    <main>
      <h1>Turn-Based Game</h1>

      {screen === "login" && <Login onSignIn={() => setScreen("lobby")} />}

      {screen === "lobby" && (
        <Lobby
          onFindMatch={() => setScreen("game")}
          onBackToHome={() => setScreen("login")}
        />
      )}

      {screen === "game" && <Game onBackToLobby={() => setScreen("lobby")} />}
    </main>
  );
}

export default App;
