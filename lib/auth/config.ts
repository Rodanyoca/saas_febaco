export function sessionSecret() {
  const value = process.env.AUTH_SECRET || process.env.AUTH_SESSION_SECRET
  if (!value || value.length < 32) throw new Error("Secret de session absent ou trop court.")
  return value
}
