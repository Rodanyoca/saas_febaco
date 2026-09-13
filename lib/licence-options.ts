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
