import { NextResponse } from "next/server"
import { pickFirst, readSheetRows } from "@/lib/google-sheets"
import { resolveAvatarIdentifiers, resolveAvatarUrl } from "@/lib/avatar-resolver"
import { getSessionUser } from "@/lib/auth-session"

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

export async function GET(req: Request) {
  try {
    if (!(await getSessionUser())) {
      return NextResponse.json({ error: "Non authentifié." }, { status: 401 })
    }
    const rows = await readSheetRows({ block: "acteurs", sheet: "coachs", range: "A:ZZ" })
    const idFilter = new URL(req.url).searchParams.get("id")?.trim().toLowerCase()

    const validRows = rows.filter((row) => {
      const idCoach = pickFirst(row, ["id_coach"])
      const nomComplet = pickFirst(row, ["nom_complet"])
      return idCoach !== "" && nomComplet.length > 0 && (!idFilter || idCoach.toLowerCase() === idFilter)
    })

    const coachs = validRows.map((row, index) => {
      const id = pickFirst(row, ["id_coach"])
      const idNational = pickFirst(row, ["id_national"])
      const idFiba = pickFirst(row, ["id_fiba"])
      const nomComplet = pickFirst(row, ["nom_complet"])
      const { prenom, nom } = splitNomComplet(String(nomComplet ?? ""))

      const { avatarDriveId, avatarDriveUrl } = resolveAvatarIdentifiers(row)
      const avatarUrl = resolveAvatarUrl(row)

      const __key = `${id}__${index}`

      return {
        __key,
        id: id || "",
        idNational: idNational || "",
        idFiba: idFiba || "",
        clubId: "",
        equipeId: "",
        nom,
        prenom,
        nomComplet: nomComplet || `${prenom} ${nom}`.trim(),
        avatar_drive_id: avatarDriveId,
        avatar_drive_url: avatarDriveUrl,
        avatarUrl,
        sexe: pickFirst(row, ["sexe"]) || "-",
        dateNaissance: pickFirst(row, ["date_de_naissance"]) || "-",
        lieuNaissance: pickFirst(row, ["lieu_de_naissance"]) || "-",
        nationalite: pickFirst(row, ["nationalite"]) || "-",
        telephone: pickFirst(row, ["telephone"]) || "-",
        email: pickFirst(row, ["email"]) || "-",
        adresse: pickFirst(row, ["adresse"]) || "-",
        niveau: pickFirst(row, ["niveau"]) || "-",
        specialite: "-",
        province: "-",
        ligue: "-",
        entente: "-",
        club: "-",
        equipe: "-",
        statut: pickFirst(row, ["statut"]) || "-",
      }
    })

    return NextResponse.json({ coachs })
  } catch (error) {
    console.error("[api/coachs] Lecture impossible", error)
    return NextResponse.json({ coachs: [], error: "Lecture impossible." }, { status: 500 })
  }
}
