import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth-session";
import {
  buildClubLogoFileName,
  getClubLogoFolderId,
  uploadImageToDrive,
} from "@/lib/google-drive";
import { getClubLogoTarget, updateClubLogoFields } from "@/lib/google-sheets";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
const MAX_BYTES = 5 * 1024 * 1024,
  ALLOWED = new Set(["image/jpeg", "image/jpg", "image/png", "image/webp"]);
function validSignature(buffer: Buffer, mime: string) {
  if (mime === "image/png")
    return buffer
      .subarray(0, 8)
      .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  if (mime === "image/webp")
    return (
      buffer.subarray(0, 4).toString("ascii") === "RIFF" &&
      buffer.subarray(8, 12).toString("ascii") === "WEBP"
    );
  return buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
}
const bad = (message: string) =>
  NextResponse.json({ error: message }, { status: 400 });
export async function POST(request: Request) {
  try {
    const user = await getSessionUser();
    if (!user)
      return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
    if (user.role !== "federal")
      return NextResponse.json(
        { error: "Action réservée au rôle fédéral." },
        { status: 403 },
      );
    const form = await request.formData(),
      file = form.get("file"),
      clubId = String(form.get("clubId") ?? "").trim();
    if (!(file instanceof File)) return bad("Fichier absent");
    if (!clubId) return bad("Identifiant club invalide");
    if (!ALLOWED.has(file.type)) return bad("Format non autorisé");
    if (!file.size || file.size > MAX_BYTES)
      return bad("Fichier trop grand (max 5 Mo)");
    const buffer = Buffer.from(await file.arrayBuffer());
    if (!validSignature(buffer, file.type))
      return bad("Le contenu ne correspond pas au format annoncé");
    const current = await getClubLogoTarget(clubId),
      extension =
        file.type === "image/png"
          ? "png"
          : file.type === "image/webp"
            ? "webp"
            : "jpg";
    const uploaded = await uploadImageToDrive({
      folderId: getClubLogoFolderId(),
      fileName: buildClubLogoFileName(clubId, extension),
      mimeType: file.type,
      buffer,
      existingFileId: current.logoDriveId || undefined,
      makePublic: true,
    });
    await updateClubLogoFields(clubId, uploaded.fileId, uploaded.publicUrl);
    return NextResponse.json({
      ok: true,
      clubId,
      logo_drive_id: uploaded.fileId,
      logo_drive_url: uploaded.publicUrl,
      logoUrl: uploaded.publicUrl,
    });
  } catch (error) {
    console.error("[api/upload/club-logo]", error);
    return NextResponse.json(
      { error: "Téléversement du logo impossible." },
      { status: 503 },
    );
  }
}
