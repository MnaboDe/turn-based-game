import { authConfig } from "../config/authConfig";

function createAuthHeaders(accessToken) {
  return {
    Authorization: `Bearer ${accessToken}`,
  };
}

async function handleResponse(response) {
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || "Request failed");
  }

  return data;
}

export async function joinMatchmaking(accessToken) {
  const response = await fetch(`${authConfig.apiBaseUrl}/matchmaking/join`, {
    method: "POST",
    headers: createAuthHeaders(accessToken),
  });

  return handleResponse(response);
}

export async function getMatchmakingStatus(accessToken) {
  const response = await fetch(`${authConfig.apiBaseUrl}/matchmaking/status`, {
    method: "GET",
    headers: createAuthHeaders(accessToken),
  });

  return handleResponse(response);
}

export async function cancelMatchmaking(accessToken) {
  const response = await fetch(`${authConfig.apiBaseUrl}/matchmaking/cancel`, {
    method: "POST",
    headers: createAuthHeaders(accessToken),
  });

  return handleResponse(response);
}
export async function getCurrentMatch(accessToken) {
  const response = await fetch(`${authConfig.apiBaseUrl}/matches/current`, {
    method: "GET",
    headers: createAuthHeaders(accessToken),
  });

  return handleResponse(response);
}