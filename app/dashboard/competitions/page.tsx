"use client"

import { useEffect, useMemo, useState } from "react"
import { DataTable, type Column, type Filter } from "@/components/dashboard/data-table"
import { Header } from "@/components/dashboard/header"
import { StatusBadge } from "@/components/dashboard/status-badge"
import { type Competition, getFilterOptions } from "@/lib/models"

const columns: Column<Competition>[] = [
  { key: "id", header: "ID", className: "font-mono text-sm" },
  { key: "nom", header: "Compétition", className: "font-medium" },
  { key: "saison", header: "Saison" },
  { key: "categorie", header: "Catégorie" },
  { key: "genre", header: "Genre" },
  { key: "niveau", header: "Niveau" },
  { key: "dateDebut", header: "Début" },
  { key: "dateFin", header: "Fin" },
  { key: "lieu", header: "Lieu" },
  { key: "statut", header: "Statut", render: (item) => <StatusBadge status={item.statut} /> },
]

export default function CompetitionsPage() {
  const [competitions, setCompetitions] = useState<Competition[]>([])

  useEffect(() => {
    let canceled = false
    ;(async () => {
      try {
        const res = await fetch("/api/competitions", { cache: "no-store" })
        const json = await res.json()
        if (!canceled) setCompetitions(Array.isArray(json?.competitions) ? json.competitions : [])
      } catch {
        if (!canceled) setCompetitions([])
      }
    })()
    return () => {
      canceled = true
    }
  }, [])

  const filters: Filter[] = useMemo(() => [
    { key: "saison", label: "Saison", options: getFilterOptions(competitions, "saison") },
    { key: "categorie", label: "Catégorie", options: getFilterOptions(competitions, "categorie") },
    { key: "genre", label: "Genre", options: getFilterOptions(competitions, "genre") },
    { key: "niveau", label: "Niveau", options: getFilterOptions(competitions, "niveau") },
    { key: "statut", label: "Statut", options: getFilterOptions(competitions, "statut") },
  ], [competitions])

  return (
    <div className="flex flex-col">
      <Header title="Compétitions" subtitle="Toutes les compétitions FEBACO" />
      <div className="flex-1 p-6">
        <DataTable
          data={competitions}
          columns={columns}
          filters={filters}
          searchPlaceholder="Rechercher une compétition..."
          detailHref={(item) => `/dashboard/competitions/${encodeURIComponent(item.id)}`}
          idKey="__key"
        />
      </div>
    </div>
  )
}

