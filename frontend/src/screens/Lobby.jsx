import { useState } from "react";
import { signOut } from "../api/auth";
import "./Lobby.css";

function Lobby({ user, onFindMatch, onBackToHome }) {
  const [searching, setSearching] = useState(false);

  const handleFindMatch = () => {
    setSearching(true);

    // Simulate matchmaking
    setTimeout(() => {
      onFindMatch();
    }, 2000);
  };

  const handleSignOut = async () => {
    await signOut();
    onBackToHome();
  };

  return (
    <div className="lobby-container">
      <h2>Lobby</h2>
      {user && <p>Welcome, {user.username}</p>}

      {!searching && (
        <div className="lobby-actions">
          <button onClick={handleFindMatch}>Find Match</button>
          <button onClick={handleSignOut}>Sign Out</button>
        </div>
      )}

      {searching && <p>Searching for opponent...</p>}
    </div>
  );
}

export default Lobby;