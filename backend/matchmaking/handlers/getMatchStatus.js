import { jsonResponse } from "../lib/response.js";
import { findActiveMatchByPlayer } from "../lib/matchmakingRepository.js";

export async function handleGetMatchStatus(user) {
  const match = await findActiveMatchByPlayer(user.playerId);

  if (match) {
    return jsonResponse(200, {
      status: "matched",
      matchId: match.matchId,
    });
  }

  return jsonResponse(200, { status: "waiting" });
}