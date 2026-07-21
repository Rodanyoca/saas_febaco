"use client"

import { useEffect, useMemo, useState } from "react"
import { DataTable, type Column, type Filter } from "@/components/dashboard/data-table"
import { Header } from "@/components/dashboard/header"
import { StatusBadge } from "@/components/dashboard/status-badge"
import { type EquipeNationale, getFilterOptions } from "@/lib/models"

const columns: Column<EquipeNationale>[] = [
  { key: "id", header: "ID", className: "font-mono text-sm" },
  { key: "nom", header: "Équipe nationale", className: "font-medium" },
  { key: "categorie", header: "Catégorie" },
  { key: "genre", header: "Genre" },
  { key: "saison", header: "Saison" },
  { key: "statut", header: "Statut", render: (item) => <StatusBadge status={item.statut} /> },
  { key: "observation", header: "Observation" },
]

export default function EquipeNationalePage() {
  const [equipesNationales, setEquipesNationales] = useState<EquipeNationale[]>([])

  useEffect(() => {
    let canceled = false
    ;(async () => {
      try {
        const res = await fetch("/api/equipe-nationale", { cache: "no-store" })
        const json = await res.json()
        if (!canceled) setEquipesNationales(Array.isArray(json?.equipesNationales) ? json.equipesNationales : [])
      } catch {
        if (!canceled) setEquipesNationales([])
      }
    })()
    return () => { canceled = true }
  }, [])

  const filters: Filter[] = useMemo(() => [
    { key: "categorie", label: "Catégorie", options: getFilterOptions(equipesNationales, "categorie") },
    { key: "genre", label: "Genre", options: getFilterOptions(equipesNationales, "genre") },
    { key: "saison", label: "Saison", options: getFilterOptions(equipesNationales, "saison") },
    { key: "statut", label: "Statut", options: getFilterOptions(equipesNationales, "statut") },
  ], [equipesNationales])

  return (
    <div className="flex flex-col">
      <Header title="Équipes nationales" subtitle="Entités nationales FEBACO et sélections associées" />
      <div className="flex-1 p-6">
        <DataTable
          data={equipesNationales}
          columns={columns}
          filters={filters}
          searchPlaceholder="Rechercher une équipe nationale..."
          detailHref={(item) => `/dashboard/equipe-nationale/${encodeURIComponent(item.id)}`}
          idKey="__key"
        />
      </div>
    </div>
  )
}
