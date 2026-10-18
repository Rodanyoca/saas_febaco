import { NextResponse } from "next/server"
import { protectedRoute } from "@/lib/auth/guard"
import { getSessionUser } from "@/lib/auth-session"
import { loadSeasonSettings, saveCurrentSeason } from "@/lib/current-season"
import { SeasonSettingsError } from "@/lib/current-season-domain"

export const dynamic = "force-dynamic"
function failure(error: unknown) {
  return NextResponse.json({ error: {
    code: error instanceof SeasonSettingsError ? error.code : "PARAMETRES_INDISPONIBLES",
    message: error instanceof SeasonSettingsError ? error.message : "Le service des paramètres est indisponible. Actualisez pour vérifier la saison avant de réessayer.",
  } }, { status: error instanceof SeasonSettingsError ? error.status : 503 })
}
async function GETHandler() {
  try { return NextResponse.json({ settings: await loadSeasonSettings() }) } catch (error) { return failure(error) }
}
async function PUTHandler(request: Request) {
  const user = await getSessionUser()
  if (!user?.estSuperAdmin || !user.idUser) return NextResponse.json({ error: { message: "Modification réservée à un superadministrateur autorisé." } }, { status: 403 })
  try {
    const body = await request.json().catch(() => null)
    if (!body || typeof body !== "object" || Array.isArray(body)) throw new SeasonSettingsError("REQUETE_INVALIDE", "Requête invalide.", 400)
    return NextResponse.json({ settings: await saveCurrentSeason(body.seasonId, body.expectedSeasonId, user.idUser) })
  } catch (error) { return failure(error) }
}
// La politique existante de /parametres exige SUPER_ADMIN, sans changement d’authentification.
export const GET = protectedRoute(GETHandler)
export const PUT = protectedRoute(PUTHandler)
