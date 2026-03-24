import "./Game.css";

function Game({ onBackToLobby }) {
  return (
    <div className="game-container">
      <h2>Game</h2>
      <p>Match found.</p>
      <p>Game screen is under construction.</p>
      <button onClick={onBackToLobby}>Back to Lobby</button>
    </div>
  );
}

export default Game;