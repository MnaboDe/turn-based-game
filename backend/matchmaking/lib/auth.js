export function getUserFromEvent(event) {
  const claims =
    event.requestContext?.authorizer?.jwt?.claims ||
    event.requestContext?.authorizer?.claims ||
    {};

  let body = {};

  try {
    body = event.body ? JSON.parse(event.body) : {};
  } catch {
    body = {};
  }

  return {
    playerId: claims.sub,
    username:
      body.displayName ||
      claims.email ||
      claims["cognito:username"] ||
      "unknown",
  };
}