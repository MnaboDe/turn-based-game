const TOKENS_STORAGE_KEY = "tokens";
const PKCE_VERIFIER_STORAGE_KEY = "pkce_code_verifier";
const OAUTH_STATE_STORAGE_KEY = "oauth_state";
const OAUTH_NONCE_STORAGE_KEY = "oauth_nonce";

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

export function savePkceVerifier(codeVerifier) {
  sessionStorage.setItem(PKCE_VERIFIER_STORAGE_KEY, codeVerifier);
}

export function getPkceVerifier() {
  return sessionStorage.getItem(PKCE_VERIFIER_STORAGE_KEY);
}

export function clearPkceVerifier() {
  sessionStorage.removeItem(PKCE_VERIFIER_STORAGE_KEY);
}

export function saveOAuthState(state) {
  sessionStorage.setItem(OAUTH_STATE_STORAGE_KEY, state);
}

export function getOAuthState() {
  return sessionStorage.getItem(OAUTH_STATE_STORAGE_KEY);
}

export function clearOAuthState() {
  sessionStorage.removeItem(OAUTH_STATE_STORAGE_KEY);
}

export function saveOAuthNonce(nonce) {
  sessionStorage.setItem(OAUTH_NONCE_STORAGE_KEY, nonce);
}

export function getOAuthNonce() {
  return sessionStorage.getItem(OAUTH_NONCE_STORAGE_KEY);
}

export function clearOAuthNonce() {
  sessionStorage.removeItem(OAUTH_NONCE_STORAGE_KEY);
}

export function clearOAuthTransaction() {
  clearPkceVerifier();
  clearOAuthState();
  clearOAuthNonce();
}