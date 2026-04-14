"use client"

import { useEffect, useMemo, useState } from "react"
import { Header } from "@/components/dashboard/header"
import { DataTable, Column, Filter } from "@/components/dashboard/data-table"
import { StatusBadge } from "@/components/dashboard/status-badge"
import { Club, getFilterOptions } from "@/lib/models"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

function initials(nom?: string): string {
  const n = String(nom ?? "").trim()
  const a = n ? n[0] : ""
  return (a || "CL").toUpperCase()
}

const columns: Column<Club>[] = [
  {
    key: "id",
    header: "ID Club",
    className: "font-mono text-sm",
    render: (item) => (
      <div className="flex items-center gap-2">
        <span>{item.id}</span>
        <Avatar className="size-7">
          <AvatarImage src={(item.avatarUrl as string | undefined) || undefined} alt={item.nom} />
          <AvatarFallback className="text-[10px]">{initials(item.nom)}</AvatarFallback>
        </Avatar>
      </div>
    ),
  },
  {
    key: "nom",
    header: "Club",
    className: "min-w-0",
    render: (item) => (
      <div className="flex flex-col leading-tight min-w-0">
        <span className="font-medium text-foreground truncate">{item.nom}</span>
        {item.entente ? (
          <span className="text-xs text-muted-foreground truncate">{item.entente}</span>
        ) : null}
      </div>
    ),
  },
  { key: "categorie", header: "Catégorie" },
  {
    key: "dateAffiliation",
    header: "Date d'affiliation",
    className: "min-w-0",
    render: (item) => (
      <div className="flex flex-col leading-tight min-w-0">
        <span className="font-medium text-foreground truncate">{item.dateAffiliation ?? "-"}</span>
        <span className="text-xs text-muted-foreground truncate">{item.ligue}</span>
      </div>
    ),
  },
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
  const [filterValues, setFilterValues] = useState<Record<string, string>>({})

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
    const selectedLigue = filterValues.ligue
    const clubsForEntentes = selectedLigue && selectedLigue !== "all"
      ? clubs.filter((c) => String(c.ligue) === String(selectedLigue))
      : clubs

    const base: Filter[] = [
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

    if (userRole === "entente") {
      return base.filter((f) => f.key !== "ligue" && f.key !== "entente")
    }

    if (userRole === "ligue") {
      return base.filter((f) => f.key !== "ligue")
    }

    return base
  }, [clubs, filterValues.ligue, userRole])

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
          filterValues={filterValues}
          onFilterValuesChange={setFilterValues}
          searchPlaceholder="Rechercher un club..."
          detailHref={(item) => `/dashboard/clubs/${item.id}`}
          idKey="__key"
        />
      </div>
    </div>
  )
}
