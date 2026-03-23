import crypto from "crypto"
import { cookies } from "next/headers"

import { AUTH_COOKIE_NAME as COOKIE_NAME } from "@/lib/auth-constants"

export type UserRole = "federal" | "ligue" | "entente"

export type UserScope =
  | { role: "federal" }
  | { role: "ligue"; ligueId: string }
  | { role: "entente"; ententeId: string }

export type SessionUser = {
  email: string
  nom?: string
  role: UserRole
  ligueId?: string
  ententeId?: string
}

type SessionPayload = {
  v: 1
  email: string
  nom?: string
  role: UserRole
  ligueId?: string
  ententeId?: string
  exp: number
}

const SESSION_TTL_SECONDS = 60 * 60 * 12

function requiredEnv(name: string): string {
  const v = process.env[name]
  if (!v) throw new Error(`Missing environment variable: ${name}`)
  return v
}

function base64UrlEncode(input: Buffer | string): string {
  const buf = Buffer.isBuffer(input) ? input : Buffer.from(input)
  return buf
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "")
}

function base64UrlDecode(input: string): Buffer {
  const padLength = (4 - (input.length % 4)) % 4
  const padded = input.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat(padLength)
  return Buffer.from(padded, "base64")
}

function sign(data: string): string {
  const secret = requiredEnv("AUTH_SESSION_SECRET")
  return base64UrlEncode(crypto.createHmac("sha256", secret).update(data).digest())
}

function timingSafeEqual(a: string, b: string): boolean {
  const aBuf = Buffer.from(a)
  const bBuf = Buffer.from(b)
  if (aBuf.length !== bBuf.length) return false
  return crypto.timingSafeEqual(aBuf, bBuf)
}

export function createSessionCookieValue(user: SessionUser, now = Date.now()): string {
  const exp = Math.floor(now / 1000) + SESSION_TTL_SECONDS
  const payload: SessionPayload = {
    v: 1,
    email: user.email,
    nom: user.nom,
    role: user.role,
    ligueId: user.ligueId,
    ententeId: user.ententeId,
    exp,
  }

  const data = base64UrlEncode(JSON.stringify(payload))
  const sig = sign(data)
  return `${data}.${sig}`
}

export function verifySessionCookieValue(value: string, now = Date.now()): SessionUser | null {
  const [data, sig] = value.split(".")
  if (!data || !sig) return null

  const expected = sign(data)
  if (!timingSafeEqual(expected, sig)) return null

  let payload: SessionPayload
  try {
    payload = JSON.parse(base64UrlDecode(data).toString("utf8")) as SessionPayload
  } catch {
    return null
  }

  if (!payload || payload.v !== 1) return null
  if (!payload.email || !payload.role || !payload.exp) return null

  const nowSeconds = Math.floor(now / 1000)
  if (payload.exp <= nowSeconds) return null

  return {
    email: payload.email,
    nom: payload.nom,
    role: payload.role,
    ligueId: payload.ligueId,
    ententeId: payload.ententeId,
  }
}

export async function getSessionUser(): Promise<SessionUser | null> {
  const store = await cookies()
  const c = store.get(COOKIE_NAME)?.value
  if (!c) return null
  return verifySessionCookieValue(c)
}

export async function setSessionCookie(user: SessionUser) {
  const value = createSessionCookieValue(user)
  const store = await cookies()
  store.set({
    name: COOKIE_NAME,
    value,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  })
}

export async function clearSessionCookie() {
  const store = await cookies()
  store.set({
    name: COOKIE_NAME,
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  })
}
