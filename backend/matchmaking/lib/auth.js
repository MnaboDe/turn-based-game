export function getUserFromEvent(event) {
  const claims =
    event.requestContext?.authorizer?.jwt?.claims ||
    event.requestContext?.authorizer?.claims ||
    {};

  return {
    playerId: claims.sub,
    username: claims.email || claims["cognito:username"] || "unknown",
  };
}