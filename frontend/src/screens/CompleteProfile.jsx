import { useState } from "react";
import { getStoredAccessToken, updateDisplayName } from "../api/auth";

function CompleteProfile({ onComplete }) {
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();

    const trimmedDisplayName = displayName.trim();

    if (!trimmedDisplayName) {
      setError("Nickname is required.");
      return;
    }

    try {
      setError("");
      setIsSaving(true);

      const accessToken = getStoredAccessToken();

      if (!accessToken) {
        throw new Error("Missing access token");
      }

      await updateDisplayName(accessToken, trimmedDisplayName);
      onComplete(trimmedDisplayName);
    } catch (saveError) {
      console.error("Failed to save display name:", saveError);
      setError("Failed to save nickname.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div>
      <h2>Choose your nickname</h2>
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          value={displayName}
          onChange={(event) => setDisplayName(event.target.value)}
          placeholder="Enter nickname"
          maxLength={30}
        />
        <button type="submit" disabled={isSaving}>
          {isSaving ? "Saving..." : "Save nickname"}
        </button>
      </form>

      {error && <p>{error}</p>}
    </div>
  );
}

export default CompleteProfile;