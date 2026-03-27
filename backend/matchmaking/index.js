import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  DeleteCommand,
  QueryCommand,
} from "@aws-sdk/lib-dynamodb";
import crypto from "node:crypto";

const dynamoClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(dynamoClient);

const WAITING_QUEUE_TABLE = process.env.WAITING_QUEUE_TABLE;
const MATCHES_TABLE = process.env.MATCHES_TABLE;

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

function getUserFromEvent(event) {
  const claims =
    event.requestContext?.authorizer?.jwt?.claims ||
    event.requestContext?.authorizer?.claims ||
    {};

  return {
    playerId: claims.sub,
    username: claims.email || claims["cognito:username"] || "unknown",
  };
}

async function handleJoin(user) {
  // Check whether the player already has an active match
  const existingMatch = await findMatchByPlayer(user.playerId);
  if (existingMatch) {
    return jsonResponse(200, {
      status: "matched",
      matchId: existingMatch.matchId,
    });
  }

  // Check whether the player is already waiting in the queue
  const existingQueueItem = await docClient.send(
    new GetCommand({
      TableName: WAITING_QUEUE_TABLE,
      Key: {
        playerId: user.playerId,
      },
    }),
  );

  if (existingQueueItem.Item) {
    return jsonResponse(200, { status: "waiting" });
  }

  // Query waiting players from the queue
  const waitingPlayersResult = await docClient.send(
    new QueryCommand({
      TableName: WAITING_QUEUE_TABLE,
      IndexName: "status-joinedAt-index",
      KeyConditionExpression: "#status = :waiting",
      ExpressionAttributeNames: {
        "#status": "status",
      },
      ExpressionAttributeValues: {
        ":waiting": "waiting",
      },
      Limit: 10,
    }),
  );

  const opponent = (waitingPlayersResult.Items || []).find(
    (item) => item.playerId !== user.playerId,
  );

  if (!opponent) {
    // Put the current player into the waiting queue
    await docClient.send(
      new PutCommand({
        TableName: WAITING_QUEUE_TABLE,
        Item: {
          playerId: user.playerId,
          status: "waiting",
          joinedAt: new Date().toISOString(),
          username: user.username,
        },
      }),
    );

    return jsonResponse(200, { status: "waiting" });
  }

  const matchId = `match-${crypto.randomUUID()}`;

  // Create a new match
  await docClient.send(
    new PutCommand({
      TableName: MATCHES_TABLE,
      Item: {
        matchId,
        player1: opponent.playerId,
        player2: user.playerId,
        createdAt: new Date().toISOString(),
        state: "active",
        turn: opponent.playerId,
        winner: null,
      },
    }),
  );

  // Remove both players from the waiting queue
  await docClient.send(
    new DeleteCommand({
      TableName: WAITING_QUEUE_TABLE,
      Key: {
        playerId: opponent.playerId,
      },
    }),
  );

  await docClient.send(
    new DeleteCommand({
      TableName: WAITING_QUEUE_TABLE,
      Key: {
        playerId: user.playerId,
      },
    }),
  );

  return jsonResponse(200, {
    status: "matched",
    matchId,
  });
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
  const match = await findMatchByPlayer(user.playerId);

  if (!match) {
    return jsonResponse(200, { status: "waiting" });
  }

  return jsonResponse(200, {
    status: "matched",
    matchId: match.matchId,
  });
}

async function findMatchByPlayer(playerId) {
  const player1Result = await docClient.send(
    new QueryCommand({
      TableName: MATCHES_TABLE,
      IndexName: "player1-index",
      KeyConditionExpression: "player1 = :playerId",
      ExpressionAttributeValues: {
        ":playerId": playerId,
      },
      Limit: 1,
    }),
  );

  if (player1Result.Items && player1Result.Items.length > 0) {
    return player1Result.Items[0];
  }

  const player2Result = await docClient.send(
    new QueryCommand({
      TableName: MATCHES_TABLE,
      IndexName: "player2-index",
      KeyConditionExpression: "player2 = :playerId",
      ExpressionAttributeValues: {
        ":playerId": playerId,
      },
      Limit: 1,
    }),
  );

  if (player2Result.Items && player2Result.Items.length > 0) {
    return player2Result.Items[0];
  }

  return null;
}

function jsonResponse(statusCode, body) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  };
}