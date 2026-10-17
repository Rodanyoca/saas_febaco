import { createHmac } from "node:crypto"

export function pseudonymizeTelemetry(value: string, key: string): string {
  const normalizedKey = key.trim()
  if (normalizedKey.length < 32) throw new Error("La clé de télémétrie doit contenir au moins 32 caractères.")
  return createHmac("sha256", normalizedKey).update(value.trim().toLowerCase(), "utf8").digest("hex")
}

export function getTelemetryKey(): string {
  const key = process.env.AUTH_TELEMETRY_HMAC_KEY?.trim()
  if (!key) throw new Error("La clé de télémétrie n'est pas configurée.")
  if(key===process.env.AUTH_SECRET||key===process.env.AUTH_SESSION_SECRET)throw new Error("Clé de télémétrie indépendante requise.")
  return key
}
