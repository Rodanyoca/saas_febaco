import { google } from "googleapis";
import { Readable } from "node:stream";
import { buildDrivePublicUrl } from "@/lib/google-drive-url";
import { buildAvatarId, type ActorAvatarConfig } from "@/lib/avatar-config";

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing environment variable: ${name}`);
  }
  return value;
}

export function createDriveClient() {
  const auth = new google.auth.JWT({
    email: requiredEnv("GOOGLE_SERVICE_ACCOUNT_EMAIL"),
    key: requiredEnv("GOOGLE_PRIVATE_KEY").replace(/\\n/g, "\n"),
    scopes: ["https://www.googleapis.com/auth/drive"],
  });
  return google.drive({ version: "v3", auth });
}

function createDriveUploadClient() {
  const auth = new google.auth.OAuth2({
    clientId: requiredEnv("GOOGLE_OAUTH_CLIENT_ID"),
    clientSecret: requiredEnv("GOOGLE_OAUTH_CLIENT_SECRET"),
  });
  auth.setCredentials({
    refresh_token: requiredEnv("GOOGLE_DRIVE_REFRESH_TOKEN"),
  });
  return google.drive({ version: "v3", auth });
}

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
  const drive = createDriveUploadClient();

  let res: any;
  try {
    const media = { mimeType, body: Readable.from(buffer) };
    res = existingFileId
      ? await drive.files.update({
          fileId: existingFileId,
          requestBody: { name: fileName },
          media,
          fields: "id,name,webViewLink,webContentLink",
        })
      : await drive.files.create({
          requestBody: { name: fileName, parents: [folderId] },
          media,
          fields: "id,name,webViewLink,webContentLink",
        });
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
    const permissions = await drive.permissions.list({
      fileId,
      fields: "permissions(type,role)",
    });
    const isPublic = permissions.data.permissions?.some(
      (permission) =>
        permission.type === "anyone" &&
        (permission.role === "reader" || permission.role === "writer"),
    );
    if (!isPublic) {
      await drive.permissions.create({
        fileId,
        requestBody: { type: "anyone", role: "reader" },
      });
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
