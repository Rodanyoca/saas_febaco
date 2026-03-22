"use client"

import { useEffect, useMemo, useState } from "react"
import { Header } from "@/components/dashboard/header"
import { DataTable, Column, Filter } from "@/components/dashboard/data-table"
import { StatusBadge } from "@/components/dashboard/status-badge"
import { Club, getFilterOptions } from "@/lib/demo-data"

const columns: Column<Club>[] = [
  { key: "id", header: "ID Club", className: "font-mono text-sm" },
  { key: "nom", header: "Nom Club", className: "font-medium" },
  { key: "categorie", header: "Catégorie" },
  { key: "entente", header: "Entente" },
  { key: "ligue", header: "Ligue" },
  { key: "province", header: "Province" },
  { key: "dateAffiliation", header: "Date d'affiliation" },
  {
    key: "statut",
    header: "Statut",
    render: (item) => <StatusBadge status={item.statut} />,
  },
]

const filters: Filter[] = [
  {
    key: "province",
    label: "Province",
    options: [],
  },
  {
    key: "ligue",
    label: "Ligue",
    options: [],
  },
  {
    key: "entente",
    label: "Entente",
    options: [],
  },
  {
    key: "categorie",
    label: "Catégorie",
    options: [],
  },
  {
    key: "statut",
    label: "Statut",
    options: [],
  },
]

export default function ClubsPage() {
  const [clubs, setClubs] = useState<Club[]>([])

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
    return [
      {
        key: "province",
        label: "Province",
        options: getFilterOptions(clubs, "province"),
      },
      {
        key: "ligue",
        label: "Ligue",
        options: getFilterOptions(clubs, "ligue"),
      },
      {
        key: "entente",
        label: "Entente",
        options: getFilterOptions(clubs, "entente"),
      },
      {
        key: "categorie",
        label: "Catégorie",
        options: getFilterOptions(clubs, "categorie"),
      },
      {
        key: "statut",
        label: "Statut",
        options: getFilterOptions(clubs, "statut"),
      },
    ]
  }, [clubs])

  return (
    <div className="flex flex-col">
      <Header
        title="Clubs"
        subtitle="Liste des clubs affiliés à la FEBACO"
      />

      <div className="flex-1 p-6">
        <DataTable
          data={clubs}
          columns={columns}
          filters={filtersComputed}
          searchPlaceholder="Rechercher un club..."
          detailHref={(item) => `/dashboard/clubs/${item.id}`}
          idKey="__key"
        />
      </div>
    </div>
  )
}
