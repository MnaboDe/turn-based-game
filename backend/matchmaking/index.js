import { getUserFromEvent } from "./lib/auth.js";
import { jsonResponse } from "./lib/response.js";
import { handleJoinMatchmaking } from "./handlers/joinMatchmaking.js";
import { handleGetMatchStatus } from "./handlers/getMatchStatus.js";
import { handleCancelMatchmaking } from "./handlers/cancelMatchmaking.js";
import { handleGetCurrentMatch } from "./handlers/getCurrentMatch.js";

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
      return await handleJoinMatchmaking(user);
    }

    if (method === "GET" && path === "/matchmaking/status") {
      return await handleGetMatchStatus(user);
    }

    if (method === "POST" && path === "/matchmaking/cancel") {
      return await handleCancelMatchmaking(user);
    }

    if (method === "GET" && path === "/matches/current") {
      return await handleGetCurrentMatch(user);
    }

    return jsonResponse(404, { message: "Not found" });
  } catch (error) {
    console.error("Handler error:", error);
    return jsonResponse(500, { message: "Internal server error" });
  }
};
