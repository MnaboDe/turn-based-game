import { TransactWriteItemsCommand } from "@aws-sdk/client-dynamodb";
import { PutCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";
import {
  dynamoClient,
  docClient,
  WAITING_QUEUE_TABLE,
  MATCHES_TABLE,
  QUEUE_TTL_SECONDS,
} from "./dynamo.js";

export function getCurrentEpochSeconds() {
  return Math.floor(Date.now() / 1000);
}

export function getQueueExpiryEpochSeconds() {
  return getCurrentEpochSeconds() + QUEUE_TTL_SECONDS;
}

export async function putPlayerIntoQueueIfAbsent(user) {
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

export async function getWaitingOpponent(currentPlayerId, nowEpochSeconds) {
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

  return (waitingPlayersResult.Items || []).find(
    (item) =>
      item.playerId !== currentPlayerId &&
      typeof item.expiresAt === "number" &&
      item.expiresAt > nowEpochSeconds,
  );
}

export async function createMatchTransaction({
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

export async function findActiveMatchByPlayer(playerId) {
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

export function isTransactionCanceled(error) {
  return (
    error?.name === "TransactionCanceledException" ||
    error?.name === "TransactionConflictException"
  );
}