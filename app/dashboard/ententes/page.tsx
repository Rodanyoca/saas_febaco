"use client"

import { useEffect, useMemo, useState } from "react"
import { Header } from "@/components/dashboard/header"
import { DataTable, type Column, type Filter } from "@/components/dashboard/data-table"
import { StatusBadge } from "@/components/dashboard/status-badge"
import { type Entente, getFilterOptions } from "@/lib/models"

function formatEntenteCode(value: unknown): string {
  const raw = String(value ?? "").trim()
  if (/^\d+$/.test(raw) && raw.length === 3) return `0${raw}`
  return raw || "-"
}

const columns: Column<Entente>[] = [
  {
    key: "id",
    header: "ID",
    className: "w-[96px] whitespace-normal font-mono text-sm",
    render: (item) => formatEntenteCode(item.id),
  },
  {
    key: "nom",
    header: "Nom",
    className: "w-[42%] min-w-[260px] whitespace-normal font-medium",
    render: (item) => <span className="block whitespace-normal break-words leading-snug">{item.nom}</span>,
  },
  {
    key: "pseudo",
    header: "Pseudo",
    className: "w-[140px] whitespace-normal text-muted-foreground",
    render: (item) => <span className="block whitespace-normal break-words leading-snug">{item.pseudo}</span>,
  },
  {
    key: "ligue",
    header: "Ligue",
    className: "w-[140px] whitespace-normal",
    render: (item) => <span className="block whitespace-normal break-words leading-snug">{item.ligue}</span>,
  },
  {
    key: "email",
    header: "Email",
    className: "w-[24%] min-w-[220px] whitespace-normal",
    render: (item) => <span className="block whitespace-normal break-all leading-snug">{item.email || "-"}</span>,
  },
  {
    key: "statut",
    header: "Statut",
    className: "w-[110px]",
    render: (item) => <StatusBadge status={item.statut} />,
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
        subtitle="Liste des ententes territoriales affiliees aux ligues"
      />

      <div className="flex-1 p-6">
        <DataTable
          data={ententes}
          columns={columns}
          filters={filtersComputed}
          tableClassName="table-fixed"
          searchPlaceholder="Rechercher par nom, pseudo ou email..."
          idKey="__key"
        />
      </div>
    </div>
  )
}
