export const SESSION_TTL_SECONDS = 8 * 60 * 60

export interface SignedSessionPayload {
  id_user: string
  session_version: number
  iat: number
  exp: number
}

const PAYLOAD_KEYS = ["exp", "iat", "id_user", "session_version"]

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = ""
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "")
}

function base64UrlToBytes(value: string): Uint8Array {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=")
  return Uint8Array.from(atob(base64), (character) => character.charCodeAt(0))
}

async function key(secret: string, usage: KeyUsage[]) {
  if (!secret) throw new Error("Le secret de session est absent.")
  return crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, usage)
}

function isStrictPayload(value: unknown): value is SignedSessionPayload {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false
  const record = value as Record<string, unknown>
  if (Object.keys(record).sort().join("|") !== PAYLOAD_KEYS.join("|")) return false
  return typeof record.id_user === "string" && record.id_user.trim().length > 0 &&
    Number.isSafeInteger(record.session_version) && Number(record.session_version) >= 1 &&
    Number.isSafeInteger(record.iat) && Number.isSafeInteger(record.exp)
}

export async function createSessionToken(input: { idUser: string; sessionVersion: number; secret: string; nowSeconds?: number }): Promise<string> {
  const iat = input.nowSeconds ?? Math.floor(Date.now() / 1000)
  const payload: SignedSessionPayload = { id_user: input.idUser.trim(), session_version: input.sessionVersion, iat, exp: iat + SESSION_TTL_SECONDS }
  if (!isStrictPayload(payload)) throw new Error("Données de session invalides.")
  const data = new TextEncoder().encode(JSON.stringify(payload))
  const signature = await crypto.subtle.sign("HMAC", await key(input.secret, ["sign"]), data)
  return `${bytesToBase64Url(data)}.${bytesToBase64Url(new Uint8Array(signature))}`
}

export async function verifySessionToken(input: { token: string; secret: string; nowSeconds?: number }): Promise<SignedSessionPayload | null> {
  try {
    if(input.token.length>4096)return null
    const parts = input.token.split(".")
    if (parts.length !== 2 || !parts[0] || !parts[1]) return null
    const data = base64UrlToBytes(parts[0])
    const valid = await crypto.subtle.verify("HMAC", await key(input.secret, ["verify"]), base64UrlToBytes(parts[1]), data)
    if (!valid) return null
    const payload: unknown = JSON.parse(new TextDecoder().decode(data))
    if (!isStrictPayload(payload)) return null
    const now = input.nowSeconds ?? Math.floor(Date.now() / 1000)
    if (payload.iat > now || payload.exp <= now || payload.exp - payload.iat !== SESSION_TTL_SECONDS) return null
    return payload
  } catch {
    return null
  }
}
