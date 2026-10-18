import { readSheetRows, upsertSheetRowsAtomically, type SheetRow } from "./google-sheets";
import { CompetitionParticipationError, createCompetitionParticipations } from "./competition-participants";
import { competitionEntityId } from "./competition-ids";
import { mergeCompetitionPhaseUnits } from "./competition-phase-units";

type Deps = { readRows: typeof readSheetRows; upsertRows: typeof upsertSheetRowsAtomically };
const defaults: Deps = { readRows: readSheetRows, upsertRows: upsertSheetRowsAtomically };
const clean = (value: unknown) => String(value ?? "").trim();

export async function changeCompetitionParticipation(competitionId: string, participationId: string, body: unknown, remove = false, deps: Deps = defaults) {
  const read = (sheet: string) => deps.readRows({ block: "competitions", sheet, range: "A:ZZ", fresh: true });
  const [participants, units, phases, groups, canonical, historical, matches, people] = await Promise.all([
    "COMPETITIONS_PARTICIPANTS", "COMPETITIONS_UNITES", "COMPETITIONS_PHASES", "COMPETITIONS_GROUPES", "COMPETITIONS_PHASES_UNITES", "COMPETITIONS_GROUPES_UNITES", "COMPETITIONS_MATCHS", "COMPETITIONS_INTERVENANTS",
  ].map(read));
  const participation = participants.find(row => clean(row.id_participation) === participationId && clean(row.id_competition) === competitionId && clean(row.statut_participation) !== "SUPPRIMEE");
  const unit = units.find(row => clean(row.id_participation) === participationId && clean(row.id_competition) === competitionId && clean(row.statut) !== "INACTIF");
  if (!participation || !unit) throw new CompetitionParticipationError("PARTICIPATION_INTROUVABLE", "L’équipe engagée n’existe pas dans cette compétition.", 404);
  const phaseIds = new Set(phases.filter(row => clean(row.id_competition) === competitionId).map(row => clean(row.id_phase_competition)));
  const unitId = clean(unit.id_unite_competition), assigned = mergeCompetitionPhaseUnits(canonical, historical, groups).filter(row => phaseIds.has(clean(row.id_phase_competition)) && clean(row.id_unite_competition) === unitId && clean(row.statut) !== "INACTIF");
  const relatedMatches = matches.filter(row => clean(row.id_competition) === competitionId && [row.id_unite_a, row.id_unite_b].map(clean).includes(unitId));
  const writes: Parameters<typeof upsertSheetRowsAtomically>[0]["rows"] = [];
  if (remove) {
    if (relatedMatches.length || people.some(row => clean(row.id_competition) === competitionId && clean(row.id_unite_competition) === unitId)) throw new CompetitionParticipationError("ENGAGEMENT_UTILISE", "Retirez d’abord les matchs et les intervenants liés à cette équipe avant de supprimer son engagement.", 409);
    // Suppression logique atomique : aucune rupture des références historiques.
    writes.push({ sheet: "COMPETITIONS_PARTICIPANTS", idHeader: "id_participation", values: { ...participation, statut_participation: "SUPPRIMEE" } }, { sheet: "COMPETITIONS_UNITES", idHeader: "id_unite_competition", values: { ...unit, statut: "INACTIF" } });
    const synthetic = [...canonical];
    for (const assignment of assigned) {
      const id = clean(assignment.id_phase_unite) || competitionEntityId("phaseUnite", competitionId, synthetic, "id_phase_unite");
      synthetic.push({ id_phase_unite: id });
      writes.push({ sheet: "COMPETITIONS_PHASES_UNITES", idHeader: "id_phase_unite", values: { ...assignment, id_phase_unite: id, statut: "INACTIF" } });
    }
  } else {
    const input = body && typeof body === "object" ? body as Record<string, unknown> : {};
    const phaseId = clean(input.phaseId), assignment = assigned.find(row => clean(row.id_phase_competition) === phaseId);
    if (!assignment || !phases.some(row => clean(row.id_phase_competition) === phaseId && clean(row.id_competition) === competitionId)) throw new CompetitionParticipationError("PHASE_INVALIDE", "Choisissez une phase dans laquelle cette équipe est déjà engagée.", 422, { phaseId: "Phase d’engagement obligatoire." });
    const selections = Array.isArray(input.clubTeams) ? input.clubTeams as Array<Record<string, unknown>> : [];
    if (selections.length !== 1) throw new CompetitionParticipationError("VALIDATION", "Choisissez un seul club et une seule équipe pour cette modification.", 422);
    const structural = clean(selections[0].teamId) !== clean(unit.id_equipe) || clean(input.epreuveId) !== clean(unit.id_epreuve_competition);
    if ((structural && (relatedMatches.length || assigned.length > 1 || people.some(row => clean(row.id_unite_competition) === unitId))) || (clean(input.groupId) !== clean(assignment.id_groupe) && relatedMatches.some(row => clean(row.id_phase_competition) === phaseId))) throw new CompetitionParticipationError("ENGAGEMENT_UTILISE", "Cette modification affecterait des matchs ou des qualifications existants. Corrigez-les avant de changer l’équipe, l’épreuve ou le groupe.", 409);
    // Réutiliser toutes les validations d'ajout, en capturant les écritures préparées.
    // Aucun append Google n'est exécuté pendant cette validation.
    const prepared: Array<{ sheet: string; values: SheetRow }> = [];
    await createCompetitionParticipations(competitionId, input, {
      readRows: async (params, options) => {
        const rows = await deps.readRows(params, options), sheet = typeof params === "string" ? params : params.sheet;
        return sheet === "COMPETITIONS_PARTICIPANTS" ? rows.filter(row => clean(row.id_participation) !== participationId) : rows;
      },
      appendRows: async ({ rows }) => { prepared.push(...rows); },
    });
    const bySheet = new Map(prepared.map(row => [row.sheet, row.values]));
    const assignmentId = clean(assignment.id_phase_unite) || competitionEntityId("phaseUnite", competitionId, canonical, "id_phase_unite");
    writes.push(
      { sheet: "COMPETITIONS_PARTICIPANTS", idHeader: "id_participation", values: { ...participation, ...bySheet.get("COMPETITIONS_PARTICIPANTS"), id_participation: participationId } },
      { sheet: "COMPETITIONS_UNITES", idHeader: "id_unite_competition", values: { ...unit, ...bySheet.get("COMPETITIONS_UNITES"), id_participation: participationId, id_unite_competition: unitId } },
      { sheet: "COMPETITIONS_PHASES_UNITES", idHeader: "id_phase_unite", values: { ...assignment, ...bySheet.get("COMPETITIONS_PHASES_UNITES"), id_phase_unite: assignmentId, id_unite_competition: unitId, id_type_affectation_phase: clean(assignment.id_type_affectation_phase) || "TAP001", id_phase_source: clean(assignment.id_phase_source), id_match_source: clean(assignment.id_match_source) } },
    );
  }
  await deps.upsertRows({ block: "competitions", rows: writes });
  return { id: participationId };
}
