"use client"

import { useEffect, useMemo, useState } from "react"
import { Header } from "@/components/dashboard/header"
import { DataTable, Column, Filter } from "@/components/dashboard/data-table"
import { StatusBadge } from "@/components/dashboard/status-badge"
import { Entente, getFilterOptions } from "@/lib/demo-data"

function formatEntenteCode(value: unknown): string {
  const raw = String(value ?? "").trim()
  if (/^\d+$/.test(raw) && raw.length === 3) return `0${raw}`
  return raw
}

const columns: Column<Entente>[] = [
  {
    key: "id",
    header: "ID Entente",
    className: "font-mono text-sm",
    render: (item) => formatEntenteCode(item.id),
  },
  { key: "nom", header: "Nom Entente", className: "font-medium" },
  { key: "pseudo", header: "Pseudo", className: "text-muted-foreground" },
  { key: "ligue", header: "Ligue" },
  { key: "province", header: "Province" },
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
    key: "statut",
    label: "Statut",
    options: [],
  },
]

export default function EntentesPage() {
  const [ententes, setEntentes] = useState<Entente[]>([])

  useEffect(() => {
    let canceled = false
    ;(async () => {
      try {
        const res = await fetch("/api/ententes", { cache: "no-store" })
        const json = await res.json()
        if (!canceled) {
          setEntentes(Array.isArray(json?.ententes) ? json.ententes : [])
        }
      } catch {
        if (!canceled) setEntentes([])
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
        options: getFilterOptions(ententes, "province"),
      },
      {
        key: "ligue",
        label: "Ligue",
        options: getFilterOptions(ententes, "ligue"),
      },
      {
        key: "statut",
        label: "Statut",
        options: getFilterOptions(ententes, "statut"),
      },
    ]
  }, [ententes])

  return (
    <div className="flex flex-col">
      <Header
        title="Ententes"
        subtitle="Liste des ententes territoriales affiliées aux ligues"
      />

      <div className="flex-1 p-6">
        <DataTable
          data={ententes}
          columns={columns}
          filters={filtersComputed}
          searchPlaceholder="Rechercher une entente..."
          idKey="__key"
        />
      </div>
    </div>
  )
}
