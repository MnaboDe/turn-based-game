import {
  exchangeCodeForToken,
  validateCallbackState,
  validateIdTokenNonce,
} from "../api/auth";
import { parseJwt, buildUserFromTokenPayload } from "../api/jwt";
import { saveTokens, getTokens, clearTokens } from "../api/authStorage";

export function hasAuthCodeInUrl() {
  return new URLSearchParams(window.location.search).has("code");
}

export function restoreUserFromStoredTokens() {
  const existingTokens = getTokens();

  if (!existingTokens) {
    return null;
  }

  try {
    const userData = parseJwt(existingTokens.id_token);

    return {
      user: buildUserFromTokenPayload(userData),
      tokens: existingTokens,
    };
  } catch (error) {
    console.error("Failed to restore user from stored token:", error);
    clearTokens();
    return null;
  }
}

export async function processCognitoCallback() {
  const params = new URLSearchParams(window.location.search);
  const code = params.get("code");
  const state = params.get("state");

  if (!code) {
    return null;
  }

  validateCallbackState(state);

  const tokens = await exchangeCodeForToken(code);
  saveTokens(tokens);

  const userData = validateIdTokenNonce(tokens.id_token);

  window.history.replaceState({}, document.title, "/");

  return {
    user: buildUserFromTokenPayload(userData),
    tokens,
  };
}