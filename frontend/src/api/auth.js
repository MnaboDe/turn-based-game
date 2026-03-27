import { authConfig } from "../config/authConfig";
import { parseJwt } from "./jwt";
import {
  CognitoIdentityProviderClient,
  GetUserCommand,
  UpdateUserAttributesCommand,
} from "@aws-sdk/client-cognito-identity-provider";
import {
  savePkceVerifier,
  getPkceVerifier,
  saveOAuthState,
  getOAuthState,
  saveOAuthNonce,
  getOAuthNonce,
  clearOAuthState,
  clearOAuthNonce,
  clearOAuthTransaction,
  clearTokens,
  getTokens,
} from "./authStorage";

const { region, cognitoDomain, clientId, redirectUri } = authConfig;
const OAUTH_SCOPE = "openid email aws.cognito.signin.user.admin";

const cognitoIdpClient = new CognitoIdentityProviderClient({ region });

function generateRandomString(length = 64) {
  const charset =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~";

  const randomValues = new Uint8Array(length);
  crypto.getRandomValues(randomValues);

  let result = "";

  for (let i = 0; i < randomValues.length; i += 1) {
    result += charset[randomValues[i] % charset.length];
  }

  return result;
}

function base64UrlEncode(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = "";

  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i]);
  }

  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

async function generateCodeChallenge(codeVerifier) {
  const encoder = new TextEncoder();
  const data = encoder.encode(codeVerifier);
  const digest = await crypto.subtle.digest("SHA-256", data);

  return base64UrlEncode(digest);
}

async function buildAuthorizeUrl(mode = "login") {
  const codeVerifier = generateRandomString(64);
  const codeChallenge = await generateCodeChallenge(codeVerifier);
  const state = generateRandomString(64);
  const nonce = generateRandomString(64);

  savePkceVerifier(codeVerifier);
  saveOAuthState(state);
  saveOAuthNonce(nonce);

  const url = new URL(`${cognitoDomain}/oauth2/authorize`);

  url.searchParams.set("client_id", clientId);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", OAUTH_SCOPE);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("code_challenge_method", "S256");
  url.searchParams.set("code_challenge", codeChallenge);
  url.searchParams.set("state", state);
  url.searchParams.set("nonce", nonce);

  if (mode === "signup") {
    url.searchParams.set("signup", "true");
  }

  return url.toString();
}

export async function signIn() {
  const loginUrl = await buildAuthorizeUrl("login");
  window.location.assign(loginUrl);
}

export async function signUp() {
  const signUpUrl = await buildAuthorizeUrl("signup");
  window.location.assign(signUpUrl);
}

export function signOutLocal() {
  clearOAuthTransaction();
  clearTokens();
}

export function buildHostedLogoutUrl() {
  const logoutUrl = new URL(`${cognitoDomain}/logout`);
  logoutUrl.searchParams.set("client_id", clientId);
  logoutUrl.searchParams.set("logout_uri", redirectUri);
  return logoutUrl.toString();
}

export async function revokeRefreshToken(refreshToken) {
  if (!refreshToken) {
    return;
  }

  const revokeUrl = `${cognitoDomain}/oauth2/revoke`;

  const body = new URLSearchParams({
    token: refreshToken,
    client_id: clientId,
  });

  const response = await fetch(revokeUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: body.toString(),
  });

  if (!response.ok) {
    throw new Error("Failed to revoke refresh token");
  }
}

export async function signOutHosted() {
  window.location.assign(buildHostedLogoutUrl());
}

export async function signOutEverywhere() {
  const existingTokens = getTokens();
  const refreshToken = existingTokens?.refresh_token;

  try {
    if (refreshToken) {
      await revokeRefreshToken(refreshToken);
    }
  } catch (error) {
    console.error("Refresh token revocation failed:", error);
  } finally {
    signOutLocal();
    await signOutHosted();
  }
}

export function validateCallbackState(callbackState) {
  const expectedState = getOAuthState();

  if (!callbackState || !expectedState || callbackState !== expectedState) {
    clearOAuthTransaction();
    throw new Error("Invalid OAuth state");
  }

  clearOAuthState();
}

export async function exchangeCodeForToken(code) {
  const codeVerifier = getPkceVerifier();

  if (!codeVerifier) {
    throw new Error("Missing PKCE code verifier");
  }

  const tokenUrl = `${cognitoDomain}/oauth2/token`;

  const body = new URLSearchParams({
    grant_type: "authorization_code",
    client_id: clientId,
    code,
    redirect_uri: redirectUri,
    code_verifier: codeVerifier,
  });

  const response = await fetch(tokenUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: body.toString(),
  });

  if (!response.ok) {
    clearOAuthTransaction();
    throw new Error("Failed to exchange code for tokens");
  }

  return response.json();
}

export async function refreshTokens(refreshToken) {
  if (!refreshToken) {
    throw new Error("Missing refresh token");
  }

  const tokenUrl = `${cognitoDomain}/oauth2/token`;

  const body = new URLSearchParams({
    grant_type: "refresh_token",
    client_id: clientId,
    refresh_token: refreshToken,
  });

  const response = await fetch(tokenUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: body.toString(),
  });

  if (!response.ok) {
    let errorDetails = null;

    try {
      errorDetails = await response.json();
    } catch {
      errorDetails = null;
    }

    const message =
      errorDetails?.error_description ||
      errorDetails?.error ||
      "Failed to refresh tokens";

    throw new Error(message);
  }

  const refreshedTokens = await response.json();

  return {
    ...refreshedTokens,
    refresh_token: refreshedTokens.refresh_token || refreshToken,
  };
}

export function validateIdTokenNonce(idToken) {
  const expectedNonce = getOAuthNonce();

  if (!expectedNonce) {
    clearOAuthTransaction();
    throw new Error("Missing expected nonce");
  }

  const payload = parseJwt(idToken);

  if (payload.nonce !== expectedNonce) {
    clearOAuthTransaction();
    throw new Error("Invalid token nonce");
  }

  clearOAuthNonce();

  return payload;
}
export async function getCurrentUserProfile(accessToken) {
  const response = await cognitoIdpClient.send(
    new GetUserCommand({
      AccessToken: accessToken,
    }),
  );

  const attributes = Object.fromEntries(
    (response.UserAttributes || []).map((attribute) => [
      attribute.Name,
      attribute.Value,
    ]),
  );

  return {
    username: response.Username,
    attributes,
  };
}

export async function updateDisplayName(accessToken, displayName) {
  await cognitoIdpClient.send(
    new UpdateUserAttributesCommand({
      AccessToken: accessToken,
      UserAttributes: [
        {
          Name: "custom:displayName",
          Value: displayName,
        },
      ],
    }),
  );
}

export function getStoredAccessToken() {
  const tokens = getTokens();
  return tokens?.access_token || null;
}
