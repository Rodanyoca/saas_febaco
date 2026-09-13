const DATE_FIELD_PATTERN = /(^|_)(date|debut|fin|naissance|delivrance|expiration|affiliation|creation|reconnaissance|attribution|match)(_|$)/i
const DATE_LABEL_PATTERN = /\b(date|début|fin|naissance|délivrance|expiration|affiliation|création|reconnaissance|attribution)\b/i

export function isDateDisplayField(key: string, label = ""): boolean {
  const camelCaseAsWords = key.replace(/([a-z])([A-Z])/g, "$1_$2")
  return DATE_FIELD_PATTERN.test(camelCaseAsWords) || DATE_LABEL_PATTERN.test(label)
}

export function formatDisplayDate(value: unknown): string {
  const raw = String(value ?? "").trim()
  if (!raw || raw === "-") return raw || "-"
  const iso = raw.match(/^(\d{4})-(\d{2})-(\d{2})(?:[T\s].*)?$/)
  if (iso) return `${iso[3]}-${iso[2]}-${iso[1]}`
  const dayFirst = raw.match(/^(\d{1,2})[/.](\d{1,2})[/.](\d{4})$/)
  if (dayFirst) return `${dayFirst[1].padStart(2, "0")}-${dayFirst[2].padStart(2, "0")}-${dayFirst[3]}`
  return raw
}

export function formatDateField(value: unknown, key: string, label = ""): string {
  return isDateDisplayField(key, label) ? formatDisplayDate(value) : String(value ?? "-")
}

export function formatDatesInText(value: string): string {
  return value.replace(/\b(\d{4})-(\d{2})-(\d{2})\b/g, "$3-$2-$1")
}
