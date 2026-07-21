"use client"

import { useEffect, useMemo, useState } from "react"
import { DataTable, type Column, type Filter } from "@/components/dashboard/data-table"
import { Header } from "@/components/dashboard/header"
import { classementDifference } from "@/lib/competition-utils"
import { type CompetitionClassement, getFilterOptions } from "@/lib/models"

const columns: Column<CompetitionClassement>[] = [
  { key: "rang", header: "Rang", className: "font-mono text-sm" },
  { key: "competitionNom", header: "Compétition" },
  { key: "phase", header: "Phase" },
  { key: "poule", header: "Poule" },
  { key: "uniteNom", header: "Unité", className: "font-medium" },
  { key: "matchJoue", header: "MJ" },
  { key: "victoire", header: "V" },
  { key: "defaite", header: "D" },
  { key: "nul", header: "N" },
  { key: "points", header: "Pts", className: "font-semibold" },
  { key: "scorePour", header: "Pour" },
  { key: "scoreContre", header: "Contre" },
  { key: "difference", header: "Diff.", render: (item) => classementDifference(item) },
]

function sortClassement(rows: CompetitionClassement[]) {
  return [...rows].sort((a, b) => {
    const rangA = Number(a.rang)
    const rangB = Number(b.rang)
    if (Number.isFinite(rangA) && Number.isFinite(rangB)) return rangA - rangB
    return Number(b.points || 0) - Number(a.points || 0)
  })
}

export default function CompetitionClassementPage() {
  const [classements, setClassements] = useState<CompetitionClassement[]>([])
  useEffect(() => {
    let canceled = false
    ;(async () => {
      try {
        const res = await fetch("/api/competitions-classement", { cache: "no-store" })
        const json = await res.json()
        if (!canceled) setClassements(Array.isArray(json?.classements) ? json.classements : [])
      } catch {
        if (!canceled) setClassements([])
      }
    })()
    return () => { canceled = true }
  }, [])
  const sorted = useMemo(() => sortClassement(classements), [classements])
  const filters: Filter[] = useMemo(() => [
    { key: "competitionId", label: "Compétition", options: getFilterOptions(sorted, "competitionId") },
    { key: "phase", label: "Phase", options: getFilterOptions(sorted, "phase") },
    { key: "poule", label: "Poule", options: getFilterOptions(sorted, "poule") },
  ], [sorted])
  return (
    <div className="flex flex-col">
      <Header title="Classements" subtitle="Classements simples par compétition" />
      <div className="flex-1 p-6">
        <DataTable data={sorted} columns={columns} filters={filters} searchPlaceholder="Rechercher une équipe..." idKey="__key" />
      </div>
    </div>
  )
}

