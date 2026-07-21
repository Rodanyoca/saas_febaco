"use client"

import { useEffect, useMemo, useState } from "react"
import { DataTable, type Column, type Filter } from "@/components/dashboard/data-table"
import { Header } from "@/components/dashboard/header"
import { PersonCell } from "@/components/dashboard/person-cell"
import { StatusBadge } from "@/components/dashboard/status-badge"
import { type CompetitionParticipant, getFilterOptions } from "@/lib/models"

const columns: Column<CompetitionParticipant>[] = [
  { key: "id", header: "ID", className: "font-mono text-sm" },
  { key: "competitionId", header: "ID comp.", className: "font-mono text-sm" },
  { key: "competitionNom", header: "Compétition" },
  { key: "athleteId", header: "ID athlète", className: "font-mono text-sm" },
  { key: "athleteNom", header: "Athlète", render: (item) => <PersonCell name={item.athleteNom} avatarUrl={item.avatarUrl} subtitle={item.athleteId} /> },
  { key: "equipeId", header: "ID équipe", className: "font-mono text-sm" },
  { key: "equipeNom", header: "Équipe" },
  { key: "clubId", header: "ID club", className: "font-mono text-sm" },
  { key: "clubNom", header: "Club" },
  { key: "categorie", header: "Catégorie" },
  { key: "genre", header: "Genre" },
  { key: "statut", header: "Statut", render: (item) => <StatusBadge status={item.statut} /> },
]

export default function CompetitionParticipantsPage() {
  const [participants, setParticipants] = useState<CompetitionParticipant[]>([])
  useEffect(() => {
    let canceled = false
    ;(async () => {
      try {
        const res = await fetch("/api/competitions-participants", { cache: "no-store" })
        const json = await res.json()
        if (!canceled) setParticipants(Array.isArray(json?.participants) ? json.participants : [])
      } catch {
        if (!canceled) setParticipants([])
      }
    })()
    return () => { canceled = true }
  }, [])
  const filters: Filter[] = useMemo(() => [
    { key: "competitionId", label: "Compétition", options: getFilterOptions(participants, "competitionId") },
    { key: "equipeNom", label: "Équipe", options: getFilterOptions(participants, "equipeNom") },
    { key: "clubNom", label: "Club", options: getFilterOptions(participants, "clubNom") },
    { key: "categorie", label: "Catégorie", options: getFilterOptions(participants, "categorie") },
    { key: "genre", label: "Genre", options: getFilterOptions(participants, "genre") },
    { key: "statut", label: "Statut", options: getFilterOptions(participants, "statut") },
  ], [participants])
  return (
    <div className="flex flex-col">
      <Header title="Participants" subtitle="Athlètes participant aux compétitions" />
      <div className="flex-1 p-6">
        <DataTable data={participants} columns={columns} filters={filters} searchPlaceholder="Rechercher un athlète..." idKey="__key" />
      </div>
    </div>
  )
}
