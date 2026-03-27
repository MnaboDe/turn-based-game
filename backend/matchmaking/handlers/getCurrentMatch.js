import { jsonResponse } from "../lib/response.js";
import {
  findActiveMatchByPlayer,
  buildMatchView,
} from "../lib/matchmakingRepository.js";

export async function handleGetCurrentMatch(user) {
  const match = await findActiveMatchByPlayer(user.playerId);

  if (!match) {
    return jsonResponse(404, { message: "Active match not found" });
  }

  return jsonResponse(200, buildMatchView(match, user.playerId));
}