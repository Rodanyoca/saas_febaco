import { readSheetRows, writeSheetRowByHeaders, type SheetRow } from "@/lib/google-sheets";
import { CompetitionError } from "@/lib/competitions";
import { competitionEntityId } from "@/lib/competition-ids";

const clean = (value: unknown) => String(value ?? "").trim();
type Dependencies = { readRows: typeof readSheetRows; writeRow: typeof writeSheetRowByHeaders };
const defaults: Dependencies = { readRows: readSheetRows, writeRow: writeSheetRowByHeaders };

async function load(deps: Dependencies) {
  const comp = (sheet: string) => deps.readRows({ block: "competitions", sheet, range: "A:ZZ", fresh: true });
  const ref = (sheet: string) => deps.readRows({ block: "referentiel", sheet, range: "A:ZZ" });
  const [competitions, events, units, phases, matches, types, disciplines, seasons, categories, sexes] = await Promise.all([
    comp("COMPETITIONS"), comp("COMPETITIONS_EPREUVES"), comp("COMPETITIONS_UNITES"), comp("COMPETITIONS_PHASES"), comp("COMPETITIONS_MATCHS"),
    ref("TYPES_COMPETITIONS"), ref("DISCIPLINES"), ref("SAISON"), ref("CATEGORIES_AGE"), ref("SEXES"),
  ]);
  return { competitions, events, units, phases, matches, types, disciplines, seasons, categories, sexes };
}

const labelMap = (rows: SheetRow[], idKey: string, labelKey: string) => new Map(rows.map((row) => [clean(row[idKey]), clean(row[labelKey]) || clean(row[idKey])]));

export async function listCompetitionCatalog(deps: Dependencies = defaults) {
  const data = await load(deps);
  const types = labelMap(data.types, "id_type_competition", "nom_type_competition"), disciplines = labelMap(data.disciplines, "id_discipline", "nom_discipline"), seasons = labelMap(data.seasons, "id_saison", "nom_saison"), categories = labelMap(data.categories, "id_categorie_age", "nom_categorie_age"), sexes = labelMap(data.sexes, "id_sexe", "nom_sexe");
  const competitions = data.competitions.filter((row) => clean(row.id_competition)).map((row) => ({ id: clean(row.id_competition), numeroEdition: clean(row.numero_edition), nom: clean(row.nom_competition), typeId: clean(row.id_type_competition), type: types.get(clean(row.id_type_competition)) || clean(row.id_type_competition), disciplineId: clean(row.id_discipline), discipline: disciplines.get(clean(row.id_discipline)) || clean(row.id_discipline), saisonId: clean(row.id_saison), saison: seasons.get(clean(row.id_saison)) || clean(row.id_saison), dateDebut: clean(row.date_debut), dateFin: clean(row.date_fin), pays: clean(row.pays), lieu: clean(row.lieu), statut: clean(row.statut), observations: clean(row.observations) }));
  const epreuves = data.events.filter((row) => clean(row.id_epreuve_competition)).map((row) => {
    const id = clean(row.id_epreuve_competition), phaseIds = new Set(data.phases.filter((phase) => clean(phase.id_epreuve_competition) === id).map((phase) => clean(phase.id_phase_competition)));
    return { id, competitionId: clean(row.id_competition), nom: clean(row.nom_epreuve), disciplineId: clean(row.id_discipline), discipline: disciplines.get(clean(row.id_discipline)) || clean(row.id_discipline), categorieId: clean(row.id_categorie_age), categorie: categories.get(clean(row.id_categorie_age)) || clean(row.id_categorie_age), sexeId: clean(row.id_sexe), sexe: sexes.get(clean(row.id_sexe)) || clean(row.id_sexe), statut: clean(row.statut), observations: clean(row.observations), unitCount: data.units.filter((unit) => clean(unit.id_epreuve_competition) === id && clean(unit.statut).toUpperCase() !== "INACTIF").length, phaseCount: phaseIds.size, matchCount: data.matches.filter((match) => phaseIds.has(clean(match.id_phase_competition))).length };
  });
  return { competitions, epreuves, references: { types: [...types].map(([id, label]) => ({ id, label })), disciplines: [...disciplines].map(([id, label]) => ({ id, label })), seasons: [...seasons].map(([id, label]) => ({ id, label })), categories: [...categories].map(([id, label]) => ({ id, label })), sexes: [...sexes].map(([id, label]) => ({ id, label })) } };
}

function requireRef(rows: SheetRow[], idKey: string, id: string, field: string) {
  if (!rows.some((row) => clean(row[idKey]) === id)) throw new CompetitionError("REFERENCE_INVALIDE", "Une valeur sélectionnée est introuvable.", 422, { [field]: "Valeur inconnue." });
}

export async function createCompetitionEventTable(competitionId: string, body: unknown, deps: Dependencies = defaults) {
  const input = body && typeof body === "object" ? body as Record<string, unknown> : {}, nom = clean(input.nomEpreuve), disciplineId = clean(input.disciplineId), categorieId = clean(input.categorieId), sexeId = clean(input.sexeId), statut = clean(input.statut), data = await load(deps);
  const competition = data.competitions.find((row) => clean(row.id_competition) === competitionId);
  if (!competition) throw new CompetitionError("COMPETITION_INTROUVABLE", "La compétition n’existe pas.", 404);
  if (clean(competition.statut).toUpperCase() === "TERMINEE") throw new CompetitionError("COMPETITION_CLOTUREE", "Cette compétition est clôturée et consultable uniquement en historique.", 409);
  const fields: Record<string, string> = {};
  if (!nom) fields.nomEpreuve = "Nom obligatoire."; if (!disciplineId) fields.disciplineId = "Discipline obligatoire."; if (!categorieId) fields.categorieId = "Catégorie obligatoire."; if (!sexeId) fields.sexeId = "Sexe obligatoire."; if (!["ACTIF", "INACTIF"].includes(statut)) fields.statut = "Statut invalide.";
  if (Object.keys(fields).length) throw new CompetitionError("VALIDATION", "Veuillez corriger les champs indiqués.", 422, fields);
  requireRef(data.disciplines, "id_discipline", disciplineId, "disciplineId"); requireRef(data.categories, "id_categorie_age", categorieId, "categorieId"); requireRef(data.sexes, "id_sexe", sexeId, "sexeId");
  const id = competitionEntityId("epreuve", competitionId, data.events, "id_epreuve_competition");
  await deps.writeRow({ block: "competitions", sheet: "COMPETITIONS_EPREUVES", idHeader: "id_epreuve_competition", id, mode: "create", values: { id_epreuve_competition: id, id_competition: competitionId, nom_epreuve: nom, id_discipline: disciplineId, id_categorie_age: categorieId, id_sexe: sexeId, statut, observations: clean(input.observations) } });
  return { id };
}

export async function updateCompetitionEventTable(competitionId: string, eventId: string, body: unknown, deps: Dependencies = defaults) {
  const input = body && typeof body === "object" ? body as Record<string, unknown> : {}, data = await load(deps), id = clean(eventId), competition = data.competitions.find((row) => clean(row.id_competition) === competitionId), event = data.events.find((row) => clean(row.id_epreuve_competition) === id && clean(row.id_competition) === competitionId);
  if (!competition || !event) throw new CompetitionError("EPREUVE_INTROUVABLE", "L’épreuve n’existe pas dans cette compétition.", 404);
  if (clean(competition.statut).toUpperCase() === "TERMINEE") throw new CompetitionError("COMPETITION_CLOTUREE", "Cette compétition est clôturée.", 409);
  const nom = clean(input.nomEpreuve), statut = clean(input.statut), fields: Record<string, string> = {};
  if (!nom) fields.nomEpreuve = "Nom obligatoire."; if (!["ACTIF", "INACTIF"].includes(statut)) fields.statut = "Statut invalide.";
  if (Object.keys(fields).length) throw new CompetitionError("VALIDATION", "Veuillez corriger les champs indiqués.", 422, fields);
  await deps.writeRow({ block: "competitions", sheet: "COMPETITIONS_EPREUVES", idHeader: "id_epreuve_competition", id, mode: "update", values: { nom_epreuve: nom, statut, observations: clean(input.observations) } });
  return { id };
}
