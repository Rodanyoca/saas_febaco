import { appendSheetRowsAtomically, readSheetRows, upsertSheetRowsAtomically, type SheetRow } from "@/lib/google-sheets";
import { CompetitionParticipationError } from "@/lib/competition-participants";
import { competitionEntityId } from "@/lib/competition-ids";
import { requireMutableEdition } from "@/lib/competition-lifecycle";

const clean = (value: unknown) => String(value ?? "").trim();
const upper = (value: unknown) => clean(value).toUpperCase();
const actorName = (row?: SheetRow) => row ? clean(row.nom_complet) || [clean(row.prenom), clean(row.nom)].filter(Boolean).join(" ") : "";
type Dependencies = { readRows: typeof readSheetRows; appendRows: typeof appendSheetRowsAtomically; upsertRows: typeof upsertSheetRowsAtomically };
const defaults: Dependencies = { readRows: readSheetRows, appendRows: appendSheetRowsAtomically, upsertRows: upsertSheetRowsAtomically };

async function load(deps: Dependencies) {
  const c = (sheet: string) => deps.readRows({ block: "competitions", sheet, range: "A:ZZ" });
  const r = (sheet: string) => deps.readRows({ block: "referentiel", sheet, range: "A:ZZ" });
  const a = (sheet: string) => deps.readRows({ block: "acteurs", sheet, range: "A:ZZ" });
  const s = (sheet: string) => deps.readRows({ block: "structure", sheet, range: "A:ZZ" });
  const [competitions, distinctions, events, units, phases, matches, intervenants, types, actorTypes, teams, athletes, coaches, referees, officials, doctors, others] = await Promise.all([
    c("COMPETITIONS"), c("COMPETITIONS_DISTINCTIONS"), c("COMPETITIONS_EPREUVES"), c("COMPETITIONS_UNITES"), c("COMPETITIONS_PHASES"), c("COMPETITIONS_MATCHS"), c("COMPETITIONS_INTERVENANTS"),
    r("TYPES_DISTINCTIONS"), r("TYPES_ACTEURS"), s("EQUIPES"), a("ATHLETES"), a("COACHS"), a("ARBITRES"), a("OFFICIELS"), a("MEDECINS"), a("AUTRES"),
  ]);
  return { competitions, distinctions, events, units, phases, matches, intervenants, types, actorTypes, teams, athletes, coaches, referees, officials, doctors, others };
}

function actorMaps(data: Awaited<ReturnType<typeof load>>) {
  const typeNames = new Map(data.actorTypes.map(row => [clean(row.id_type_acteur), upper(row.nom_type_acteur)]));
  const configs = [
    { type: "TAC001", label: "Athlète", rows: data.athletes, key: "id_athlete" }, { type: "TAC002", label: "Coach", rows: data.coaches, key: "id_coach" },
    { type: "TAC003", label: "Arbitre", rows: data.referees, key: "id_arbitre" }, { type: "TAC004", label: "Officiel", rows: data.officials, key: "id_officiel" },
    { type: "TAC005", label: "Médecin", rows: data.doctors, key: "id_medecin" }, { type: "TAC006", label: "Autre", rows: data.others, key: "id_autre_acteur" },
  ];
  const maps = new Map(configs.map(config => [config.type, new Map(config.rows.map(row => [clean(row[config.key]), row]))]));
  const labels = new Map(configs.map(config => [config.type, config.label]));
  for (const [id, name] of typeNames) if (!labels.has(id)) labels.set(id, name ? name.charAt(0) + name.slice(1).toLowerCase() : id);
  return { maps, labels };
}

function resolve(competitionId: string, data: Awaited<ReturnType<typeof load>>) {
  if (!data.competitions.some(row => clean(row.id_competition) === competitionId)) throw new CompetitionParticipationError("COMPETITION_INTROUVABLE", "La compétition n’existe pas.", 404);
  const events = data.events.filter(row => clean(row.id_competition) === competitionId);
  const eventIds = new Set(events.map(row => clean(row.id_epreuve_competition)));
  const units = data.units.filter(row => clean(row.id_competition) === competitionId && upper(row.statut) !== "INACTIF");
  const phases = data.phases.filter(row => clean(row.id_competition) === competitionId && eventIds.has(clean(row.id_epreuve_competition)));
  const matches = data.matches.filter(row => clean(row.id_competition) === competitionId);
  const teamNames = new Map(data.teams.map(row => [clean(row.id_equipe), clean(row.nom_equipe)]));
  const unitNames = new Map(units.map(row => [clean(row.id_unite_competition), teamNames.get(clean(row.id_equipe)) || clean(row.id_unite_competition)]));
  const eventNames = new Map(events.map(row => [clean(row.id_epreuve_competition), clean(row.nom_epreuve) || clean(row.nom) || clean(row.id_epreuve_competition)]));
  const phaseNames = new Map(phases.map(row => [clean(row.id_phase_competition), clean(row.nom_phase) || clean(row.id_phase_competition)]));
  const typeMap = new Map(data.types.map(row => [clean(row.id_type_distinction), row]));
  const { maps, labels } = actorMaps(data);
  const enrolled = data.intervenants.filter(row => clean(row.id_competition) === competitionId && upper(row.statut) !== "INACTIF");
  const actorOptions = enrolled.map(row => { const typeId = clean(row.id_type_acteur), id = clean(row.id_acteur), unitId = clean(row.id_unite_competition), unit = units.find(item => clean(item.id_unite_competition) === unitId); return { id, typeId, type: labels.get(typeId) || typeId || "Acteur", nom: actorName(maps.get(typeId)?.get(id)) || "Acteur non référencé", eventId: clean(unit?.id_epreuve_competition), unitId }; }).filter((item, index, rows) => item.id && rows.findIndex(other => other.id === item.id && other.typeId === item.typeId) === index);
  const matchNames = new Map(matches.map(row => [clean(row.id_match), `${unitNames.get(clean(row.id_unite_a)) || clean(row.id_unite_a)} – ${unitNames.get(clean(row.id_unite_b)) || clean(row.id_unite_b)}`]));
  const distinctions = data.distinctions.filter(row => clean(row.id_competition) === competitionId).map(row => {
    const typeId = clean(row.id_type_distinction), actorId = clean(row.id_acteur), actorTypeId = clean(row.id_type_acteur), unitId = clean(row.id_unite_competition), type = typeMap.get(typeId);
    return { id: clean(row.id_distinction_competition), eventId: clean(row.id_epreuve_competition), event: eventNames.get(clean(row.id_epreuve_competition)) || clean(row.id_epreuve_competition), typeId, type: clean(type?.nom_type_distinction) || "Distinction non référencée", target: clean(type?.cible_autorisee), unitId, actorId, actorTypeId, beneficiary: unitId ? unitNames.get(unitId) || unitId : actorName(maps.get(actorTypeId)?.get(actorId)) || actorId || "Acteur non référencé", beneficiaryType: unitId ? "Équipe" : labels.get(actorTypeId) || actorTypeId || "Acteur", phaseId: clean(row.id_phase_competition), phase: phaseNames.get(clean(row.id_phase_competition)) || clean(row.id_phase_competition), matchId: clean(row.id_match), match: matchNames.get(clean(row.id_match)) || clean(row.id_match), date: clean(row.date_attribution), statut: upper(row.statut) || "ACTIF", observations: clean(row.observations) };
  });
  return { distinctions, events: events.map(row => ({ id: clean(row.id_epreuve_competition), nom: eventNames.get(clean(row.id_epreuve_competition)) || "-" })), types: data.types.map(row => ({ id: clean(row.id_type_distinction), nom: clean(row.nom_type_distinction), target: clean(row.cible_autorisee) })), units: units.map(row => ({ id: clean(row.id_unite_competition), eventId: clean(row.id_epreuve_competition), nom: unitNames.get(clean(row.id_unite_competition)) || "-" })), actors: actorOptions, phases: phases.map(row => ({ id: clean(row.id_phase_competition), eventId: clean(row.id_epreuve_competition), nom: phaseNames.get(clean(row.id_phase_competition)) || "-" })), matches: matches.map(row => ({ id: clean(row.id_match), phaseId: clean(row.id_phase_competition), eventId: clean(row.id_epreuve_competition) || clean(phases.find(p => clean(p.id_phase_competition) === clean(row.id_phase_competition))?.id_epreuve_competition), nom: matchNames.get(clean(row.id_match)) || clean(row.id_match) })) };
}

type Command = { eventId: string; typeId: string; unitId: string; actorId: string; actorTypeId: string; phaseId: string; matchId: string; date: string; statut: string; observations: string };
function command(input: Record<string, unknown>, previous?: SheetRow): Command { const take = (key: string, column: string) => Object.hasOwn(input, key) ? clean(input[key]) : clean(previous?.[column]); return { eventId: take("eventId", "id_epreuve_competition"), typeId: take("typeId", "id_type_distinction"), unitId: take("unitId", "id_unite_competition"), actorId: take("actorId", "id_acteur"), actorTypeId: take("actorTypeId", "id_type_acteur"), phaseId: take("phaseId", "id_phase_competition"), matchId: take("matchId", "id_match"), date: take("date", "date_attribution"), statut: upper(take("statut", "statut")), observations: take("observations", "observations") }; }

function validate(competitionId: string, value: Command, data: Awaited<ReturnType<typeof load>>, editingId = "") {
  const fields: Record<string, string> = {}, event = data.events.find(row => clean(row.id_epreuve_competition) === value.eventId && clean(row.id_competition) === competitionId), type = data.types.find(row => clean(row.id_type_distinction) === value.typeId), target = upper(type?.cible_autorisee);
  if (!event) fields.eventId = "Épreuve indisponible."; if (!type) fields.typeId = "Type de distinction indisponible."; if (!/^\d{4}-\d{2}-\d{2}$/.test(value.date)) fields.date = "Date invalide."; if (!["ACTIF", "INACTIF"].includes(value.statut)) fields.statut = "Statut invalide.";
  if (!!value.unitId === !!value.actorId) fields.beneficiary = "Choisissez exactement une équipe ou une personne.";
  if (target === "UNITE_COMPETITION" && !value.unitId) fields.unitId = "Une équipe est obligatoire.";
  if (["ATHLETE", "COACH"].includes(target) && (!value.actorId || !value.actorTypeId)) fields.actorId = "Une personne est obligatoire.";
  if (value.unitId && !data.units.some(row => clean(row.id_unite_competition) === value.unitId && clean(row.id_competition) === competitionId && clean(row.id_epreuve_competition) === value.eventId && upper(row.statut) !== "INACTIF")) fields.unitId = "Cette équipe n’appartient pas à l’épreuve.";
  const enrollment = data.intervenants.find(row => clean(row.id_competition) === competitionId && clean(row.id_acteur) === value.actorId && clean(row.id_type_acteur) === value.actorTypeId && upper(row.statut) !== "INACTIF");
  if (value.actorId && !enrollment) fields.actorId = "Cette personne n’est pas inscrite activement dans la compétition.";
  if (target === "ATHLETE" && value.actorTypeId !== "TAC001") fields.actorTypeId = "La distinction exige un athlète."; if (target === "COACH" && value.actorTypeId !== "TAC002") fields.actorTypeId = "La distinction exige un coach.";
  if (value.actorId && enrollment) { const linkedUnit = data.units.find(row => clean(row.id_unite_competition) === clean(enrollment.id_unite_competition)); if (linkedUnit && clean(linkedUnit.id_epreuve_competition) !== value.eventId) fields.actorId = "Cette personne est rattachée à une autre épreuve."; }
  const phase = value.phaseId ? data.phases.find(row => clean(row.id_phase_competition) === value.phaseId && clean(row.id_competition) === competitionId && clean(row.id_epreuve_competition) === value.eventId) : undefined; if (value.phaseId && !phase) fields.phaseId = "Cette phase n’appartient pas à l’épreuve.";
  const match = value.matchId ? data.matches.find(row => clean(row.id_match) === value.matchId && clean(row.id_competition) === competitionId && clean(row.id_phase_competition) === value.phaseId) : undefined; if (value.matchId && !match) fields.matchId = "Ce match n’appartient pas à la phase.";
  if (match) { const matchUnits = [clean(match.id_unite_a), clean(match.id_unite_b)].map(id => data.units.find(row => clean(row.id_unite_competition) === id)); if (matchUnits.some(unit => !unit || clean(unit.id_epreuve_competition) !== value.eventId)) fields.matchId = "Les équipes du match n’appartiennent pas à l’épreuve."; }
  if (value.typeId === "DST099" && !value.observations) fields.observations = "Précisez cette distinction.";
  const duplicate = data.distinctions.some(row => clean(row.id_distinction_competition) !== editingId && clean(row.id_competition) === competitionId && upper(row.statut) === "ACTIF" && value.statut === "ACTIF" && clean(row.id_epreuve_competition) === value.eventId && clean(row.id_type_distinction) === value.typeId && clean(row.id_unite_competition) === value.unitId && clean(row.id_acteur) === value.actorId && clean(row.id_type_acteur) === value.actorTypeId && clean(row.id_phase_competition) === value.phaseId && clean(row.id_match) === value.matchId);
  if (duplicate) throw new CompetitionParticipationError("DISTINCTION_DUPLIQUEE", "Cette distinction active existe déjà.", 409);
  if (Object.keys(fields).length) throw new CompetitionParticipationError("VALIDATION", "Veuillez corriger les champs indiqués.", 400, fields);
}

const values = (competitionId: string, value: Command) => ({ id_competition: competitionId, id_epreuve_competition: value.eventId, id_type_distinction: value.typeId, id_unite_competition: value.unitId, id_acteur: value.actorId, id_type_acteur: value.actorTypeId, id_phase_competition: value.phaseId, id_match: value.matchId, date_attribution: value.date, statut: value.statut, observations: value.observations });
export async function getCompetitionDistinctions(competitionId: string, deps: Dependencies = defaults) { return resolve(competitionId, await load(deps)); }
export async function createCompetitionDistinction(competitionId: string, body: unknown, deps: Dependencies = defaults) { const input = body && typeof body === "object" ? body as Record<string, unknown> : {}, data = await load(deps); requireMutableEdition(data.competitions, competitionId); const value = command(input); validate(competitionId, value, data); const id = competitionEntityId("distinction", competitionId, data.distinctions, "id_distinction_competition"); await deps.appendRows({ block: "competitions", rows: [{ sheet: "COMPETITIONS_DISTINCTIONS", values: { id_distinction_competition: id, ...values(competitionId, value) } }] }); return { id }; }
export async function updateCompetitionDistinction(competitionId: string, distinctionId: string, body: unknown, deps: Dependencies = defaults) { const input = body && typeof body === "object" ? body as Record<string, unknown> : {}, data = await load(deps); requireMutableEdition(data.competitions, competitionId); const previous = data.distinctions.find(row => clean(row.id_distinction_competition) === distinctionId && clean(row.id_competition) === competitionId); if (!previous) throw new CompetitionParticipationError("DISTINCTION_INTROUVABLE", "La distinction n’existe pas.", 404); const value = command(input, previous); validate(competitionId, value, data, distinctionId); await deps.upsertRows({ block: "competitions", rows: [{ sheet: "COMPETITIONS_DISTINCTIONS", idHeader: "id_distinction_competition", values: { ...previous, ...values(competitionId, value), id_distinction_competition: distinctionId } }] }); return { id: distinctionId }; }
