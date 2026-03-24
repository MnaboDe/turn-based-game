export function signIn() {
  return Promise.resolve({ username: "demo-user", userId: "user-123" });
}

export function signUp() {
  return Promise.resolve({ username: "demo-user", userId: "user-123" });
}

export function signOut() {
  return Promise.resolve();
}