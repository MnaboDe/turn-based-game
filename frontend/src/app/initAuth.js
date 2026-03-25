import {
  exchangeCodeForToken,
  validateCallbackState,
  validateIdTokenNonce,
  refreshTokens,
} from "../api/auth";
import {
  parseJwt,
  buildUserFromTokenPayload,
  isTokenExpired,
} from "../api/jwt";
import { saveTokens, getTokens, clearTokens } from "../api/authStorage";

export function hasAuthCodeInUrl() {
  return new URLSearchParams(window.location.search).has("code");
}

export async function restoreUserFromStoredTokens() {
  const existingTokens = getTokens();

  if (!existingTokens) {
    return null;
  }

  try {
    if (!existingTokens.id_token) {
      clearTokens();
      return null;
    }

    if (!isTokenExpired(existingTokens.id_token)) {
      const userData = parseJwt(existingTokens.id_token);

      return {
        user: buildUserFromTokenPayload(userData),
        tokens: existingTokens,
      };
    }

    if (!existingTokens.refresh_token) {
      clearTokens();
      return null;
    }

    const refreshedTokens = await refreshTokens(existingTokens.refresh_token);
    saveTokens(refreshedTokens);

    const userData = parseJwt(refreshedTokens.id_token);

    return {
      user: buildUserFromTokenPayload(userData),
      tokens: refreshedTokens,
    };
  } catch (error) {
    console.error("Failed to restore or refresh auth session:", error);
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