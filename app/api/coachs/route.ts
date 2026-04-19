import { NextResponse } from "next/server"
import { pickFirst, readSheetRows } from "@/lib/google-sheets"
import { buildDrivePublicUrl } from "@/lib/google-drive-url"

export const dynamic = "force-dynamic"

function splitNomComplet(nomCompletRaw: string) {
  const parts = nomCompletRaw
    .split(" ")
    .map((p) => p.trim())
    .filter(Boolean)

  if (parts.length === 0) return { prenom: "-", nom: "-" }
  if (parts.length === 1) return { prenom: "-", nom: parts[0] }

  return { prenom: parts[0], nom: parts.slice(1).join(" ") }
}

export async function GET() {
  try {
    const rows = await readSheetRows("coachs")

    const coachs = rows.map((row, index) => {
      const id = pickFirst(row, ["id_coach", "id", "code_coach", "code"])
      const nomComplet = pickFirst(row, [
        "nom_complet",
        "nom complet",
        "nom",
        "coach",
        "entraineur",
        "entraîneur",
      ])

      const { prenom, nom } = splitNomComplet(String(nomComplet ?? ""))

      const sexe = pickFirst(row, ["sexe", "genre", "sex"]) || "-"
      const dateNaissance = pickFirst(row, ["date_de_naissance", "date_naissance", "naissance"]) || "-"
      const nationalite = pickFirst(row, ["nationalite", "nationalité", "pays"]) || "-"

      const niveau = pickFirst(row, ["niveau", "level"]) || "-"
      const specialite = pickFirst(row, ["specialite", "spécialité", "speciality"]) || "-"

      const province = pickFirst(row, ["nom_province", "province", "province_nom"]) || "-"
      const ligue = pickFirst(row, ["nom_ligue", "ligue", "ligue_nom"]) || "-"
      const entente = pickFirst(row, ["nom_entente", "entente", "entente_nom"]) || "-"
      const club = pickFirst(row, ["nom_club", "club", "club_nom"]) || "-"
      const equipe = pickFirst(row, ["nom_equipe", "equipe", "équipe", "equipe_nom"]) || "-"

      const telephone = pickFirst(row, ["telephone", "téléphone", "tel", "phone"]) || "-"
      const email = pickFirst(row, ["email", "mail"]) || "-"

      const statut = pickFirst(row, ["statut", "status", "etat"]) || "-"

      const avatarDriveId = pickFirst(row, ["avatar_drive_id", "drive_id", "avatar_id"])
      const avatarDriveUrl = pickFirst(row, ["avatar_drive_url", "avatar_url", "photo_url", "avatar"])
      const avatarUrl = avatarDriveId
        ? buildDrivePublicUrl(avatarDriveId)
        : avatarDriveUrl
          ? String(avatarDriveUrl)
          : ""

      const fallbackId = `row_${index + 2}`
      const __key = `${id || fallbackId}__${index + 2}`

      return {
        __key,
        id: id || fallbackId,
        nom,
        prenom,
        avatar_drive_id: avatarDriveId ? String(avatarDriveId) : "",
        avatar_drive_url: avatarDriveUrl ? String(avatarDriveUrl) : "",
        avatarUrl,
        sexe,
        dateNaissance,
        nationalite,
        niveau,
        specialite,
        province,
        ligue,
        entente,
        club,
        equipe,
        telephone,
        email,
        statut,
      }
    })

    return NextResponse.json({ coachs })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json({ coachs: [], error: message }, { status: 500 })
  }
}
