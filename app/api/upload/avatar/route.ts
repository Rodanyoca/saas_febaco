import { NextResponse } from "next/server"
import { getSessionUser } from "@/lib/auth-session"
import { buildAvatarFileName, getAvatarFolderId, uploadAvatarToDrive } from "@/lib/google-drive"
import { updateAvatarFieldsByEntityId } from "@/lib/google-sheets"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const MAX_BYTES = 5 * 1024 * 1024
const ALLOWED_MIME = new Set(["image/jpeg", "image/jpg", "image/png", "image/webp"])

function badRequest(message: string, details?: unknown) {
  return NextResponse.json({ error: message, details }, { status: 400 })
}

export async function POST(req: Request) {
  try {
    const user = await getSessionUser()
    if (!user) {
      return NextResponse.json({ error: "Non authentifié." }, { status: 401 })
    }

    const form = await req.formData()
    const file = form.get("file")
    const entityTypeRaw = String(form.get("entityType") ?? "").trim()
    const entityIdRaw = String(form.get("entityId") ?? "").trim()

    if (!file || !(file instanceof File)) {
      return badRequest("Fichier absent")
    }

    if (!entityTypeRaw) {
      return badRequest("Type invalide")
    }

    if (!entityIdRaw) {
      return badRequest("Identifiant métier invalide")
    }

    if (!ALLOWED_MIME.has(file.type)) {
      return badRequest("Format de fichier non autorisé")
    }

    if (file.size > MAX_BYTES) {
      return badRequest("Fichier trop grand (max 5MB)")
    }

    const entityType = entityTypeRaw.toLowerCase()

    const normalizedEntityType = (() => {
      if (entityType === "club" || entityType === "clubs") return "club"
      if (entityType === "athlete" || entityType === "athletes") return "athlete"
      if (entityType === "officiel" || entityType === "officiels") return "officiel"
      if (entityType === "arbitre" || entityType === "arbitres") return "arbitre"
      if (entityType === "medecin" || entityType === "medecins" || entityType === "médecin" || entityType === "médecins") {
        return "medecin"
      }
      if (
        entityType === "entraineur" ||
        entityType === "entraineurs" ||
        entityType === "coach" ||
        entityType === "coachs"
      ) {
        return "entraineur"
      }
      return ""
    })()

    if (!normalizedEntityType) {
      return badRequest("Type invalide")
    }

    const extension = (() => {
      if (file.type === "image/png") return "png"
      if (file.type === "image/webp") return "webp"
      return "jpg"
    })()

    const folderId = getAvatarFolderId(normalizedEntityType)
    const fileName = buildAvatarFileName({
      entityType: normalizedEntityType,
      entityId: entityIdRaw,
      extension,
    })

    const buffer = Buffer.from(await file.arrayBuffer())

    const uploaded = await uploadAvatarToDrive({
      folderId,
      fileName,
      mimeType: file.type,
      buffer,
    })

    const sheetConfig = (() => {
      if (normalizedEntityType === "club") {
        return {
          sheetName: "clubs",
          entityIdHeaderCandidates: ["id_club", "id", "code_club", "code"],
        }
      }

      if (normalizedEntityType === "athlete") {
        return {
          sheetName: "athletes",
          entityIdHeaderCandidates: ["id_athlete", "id", "code_athlete", "code"],
        }
      }

      if (normalizedEntityType === "officiel") {
        return {
          sheetName: "officiels",
          entityIdHeaderCandidates: ["id_officiel", "id", "code_officiel", "code"],
        }
      }

      if (normalizedEntityType === "arbitre") {
        return {
          sheetName: "arbitres",
          entityIdHeaderCandidates: ["id_arbitre", "id", "code_arbitre", "code"],
        }
      }

      if (normalizedEntityType === "medecin") {
        return {
          sheetName: "medecins",
          entityIdHeaderCandidates: ["id_medecin", "id", "code_medecin", "code"],
        }
      }

      return {
        sheetName: "coachs",
        entityIdHeaderCandidates: ["id_athlete", "id_coach", "id", "code_coach", "code"],
      }
    })()

    await updateAvatarFieldsByEntityId({
      sheetName: sheetConfig.sheetName,
      entityId: entityIdRaw,
      entityIdHeaderCandidates: sheetConfig.entityIdHeaderCandidates,
      avatarDriveId: uploaded.fileId,
      avatarDriveUrl: uploaded.publicUrl,
    })

    return NextResponse.json({
      ok: true,
      entityType: normalizedEntityType,
      entityId: entityIdRaw,
      avatar_drive_id: uploaded.fileId,
      avatar_drive_url: uploaded.publicUrl,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
}
