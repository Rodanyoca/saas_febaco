"use client"

import { useEffect, useMemo, useState } from "react"
import { DataTable, type Column, type Filter } from "@/components/dashboard/data-table"
import { Header } from "@/components/dashboard/header"
import { PersonCell } from "@/components/dashboard/person-cell"
import { StatusBadge } from "@/components/dashboard/status-badge"
import { type EquipeNationaleSelection, getFilterOptions } from "@/lib/models"

const columns: Column<EquipeNationaleSelection>[] = [
  { key: "id", header: "ID sélection", className: "font-mono text-sm" },
  { key: "equipeNationaleNom", header: "Équipe nationale" },
  { key: "athleteNom", header: "Athlète", render: (item) => <PersonCell name={item.athleteNom} avatarUrl={item.avatarUrl} subtitle={item.athleteId} /> },
  { key: "equipeNom", header: "Équipe" },
  { key: "clubNom", header: "Club" },
  { key: "categorie", header: "Catégorie" },
  { key: "genre", header: "Genre" },
  { key: "saison", header: "Saison" },
  { key: "dateDebutSelection", header: "Début" },
  { key: "dateFinSelection", header: "Fin" },
  { key: "statutSelection", header: "Statut", render: (item) => <StatusBadge status={item.statutSelection} /> },
]

export default function EquipeNationaleSelectionsPage() {
  const [selections, setSelections] = useState<EquipeNationaleSelection[]>([])

  useEffect(() => {
    let canceled = false
    ;(async () => {
      try {
        const res = await fetch("/api/equipe-nationale-selections", { cache: "no-store" })
        const json = await res.json()
        if (!canceled) setSelections(Array.isArray(json?.selections) ? json.selections : [])
      } catch {
        if (!canceled) setSelections([])
      }
    })()
    return () => { canceled = true }
  }, [])

  const filters: Filter[] = useMemo(() => [
    { key: "equipeNationaleNom", label: "Équipe nationale", options: getFilterOptions(selections, "equipeNationaleNom") },
    { key: "categorie", label: "Catégorie", options: getFilterOptions(selections, "categorie") },
    { key: "genre", label: "Genre", options: getFilterOptions(selections, "genre") },
    { key: "saison", label: "Saison", options: getFilterOptions(selections, "saison") },
    { key: "statutSelection", label: "Statut", options: getFilterOptions(selections, "statutSelection") },
  ], [selections])

  return (
    <div className="flex flex-col">
      <Header title="Sélections nationales" subtitle="Historique des athlètes sélectionnés" />
      <div className="flex-1 p-6">
        <DataTable data={selections} columns={columns} filters={filters} searchPlaceholder="Rechercher un athlète..." idKey="__key" />
      </div>
    </div>
  )
}
