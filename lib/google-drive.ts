import { google } from "googleapis"
import { Readable } from "node:stream"
import { buildDrivePublicUrl } from "@/lib/google-drive-url"

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

export type DriveUploadResult = {
  fileId: string
  webViewLink?: string
  webContentLink?: string
  publicUrl: string
  name: string
}

export async function uploadAvatarToDrive({
  folderId,
  fileName,
  mimeType,
  buffer,
}: {
  folderId: string
  fileName: string
  mimeType: string
  buffer: Buffer
}): Promise<DriveUploadResult> {
  const auth = getDriveAuth()
  const drive = google.drive({ version: "v3", auth })

  let res: any
  try {
    res = await drive.files.create({
      requestBody: {
        name: fileName,
        parents: [folderId],
      },
      media: {
        mimeType,
        body: Readable.from(buffer),
      },
      fields: "id,name,webViewLink,webContentLink",
    })
  } catch (error) {
    const err = error as {
      message?: string
      code?: number
      response?: { status?: number; data?: unknown }
      errors?: unknown
    }
    const status = err?.response?.status ?? err?.code
    const data = err?.response?.data
    const baseMessage = err?.message ? String(err.message) : "Erreur Google Drive"
    const details = data ? ` | details=${JSON.stringify(data)}` : ""
    throw new Error(`${baseMessage}${status ? ` (status ${status})` : ""}${details}`)
  }

  const fileId = res.data.id
  if (!fileId) {
    throw new Error("Upload Drive échoué: fileId manquant")
  }

  const name = res.data.name || fileName

  const publicUrl = buildDrivePublicUrl(fileId)

  return {
    fileId,
    name,
    webViewLink: res.data.webViewLink || undefined,
    webContentLink: res.data.webContentLink || undefined,
    publicUrl,
  }
}

export function getAvatarFolderId(entityType: string): string {
  requiredEnv("GOOGLE_DRIVE_ROOT_FOLDER_ID")
  const key = String(entityType ?? "").trim().toLowerCase()

  if (key === "club") return requiredEnv("GOOGLE_DRIVE_CLUB_FOLDER_ID")
  if (key === "athlete" || key === "athletes") return requiredEnv("GOOGLE_DRIVE_ATHLETE_FOLDER_ID")
  if (key === "entraineur" || key === "entraineurs" || key === "coach" || key === "coachs") {
    return requiredEnv("GOOGLE_DRIVE_ENTRAINEUR_FOLDER_ID")
  }
  if (key === "medecin" || key === "medecins") return requiredEnv("GOOGLE_DRIVE_MEDECIN_FOLDER_ID")
  if (key === "arbitre" || key === "arbitres") return requiredEnv("GOOGLE_DRIVE_ARBITRE_FOLDER_ID")
  if (key === "officiel" || key === "officiels") return requiredEnv("GOOGLE_DRIVE_OFFICIEL_FOLDER_ID")

  throw new Error("Type d'entité invalide")
}

export function buildAvatarFileName({
  entityType,
  entityId,
  extension,
}: {
  entityType: string
  entityId: string
  extension: string
}): string {
  const normalizedType = String(entityType ?? "").trim().toUpperCase()
  const id = String(entityId ?? "").trim().replace(/[^A-Za-z0-9_-]/g, "_").slice(0, 120)
  const ext = String(extension ?? "").trim().replace(/^\./, "").toLowerCase()

  return `AVATAR_${normalizedType}_${id}.${ext}`
}
