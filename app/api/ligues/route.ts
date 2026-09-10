import { NextResponse } from "next/server"
import { pickFirst, readSheetRows } from "@/lib/google-sheets"
import { getSessionUser } from "@/lib/auth-session"
import { scopeFromSession } from "@/lib/auth-scope"
import { handleTerritorialWrite } from "@/app/api/_territorial-write"
import { getReferenceMap } from "@/lib/territorial"

export const dynamic = "force-dynamic"

export async function POST(request: Request) { return handleTerritorialWrite(request, "ligues", "create") }

export async function GET() {
  try {
    const user = await getSessionUser()
    if (!user) {
      return NextResponse.json({ error: "Non authentifié." }, { status: 401 })
    }

    const scope = scopeFromSession(user)
    const [rows, provinces] = await Promise.all([readSheetRows({ block: "structure", sheet: "ligues", range: "A:ZZ" }), getReferenceMap("PROVINCES")])

    let allowedLigueId: string | null = null
    if (scope.role === "ligue") {
      allowedLigueId = scope.ligueId
    } else if (scope.role === "entente") {
      const ententes = await readSheetRows({ block: "structure", sheet: "ententes", range: "A:ZZ" })
      const ententeRow = ententes.find((r) => {
        const id = pickFirst(r, ["id_entente", "id", "code_entente", "code"])
        return String(id ?? "") === scope.ententeId
      })

      const ligueId = ententeRow ? pickFirst(ententeRow, ["id_ligue", "ligue_id", "idligue"]) : null
      allowedLigueId = ligueId ? String(ligueId) : null
    }

    const filteredRows =
      scope.role === "federal" ? rows : rows.filter((row) => {
        if (!allowedLigueId) return false
        const id = pickFirst(row, ["id_ligue", "id", "code_ligue", "code"])
        return String(id ?? "") === allowedLigueId
      })

    const ligues = filteredRows.map((row, index) => {
      const id = pickFirst(row, ["id_ligue", "id", "code_ligue", "code"])
      const nom = pickFirst(row, ["nom_ligue", "nom", "ligue", "designation"])
      const pseudo = pickFirst(row, ["sigle_ligue", "pseudo_ligue", "pseudo", "sigle"])
      const provinceId = pickFirst(row, ["id_province", "province_id", "idprovince"])
      const province = pickFirst(row, ["nom_province", "province", "province_nom"]) || provinces.get(provinceId) || provinceId
      const email = pickFirst(row, ["email", "email_ligue", "mail_ligue", "mail"])
      const presidentId = pickFirst(row, ["id_president_ligue", "president_ligue_id", "id_president"])
      const presidentNom = pickFirst(row, ["nom_president_ligue", "president_ligue", "president", "nom_president"])
      const presidentTelephone = pickFirst(row, [
        "telephone_president_ligue",
        "tel_president_ligue",
        "telephone_president",
        "tel_president",
      ])
      const presidentEmail = pickFirst(row, ["email_president_ligue", "email_president"])
      const secretaireId = pickFirst(row, ["id_secretaire_ligue", "secretaire_ligue_id", "id_secretaire"])
      const secretaireNom = pickFirst(row, ["nom_secretaire_ligue", "secretaire_ligue", "secretaire", "nom_secretaire"])
      const secretaireTelephone = pickFirst(row, [
        "telephone_secretaire_ligue",
        "tel_secretaire_ligue",
        "telephone_secretaire",
        "tel_secretaire",
      ])
      const secretaireEmail = pickFirst(row, ["email_secretaire_ligue", "email_secretaire"])
      const statut = pickFirst(row, ["statut", "status", "etat"])

      const fallbackId = `row_${index + 2}`
      const __key = `${id || fallbackId}__${index + 2}`

      return {
        ...row,
        __key,
        id: id || fallbackId,
        nom: nom || "-",
        pseudo: pseudo || "-",
        sigle: pseudo || "-",
        provinceId: provinceId || "",
        province: province || "-",
        email: email || "-",
        presidentId: presidentId || "",
        presidentNom: presidentNom || "-",
        presidentTelephone: presidentTelephone || "-",
        presidentEmail: presidentEmail || "-",
        secretaireId: secretaireId || "",
        secretaireNom: secretaireNom || "-",
        secretaireTelephone: secretaireTelephone || "-",
        secretaireEmail: secretaireEmail || "-",
        statut: statut || "-",
      }
    })

    return NextResponse.json({ ligues })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json({ ligues: [], error: message }, { status: 500 })
  }
}
