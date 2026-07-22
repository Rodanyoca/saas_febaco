import { getSessionUser } from "@/lib/auth-session"
import { createDriveClient } from "@/lib/google-drive"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function GET(req: Request) {
  try {
    if (!(await getSessionUser())) {
      return new Response("Non authentifié.", { status: 401 })
    }
    const { searchParams } = new URL(req.url)
    const fileId = String(searchParams.get("id") ?? "").trim()
    if (!/^[A-Za-z0-9_-]{10,200}$/.test(fileId)) {
      return new Response("Identifiant invalide.", { status: 400 })
    }

    const drive = createDriveClient()

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
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
        "Content-Disposition": "inline",
      },
    })
  } catch (error) {
    console.error("[api/media/drive] Lecture impossible", error)
    return new Response("Lecture du média impossible.", { status: 500 })
  }
}
