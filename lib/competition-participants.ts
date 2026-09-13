import {
  appendSheetRowsAtomically,
  readSheetRows,
  type SheetRow,
} from "@/lib/google-sheets";
import { competitionEntityId } from "@/lib/competition-ids";
import { GROUP_PHASE_MODE_ID, KNOCKOUT_PHASE_MODE_ID, OTHER_PHASE_MODE_ID, resolveCompetitionPhaseModeId } from "@/lib/competition-phase";
import { mergeCompetitionPhaseUnits } from "@/lib/competition-phase-units";
import { requireMutableEdition } from "@/lib/competition-lifecycle";

const clean = (value: unknown) => String(value ?? "").trim();

export class CompetitionParticipationError extends Error {
  constructor(
    public code: string,
    message: string,
    public status = 422,
    public fields: Record<string, string> = {},
  ) {
    super(message);
  }
}

type Dependencies = {
  readRows: typeof readSheetRows;
  appendRows: typeof appendSheetRowsAtomically;
};

const defaults: Dependencies = {
  readRows: readSheetRows,
  appendRows: appendSheetRowsAtomically,
};

export function generateNextId(rows: SheetRow[], field: string): string {
  const ids = rows.map((row) => clean(row[field])).filter(Boolean);
  if (!ids.length) return "1";
  const last = ids
    .map((id) => ({ id, match: id.match(/^(.*?)(\d+)$/) }))
    .filter((item) => item.match)
    .sort((a, b) => Number(b.match![2]) - Number(a.match![2]))[0];
  if (!last?.match) return String(ids.length + 1);
  const next = String(Number(last.match[2]) + 1).padStart(
    last.match[2].length,
    "0",
  );
  return `${last.match[1]}${next}`;
}

async function loadRows(deps: Dependencies) {
  const competitionSheet = (sheet: string, fresh = false) =>
    deps.readRows({ block: "competitions", sheet, range: "A:ZZ", fresh });
  const structureSheet = (sheet: string) =>
    deps.readRows({ block: "structure", sheet, range: "A:ZZ" });
  const referenceSheet = (sheet: string) =>
    deps.readRows({ block: "referentiel", sheet, range: "A:F" });
  const [competitions, events, participants, units, phases, groups, historicalAssignments, canonicalPhaseUnits, clubs, teams, categories, sexes, modes] =
    await Promise.all([
      competitionSheet("COMPETITIONS"),
      competitionSheet("COMPETITIONS_EPREUVES"),
      competitionSheet("COMPETITIONS_PARTICIPANTS"),
      competitionSheet("COMPETITIONS_UNITES"),
      competitionSheet("COMPETITIONS_PHASES", true),
      competitionSheet("COMPETITIONS_GROUPES", true),
      competitionSheet("COMPETITIONS_GROUPES_UNITES"),
      competitionSheet("COMPETITIONS_PHASES_UNITES"),
      structureSheet("CLUBS"),
      structureSheet("EQUIPES"),
      referenceSheet("CATEGORIES_AGE"),
      referenceSheet("SEXES"),
      referenceSheet("MODES_PHASES"),
    ]);
  const assignments = mergeCompetitionPhaseUnits(canonicalPhaseUnits, historicalAssignments, groups);
  return { competitions, events, participants, units, phases, groups, canonicalPhaseUnits, historicalAssignments, assignments, clubs, teams, categories, sexes, modes };
}

export async function getCompetitionParticipants(
  competitionId: string,
  deps: Dependencies = defaults,
) {
  const data = await loadRows(deps);
  if (!data.competitions.some((row) => clean(row.id_competition) === competitionId))
    throw new CompetitionParticipationError("COMPETITION_INTROUVABLE", "La compétition n’existe pas.", 404);
  const phaseIds = new Set(data.phases.filter((row) => clean(row.id_competition) === competitionId).map((row) => clean(row.id_phase_competition)));
  const phases = data.phases.filter((row) => clean(row.id_competition) === competitionId).map((row) => ({ id: clean(row.id_phase_competition), eventId: clean(row.id_epreuve_competition), label: clean(row.nom_phase) || clean(row.id_phase_competition), modeId: resolveCompetitionPhaseModeId(row), statut: clean(row.statut) || "ACTIF" }));
  const events = data.events.filter((row) => clean(row.id_competition) === competitionId && clean(row.statut).toUpperCase() !== "INACTIF").map((row) => ({ id: clean(row.id_epreuve_competition), label: clean(row.nom_epreuve) || clean(row.id_epreuve_competition), disciplineId: clean(row.id_discipline), categorieId: clean(row.id_categorie_age), sexeId: clean(row.id_sexe) }));
  const groups = data.groups.filter((row) => phaseIds.has(clean(row.id_phase_competition))).map((row) => ({ id: clean(row.id_groupe), phaseId: clean(row.id_phase_competition), label: clean(row.nom_groupe) || clean(row.id_groupe) }));
  const clubMap = new Map(data.clubs.map((row) => [clean(row.id_club), clean(row.nom_club) || clean(row.id_club)]));
  const categoryMap = new Map(data.categories.map((row) => [clean(row.id_categorie_age), clean(row.nom_categorie_age) || clean(row.id_categorie_age)]));
  const sexMap = new Map(data.sexes.map((row) => [clean(row.id_sexe), clean(row.nom_sexe) || clean(row.id_sexe)]));
  const teams = data.teams.map((row) => ({ id: clean(row.id_equipe), clubId: clean(row.id_club), nom: clean(row.nom_equipe) || clean(row.id_equipe), disciplineId: clean(row.id_discipline), categorieId: clean(row.id_categorie_age), sexeId: clean(row.id_sexe), categorie: categoryMap.get(clean(row.id_categorie_age)) || clean(row.id_categorie_age), sexe: sexMap.get(clean(row.id_sexe)) || clean(row.id_sexe) })).filter((team) => team.id && team.clubId);
  const clubs = data.clubs.map((row) => ({ id: clean(row.id_club), nom: clean(row.nom_club) || clean(row.id_club) })).filter((club) => club.id);
  const unitByParticipation = new Map(data.units.map((row) => [clean(row.id_participation), row]));
  const assignmentByUnit = new Map(data.assignments.map((row) => [clean(row.id_unite_competition), row]));
  const groupMap = new Map(groups.map((group) => [group.id, group.label]));
  const teamMap = new Map(teams.map((team) => [team.id, team]));
  const participants = data.participants.filter((row) => clean(row.id_competition) === competitionId).map((row) => {
    const team = teamMap.get(clean(row.id_equipe));
    const unit = unitByParticipation.get(clean(row.id_participation));
    const assignment = assignmentByUnit.get(clean(unit?.id_unite_competition));
    return { id: clean(row.id_participation), clubId: team?.clubId || "", equipeId: clean(row.id_equipe), club: clubMap.get(team?.clubId || "") || team?.clubId || "Référence absente", equipe: team?.nom || clean(row.id_equipe), categorie: team?.categorie || "-", sexe: team?.sexe || "-", groupe: groupMap.get(clean(assignment?.id_groupe)) || clean(assignment?.id_groupe) || "-", dateInscription: clean(row.date_inscription), statut: clean(row.statut_participation) };
  });
  const modes = data.modes.map((row) => ({ id: clean(row.id_mode_phase), label: clean(row.nom_mode_phase) })).filter((row) => row.id);
  return { participants, clubs, teams, events, phases, groups, modes };
}

export async function createCompetitionParticipations(
  competitionId: string,
  body: unknown,
  deps: Dependencies = defaults,
) {
  const input = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  const clubTeams = Array.isArray(input.clubTeams) ? input.clubTeams as Array<Record<string, unknown>> : [];
  const eventId = clean(input.epreuveId), phaseId = clean(input.phaseId), groupId = clean(input.groupId), date = clean(input.dateInscription), status = clean(input.statutParticipation), observations = clean(input.observations);
  const fields: Record<string, string> = {};
  if (!clubTeams.length) fields.clubTeams = "Sélectionnez au moins un club et son équipe.";
  if (!eventId) fields.epreuveId = "Sélectionnez une épreuve.";
  if (!phaseId) fields.phaseId = "Sélectionnez une phase.";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) fields.dateInscription = "Date d’inscription invalide.";
  if (!status) fields.statutParticipation = "Le statut est obligatoire.";
  if (Object.keys(fields).length) throw new CompetitionParticipationError("VALIDATION", "Veuillez corriger les champs indiqués.", 422, fields);
  const data = await loadRows(deps);
  requireMutableEdition(data.competitions, competitionId);
  if (!data.competitions.some((row) => clean(row.id_competition) === competitionId)) throw new CompetitionParticipationError("COMPETITION_INTROUVABLE", "La compétition n’existe pas.", 404);
  const event = data.events.find((row) => clean(row.id_epreuve_competition) === eventId && clean(row.id_competition) === competitionId && clean(row.statut).toUpperCase() !== "INACTIF");
  if (!event) throw new CompetitionParticipationError("EPREUVE_INVALIDE", "Cette épreuve n’appartient pas à cette édition ou est inactive.", 422, { epreuveId: "Épreuve indisponible." });
  const phase = data.phases.find((row) => clean(row.id_phase_competition) === phaseId && clean(row.id_competition) === competitionId);
  if (!phase) throw new CompetitionParticipationError("PHASE_INVALIDE", "Cette phase n’appartient pas à cette compétition.", 422, { phaseId: "Phase indisponible." });
  if (clean(phase.id_epreuve_competition) !== eventId) throw new CompetitionParticipationError("PHASE_EPREUVE_INVALIDE", "La phase n’appartient pas à l’épreuve sélectionnée.", 422, { phaseId: "Choisissez une phase de cette épreuve." });
  if (clean(phase.statut).toUpperCase() === "INACTIF") throw new CompetitionParticipationError("PHASE_INACTIVE", "Cette phase est inactive.", 422, { phaseId: "Choisissez une phase active." });
  const modeId = resolveCompetitionPhaseModeId(phase);
  if (modeId === GROUP_PHASE_MODE_ID && !groupId) throw new CompetitionParticipationError("GROUPE_REQUIS", "Un groupe est obligatoire.", 422, { groupId: "Sélectionnez un groupe." });
  if (modeId !== GROUP_PHASE_MODE_ID && groupId) throw new CompetitionParticipationError("GROUPE_INTERDIT", "Aucun groupe n’est permis pour cette phase.", 422, { groupId: "Laissez le groupe vide." });
  if (![GROUP_PHASE_MODE_ID, KNOCKOUT_PHASE_MODE_ID, OTHER_PHASE_MODE_ID].includes(modeId)) throw new CompetitionParticipationError("MODE_PHASE_INVALIDE", "Le mode de la phase est absent ou non référencé.", 422);
  if (groupId && !data.groups.some((row) => clean(row.id_groupe) === groupId && clean(row.id_phase_competition) === phaseId)) throw new CompetitionParticipationError("GROUPE_INVALIDE", "Ce groupe n’appartient pas à cette phase.", 422, { groupId: "Groupe indisponible." });
  const existingTeams = new Set(data.participants.filter((row) => clean(row.id_competition) === competitionId).map((row) => clean(row.id_equipe)));
  const writes: Array<{ sheet: string; values: Record<string, string> }> = [];
  let participationRows = [...data.participants], unitRows = [...data.units], assignmentRows = [...data.canonicalPhaseUnits];
  const created = [];
  for (const item of clubTeams) {
    const clubId = clean(item.clubId), teamId = clean(item.teamId);
    if (!data.clubs.some((row) => clean(row.id_club) === clubId)) throw new CompetitionParticipationError("CLUB_INTROUVABLE", "Le club sélectionné n’existe pas.", 422, { clubTeams: "Club introuvable." });
    const team = data.teams.find((row) => clean(row.id_equipe) === teamId && clean(row.id_club) === clubId);
    if (!team) throw new CompetitionParticipationError("EQUIPE_INVALIDE", "L’équipe n’appartient pas au club sélectionné.", 422, { [`team_${clubId}`]: "Choisissez une équipe de ce club." });
    if (clean(team.id_categorie_age) !== clean(event.id_categorie_age) || clean(team.id_sexe) !== clean(event.id_sexe) || (clean(team.id_discipline) && clean(team.id_discipline) !== clean(event.id_discipline))) throw new CompetitionParticipationError("EQUIPE_EPREUVE_INCOMPATIBLE", "L’équipe ne correspond pas à la catégorie, au sexe ou à la discipline de l’épreuve.", 422, { [`team_${clubId}`]: "Équipe incompatible avec cette épreuve." });
    if (existingTeams.has(teamId)) throw new CompetitionParticipationError("PARTICIPATION_DUPLIQUEE", "Cette équipe participe déjà à cette compétition.", 409, { [`team_${clubId}`]: "Équipe déjà inscrite." });
    const participationId = competitionEntityId("participation", competitionId, participationRows, "id_participation");
    participationRows.push({ id_participation: participationId });
    const unitId = competitionEntityId("unite", competitionId, unitRows, "id_unite_competition");
    unitRows.push({ id_unite_competition: unitId });
    const assignmentId = competitionEntityId("phaseUnite", competitionId, assignmentRows, "id_phase_unite");
    assignmentRows.push({ id_phase_unite: assignmentId });
    writes.push(
      { sheet: "COMPETITIONS_PARTICIPANTS", values: { id_participation: participationId, id_competition: competitionId, id_equipe: teamId, date_inscription: date, statut_participation: status, observations } },
      { sheet: "COMPETITIONS_UNITES", values: { id_unite_competition: unitId, id_competition: competitionId, id_epreuve_competition: eventId, id_type_unite_competition: "TUC003", id_equipe: teamId, id_participation: participationId, statut: "ACTIF", observations } },
      { sheet: "COMPETITIONS_PHASES_UNITES", values: { id_phase_unite: assignmentId, id_phase_competition: phaseId, id_groupe: groupId, id_unite_competition: unitId, id_type_affectation_phase: "TAP001", id_phase_source: "", id_match_source: "", date_affectation: date, statut: "ACTIF", observations } },
    );
    existingTeams.add(teamId);
    created.push({ participationId, unitId, assignmentId });
  }
  try { await deps.appendRows({ block: "competitions", rows: writes }); }
  catch { throw new CompetitionParticipationError("ECRITURE_INCOMPLETE", "Aucune participation n’a été confirmée : les trois écritures n’ont pas abouti.", 503); }
  return created;
}

export async function listAllCompetitionParticipants(deps: Dependencies = defaults) {
  const data = await loadRows(deps);
  const competitions = new Map(data.competitions.map((row) => [clean(row.id_competition), clean(row.nom_competition) || clean(row.id_competition)]));
  const clubs = new Map(data.clubs.map((row) => [clean(row.id_club), clean(row.nom_club) || clean(row.id_club)]));
  const categories = new Map(data.categories.map((row) => [clean(row.id_categorie_age), clean(row.nom_categorie_age) || clean(row.id_categorie_age)]));
  const sexes = new Map(data.sexes.map((row) => [clean(row.id_sexe), clean(row.nom_sexe) || clean(row.id_sexe)]));
  const teams = new Map(data.teams.map((row) => [clean(row.id_equipe), { clubId: clean(row.id_club), nom: clean(row.nom_equipe) || clean(row.id_equipe), categorie: categories.get(clean(row.id_categorie_age)) || clean(row.id_categorie_age), sexe: sexes.get(clean(row.id_sexe)) || clean(row.id_sexe) }]));
  const phaseCompetitions = new Map(data.phases.map((row) => [clean(row.id_phase_competition), clean(row.id_competition)]));
  const groups = new Map(data.groups.map((row) => [clean(row.id_groupe), { label: clean(row.nom_groupe) || clean(row.id_groupe), competitionId: phaseCompetitions.get(clean(row.id_phase_competition)) || "" }]));
  const units = new Map(data.units.map((row) => [clean(row.id_participation), row]));
  const assignments = new Map(data.assignments.map((row) => [clean(row.id_unite_competition), row]));
  return data.participants.map((row) => {
    const competitionId = clean(row.id_competition), team = teams.get(clean(row.id_equipe)), unit = units.get(clean(row.id_participation)), assignment = assignments.get(clean(unit?.id_unite_competition)), group = groups.get(clean(assignment?.id_groupe));
    return { id: clean(row.id_participation), competitionId, competition: competitions.get(competitionId) || competitionId, club: clubs.get(team?.clubId || "") || team?.clubId || "Référence absente", equipe: team?.nom || clean(row.id_equipe), categorie: team?.categorie || "-", sexe: team?.sexe || "-", groupe: group?.competitionId === competitionId ? group.label : "Référence absente", dateInscription: clean(row.date_inscription), statut: clean(row.statut_participation) };
  });
}
