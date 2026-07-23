import crypto from "crypto"
import path from "path"
import { readFile } from "fs/promises"

import ExcelJS from "exceljs"
import JSZip from "jszip"

import type { NewAthletesReferenceRow } from "@/lib/import-export/template-types"

const TEMPLATE_PATH = path.join(process.cwd(), "templates", "GABARIT_MAITRE_NOUVEAUX_ATHLETES.xlsx")
const REQUIRED_SHEETS = ["INSTRUCTIONS", "PARAMETRES", "REFERENCES_STRUCTURE", "LISTES_VALIDATION", "NOUVEAUX_ATHLETES"]
const REFERENCE_HEADERS = ["id_equipe", "nom_equipe", "id_club", "nom_club", "id_entente", "nom_entente", "id_ligue", "nom_ligue", "statut_equipe"]
const ATHLETE_HEADERS = ["nom_complet", "date_de_naissance", "lieu_de_naissance", "sexe", "nationalite", "telephone", "email", "adresse", "id_equipe_beneficiaire", "nom_equipe_beneficiaire", "id_club_beneficiaire", "club_beneficiaire", "id_entente", "entente", "id_ligue", "ligue", "date_debut_affiliation", "date_fin_affiliation", "statut_affiliation", "observation"]
const FORMULA_COLUMNS = [
  { column: "J", lookupColumn: 2 },
  { column: "K", lookupColumn: 3 },
  { column: "L", lookupColumn: 4 },
  { column: "M", lookupColumn: 5 },
  { column: "N", lookupColumn: 6 },
  { column: "O", lookupColumn: 7 },
  { column: "P", lookupColumn: 8 },
]

export class TemplateGenerationError extends Error {
  constructor(message: string, public readonly code: "TEMPLATE_NOT_FOUND" | "INVALID_TEMPLATE" | "EXCEL_ERROR") {
    super(message)
  }
}

type GenerateTemplateOptions = {
  season: string
  leagueId: string
  leagueName: string
  ententeId: string
  ententeName: string
  generatedBy: string
  references: NewAthletesReferenceRow[]
}

const text = (value: unknown) => String(value ?? "").trim()

function safeFilePart(value: string): string {
  return value.replace(/[<>:"/\\|?*\u0000-\u001F]+/g, "-").replace(/\s+/g, "_").replace(/^-+|-+$/g, "") || "NA"
}

async function loadWorkbookCopy(): Promise<ExcelJS.Workbook> {
  let source: Buffer
  try {
    source = await readFile(TEMPLATE_PATH)
  } catch {
    throw new TemplateGenerationError("Le gabarit maître est introuvable.", "TEMPLATE_NOT_FOUND")
  }

  try {
    // Le fichier fourni utilise le préfixe XML `x:`. ExcelJS attend le namespace
    // principal sans préfixe : la normalisation reste strictement en mémoire.
    const archive = await JSZip.loadAsync(source)
    const xmlFiles = Object.keys(archive.files).filter((name) => name.endsWith(".xml"))
    await Promise.all(xmlFiles.map(async (name) => {
      const file = archive.file(name)
      if (!file) return
      const xml = await file.async("string")
      if (!xml.includes("xmlns:x=")) return
      archive.file(name, xml.replace(/<\/?x:/g, (tag) => tag.replace("x:", "")).replace(/xmlns:x=/g, "xmlns="))
    }))
    const normalized = await archive.generateAsync({ type: "nodebuffer" })
    const workbook = new ExcelJS.Workbook()
    await workbook.xlsx.load(normalized as never)
    return workbook
  } catch (error) {
    console.error("[new-athletes-template] Lecture Excel impossible", error)
    throw new TemplateGenerationError("La génération du fichier Excel a échoué.", "EXCEL_ERROR")
  }
}

function assertHeaders(sheet: ExcelJS.Worksheet, expected: string[]) {
  const actual = expected.map((_, index) => text(sheet.getCell(1, index + 1).value))
  if (actual.some((header, index) => header !== expected[index])) {
    throw new TemplateGenerationError(`Les en-têtes de la feuille ${sheet.name} sont invalides.`, "INVALID_TEMPLATE")
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
  throw new TemplateGenerationError(`Le paramètre ${name} est absent du gabarit.`, "INVALID_TEMPLATE")
}

function rewriteAthleteFormulas(sheet: ExcelJS.Worksheet) {
  for (let row = 2; row <= 201; row += 1) {
    for (const { column, lookupColumn } of FORMULA_COLUMNS) {
      sheet.getCell(`${column}${row}`).value = {
        formula: `IF($I${row}="","",IFERROR(VLOOKUP($I${row},REFERENCES_STRUCTURE!$A:$I,${lookupColumn},FALSE),""))`,
      }
    }
  }
}

function validateGeneratedWorkbook(workbook: ExcelJS.Workbook, referencesCount: number) {
  for (const name of REQUIRED_SHEETS) {
    if (!workbook.getWorksheet(name)) throw new TemplateGenerationError(`La feuille ${name} est absente.`, "INVALID_TEMPLATE")
  }
  const parameters = workbook.getWorksheet("PARAMETRES")!
  const references = workbook.getWorksheet("REFERENCES_STRUCTURE")!
  const athletes = workbook.getWorksheet("NOUVEAUX_ATHLETES")!
  assertHeaders(references, REFERENCE_HEADERS)
  assertHeaders(athletes, ATHLETE_HEADERS)
  if (referencesCount < 1 || !text(references.getCell("A2").value)) {
    throw new TemplateGenerationError("Aucune référence structurelle n’a été injectée.", "INVALID_TEMPLATE")
  }
  for (const address of ["B2", "B3", "B4", "B6", "B8", "B10", "B11"]) {
    if (!text(parameters.getCell(address).value)) throw new TemplateGenerationError(`Le paramètre ${address} est vide.`, "INVALID_TEMPLATE")
  }
  if (text(athletes.getCell("I2").value)) throw new TemplateGenerationError("La zone de saisie des athlètes n’est pas vierge.", "INVALID_TEMPLATE")
  for (let row = 2; row <= 201; row += 1) {
    for (const { column } of FORMULA_COLUMNS) {
      const formula = athletes.getCell(`${column}${row}`).formula ?? ""
      if (!formula || formula.includes("#REF!")) throw new TemplateGenerationError(`Formule invalide en ${column}${row}.`, "INVALID_TEMPLATE")
    }
  }
  for (const address of ["D2", "E2", "I2", "S2", "D201", "E201", "I201", "S201"]) {
    if (!athletes.getCell(address).dataValidation?.type) {
      throw new TemplateGenerationError(`Validation absente en ${address}.`, "INVALID_TEMPLATE")
    }
  }
}

export async function generateNewAthletesTemplate(options: GenerateTemplateOptions) {
  if (!options.references.length) throw new TemplateGenerationError("Aucune équipe n’a été trouvée pour cette entente.", "INVALID_TEMPLATE")
  const workbook = await loadWorkbookCopy()
  const parameters = workbook.getWorksheet("PARAMETRES")
  const referencesSheet = workbook.getWorksheet("REFERENCES_STRUCTURE")
  const athletes = workbook.getWorksheet("NOUVEAUX_ATHLETES")
  if (!parameters || !referencesSheet || !athletes) throw new TemplateGenerationError("La structure du gabarit est invalide.", "INVALID_TEMPLATE")

  assertHeaders(referencesSheet, REFERENCE_HEADERS)
  assertHeaders(athletes, ATHLETE_HEADERS)
  const generatedAt = new Date().toISOString()
  const idFiche = `ATH-${safeFilePart(options.season)}-${safeFilePart(options.ententeId)}-${generatedAt.slice(0, 10).replace(/-/g, "")}-${crypto.randomBytes(2).toString("hex").toUpperCase()}`
  const currentVersion = text(parameters.getCell("B9").value) || "1.0"
  const parameterValues: Record<string, string> = {
    action: "AJOUT_NOUVEAUX_ATHLETES",
    saison: options.season,
    id_ligue: options.leagueId,
    nom_ligue: options.leagueName,
    id_entente: options.ententeId,
    nom_entente: options.ententeName,
    date_generation: generatedAt,
    version_gabarit: currentVersion,
    genere_par: options.generatedBy,
    id_fiche: idFiche,
  }
  Object.entries(parameterValues).forEach(([name, value]) => setParameter(parameters, name, value))

  for (let row = 2; row <= 5000; row += 1) {
    for (let column = 1; column <= REFERENCE_HEADERS.length; column += 1) referencesSheet.getCell(row, column).value = null
  }
  options.references.forEach((reference, index) => {
    const row = index + 2
    const values = [reference.idEquipe, reference.nomEquipe, reference.idClub, reference.nomClub, reference.idEntente, reference.nomEntente, reference.idLigue, reference.nomLigue, reference.statutEquipe]
    values.forEach((value, column) => {
      const cell = referencesSheet.getCell(row, column + 1)
      if ([1, 3, 5, 7].includes(column + 1)) cell.numFmt = "@"
      cell.value = value
    })
  })

  rewriteAthleteFormulas(athletes)
  workbook.calcProperties.fullCalcOnLoad = true
  validateGeneratedWorkbook(workbook, options.references.length)

  try {
    const excelBuffer = Buffer.from(await workbook.xlsx.writeBuffer())
    const archive = await JSZip.loadAsync(excelBuffer)
    const workbookXmlFile = archive.file("xl/workbook.xml")
    if (!workbookXmlFile) throw new Error("xl/workbook.xml absent")
    let workbookXml = await workbookXmlFile.async("string")
    const calcProperties = '<calcPr calcMode="auto" fullCalcOnLoad="1" forceFullCalc="1"/>'
    workbookXml = /<calcPr\b[^>]*\/>/.test(workbookXml)
      ? workbookXml.replace(/<calcPr\b[^>]*\/>/, calcProperties)
      : workbookXml.replace("</workbook>", `${calcProperties}</workbook>`)
    archive.file("xl/workbook.xml", workbookXml)
    const buffer = await archive.generateAsync({ type: "nodebuffer" })
    return {
      buffer,
      fileName: `NOUVEAUX_ATHLETES_${safeFilePart(options.season)}_${safeFilePart(options.ententeId)}.xlsx`,
      teamsCount: options.references.length,
    }
  } catch (error) {
    console.error("[new-athletes-template] Écriture Excel impossible", error)
    throw new TemplateGenerationError("La génération du fichier Excel a échoué.", "EXCEL_ERROR")
  }
}
