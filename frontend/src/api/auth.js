const cognitoDomain =
  "https://us-east-1kitzazvvy.auth.us-east-1.amazoncognito.com";
const clientId = "46rh9ho6cs79i1ojmmjhbogm8l";
const redirectUri = "http://localhost:5173/";

export function signIn() {
  const loginUrl =
    `${cognitoDomain}/login` +
    `?client_id=${clientId}` +
    `&response_type=code` +
    `&scope=openid+email` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}`;

  window.location.assign(loginUrl);
}

export function signUp() {
  const signUpUrl =
    `${cognitoDomain}/signup` +
    `?client_id=${clientId}` +
    `&response_type=code` +
    `&scope=openid+email` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}`;

  window.location.assign(signUpUrl);
}

export function signOut() {
  const logoutUrl =
    `${cognitoDomain}/logout` +
    `?client_id=${clientId}` +
    `&logout_uri=${encodeURIComponent(redirectUri)}`;

  window.location.assign(logoutUrl);
}

export async function exchangeCodeForToken(code) {
  const tokenUrl = `${cognitoDomain}/oauth2/token`;

  const body = new URLSearchParams({
    grant_type: "authorization_code",
    client_id: clientId,
    code,
    redirect_uri: redirectUri,
  });

  const response = await fetch(tokenUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: body.toString(),
  });

  if (!response.ok) {
    throw new Error("Failed to exchange code for tokens");
  }

  return response.json();
}

export function parseJwt(token) {
  const base64Payload = token.split(".")[1];
  const decodedPayload = atob(base64Payload);
  return JSON.parse(decodedPayload);
}

export function saveTokens(tokens) {
  localStorage.setItem("tokens", JSON.stringify(tokens));
}

export function getTokens() {
  const raw = localStorage.getItem("tokens");
  return raw ? JSON.parse(raw) : null;
}

export function clearTokens() {
  localStorage.removeItem("tokens");
}