"use client"

import { useEffect, useMemo, useState } from "react"
import { DataTable, type Column, type Filter } from "@/components/dashboard/data-table"
import { Header } from "@/components/dashboard/header"
import { StatusBadge } from "@/components/dashboard/status-badge"
import { type Competition, getFilterOptions } from "@/lib/models"

function competitionRouteId(id: string): string {
  return encodeURIComponent(id).replace(/%/g, "~")
}

const columns: Column<Competition>[] = [
  { key: "saison", header: "Saison" },
  { key: "nom", header: "Nom de la compétition", className: "font-medium" },
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
    { key: "lieu", label: "Lieu", options: getFilterOptions(competitions, "lieu") },
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
          detailHref={(item) => `/dashboard/competitions/${competitionRouteId(item.id)}`}
          idKey="__key"
        />
      </div>
    </div>
  )
}
