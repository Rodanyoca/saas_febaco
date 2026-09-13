import type { AccessScope } from "@/lib/auth-scope";
import { appendSheetRowsAtomically, readSheetRows, upsertSheetRowsAtomically, type SheetRow } from "@/lib/google-sheets";

const clean = (value: unknown) => String(value ?? "").trim();
export class LicenceError extends Error {
  constructor(public code: string, message: string, public status = 400, public fields: Record<string, string> = {}) { super(message); }
}

type Dependencies = { readRows: typeof readSheetRows; appendRows: typeof appendSheetRowsAtomically; upsertRows: typeof upsertSheetRowsAtomically };
const defaults: Dependencies = { readRows: readSheetRows, appendRows: appendSheetRowsAtomically, upsertRows: upsertSheetRowsAtomically };
type IdFactory = (context: { seasonLabel: string; existing: SheetRow[]; offset: number }) => string;
type Filters = { seasonId?: string; teamId?: string; statusId?: string; athleteId?: string; search?: string };
type EligibilityQuery = { mode: "ATHLETE"; seasonId: string; athleteId: string } | { mode: "EQUIPE"; seasonId: string; teamId: string };

async function load(deps: Dependencies) {
  const [licences, affiliations, athletes, teams, clubs, ententes, ligues, seasons, statuses, sexes] = await Promise.all([
    deps.readRows({ block: "licences", sheet: "ATHLETE_LICENCES", range: "A:H" }),
    deps.readRows({ block: "affiliations", sheet: "ATHLETE_AFFILIATIONS", range: "A:G" }),
    deps.readRows({ block: "acteurs", sheet: "ATHLETES", range: "A:ZZ" }),
    deps.readRows({ block: "structure", sheet: "EQUIPES", range: "A:ZZ" }),
    deps.readRows({ block: "structure", sheet: "CLUBS", range: "A:ZZ" }),
    deps.readRows({ block: "structure", sheet: "ENTENTES", range: "A:ZZ" }),
    deps.readRows({ block: "structure", sheet: "LIGUES", range: "A:ZZ" }),
    deps.readRows({ block: "referentiel", sheet: "SAISON", range: "A:C" }),
    deps.readRows({ block: "referentiel", sheet: "STATUT_LICENCE", range: "A:D" }),
    deps.readRows({ block: "referentiel", sheet: "SEXES", range: "A:C" }),
  ]);
  return { licences, affiliations, athletes, teams, clubs, ententes, ligues, seasons, statuses, sexes };
}

function indexes(data: Awaited<ReturnType<typeof load>>) {
  return {
    athletes: new Map(data.athletes.map((row) => [clean(row.id_athlete), row])), teams: new Map(data.teams.map((row) => [clean(row.id_equipe), row])),
    clubs: new Map(data.clubs.map((row) => [clean(row.id_club), row])), ententes: new Map(data.ententes.map((row) => [clean(row.id_entente), row])),
    ligues: new Map(data.ligues.map((row) => [clean(row.id_ligue), row])), sexes: new Map(data.sexes.map((row) => [clean(row.id_sexe), clean(row.nom_sexe) || clean(row.id_sexe)])),
    seasons: new Map(data.seasons.map((row) => [clean(row.id_saison), clean(row.nom_saison) || clean(row.id_saison)])),
    statuses: new Map(data.statuses.map((row) => [clean(row.id_statut_licence), clean(row.nom_statut_licence) || clean(row.id_statut_licence)])),
    affiliations: new Map(data.affiliations.map((row) => [clean(row.id_affiliation_athlete), row])),
  };
}

function territory(affiliation: SheetRow, maps: ReturnType<typeof indexes>) {
  const team = maps.teams.get(clean(affiliation.id_equipe)), club = maps.clubs.get(clean(team?.id_club)), entente = maps.ententes.get(clean(club?.id_entente));
  return { team, club, entente, teamId: clean(team?.id_equipe), clubId: clean(club?.id_club), ententeId: clean(club?.id_entente), ligueId: clean(entente?.id_ligue) || clean(club?.id_ligue_historique) };
}

function allowed(scope: AccessScope, item: { ententeId: string; ligueId: string }) {
  return scope.role === "federal" || (scope.role === "ligue" ? item.ligueId === scope.ligueId : item.ententeId === scope.ententeId);
}

function activeAffiliation(row: SheetRow, onDate = new Date().toISOString().slice(0, 10)) {
  return clean(row.id_statut_affiliation) === "SAF001" && (!clean(row.date_debut) || clean(row.date_debut) <= onDate) && (!clean(row.date_fin) || clean(row.date_fin) >= onDate);
}

function view(row: SheetRow, maps: ReturnType<typeof indexes>) {
  const affiliation = maps.affiliations.get(clean(row.id_affiliation_athlete)) || {}, athlete = maps.athletes.get(clean(row.id_athlete)), place = territory(affiliation, maps);
  const sexId = clean(athlete?.id_sexe), ligue = maps.ligues.get(place.ligueId);
  return { __key: clean(row.id_licence), id: clean(row.id_licence), athleteId: clean(row.id_athlete), athleteNom: clean(athlete?.nom_complet) || clean(row.id_athlete), sexId, sexe: maps.sexes.get(sexId) || sexId, affiliationId: clean(row.id_affiliation_athlete), equipeId: place.teamId, equipeNom: clean(place.team?.nom_equipe) || place.teamId, clubId: place.clubId, clubNom: clean(place.club?.nom_club) || place.clubId, structure: clean(place.club?.nom_club) || clean(place.team?.nom_equipe) || "-", ententeId: place.ententeId, ententeNom: clean(place.entente?.nom_entente) || place.ententeId, ligueId: place.ligueId, ligueNom: clean(ligue?.nom_ligue) || place.ligueId, seasonId: clean(row.id_saison), saison: maps.seasons.get(clean(row.id_saison)) || clean(row.id_saison), numero: clean(row.numero_licence), dateDelivrance: clean(row.date_delivrance), dateFinValidite: "", statusId: clean(row.id_statut_licence), statut: maps.statuses.get(clean(row.id_statut_licence)) || clean(row.id_statut_licence), observations: clean(row.observations), observation: clean(row.observations) };
}

export async function listAthleteLicences(filters: Filters, scope: AccessScope, deps: Dependencies = defaults) {
  const data = await load(deps), maps = indexes(data), search = clean(filters.search).toLocaleLowerCase("fr");
  const licences = data.licences.map((row) => view(row, maps)).filter((item) => allowed(scope, item)).filter((item) => !filters.seasonId || item.seasonId === filters.seasonId).filter((item) => !filters.teamId || item.equipeId === filters.teamId).filter((item) => !filters.statusId || item.statusId === filters.statusId).filter((item) => !filters.athleteId || item.athleteId === filters.athleteId).filter((item) => !search || `${item.athleteNom} ${item.athleteId} ${item.numero}`.toLocaleLowerCase("fr").includes(search));
  const teams = data.teams.map((team) => { const club = maps.clubs.get(clean(team.id_club)), entente = maps.ententes.get(clean(club?.id_entente)), ligueId = clean(entente?.id_ligue) || clean(club?.id_ligue_historique); return { id: clean(team.id_equipe), label: clean(team.nom_equipe) || clean(team.id_equipe), clubId: clean(club?.id_club), clubLabel: clean(club?.nom_club), ententeId: clean(club?.id_entente), ententeLabel: clean(entente?.nom_entente), ligueId, ligueLabel: clean(maps.ligues.get(ligueId)?.nom_ligue) }; }).filter((team) => team.id && allowed(scope, team));
  const unique = [...new Map(licences.map((item) => [`${item.athleteId}:${item.seasonId}`, item])).values()];
  const summarize = (rows: typeof unique) => ({ total: rows.length, hommes: rows.filter((item) => item.sexId === "SEX001").length, femmes: rows.filter((item) => item.sexId === "SEX002").length, actives: rows.filter((item) => item.statusId === "STL001").length, nonActives: rows.filter((item) => ["STL002", "STL004"].includes(item.statusId)).length });
  const summary = summarize(unique);
  const teamSummary = teams.map((team) => ({ ...team, ...summarize(unique.filter((item) => item.equipeId === team.id)) })).filter((item) => item.total > 0);
  return { licences, summary, teamSummary, references: { seasons: [...maps.seasons].map(([id, label]) => ({ id, label })).sort((a, b) => b.label.localeCompare(a.label, "fr", { numeric: true })), statuses: [...maps.statuses].map(([id, label]) => ({ id, label })), teams, athletes: [] } };
}

export async function getAthleteLicenceEligibility(query: EligibilityQuery, scope: AccessScope, deps: Dependencies = defaults) {
  const data = await load(deps), maps = indexes(data);
  if (!maps.seasons.has(query.seasonId)) throw new LicenceError("SAISON_INTROUVABLE", "La saison sélectionnée n’existe pas.", 404, { id_saison: "Saison inconnue." });
  const candidates = data.affiliations.filter((row) => activeAffiliation(row)).filter((row) => query.mode === "ATHLETE" ? clean(row.id_athlete) === query.athleteId : clean(row.id_equipe) === query.teamId).map((affiliation) => {
    const athleteId = clean(affiliation.id_athlete), athlete = maps.athletes.get(athleteId), place = territory(affiliation, maps), existing = data.licences.find((row) => clean(row.id_athlete) === athleteId && clean(row.id_saison) === query.seasonId), previous = data.licences.filter((row) => clean(row.id_athlete) === athleteId && clean(row.numero_licence)).sort((a, b) => clean(b.date_delivrance).localeCompare(clean(a.date_delivrance)))[0];
    return { affiliationId: clean(affiliation.id_affiliation_athlete), athleteId, athleteNom: clean(athlete?.nom_complet) || athleteId, sexId: clean(athlete?.id_sexe), sexe: maps.sexes.get(clean(athlete?.id_sexe)) || clean(athlete?.id_sexe), teamId: place.teamId, teamName: clean(place.team?.nom_equipe) || place.teamId, clubName: clean(place.club?.nom_club) || place.clubId, affiliationStatusId: clean(affiliation.id_statut_affiliation), alreadyLicensed: !!existing, existingLicence: existing ? view(existing, maps) : null, previousNumber: clean(previous?.numero_licence), previousSeason: maps.seasons.get(clean(previous?.id_saison)) || clean(previous?.id_saison), situation: existing ? "Déjà renouvelée" : previous ? "Renouvelable" : "Première licence requise", ententeId: place.ententeId, ligueId: place.ligueId };
  }).filter((item) => maps.athletes.has(item.athleteId) && allowed(scope, item));
  return { candidates };
}

function commandSource(body: unknown) { return body && typeof body === "object" ? body as Record<string, unknown> : {}; }
function validateAdmin(input: Record<string, unknown>, data: Awaited<ReturnType<typeof load>>) {
  const date = clean(input.date_delivrance), status = clean(input.id_statut_licence), fields: Record<string, string> = {};
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || date.startsWith("1900-")) fields.date_delivrance = "Date de délivrance invalide.";
  if (!data.statuses.some((row) => clean(row.id_statut_licence) === status)) fields.id_statut_licence = "Statut de licence inconnu.";
  if (status === "STL099" && !clean(input.observations)) fields.observations = "Une observation est obligatoire pour le statut AUTRE.";
  if (Object.keys(fields).length) throw new LicenceError("VALIDATION", "Veuillez corriger les champs indiqués.", 400, fields);
}

export const generateLicenceId: IdFactory = ({ seasonLabel, existing, offset }) => {
  const year = seasonLabel.match(/\b(19|20)\d{2}\b/)?.[0] || String(new Date().getFullYear());
  const pattern = new RegExp(`^BKB-LIC-${year}-(\\d{6})$`);
  const highest = Math.max(0, ...existing.map((row) => clean(row.id_licence).match(pattern)).filter((match): match is RegExpMatchArray => Boolean(match)).map((match) => Number(match[1])).filter(Number.isFinite));
  return `BKB-LIC-${year}-${String(highest + offset + 1).padStart(6, "0")}`;
};

export async function renewAthleteLicences(body: unknown, deps: Dependencies = defaults, makeId: IdFactory = generateLicenceId) {
  const source = commandSource(body), input: Record<string, unknown> = { ...source, id_statut_licence: clean(source.id_statut_licence) || "STL001" }, mode = clean(input.mode), seasonId = clean(input.id_saison), data = await load(deps), maps = indexes(data);
  if (!maps.seasons.has(seasonId)) throw new LicenceError("SAISON_INTROUVABLE", "La saison sélectionnée n’existe pas.", 404, { id_saison: "Saison inconnue." });
  validateAdmin(input, data);
  const affiliationIds = mode === "ATHLETE" ? [clean(input.id_affiliation_athlete)] : Array.isArray(input.id_affiliations_athletes) ? [...new Set(input.id_affiliations_athletes.map(clean).filter(Boolean))] : [];
  if (!affiliationIds.length || !["ATHLETE", "EQUIPE"].includes(mode)) throw new LicenceError("COMMANDE_INVALIDE", "Sélectionnez au moins une affiliation admissible.", 400);
  const expectedTeamId = clean(input.id_equipe), selected: SheetRow[] = [];
  for (const id of affiliationIds) {
    const affiliation = maps.affiliations.get(id);
    if (!affiliation || !activeAffiliation(affiliation) || !maps.athletes.has(clean(affiliation.id_athlete))) throw new LicenceError("AFFILIATION_INADMISSIBLE", `L’affiliation ${id} n’est pas admissible.`, 404);
    if (mode === "EQUIPE" && clean(affiliation.id_equipe) !== expectedTeamId) throw new LicenceError("EQUIPE_INCOHERENTE", "Une affiliation sélectionnée appartient à une autre équipe.", 409);
    const athleteId = clean(affiliation.id_athlete);
    if (data.licences.some((row) => clean(row.id_athlete) === athleteId && clean(row.id_saison) === seasonId)) {
      throw new LicenceError("LICENCE_EXISTANTE", "Cet athlète possède déjà une licence pour cette saison.", 409);
    }
    selected.push(affiliation);
  }
  if (mode === "ATHLETE" && !clean(input.numero_licence)) throw new LicenceError("NUMERO_REQUIS", "Le numéro officiel est obligatoire pour une première licence.", 400, { numero_licence: "Saisissez le numéro officiel." });
  if (!selected.length) throw new LicenceError("AUCUNE_LICENCE_A_CREER", "Tous les athlètes sélectionnés possèdent déjà une licence pour cette saison.", 409);
  const seasonLabel = maps.seasons.get(seasonId)!, values = selected.map((affiliation, offset) => { const athleteId = clean(affiliation.id_athlete), previous = data.licences.filter((row) => clean(row.id_athlete) === athleteId && clean(row.numero_licence)).sort((a, b) => clean(b.date_delivrance).localeCompare(clean(a.date_delivrance)))[0]; return { id_licence: makeId({ seasonLabel, existing: data.licences, offset }), id_athlete: athleteId, id_saison: seasonId, id_affiliation_athlete: clean(affiliation.id_affiliation_athlete), numero_licence: mode === "EQUIPE" ? clean(previous?.numero_licence) : clean(input.numero_licence), date_delivrance: clean(input.date_delivrance), id_statut_licence: "STL001", observations: clean(input.observations) }; });
  if (mode === "EQUIPE" && values.some((row) => !row.numero_licence)) throw new LicenceError("PREMIERE_LICENCE_REQUISE", "Une première licence doit être enregistrée individuellement.", 409);
  await deps.appendRows({ block: "licences", rows: values.map((row) => ({ sheet: "ATHLETE_LICENCES", values: row })) });
  return values;
}

export async function updateAthleteLicence(id: string, body: unknown, deps: Dependencies = defaults) {
  const licenceId = clean(id), input = commandSource(body), data = await load(deps), maps = indexes(data), existing = data.licences.find((row) => clean(row.id_licence) === licenceId);
  if (!existing) throw new LicenceError("LICENCE_INTROUVABLE", "La licence demandée n’existe pas.", 404);
  const affiliation = maps.affiliations.get(clean(existing.id_affiliation_athlete));
  if (!affiliation || clean(affiliation.id_athlete) !== clean(existing.id_athlete)) throw new LicenceError("RELATION_INCOHERENTE", "La licence n’est plus liée à une affiliation cohérente.", 409);
  validateAdmin(input, data);
  const values = { ...existing, id_licence: licenceId, id_athlete: clean(existing.id_athlete), id_saison: clean(existing.id_saison), id_affiliation_athlete: clean(existing.id_affiliation_athlete), numero_licence: clean(input.numero_licence), date_delivrance: clean(input.date_delivrance), id_statut_licence: clean(input.id_statut_licence), observations: clean(input.observations) };
  await deps.upsertRows({ block: "licences", rows: [{ sheet: "ATHLETE_LICENCES", idHeader: "id_licence", values }] });
  return values;
}
