"use client"

import { useEffect, useMemo, useState } from "react"
import { DataTable, type Column, type Filter } from "@/components/dashboard/data-table"
import { Header } from "@/components/dashboard/header"
import { StatusBadge } from "@/components/dashboard/status-badge"
import { nationalScoreLabel } from "@/lib/equipe-nationale-utils"
import { type EquipeNationaleResultat, getFilterOptions } from "@/lib/models"

const columns: Column<EquipeNationaleResultat>[] = [
  { key: "id", header: "ID résultat", className: "font-mono text-sm" },
  { key: "equipeNationaleNom", header: "Équipe nationale" },
  { key: "competitionNom", header: "Compétition" },
  { key: "dateMatch", header: "Date" },
  { key: "phase", header: "Phase" },
  { key: "adversaire", header: "Adversaire", className: "font-medium" },
  { key: "paysAdversaire", header: "Pays" },
  { key: "scoreTotalRdc", header: "Score", render: (item) => <span className="font-semibold">{nationalScoreLabel(item)}</span> },
  { key: "resultatMatch", header: "Résultat" },
  { key: "statutMatch", header: "Statut", render: (item) => <StatusBadge status={item.statutMatch} /> },
]

export default function EquipeNationaleResultatsPage() {
  const [resultats, setResultats] = useState<EquipeNationaleResultat[]>([])

  useEffect(() => {
    let canceled = false
    ;(async () => {
      try {
        const res = await fetch("/api/equipe-nationale-resultats", { cache: "no-store" })
        const json = await res.json()
        if (!canceled) setResultats(Array.isArray(json?.resultats) ? json.resultats : [])
      } catch {
        if (!canceled) setResultats([])
      }
    })()
    return () => { canceled = true }
  }, [])

  const filters: Filter[] = useMemo(() => [
    { key: "equipeNationaleNom", label: "Équipe nationale", options: getFilterOptions(resultats, "equipeNationaleNom") },
    { key: "competitionNom", label: "Compétition", options: getFilterOptions(resultats, "competitionNom") },
    { key: "phase", label: "Phase", options: getFilterOptions(resultats, "phase") },
    { key: "resultatMatch", label: "Résultat", options: getFilterOptions(resultats, "resultatMatch") },
    { key: "statutMatch", label: "Statut", options: getFilterOptions(resultats, "statutMatch") },
  ], [resultats])

  return (
    <div className="flex flex-col">
      <Header title="Résultats EN" subtitle="Résultats propres aux équipes nationales" />
      <div className="flex-1 p-6">
        <DataTable data={resultats} columns={columns} filters={filters} searchPlaceholder="Rechercher un match..." idKey="__key" />
      </div>
    </div>
  )
}
