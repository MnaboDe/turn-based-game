import Lobby from "./screens/Lobby";
import Game from "./screens/Game";

function App() {
  return (
    <main>
      <h1>Turn-Based Game</h1>
      <Lobby />
      <Game />
      <button>Find Match</button>
    </main>
  );
}

export default App;