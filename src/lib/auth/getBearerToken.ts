export function getBearerToken(authHeader?: string | null) {
  if (!authHeader) return null;

  const [type, token] = authHeader.split(" ");

  if (type !== "Bearer" || !token) return null;

  return token;
}