import { protectedRoute } from "@/lib/auth/guard"
import { NextResponse } from "next/server"
import { handleTerritorialWrite } from "@/app/api/_territorial-write"
import { getSessionUser } from "@/lib/auth-session"
import { scopeFromSession } from "@/lib/auth-scope"
import { pickFirst, readSheetRows } from "@/lib/google-sheets"
import { getReferenceMap } from "@/lib/territorial"

async function GETHandler(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: "Non authentifié." }, { status: 401 })

  try {
    const id = decodeURIComponent((await params).id)
    const [ententeRows, ligueRows, clubRows, equipeRows, categories, villes, ageCategories, sexes] = await Promise.all([
      readSheetRows({ block: "structure", sheet: "ENTENTES", range: "A:ZZ" }),
      readSheetRows({ block: "structure", sheet: "LIGUES", range: "A:K" }),
      readSheetRows({ block: "structure", sheet: "CLUBS", range: "A:ZZ" }),
      readSheetRows({ block: "structure", sheet: "EQUIPES", range: "A:ZZ" }),
      getReferenceMap("CATEGORIES_CLUB"),
      getReferenceMap("VILLES"),
      getReferenceMap("CATEGORIES_AGE"),
      getReferenceMap("SEXES"),
    ])
    const row = ententeRows.find(item => String(pickFirst(item,["id_entente"])??"")===id)
    if (!row) return NextResponse.json({ error: "Entente introuvable." }, { status: 404 })

    const ligueId=pickFirst(row,["id_ligue"]),villeId=pickFirst(row,["id_ville"]),scope=scopeFromSession(user)
    if ((scope.role==="ligue"&&scope.ligueId!==ligueId)||(scope.role==="entente"&&scope.ententeId!==id)) return NextResponse.json({ error: "Accès refusé." }, { status: 403 })
    const ligueRow=ligueRows.find(item=>pickFirst(item,["id_ligue"])===ligueId)
    const entente={...row,id,nom:pickFirst(row,["nom_entente"])||"-",pseudo:pickFirst(row,["sigle_entente","pseudo_entente"])||"-",sigle:pickFirst(row,["sigle_entente","pseudo_entente"])||"-",ligueId:ligueId||"",villeId:villeId||"",ville:pickFirst(row,["nom_ville","ville"])||villes.get(villeId)||villeId||"-",ligue:pickFirst(ligueRow||{},["sigle_ligue","pseudo_ligue","nom_ligue"])||ligueId||"-",email:pickFirst(row,["email","email_entente"])||"-",telephone:pickFirst(row,["telephone","telephone_entente"])||"-",statut:pickFirst(row,["statut"])||"-"}
    const clubs=clubRows.filter(club=>pickFirst(club,["id_entente"])===id).map(club=>{const clubId=pickFirst(club,["id_club"]),categorieId=pickFirst(club,["id_categorie_club","id_categorie"]);return {...club,id:clubId,nom:pickFirst(club,["nom_club"])||"-",sigle:pickFirst(club,["sigle_club"])||"-",categorie:categories.get(categorieId)||categorieId||"-",statut:pickFirst(club,["statut"])||"-",equipeCount:equipeRows.filter(equipe=>pickFirst(equipe,["id_club"])===clubId).length}}).sort((a,b)=>String(a.nom).localeCompare(String(b.nom),"fr",{sensitivity:"base"}))
    const clubById = new Map(clubs.map(club => [club.id, club]))
    const equipes = equipeRows.filter(equipe => clubById.has(pickFirst(equipe, ["id_club"]))).map(equipe => {
      const clubId = pickFirst(equipe, ["id_club"])
      return {
        id: pickFirst(equipe, ["id_equipe"]),
        nom: pickFirst(equipe, ["nom_equipe"]) || "-",
        club: clubById.get(clubId)?.nom || clubId,
        categorie: ageCategories.get(pickFirst(equipe, ["id_categorie_age"])) || "Non définie",
        genre: sexes.get(pickFirst(equipe, ["id_sexe"])) || "-",
        statut: pickFirst(equipe, ["statut"]) || "-",
      }
    }).sort((a, b) => a.nom.localeCompare(b.nom, "fr", { sensitivity: "base" }))
    return NextResponse.json({ entente, clubs, equipes, canEdit: user.role === "federal" })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Lecture impossible." }, { status: 500 })
  }
}

async function PUTHandler(request: Request, { params }: { params: Promise<{ id: string }> }) { return handleTerritorialWrite(request, "ententes", "update", decodeURIComponent((await params).id)) }

export const GET = protectedRoute(GETHandler)
export const PUT = protectedRoute(PUTHandler)
