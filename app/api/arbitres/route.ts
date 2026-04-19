import { NextResponse } from "next/server"
import { pickFirst, readSheetRows } from "@/lib/google-sheets"
import { getSessionUser } from "@/lib/auth-session"
import { scopeFromSession } from "@/lib/auth-scope"
import { buildDrivePublicUrl } from "@/lib/google-drive-url"

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
    const rows = await readSheetRows("arbitres")

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

    const arbitres = filteredRows.map((row, index) => {
      const id = pickFirst(row, ["id_arbitre", "id", "code_arbitre", "code"])
      const nomComplet = pickFirst(row, ["nom_complet", "nom", "nom_prenom", "designation"])
      const { prenom, nom } = splitNomComplet(nomComplet)

      const sexe = pickFirst(row, ["sexe", "genre", "sex"])
      const dateNaissance = pickFirst(row, ["date_de_naissance", "date_naissance", "naissance", "dob"])
      const nationalite = pickFirst(row, ["nationalite", "nationalité"])
      const niveau = pickFirst(row, ["niveau", "grade", "categorie"])

      const province = pickFirst(row, ["nom_province", "province", "province_nom"])
      const ligueId = pickFirst(row, ["id_ligue", "ligue_id", "idligue"])
      const ligue = pickFirst(row, ["pseudo_ligue", "nom_ligue", "ligue", "ligue_nom"])
      const entente = pickFirst(row, ["nom_entente", "entente", "entente_nom"])

      const telephone = pickFirst(row, ["telephone", "téléphone", "phone"])
      const email = pickFirst(row, ["email", "e-mail", "mail"])
      const tailleCm = pickFirst(row, ["taille", "taille_cm", "height"])
      const poidsKg = pickFirst(row, ["poids", "poids_kg", "weight"])

      const avatarUrl = pickFirst(row, ["avatar_drive_url", "avatar_url", "photo_url", "avatar"])
      const avatarDriveId = pickFirst(row, ["avatar_drive_id", "drive_id", "avatar_id"])
      const resolvedAvatarUrl = avatarDriveId ? buildDrivePublicUrl(avatarDriveId) : avatarUrl || ""

      const statut = pickFirst(row, ["statut", "status", "etat"])

      const fallbackId = `row_${index + 2}`
      const __key = `${id || fallbackId}__${index + 2}`

      return {
        __key,
        id: id || fallbackId,
        nom: nom || "",
        prenom: prenom || "-",
        sexe: String(sexe ?? "-") || "-",
        dateNaissance: String(dateNaissance ?? "-") || "-",
        nationalite: String(nationalite ?? "-") || "-",
        avatar_drive_id: avatarDriveId ? String(avatarDriveId) : "",
        avatar_drive_url: avatarUrl ? String(avatarUrl) : "",
        avatarUrl: resolvedAvatarUrl,
        telephone: String(telephone || "") || "",
        email: String(email || "") || "",
        tailleCm: tailleCm ? Number(String(tailleCm).replace(/[^0-9.]/g, "")) : undefined,
        poidsKg: poidsKg ? Number(String(poidsKg).replace(/[^0-9.]/g, "")) : undefined,
        niveau: String(niveau ?? "-") || "-",
        province: String(province ?? "-") || "-",
        ligue: String(ligue ?? "-") || "-",
        entente: String(entente ?? "-") || "-",
        statut: String(statut ?? "-") || "-",
      }
    })

    return NextResponse.json({ arbitres })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json({ arbitres: [], error: message }, { status: 500 })
  }
}
