import { jsonResponse } from "../lib/response.js";

export async function handleGetMatchStatus(user) {
  return jsonResponse(200, {
    status: "waiting",
  });
}