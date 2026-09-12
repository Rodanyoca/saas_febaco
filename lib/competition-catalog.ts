import { readSheetRows, writeSheetRowByHeaders, type SheetRow } from "@/lib/google-sheets";
import { CompetitionError, generateCompetitionId } from "@/lib/competitions";
import { competitionEntityId } from "@/lib/competition-ids";

const clean = (value: unknown) => String(value ?? "").trim();
type Dependencies = { readRows: typeof readSheetRows; writeRow: typeof writeSheetRowByHeaders };
const defaults: Dependencies = { readRows: readSheetRows, writeRow: writeSheetRowByHeaders };

async function load(deps: Dependencies) {
  const comp = (sheet: string) => deps.readRows({ block: "competitions", sheet, range: "A:ZZ", fresh: true });
  const ref = (sheet: string) => deps.readRows({ block: "referentiel", sheet, range: "A:ZZ" });
  const [permanents, editions, events, units, phases, matches, types, disciplines, seasons, categories, sexes] = await Promise.all([
    comp("COMPETITIONS_PERMANENTES"), comp("COMPETITIONS"), comp("COMPETITIONS_EPREUVES"), comp("COMPETITIONS_UNITES"), comp("COMPETITIONS_PHASES"), comp("COMPETITIONS_MATCHS"), ref("TYPES_COMPETITIONS"), ref("DISCIPLINES"), ref("SAISON"), ref("CATEGORIES_AGE"), ref("SEXES"),
  ]);
  return { permanents, editions, events, units, phases, matches, types, disciplines, seasons, categories, sexes };
}

const labelMap = (rows: SheetRow[], idKey: string, labelKey: string) => new Map(rows.map((row) => [clean(row[idKey]), clean(row[labelKey]) || clean(row[idKey])]));

export async function listCompetitionCatalog(deps: Dependencies = defaults) {
  const data = await load(deps), types = labelMap(data.types, "id_type_competition", "nom_type_competition"), disciplines = labelMap(data.disciplines, "id_discipline", "nom_discipline"), seasons = labelMap(data.seasons, "id_saison", "nom_saison"), categories = labelMap(data.categories, "id_categorie_age", "nom_categorie_age"), sexes = labelMap(data.sexes, "id_sexe", "nom_sexe");
  const permanents = data.permanents.filter((row) => clean(row.id_competition_permanente)).map((row) => ({ id: clean(row.id_competition_permanente), nom: clean(row.nom_competition), typeId: clean(row.id_type_competition), type: types.get(clean(row.id_type_competition)) || clean(row.id_type_competition), disciplineId: clean(row.id_discipline), discipline: disciplines.get(clean(row.id_discipline)) || clean(row.id_discipline), statut: clean(row.statut), observations: clean(row.observations) }));
  const editions = data.editions.filter((row) => clean(row.id_competition)).map((row) => ({ id: clean(row.id_competition), permanentId: clean(row.id_competition_permanente), numeroEdition: clean(row.numero_edition), nom: clean(row.nom_competition), typeId: clean(row.id_type_competition), disciplineId: clean(row.id_discipline), discipline: disciplines.get(clean(row.id_discipline)) || clean(row.id_discipline), saisonId: clean(row.id_saison), saison: seasons.get(clean(row.id_saison)) || clean(row.id_saison), dateDebut: clean(row.date_debut), dateFin: clean(row.date_fin), pays: clean(row.pays), lieu: clean(row.lieu), statut: clean(row.statut), observations: clean(row.observations) }));
  const epreuves = data.events.filter((row) => clean(row.id_epreuve_competition)).map((row) => { const id=clean(row.id_epreuve_competition),phaseIds=new Set(data.phases.filter(p=>clean(p.id_epreuve_competition)===id).map(p=>clean(p.id_phase_competition))); return { id, competitionId: clean(row.id_competition), nom: clean(row.nom_epreuve), disciplineId: clean(row.id_discipline), discipline: disciplines.get(clean(row.id_discipline)) || clean(row.id_discipline), categorieId: clean(row.id_categorie_age), categorie: categories.get(clean(row.id_categorie_age)) || clean(row.id_categorie_age), sexeId: clean(row.id_sexe), sexe: sexes.get(clean(row.id_sexe)) || clean(row.id_sexe), statut: clean(row.statut), observations: clean(row.observations), unitCount:data.units.filter(x=>clean(x.id_epreuve_competition)===id&&clean(x.statut).toUpperCase()!=="INACTIF").length, phaseCount:phaseIds.size, matchCount:data.matches.filter(x=>phaseIds.has(clean(x.id_phase_competition))).length }; });
  return { permanents, editions, epreuves, references: { types: [...types].map(([id, label]) => ({ id, label })), disciplines: [...disciplines].map(([id, label]) => ({ id, label })), seasons: [...seasons].map(([id, label]) => ({ id, label })), categories: [...categories].map(([id, label]) => ({ id, label })), sexes: [...sexes].map(([id, label]) => ({ id, label })) } };
}

function requireRef(rows: SheetRow[], idKey: string, id: string, field: string) {
  if (!rows.some((row) => clean(row[idKey]) === id)) throw new CompetitionError("REFERENCE_INVALIDE", "Une valeur sélectionnée est introuvable.", 422, { [field]: "Valeur inconnue." });
}

export async function createPermanentCompetition(body: unknown, deps: Dependencies = defaults) {
  const input = body && typeof body === "object" ? body as Record<string, unknown> : {}, nom = clean(input.nomCompetition), typeId = clean(input.typeId), disciplineId = clean(input.disciplineId), statut = clean(input.statut), observations = clean(input.observations), data = await load(deps);
  const fields: Record<string, string> = {}; if (!nom) fields.nomCompetition = "Nom obligatoire."; if (!typeId) fields.typeId = "Type obligatoire."; if (!disciplineId) fields.disciplineId = "Discipline obligatoire."; if (!["ACTIF", "INACTIF"].includes(statut)) fields.statut = "Statut invalide.";
  if (Object.keys(fields).length) throw new CompetitionError("VALIDATION", "Veuillez corriger les champs indiqués.", 422, fields);
  requireRef(data.types, "id_type_competition", typeId, "typeId"); requireRef(data.disciplines, "id_discipline", disciplineId, "disciplineId");
  if (data.permanents.some((row) => clean(row.nom_competition).localeCompare(nom, "fr", { sensitivity: "base" }) === 0)) throw new CompetitionError("COMPETITION_PERMANENTE_DUPLIQUEE", "Une compétition permanente porte déjà ce nom.", 409, { nomCompetition: "Nom déjà utilisé." });
  const next = Math.max(0, ...data.permanents.map((row) => Number(clean(row.id_competition_permanente).match(/^BKB-CPT-(\d+)$/)?.[1])).filter(Number.isFinite)) + 1, id = `BKB-CPT-${String(next).padStart(3, "0")}`;
  await deps.writeRow({ block: "competitions", sheet: "COMPETITIONS_PERMANENTES", idHeader: "id_competition_permanente", id, mode: "create", values: { id_competition_permanente: id, nom_competition: nom, id_type_competition: typeId, id_discipline: disciplineId, statut, observations } }); return { id };
}

export async function createCompetitionEvent(body: unknown, deps: Dependencies = defaults) {
  const input = body && typeof body === "object" ? body as Record<string, unknown> : {}, permanentId = clean(input.permanentId), nom = clean(input.nomCompetition), disciplineId = clean(input.disciplineId), saisonId = clean(input.saisonId), dateDebut = clean(input.dateDebut), dateFin = clean(input.dateFin), pays = clean(input.pays), lieu = clean(input.lieu), statut = clean(input.statut), data = await load(deps);
  const permanent = data.permanents.find((row) => clean(row.id_competition_permanente) === permanentId); if (!permanent) throw new CompetitionError("COMPETITION_PERMANENTE_INVALIDE", "La compétition permanente n’existe pas.", 422, { permanentId: "Compétition permanente introuvable." });
  const fields: Record<string, string> = {}; for (const [key, value] of Object.entries({ nomCompetition: nom, disciplineId, saisonId, dateDebut, dateFin, pays, lieu, statut })) if (!value) fields[key] = "Ce champ est obligatoire."; if (dateDebut && dateFin && dateFin < dateDebut) fields.dateFin = "La date de fin ne peut pas précéder la date de début."; if (Object.keys(fields).length) throw new CompetitionError("VALIDATION", "Veuillez corriger les champs indiqués.", 422, fields);
  requireRef(data.disciplines, "id_discipline", disciplineId, "disciplineId"); requireRef(data.seasons, "id_saison", saisonId, "saisonId");
  const season = data.seasons.find((row) => clean(row.id_saison) === saisonId)!, id = generateCompetitionId(data.editions, clean(season.nom_saison));
  await deps.writeRow({ block: "competitions", sheet: "COMPETITIONS", idHeader: "id_competition", id, mode: "create", values: { id_competition: id, id_competition_permanente: permanentId, numero_edition: clean(input.numeroEdition), nom_competition: nom, id_type_competition: clean(permanent.id_type_competition), id_discipline: disciplineId, id_saison: saisonId, date_debut: dateDebut, date_fin: dateFin, pays, lieu, statut, observations: clean(input.observations) } }); return { id };
}

export async function createCompetitionEventTable(competitionId: string, body: unknown, deps: Dependencies = defaults) {
  const input = body && typeof body === "object" ? body as Record<string, unknown> : {}, nom = clean(input.nomEpreuve), disciplineId = clean(input.disciplineId), categorieId = clean(input.categorieId), sexeId = clean(input.sexeId), statut = clean(input.statut), data = await load(deps);
  const edition=data.editions.find((row) => clean(row.id_competition) === competitionId); if (!edition) throw new CompetitionError("EDITION_INTROUVABLE", "L’édition n’existe pas.", 404);
  if(clean(edition.statut).toUpperCase()==="TERMINEE")throw new CompetitionError("EDITION_CLOTUREE","Cette édition est clôturée et consultable uniquement en historique.",409);
  const fields: Record<string, string> = {}; if (!nom) fields.nomEpreuve = "Nom obligatoire."; if (!disciplineId) fields.disciplineId = "Discipline obligatoire."; if (!categorieId) fields.categorieId = "Catégorie obligatoire."; if (!sexeId) fields.sexeId = "Sexe obligatoire."; if (!["ACTIF", "INACTIF"].includes(statut)) fields.statut = "Statut invalide."; if (Object.keys(fields).length) throw new CompetitionError("VALIDATION", "Veuillez corriger les champs indiqués.", 422, fields);
  requireRef(data.disciplines, "id_discipline", disciplineId, "disciplineId"); requireRef(data.categories, "id_categorie_age", categorieId, "categorieId"); requireRef(data.sexes, "id_sexe", sexeId, "sexeId");
  const id = competitionEntityId("epreuve", competitionId, data.events, "id_epreuve_competition");
  await deps.writeRow({ block: "competitions", sheet: "COMPETITIONS_EPREUVES", idHeader: "id_epreuve_competition", id, mode: "create", values: { id_epreuve_competition: id, id_competition: competitionId, nom_epreuve: nom, id_discipline: disciplineId, id_categorie_age: categorieId, id_sexe: sexeId, statut, observations: clean(input.observations) } }); return { id };
}

export async function updateCompetitionEventTable(competitionId:string,eventId:string,body:unknown,deps:Dependencies=defaults){
 const input=body&&typeof body==="object"?body as Record<string,unknown>:{},data=await load(deps),id=clean(eventId),edition=data.editions.find(row=>clean(row.id_competition)===competitionId),event=data.events.find(row=>clean(row.id_epreuve_competition)===id&&clean(row.id_competition)===competitionId);
 if(!edition||!event)throw new CompetitionError("EPREUVE_INTROUVABLE","L’épreuve n’existe pas dans cette édition.",404);if(clean(edition.statut).toUpperCase()==="TERMINEE")throw new CompetitionError("EDITION_CLOTUREE","Cette édition est clôturée.",409);
 const nom=clean(input.nomEpreuve),statut=clean(input.statut),fields:Record<string,string>={};if(!nom)fields.nomEpreuve="Nom obligatoire.";if(!["ACTIF","INACTIF"].includes(statut))fields.statut="Statut invalide.";if(Object.keys(fields).length)throw new CompetitionError("VALIDATION","Veuillez corriger les champs indiqués.",422,fields);
 await deps.writeRow({block:"competitions",sheet:"COMPETITIONS_EPREUVES",idHeader:"id_epreuve_competition",id,mode:"update",values:{nom_epreuve:nom,statut,observations:clean(input.observations)}});return{id};
}
