"use client"

import { useEffect, useMemo, useState } from "react"
import { DataTable, type Column, type Filter } from "@/components/dashboard/data-table"
import { Header } from "@/components/dashboard/header"
import { StatusBadge } from "@/components/dashboard/status-badge"
import { type EquipeNationaleCompetition, getFilterOptions } from "@/lib/models"

const columns: Column<EquipeNationaleCompetition>[] = [
  { key: "id", header: "ID participation", className: "font-mono text-sm" },
  { key: "equipeNationaleNom", header: "Équipe nationale" },
  { key: "competitionNom", header: "Compétition", className: "font-medium" },
  { key: "niveauCompetition", header: "Niveau" },
  { key: "dateDebut", header: "Début" },
  { key: "dateFin", header: "Fin" },
  { key: "lieu", header: "Lieu" },
  { key: "statutParticipation", header: "Statut", render: (item) => <StatusBadge status={item.statutParticipation} /> },
  { key: "observation", header: "Observation" },
]

export default function EquipeNationaleCompetitionsPage() {
  const [competitions, setCompetitions] = useState<EquipeNationaleCompetition[]>([])

  useEffect(() => {
    let canceled = false
    ;(async () => {
      try {
        const res = await fetch("/api/equipe-nationale-competitions", { cache: "no-store" })
        const json = await res.json()
        if (!canceled) setCompetitions(Array.isArray(json?.competitions) ? json.competitions : [])
      } catch {
        if (!canceled) setCompetitions([])
      }
    })()
    return () => { canceled = true }
  }, [])

  const filters: Filter[] = useMemo(() => [
    { key: "equipeNationaleNom", label: "Équipe nationale", options: getFilterOptions(competitions, "equipeNationaleNom") },
    { key: "competitionNom", label: "Compétition", options: getFilterOptions(competitions, "competitionNom") },
    { key: "niveauCompetition", label: "Niveau", options: getFilterOptions(competitions, "niveauCompetition") },
    { key: "statutParticipation", label: "Statut", options: getFilterOptions(competitions, "statutParticipation") },
  ], [competitions])

  return (
    <div className="flex flex-col">
      <Header title="Compétitions EN" subtitle="Compétitions suivies par les équipes nationales" />
      <div className="flex-1 p-6">
        <DataTable data={competitions} columns={columns} filters={filters} searchPlaceholder="Rechercher une compétition..." idKey="__key" />
      </div>
    </div>
  )
}
