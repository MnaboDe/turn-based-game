import { authConfig } from "../config/authConfig";

const { cognitoDomain, clientId, redirectUri } = authConfig;

const TOKENS_STORAGE_KEY = "tokens";
const PKCE_VERIFIER_STORAGE_KEY = "pkce_code_verifier";
const OAUTH_STATE_STORAGE_KEY = "oauth_state";
const OAUTH_NONCE_STORAGE_KEY = "oauth_nonce";
const OAUTH_SCOPE = "openid email";

// Generate a cryptographically random string
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

// Convert ArrayBuffer to base64url
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

// Create SHA-256 code challenge from verifier
async function generateCodeChallenge(codeVerifier) {
  const encoder = new TextEncoder();
  const data = encoder.encode(codeVerifier);
  const digest = await crypto.subtle.digest("SHA-256", data);

  return base64UrlEncode(digest);
}

function savePkceVerifier(codeVerifier) {
  sessionStorage.setItem(PKCE_VERIFIER_STORAGE_KEY, codeVerifier);
}

function getPkceVerifier() {
  return sessionStorage.getItem(PKCE_VERIFIER_STORAGE_KEY);
}

function clearPkceVerifier() {
  sessionStorage.removeItem(PKCE_VERIFIER_STORAGE_KEY);
}

function saveOAuthState(state) {
  sessionStorage.setItem(OAUTH_STATE_STORAGE_KEY, state);
}

function getOAuthState() {
  return sessionStorage.getItem(OAUTH_STATE_STORAGE_KEY);
}

function clearOAuthState() {
  sessionStorage.removeItem(OAUTH_STATE_STORAGE_KEY);
}

function saveOAuthNonce(nonce) {
  sessionStorage.setItem(OAUTH_NONCE_STORAGE_KEY, nonce);
}

function getOAuthNonce() {
  return sessionStorage.getItem(OAUTH_NONCE_STORAGE_KEY);
}

function clearOAuthNonce() {
  sessionStorage.removeItem(OAUTH_NONCE_STORAGE_KEY);
}

function clearOAuthTransaction() {
  clearPkceVerifier();
  clearOAuthState();
  clearOAuthNonce();
}

// Build Cognito authorize URL with PKCE, state, and nonce
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

export function signOut() {
  clearOAuthTransaction();
  clearTokens();

  const logoutUrl =
    `${cognitoDomain}/logout` +
    `?client_id=${encodeURIComponent(clientId)}` +
    `&logout_uri=${encodeURIComponent(redirectUri)}`;

  window.location.assign(logoutUrl);
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

  const tokens = await response.json();

  clearPkceVerifier();

  return tokens;
}

export function parseJwt(token) {
  const base64Payload = token.split(".")[1];
  const normalizedPayload = base64Payload
    .replace(/-/g, "+")
    .replace(/_/g, "/");

  const paddedPayload = normalizedPayload.padEnd(
    normalizedPayload.length + ((4 - (normalizedPayload.length % 4)) % 4),
    "="
  );

  const decodedPayload = atob(paddedPayload);

  return JSON.parse(decodedPayload);
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

export function saveTokens(tokens) {
  localStorage.setItem(TOKENS_STORAGE_KEY, JSON.stringify(tokens));
}

export function getTokens() {
  const raw = localStorage.getItem(TOKENS_STORAGE_KEY);
  return raw ? JSON.parse(raw) : null;
}

export function clearTokens() {
  localStorage.removeItem(TOKENS_STORAGE_KEY);
}