import { jsonResponse } from "../lib/response.js";
import {
  findActiveMatchByPlayer,
  buildMatchView,
  makeMove,
} from "../lib/matchmakingRepository.js";

export async function handleMakeMove(user) {
  const match = await findActiveMatchByPlayer(user.playerId);

  if (!match) {
    return jsonResponse(404, { message: "Active match not found" });
  }

  if (match.turn !== user.playerId) {
    return jsonResponse(409, { message: "It is not your turn" });
  }

  try {
    const updatedMatch = await makeMove(match, user.playerId);

    return jsonResponse(200, buildMatchView(updatedMatch, user.playerId));
  } catch (error) {
    if (error.name === "ConditionalCheckFailedException") {
      return jsonResponse(409, { message: "Move could not be applied" });
    }

    throw error;
  }
}