export function sortCompetitionsByStartDate<
  T extends { dateDebut: string; nom: string },
>(items: T[]): T[] {
  return [...items].sort(
    (a, b) =>
      b.dateDebut.localeCompare(a.dateDebut) ||
      a.nom.localeCompare(b.nom, "fr"),
  );
}
