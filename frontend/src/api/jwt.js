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

export function buildUserFromTokenPayload(payload) {
  return {
    username:
      payload["custom:displayName"] ||
      payload.email ||
      payload["cognito:username"],
    userId: payload.sub,
  };
}

export function getTokenExpiration(token) {
  const payload = parseJwt(token);
  return payload.exp;
}

export function isTokenExpired(token, clockSkewSeconds = 30) {
  const exp = getTokenExpiration(token);
  const now = Math.floor(Date.now() / 1000);

  return exp <= now + clockSkewSeconds;
}