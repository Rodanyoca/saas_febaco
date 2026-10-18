const nameCollator = new Intl.Collator("fr", { sensitivity: "base", ignorePunctuation: true })

export function sortAthletesAlphabetically<T extends Record<string, string>>(athletes: T[]): T[] {
  // Le tri stable conserve l’ordre d’entrée lorsque les noms sont équivalents.
  return [...athletes].sort((a, b) => nameCollator.compare(a.nom_complet, b.nom_complet))
}
