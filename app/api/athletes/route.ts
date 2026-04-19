import { NextResponse } from "next/server"
import { pickFirst, readSheetRows } from "@/lib/google-sheets"
import { getSessionUser } from "@/lib/auth-session"
import { scopeFromSession } from "@/lib/auth-scope"
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
    const user = await getSessionUser()
    if (!user) {
      return NextResponse.json({ error: "Non authentifié." }, { status: 401 })
    }

    const scope = scopeFromSession(user)
    const rows = await readSheetRows("athletes")

    const filteredRows =
      scope.role === "federal"
        ? rows
        : rows.filter((row) => {
            if (scope.role === "ligue") {
              const ligueId = pickFirst(row, ["id_ligue", "ligue_id", "idligue"])
              return String(ligueId ?? "") === scope.ligueId
            }
            const ententeId = pickFirst(row, ["id_entente", "entente_id", "identente"])
            return String(ententeId ?? "") === scope.ententeId
          })

    const athletes = filteredRows.map((row, index) => {
      const id = pickFirst(row, ["id_athlete", "id", "code_athlete", "code"])
      const nomComplet = pickFirst(row, [
        "nom_complet",
        "nom complet",
        "nom",
        "athlete",
        "athlète",
      ])

      const { prenom, nom } = splitNomComplet(String(nomComplet ?? ""))

      const sexe = pickFirst(row, ["sexe", "genre", "sex"]) || "-"
      const dateNaissance = pickFirst(row, ["date_de_naissance", "date_naissance", "naissance"]) || "-"
      const lieuNaissance = pickFirst(row, ["lieu_de_naissance", "lieu_naissance", "lieu"]) || "-"
      const nationalite = pickFirst(row, ["nationalite", "nationalité", "pays"]) || "-"

      const province = pickFirst(row, ["nom_province", "province", "province_nom"]) || "-"
      const ligue = pickFirst(row, ["nom_ligue", "ligue", "ligue_nom"]) || "-"
      const entente = pickFirst(row, ["nom_entente", "entente", "entente_nom"]) || "-"
      const club = pickFirst(row, ["nom_club", "club", "club_nom"]) || "-"
      const equipe = pickFirst(row, ["nom_equipe", "equipe", "équipe", "equipe_nom"]) || "-"

      const categorie = pickFirst(row, ["categorie", "category"]) || "-"
      const numeroMaillot = pickFirst(row, ["numero_maillot", "numero maillot", "maillot"]) || "-"
      const poste = pickFirst(row, ["poste", "position"]) || "-"
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
        lieuNaissance,
        nationalite,
        province,
        ligue,
        entente,
        club,
        equipe,
        categorie,
        numeroMaillot,
        poste,
        statut,
      }
    })

    return NextResponse.json({ athletes })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json({ athletes: [], error: message }, { status: 500 })
  }
}
