import "./Game.css";

function Game({ user, onBackToLobby }) {
  return (
    <div className="game-container">
      <h2>Game</h2>
      {user && <p>Player: {user.username} (ID: {user.userId})</p>}
      <p>Match found.</p>
      <p>Game screen is under construction.</p>
      <button onClick={onBackToLobby}>Back to Lobby</button>
    </div>
  );
}

export default Game;