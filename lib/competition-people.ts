import { appendSheetRowsAtomically, readSheetRows, type SheetRow } from "@/lib/google-sheets";
import { CompetitionParticipationError } from "@/lib/competition-participants";
import { competitionEntityId } from "@/lib/competition-ids";
import { requireMutableEdition } from "@/lib/competition-lifecycle";

const clean = (value: unknown) => String(value ?? "").trim();
const nameOf = (row?: SheetRow) => row ? clean(row.nom_complet) || [clean(row.prenom), clean(row.nom)].filter(Boolean).join(" ") : "";
const activeActor = (row: SheetRow) => clean(row.statut).toUpperCase() !== "INACTIF";
const activeAffiliation = (row: SheetRow, now: string) => {
  const start = clean(row.date_debut), end = clean(row.date_fin), status = clean(row.id_statut_affiliation).toUpperCase();
  return (!status || status === "SAF001" || status === "ACTIF") && (!start || start <= now) && (!end || end >= now);
};

type Dependencies = { readRows: typeof readSheetRows; appendRows: typeof appendSheetRowsAtomically };
const defaults: Dependencies = { readRows: readSheetRows, appendRows: appendSheetRowsAtomically };
export type ParticipantCategory = "athletes" | "arbitres" | "officiels" | "medecins" | "autres";
type StoredType = "ATHLETE" | "ARBITRE" | "OFFICIEL" | "MEDECIN" | "AUTRE";
export type CompetitionPerson = { id: string; nom: string; role: string; club: string; equipe: string; detail: string };
export type CompetitionCandidate = CompetitionPerson & { teamId?: string; clubId?: string };

const categoryType: Record<ParticipantCategory, StoredType> = { athletes: "ATHLETE", arbitres: "ARBITRE", officiels: "OFFICIEL", medecins: "MEDECIN", autres: "AUTRE" };
const typeCategory = Object.fromEntries(Object.entries(categoryType).map(([category, type]) => [type, category])) as Record<StoredType, ParticipantCategory>;

async function load(deps: Dependencies) {
  const comp = (sheet: string) => deps.readRows({ block: "competitions", sheet, range: "A:ZZ", fresh: true });
  const actors = (sheet: string) => deps.readRows({ block: "acteurs", sheet, range: "A:ZZ" });
  const affiliations = (sheet: string) => deps.readRows({ block: "affiliations", sheet, range: "A:ZZ" });
  const refs = (sheet: string) => deps.readRows({ block: "referentiel", sheet, range: "A:ZZ" });
  const structure = (sheet: string) => deps.readRows({ block: "structure", sheet, range: "A:ZZ" });
  const [competitions, participations, units, intervenants, teams, clubs, athleteRows, refereeRows, officialRows, doctorRows, otherRows, athleteAffiliations, functions, actorTypes, grades, specialties, otherTypes] = await Promise.all([
    comp("COMPETITIONS"), comp("COMPETITIONS_PARTICIPANTS"), comp("COMPETITIONS_UNITES"), comp("COMPETITIONS_INTERVENANTS"), structure("EQUIPES"), structure("CLUBS"),
    actors("ATHLETES"), actors("ARBITRES"), actors("OFFICIELS"), actors("MEDECINS"), actors("AUTRES"), affiliations("ATHLETE_AFFILIATIONS"),
    refs("FONCTIONS"), refs("TYPES_ACTEURS"), refs("GRADES_ARBITRES"), refs("SPECIALITES_MEDECINS"), refs("TYPES_AUTRES_ACTEURS"),
  ]);
  return { competitions, participations, units, intervenants, teams, clubs, athleteRows, refereeRows, officialRows, doctorRows, otherRows, athleteAffiliations, functions, actorTypes, grades, specialties, otherTypes };
}

function resolve(competitionId: string, data: Awaited<ReturnType<typeof load>>, now: string) {
  if (!data.competitions.some((row) => clean(row.id_competition) === competitionId)) throw new CompetitionParticipationError("COMPETITION_INTROUVABLE", "La compétition n’existe pas.", 404);
  const participationRows = data.participations.filter((row) => clean(row.id_competition) === competitionId), teamIds = new Set(participationRows.map((row) => clean(row.id_equipe)));
  const teamMap = new Map(data.teams.map((row) => [clean(row.id_equipe), row])), clubMap = new Map(data.clubs.map((row) => [clean(row.id_club), clean(row.nom_club) || clean(row.id_club)]));
  const teamName = (id: string) => clean(teamMap.get(id)?.nom_equipe) || id || "-", clubIdFor = (teamId: string) => clean(teamMap.get(teamId)?.id_club), clubName = (teamId: string) => clubMap.get(clubIdFor(teamId)) || clubIdFor(teamId) || "-";
  const actorMaps = {
    athletes: new Map(data.athleteRows.map((row) => [clean(row.id_athlete), row])), arbitres: new Map(data.refereeRows.map((row) => [clean(row.id_arbitre), row])),
    officiels: new Map(data.officialRows.map((row) => [clean(row.id_officiel), row])), medecins: new Map(data.doctorRows.map((row) => [clean(row.id_medecin), row])), autres: new Map(data.otherRows.map((row) => [clean(row.id_autre_acteur), row])),
  };
  const gradeMap = new Map(data.grades.map((row) => [clean(row.id_grade_arbitre), clean(row.nom_grade_arbitre)])), specialtyMap = new Map(data.specialties.map((row) => [clean(row.id_specialite), clean(row.nom_specialite)])), typeMap = new Map(data.otherTypes.map((row) => [clean(row.id_type_autre_acteur), clean(row.nom_type_autre_acteur)]));
  const baseRole = (category: ParticipantCategory, actor?: SheetRow) => category === "athletes" ? "Athlète" : category === "arbitres" ? gradeMap.get(clean(actor?.id_grade_arbitre)) || "Arbitre" : category === "officiels" ? "Officiel" : category === "medecins" ? "Médecin" : typeMap.get(clean(actor?.id_type_autre_acteur)) || clean(actor?.type_autre_acteur) || "Autre acteur";
  const baseDetail = (category: ParticipantCategory, actor?: SheetRow) => category === "medecins" ? specialtyMap.get(clean(actor?.id_specialite)) || clean(actor?.id_specialite) || "-" : category === "arbitres" ? gradeMap.get(clean(actor?.id_grade_arbitre)) || "-" : category === "autres" ? clean(actor?.entite) || "-" : "-";
  const enrolled = data.intervenants.filter((row) => clean(row.id_competition) === competitionId && clean(row.statut).toUpperCase() !== "INACTIF");
  const result: Record<ParticipantCategory, CompetitionPerson[]> = { athletes: [], arbitres: [], officiels: [], medecins: [], autres: [] };
  for (const row of enrolled) {
    const storedType = clean(row.type_participant).toUpperCase() as StoredType, category = typeCategory[storedType]; if (!category) continue;
    const id = clean(row.id_acteur), actor = actorMaps[category].get(id), teamId = clean(row.id_equipe);
    result[category].push({ id, nom: nameOf(actor) || "Acteur introuvable", role: clean(row.role_participant) || baseRole(category, actor), club: clubMap.get(clean(row.id_club)) || (teamId ? clubName(teamId) : "-"), equipe: teamId ? teamName(teamId) : "-", detail: baseDetail(category, actor) });
  }
  const enrolledKeys = new Set(enrolled.map((row) => `${clean(row.type_participant).toUpperCase()}\u0000${clean(row.id_acteur)}`));
  const candidates: Record<ParticipantCategory, CompetitionCandidate[]> = { athletes: [], arbitres: [], officiels: [], medecins: [], autres: [] };
  const seenAthletes = new Set(result.athletes.map((person) => person.id));
  for (const affiliation of data.athleteAffiliations.filter((row) => teamIds.has(clean(row.id_equipe)) && activeAffiliation(row, now))) {
    const id = clean(affiliation.id_athlete), actor = actorMaps.athletes.get(id), teamId = clean(affiliation.id_equipe); if (!id || !actor || !activeActor(actor) || seenAthletes.has(id)) continue;
    candidates.athletes.push({ id, nom: nameOf(actor), role: "Athlète", club: clubName(teamId), equipe: teamName(teamId), detail: "Affiliation active", teamId, clubId: clubIdFor(teamId) }); seenAthletes.add(id);
  }
  const actorRows: Record<Exclude<ParticipantCategory, "athletes">, SheetRow[]> = { arbitres: data.refereeRows, officiels: data.officialRows, medecins: data.doctorRows, autres: data.otherRows };
  for (const category of ["arbitres", "officiels", "medecins", "autres"] as const) for (const actor of actorRows[category]) {
    const idField = category === "arbitres" ? "id_arbitre" : category === "officiels" ? "id_officiel" : category === "medecins" ? "id_medecin" : "id_autre_acteur", id = clean(actor[idField]);
    if (!id || !activeActor(actor) || enrolledKeys.has(`${categoryType[category]}\u0000${id}`)) continue;
    candidates[category].push({ id, nom: nameOf(actor) || id, role: baseRole(category, actor), club: "-", equipe: "-", detail: baseDetail(category, actor) });
  }
  return { ...result, available: candidates };
}

export async function getCompetitionPeople(competitionId: string, deps: Dependencies = defaults, now = new Date().toISOString().slice(0, 10)) { return resolve(competitionId, await load(deps), now); }

export async function addCompetitionPerson(competitionId: string, body: unknown, deps: Dependencies = defaults, now = new Date().toISOString().slice(0, 10)) {
  const input = body && typeof body === "object" ? body as Record<string, unknown> : {}, category = clean(input.category) as ParticipantCategory, actorId = clean(input.actorId), roleInput = clean(input.role);
  const fields: Record<string, string> = {}; if (!Object.hasOwn(categoryType, category)) fields.category = "Catégorie invalide."; if (!actorId) fields.actorId = "Sélectionnez une personne."; if (category === "officiels" && !roleInput) fields.role = "Le rôle de l’officiel est obligatoire.";
  if (Object.keys(fields).length) throw new CompetitionParticipationError("VALIDATION", "Veuillez corriger les champs indiqués.", 422, fields);
  const data = await load(deps); requireMutableEdition(data.competitions, competitionId); const view = resolve(competitionId, data, now), candidate = view.available[category].find((item) => item.id === actorId);
  if (!candidate) throw new CompetitionParticipationError("PARTICIPANT_INVALIDE", "Cette personne n’est pas disponible pour cette compétition.", 422, { actorId: "Personne indisponible ou déjà ajoutée." });
  const id = competitionEntityId("intervenant", competitionId, data.intervenants, "id_intervenant_competition"), type = categoryType[category];
  const actorTypeId = clean(data.actorTypes.find((row) => clean(row.nom_type_acteur).toUpperCase() === type)?.id_type_acteur);
  const functionRow = category === "officiels" ? data.functions.find((row) => clean(row.nom_fonction).localeCompare(roleInput,"fr",{sensitivity:"base"})===0) : undefined;
  const unitId = candidate.teamId ? clean(data.units.find((row) => clean(row.id_competition)===competitionId && clean(row.id_equipe)===candidate.teamId)?.id_unite_competition) : "";
  await deps.appendRows({ block: "competitions", rows: [{ sheet: "COMPETITIONS_INTERVENANTS", values: { id_intervenant_competition: id, id_competition: competitionId, type_participant: type, id_acteur: actorId, id_type_acteur: actorTypeId, id_unite_competition: unitId, id_fonction: clean(functionRow?.id_fonction), id_equipe: candidate.teamId || "", id_club: candidate.clubId || "", role_participant: category === "officiels" ? roleInput : candidate.role, statut: "ACTIF", observations: clean(input.observations) } }] });
  return { id };
}
