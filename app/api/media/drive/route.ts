import { protectedRoute } from "@/lib/auth/guard"
import { getSessionUser } from "@/lib/auth-session"
import { readDriveMedia } from "@/lib/google-drive"
import { readSheetRowsBatch } from "@/lib/google-sheets"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

async function GETHandler(req: Request) {
  try {
    const user=await getSessionUser()
    if (!user) {
      return new Response("Non authentifié.", { status: 401 })
    }
    const { searchParams } = new URL(req.url)
    const fileId = String(searchParams.get("id") ?? "").trim()
    if (!/^[A-Za-z0-9_-]{10,200}$/.test(fileId)) {
      return new Response("Identifiant invalide.", { status: 400 })
    }
    if(user.role!=="federal"){
      const [actors,clubs]=await Promise.all([readSheetRowsBatch({block:"acteurs",sheets:["ATHLETES","COACHS","MEDECINS","OFFICIELS","ARBITRES","AUTRES"]}),readSheetRowsBatch({block:"structure",sheets:["CLUBS"]})])
      const allowed=Object.values({...actors,...clubs}).flat().some(row=>[row.avatar_drive_id,row.logo_drive_id,row.passeport_drive_id].includes(fileId))
      if(!allowed)return new Response("Accès refusé.",{status:403})
    }

    // Les médias appartiennent au Drive personnel du compte OAuth.
    const { mimeType, stream } = await readDriveMedia(fileId)

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

export const GET = protectedRoute(GETHandler)
