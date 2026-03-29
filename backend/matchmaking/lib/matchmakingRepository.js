import { TransactWriteItemsCommand } from "@aws-sdk/client-dynamodb";
import { PutCommand, QueryCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import {
  dynamoClient,
  docClient,
  WAITING_QUEUE_TABLE,
  MATCHES_TABLE,
  QUEUE_TTL_SECONDS,
} from "./dynamo.js";
import { createInitialBoard, applyMove } from "./kalah.js";

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
  player1Username,
  player2Username,
  nowEpochSeconds,
}) {
  const initialBoard = createInitialBoard();

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
              player1Username: { S: player1Username },
              player2Username: { S: player2Username },
              createdAt: { S: createdAt },
              lastUpdatedAt: { S: createdAt },
              state: { S: "active" },
              turn: { S: player1 },
              winner: { NULL: true },
              movesCount: { N: "0" },
              board: {
                L: initialBoard.map((value) => ({ N: String(value) })),
              },
              lastMove: {
                M: {
                  playerId: { NULL: true },
                  pitIndex: { NULL: true },
                  endedInStore: { BOOL: false },
                  capture: { BOOL: false },
                  extraTurn: { BOOL: false },
                },
              },
              finishedAt: { NULL: true },
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

export function buildMatchView(match, currentPlayerId) {
  if (!match) {
    return null;
  }

  const isPlayer1 = match.player1 === currentPlayerId;

  const board = Array.isArray(match.board) ? match.board : createInitialBoard();

  let playerPits;
  let opponentPits;
  let playerStore;
  let opponentStore;
  let opponentId;
  let opponentUsername;

  if (isPlayer1) {
    playerPits = board.slice(0, 6);
    opponentPits = board.slice(7, 13).reverse();
    playerStore = board[6];
    opponentStore = board[13];
    opponentId = match.player2;
    opponentUsername = match.player2Username;
  } else {
    playerPits = board.slice(7, 13);
    opponentPits = board.slice(0, 6).reverse();
    playerStore = board[13];
    opponentStore = board[6];
    opponentId = match.player1;
    opponentUsername = match.player1Username;
  }

  return {
    matchId: match.matchId,
    state: match.state,
    opponentId,
    opponentUsername,
    turn: match.turn ?? null,
    movesCount: Number(match.movesCount ?? 0),
    isYourTurn: match.state === "active" && match.turn === currentPlayerId,
    playerPits,
    opponentPits,
    playerStore,
    opponentStore,
    winner: match.winner ?? null,
    lastMove: match.lastMove ?? null,
  };
}

export async function makeMove(match, currentPlayerId, pitIndex) {
  const moveResult = applyMove(match, currentPlayerId, pitIndex);
  const nowIsoString = new Date().toISOString();

  const result = await docClient.send(
    new UpdateCommand({
      TableName: MATCHES_TABLE,
      Key: {
        matchId: match.matchId,
      },
      UpdateExpression: `
        SET
          board = :board,
          #turn = :turn,
          #state = :state,
          winner = :winner,
          movesCount = :movesCount,
          lastMove = :lastMove,
          lastUpdatedAt = :lastUpdatedAt,
          finishedAt = :finishedAt
      `,
      ConditionExpression: "#state = :active AND #turn = :currentPlayerId",
      ExpressionAttributeNames: {
        "#turn": "turn",
        "#state": "state",
      },
      ExpressionAttributeValues: {
        ":board": moveResult.board,
        ":turn": moveResult.turn ?? null,
        ":state": moveResult.state,
        ":winner": moveResult.winner ?? null,
        ":movesCount": moveResult.movesCount,
        ":lastMove": moveResult.lastMove,
        ":lastUpdatedAt": nowIsoString,
        ":finishedAt": moveResult.finishedAt ?? null,
        ":active": "active",
        ":currentPlayerId": currentPlayerId,
      },
      ReturnValues: "ALL_NEW",
    }),
  );

  return result.Attributes;
}