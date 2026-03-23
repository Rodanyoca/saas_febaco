"use client"

import { useEffect, useMemo, useState } from "react"
import { Header } from "@/components/dashboard/header"
import { DataTable, Column, Filter } from "@/components/dashboard/data-table"
import { StatusBadge } from "@/components/dashboard/status-badge"
import { Club, getFilterOptions } from "@/lib/demo-data"

const columns: Column<Club>[] = [
  { key: "id", header: "ID Club", className: "font-mono text-sm" },
  {
    key: "nom",
    header: "Club",
    className: "min-w-[220px]",
    render: (item) => (
      <div className="flex flex-col leading-tight">
        <span className="font-medium text-foreground">{item.nom}</span>
        {item.entente ? (
          <span className="text-xs text-muted-foreground">{item.entente}</span>
        ) : null}
      </div>
    ),
  },
  { key: "categorie", header: "Catégorie" },
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
  const [userRole, setUserRole] = useState<string | null>(null)

  useEffect(() => {
    let canceled = false
    ;(async () => {
      try {
        const meRes = await fetch("/api/auth/me", { cache: "no-store" })
        const meJson = await meRes.json()
        if (!canceled) {
          setUserRole(String(meJson?.user?.role ?? ""))
        }

        const res = await fetch("/api/clubs", { cache: "no-store" })
        const json = await res.json()
        if (!canceled) {
          setClubs(Array.isArray(json?.clubs) ? json.clubs : [])
        }
      } catch {
        if (!canceled) {
          setUserRole(null)
          setClubs([])
        }
      }
    })()
    return () => {
      canceled = true
    }
  }, [])

  const filtersComputed: Filter[] = useMemo(() => {
    const base: Filter[] = [
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

    if (userRole === "entente") {
      return base.filter((f) => f.key !== "ligue" && f.key !== "entente")
    }

    if (userRole === "ligue") {
      return base.filter((f) => f.key !== "ligue")
    }

    return base
  }, [clubs, userRole])

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
