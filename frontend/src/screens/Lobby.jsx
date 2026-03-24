function Lobby({ onFindMatch }) {
  return (
    <div>
      <h2>Lobby</h2>
      <p>Press button to find a match</p>
      <button onClick={onFindMatch}>Find Match</button>
    </div>
  );
}

export default Lobby;