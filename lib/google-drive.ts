import { Readable } from "node:stream";
import { buildDrivePublicUrl } from "@/lib/google-drive-url";
import { buildAvatarId, type ActorAvatarConfig } from "@/lib/avatar-config";
import { getDriveServiceClient, getDriveUserClient } from "@/lib/google-clients";
import { executeGoogleRequest, getGoogleRequestConfig } from "@/lib/google-request";

const DRIVE_REQUEST_TIMEOUT_MS = getGoogleRequestConfig().timeoutMs;

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing environment variable: ${name}`);
  }
  return value;
}

export const createDriveClient = getDriveServiceClient;
export const createDriveUserClient = getDriveUserClient;

export type DriveUploadResult = {
  fileId: string;
  webViewLink?: string;
  webContentLink?: string;
  publicUrl: string;
  name: string;
};

export async function uploadAvatarToDrive({
  folderId,
  fileName,
  mimeType,
  buffer,
  existingFileId,
  makePublic = false,
}: {
  folderId: string;
  fileName: string;
  mimeType: string;
  buffer: Buffer;
  existingFileId?: string;
  makePublic?: boolean;
}): Promise<DriveUploadResult> {
  // Ces dossiers appartiennent à un Drive personnel. Le Service Account peut
  // les lire, mais Google ne lui accorde aucun quota pour créer des fichiers.
  const drive = getDriveUserClient();

  let res: any;
  try {
    const media = { mimeType, body: Readable.from(buffer) };
    res = existingFileId
      ? await executeGoogleRequest({ provider: "drive", module: "media", operation: "files.update", access: "write", idempotent: true, run: () => drive.files.update({
          fileId: existingFileId,
          requestBody: { name: fileName },
          media,
          fields: "id,name,webViewLink,webContentLink",
        }, { timeout: DRIVE_REQUEST_TIMEOUT_MS }) })
      : await executeGoogleRequest({ provider: "drive", module: "media", operation: "files.create", access: "write", idempotent: false, run: () => drive.files.create({
          requestBody: { name: fileName, parents: [folderId] },
          media,
          fields: "id,name,webViewLink,webContentLink",
        }, { timeout: DRIVE_REQUEST_TIMEOUT_MS }) });
  } catch (error) {
    const err = error as {
      message?: string;
      code?: number;
      response?: { status?: number; data?: unknown };
      errors?: unknown;
    };
    const status = err?.response?.status ?? err?.code;
    const data = err?.response?.data;
    const isExpiredGrant =
      err?.message?.includes("invalid_grant") ||
      JSON.stringify(data).includes("invalid_grant");
    const baseMessage = isExpiredGrant
      ? "Autorisation Google Drive expirée: GOOGLE_DRIVE_REFRESH_TOKEN doit être renouvelé"
      : err?.message
        ? String(err.message)
        : "Erreur Google Drive";
    const details = data ? ` | details=${JSON.stringify(data)}` : "";
    throw new Error(
      `${baseMessage}${status ? ` (status ${status})` : ""}${details}`,
    );
  }

  const fileId = res.data.id;
  if (!fileId) {
    throw new Error("Upload Drive échoué: fileId manquant");
  }

  if (makePublic) {
    const permissions = await executeGoogleRequest({ provider: "drive", module: "media", operation: "permissions.list", access: "read", run: () => drive.permissions.list({
      fileId,
      fields: "permissions(type,role)",
    }, { timeout: DRIVE_REQUEST_TIMEOUT_MS }) });
    const isPublic = permissions.data.permissions?.some(
      (permission) =>
        permission.type === "anyone" &&
        (permission.role === "reader" || permission.role === "writer"),
    );
    if (!isPublic) {
      await executeGoogleRequest({ provider: "drive", module: "media", operation: "permissions.create", access: "write", idempotent: false, run: () => drive.permissions.create({
        fileId,
        requestBody: { type: "anyone", role: "reader" },
      }, { timeout: DRIVE_REQUEST_TIMEOUT_MS }) });
    }
  }

  const name = res.data.name || fileName;

  const publicUrl = buildDrivePublicUrl(fileId);

  return {
    fileId,
    name,
    webViewLink: res.data.webViewLink || undefined,
    webContentLink: res.data.webContentLink || undefined,
    publicUrl,
  };
}

export function getAvatarFolderId(config: ActorAvatarConfig): string {
  const configured = requiredEnv(config.folderEnvName).trim();
  const fromUrl = configured.match(/\/folders\/([A-Za-z0-9_-]+)/)?.[1];
  const folderId = fromUrl || configured;
  if (!/^[A-Za-z0-9_-]{10,200}$/.test(folderId))
    throw new Error(`Dossier Drive invalide pour ${config.label}`);
  return folderId;
}

export const uploadImageToDrive = uploadAvatarToDrive;

export async function readDriveMedia(fileId: string) {
  const drive = getDriveUserClient();
  const meta = await executeGoogleRequest({ provider: "drive", module: "media", operation: "files.get.metadata", access: "read", run: () => drive.files.get({ fileId, fields: "mimeType,name", supportsAllDrives: true }, { timeout: DRIVE_REQUEST_TIMEOUT_MS }) });
  const media = await executeGoogleRequest({ provider: "drive", module: "media", operation: "files.get.content", access: "read", run: () => drive.files.get({ fileId, alt: "media", supportsAllDrives: true }, { responseType: "stream", timeout: DRIVE_REQUEST_TIMEOUT_MS }) });
  return { mimeType: String(meta.data.mimeType || "application/octet-stream"), stream: media.data as unknown as ReadableStream | NodeJS.ReadableStream };
}

export function getClubLogoFolderId(): string {
  const configured = requiredEnv("GOOGLE_DRIVE_CLUB_LOGO_FOLDER_ID").trim();
  const folderId =
    configured.match(/\/folders\/([A-Za-z0-9_-]+)/)?.[1] || configured;
  if (!/^[A-Za-z0-9_-]{10,200}$/.test(folderId))
    throw new Error("Dossier Drive invalide pour les logos de club");
  return folderId;
}

export function buildClubLogoFileName(
  clubId: unknown,
  extension: string,
): string {
  const id = String(clubId ?? "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9_-]/g, "_")
    .slice(0, 120);
  if (!id) throw new Error("Identifiant club invalide");
  return `LOGO_CLUB_${id}.${String(extension).replace(/^\./, "").toLowerCase()}`;
}

export function buildAvatarFileName({
  config,
  entityId,
  extension,
}: {
  config: ActorAvatarConfig;
  entityId: string;
  extension: string;
}): string {
  const ext = String(extension ?? "")
    .trim()
    .replace(/^\./, "")
    .toLowerCase();
  return `${buildAvatarId(config, entityId)}.${ext}`;
}
