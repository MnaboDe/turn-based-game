import { DeleteCommand } from "@aws-sdk/lib-dynamodb";
import { docClient, WAITING_QUEUE_TABLE } from "../lib/dynamo.js";
import { jsonResponse } from "../lib/response.js";

export async function handleCancelMatchmaking(user) {
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