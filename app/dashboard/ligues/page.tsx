"use client"

import { useEffect, useMemo, useState } from "react"
import { Header } from "@/components/dashboard/header"
import { DataTable, Column, Filter } from "@/components/dashboard/data-table"
import { StatusBadge } from "@/components/dashboard/status-badge"
import { Ligue, getFilterOptions } from "@/lib/demo-data"

function formatLigueId(value: unknown): string {
  const raw = String(value ?? "").trim()
  if (/^\d+$/.test(raw)) {
    const n = Number(raw)
    if (n >= 0 && n < 10) return `0${n}`
  }
  return raw
}

const columns: Column<Ligue>[] = [
  {
    key: "id",
    header: "ID Ligue",
    className: "font-mono text-sm",
    render: (item) => formatLigueId(item.id),
  },
  { key: "nom", header: "Nom Ligue", className: "font-medium" },
  { key: "pseudo", header: "Pseudo", className: "text-muted-foreground" },
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
    key: "statut",
    label: "Statut",
    options: [],
  },
]

export default function LiguesPage() {
  const [ligues, setLigues] = useState<Ligue[]>([])

  useEffect(() => {
    let canceled = false
    ;(async () => {
      try {
        const res = await fetch("/api/ligues", { cache: "no-store" })
        const json = await res.json()
        if (!canceled) {
          setLigues(Array.isArray(json?.ligues) ? json.ligues : [])
        }
      } catch {
        if (!canceled) setLigues([])
      }
    })()
    return () => {
      canceled = true
    }
  }, [])

  const filtersComputed: Filter[] = useMemo(() => {
    return [
      {
        key: "statut",
        label: "Statut",
        options: getFilterOptions(ligues, "statut"),
      },
    ]
  }, [ligues])

  return (
    <div className="flex flex-col">
      <Header
        title="Ligues"
        subtitle="Liste des ligues provinciales affiliées à la FEBACO"
      />

      <div className="flex-1 p-6">
        <DataTable
          data={ligues}
          columns={columns}
          filters={filtersComputed}
          searchPlaceholder="Rechercher une ligue..."
          idKey="__key"
        />
      </div>
    </div>
  )
}
