import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { AUTH_COOKIE_NAME } from "@/lib/auth-constants"

function requiredEnv(name: string): string {
  const v = process.env[name]
  if (!v) throw new Error(`Missing environment variable: ${name}`)
  return v
}

function base64UrlDecode(input: string): Uint8Array {
  const padLength = (4 - (input.length % 4)) % 4
  const padded = input.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat(padLength)
  const binary = atob(padded)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes
}

function base64UrlEncode(bytes: ArrayBuffer): string {
  const u8 = new Uint8Array(bytes)
  let binary = ""
  for (let i = 0; i < u8.length; i++) binary += String.fromCharCode(u8[i])
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "")
}

async function hmacSha256Base64Url(secret: string, data: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  )

  const sig = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(data)
  )

  return base64UrlEncode(sig)
}

async function verifySessionCookieValueEdge(value: string): Promise<boolean> {
  const [data, sig] = value.split(".")
  if (!data || !sig) return false

  const expected = await hmacSha256Base64Url(requiredEnv("AUTH_SESSION_SECRET"), data)
  if (expected !== sig) return false

  try {
    const payload = JSON.parse(new TextDecoder().decode(base64UrlDecode(data))) as {
      v?: number
      exp?: number
    }
    if (payload?.v !== 1) return false
    const nowSeconds = Math.floor(Date.now() / 1000)
    if (!payload?.exp || payload.exp <= nowSeconds) return false
    return true
  } catch {
    return false
  }
}

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl

  const cookie = req.cookies.get(AUTH_COOKIE_NAME)?.value
  const hasSession = cookie ? await verifySessionCookieValueEdge(cookie) : false

  const isDashboard = pathname === "/dashboard" || pathname.startsWith("/dashboard/")
  const isLogin = pathname === "/login"

  if (isDashboard && !hasSession) {
    const url = req.nextUrl.clone()
    url.pathname = "/login"
    url.searchParams.set("next", pathname)
    return NextResponse.redirect(url)
  }

  if (isLogin && hasSession) {
    const url = req.nextUrl.clone()
    url.pathname = "/dashboard"
    url.search = ""
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/dashboard/:path*", "/login"],
}
