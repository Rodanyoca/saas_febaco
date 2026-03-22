"use client"

import { useEffect, useMemo, useState } from "react"
import { Header } from "@/components/dashboard/header"
import { DataTable, Column, Filter } from "@/components/dashboard/data-table"
import { StatusBadge } from "@/components/dashboard/status-badge"
import { Athlete, getFilterOptions } from "@/lib/demo-data"

const columns: Column<Athlete>[] = [
  { key: "id", header: "ID", className: "font-mono text-sm" },
  {
    key: "nom",
    header: "Nom complet",
    className: "font-medium",
    render: (item) => `${item.prenom} ${item.nom}`,
  },
  { key: "sexe", header: "Sexe", className: "text-center" },
  { key: "dateNaissance", header: "Date de naissance" },
  { key: "nationalite", header: "Nationalité" },
  { key: "club", header: "Club" },
  {
    key: "statut",
    header: "Statut",
    render: (item) => <StatusBadge status={item.statut} />,
  },
]

export default function AthletesPage() {
  const [athletes, setAthletes] = useState<Athlete[]>([])

  useEffect(() => {
    let canceled = false
    ;(async () => {
      try {
        const res = await fetch("/api/athletes", { cache: "no-store" })
        const json = await res.json()

        if (!canceled) {
          setAthletes(Array.isArray(json?.athletes) ? json.athletes : [])
        }
      } catch {
        if (!canceled) setAthletes([])
      }
    })()

    return () => {
      canceled = true
    }
  }, [])

  const filters: Filter[] = useMemo(
    () => [
      {
        key: "province",
        label: "Province",
        options: getFilterOptions(athletes, "province"),
      },
      {
        key: "ligue",
        label: "Ligue",
        options: getFilterOptions(athletes, "ligue"),
      },
      {
        key: "club",
        label: "Club",
        options: getFilterOptions(athletes, "club"),
      },
      {
        key: "sexe",
        label: "Sexe",
        options: [
          { value: "M", label: "Masculin" },
          { value: "F", label: "Féminin" },
        ],
      },
      {
        key: "categorie",
        label: "Catégorie",
        options: getFilterOptions(athletes, "categorie"),
      },
      {
        key: "statut",
        label: "Statut",
        options: getFilterOptions(athletes, "statut"),
      },
    ],
    [athletes]
  )

  return (
    <div className="flex flex-col">
      <Header
        title="Athlètes"
        subtitle="Liste des athlètes affiliés à la FEBACO"
      />

      <div className="flex-1 p-6">
        <DataTable
          data={athletes}
          columns={columns}
          filters={filters}
          searchPlaceholder="Rechercher un athlète..."
          detailHref={(item) => `/dashboard/athletes/${item.id}`}
          idKey="__key"
        />
      </div>
    </div>
  )
}
