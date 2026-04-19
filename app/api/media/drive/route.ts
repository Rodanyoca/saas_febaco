import { google } from "googleapis"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

function requiredEnv(name: string): string {
  const value = process.env[name]
  if (!value) {
    throw new Error(`Missing environment variable: ${name}`)
  }
  return value
}

function getDriveAuth() {
  const clientId = requiredEnv("GOOGLE_OAUTH_CLIENT_ID")
  const clientSecret = requiredEnv("GOOGLE_OAUTH_CLIENT_SECRET")
  const refreshToken = requiredEnv("GOOGLE_DRIVE_REFRESH_TOKEN")

  const auth = new google.auth.OAuth2({
    clientId,
    clientSecret,
  })

  auth.setCredentials({
    refresh_token: refreshToken,
  })

  return auth
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const fileId = String(searchParams.get("id") ?? "").trim()
    if (!fileId) {
      return new Response("Missing id", { status: 400 })
    }

    const auth = getDriveAuth()
    const drive = google.drive({ version: "v3", auth })

    const meta = await drive.files.get({
      fileId,
      fields: "mimeType,name",
      supportsAllDrives: true,
    })

    const mimeType = String(meta.data.mimeType || "application/octet-stream")

    const media = await drive.files.get(
      {
        fileId,
        alt: "media",
        supportsAllDrives: true,
      },
      {
        responseType: "stream",
      }
    )

    const stream = media.data as unknown as ReadableStream | NodeJS.ReadableStream

    return new Response(stream as any, {
      status: 200,
      headers: {
        "Content-Type": mimeType,
        "Cache-Control": "public, max-age=3600",
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error"
    return new Response(message, { status: 500 })
  }
}
