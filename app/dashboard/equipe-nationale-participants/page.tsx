"use client"

import { useEffect, useMemo, useState } from "react"
import { DataTable, type Column, type Filter } from "@/components/dashboard/data-table"
import { Header } from "@/components/dashboard/header"
import { PersonCell } from "@/components/dashboard/person-cell"
import { StatusBadge } from "@/components/dashboard/status-badge"
import { type EquipeNationaleParticipant, getFilterOptions } from "@/lib/models"

const columns: Column<EquipeNationaleParticipant>[] = [
  { key: "id", header: "ID participant", className: "font-mono text-sm" },
  { key: "participationId", header: "ID participation", className: "font-mono text-sm" },
  { key: "equipeNationaleNom", header: "Équipe nationale" },
  { key: "athleteNom", header: "Athlète", render: (item) => <PersonCell name={item.athleteNom} avatarUrl={item.avatarUrl} subtitle={item.athleteId} /> },
  { key: "equipeNom", header: "Équipe" },
  { key: "clubNom", header: "Club" },
  { key: "poste", header: "Poste" },
  { key: "statutParticipant", header: "Statut", render: (item) => <StatusBadge status={item.statutParticipant} /> },
  { key: "observation", header: "Observation" },
]

export default function EquipeNationaleParticipantsPage() {
  const [participants, setParticipants] = useState<EquipeNationaleParticipant[]>([])

  useEffect(() => {
    let canceled = false
    ;(async () => {
      try {
        const res = await fetch("/api/equipe-nationale-participants", { cache: "no-store" })
        const json = await res.json()
        if (!canceled) setParticipants(Array.isArray(json?.participants) ? json.participants : [])
      } catch {
        if (!canceled) setParticipants([])
      }
    })()
    return () => { canceled = true }
  }, [])

  const filters: Filter[] = useMemo(() => [
    { key: "equipeNationaleNom", label: "Équipe nationale", options: getFilterOptions(participants, "equipeNationaleNom") },
    { key: "participationId", label: "Compétition", options: getFilterOptions(participants, "participationId") },
    { key: "statutParticipant", label: "Statut", options: getFilterOptions(participants, "statutParticipant") },
  ], [participants])

  return (
    <div className="flex flex-col">
      <Header title="Participants EN" subtitle="Athlètes retenus pour les compétitions nationales" />
      <div className="flex-1 p-6">
        <DataTable data={participants} columns={columns} filters={filters} searchPlaceholder="Rechercher un athlète..." idKey="__key" />
      </div>
    </div>
  )
}
