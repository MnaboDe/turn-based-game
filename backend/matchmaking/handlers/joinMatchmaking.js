import crypto from "node:crypto";
import { jsonResponse } from "../lib/response.js";
import {
  getCurrentEpochSeconds,
  putPlayerIntoQueueIfAbsent,
  createMatchTransaction,
  findActiveMatchByPlayer,
  getWaitingOpponent,
  isTransactionCanceled,
} from "../lib/matchmakingRepository.js";

export async function handleJoinMatchmaking(user) {
  const existingMatch = await findActiveMatchByPlayer(user.playerId);

  if (existingMatch) {
    return jsonResponse(200, {
      status: "matched",
      matchId: existingMatch.matchId,
    });
  }

  try {
    await putPlayerIntoQueueIfAbsent(user);
  } catch (error) {
    if (error.name !== "ConditionalCheckFailedException") {
      throw error;
    }
  }

  const nowEpochSeconds = getCurrentEpochSeconds();
  const opponent = await getWaitingOpponent(user.playerId, nowEpochSeconds);

  if (!opponent) {
    return jsonResponse(200, { status: "waiting" });
  }

  const userLatestMatch = await findActiveMatchByPlayer(user.playerId);
  if (userLatestMatch) {
    return jsonResponse(200, {
      status: "matched",
      matchId: userLatestMatch.matchId,
    });
  }

  const opponentLatestMatch = await findActiveMatchByPlayer(opponent.playerId);
  if (opponentLatestMatch) {
    return jsonResponse(200, { status: "waiting" });
  }

  const matchId = `match-${crypto.randomUUID()}`;
  const createdAt = new Date().toISOString();

  try {
    await createMatchTransaction({
      matchId,
      createdAt,
      player1: opponent.playerId,
      player2: user.playerId,
      nowEpochSeconds,
    });

    return jsonResponse(200, {
      status: "matched",
      matchId,
    });
  } catch (error) {
    if (isTransactionCanceled(error)) {
      console.warn("Match transaction cancelled:", error);
      return jsonResponse(200, { status: "waiting" });
    }

    throw error;
  }
}