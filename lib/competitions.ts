import {
  readSheetRows,
  writeSheetRowByHeaders,
  type SheetRow,
} from "@/lib/google-sheets";
import { sortCompetitionsByStartDate } from "@/lib/competition-client";

export type CompetitionInput = Record<string, string>;
export type CompetitionOption = { id: string; label: string };
export class CompetitionError extends Error {
  constructor(
    public code: string,
    message: string,
    public status = 400,
    public fields: Record<string, string> = {},
  ) {
    super(message);
  }
}

type Deps = {
  readRows: typeof readSheetRows;
  writeRow: typeof writeSheetRowByHeaders;
};
const defaults: Deps = {
  readRows: readSheetRows,
  writeRow: writeSheetRowByHeaders,
};
const fields = [
  "nom_competition",
  "id_type_competition",
  "id_discipline",
  "id_saison",
  "date_debut",
  "date_fin",
  "pays",
  "statut",
  "observations",
];
const clean = (value: unknown) => String(value ?? "").trim();

export function validateCompetitionInput(body: unknown) {
  const source =
    body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  const values = Object.fromEntries(
    fields.map((field) => [field, clean(source[field])]),
  );
  const errors: Record<string, string> = {};
  for (const field of fields.filter((field) => field !== "observations"))
    if (!values[field]) errors[field] = "Ce champ est obligatoire.";
  if (values.date_debut && !/^\d{4}-\d{2}-\d{2}$/.test(values.date_debut))
    errors.date_debut = "Date invalide.";
  if (values.date_fin && !/^\d{4}-\d{2}-\d{2}$/.test(values.date_fin))
    errors.date_fin = "Date invalide.";
  if (
    values.date_debut &&
    values.date_fin &&
    values.date_fin < values.date_debut
  )
    errors.date_fin = "La date de fin ne peut pas précéder la date de début.";
  if (
    values.statut &&
    !["PLANIFIEE", "EN_COURS", "TERMINEE", "ANNULEE"].includes(values.statut)
  )
    errors.statut = "Statut invalide.";
  return { values, errors };
}

export function generateCompetitionId(
  rows: SheetRow[],
  seasonLabel: string,
): string {
  const year =
    clean(seasonLabel).match(/\d{4}/)?.[0] ??
    String(new Date().getUTCFullYear());
  const pattern = new RegExp(`^BKB-COMP-${year}-(\\d{3})$`);
  const used = new Set(rows.map((row) => clean(row.id_competition)));
  let next =
    Math.max(
      0,
      ...[...used]
        .map((id) => Number(id.match(pattern)?.[1] ?? NaN))
        .filter(Number.isFinite),
    ) + 1;
  let id = `BKB-COMP-${year}-${String(next).padStart(3, "0")}`;
  while (used.has(id))
    id = `BKB-COMP-${year}-${String(++next).padStart(3, "0")}`;
  return id;
}

async function options(
  deps: Deps,
  block: "referentiel",
  sheet: string,
  idKey: string,
  labelKey: string,
  fresh = false,
): Promise<CompetitionOption[]> {
  return (await deps.readRows({ block, sheet, range: "A:ZZ", fresh }))
    .map((row) => ({
      id: clean(row[idKey]),
      label: clean(row[labelKey]) || clean(row[idKey]),
    }))
    .filter((item) => item.id);
}

export async function getCompetitionReferences(deps: Deps = defaults) {
  const [types, disciplines, seasons] = await Promise.all([
    options(
      deps,
      "referentiel",
      "TYPES_COMPETITIONS",
      "id_type_competition",
      "nom_type_competition",
    ),
    options(
      deps,
      "referentiel",
      "DISCIPLINES",
      "id_discipline",
      "nom_discipline",
    ),
    options(deps, "referentiel", "SAISON", "id_saison", "nom_saison", true),
  ]);
  seasons.sort((a, b) => b.label.localeCompare(a.label, "fr", { numeric: true }));
  return { types, disciplines, seasons };
}

export async function listCompetitions(deps: Deps = defaults) {
  const [rows, refs] = await Promise.all([
    deps.readRows({
      block: "competitions",
      sheet: "COMPETITIONS",
      range: "A:ZZ",
      fresh: true,
    }),
    getCompetitionReferences(deps),
  ]);
  const maps = {
    type: new Map(refs.types.map((item) => [item.id, item.label])),
    discipline: new Map(refs.disciplines.map((item) => [item.id, item.label])),
    season: new Map(refs.seasons.map((item) => [item.id, item.label])),
  };
  return sortCompetitionsByStartDate(rows
    .filter((row) => clean(row.id_competition))
    .map((row, index) => {
      const id = clean(row.id_competition),
        typeId = clean(row.id_type_competition),
        disciplineId = clean(row.id_discipline),
        seasonId = clean(row.id_saison);
      return {
        ...row,
        __key: `${id}__${index}`,
        id,
        nom: clean(row.nom_competition),
        typeCompetitionId: typeId,
        typeCompetition: maps.type.get(typeId) || typeId,
        disciplineId,
        discipline: maps.discipline.get(disciplineId) || disciplineId,
        saisonId: seasonId,
        saison: maps.season.get(seasonId) || "Saison non référencée",
        saisonReferenceManquante: !maps.season.has(seasonId),
        dateDebut: clean(row.date_debut),
        dateFin: clean(row.date_fin),
        pays: clean(row.pays),
        statut: clean(row.statut),
        observation: clean(row.observations),
      };
    }));
}

export async function createCompetition(body: unknown, deps: Deps = defaults) {
  const { values, errors } = validateCompetitionInput(body);
  if (Object.keys(errors).length)
    throw new CompetitionError(
      "VALIDATION",
      "Veuillez corriger les champs indiqués.",
      422,
      errors,
    );
  const [rows, refs] = await Promise.all([
    deps.readRows({
      block: "competitions",
      sheet: "COMPETITIONS",
      range: "A:ZZ",
      fresh: true,
    }),
    getCompetitionReferences(deps),
  ]);
  const checks: Array<[string, CompetitionOption[]]> = [
    ["id_type_competition", refs.types],
    ["id_discipline", refs.disciplines],
    ["id_saison", refs.seasons],
  ];
  for (const [field, list] of checks)
    if (!list.some((item) => item.id === values[field]))
      throw new CompetitionError(
        "REFERENCE_INVALIDE",
        "Une valeur sélectionnée est introuvable.",
        422,
        { [field]: "Valeur inconnue." },
      );
  const season = refs.seasons.find((item) => item.id === values.id_saison)!;
  const id = generateCompetitionId(rows, season.label);
  await deps.writeRow({
    block: "competitions",
    sheet: "COMPETITIONS",
    idHeader: "id_competition",
    id,
    values,
    mode: "create",
  });
  return (await listCompetitions(deps)).find((item) => item.id === id)!;
}

export async function updateCompetition(id: string, body: unknown, deps: Deps = defaults) {
  const competitionId = clean(id);
  const { values, errors } = validateCompetitionInput(body);
  if (Object.keys(errors).length) throw new CompetitionError("VALIDATION", "Veuillez corriger les champs indiqués.", 422, errors);
  const [rows, refs] = await Promise.all([deps.readRows({ block: "competitions", sheet: "COMPETITIONS", range: "A:ZZ", fresh: true }), getCompetitionReferences(deps)]);
  if (!rows.some((row) => clean(row.id_competition) === competitionId)) throw new CompetitionError("INTROUVABLE", "La compétition n’existe pas.", 404);
  for (const [field, list] of [["id_type_competition", refs.types], ["id_discipline", refs.disciplines], ["id_saison", refs.seasons]] as Array<[string, CompetitionOption[]]>)
    if (!list.some((item) => item.id === values[field])) throw new CompetitionError("REFERENCE_INVALIDE", "Une valeur sélectionnée est introuvable.", 422, { [field]: field === "id_saison" ? "Saison non référencée." : "Valeur inconnue." });
  await deps.writeRow({ block: "competitions", sheet: "COMPETITIONS", idHeader: "id_competition", id: competitionId, values, mode: "update" });
  return (await listCompetitions(deps)).find((item) => item.id === competitionId)!;
}
