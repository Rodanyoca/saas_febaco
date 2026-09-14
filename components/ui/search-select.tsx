"use client"

import { useEffect, useMemo, useState } from "react"
import { Search, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export type SearchSelectOption = { id: string; label: string; keywords?: string }

export function SearchSelect({ value, onValueChange, options, placeholder = "Rechercher…", disabled = false, emptyMessage = "Aucun résultat." }: { value: string; onValueChange: (value: string) => void; options: SearchSelectOption[]; placeholder?: string; disabled?: boolean; emptyMessage?: string }) {
  const selected = options.find((option) => option.id === value)
  const [query, setQuery] = useState("")
  const [focused, setFocused] = useState(false)
  useEffect(() => setQuery(selected?.label || ""), [selected?.id, selected?.label])
  const results = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase("fr")
    if (needle.length < 2) return []
    return options.filter((option) => `${option.label} ${option.id} ${option.keywords || ""}`.toLocaleLowerCase("fr").includes(needle)).slice(0, 40)
  }, [options, query])
  return <div className="relative"><Search className="absolute left-3 top-3 size-4 text-muted-foreground" /><Input className="pr-9 pl-9" value={query} disabled={disabled} placeholder={placeholder} autoComplete="off" onFocus={() => setFocused(true)} onBlur={() => window.setTimeout(() => setFocused(false), 150)} onChange={(event) => { setQuery(event.target.value); onValueChange("") }} />{value && !disabled ? <Button type="button" size="icon-sm" variant="ghost" className="absolute right-1 top-1.5" aria-label="Effacer la sélection" onMouseDown={(event) => event.preventDefault()} onClick={() => { onValueChange(""); setQuery("") }}><X /></Button> : null}{focused && !disabled && !value ? <div className="absolute z-50 mt-1 max-h-64 w-full overflow-y-auto rounded-md border bg-popover p-1 shadow-lg">{query.trim().length < 2 ? <p className="p-3 text-sm text-muted-foreground">Saisissez au moins 2 caractères.</p> : results.length ? results.map((option) => <button key={option.id} type="button" className="block w-full rounded px-3 py-2 text-left text-sm hover:bg-accent" onMouseDown={(event) => event.preventDefault()} onClick={() => { onValueChange(option.id); setQuery(option.label); setFocused(false) }}><span className="block font-medium">{option.label}</span><span className="text-xs text-muted-foreground">{option.id}</span></button>) : <p className="p-3 text-sm text-muted-foreground">{emptyMessage}</p>}</div> : null}</div>
}
