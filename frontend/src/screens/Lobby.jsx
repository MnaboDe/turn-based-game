import { useState } from "react";
import "./Lobby.css";

function Lobby({ onFindMatch, onBackToHome }) {
  const [searching, setSearching] = useState(false);

  const handleFindMatch = () => {
    setSearching(true);

    // Simulate matchmaking
    setTimeout(() => {
      onFindMatch();
    }, 2000);
  };

  return (
    <div className="lobby-container">
      <h2>Lobby</h2>

      {!searching && (
        <div className="lobby-actions">
          <button onClick={handleFindMatch}>Find Match</button>
          <button onClick={onBackToHome}>Back to Home</button>
        </div>
      )}

      {searching && <p>Searching for opponent...</p>}
    </div>
  );
}

export default Lobby;