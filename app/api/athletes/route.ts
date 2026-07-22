import { NextResponse } from "next/server"
import { pickFirst, readSheetRows } from "@/lib/google-sheets"
import { getSessionUser } from "@/lib/auth-session"
import { resolveAvatarIdentifiers, resolveAvatarUrl } from "@/lib/avatar-resolver"

export const dynamic = "force-dynamic"

function normalize(value: unknown): string {
  return String(value ?? "").trim().toLowerCase()
}

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
    const { searchParams } = new URL(req.url)
    const hasAffiliationFilter = [
      searchParams.get("ligueId"),
      searchParams.get("clubId"),
      searchParams.get("club"),
      searchParams.get("equipeIds"),
    ].some((value) => String(value ?? "").trim() !== "")
    const search = normalize(searchParams.get("search"))
    const statutFilter = normalize(searchParams.get("statut"))
    const sexeFilter = normalize(searchParams.get("sexe"))
    const page = Math.max(1, Number(searchParams.get("page") ?? "1") || 1)
    const pageSizeRaw = Number(searchParams.get("pageSize") ?? "0") || 0
    const pageSize = pageSizeRaw > 0 ? Math.min(100, Math.max(1, pageSizeRaw)) : 0

    const user = await getSessionUser()
    if (!user) {
      return NextResponse.json({ error: "Non authentifie." }, { status: 401 })
    }

    const rows = await readSheetRows({ block: "acteurs", sheet: "athletes", range: "A:ZZ" })

    const filteredRows = rows.filter((row) => {
      const id = pickFirst(row, ["id_athlete"])
      const rowStatut = normalize(pickFirst(row, ["statut"]))
      const rowSexe = normalize(pickFirst(row, ["sexe"]))

      if (!id) return false
      if (hasAffiliationFilter) return false
      if (statutFilter && rowStatut !== statutFilter) return false
      if (sexeFilter && rowSexe !== sexeFilter) return false

      if (search) {
        const searchable = Object.values(row).join(" ").toLowerCase()
        if (!searchable.includes(search)) return false
      }

      return true
    })

    const total = filteredRows.length
    const paginatedRows =
      pageSize > 0 ? filteredRows.slice((page - 1) * pageSize, page * pageSize) : filteredRows

    const athletes = paginatedRows.map((row, index) => {
      const id = pickFirst(row, ["id_athlete"])
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
        dateNaissance: pickFirst(row, ["date_de_naissance"]) || "-",
        lieuNaissance: pickFirst(row, ["lieu_de_naissance"]) || "-",
        sexe: pickFirst(row, ["sexe"]) || "-",
        nationalite: pickFirst(row, ["nationalite"]) || "-",
        telephone: pickFirst(row, ["telephone"]) || "-",
        email: pickFirst(row, ["email"]) || "-",
        adresse: pickFirst(row, ["adresse"]) || "-",
        avatar_drive_id: avatarDriveId,
        avatar_drive_url: avatarDriveUrl,
        avatarUrl,
        province: "-",
        ligue: "-",
        entente: "-",
        club: "-",
        equipe: "-",
        dateDebut: "-",
        dateFin: "-",
        categorie: "-",
        numeroMaillot: "-",
        poste: "-",
        statut: pickFirst(row, ["statut"]) || "-",
      }
    })

    return NextResponse.json({
      athletes,
      pagination: pageSize > 0
        ? {
            page,
            pageSize,
            total,
            totalPages: Math.max(1, Math.ceil(total / pageSize)),
          }
        : undefined,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json({ athletes: [], error: message }, { status: 500 })
  }
}
