import { NextResponse } from "next/server"
import { pickFirst, readSheetRows } from "@/lib/google-sheets"
import { getSessionUser } from "@/lib/auth-session"
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

export async function GET(req: Request) {
  try {
    const user = await getSessionUser()
    if (!user) {
      return NextResponse.json({ error: "Non authentifie." }, { status: 401 })
    }

    const rows = await readSheetRows({ block: "acteurs", sheet: "arbitres", range: "A:ZZ" })
    const idFilter = new URL(req.url).searchParams.get("id")?.trim().toLowerCase()

    const rowsWithId = rows.filter((row) => {
      const id = pickFirst(row, ["id_arbitre"])
      return id !== "" && (!idFilter || id.toLowerCase() === idFilter)
    })

    const arbitres = rowsWithId.map((row, index) => {
      const id = pickFirst(row, ["id_arbitre"])
      const idNational = pickFirst(row, ["id_national"])
      const idFiba = pickFirst(row, ["id_fiba"])
      const nomComplet = pickFirst(row, ["nom"])
      const { prenom, nom } = splitNomComplet(nomComplet)

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
        nom: nom || "",
        prenom: prenom || "-",
        nomComplet: nomComplet || `${prenom} ${nom}`.trim(),
        sexe: pickFirst(row, ["sexe"]) || "-",
        dateNaissance: pickFirst(row, ["date_de_naissance"]) || "-",
        nationalite: pickFirst(row, ["nationalite"]) || "-",
        avatar_drive_id: avatarDriveId,
        avatar_drive_url: avatarDriveUrl,
        avatarUrl,
        telephone: pickFirst(row, ["telephone"]) || "",
        email: pickFirst(row, ["email"]) || "",
        niveau: pickFirst(row, ["niveau"]) || "-",
        province: "-",
        ligue: "-",
        entente: "-",
        statut: pickFirst(row, ["statut"]) || "-",
      }
    })

    return NextResponse.json({ arbitres })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json({ arbitres: [], error: message }, { status: 500 })
  }
}
