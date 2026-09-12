import { appendSheetRowsAtomically, readSheetRows, upsertSheetRowsAtomically, type SheetRow } from "@/lib/google-sheets";
import { CompetitionParticipationError } from "@/lib/competition-participants";
import { competitionEntityId } from "@/lib/competition-ids";
import { GROUP_PHASE_MODE_ID, KNOCKOUT_PHASE_MODE_ID, OTHER_PHASE_MODE_ID, isCompetitionGroupPhase, resolveCompetitionPhaseModeId, resolveCompetitionPhaseTypeId, resolvedReferenceLabel } from "@/lib/competition-phase";
import { mergeCompetitionPhaseUnits } from "@/lib/competition-phase-units";
import { requireMutableEdition } from "@/lib/competition-lifecycle";

const clean = (value: unknown) => String(value ?? "").trim();
const integer = (value: unknown) => Number(clean(value));

type WriteRow = { sheet: string; idHeader: string; values: Record<string, string> };
type Dependencies = {
  readRows: typeof readSheetRows;
  appendRows: typeof appendSheetRowsAtomically;
  upsertRows: typeof upsertSheetRowsAtomically;
};
const defaults: Dependencies = { readRows: readSheetRows, appendRows: appendSheetRowsAtomically, upsertRows: upsertSheetRowsAtomically };

async function load(deps: Dependencies) {
  const competitions = (sheet: string) => deps.readRows({ block: "competitions", sheet, range: "A:ZZ" });
  const references = (sheet: string) => deps.readRows({ block: "referentiel", sheet, range: "A:ZZ" });
  const structure = (sheet: string) => deps.readRows({ block: "structure", sheet, range: "A:ZZ" });
  const [competitionRows, events, phases, groups, canonicalPhaseUnits, historicalAssignments, units, matches, results, standings, statuses, teams, phaseTypes, phaseModes, assignmentTypes] = await Promise.all([
    competitions("COMPETITIONS"), competitions("COMPETITIONS_EPREUVES"), competitions("COMPETITIONS_PHASES"), competitions("COMPETITIONS_GROUPES"),
    competitions("COMPETITIONS_PHASES_UNITES"), competitions("COMPETITIONS_GROUPES_UNITES"), competitions("COMPETITIONS_UNITES"), competitions("COMPETITIONS_MATCHS"),
    competitions("COMPETITIONS_RESULTATS"), competitions("COMPETITIONS_CLASSEMENT"), references("STATUTS_RESULTATS"), structure("EQUIPES"), references("TYPES_PHASES"), references("MODES_PHASES"), references("TYPES_AFFECTATIONS_PHASES"),
  ]);
  const phaseUnits = mergeCompetitionPhaseUnits(canonicalPhaseUnits, historicalAssignments, groups);
  return { competitionRows, events, phases, groups, canonicalPhaseUnits, historicalAssignments, phaseUnits, units, matches, results, standings, statuses, teams, phaseTypes, phaseModes, assignmentTypes };
}

function requireCompetition(data: Awaited<ReturnType<typeof load>>, competitionId: string) {
  if (!data.competitionRows.some((row) => clean(row.id_competition) === competitionId))
    throw new CompetitionParticipationError("COMPETITION_INTROUVABLE", "La compétition n’existe pas.", 404);
}

function scope(data: Awaited<ReturnType<typeof load>>, competitionId: string) {
  const phases = data.phases.filter((row) => clean(row.id_competition) === competitionId);
  const events = data.events.filter((row) => clean(row.id_competition) === competitionId);
  const phaseIds = new Set(phases.map((row) => clean(row.id_phase_competition)));
  const groups = data.groups.filter((row) => phaseIds.has(clean(row.id_phase_competition)));
  const groupIds = new Set(groups.map((row) => clean(row.id_groupe)));
  const assignments = data.phaseUnits.filter((row) => phaseIds.has(clean(row.id_phase_competition)) && (!clean(row.id_groupe) || groupIds.has(clean(row.id_groupe))) && clean(row.statut).toUpperCase() !== "INACTIF");
  const units = data.units.filter((row) => clean(row.id_competition) === competitionId && clean(row.statut).toUpperCase() !== "INACTIF");
  return { events, phases, groups, assignments, units };
}

export function calculateStandings(
  matches: SheetRow[], results: SheetRow[], competitionId: string, groupPhaseIds?: ReadonlySet<string>,
): Array<{ phaseId: string; groupId: string; unitId: string; played: number; wins: number; losses: number; for: number; against: number; difference: number; points: number; rank: number }> {
  const resultByMatch = new Map(results.filter((row) => clean(row.id_statut_resultat) === "STR001").map((row) => [clean(row.id_match), row]));
  const buckets = new Map<string, Map<string, { played: number; wins: number; losses: number; for: number; against: number }>>();
  for (const match of matches.filter((row) => clean(row.id_competition) === competitionId)) {
    if (groupPhaseIds && !groupPhaseIds.has(clean(match.id_phase_competition))) continue;
    const result = resultByMatch.get(clean(match.id_match));
    if (!result) continue;
    const phaseId = clean(match.id_phase_competition), groupId = clean(match.id_groupe), key = `${phaseId}\u0000${groupId}`;
    const table = buckets.get(key) ?? new Map(); buckets.set(key, table);
    const a = clean(match.id_unite_a), b = clean(match.id_unite_b), scoreA = integer(result.score_total_a), scoreB = integer(result.score_total_b);
    for (const [unitId, own, other, won] of [[a, scoreA, scoreB, scoreA > scoreB], [b, scoreB, scoreA, scoreB > scoreA]] as const) {
      const current = table.get(unitId) ?? { played: 0, wins: 0, losses: 0, for: 0, against: 0 };
      current.played++; current.for += own; current.against += other; won ? current.wins++ : current.losses++; table.set(unitId, current);
    }
  }
  const output: ReturnType<typeof calculateStandings> = [];
  for (const [key, table] of buckets) {
    const [phaseId, groupId] = key.split("\u0000");
    const sorted = [...table.entries()].map(([unitId, stat]) => ({ phaseId, groupId, unitId, ...stat, difference: stat.for - stat.against, points: stat.wins * 2 + stat.losses, rank: 0 }))
      .sort((a, b) => b.points - a.points || b.difference - a.difference || b.for - a.for || a.unitId.localeCompare(b.unitId));
    sorted.forEach((row, index) => { row.rank = index + 1; output.push(row); });
  }
  return output;
}

function present(data: Awaited<ReturnType<typeof load>>, competitionId: string) {
  const scoped = scope(data, competitionId), teamNames = new Map(data.teams.map((row) => [clean(row.id_equipe), clean(row.nom_equipe) || clean(row.id_equipe)]));
  const units = scoped.units.map((row) => ({ id: clean(row.id_unite_competition), eventId: clean(row.id_epreuve_competition), nom: teamNames.get(clean(row.id_equipe)) || clean(row.id_equipe) }));
  const unitNames = new Map(units.map((row) => [row.id, row.nom]));
  const phaseNames = new Map(scoped.phases.map((row) => [clean(row.id_phase_competition), clean(row.nom_phase) || clean(row.id_phase_competition)]));
  const eventNames = new Map(scoped.events.map((row) => [clean(row.id_epreuve_competition), clean(row.nom_epreuve) || clean(row.id_epreuve_competition)]));
  const phasePositions = new Map(scoped.phases.map((row, index) => {
    const numero = Number(clean(row.numero_phase));
    return [clean(row.id_phase_competition), Number.isFinite(numero) && numero > 0 ? numero : index + 1];
  }));
  const groupNames = new Map(scoped.groups.map((row) => [clean(row.id_groupe), clean(row.nom_groupe) || clean(row.id_groupe)]));
  const matches = data.matches.filter((row) => clean(row.id_competition) === competitionId).map((row) => { const phaseId = clean(row.id_phase_competition), eventId = clean(scoped.phases.find((phase) => clean(phase.id_phase_competition) === phaseId)?.id_epreuve_competition); return { id: clean(row.id_match), eventId, epreuve: eventNames.get(eventId) || "-", phaseId, phase: phaseNames.get(phaseId) || "-", groupId: clean(row.id_groupe), groupe: groupNames.get(clean(row.id_groupe)) || "-", uniteAId: clean(row.id_unite_a), uniteA: unitNames.get(clean(row.id_unite_a)) || clean(row.id_unite_a), uniteBId: clean(row.id_unite_b), uniteB: unitNames.get(clean(row.id_unite_b)) || clean(row.id_unite_b), date: clean(row.date_match), heure: clean(row.heure_match), statut: clean(row.statut_match) }; });
  const matchMap = new Map(matches.map((row) => [row.id, row]));
  const results = data.results.filter((row) => matchMap.has(clean(row.id_match))).map((row) => { const match = matchMap.get(clean(row.id_match))!; const winnerId = clean(row.id_unite_vainqueur); return { id: clean(row.id_resultat), matchId: match.id, match, scoreA: clean(row.score_total_a), scoreB: clean(row.score_total_b), qt1A: clean(row.qt1_a), qt1B: clean(row.qt1_b), qt2A: clean(row.qt2_a), qt2B: clean(row.qt2_b), qt3A: clean(row.qt3_a), qt3B: clean(row.qt3_b), qt4A: clean(row.qt4_a), qt4B: clean(row.qt4_b), prolongationA: clean(row.prolongation_a), prolongationB: clean(row.prolongation_b), winnerId, vainqueur: unitNames.get(winnerId) || "-", statutId: clean(row.id_statut_resultat) }; });
  const groupPhaseIds = new Set(scoped.phases.filter(isCompetitionGroupPhase).map((row) => clean(row.id_phase_competition)));
  const standings = data.standings.filter((row) => clean(row.id_competition) === competitionId && groupPhaseIds.has(clean(row.id_phase_competition))).map((row) => {
    const phaseId = clean(row.id_phase_competition), unitId = clean(row.id_unite_competition), sourcePosition = phasePositions.get(phaseId) ?? 0;
    const qualificationPhases = scoped.assignments
      .filter((assignment) => clean(assignment.id_unite_competition) === unitId && (phasePositions.get(clean(assignment.id_phase_competition)) ?? 0) > sourcePosition)
      .map((assignment) => clean(assignment.id_phase_competition))
      .filter((id, index, ids) => ids.indexOf(id) === index)
      .sort((a, b) => (phasePositions.get(a) ?? 0) - (phasePositions.get(b) ?? 0));
    return { id: clean(row.id_classement), phaseId, groupId: clean(row.id_groupe), unitId, phase: phaseNames.get(phaseId) || "-", groupe: groupNames.get(clean(row.id_groupe)) || "-", unite: unitNames.get(unitId) || unitId, matchsJoues: clean(row.matchs_joues), victoires: clean(row.victoires), defaites: clean(row.defaites), pointsPour: clean(row.points_pour), pointsContre: clean(row.points_contre), difference: clean(row.difference_points), points: clean(row.points_classement), rang: clean(row.rang), qualificationStatus: qualificationPhases.length ? "QUALIFIEE" : "NON_QUALIFIEE", qualificationPhase: qualificationPhases.map((id) => phaseNames.get(id) || id).join(", ") };
  }).sort((a, b) => Number(a.rang) - Number(b.rang));
  const events = scoped.events.map((row) => ({ id: clean(row.id_epreuve_competition), nom: eventNames.get(clean(row.id_epreuve_competition))!, statut: clean(row.statut) || "ACTIF" }));
  const phases = scoped.phases.map((row) => { const typeId = resolveCompetitionPhaseTypeId(row), modeId = resolveCompetitionPhaseModeId(row), eventId = clean(row.id_epreuve_competition); return { id: clean(row.id_phase_competition), competitionId, eventId, epreuve: eventNames.get(eventId) || "Épreuve non référencée", typeId, modeId, numero: clean(row.numero_phase), nom: phaseNames.get(clean(row.id_phase_competition))!, statut: clean(row.statut) || "ACTIF", observations: clean(row.observations), typeNom: resolvedReferenceLabel(typeId, data.phaseTypes, "id_type_phase", "nom_type_phase", "Type de phase non référencé"), modeNom: resolvedReferenceLabel(modeId, data.phaseModes, "id_mode_phase", "nom_mode_phase", "Mode non référencé"), isGroupStage: modeId === GROUP_PHASE_MODE_ID } });
  const groups = scoped.groups.map((row) => ({ id: clean(row.id_groupe), phaseId: clean(row.id_phase_competition), nom: groupNames.get(clean(row.id_groupe))! }));
  const assignmentTypeNames = new Map(data.assignmentTypes.map((row) => [clean(row.id_type_affectation_phase), clean(row.nom_type_affectation_phase) || clean(row.id_type_affectation_phase)]));
  const assignments = scoped.assignments.map((row) => ({ id: clean(row.id_phase_unite), phaseId: clean(row.id_phase_competition), groupId: clean(row.id_groupe), unitId: clean(row.id_unite_competition), typeId: clean(row.id_type_affectation_phase), type: assignmentTypeNames.get(clean(row.id_type_affectation_phase)) || clean(row.id_type_affectation_phase) || "Historique", sourcePhaseId: clean(row.id_phase_source), sourcePhase: phaseNames.get(clean(row.id_phase_source)) || "-", sourceMatchId: clean(row.id_match_source), date: clean(row.date_affectation), observations: clean(row.observations), statut: clean(row.statut) || "ACTIF" }));
  const statuses = data.statuses.map((row) => ({ id: clean(row.id_statut_resultat), nom: clean(row.nom_statut_resultat) })).filter((row) => row.id);
  const modesPhases = data.phaseModes.map((row) => ({ id: clean(row.id_mode_phase), nom: clean(row.nom_mode_phase), observations: clean(row.observations) })).filter((row) => row.id);
  return { events, phases, groups, units, assignments, phaseUnits: assignments, matches, results, standings, statuses, modesPhases, assignmentTypes: [...assignmentTypeNames].map(([id, nom]) => ({ id, nom })) };
}

export async function getCompetitionPlay(competitionId: string, deps: Dependencies = defaults) {
  const data = await load(deps); requireCompetition(data, competitionId); return present(data, competitionId);
}

export async function listAllCompetitionResults(deps: Dependencies = defaults) {
  const data = await load(deps), names = new Map(data.competitionRows.map((row) => [clean(row.id_competition), clean(row.nom_competition) || clean(row.id_competition)]));
  return [...names].flatMap(([competitionId, competitionNom]) => present(data, competitionId).results.map((result) => {
    const raw = data.results.find((row) => clean(row.id_resultat) === result.id) ?? {};
    return { __key: result.id, id: result.id, competitionId, competitionNom, dateMatch: result.match.date, heureMatch: result.match.heure, phase: result.match.phase, classementPoule: "-", poule: result.match.groupe, uniteAId: result.match.uniteAId, uniteANom: result.match.uniteA, uniteBId: result.match.uniteBId, uniteBNom: result.match.uniteB, qt1A: clean(raw.qt1_a), qt1B: clean(raw.qt1_b), qt2A: clean(raw.qt2_a), qt2B: clean(raw.qt2_b), qt3A: clean(raw.qt3_a), qt3B: clean(raw.qt3_b), qt4A: clean(raw.qt4_a), qt4B: clean(raw.qt4_b), prolongationA: clean(raw.prolongation_a), prolongationB: clean(raw.prolongation_b), scoreTotalA: result.scoreA, scoreTotalB: result.scoreB, vainqueurId: clean(raw.id_unite_vainqueur), vainqueur: result.vainqueur, statut: data.statuses.find((row) => clean(row.id_statut_resultat) === result.statutId)?.nom_statut_resultat || result.statutId };
  }));
}

export async function listAllCompetitionStandings(deps: Dependencies = defaults) {
  const data = await load(deps), names = new Map(data.competitionRows.map((row) => [clean(row.id_competition), clean(row.nom_competition) || clean(row.id_competition)]));
  return [...names].flatMap(([competitionId, competitionNom]) => present(data, competitionId).standings.map((row) => ({ __key: row.id, id: row.id, coteUnite: "-", resultatId: "-", competitionId, competitionNom, phase: row.phase, poule: row.groupe, uniteId: "", uniteNom: row.unite, adversaireId: "", adversaireNom: "-", resultatMatch: "-", matchJoue: row.matchsJoues, victoire: row.victoires, defaite: row.defaites, nul: "0", points: row.points, scorePour: row.pointsPour, scoreContre: row.pointsContre, difference: row.difference, rang: row.rang })));
}

export async function createCompetitionPhaseUnit(competitionId: string, body: unknown, deps: Dependencies = defaults) {
  const input = body && typeof body === "object" ? body as Record<string, unknown> : {};
  const phaseId = clean(input.idPhaseCompetition), unitId = clean(input.idUniteCompetition), groupId = clean(input.idGroupe), observations = clean(input.observations);
  const fields: Record<string, string> = {};
  if (!phaseId) fields.idPhaseCompetition = "Phase obligatoire.";
  if (!unitId) fields.idUniteCompetition = "Unité obligatoire.";
  if (Object.keys(fields).length) throw new CompetitionParticipationError("VALIDATION", "Veuillez corriger les champs indiqués.", 422, fields);
  const data = await load(deps); requireCompetition(data, competitionId); requireMutableEdition(data.competitionRows, competitionId);
  const phase = data.phases.find((row) => clean(row.id_phase_competition) === phaseId && clean(row.id_competition) === competitionId);
  if (!phase) throw new CompetitionParticipationError("PHASE_INVALIDE", "Cette phase n’appartient pas à la compétition.", 422, { idPhaseCompetition: "Phase indisponible." });
  if (clean(phase.statut).toUpperCase() === "INACTIF") throw new CompetitionParticipationError("PHASE_INACTIVE", "Cette phase est inactive.", 422);
  const unit = data.units.find((row) => clean(row.id_unite_competition) === unitId && clean(row.id_competition) === competitionId);
  if (!unit) throw new CompetitionParticipationError("UNITE_INVALIDE", "Cette unité n’appartient pas à la compétition.", 422);
  if (clean(unit.statut).toUpperCase() === "INACTIF") throw new CompetitionParticipationError("UNITE_INACTIVE", "Cette unité est inactive.", 422);
  if (clean(unit.id_epreuve_competition) !== clean(phase.id_epreuve_competition)) throw new CompetitionParticipationError("EPREUVE_INCOMPATIBLE", "L’unité et la phase doivent appartenir à la même épreuve.", 422);
  const modeId = resolveCompetitionPhaseModeId(phase);
  if (modeId === GROUP_PHASE_MODE_ID && !groupId) throw new CompetitionParticipationError("GROUPE_REQUIS", "Un groupe est obligatoire pour cette phase.", 422, { idGroupe: "Groupe obligatoire." });
  if (modeId !== GROUP_PHASE_MODE_ID && groupId) throw new CompetitionParticipationError("GROUPE_INTERDIT", "Aucun groupe n’est permis pour cette phase.", 422, { idGroupe: "Laissez le groupe vide." });
  if (![GROUP_PHASE_MODE_ID, KNOCKOUT_PHASE_MODE_ID, OTHER_PHASE_MODE_ID].includes(modeId)) throw new CompetitionParticipationError("MODE_PHASE_INVALIDE", "Le mode de cette phase est absent ou non référencé.", 422);
  if (groupId && !data.groups.some((row) => clean(row.id_groupe) === groupId && clean(row.id_phase_competition) === phaseId)) throw new CompetitionParticipationError("GROUPE_INVALIDE", "Ce groupe n’appartient pas à la phase.", 422, { idGroupe: "Groupe indisponible." });
  if (data.phaseUnits.some((row) => clean(row.id_phase_competition) === phaseId && clean(row.id_unite_competition) === unitId && clean(row.statut).toUpperCase() !== "INACTIF")) throw new CompetitionParticipationError("AFFECTATION_DUPLIQUEE", "Cette unité est déjà active dans cette phase.", 409);
  const id = competitionEntityId("phaseUnite", competitionId, data.canonicalPhaseUnits, "id_phase_unite");
  const sourcePhaseId = clean(input.sourcePhaseId), sourceMatchId = clean(input.sourceMatchId), typeId = clean(input.typeId) || (sourcePhaseId ? "TAP002" : "TAP001"), date = clean(input.date) || new Date().toISOString().slice(0, 10);
  if (!data.assignmentTypes.some((row) => clean(row.id_type_affectation_phase) === typeId)) throw new CompetitionParticipationError("TYPE_AFFECTATION_INVALIDE", "Le type d’affectation est invalide.", 422);
  if (sourcePhaseId) {
    const source = data.phases.find((row) => clean(row.id_phase_competition) === sourcePhaseId && clean(row.id_competition) === competitionId);
    if (!source) throw new CompetitionParticipationError("PHASE_SOURCE_INVALIDE", "La phase source est invalide.", 422);
    if (clean(source.id_epreuve_competition) !== clean(phase.id_epreuve_competition)) throw new CompetitionParticipationError("EPREUVE_INCOMPATIBLE", "Les phases source et destination doivent appartenir à la même épreuve.", 422);
    const order = (row: SheetRow) => Number(clean(row.numero_phase)) || data.phases.indexOf(row) + 1;
    if (order(phase) <= order(source)) throw new CompetitionParticipationError("PHASE_DESTINATION_ANTERIEURE", "La destination doit être une phase ultérieure.", 422);
    if (!data.phaseUnits.some((row) => clean(row.id_phase_competition) === sourcePhaseId && clean(row.id_unite_competition) === unitId && clean(row.statut).toUpperCase() !== "INACTIF")) throw new CompetitionParticipationError("UNITE_ABSENTE_SOURCE", "L’unité n’appartient pas à la phase source.", 422);
    if (sourceMatchId) {
      const match = data.matches.find((row) => clean(row.id_match) === sourceMatchId && clean(row.id_phase_competition) === sourcePhaseId);
      if (!match) throw new CompetitionParticipationError("MATCH_SOURCE_INVALIDE", "Le match source n’appartient pas à la phase source.", 422);
      const result = data.results.find((row) => clean(row.id_match) === sourceMatchId && clean(row.id_statut_resultat) === "STR001");
      if (!result || clean(result.id_unite_vainqueur) !== unitId) throw new CompetitionParticipationError("VAINQUEUR_INCOMPATIBLE", "L’unité qualifiée doit être le vainqueur enregistré du match source.", 422);
    }
  }
  await deps.appendRows({ block: "competitions", rows: [{ sheet: "COMPETITIONS_PHASES_UNITES", values: { id_phase_unite: id, id_phase_competition: phaseId, id_groupe: groupId, id_unite_competition: unitId, id_type_affectation_phase: typeId, id_phase_source: sourcePhaseId, id_match_source: sourceMatchId, date_affectation: date, statut: "ACTIF", observations } }] });
  return { id };
}

export async function createCompetitionQualifications(competitionId:string,body:unknown,deps:Dependencies=defaults){
 const input=body&&typeof body==="object"?body as Record<string,unknown>:{},sourceId=clean(input.sourcePhaseId),destinationId=clean(input.destinationPhaseId),groupId=clean(input.destinationGroupId),typeId=clean(input.typeId)||"TAP002",sourceMatchId=clean(input.sourceMatchId),date=clean(input.date)||new Date().toISOString().slice(0,10),observations=clean(input.observations),unitIds=[...new Set((Array.isArray(input.unitIds)?input.unitIds:[]).map(clean).filter(Boolean))];
 const fields:Record<string,string>={};if(!sourceId)fields.sourcePhaseId="Phase source obligatoire.";if(!destinationId)fields.destinationPhaseId="Destination obligatoire.";if(!unitIds.length)fields.unitIds="Sélectionnez au moins une unité.";if(Object.keys(fields).length)throw new CompetitionParticipationError("VALIDATION","Veuillez corriger les champs indiqués.",422,fields);
 const data=await load(deps);requireCompetition(data,competitionId);requireMutableEdition(data.competitionRows,competitionId);const source=data.phases.find(x=>clean(x.id_competition)===competitionId&&clean(x.id_phase_competition)===sourceId),destination=data.phases.find(x=>clean(x.id_competition)===competitionId&&clean(x.id_phase_competition)===destinationId);if(!source||!destination)throw new CompetitionParticipationError("PHASE_INVALIDE","Phase source ou destination invalide.",422);if(clean(source.id_epreuve_competition)!==clean(destination.id_epreuve_competition))throw new CompetitionParticipationError("EPREUVE_INCOMPATIBLE","Les phases doivent appartenir à la même épreuve.",422);const order=(x:SheetRow)=>Number(clean(x.numero_phase))||data.phases.indexOf(x)+1;if(order(destination)<=order(source))throw new CompetitionParticipationError("PHASE_DESTINATION_ANTERIEURE","La destination doit être ultérieure.",422);
 const mode=resolveCompetitionPhaseModeId(destination);if(mode===GROUP_PHASE_MODE_ID&&!groupId)throw new CompetitionParticipationError("GROUPE_REQUIS","Le groupe de destination est obligatoire.",422);if(mode!==GROUP_PHASE_MODE_ID&&groupId)throw new CompetitionParticipationError("GROUPE_INTERDIT","Aucun groupe n’est permis pour cette destination.",422);if(groupId&&!data.groups.some(x=>clean(x.id_groupe)===groupId&&clean(x.id_phase_competition)===destinationId))throw new CompetitionParticipationError("GROUPE_INVALIDE","Groupe de destination invalide.",422);if(!data.assignmentTypes.some(x=>clean(x.id_type_affectation_phase)===typeId))throw new CompetitionParticipationError("TYPE_AFFECTATION_INVALIDE","Type d’affectation invalide.",422);
 const sourceUnits=new Set(data.phaseUnits.filter(x=>clean(x.id_phase_competition)===sourceId&&clean(x.statut).toUpperCase()!=="INACTIF").map(x=>clean(x.id_unite_competition))),existing=new Set(data.phaseUnits.filter(x=>clean(x.id_phase_competition)===destinationId&&clean(x.statut).toUpperCase()!=="INACTIF").map(x=>clean(x.id_unite_competition)));for(const unitId of unitIds){const unit=data.units.find(x=>clean(x.id_competition)===competitionId&&clean(x.id_unite_competition)===unitId);if(!unit||clean(unit.id_epreuve_competition)!==clean(destination.id_epreuve_competition)||!sourceUnits.has(unitId))throw new CompetitionParticipationError("UNITE_INVALIDE","Une unité n’appartient pas à la phase source ou à l’épreuve.",422);if(existing.has(unitId))throw new CompetitionParticipationError("AFFECTATION_DUPLIQUEE","Une unité est déjà active dans la destination.",409)}
 if(sourceMatchId){const match=data.matches.find(x=>clean(x.id_match)===sourceMatchId&&clean(x.id_phase_competition)===sourceId),result=data.results.find(x=>clean(x.id_match)===sourceMatchId&&clean(x.id_statut_resultat)==="STR001");if(!match)throw new CompetitionParticipationError("MATCH_SOURCE_INVALIDE","Le match source est invalide.",422);if(unitIds.length!==1||clean(result?.id_unite_vainqueur)!==unitIds[0])throw new CompetitionParticipationError("VAINQUEUR_INCOMPATIBLE","La sélection doit correspondre au vainqueur du match source.",422)}
 const synthetic=[...data.canonicalPhaseUnits],rows=unitIds.map(unitId=>{const id=competitionEntityId("phaseUnite",competitionId,synthetic,"id_phase_unite");synthetic.push({id_phase_unite:id});return{sheet:"COMPETITIONS_PHASES_UNITES",values:{id_phase_unite:id,id_phase_competition:destinationId,id_groupe:groupId,id_unite_competition:unitId,id_type_affectation_phase:typeId,id_phase_source:sourceId,id_match_source:sourceMatchId,date_affectation:date,statut:"ACTIF",observations}}});await deps.appendRows({block:"competitions",rows});return{ids:rows.map(x=>x.values.id_phase_unite)};
}

export async function createCompetitionMatch(competitionId: string, body: unknown, deps: Dependencies = defaults) {
  const input = body && typeof body === "object" ? body as Record<string, unknown> : {};
  const phaseId = clean(input.phaseId), groupId = clean(input.groupId), unitA = clean(input.uniteAId), unitB = clean(input.uniteBId), date = clean(input.date), time = clean(input.heure), observations = clean(input.observations);
  const fields: Record<string, string> = {};
  if (!phaseId) fields.phaseId = "Phase obligatoire.";
  if (!unitA) fields.uniteAId = "Première équipe obligatoire."; if (!unitB) fields.uniteBId = "Deuxième équipe obligatoire.";
  if (unitA && unitA === unitB) fields.uniteBId = "Choisissez deux équipes différentes.";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) fields.date = "Date invalide."; if (!/^\d{2}:\d{2}$/.test(time)) fields.heure = "Heure invalide.";
  if (Object.keys(fields).length) throw new CompetitionParticipationError("VALIDATION", "Veuillez corriger les champs indiqués.", 422, fields);
  const data = await load(deps); requireCompetition(data, competitionId); requireMutableEdition(data.competitionRows, competitionId); const scoped = scope(data, competitionId);
  const phase = scoped.phases.find((row) => clean(row.id_phase_competition) === phaseId);
  if (!phase) throw new CompetitionParticipationError("PHASE_INVALIDE", "Cette phase n’appartient pas à la compétition.", 422, { phaseId: "Phase indisponible." });
  if (clean(phase.statut).toUpperCase() === "INACTIF") throw new CompetitionParticipationError("PHASE_INACTIVE", "Cette phase est inactive.", 422, { phaseId: "Choisissez une phase active." });
  const modeId = resolveCompetitionPhaseModeId(phase), groupStage = modeId === GROUP_PHASE_MODE_ID;
  if (![GROUP_PHASE_MODE_ID, KNOCKOUT_PHASE_MODE_ID, OTHER_PHASE_MODE_ID].includes(modeId)) throw new CompetitionParticipationError("MODE_PHASE_INVALIDE", "Le mode de cette phase est absent ou non référencé.", 422);
  if (groupStage && !groupId) throw new CompetitionParticipationError("VALIDATION", "Le groupe est obligatoire pour cette phase.", 422, { groupId: "Groupe obligatoire." });
  if (!groupStage && groupId) throw new CompetitionParticipationError("GROUPE_INTERDIT", "Aucun groupe n’est permis hors du mode groupes.", 422, { groupId: "Laissez le groupe vide." });
  const group = groupId ? scoped.groups.find((row) => clean(row.id_groupe) === groupId && clean(row.id_phase_competition) === phaseId) : undefined;
  if (groupId && !group) throw new CompetitionParticipationError("GROUPE_INVALIDE", "Le groupe n’appartient pas à cette phase.", 422, { groupId: "Groupe indisponible." });
  const eligible = new Set(scoped.assignments.filter((row) => clean(row.id_phase_competition) === phaseId && (!groupId || clean(row.id_groupe) === groupId)).map((row) => clean(row.id_unite_competition)));
  if (!eligible.has(unitA) || !eligible.has(unitB)) throw new CompetitionParticipationError("UNITES_INVALIDES", groupId ? "Les deux équipes doivent être actives dans ce groupe." : "Les deux équipes doivent être actives dans cette phase.", 422);
  const effectiveGroupId = groupStage ? groupId : "";
  if (data.matches.some((row) => clean(row.id_competition) === competitionId && clean(row.id_phase_competition) === phaseId && clean(row.id_groupe) === effectiveGroupId && new Set([clean(row.id_unite_a), clean(row.id_unite_b)]).has(unitA) && new Set([clean(row.id_unite_a), clean(row.id_unite_b)]).has(unitB))) throw new CompetitionParticipationError("MATCH_DUPLIQUE", groupStage ? "Ce match est déjà programmé dans ce groupe." : "Ce match est déjà programmé dans cette phase.", 409);
  const id = competitionEntityId("match", competitionId, data.matches, "id_match");
  await deps.appendRows({ block: "competitions", rows: [{ sheet: "COMPETITIONS_MATCHS", values: { id_match: id, id_competition: competitionId, id_phase_competition: phaseId, id_groupe: effectiveGroupId, id_unite_a: unitA, id_unite_b: unitB, date_match: date, heure_match: time, statut_match: "PROGRAMME", observations } }] });
  return { id };
}

export async function createCompetitionResult(competitionId: string, body: unknown, deps: Dependencies = defaults) {
  const input = body && typeof body === "object" ? body as Record<string, unknown> : {}, matchId = clean(input.matchId), statusId = clean(input.statutId), observations = clean(input.observations);
  const scoreKeys = ["qt1A", "qt1B", "qt2A", "qt2B", "qt3A", "qt3B", "qt4A", "qt4B", "prolongationA", "prolongationB"] as const;
  const scores = Object.fromEntries(scoreKeys.map((key) => [key, integer(input[key] ?? 0)])) as Record<typeof scoreKeys[number], number>;
  const fields: Record<string, string> = {}; if (!matchId) fields.matchId = "Match obligatoire."; if (!statusId) fields.statutId = "Statut obligatoire.";
  if (scoreKeys.some((key) => !Number.isInteger(scores[key]) || scores[key] < 0)) fields.scores = "Les scores doivent être des entiers positifs.";
  const totalA = scores.qt1A + scores.qt2A + scores.qt3A + scores.qt4A + scores.prolongationA, totalB = scores.qt1B + scores.qt2B + scores.qt3B + scores.qt4B + scores.prolongationB;
  if (statusId === "STR001" && totalA === totalB) fields.scores = "Un match joué ne peut pas se terminer à égalité.";
  if (Object.keys(fields).length) throw new CompetitionParticipationError("VALIDATION", "Veuillez corriger les champs indiqués.", 422, fields);
  const data = await load(deps); requireCompetition(data, competitionId); requireMutableEdition(data.competitionRows, competitionId);
  const match = data.matches.find((row) => clean(row.id_match) === matchId && clean(row.id_competition) === competitionId);
  if (!match) throw new CompetitionParticipationError("MATCH_INVALIDE", "Match introuvable pour cette compétition.", 422, { matchId: "Match indisponible." });
  if (!data.statuses.some((row) => clean(row.id_statut_resultat) === statusId)) throw new CompetitionParticipationError("STATUT_INVALIDE", "Statut de résultat invalide.", 422, { statutId: "Statut indisponible." });
  if (data.results.some((row) => clean(row.id_match) === matchId)) throw new CompetitionParticipationError("RESULTAT_DUPLIQUE", "Un résultat existe déjà pour ce match.", 409);
  const resultId = competitionEntityId("resultat", competitionId, data.results, "id_resultat"), played = statusId === "STR001";
  const resultValues = { id_resultat: resultId, id_match: matchId, qt1_a: played ? String(scores.qt1A) : "", qt1_b: played ? String(scores.qt1B) : "", qt2_a: played ? String(scores.qt2A) : "", qt2_b: played ? String(scores.qt2B) : "", qt3_a: played ? String(scores.qt3A) : "", qt3_b: played ? String(scores.qt3B) : "", qt4_a: played ? String(scores.qt4A) : "", qt4_b: played ? String(scores.qt4B) : "", prolongation_a: played ? String(scores.prolongationA) : "", prolongation_b: played ? String(scores.prolongationB) : "", score_total_a: played ? String(totalA) : "", score_total_b: played ? String(totalB) : "", id_unite_vainqueur: played ? clean(totalA > totalB ? match.id_unite_a : match.id_unite_b) : "", id_statut_resultat: statusId, observations };
  const groupPhaseIds = new Set(data.phases.filter((row) => clean(row.id_competition) === competitionId && isCompetitionGroupPhase(row)).map((row) => clean(row.id_phase_competition)));
  const shouldCalculateStandings = groupPhaseIds.has(clean(match.id_phase_competition));
  const allResults = [...data.results, resultValues], calculated = shouldCalculateStandings ? calculateStandings(data.matches, allResults, competitionId, groupPhaseIds) : [];
  const existing = new Map(data.standings.filter((row) => clean(row.id_competition) === competitionId).map((row) => [`${clean(row.id_phase_competition)}\u0000${clean(row.id_groupe)}\u0000${clean(row.id_unite_competition)}`, row]));
  const synthetic = [...data.standings];
  const writes: WriteRow[] = [{ sheet: "COMPETITIONS_RESULTATS", idHeader: "id_resultat", values: resultValues }];
  for (const row of calculated) {
    const key = `${row.phaseId}\u0000${row.groupId}\u0000${row.unitId}`, old = existing.get(key); const id = clean(old?.id_classement) || competitionEntityId("classement", competitionId, synthetic, "id_classement"); synthetic.push({ id_classement: id });
    writes.push({ sheet: "COMPETITIONS_CLASSEMENT", idHeader: "id_classement", values: { id_classement: id, id_competition: competitionId, id_phase_competition: row.phaseId, id_groupe: row.groupId, id_unite_competition: row.unitId, matchs_joues: String(row.played), victoires: String(row.wins), defaites: String(row.losses), points_pour: String(row.for), points_contre: String(row.against), difference_points: String(row.difference), points_classement: String(row.points), rang: String(row.rank), observations: clean(old?.observations) } });
  }
  await deps.upsertRows({ block: "competitions", rows: writes }); return { id: resultId };
}
