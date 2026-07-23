import crypto from "crypto"
import path from "path"
import { readFile } from "fs/promises"

import ExcelJS from "exceljs"
import JSZip from "jszip"

import type {
  CompetitionAthleteRow,
  CompetitionStructureRow,
} from "@/lib/import-export/template-types"

const TEMPLATE_PATH = path.join(process.cwd(), "templates", "GABARIT_MAITRE_COMPETITIONS_FEBACO.xlsx")
const REQUIRED_SHEETS = [
  "INSTRUCTIONS", "PARAMETRES", "LISTES_VALIDATION", "REFERENCES_STRUCTURE",
  "ATHLETES", "COMPETITIONS_UNITES", "COMPETITIONS_PARTICIPANTS",
  "COMPETITIONS_RESULTATS", "COMPETITIONS_CLASSEMENT",
]
const HEADERS = {
  REFERENCES_STRUCTURE: ["id_equipe", "nom_equipe", "id_club", "nom_club", "id_entente", "nom_entente", "id_ligue", "nom_ligue", "statut_equipe"],
  ATHLETES: ["participe_competition", "id_athlete", "nom_athlete", "sexe", "date_de_naissance", "id_poste", "nom_poste", "id_equipe", "nom_equipe", "id_club", "nom_club", "id_entente", "nom_entente", "id_ligue", "nom_ligue", "statut_athlete", "statut_affiliation", "observation_selection"],
  COMPETITIONS_UNITES: ["id_unite", "id_competition", "nom_competition", "saison", "id_equipe", "nom_equipe", "id_club", "nom_club", "poule", "statut_unite", "observation"],
}

export class CompetitionTemplateError extends Error {
  constructor(message: string, public readonly code: "TEMPLATE_NOT_FOUND" | "INVALID_TEMPLATE" | "LIMIT_EXCEEDED" | "EXCEL_ERROR") {
    super(message)
  }
}

type CompetitionContext = {
  id: string
  nom: string
  saison: string
  dateDebut: string
  dateFin: string
  lieu: string
  statut: string
}

type GenerateOptions = {
  competition: CompetitionContext
  generatedBy: string
  structures: CompetitionStructureRow[]
  athletes: CompetitionAthleteRow[]
}

const text = (value: unknown) => String(value ?? "").trim()
const safe = (value: string) => value.replace(/[<>:"/\\|?*\u0000-\u001F]+/g, "-").replace(/\s+/g, "_") || "NA"

async function loadWorkbook(): Promise<ExcelJS.Workbook> {
  let source: Buffer
  try {
    source = await readFile(TEMPLATE_PATH)
  } catch {
    throw new CompetitionTemplateError("Le gabarit maître de compétition est introuvable.", "TEMPLATE_NOT_FOUND")
  }
  try {
    const archive = await JSZip.loadAsync(source)
    await Promise.all(Object.keys(archive.files).filter((name) => name.endsWith(".xml")).map(async (name) => {
      const file = archive.file(name)
      if (!file) return
      const xml = await file.async("string")
      if (xml.includes("xmlns:x=")) {
        archive.file(name, xml.replace(/<\/?x:/g, (tag) => tag.replace("x:", "")).replace(/xmlns:x=/g, "xmlns="))
      }
    }))
    const workbook = new ExcelJS.Workbook()
    await workbook.xlsx.load(await archive.generateAsync({ type: "nodebuffer" }) as never)
    return workbook
  } catch (error) {
    console.error("[competition-template] Lecture Excel impossible", error)
    throw new CompetitionTemplateError("La génération du fichier Excel a échoué.", "EXCEL_ERROR")
  }
}

function assertHeaders(sheet: ExcelJS.Worksheet, expected: string[]) {
  const actual = expected.map((_, index) => text(sheet.getCell(1, index + 1).value))
  if (actual.some((value, index) => value !== expected[index])) {
    throw new CompetitionTemplateError(`Les en-têtes de ${sheet.name} sont invalides.`, "INVALID_TEMPLATE")
  }
}

function setParameter(sheet: ExcelJS.Worksheet, name: string, value: string) {
  for (let row = 2; row <= sheet.rowCount; row += 1) {
    if (text(sheet.getCell(row, 1).value).toLowerCase() === name.toLowerCase()) {
      const cell = sheet.getCell(row, 2)
      cell.numFmt = "@"
      cell.value = value
      return
    }
  }
  throw new CompetitionTemplateError(`Le paramètre ${name} est absent.`, "INVALID_TEMPLATE")
}

function clearRange(sheet: ExcelJS.Worksheet, fromRow: number, toRow: number, fromColumn: number, toColumn: number) {
  for (let row = fromRow; row <= toRow; row += 1) {
    for (let column = fromColumn; column <= toColumn; column += 1) sheet.getCell(row, column).value = null
  }
}

async function enableRecalculation(buffer: Buffer): Promise<Buffer> {
  const archive = await JSZip.loadAsync(buffer)
  const file = archive.file("xl/workbook.xml")
  if (!file) throw new CompetitionTemplateError("Structure Excel incomplète.", "INVALID_TEMPLATE")
  let xml = await file.async("string")
  const calc = '<calcPr calcMode="auto" fullCalcOnLoad="1" forceFullCalc="1"/>'
  xml = /<calcPr\b[^>]*\/>/.test(xml) ? xml.replace(/<calcPr\b[^>]*\/>/, calc) : xml.replace("</workbook>", `${calc}</workbook>`)
  archive.file("xl/workbook.xml", xml)
  return archive.generateAsync({ type: "nodebuffer" })
}

function validate(workbook: ExcelJS.Workbook, teamCount: number, athleteCount: number) {
  for (const name of REQUIRED_SHEETS) {
    if (!workbook.getWorksheet(name)) throw new CompetitionTemplateError(`La feuille ${name} est absente.`, "INVALID_TEMPLATE")
  }
  for (const [name, headers] of Object.entries(HEADERS)) assertHeaders(workbook.getWorksheet(name)!, headers)
  const parameters = workbook.getWorksheet("PARAMETRES")!
  const references = workbook.getWorksheet("REFERENCES_STRUCTURE")!
  const athletes = workbook.getWorksheet("ATHLETES")!
  const units = workbook.getWorksheet("COMPETITIONS_UNITES")!
  for (const address of ["B2", "B3", "B4", "B5", "B10", "B12", "B13", "B14", "B15"]) {
    if (!text(parameters.getCell(address).value)) throw new CompetitionTemplateError(`Paramètre vide en ${address}.`, "INVALID_TEMPLATE")
  }
  if (teamCount < 1 || !text(references.getCell("A2").value) || !text(units.getCell("A2").value)) {
    throw new CompetitionTemplateError("Les unités ou références n’ont pas été injectées.", "INVALID_TEMPLATE")
  }
  if (athleteCount && !text(athletes.getCell("B2").value)) {
    throw new CompetitionTemplateError("Les athlètes actifs n’ont pas été injectés.", "INVALID_TEMPLATE")
  }
  if (!athletes.getCell("A2").dataValidation?.type || !units.getCell("J2").dataValidation?.type) {
    throw new CompetitionTemplateError("Les validations du gabarit sont absentes.", "INVALID_TEMPLATE")
  }
  const results = workbook.getWorksheet("COMPETITIONS_RESULTATS")!
  for (const address of ["X2", "Y2", "Z2", "AA2", "X1001", "Y1001", "Z1001", "AA1001"]) {
    const formula = results.getCell(address).formula ?? ""
    if (!formula || formula.includes("#REF!")) throw new CompetitionTemplateError(`Formule invalide en ${address}.`, "INVALID_TEMPLATE")
  }
}

export async function generateCompetitionTemplate(options: GenerateOptions) {
  if (options.structures.length > 200) throw new CompetitionTemplateError("Le gabarit accepte au maximum 200 équipes.", "LIMIT_EXCEEDED")
  if (options.athletes.length > 500) throw new CompetitionTemplateError("Le gabarit accepte au maximum 500 athlètes.", "LIMIT_EXCEEDED")
  const workbook = await loadWorkbook()
  const parameters = workbook.getWorksheet("PARAMETRES")!
  const references = workbook.getWorksheet("REFERENCES_STRUCTURE")!
  const athletesSheet = workbook.getWorksheet("ATHLETES")!
  const units = workbook.getWorksheet("COMPETITIONS_UNITES")!
  for (const [name, headers] of Object.entries(HEADERS)) assertHeaders(workbook.getWorksheet(name)!, headers)

  const now = new Date().toISOString()
  const version = text(parameters.getCell("B11").value) || "1.0"
  const params: Record<string, string> = {
    action: "PREPARER_COMPETITION",
    saison: options.competition.saison,
    id_competition: options.competition.id,
    nom_competition: options.competition.nom,
    date_debut: options.competition.dateDebut,
    date_fin: options.competition.dateFin,
    lieu: options.competition.lieu,
    statut_competition: options.competition.statut,
    date_generation: now,
    version_gabarit: version,
    genere_par: options.generatedBy,
    id_fiche: `COMP-${safe(options.competition.saison)}-${safe(options.competition.id)}-${now.slice(0, 10).replace(/-/g, "")}-${crypto.randomBytes(2).toString("hex").toUpperCase()}`,
    nombre_equipes_selectionnees: String(options.structures.length),
    nombre_athletes_actifs: String(options.athletes.length),
  }
  Object.entries(params).forEach(([name, value]) => setParameter(parameters, name, value))

  clearRange(references, 2, 500, 1, 9)
  options.structures.forEach((item, index) => {
    const values = [item.idEquipe, item.nomEquipe, item.idClub, item.nomClub, item.idEntente, item.nomEntente, item.idLigue, item.nomLigue, item.statutEquipe]
    values.forEach((value, column) => {
      const cell = references.getCell(index + 2, column + 1)
      if ([1, 3, 5, 7].includes(column + 1)) cell.numFmt = "@"
      cell.value = value
    })
  })

  clearRange(units, 2, 201, 1, 9)
  clearRange(units, 2, 201, 11, 11)
  options.structures.forEach((item, index) => {
    const row = index + 2
    const values = [
      `UNIT-${options.competition.id}-${item.idEquipe}`, options.competition.id,
      options.competition.nom, options.competition.saison, item.idEquipe,
      item.nomEquipe, item.idClub, item.nomClub,
    ]
    values.forEach((value, column) => {
      const cell = units.getCell(row, column + 1)
      if ([1, 2, 5, 7].includes(column + 1)) cell.numFmt = "@"
      cell.value = value
    })
    units.getCell(row, 10).value = "PREVU"
  })

  clearRange(athletesSheet, 2, 501, 2, 18)
  options.athletes.forEach((item, index) => {
    const row = index + 2
    athletesSheet.getCell(row, 1).value = "NON"
    const values = [
      item.idAthlete, item.nomAthlete, item.sexe, item.dateNaissance,
      item.idPoste, item.nomPoste, item.idEquipe, item.nomEquipe,
      item.idClub, item.nomClub, item.idEntente, item.nomEntente,
      item.idLigue, item.nomLigue, item.statutAthlete, item.statutAffiliation,
    ]
    values.forEach((value, column) => {
      const cell = athletesSheet.getCell(row, column + 2)
      if ([2, 6, 8, 10, 12, 14].includes(column + 2)) cell.numFmt = "@"
      cell.value = value
    })
  })

  workbook.calcProperties.fullCalcOnLoad = true
  validate(workbook, options.structures.length, options.athletes.length)
  try {
    const buffer = await enableRecalculation(Buffer.from(await workbook.xlsx.writeBuffer()))
    return {
      buffer,
      fileName: `COMPETITION_${safe(options.competition.saison)}_${safe(options.competition.id)}.xlsx`,
      teamsCount: options.structures.length,
      athletesCount: options.athletes.length,
    }
  } catch (error) {
    if (error instanceof CompetitionTemplateError) throw error
    console.error("[competition-template] Écriture impossible", error)
    throw new CompetitionTemplateError("La génération du fichier Excel a échoué.", "EXCEL_ERROR")
  }
}
