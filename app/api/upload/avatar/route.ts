import { NextResponse } from "next/server"
import { getSessionUser } from "@/lib/auth-session"
import { buildAvatarFileName, getAvatarFolderId, uploadAvatarToDrive } from "@/lib/google-drive"
import { getAvatarTargetByEntityId, updateAvatarFieldsByEntityId } from "@/lib/google-sheets"
import { buildAvatarId, getActorAvatarConfig } from "@/lib/avatar-config"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const MAX_BYTES = 5 * 1024 * 1024
const ALLOWED_MIME = new Set(["image/jpeg", "image/jpg", "image/png", "image/webp"])

function hasValidImageSignature(buffer: Buffer, mimeType: string): boolean {
  if (mimeType === "image/png") return buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
  if (mimeType === "image/webp") return buffer.length >= 12 && buffer.subarray(0, 4).toString("ascii") === "RIFF" && buffer.subarray(8, 12).toString("ascii") === "WEBP"
  return buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff
}

function badRequest(message: string, details?: unknown) {
  return NextResponse.json({ error: message, details }, { status: 400 })
}

export async function POST(req: Request) {
  try {
    const user = await getSessionUser()
    if (!user) {
      return NextResponse.json({ error: "Non authentifié." }, { status: 401 })
    }
    if (user.role !== "federal") {
      return NextResponse.json({ error: "Action réservée au rôle fédéral." }, { status: 403 })
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

    if (file.size === 0 || file.size > MAX_BYTES) {
      return badRequest("Fichier trop grand (max 5MB)")
    }

    const actorConfig = getActorAvatarConfig(entityTypeRaw)
    if (!actorConfig) {
      return badRequest("Type invalide")
    }

    const extension = (() => {
      if (file.type === "image/png") return "png"
      if (file.type === "image/webp") return "webp"
      return "jpg"
    })()

    const folderId = getAvatarFolderId(actorConfig)
    const avatarBusinessId = buildAvatarId(actorConfig, entityIdRaw)
    const currentAvatar = await getAvatarTargetByEntityId({
      block: "acteurs",
      sheetName: actorConfig.sheetName,
      entityId: entityIdRaw,
      entityIdHeaderCandidates: actorConfig.entityIdHeaderCandidates,
    })
    const fileName = buildAvatarFileName({
      config: actorConfig,
      entityId: entityIdRaw,
      extension,
    })

    const buffer = Buffer.from(await file.arrayBuffer())
    if (!hasValidImageSignature(buffer, file.type)) {
      return badRequest("Le contenu du fichier ne correspond pas au format annoncé")
    }

    const uploaded = await uploadAvatarToDrive({
      folderId,
      fileName,
      mimeType: file.type,
      buffer,
      existingFileId: currentAvatar.avatarDriveId || undefined,
    })

    await updateAvatarFieldsByEntityId({
      block: "acteurs",
      sheetName: actorConfig.sheetName,
      entityId: entityIdRaw,
      entityIdHeaderCandidates: actorConfig.entityIdHeaderCandidates,
      avatarDriveId: uploaded.fileId,
      avatarDriveUrl: uploaded.publicUrl,
    })

    return NextResponse.json({
      ok: true,
      entityType: actorConfig.family,
      entityId: entityIdRaw,
      avatarId: avatarBusinessId,
      avatar_drive_id: uploaded.fileId,
      avatar_drive_url: uploaded.publicUrl,
      avatarUrl: uploaded.publicUrl,
    })
  } catch (error) {
    console.error("[api/upload/avatar] Échec de l'upload", error)
    const message = error instanceof Error && error.message.includes("GOOGLE_DRIVE_REFRESH_TOKEN")
      ? "Connexion Google Drive expirée. Renouvelez l’autorisation Drive."
      : "Téléversement impossible."
    return NextResponse.json({ ok: false, error: message }, { status: 503 })
  }
}
