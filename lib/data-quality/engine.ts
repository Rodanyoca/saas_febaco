import type { BlockQualityStatus, CompletenessContext, DataQualityBlock, DataQualityBlockSummary, DataQualityIssue, EntityCompletenessRule, RecordQualityStatus } from "@/lib/data-quality/types"
import type { SheetRow } from "@/lib/google-sheets"

export const FIELD_WEIGHTS = { CRITICAL: 3, IMPORTANT: 2, COMPLEMENTARY: 1 } as const
export const RECORD_THRESHOLDS = { complete: 90, partial: 50 } as const
export const BLOCK_THRESHOLDS = { excellent: 90, good: 75, incomplete: 50 } as const
const emptyTokens = new Set(["", "n/a", "na", "null", "undefined", "-"])
export const clean = (value: unknown) => String(value ?? "").trim()
export const hasMeaningfulValue = (value: unknown) => typeof value === "boolean" || typeof value === "number" || !emptyTokens.has(clean(value).toLowerCase())
export const valueFor = (row: SheetRow, aliases: string[]) => aliases.map((key) => row[key]).find(hasMeaningfulValue)
export const validDate = (value: unknown) => { const text = clean(value); if (!text || /^1900[-/]0?1[-/]0?1/.test(text)) return false; const match = text.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/) || text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/); if (!match) return false; const iso = match[1].length === 4 ? `${match[1]}-${match[2].padStart(2,"0")}-${match[3].padStart(2,"0")}` : `${match[3]}-${match[2].padStart(2,"0")}-${match[1].padStart(2,"0")}`; const date = new Date(`${iso}T00:00:00Z`); return !Number.isNaN(date.valueOf()) && date.toISOString().slice(0,10) === iso }
export const recordStatus = (score: number): RecordQualityStatus => score >= RECORD_THRESHOLDS.complete ? "COMPLETE" : score >= RECORD_THRESHOLDS.partial ? "PARTIAL" : "CRITICAL"
export const blockStatus = (score: number | null): BlockQualityStatus => score == null ? "NOT_EVALUATED" : score >= BLOCK_THRESHOLDS.excellent ? "EXCELLENT" : score >= BLOCK_THRESHOLDS.good ? "GOOD" : score >= BLOCK_THRESHOLDS.incomplete ? "INCOMPLETE" : "CRITICAL"

export function evaluateBlock(block: DataQualityBlock, label: string, rules: EntityCompletenessRule[], rows: Record<string, SheetRow[]>, context: CompletenessContext) {
  let obtained = 0, expected = 0, complete = 0, partial = 0, critical = 0, missingFields = 0
  const issues: DataQualityIssue[] = []
  for (const rule of rules) for (const record of rows[rule.sheet] ?? []) {
    let recordObtained = 0, recordExpected = 0
    for (const field of rule.fields) {
      if (field.isApplicable && !field.isApplicable(record, context)) continue
      const weight = field.weight
      recordExpected += weight; expected += weight
      const aliases = field.aliases?.length ? field.aliases : [field.key]
      const valid = field.isComplete ? field.isComplete(record, context) : hasMeaningfulValue(valueFor(record, aliases))
      if (valid) { recordObtained += weight; obtained += weight; continue }
      missingFields++
      issues.push({ block, entityType: rule.entityType, entityId: clean(valueFor(record, rule.idAliases)) || "INCONNU", entityLabel: clean(valueFor(record, rule.labelAliases)) || clean(valueFor(record, rule.idAliases)) || "Fiche sans identifiant", field: field.key, fieldLabel: field.label, code: field.code || "MISSING_REQUIRED_FIELD", severity: field.severity || (weight === 3 ? "CRITICAL" : weight === 2 ? "WARNING" : "INFO"), message: field.message || `${field.label} est absent ou invalide.` })
    }
    const status = recordStatus(recordExpected ? Math.round(recordObtained / recordExpected * 100) : 100)
    if (status === "COMPLETE") complete++; else if (status === "PARTIAL") partial++; else critical++
  }
  const records = complete + partial + critical, score = expected ? Math.round(obtained / expected * 100) : null
  const summary: DataQualityBlockSummary = { block, label, score, status: blockStatus(score), records, complete, partial, critical, missingFields, issueCount: issues.length, criticalIssues: issues.filter((issue) => issue.severity === "CRITICAL").length }
  return { summary, issues, points: { obtained, expected } }
}
