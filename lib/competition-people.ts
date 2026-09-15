import { appendSheetRowsAtomically, readSheetRows, type SheetRow } from "@/lib/google-sheets";
import { CompetitionParticipationError } from "@/lib/competition-participants";
import { competitionEntityId } from "@/lib/competition-ids";
import { requireMutableEdition } from "@/lib/competition-lifecycle";
import { buildCompetitionLicenseIndexes, calculateCompetitionParticipationValidity, type ParticipationValidity } from "@/lib/competition-participation-validity";

const clean = (value: unknown) => String(value ?? "").trim();
const nameOf = (row?: SheetRow) => row ? clean(row.nom_complet) || [clean(row.prenom), clean(row.nom)].filter(Boolean).join(" ") : "";
const activeActor = (row: SheetRow) => clean(row.statut).toUpperCase() !== "INACTIF";
const activeAffiliation = (row: SheetRow, now: string) => { const start = clean(row.date_debut), end = clean(row.date_fin), status = clean(row.id_statut_affiliation).toUpperCase(); return (!status || status === "SAF001" || status === "ACTIF") && (!start || start <= now) && (!end || end >= now); };
type Dependencies = { readRows: typeof readSheetRows; appendRows: typeof appendSheetRowsAtomically };
const defaults: Dependencies = { readRows: readSheetRows, appendRows: appendSheetRowsAtomically };
export type ParticipantCategory = "athletes" | "arbitres" | "officiels" | "medecins" | "autres";
type StoredType = "ATHLETE" | "ARBITRE" | "OFFICIEL" | "MEDECIN" | "AUTRE";
export type CompetitionPerson = { id: string; nom: string; role: string; club: string; equipe: string; detail: string; actorTypeId: string; grade: string; numeroLicence: string | null; idLicenceSource: string | null; statutParticipation: ParticipationValidity; raisonStatutParticipation: string; dateDebutValidite: string | null; dateFinValidite: string | null; qualiteDonnees: string | null };
export type CompetitionCandidate = CompetitionPerson & { teamId?: string; clubId?: string; unitId?: string; selectionId: string };
const categoryType: Record<ParticipantCategory, StoredType> = { athletes: "ATHLETE", arbitres: "ARBITRE", officiels: "OFFICIEL", medecins: "MEDECIN", autres: "AUTRE" };
const typeCategory = Object.fromEntries(Object.entries(categoryType).map(([category, type]) => [type, category])) as Record<StoredType, ParticipantCategory>;
const actorTypeByCategory: Record<ParticipantCategory, string> = { athletes: "TAC001", officiels: "TAC003", arbitres: "TAC004", medecins: "TAC005", autres: "TAC099" };
const categoryByActorType = Object.fromEntries(Object.entries(actorTypeByCategory).map(([category, type]) => [type, category])) as Record<string, ParticipantCategory>;

async function load(deps: Dependencies) {
  const read = (block: "competitions" | "structure" | "acteurs" | "affiliations" | "referentiel" | "licences", sheet: string) => deps.readRows({ block, sheet, range: "A:ZZ" });
  const [competitions, participations, units, intervenants, teams, clubs, athleteRows, refereeRows, officialRows, doctorRows, otherRows, athleteAffiliations, athleteLicenses, actorLicenses, grades, specialties, otherTypes] = await Promise.all([
    read("competitions", "COMPETITIONS"), read("competitions", "COMPETITIONS_PARTICIPANTS"), read("competitions", "COMPETITIONS_UNITES"), read("competitions", "COMPETITIONS_INTERVENANTS"), read("structure", "EQUIPES"), read("structure", "CLUBS"),
    read("acteurs", "ATHLETES"), read("acteurs", "ARBITRES"), read("acteurs", "OFFICIELS"), read("acteurs", "MEDECINS"), read("acteurs", "AUTRES"), read("affiliations", "ATHLETE_AFFILIATIONS"),
    read("licences", "ATHLETE_LICENCES"), read("licences", "ACTEURS_LICENCES"), read("referentiel", "GRADES_ARBITRES"), read("referentiel", "SPECIALITES_MEDECINS"), read("referentiel", "TYPES_AUTRES_ACTEURS"),
  ]);
  return { competitions, participations, units, intervenants, teams, clubs, athleteRows, refereeRows, officialRows, doctorRows, otherRows, athleteAffiliations, athleteLicenses, actorLicenses, grades, specialties, otherTypes };
}

function resolve(competitionId: string, data: Awaited<ReturnType<typeof load>>, now: string) {
  const competition = data.competitions.find((row) => clean(row.id_competition) === competitionId);
  if (!competition) throw new CompetitionParticipationError("COMPETITION_INTROUVABLE", "La compétition n’existe pas.", 404);
  const participationRows = data.participations.filter((row) => clean(row.id_competition) === competitionId), teamIds = new Set(participationRows.map((row) => clean(row.id_equipe)));
  const teamMap = new Map(data.teams.map((row) => [clean(row.id_equipe), row])), clubMap = new Map(data.clubs.map((row) => [clean(row.id_club), clean(row.nom_club) || clean(row.id_club)]));
  const teamName = (id: string) => clean(teamMap.get(id)?.nom_equipe) || id || "-", clubIdFor = (teamId: string) => clean(teamMap.get(teamId)?.id_club), clubName = (teamId: string) => clubMap.get(clubIdFor(teamId)) || clubIdFor(teamId) || "-";
  const actorMaps = { athletes: new Map(data.athleteRows.map((row) => [clean(row.id_athlete), row])), arbitres: new Map(data.refereeRows.map((row) => [clean(row.id_arbitre), row])), officiels: new Map(data.officialRows.map((row) => [clean(row.id_officiel), row])), medecins: new Map(data.doctorRows.map((row) => [clean(row.id_medecin), row])), autres: new Map(data.otherRows.map((row) => [clean(row.id_autre_acteur), row])) };
  const licenseIndexes = buildCompetitionLicenseIndexes(data.athleteLicenses, data.actorLicenses);
  const gradeMap = new Map(data.grades.map((row) => [clean(row.id_grade_arbitre), clean(row.nom_grade_arbitre)])), specialtyMap = new Map(data.specialties.map((row) => [clean(row.id_specialite), clean(row.nom_specialite)])), typeMap = new Map(data.otherTypes.map((row) => [clean(row.id_type_autre_acteur), clean(row.nom_type_autre_acteur)]));
  const baseDetail = (category: ParticipantCategory, actor?: SheetRow) => category === "medecins" ? specialtyMap.get(clean(actor?.id_specialite)) || clean(actor?.id_specialite) || "-" : category === "autres" ? typeMap.get(clean(actor?.id_type_autre_acteur)) || clean(actor?.type_autre_acteur) || "-" : "-";
  const validity = (typeId: string, actorId: string) => calculateCompetitionParticipationValidity({
    competition,
    intervenant: { id_type_acteur: typeId, id_acteur: actorId },
    athleteLicenses: typeId === "TAC001" ? licenseIndexes.athletes.get(`${actorId}::${clean(competition.id_saison)}`) ?? [] : [],
    actorLicenses: licenseIndexes.actors.get(`${typeId}::${actorId}`) ?? [],
  });
  const enrolled = data.intervenants.filter((row) => clean(row.id_competition) === competitionId && clean(row.statut).toUpperCase() !== "INACTIF");
  const result: Record<ParticipantCategory, CompetitionPerson[]> = { athletes: [], arbitres: [], officiels: [], medecins: [], autres: [] };
  for (const row of enrolled) {
    const storedType = clean(row.type_participant).toUpperCase() as StoredType, storedActorType = clean(row.id_type_acteur), category = categoryByActorType[storedActorType] || typeCategory[storedType]; if (!category) continue;
    const actorTypeId = storedActorType || actorTypeByCategory[category], id = clean(row.id_acteur), actor = actorMaps[category].get(id), teamId = clean(row.id_equipe), calculated = validity(actorTypeId, id);
    if (calculated.qualiteDonnees === "PLUSIEURS_LICENCES_CONCURRENTES") console.warn(JSON.stringify({ event: "competition_participation_data_quality", competitionId, actorTypeId, issue: calculated.qualiteDonnees }));
    result[category].push({ id, nom: nameOf(actor) || "Acteur introuvable", role: category === "autres" ? clean(row.role_participant) : "", club: clubMap.get(clean(row.id_club)) || (teamId ? clubName(teamId) : "-"), equipe: teamId ? teamName(teamId) : "-", detail: baseDetail(category, actor), actorTypeId, grade: category === "arbitres" ? gradeMap.get(clean(actor?.id_grade_arbitre)) || "Grade non renseigné" : "", ...calculated });
  }
  const enrolledKeys = new Set(enrolled.map((row) => `${clean(row.id_type_acteur) || actorTypeByCategory[typeCategory[clean(row.type_participant).toUpperCase() as StoredType]]}\u0000${clean(row.id_acteur)}\u0000${clean(row.id_unite_competition)}`));
  const candidates: Record<ParticipantCategory, CompetitionCandidate[]> = { athletes: [], arbitres: [], officiels: [], medecins: [], autres: [] };
  const seenAthletes = new Set<string>();
  for (const affiliation of data.athleteAffiliations.filter((row) => teamIds.has(clean(row.id_equipe)) && activeAffiliation(row, now))) {
    const id = clean(affiliation.id_athlete), actor = actorMaps.athletes.get(id), teamId = clean(affiliation.id_equipe), actorTypeId = actorTypeByCategory.athletes, unitId = clean(data.units.find((row) => clean(row.id_competition) === competitionId && clean(row.id_equipe) === teamId)?.id_unite_competition), selectionId = `${id}::${unitId || teamId}`; if (!id || !actor || !activeActor(actor) || seenAthletes.has(selectionId) || enrolledKeys.has(`${actorTypeId}\u0000${id}\u0000${unitId}`)) continue;
    candidates.athletes.push({ id, nom: nameOf(actor), role: "", club: clubName(teamId), equipe: teamName(teamId), detail: "Affiliation active", teamId, clubId: clubIdFor(teamId), unitId, selectionId, actorTypeId, grade: "", ...validity(actorTypeId, id) }); seenAthletes.add(selectionId);
  }
  const actorRows: Record<Exclude<ParticipantCategory, "athletes">, SheetRow[]> = { arbitres: data.refereeRows, officiels: data.officialRows, medecins: data.doctorRows, autres: data.otherRows };
  for (const category of ["arbitres", "officiels", "medecins", "autres"] as const) for (const actor of actorRows[category]) {
    const idField = category === "arbitres" ? "id_arbitre" : category === "officiels" ? "id_officiel" : category === "medecins" ? "id_medecin" : "id_autre_acteur", id = clean(actor[idField]), actorTypeId = actorTypeByCategory[category];
    if (!id || !activeActor(actor) || enrolledKeys.has(`${actorTypeId}\u0000${id}\u0000`)) continue;
    candidates[category].push({ id, selectionId: id, nom: nameOf(actor) || id, role: "", club: "-", equipe: "-", detail: baseDetail(category, actor), actorTypeId, grade: category === "arbitres" ? gradeMap.get(clean(actor.id_grade_arbitre)) || "Grade non renseigné" : "", ...validity(actorTypeId, id) });
  }
  return { ...result, available: candidates };
}

export async function getCompetitionPeople(competitionId: string, deps: Dependencies = defaults, now = new Date().toISOString().slice(0, 10)) { return resolve(competitionId, await load(deps), now); }
export async function addCompetitionPerson(competitionId: string, body: unknown, deps: Dependencies = defaults, now = new Date().toISOString().slice(0, 10)) {
  const input = body && typeof body === "object" ? body as Record<string, unknown> : {}, category = clean(input.category) as ParticipantCategory, actorId = clean(input.actorId), requestedUnitId = clean(input.unitId), roleInput = clean(input.role);
  const fields: Record<string, string> = {}; if (!Object.hasOwn(categoryType, category)) fields.category = "Catégorie invalide."; if (!actorId) fields.actorId = "Sélectionnez une personne."; if (category === "autres" && !roleInput) fields.role = "Le rôle dans la compétition est obligatoire.";
  if (Object.keys(fields).length) throw new CompetitionParticipationError("VALIDATION", "Veuillez corriger les champs indiqués.", 422, fields);
  const data = await load(deps); requireMutableEdition(data.competitions, competitionId); const view = resolve(competitionId, data, now), candidate = view.available[category].find((item) => item.id === actorId && (!requestedUnitId || item.unitId === requestedUnitId));
  if (!candidate) throw new CompetitionParticipationError("PARTICIPANT_INVALIDE", "Cette personne n’est pas disponible pour cette compétition.", 422, { actorId: "Personne indisponible ou déjà ajoutée." });
  const id = competitionEntityId("intervenant", competitionId, data.intervenants, "id_intervenant_competition"), type = categoryType[category], actorTypeId = actorTypeByCategory[category];
  const unitId = candidate.unitId || (candidate.teamId ? clean(data.units.find((row) => clean(row.id_competition) === competitionId && clean(row.id_equipe) === candidate.teamId)?.id_unite_competition) : "");
  await deps.appendRows({ block: "competitions", rows: [{ sheet: "COMPETITIONS_INTERVENANTS", values: { id_intervenant_competition: id, id_competition: competitionId, type_participant: type, id_acteur: actorId, id_type_acteur: actorTypeId, id_unite_competition: unitId, id_fonction: "", id_equipe: candidate.teamId || "", id_club: candidate.clubId || "", role_participant: category === "autres" ? roleInput.replace(/\s+/g, " ") : "", statut: "ACTIF", observations: clean(input.observations) } }] });
  return { id };
}
