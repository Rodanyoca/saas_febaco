"use client"

import { useEffect, useMemo, useState } from "react"
import { DataTable, type Column, type Filter } from "@/components/dashboard/data-table"
import { Header } from "@/components/dashboard/header"
import { StatusBadge } from "@/components/dashboard/status-badge"
import { type EquipeNationale, getFilterOptions } from "@/lib/models"

const columns: Column<EquipeNationale>[] = [
  { key: "id", header: "ID équipe", className: "font-mono text-sm" },
  { key: "nom", header: "Nom équipe", className: "font-medium" },
  { key: "discipline", header: "Discipline" }, { key: "saison", header: "Saison" },
  { key: "categorie", header: "Catégorie" }, { key: "sexe", header: "Sexe" },
  { key: "statut", header: "Statut", render: (item) => <StatusBadge status={item.statut} /> },
]

export default function EquipeNationalePage() {
  const [data, setData] = useState<EquipeNationale[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  useEffect(() => { let active = true; (async () => { try {
    const response = await fetch("/api/equipe-nationale", { cache: "no-store" }); const json = await response.json()
    if (!response.ok) throw new Error(json?.error || "Lecture impossible")
    if (active) setData(Array.isArray(json?.equipesNationales) ? json.equipesNationales : [])
  } catch (e) { if (active) setError(e instanceof Error ? e.message : "Lecture impossible") }
  finally { if (active) setLoading(false) } })(); return () => { active = false } }, [])
  const filters: Filter[] = useMemo(() => ["saison", "discipline", "categorie", "sexe", "statut"].map((key) => ({
    key, label: ({ saison: "Saison", discipline: "Discipline", categorie: "Catégorie", sexe: "Sexe", statut: "Statut" } as Record<string,string>)[key],
    options: getFilterOptions(data, key as keyof EquipeNationale),
  })), [data])
  return <div className="flex flex-col"><Header title="Équipes nationales" subtitle={`${data.length} équipe${data.length > 1 ? "s" : ""}`} />
    <div className="flex-1 p-6">{loading ? <p className="text-muted-foreground">Chargement...</p> : error ? <p className="text-destructive">{error}</p> :
      <DataTable data={data} columns={columns} filters={filters} searchPlaceholder="Rechercher par ID ou nom..." detailHref={(item) => `/dashboard/equipe-nationale/${encodeURIComponent(item.id)}`} idKey="__key" />}</div></div>
}
