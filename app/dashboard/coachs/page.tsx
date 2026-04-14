"use client"

import { useEffect, useMemo, useState } from "react"
import { Header } from "@/components/dashboard/header"
import { DataTable, Column, Filter } from "@/components/dashboard/data-table"
import { StatusBadge } from "@/components/dashboard/status-badge"
import { Coach, getFilterOptions } from "@/lib/models"

const columns: Column<Coach>[] = [
  { key: "id", header: "ID", className: "font-mono text-sm" },
  {
    key: "nom",
    header: "Nom complet",
    className: "font-medium",
    render: (item) => `${item.prenom} ${item.nom}`,
  },
  { key: "sexe", header: "Sexe", className: "text-center" },
  { key: "niveau", header: "Niveau" },
  { key: "club", header: "Club" },
  { key: "equipe", header: "Équipe" },
  { key: "ligue", header: "Ligue" },
  {
    key: "statut",
    header: "Statut",
    render: (item) => <StatusBadge status={item.statut} />,
  },
]

export default function CoachsPage() {
  const [coachs, setCoachs] = useState<Coach[]>([])

  useEffect(() => {
    let canceled = false
    ;(async () => {
      try {
        const res = await fetch("/api/coachs", { cache: "no-store" })
        const json = await res.json()

        if (!canceled) {
          setCoachs(Array.isArray(json?.coachs) ? json.coachs : [])
        }
      } catch {
        if (!canceled) setCoachs([])
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
        options: getFilterOptions(coachs, "province"),
      },
      {
        key: "ligue",
        label: "Ligue",
        options: getFilterOptions(coachs, "ligue"),
      },
      {
        key: "club",
        label: "Club",
        options: getFilterOptions(coachs, "club"),
      },
      {
        key: "niveau",
        label: "Niveau",
        options: getFilterOptions(coachs, "niveau"),
      },
      {
        key: "statut",
        label: "Statut",
        options: getFilterOptions(coachs, "statut"),
      },
    ],
    [coachs]
  )

  return (
    <div className="flex flex-col">
      <Header
        title="Entraîneurs"
        subtitle="Liste des entraîneurs affiliés à la FEBACO"
      />

      <div className="flex-1 p-6">
        <DataTable
          data={coachs}
          columns={columns}
          filters={filters}
          searchPlaceholder="Rechercher un entraîneur..."
          detailHref={(item) => `/dashboard/coachs/${item.id}`}
          idKey="__key"
        />
      </div>
    </div>
  )
}
