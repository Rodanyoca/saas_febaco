"use client"

import { useEffect, useMemo, useState } from "react"

import { DataTable, type Column, type Filter } from "@/components/dashboard/data-table"
import { Header } from "@/components/dashboard/header"
import { StatusBadge } from "@/components/dashboard/status-badge"
import { type Club, getFilterOptions } from "@/lib/models"

const columns: Column<Club>[] = [
  { key: "id", header: "ID Club", className: "font-mono text-sm" },
  { key: "nom", header: "Club", className: "font-medium min-w-0" },
  { key: "categorie", header: "Catégorie" },
  { key: "entente", header: "Entente" },
  { key: "ligue", header: "Ligue" },
  {
    key: "statut",
    header: "Statut",
    render: (item) => <StatusBadge status={item.statut} />,
  },
]

export default function ClubsPage() {
  const [clubs, setClubs] = useState<Club[]>([])
  const [filterValues, setFilterValues] = useState<Record<string, string>>({})

  useEffect(() => {
    let canceled = false
    ;(async () => {
      try {
        const res = await fetch("/api/clubs", { cache: "no-store" })
        const json = await res.json()
        if (!canceled) {
          setClubs(Array.isArray(json?.clubs) ? json.clubs : [])
        }
      } catch {
        if (!canceled) setClubs([])
      }
    })()

    return () => {
      canceled = true
    }
  }, [])

  const filtersComputed: Filter[] = useMemo(() => {
    const selectedLigue = filterValues.ligue
    const clubsForEntentes =
      selectedLigue && selectedLigue !== "all"
        ? clubs.filter((club) => String(club.ligue) === selectedLigue)
        : clubs

    return [
      {
        key: "ligue",
        label: "Ligue",
        options: getFilterOptions(clubs, "ligue"),
      },
      {
        key: "entente",
        label: "Entente",
        options: getFilterOptions(clubsForEntentes, "entente"),
      },
      {
        key: "statut",
        label: "Statut",
        options: getFilterOptions(clubs, "statut"),
      },
    ]
  }, [clubs, filterValues.ligue])

  return (
    <div className="flex flex-col">
      <Header title="Clubs" subtitle="Liste des clubs affiliés à la FEBACO" />

      <div className="flex-1 p-6">
        <DataTable
          data={clubs}
          columns={columns}
          filters={filtersComputed}
          filterValues={filterValues}
          onFilterValuesChange={setFilterValues}
          searchPlaceholder="Rechercher un club..."
          detailHref={(item) => `/dashboard/clubs/${encodeURIComponent(item.id)}`}
          idKey="__key"
        />
      </div>
    </div>
  )
}
