export type LicenceOption = { id: string; label: string }

export function sanitizeLicenceOptions(options: LicenceOption[]): LicenceOption[] {
  const seen = new Set<string>()
  return options.flatMap((item) => {
    const id = String(item?.id ?? "").trim()
    if (!id || seen.has(id)) return []
    seen.add(id)
    return [{ id, label: String(item?.label ?? "").trim() || id }]
  })
}

function normalizeLicenceSearch(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("fr")
    .trim()
}

export function searchLicenceOptions(
  options: LicenceOption[],
  query: string,
  limit = 50,
): LicenceOption[] {
  const term = normalizeLicenceSearch(query)
  if (term.length < 2 || limit <= 0) return []

  return options
    .filter((item) => normalizeLicenceSearch(`${item.label} ${item.id}`).includes(term))
    .slice(0, limit)
}
