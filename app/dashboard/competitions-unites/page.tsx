"use client"

import { useEffect, useMemo, useState } from "react"
import { DataTable, type Column, type Filter } from "@/components/dashboard/data-table"
import { Header } from "@/components/dashboard/header"
import { StatusBadge } from "@/components/dashboard/status-badge"
import { type CompetitionUnite, getFilterOptions } from "@/lib/models"

const columns: Column<CompetitionUnite>[] = [
  { key: "id", header: "ID unité", className: "font-mono text-sm" },
  { key: "competitionId", header: "ID comp.", className: "font-mono text-sm" },
  { key: "competitionNom", header: "Compétition" },
  { key: "equipeId", header: "ID équipe", className: "font-mono text-sm" },
  { key: "equipeNom", header: "Équipe", className: "font-medium" },
  { key: "clubId", header: "ID club", className: "font-mono text-sm" },
  { key: "clubNom", header: "Club" },
  { key: "categorie", header: "Catégorie" },
  { key: "genre", header: "Genre" },
  { key: "poule", header: "Poule" },
  { key: "statut", header: "Statut", render: (item) => <StatusBadge status={item.statut} /> },
]

export default function CompetitionUnitesPage() {
  const [unites, setUnites] = useState<CompetitionUnite[]>([])
  useEffect(() => {
    let canceled = false
    ;(async () => {
      try {
        const res = await fetch("/api/competitions-unites", { cache: "no-store" })
        const json = await res.json()
        if (!canceled) setUnites(Array.isArray(json?.unites) ? json.unites : [])
      } catch {
        if (!canceled) setUnites([])
      }
    })()
    return () => { canceled = true }
  }, [])
  const filters: Filter[] = useMemo(() => [
    { key: "competitionId", label: "Compétition", options: getFilterOptions(unites, "competitionId") },
    { key: "clubNom", label: "Club", options: getFilterOptions(unites, "clubNom") },
    { key: "poule", label: "Poule", options: getFilterOptions(unites, "poule") },
    { key: "categorie", label: "Catégorie", options: getFilterOptions(unites, "categorie") },
    { key: "genre", label: "Genre", options: getFilterOptions(unites, "genre") },
    { key: "statut", label: "Statut", options: getFilterOptions(unites, "statut") },
  ], [unites])
  return (
    <div className="flex flex-col">
      <Header title="Équipes engagées" subtitle="Unités de compétition basketball" />
      <div className="flex-1 p-6">
        <DataTable data={unites} columns={columns} filters={filters} searchPlaceholder="Rechercher une équipe..." idKey="__key" />
      </div>
    </div>
  )
}

