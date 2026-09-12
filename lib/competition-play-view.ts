export function pendingCompetitionMatches<T extends { id: string }>(
  matches: T[],
  resultMatchIds: Iterable<string>,
  submittedMatchIds: Iterable<string> = [],
) {
  const unavailable = new Set([...resultMatchIds, ...submittedMatchIds]);
  return matches.filter((match) => !unavailable.has(match.id));
}

export function createInitialCompetitionScores(): Record<string, string> {
  return {
    qt1A: "", qt1B: "", qt2A: "", qt2B: "", qt3A: "", qt3B: "", qt4A: "", qt4B: "",
    prolongationA: "0", prolongationB: "0",
  };
}

export function createInitialCompetitionMatchForm() {
  return {
    eventId: "",
    phaseId: "",
    groupId: "",
    unitA: "",
    unitB: "",
    date: "",
    heure: "",
  };
}

type QualificationPhase = {
  id: string;
  eventId: string;
  numero: string;
  statut: string;
};

export function competitionQualificationDestinations<T extends QualificationPhase>(phases: T[], sourcePhaseId: string) {
  const sourceIndex = phases.findIndex((phase) => phase.id === sourcePhaseId);
  if (sourceIndex < 0) return [];
  const source = phases[sourceIndex];
  const sourceOrder = Number(source.numero) || sourceIndex + 1;

  return phases.filter((phase, index) => {
    const phaseOrder = Number(phase.numero) || index + 1;
    return phase.eventId === source.eventId
      && phaseOrder > sourceOrder
      && phase.statut.toUpperCase() !== "INACTIF";
  });
}

type QualificationAssignment = {
  phaseId: string;
  unitId: string;
  statut: string;
};

export function competitionQualificationEligibleUnitIds(
  assignments: QualificationAssignment[],
  sourcePhaseId: string,
  destinationPhaseId: string,
) {
  const active = (assignment: QualificationAssignment) => assignment.statut.toUpperCase() !== "INACTIF";
  const destinationUnits = new Set(
    assignments.filter((assignment) => assignment.phaseId === destinationPhaseId && active(assignment)).map((assignment) => assignment.unitId),
  );

  return [...new Set(
    assignments
      .filter((assignment) => assignment.phaseId === sourcePhaseId && active(assignment) && !destinationUnits.has(assignment.unitId))
      .map((assignment) => assignment.unitId),
  )];
}
