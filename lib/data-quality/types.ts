import type { SheetRow } from "@/lib/google-sheets"

export const DATA_QUALITY_BLOCKS = ["structure", "actors", "licences", "competitions", "nationalTeams", "activities", "documents"] as const
export type DataQualityBlock = (typeof DATA_QUALITY_BLOCKS)[number]
export type FieldWeight = 1 | 2 | 3
export type RecordQualityStatus = "COMPLETE" | "PARTIAL" | "CRITICAL"
export type BlockQualityStatus = "EXCELLENT" | "GOOD" | "INCOMPLETE" | "CRITICAL" | "NOT_EVALUATED" | "UNAVAILABLE"
export type IssueSeverity = "CRITICAL" | "WARNING" | "INFO"

export type CompletenessContext = { references: Record<string, Set<string>>; rows: Record<string, SheetRow[]>; seasonId?: string }
export type CompletenessFieldRule = {
  key: string
  label: string
  weight: FieldWeight
  aliases?: string[]
  isApplicable?: (record: SheetRow, context: CompletenessContext) => boolean
  isComplete?: (record: SheetRow, context: CompletenessContext) => boolean
  code?: string
  severity?: IssueSeverity
  message?: string
}
export type EntityCompletenessRule = { entityType: string; label: string; sheet: string; idAliases: string[]; labelAliases: string[]; fields: CompletenessFieldRule[] }
export type DataQualityIssue = { block: DataQualityBlock; entityType: string; entityId: string; entityLabel: string; field: string; fieldLabel: string; code: string; severity: IssueSeverity; message: string }
export type DataQualityBlockSummary = { block: DataQualityBlock; label: string; score: number | null; status: BlockQualityStatus; records: number; complete: number; partial: number; critical: number; missingFields: number; issueCount: number; criticalIssues: number; unavailableReason?: string }
export type DataQualitySummary = { calculatedAt: string; seasonId: string | null; seasonLabel: string | null; canRecalculate: boolean; blocks: DataQualityBlockSummary[]; totals: { records: number; complete: number; partial: number; critical: number; missingFields: number; issues: number; criticalIssues: number }; topCategories: Array<{ code: string; label: string; count: number }> }
