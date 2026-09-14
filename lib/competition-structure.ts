import { appendSheetRowsAtomically, readSheetRows, type SheetRow } from "@/lib/google-sheets";
import { CompetitionParticipationError } from "@/lib/competition-participants";
import { competitionEntityId } from "@/lib/competition-ids";
import { GROUP_PHASE_MODE_ID, resolveCompetitionPhaseModeId, resolveCompetitionPhaseTypeId, resolvedReferenceLabel } from "@/lib/competition-phase";
import { mergeCompetitionPhaseUnits } from "@/lib/competition-phase-units";
import { requireMutableEdition } from "@/lib/competition-lifecycle";

const clean = (value: unknown) => String(value ?? "").trim();

type Dependencies = {
  readRows: typeof readSheetRows;
  appendRows: typeof appendSheetRowsAtomically;
};

const defaults: Dependencies = { readRows: readSheetRows, appendRows: appendSheetRowsAtomically };

async function resilientRead(deps: Dependencies, params: Parameters<Dependencies["readRows"]>[0]) {
  return deps.readRows(params);
}

async function load(competitionId: string, deps: Dependencies) {
  const read = (sheet: string, range: string, fresh = false) => resilientRead(deps, { block: "competitions", sheet, range, fresh });
  const [competitions, events, allPhases, allGroups, phaseTypes, phaseModes, canonicalPhaseUnits, historicalAssignments, matches] = await Promise.all([
    read("COMPETITIONS", "A:L"), read("COMPETITIONS_EPREUVES", "A:H", true), read("COMPETITIONS_PHASES", "A:I"), read("COMPETITIONS_GROUPES", "A:E"),
    resilientRead(deps, { block: "referentiel", sheet: "TYPES_PHASES", range: "A:C" }),
    resilientRead(deps, { block: "referentiel", sheet: "MODES_PHASES", range: "A:C" }),
    read("COMPETITIONS_PHASES_UNITES", "A:J"), read("COMPETITIONS_GROUPES_UNITES", "A:E"), read("COMPETITIONS_MATCHS", "A:J"),
  ]);
  if (!competitions.some((row) => clean(row.id_competition) === competitionId))
    throw new CompetitionParticipationError("COMPETITION_INTROUVABLE", "La compétition n’existe pas.", 404);
  const phaseRows = allPhases.filter((row) => clean(row.id_competition) === competitionId);
  const phaseIds = new Set(phaseRows.map((row) => clean(row.id_phase_competition)));
  const phaseUnits = mergeCompetitionPhaseUnits(canonicalPhaseUnits, historicalAssignments, allGroups);
  const phases = phaseRows.map((row) => ({
    id: clean(row.id_phase_competition),
    nom: clean(row.nom_phase) || clean(row.nom_phase_competition) || clean(row.id_phase_competition),
    typeId: resolveCompetitionPhaseTypeId(row),
    modeId: resolveCompetitionPhaseModeId(row),
    numero: clean(row.numero_phase), statut: clean(row.statut) || "ACTIF", observations: clean(row.observations),
    typeNom: resolvedReferenceLabel(resolveCompetitionPhaseTypeId(row), phaseTypes, "id_type_phase", "nom_type_phase", "Type de phase non référencé"),
    modeNom: resolvedReferenceLabel(resolveCompetitionPhaseModeId(row), phaseModes, "id_mode_phase", "nom_mode_phase", "Mode non référencé"),
    isGroupStage: resolveCompetitionPhaseModeId(row) === GROUP_PHASE_MODE_ID,
    eventId: clean(row.id_epreuve_competition), unitCount: new Set(phaseUnits.filter((unit) => clean(unit.id_phase_competition) === clean(row.id_phase_competition) && clean(unit.statut).toUpperCase() !== "INACTIF").map((unit) => clean(unit.id_unite_competition))).size,
    matchCount: matches.filter((match) => clean(match.id_phase_competition) === clean(row.id_phase_competition)).length,
  }));
  const groups = allGroups.filter((row) => phaseIds.has(clean(row.id_phase_competition))).map((row) => ({
    id: clean(row.id_groupe), phaseId: clean(row.id_phase_competition),
    nom: clean(row.nom_groupe) || clean(row.id_groupe),
  }));
  const types = phaseTypes.map((row) => ({ id: clean(row.id_type_phase), nom: clean(row.nom_type_phase) })).filter((row) => row.id);
  const modes = phaseModes.map((row) => ({ id: clean(row.id_mode_phase), nom: clean(row.nom_mode_phase) })).filter((row) => row.id);
  const scopedEvents = events.filter((row) => clean(row.id_competition) === competitionId).map((row) => ({ id: clean(row.id_epreuve_competition), nom: clean(row.nom_epreuve) || clean(row.id_epreuve_competition), statut: clean(row.statut) || "ACTIF" }));
  return { competitions, events: scopedEvents, phases, groups, types, modes, allPhases, allGroups };
}

export async function getCompetitionStructure(competitionId: string, deps: Dependencies = defaults) {
  const { events, phases, groups, types, modes } = await load(competitionId, deps);
  return { events, phases, groups, types, modes };
}

export async function createCompetitionStructureItem(competitionId: string, body: unknown, deps: Dependencies = defaults) {
  const input = body && typeof body === "object" ? body as Record<string, unknown> : {};
  const kind = clean(input.kind), nom = clean(input.nom), eventId = clean(input.eventId), phaseId = clean(input.phaseId), typeId = clean(input.typeId), modeId = clean(input.modeId), numero = clean(input.numero);
  const fields: Record<string, string> = {};
  if (kind !== "phase" && kind !== "groupe") fields.kind = "Type invalide.";
  if (!nom) fields.nom = "Le nom est obligatoire.";
  if (kind === "phase" && !typeId) fields.typeId = "Le type de phase est obligatoire.";
  if (kind === "phase" && !eventId) fields.eventId = "L’épreuve est obligatoire.";
  if (kind === "phase" && !modeId) fields.modeId = "Le mode de phase est obligatoire.";
  if (kind === "groupe" && !phaseId) fields.phaseId = "Sélectionnez la phase du groupe.";
  if (Object.keys(fields).length) throw new CompetitionParticipationError("VALIDATION", "Veuillez corriger les champs indiqués.", 422, fields);
  const data = await load(competitionId, deps);
  requireMutableEdition(data.competitions, competitionId);
  if (kind === "phase") {
    if (!data.events.some((event) => event.id === eventId && event.statut !== "INACTIF")) throw new CompetitionParticipationError("EPREUVE_INVALIDE", "Épreuve invalide ou inactive.", 422, { eventId: "Épreuve indisponible." });
    if (!data.types.some((type) => type.id === typeId)) throw new CompetitionParticipationError("TYPE_PHASE_INVALIDE", "Type de phase invalide.", 422, { typeId: "Type indisponible." });
    if (!data.modes.some((mode) => mode.id === modeId)) throw new CompetitionParticipationError("MODE_PHASE_INVALIDE", "Mode de phase invalide.", 422, { modeId: "Mode indisponible." });
    const id = competitionEntityId("phase", competitionId, data.allPhases, "id_phase_competition");
    await deps.appendRows({ block: "competitions", rows: [{ sheet: "COMPETITIONS_PHASES", values: { id_phase_competition: id, id_competition: competitionId, id_epreuve_competition: eventId, id_type_phase: typeId, id_mode_phase: modeId, numero_phase: numero, nom_phase: nom, statut: "ACTIF", observations: "" } }] });
    return { id };
  }
  const phase = data.phases.find((item) => item.id === phaseId);
  if (!phase)
    throw new CompetitionParticipationError("PHASE_INVALIDE", "Cette phase n’appartient pas à la compétition.", 422, { phaseId: "Phase indisponible." });
  if (phase.modeId !== GROUP_PHASE_MODE_ID) throw new CompetitionParticipationError("PHASE_SANS_GROUPES", "Seule une phase en mode groupes peut contenir un groupe.", 422, { phaseId: "Choisissez une phase en mode groupes." });
  const id = competitionEntityId("groupe", competitionId, data.allGroups, "id_groupe");
  await deps.appendRows({ block: "competitions", rows: [{ sheet: "COMPETITIONS_GROUPES", values: { id_groupe: id, id_phase_competition: phaseId, nom_groupe: nom } }] });
  return { id };
}
