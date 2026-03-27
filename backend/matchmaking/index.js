import {
  DynamoDBClient,
  TransactWriteItemsCommand,
} from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  PutCommand,
  DeleteCommand,
  QueryCommand,
} from "@aws-sdk/lib-dynamodb";
import crypto from "node:crypto";

const dynamoClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(dynamoClient);

const WAITING_QUEUE_TABLE = process.env.WAITING_QUEUE_TABLE;
const MATCHES_TABLE = process.env.MATCHES_TABLE;
const QUEUE_TTL_SECONDS = 120;

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

function getCurrentEpochSeconds() {
  return Math.floor(Date.now() / 1000);
}

function getQueueExpiryEpochSeconds() {
  return getCurrentEpochSeconds() + QUEUE_TTL_SECONDS;
}

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

  const nowEpochSeconds = getCurrentEpochSeconds();

  const opponent = (waitingPlayersResult.Items || []).find(
    (item) =>
      item.playerId !== user.playerId &&
      typeof item.expiresAt === "number" &&
      item.expiresAt > nowEpochSeconds,
  );

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

async function putPlayerIntoQueueIfAbsent(user) {
  await docClient.send(
    new PutCommand({
      TableName: WAITING_QUEUE_TABLE,
      Item: {
        playerId: user.playerId,
        status: "waiting",
        joinedAt: new Date().toISOString(),
        username: user.username,
        expiresAt: getQueueExpiryEpochSeconds(),
      },
      ConditionExpression: "attribute_not_exists(playerId)",
    }),
  );
}

async function createMatchTransaction({
  matchId,
  createdAt,
  player1,
  player2,
  nowEpochSeconds,
}) {
  await dynamoClient.send(
    new TransactWriteItemsCommand({
      TransactItems: [
        {
          Delete: {
            TableName: WAITING_QUEUE_TABLE,
            Key: {
              playerId: { S: player1 },
            },
            ConditionExpression:
              "attribute_exists(playerId) AND #status = :waiting AND expiresAt > :now",
            ExpressionAttributeNames: {
              "#status": "status",
            },
            ExpressionAttributeValues: {
              ":waiting": { S: "waiting" },
              ":now": { N: String(nowEpochSeconds) },
            },
          },
        },
        {
          Delete: {
            TableName: WAITING_QUEUE_TABLE,
            Key: {
              playerId: { S: player2 },
            },
            ConditionExpression:
              "attribute_exists(playerId) AND #status = :waiting AND expiresAt > :now",
            ExpressionAttributeNames: {
              "#status": "status",
            },
            ExpressionAttributeValues: {
              ":waiting": { S: "waiting" },
              ":now": { N: String(nowEpochSeconds) },
            },
          },
        },
        {
          Put: {
            TableName: MATCHES_TABLE,
            Item: {
              matchId: { S: matchId },
              player1: { S: player1 },
              player2: { S: player2 },
              createdAt: { S: createdAt },
              state: { S: "active" },
              turn: { S: player1 },
              winner: { NULL: true },
            },
            ConditionExpression: "attribute_not_exists(matchId)",
          },
        },
      ],
    }),
  );
}

async function findActiveMatchByPlayer(playerId) {
  const player1Result = await docClient.send(
    new QueryCommand({
      TableName: MATCHES_TABLE,
      IndexName: "player1-index",
      KeyConditionExpression: "player1 = :playerId",
      ExpressionAttributeValues: {
        ":playerId": playerId,
      },
      Limit: 10,
    }),
  );

  const activePlayer1Match = (player1Result.Items || []).find(
    (item) => item.state === "active",
  );

  if (activePlayer1Match) {
    return activePlayer1Match;
  }

  const player2Result = await docClient.send(
    new QueryCommand({
      TableName: MATCHES_TABLE,
      IndexName: "player2-index",
      KeyConditionExpression: "player2 = :playerId",
      ExpressionAttributeValues: {
        ":playerId": playerId,
      },
      Limit: 10,
    }),
  );

  const activePlayer2Match = (player2Result.Items || []).find(
    (item) => item.state === "active",
  );

  if (activePlayer2Match) {
    return activePlayer2Match;
  }

  return null;
}

function isTransactionCanceled(error) {
  return (
    error?.name === "TransactionCanceledException" ||
    error?.name === "TransactionConflictException"
  );
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