import { NextResponse } from "next/server"
import { pickFirst, readSheetRows } from "@/lib/google-sheets"
import { getSessionUser } from "@/lib/auth-session"
import { scopeFromSession } from "@/lib/auth-scope"
import { resolveAvatarIdentifiers, resolveAvatarUrl } from "@/lib/avatar-resolver"

export const dynamic = "force-dynamic"

function splitNomComplet(nomComplet: unknown): { prenom: string; nom: string } {
  const raw = String(nomComplet ?? "").trim()
  if (!raw) return { prenom: "-", nom: "" }

  const parts = raw.split(/\s+/).filter(Boolean)
  if (parts.length === 1) return { prenom: parts[0], nom: "" }

  return {
    prenom: parts.slice(0, -1).join(" "),
    nom: parts[parts.length - 1],
  }
}

export async function GET() {
  try {
    const user = await getSessionUser()
    if (!user) {
      return NextResponse.json({ error: "Non authentifié." }, { status: 401 })
    }

    const scope = scopeFromSession(user)
    const rows = await readSheetRows("officiels")

    const rowsWithId = rows.filter(
      (row) => pickFirst(row, ["id_officiel"]) !== ""
    )

    const filteredRows =
      scope.role === "federal"
        ? rowsWithId
        : rowsWithId.filter((row) => {
            if (scope.role === "ligue") {
              const ligueId = pickFirst(row, ["id_ligue", "ligue_id", "idligue"])
              return String(ligueId ?? "") === scope.ligueId
            }
            const ententeId = pickFirst(row, ["id_entente", "entente_id", "identente"])
            return String(ententeId ?? "") === scope.ententeId
          })

    const officiels = filteredRows.map((row, index) => {
      const id = pickFirst(row, ["id_officiel"])
      const idNational = pickFirst(row, ["id_national"])
      const idFiba = pickFirst(row, ["id_fiba"])
      const clubId = pickFirst(row, ["id_club", "club_id", "idclub"])
      const equipeId = pickFirst(row, ["id_equipe", "equipe_id", "idequipe", "code_equipe"])
      const nomComplet = pickFirst(row, ["nom_complet"])
      const { prenom, nom } = splitNomComplet(nomComplet)

      const sexe = pickFirst(row, ["sexe"])
      const dateNaissance = pickFirst(row, ["date_de_naissance"])
      const nationalite = pickFirst(row, ["nationalite"])

      const telephone = pickFirst(row, ["telephone"])
      const email = pickFirst(row, ["email"])
      const fonction = pickFirst(row, ["fonction", "role"])
      const structure = pickFirst(row, ["structure", "organisation", "organisme"])

      const province = pickFirst(row, ["nom_province", "province", "province_nom"])
      const ligue = pickFirst(row, ["nom_ligue", "ligue", "ligue_nom"])
      const entente = pickFirst(row, ["nom_entente", "entente", "entente_nom"])
      const club = pickFirst(row, ["nom_club", "club", "club_nom"])

      const statut = pickFirst(row, ["statut"])
      const observation = pickFirst(row, ["observation", "observations", "remarque", "remarques"])

      const { avatarDriveId, avatarDriveUrl } = resolveAvatarIdentifiers(row)
      const avatarUrl = resolveAvatarUrl(row)

      const __key = `${id}__${index}`

      return {
        __key,
        id,
        idNational,
        idFiba,
        clubId: clubId || "",
        equipeId: equipeId || "",
        nom: nom || "",
        prenom: prenom || "-",
        nomComplet: nomComplet || `${prenom} ${nom}`.trim(),
        sexe: String(sexe ?? "-") || "-",
        dateNaissance: String(dateNaissance ?? "-") || "-",
        nationalite: String(nationalite ?? "-") || "-",
        avatar_drive_id: avatarDriveId,
        avatar_drive_url: avatarDriveUrl,
        avatarUrl,
        telephone: String(telephone || "") || "",
        email: String(email || "") || "",
        fonction: String(fonction ?? "-") || "-",
        structure: String(structure ?? "-") || "-",
        province: String(province ?? "-") || "-",
        ligue: String(ligue ?? "-") || "-",
        entente: String(entente ?? "-") || "-",
        club: String(club ?? "-") || "-",
        statut: String(statut ?? "-") || "-",
        observation: String(observation ?? "") || "",
      }
    })

    return NextResponse.json({ officiels })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json({ officiels: [], error: message }, { status: 500 })
  }
}
