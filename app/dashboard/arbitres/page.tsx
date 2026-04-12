"use client"

import { Header } from "@/components/dashboard/header"
import { DataTable, Column, Filter } from "@/components/dashboard/data-table"
import { StatusBadge } from "@/components/dashboard/status-badge"
import { arbitres, Arbitre, getFilterOptions } from "@/lib/demo-data"
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
    render: (item) => `${item.prenom} ${item.nom}`,
  },
  { key: "sexe", header: "Sexe", className: "text-center" },
  { key: "niveau", header: "Niveau" },
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

const filters: Filter[] = [
  {
    key: "province",
    label: "Province",
    options: getFilterOptions(arbitres, "province"),
  },
  {
    key: "ligue",
    label: "Ligue",
    options: getFilterOptions(arbitres, "ligue"),
  },
  {
    key: "entente",
    label: "Entente",
    options: getFilterOptions(arbitres, "entente"),
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

export default function ArbitresPage() {
  return (
    <div className="flex flex-col">
      <Header
        title="Arbitres"
        subtitle="Liste des arbitres officiels de la FECOBASKET"
      />

      <div className="flex-1 p-6">
        <DataTable
          data={arbitres}
          columns={columns}
          filters={filters}
          searchPlaceholder="Rechercher un arbitre..."
          detailHref={(item) => `/dashboard/arbitres/${item.id}`}
          idKey="id"
        />
      </div>
    </div>
  )
}
