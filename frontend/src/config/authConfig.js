export const authConfig = {
  region: import.meta.env.VITE_AWS_REGION,
  cognitoDomain: import.meta.env.VITE_COGNITO_DOMAIN,
  clientId: import.meta.env.VITE_COGNITO_CLIENT_ID,
  redirectUri: import.meta.env.VITE_REDIRECT_URI,
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL,
};