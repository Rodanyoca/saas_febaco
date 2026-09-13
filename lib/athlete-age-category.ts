import type { SheetRow } from "@/lib/google-sheets"

const clean = (value: unknown) => String(value ?? "").trim()

function birthDate(value: unknown): Date | undefined {
  const raw = clean(value)
  if (!raw) return undefined
  const iso = raw.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/)
  const local = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  const parts = iso ? [Number(iso[1]), Number(iso[2]), Number(iso[3])] : local ? [Number(local[3]), Number(local[2]), Number(local[1])] : []
  if (!parts.length) return undefined
  const date = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2]))
  return date.getUTCFullYear() === parts[0] && date.getUTCMonth() === parts[1] - 1 && date.getUTCDate() === parts[2] ? date : undefined
}

export function athleteAge(value: unknown, asOf = new Date()): number | undefined {
  const birth = birthDate(value)
  if (!birth || birth > asOf) return undefined
  let age = asOf.getUTCFullYear() - birth.getUTCFullYear()
  if (asOf.getUTCMonth() < birth.getUTCMonth() || (asOf.getUTCMonth() === birth.getUTCMonth() && asOf.getUTCDate() < birth.getUTCDate())) age--
  return age
}

export function resolveAthleteAgeCategory(value: unknown, categories: SheetRow[], asOf = new Date()) {
  const age = athleteAge(value, asOf)
  if (age === undefined) return { id: "", label: "Non définie", age: undefined }
  const matches = categories.map((row) => ({ row, min: Number(clean(row.age_min)), maxRaw: clean(row.age_max) }))
    .filter(({ min, maxRaw }) => Number.isFinite(min) && age >= min && (!maxRaw || age <= Number(maxRaw)))
    .sort((a, b) => Number(Boolean(b.maxRaw)) - Number(Boolean(a.maxRaw)) || (b.maxRaw ? Number(b.maxRaw) - b.min - (Number(a.maxRaw) - a.min) : b.min - a.min))
  const row = matches[0]?.row
  return { id: clean(row?.id_categorie_age), label: clean(row?.nom_categorie_age) || "Non définie", age }
}
