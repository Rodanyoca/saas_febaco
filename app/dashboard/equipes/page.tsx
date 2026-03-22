"use client"

import { useEffect, useMemo, useState } from "react"
import { Header } from "@/components/dashboard/header"
import { DataTable, Column, Filter } from "@/components/dashboard/data-table"
import { StatusBadge } from "@/components/dashboard/status-badge"
import { Equipe, getFilterOptions } from "@/lib/demo-data"

const columns: Column<Equipe>[] = [
  { key: "id", header: "ID Équipe", className: "font-mono text-sm" },
  { key: "nom", header: "Nom Équipe", className: "font-medium" },
  { key: "club", header: "Club" },
  { key: "entente", header: "Entente" },
  { key: "ligue", header: "Ligue" },
  { key: "province", header: "Province" },
  { key: "categorie", header: "Catégorie" },
  { key: "genre", header: "Genre" },
  {
    key: "statut",
    header: "Statut",
    render: (item) => <StatusBadge status={item.statut} />,
  },
]

const filters: Filter[] = [
  { key: "province", label: "Province", options: [] },
  { key: "ligue", label: "Ligue", options: [] },
  { key: "entente", label: "Entente", options: [] },
  { key: "club", label: "Club", options: [] },
  { key: "categorie", label: "Catégorie", options: [] },
  { key: "genre", label: "Genre", options: [] },
  { key: "statut", label: "Statut", options: [] },
]

export default function EquipesPage() {
  const [equipes, setEquipes] = useState<Equipe[]>([])

  useEffect(() => {
    let canceled = false
    ;(async () => {
      try {
        const res = await fetch("/api/equipes", { cache: "no-store" })
        const json = await res.json()
        if (!canceled) {
          setEquipes(Array.isArray(json?.equipes) ? json.equipes : [])
        }
      } catch {
        if (!canceled) setEquipes([])
      }
    })()
    return () => {
      canceled = true
    }
  }, [])

  const filtersComputed: Filter[] = useMemo(() => {
    return [
      { key: "province", label: "Province", options: getFilterOptions(equipes, "province") },
      { key: "ligue", label: "Ligue", options: getFilterOptions(equipes, "ligue") },
      { key: "entente", label: "Entente", options: getFilterOptions(equipes, "entente") },
      { key: "club", label: "Club", options: getFilterOptions(equipes, "club") },
      { key: "categorie", label: "Catégorie", options: getFilterOptions(equipes, "categorie") },
      { key: "genre", label: "Genre", options: getFilterOptions(equipes, "genre") },
      { key: "statut", label: "Statut", options: getFilterOptions(equipes, "statut") },
    ]
  }, [equipes])

  return (
    <div className="flex flex-col">
      <Header title="Équipes" subtitle="Liste des équipes affiliées aux clubs" />

      <div className="flex-1 p-6">
        <DataTable
          data={equipes}
          columns={columns}
          filters={filtersComputed}
          searchPlaceholder="Rechercher une équipe..."
          idKey="__key"
        />
      </div>
    </div>
  )
}
