import { actorConfig, normalizeActor, type ActorKind } from "@/lib/actors"
import { scopeFromSession, type AccessScope } from "@/lib/auth-scope"
import type { SessionUser } from "@/lib/auth-session"
import { readSheetRowsBatch, type SheetBlock, type SheetRow } from "@/lib/google-sheets"
import { summarizeDashboardAffiliations } from "@/lib/dashboard/affiliation-summary"

type Batch = typeof readSheetRowsBatch
type Dependencies = { batch: Batch }
const defaults: Dependencies = { batch: readSheetRowsBatch }
const clean = (value: unknown) => String(value ?? "").trim()
const labelMap = (rows: SheetRow[], id: string, label: string) => new Map(rows.map((row) => [clean(row[id]), clean(row[label])]))

const requests: Array<{ block: SheetBlock; sheets: string[] }> = [
  { block: "structure", sheets: ["LIGUES", "ENTENTES", "CLUBS", "EQUIPES"] },
  { block: "acteurs", sheets: ["ATHLETES", "COACHS", "ARBITRES", "OFFICIELS", "MEDECINS", "AUTRES"] },
  { block: "affiliations", sheets: ["ATHLETE_AFFILIATIONS"] },
  { block: "competitions", sheets: ["COMPETITIONS", "COMPETITIONS_PARTICIPANTS", "COMPETITIONS_EPREUVES", "COMPETITIONS_UNITES", "COMPETITIONS_MATCHS", "COMPETITIONS_RESULTATS"] },
  { block: "equipeNationale", sheets: ["EQUIPES_NATIONALES", "EQUIPES_NATIONALES_SAISONS", "CAMPAGNES_EQUIPES_NATIONALES", "SELECTIONS_ATHLETES", "ENGAGEMENTS_EQUIPE_NATIONALE"] },
  { block: "referentiel", sheets: ["STATUTS_AFFILIATION", "DISCIPLINES", "CATEGORIES_AGE", "SEXES"] },
]

function scopedStructure(data: Record<string, SheetRow[]>, scope: AccessScope) {
  const ligues = data.LIGUES ?? [], ententes = data.ENTENTES ?? [], clubs = data.CLUBS ?? [], equipes = data.EQUIPES ?? []
  const ententeById = new Map(ententes.map((row) => [clean(row.id_entente), row])), clubById = new Map(clubs.map((row) => [clean(row.id_club), row]))
  const allowedEntente = (row: SheetRow) => scope.role === "federal" || (scope.role === "ligue" ? clean(row.id_ligue) === scope.ligueId : clean(row.id_entente) === scope.ententeId)
  const allowedClub = (row: SheetRow) => scope.role === "federal" || (scope.role === "entente" ? clean(row.id_entente) === scope.ententeId : clean(ententeById.get(clean(row.id_entente))?.id_ligue) === scope.ligueId)
  const allowedTeam = (row: SheetRow) => { const club = clubById.get(clean(row.id_club)); return Boolean(club && allowedClub(club)) }
  const scopedEntentes = ententes.filter(allowedEntente), scopedClubs = clubs.filter(allowedClub), scopedTeams = equipes.filter(allowedTeam)
  const ligueIds = new Set(scopedEntentes.map((row) => clean(row.id_ligue)))
  const scopedLigues = scope.role === "federal" ? ligues : ligues.filter((row) => ligueIds.has(clean(row.id_ligue)))
  return {
    ligues: scopedLigues.map((row) => ({ ...row, id: clean(row.id_ligue), nom: clean(row.nom_ligue), statut: clean(row.statut) })),
    ententes: scopedEntentes.map((row) => ({ ...row, id: clean(row.id_entente), nom: clean(row.nom_entente), ligue: clean(row.id_ligue), statut: clean(row.statut) })),
    clubs: scopedClubs.map((row) => ({ ...row, id: clean(row.id_club), nom: clean(row.nom_club), ligue: clean(ententeById.get(clean(row.id_entente))?.id_ligue), statut: clean(row.statut) })),
    equipes: scopedTeams.map((row) => ({ ...row, id: clean(row.id_equipe), nom: clean(row.nom_equipe), club: clean(row.id_club), categorie: clean(row.id_categorie_age), statut: clean(row.statut) })),
  }
}

function nationalData(core: Record<string, SheetRow[]>, refs: Record<string, SheetRow[]>, competitions: Record<string, SheetRow[]>) {
  const disciplines = labelMap(refs.DISCIPLINES ?? [], "id_discipline", "nom_discipline"), categories = labelMap(refs.CATEGORIES_AGE ?? [], "id_categorie_age", "nom_categorie_age"), sexes = labelMap(refs.SEXES ?? [], "id_sexe", "nom_sexe")
  const activations = core.EQUIPES_NATIONALES_SAISONS ?? [], campaigns = core.CAMPAGNES_EQUIPES_NATIONALES ?? []
  const activationById = new Map(activations.map((row) => [clean(row.id_equipe_nationale_saison), row])), campaignById = new Map(campaigns.map((row) => [clean(row.id_campagne_equipe_nationale), row]))
  const teamForCampaign = (id: unknown) => clean(activationById.get(clean(campaignById.get(clean(id))?.id_equipe_nationale_saison))?.id_equipe_nationale)
  const teams = (core.EQUIPES_NATIONALES ?? []).map((row) => ({ ...row, id: clean(row.id_equipe_nationale), nom: clean(row.nom_equipe_nationale), discipline: disciplines.get(clean(row.id_discipline)) || clean(row.id_discipline), categorie: categories.get(clean(row.id_categorie_age)) || clean(row.id_categorie_age), sexe: sexes.get(clean(row.id_sexe)) || clean(row.id_sexe) }))
  const selections = (core.SELECTIONS_ATHLETES ?? []).map((row) => ({ ...row, id: clean(row.id_selection), equipeNationaleId: teamForCampaign(row.id_campagne_equipe_nationale) }))
  const engagements: Array<SheetRow & { id: string; equipeNationaleId: string }> = (core.ENGAGEMENTS_EQUIPE_NATIONALE ?? []).map((row) => ({ ...row, id: clean(row.id_engagement_equipe_nationale), equipeNationaleId: teamForCampaign(row.id_campagne_equipe_nationale) }))
  const events = new Map((competitions.COMPETITIONS_EPREUVES ?? []).map((row) => [clean(row.id_epreuve_competition), row])), units = new Map((competitions.COMPETITIONS_UNITES ?? []).map((row) => [clean(row.id_unite_competition), row])), matches = new Map((competitions.COMPETITIONS_MATCHS ?? []).map((row) => [clean(row.id_match), row]))
  const teamByCompetitionUnit = new Map<string, string>()
  for (const engagement of engagements) { const event = events.get(clean(engagement.id_epreuve_competition)); if (event) teamByCompetitionUnit.set(`${clean(event.id_competition)}::${clean(engagement.id_unite_competition)}`, engagement.equipeNationaleId) }
  const results = (competitions.COMPETITIONS_RESULTATS ?? []).map((row) => { const match = matches.get(clean(row.id_match)), unitA = units.get(clean(match?.id_unite_a)), unitB = units.get(clean(match?.id_unite_b)), competitionId = clean(match?.id_competition); return { ...row, id: clean(row.id_resultat), equipeNationaleId: teamByCompetitionUnit.get(`${competitionId}::${clean(unitA?.id_unite_competition)}`) || teamByCompetitionUnit.get(`${competitionId}::${clean(unitB?.id_unite_competition)}`) || "" } })
  return { nationalTeams: teams, selections, nationalCompetitions: engagements, nationalResults: results }
}

export async function loadDashboardData(deps: Dependencies = defaults, user?: SessionUser) {
  const settled = await Promise.all(requests.map(async ({ block, sheets }) => {
    try { return { block, data: await deps.batch({ block, sheets }), error: "" } }
    catch { return { block, data: {} as Record<string, SheetRow[]>, error: `${block}: données indisponibles` } }
  }))
  const byBlock = Object.fromEntries(settled.map((item) => [item.block, item.data])) as Record<SheetBlock, Record<string, SheetRow[]>>
  const structure = scopedStructure(byBlock.structure, user ? scopeFromSession(user) : { role: "federal" })
  const actorKinds = Object.keys(actorConfig) as ActorKind[]
  const actors = Object.fromEntries(actorKinds.map((kind) => [kind, (byBlock.acteurs[actorConfig[kind].sheet] ?? []).map((row) => normalizeActor(kind, row))])) as Record<ActorKind, Array<Record<string, string>>>
  const statusNames = labelMap(byBlock.referentiel.STATUTS_AFFILIATION ?? [], "id_statut_affiliation", "nom_statut_affiliation")
  const affiliations = (byBlock.affiliations.ATHLETE_AFFILIATIONS ?? []).map((row) => ({ ...row, statut: statusNames.get(clean(row.id_statut_affiliation)) || clean(row.id_statut_affiliation) }))
  const competitions = (byBlock.competitions.COMPETITIONS ?? []).map((row) => ({ ...row, id: clean(row.id_competition), nom: clean(row.nom_competition), statut: clean(row.statut) }))
  return { ...structure, ...actors, affiliations: affiliations.slice(0, 100), affiliationSummary: summarizeDashboardAffiliations(affiliations), competitions, participants: byBlock.competitions.COMPETITIONS_PARTICIPANTS ?? [], competitionResults: byBlock.competitions.COMPETITIONS_RESULTATS ?? [], ...nationalData(byBlock.equipeNationale, byBlock.referentiel, byBlock.competitions), errors: settled.flatMap((item) => item.error ? [item.error] : []) }
}
