"use client"

import { useEffect, useMemo, useState } from "react"
import { Header } from "@/components/dashboard/header"
import { DataTable, Column, Filter } from "@/components/dashboard/data-table"
import { StatusBadge } from "@/components/dashboard/status-badge"
import { Officiel, getFilterOptions } from "@/lib/models"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

function initials(prenom?: string, nom?: string): string {
  const p = String(prenom ?? "").trim()
  const n = String(nom ?? "").trim()
  const a = p ? p[0] : ""
  const b = n ? n[0] : ""
  const v = `${a}${b}`.toUpperCase()
  return v || "OF"
}

const columns: Column<Officiel>[] = [
  {
    key: "id",
    header: "Code",
    className: "font-mono text-sm",
    render: (item) => (
      <div className="flex items-center gap-2">
        <span>{item.id}</span>
        <Avatar className="size-7">
          <AvatarImage src={item.avatarUrl || undefined} alt={`${item.prenom} ${item.nom}`} />
          <AvatarFallback className="text-[10px]">{initials(item.prenom, item.nom)}</AvatarFallback>
        </Avatar>
      </div>
    ),
  },
  {
    key: "nom",
    header: "Nom complet",
    className: "font-medium",
    render: (item) => `${item.prenom} ${item.nom}`,
  },
  { key: "fonction", header: "Fonction" },
  { key: "structure", header: "Structure" },
  { key: "ligue", header: "Ligue" },
  {
    key: "statut",
    header: "Statut",
    render: (item) => <StatusBadge status={item.statut} />,
  },
]

export default function OfficielsPage() {
  const [officiels, setOfficiels] = useState<Officiel[]>([])

  useEffect(() => {
    let canceled = false
    ;(async () => {
      try {
        const res = await fetch("/api/officiels", { cache: "no-store" })
        const json = await res.json()
        if (!canceled) {
          setOfficiels(Array.isArray(json?.officiels) ? json.officiels : [])
        }
      } catch {
        if (!canceled) setOfficiels([])
      }
    })()

    return () => {
      canceled = true
    }
  }, [])

  const filters: Filter[] = useMemo(() => {
    return [
      {
        key: "province",
        label: "Province",
        options: getFilterOptions(officiels, "province"),
      },
      {
        key: "structure",
        label: "Structure",
        options: getFilterOptions(officiels, "structure"),
      },
      {
        key: "statut",
        label: "Statut",
        options: getFilterOptions(officiels, "statut"),
      },
    ]
  }, [officiels])

  return (
    <div className="flex flex-col">
      <Header
        title="Officiels"
        subtitle="Liste des officiels et dirigeants de la FECOBASKET"
      />

      <div className="flex-1 p-6">
        <DataTable
          data={officiels}
          columns={columns}
          filters={filters}
          searchPlaceholder="Rechercher un officiel..."
          detailHref={(item) => `/dashboard/officiels/${item.id}`}
          idKey="__key"
        />
      </div>
    </div>
  )
}
