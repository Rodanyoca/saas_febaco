"use client"

import { useEffect, useMemo, useState } from "react"
import { DataTable, type Column, type Filter } from "@/components/dashboard/data-table"
import { Header } from "@/components/dashboard/header"
import { StatusBadge } from "@/components/dashboard/status-badge"
import { scoreLabel } from "@/lib/competition-utils"
import { type CompetitionResultat, getFilterOptions } from "@/lib/models"

const columns: Column<CompetitionResultat>[] = [
  { key: "id", header: "ID", className: "font-mono text-sm" },
  { key: "competitionNom", header: "Compétition" },
  { key: "dateMatch", header: "Date" },
  { key: "phase", header: "Phase" },
  { key: "poule", header: "Poule" },
  { key: "uniteANom", header: "Unité A", className: "font-medium" },
  { key: "uniteBNom", header: "Unité B", className: "font-medium" },
  { key: "qt1A", header: "QT1 A" },
  { key: "qt1B", header: "QT1 B" },
  { key: "qt2A", header: "QT2 A" },
  { key: "qt2B", header: "QT2 B" },
  { key: "qt3A", header: "QT3 A" },
  { key: "qt3B", header: "QT3 B" },
  { key: "qt4A", header: "QT4 A" },
  { key: "qt4B", header: "QT4 B" },
  { key: "prolongationA", header: "OT A" },
  { key: "prolongationB", header: "OT B" },
  { key: "scoreTotalA", header: "Score", render: (item) => <span className="font-semibold">{scoreLabel(item)}</span> },
  { key: "vainqueur", header: "Vainqueur" },
  { key: "statut", header: "Statut", render: (item) => <StatusBadge status={item.statut} /> },
]

export default function CompetitionResultatsPage() {
  const [resultats, setResultats] = useState<CompetitionResultat[]>([])
  useEffect(() => {
    let canceled = false
    ;(async () => {
      try {
        const res = await fetch("/api/competitions-resultats", { cache: "no-store" })
        const json = await res.json()
        if (!canceled) setResultats(Array.isArray(json?.resultats) ? json.resultats : [])
      } catch {
        if (!canceled) setResultats([])
      }
    })()
    return () => { canceled = true }
  }, [])
  const filters: Filter[] = useMemo(() => [
    { key: "phase", label: "Phase", options: getFilterOptions(resultats, "phase") },
    { key: "poule", label: "Poule", options: getFilterOptions(resultats, "poule") },
    { key: "statut", label: "Statut", options: getFilterOptions(resultats, "statut") },
  ], [resultats])
  return (
    <div className="flex flex-col">
      <Header title="Résultats" subtitle="Matchs et scores basketball" />
      <div className="flex-1 p-6">
        <DataTable data={resultats} columns={columns} filters={filters} searchPlaceholder="Rechercher une compétition..." idKey="__key" />
      </div>
    </div>
  )
}

