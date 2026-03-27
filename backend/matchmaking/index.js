import crypto from "node:crypto";
import { DeleteCommand } from "@aws-sdk/lib-dynamodb";
import { docClient, WAITING_QUEUE_TABLE } from "./lib/dynamo.js";
import { getUserFromEvent } from "./lib/auth.js";
import { jsonResponse } from "./lib/response.js";
import {
  getCurrentEpochSeconds,
  putPlayerIntoQueueIfAbsent,
  createMatchTransaction,
  findActiveMatchByPlayer,
  getWaitingOpponent,
  isTransactionCanceled,
} from "./lib/matchmakingRepository.js";

export const handler = async (event) => {
  console.log("Incoming event:", JSON.stringify(event, null, 2));

  try {
    const method = event.requestContext?.http?.method;
    const path = event.requestContext?.http?.path;

    const user = getUserFromEvent(event);

    if (!user?.playerId) {
      return jsonResponse(401, { message: "Unauthorized" });
    }

    if (method === "POST" && path === "/matchmaking/join") {
      return await handleJoin(user);
    }

    if (method === "GET" && path === "/matchmaking/status") {
      return await handleStatus(user);
    }

    if (method === "POST" && path === "/matchmaking/cancel") {
      return await handleCancel(user);
    }

    return jsonResponse(404, { message: "Not found" });
  } catch (error) {
    console.error("Handler error:", error);
    return jsonResponse(500, { message: "Internal server error" });
  }
};

async function handleJoin(user) {
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

async function handleCancel(user) {
  await docClient.send(
    new DeleteCommand({
      TableName: WAITING_QUEUE_TABLE,
      Key: {
        playerId: user.playerId,
      },
    }),
  );

  return jsonResponse(200, {
    status: "cancelled",
  });
}

async function handleStatus(user) {
  const match = await findActiveMatchByPlayer(user.playerId);

  if (match) {
    return jsonResponse(200, {
      status: "matched",
      matchId: match.matchId,
    });
  }

  return jsonResponse(200, { status: "waiting" });
}