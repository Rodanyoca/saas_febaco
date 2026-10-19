import { clean, type DataRow } from "./calculations"

export function competitionSeasonSummary(competitions: DataRow[], participants: DataRow[], seasons: DataRow[], currentYear = new Date().getFullYear()) {
  const seasonById = new Map(seasons.map(row => [clean(row.id_saison), row]))
  const yearOf = (competition: DataRow) => {
    const season = seasonById.get(clean(competition.id_saison))
    const label = clean(season?.nom_saison) || clean(competition.saison)
    const year = label.match(/\b(?:19|20)\d{2}\b/)?.[0]
      || clean(season?.date_debut).match(/^(?:19|20)\d{2}/)?.[0]
      || clean(competition.date_debut).match(/^(?:19|20)\d{2}/)?.[0]
    return year ? Number(year) : undefined
  }
  return Array.from({ length: 3 }, (_, index) => {
    const year = currentYear - index
    const rows = competitions.filter(row => yearOf(row) === year)
    const ids = new Set(rows.map(row => clean(row.id_competition) || clean(row.id)).filter(Boolean))
    const labels = [...new Set(rows.map(row => clean(seasonById.get(clean(row.id_saison))?.nom_saison) || clean(row.saison)).filter(Boolean))]
    return {
      label: labels.length ? labels.join(" · ") : String(year),
      competitions: rows.length,
      participants: participants.filter(row => ids.has(clean(row.id_competition)) && clean(row.statut_participation) !== "SUPPRIMEE").length,
    }
  })
}
