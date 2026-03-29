import { jsonResponse } from "../lib/response.js";
import {
  findActiveMatchByPlayer,
  buildMatchView,
  makeMove,
} from "../lib/matchmakingRepository.js";

export async function handleMakeMove(user, event) {
  const match = await findActiveMatchByPlayer(user.playerId);

  if (!match) {
    return jsonResponse(404, { message: "Active match not found" });
  }

  if (match.turn !== user.playerId) {
    return jsonResponse(409, { message: "It is not your turn" });
  }

  let body = {};

  try {
    body = event?.body ? JSON.parse(event.body) : {};
  } catch {
    return jsonResponse(400, { message: "Invalid request body" });
  }

  const pitIndex = body.pitIndex;

  if (!Number.isInteger(pitIndex) || pitIndex < 0 || pitIndex > 5) {
    return jsonResponse(400, { message: "pitIndex must be an integer from 0 to 5" });
  }

  try {
    const updatedMatch = await makeMove(match, user.playerId, pitIndex);

    return jsonResponse(200, buildMatchView(updatedMatch, user.playerId));
  } catch (error) {
    if (error.name === "ConditionalCheckFailedException") {
      return jsonResponse(409, { message: "Move could not be applied" });
    }

    if (error.message === "Selected pit is empty") {
      return jsonResponse(400, { message: "Selected pit is empty" });
    }

    if (error.message === "Invalid pit index") {
      return jsonResponse(400, { message: "Invalid pit index" });
    }

    if (error.message === "It is not your turn") {
      return jsonResponse(409, { message: "It is not your turn" });
    }

    if (error.message === "Match is not active") {
      return jsonResponse(409, { message: "Match is not active" });
    }

    throw error;
  }
}