"use client"

import { useEffect, useMemo, useState } from "react"
import { Header } from "@/components/dashboard/header"
import { DataTable, Column, Filter } from "@/components/dashboard/data-table"
import { StatusBadge } from "@/components/dashboard/status-badge"
import { Arbitre, getFilterOptions } from "@/lib/models"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

function formatMatricule(value: unknown): string {
  const raw = String(value ?? "").trim()
  const digits = raw.replace(/\D/g, "")
  if (!digits) return raw
  return digits.slice(-3).padStart(3, "0")
}

function initials(prenom?: string, nom?: string): string {
  const p = String(prenom ?? "").trim()
  const n = String(nom ?? "").trim()
  const a = p ? p[0] : ""
  const b = n ? n[0] : ""
  const v = `${a}${b}`.toUpperCase()
  return v || "AR"
}

const columns: Column<Arbitre>[] = [
  {
    key: "id",
    header: "Matricule",
    className: "font-mono text-sm",
    render: (item) => (
      <div className="flex items-center gap-2">
        <span>{formatMatricule(item.id)}</span>
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
    render: (item) => (
      <div className="flex flex-col leading-tight min-w-0">
        <span className="truncate">{item.prenom} {item.nom}</span>
        <span className="text-xs text-muted-foreground truncate">
          {String(item.niveau ?? "").trim()} · {String(item.sexe ?? "").trim()}
        </span>
      </div>
    ),
  },
  {
    key: "ligue",
    header: "Ligue / Entente",
    className: "min-w-0",
    render: (item) => (
      <div className="flex flex-col leading-tight min-w-0">
        <span className="font-medium text-foreground truncate">{item.ligue}</span>
        <span className="text-xs text-muted-foreground truncate">{item.entente}</span>
      </div>
    ),
  },
  {
    key: "statut",
    header: "Statut",
    render: (item) => <StatusBadge status={item.statut} />,
  },
]

export default function ArbitresPage() {
  const [arbitres, setArbitres] = useState<Arbitre[]>([])

  useEffect(() => {
    let canceled = false
    ;(async () => {
      try {
        const res = await fetch("/api/arbitres", { cache: "no-store" })
        const json = await res.json()
        if (!canceled) {
          setArbitres(Array.isArray(json?.arbitres) ? json.arbitres : [])
        }
      } catch {
        if (!canceled) setArbitres([])
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
        options: getFilterOptions(arbitres, "province"),
      },
      {
        key: "niveau",
        label: "Niveau",
        options: getFilterOptions(arbitres, "niveau"),
      },
      {
        key: "statut",
        label: "Statut",
        options: getFilterOptions(arbitres, "statut"),
      },
    ]
  }, [arbitres])

  return (
    <div className="flex flex-col">
      <Header title="Arbitres" subtitle="Liste des arbitres affiliés à la FEBACO" />

      <div className="flex-1 p-6">
        <DataTable
          data={arbitres}
          columns={columns}
          filters={filters}
          searchPlaceholder="Rechercher un arbitre..."
          detailHref={(item) => `/dashboard/arbitres/${item.id}`}
          idKey="__key"
        />
      </div>
    </div>
  )
}
